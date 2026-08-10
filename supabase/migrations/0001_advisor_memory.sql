-- Aimtogro AI Advisor: account memory layer.
-- Part 1 of the advisor build. Cheap plumbing only. No model state is stored here and
-- nothing in this schema is ever used to fine-tune. Facts in, context out.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- account_memory: durable learned facts about the business.
-- One row per (account, key). Upsert on conflict so a fact sharpens instead of duplicating.
-- ---------------------------------------------------------------------------
create table if not exists public.account_memory (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null,
  key          text not null,
  value        text not null,
  category     text not null default 'general',
  confidence   numeric(4,3) not null default 0.600,
  source       text not null default 'observed',
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  constraint account_memory_confidence_range check (confidence >= 0 and confidence <= 1),
  constraint account_memory_source_valid check (source in ('onboarding', 'observed', 'outcome', 'owner_stated', 'imported')),
  constraint account_memory_category_valid check (category in (
    'business', 'services', 'pricing', 'clients', 'seasonality',
    'preferences', 'voice', 'goals', 'operations', 'general'
  )),
  constraint account_memory_unique_key unique (account_id, key)
);

create index if not exists account_memory_account_cat_idx
  on public.account_memory (account_id, category, confidence desc);

-- ---------------------------------------------------------------------------
-- advisor_observations: things the advisor noticed over time, written by rules
-- watching module data. Cheap to write, cheap to read, never a token cost.
-- ---------------------------------------------------------------------------
create table if not exists public.advisor_observations (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null,
  observation    text not null,
  module_source  text not null,
  subject_type   text,
  subject_id     text,
  weight         numeric(4,3) not null default 0.500,
  created_at     timestamptz not null default now(),
  constraint advisor_observations_weight_range check (weight >= 0 and weight <= 1)
);

create index if not exists advisor_observations_account_time_idx
  on public.advisor_observations (account_id, created_at desc);
create index if not exists advisor_observations_subject_idx
  on public.advisor_observations (account_id, subject_type, subject_id);

-- ---------------------------------------------------------------------------
-- advice_log: what the advisor suggested, plus the exact context snapshot that
-- produced it. The snapshot is what makes an outcome interpretable later.
-- ---------------------------------------------------------------------------
create table if not exists public.advice_log (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null,
  advice_given      text not null,
  context_snapshot  jsonb not null default '{}'::jsonb,
  purpose           text not null default 'ask',
  subject_type      text,
  subject_id        text,
  created_at        timestamptz not null default now()
);

create index if not exists advice_log_account_time_idx
  on public.advice_log (account_id, created_at desc);
create index if not exists advice_log_purpose_idx
  on public.advice_log (account_id, purpose, created_at desc);

-- ---------------------------------------------------------------------------
-- advice_outcomes: the feedback loop. Did the owner act, and what happened.
-- This is the table that makes next month's advice better than this month's.
-- ---------------------------------------------------------------------------
create table if not exists public.advice_outcomes (
  id             uuid primary key default gen_random_uuid(),
  advice_log_id  uuid not null references public.advice_log(id) on delete cascade,
  taken          boolean not null,
  result         text,
  helpful        boolean,
  noted_at       timestamptz not null default now()
);

create index if not exists advice_outcomes_log_idx
  on public.advice_outcomes (advice_log_id, noted_at desc);

-- ---------------------------------------------------------------------------
-- advisor_usage: advisory moments, not tokens. Drives the cap and the soft ceiling.
-- ---------------------------------------------------------------------------
create table if not exists public.advisor_usage (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null,
  moment_type   text not null,
  billed        boolean not null default true,
  period_key    text not null,
  day_key       text not null,
  created_at    timestamptz not null default now(),
  constraint advisor_usage_type_valid check (moment_type in ('daily_rundown', 'ask', 'low_hanging_fruit', 'pitch', 'weekly_review'))
);

create index if not exists advisor_usage_period_idx
  on public.advisor_usage (account_id, period_key);
create index if not exists advisor_usage_day_idx
  on public.advisor_usage (account_id, day_key, moment_type);

-- ---------------------------------------------------------------------------
-- account_modules: which modules are toggled on. The advisor never queries a
-- module that is not listed here as enabled. Also the runtime gate's source of truth.
-- ---------------------------------------------------------------------------
create table if not exists public.account_modules (
  account_id  uuid not null,
  module_id   text not null,
  enabled     boolean not null default true,
  paid        boolean not null default true,
  enabled_at  timestamptz not null default now(),
  disabled_at timestamptz,
  primary key (account_id, module_id)
);

create index if not exists account_modules_enabled_idx
  on public.account_modules (account_id) where enabled;

-- ---------------------------------------------------------------------------
-- account_addons: advisor entitlement state. 'suspended' is a first class state
-- so dropping to zero modules never deletes memory.
-- ---------------------------------------------------------------------------
create table if not exists public.account_addons (
  account_id     uuid not null,
  addon_id       text not null,
  status         text not null default 'active',
  grace_until    timestamptz,
  activated_at   timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (account_id, addon_id),
  constraint account_addons_status_valid check (status in ('active', 'suspended', 'cancelled'))
);

-- ---------------------------------------------------------------------------
-- Row level security. Every table is per account. Service role bypasses.
-- ---------------------------------------------------------------------------
alter table public.account_memory        enable row level security;
alter table public.advisor_observations  enable row level security;
alter table public.advice_log            enable row level security;
alter table public.advice_outcomes       enable row level security;
alter table public.advisor_usage         enable row level security;
alter table public.account_modules       enable row level security;
alter table public.account_addons        enable row level security;

-- Assumes a helper that resolves the caller's account from the JWT. Aimtogro already
-- uses this pattern for the shared client database. See BUILD-NOTES.md.
create or replace function public.current_account_id()
returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'account_id', '')::uuid;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'account_memory', 'advisor_observations', 'advice_log',
    'advisor_usage', 'account_modules', 'account_addons'
  ] loop
    execute format(
      'drop policy if exists %I on public.%I', t || '_account_isolation', t
    );
    execute format(
      'create policy %I on public.%I using (account_id = public.current_account_id()) with check (account_id = public.current_account_id())',
      t || '_account_isolation', t
    );
  end loop;
end $$;

drop policy if exists advice_outcomes_account_isolation on public.advice_outcomes;
create policy advice_outcomes_account_isolation on public.advice_outcomes
  using (exists (
    select 1 from public.advice_log l
    where l.id = advice_outcomes.advice_log_id
      and l.account_id = public.current_account_id()
  ))
  with check (exists (
    select 1 from public.advice_log l
    where l.id = advice_outcomes.advice_log_id
      and l.account_id = public.current_account_id()
  ));
