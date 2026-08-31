import os

PREAMBLE = """-- The Lab database, in one paste.
--
-- Generated 2026-08-31 by concatenating, in order: a merged preamble for the
-- shared tables whose stand-in definitions differ across harnesses, then
-- every harness's stand-in tables (create-if-not-exists, so the preamble's
-- superset wins), then every module's own migrations (0001 then 0002), then
-- the demo seeds. Apply to the LAB TEST Supabase project only: paste into
-- the SQL editor or run psql -f lab-database.sql -v ON_ERROR_STOP=1.
-- Test data only; the Lab gate is not real authentication and no real
-- client data belongs here.
--
-- Validated end to end against a clean PostgreSQL 16 before committing.

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ============================================================
-- MERGED PREAMBLE: shared tables the harnesses define differently
-- ============================================================
-- Several harnesses model the same platform table with different columns
-- (each was written against the slice its module reads). In the shared Lab
-- database they are ONE table each, so a superset definition goes first and
-- every later create-if-not-exists no-ops against it. Constraints are the
-- loosest of the variants on purpose: every harness's seed must insert.

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text,
  business_name text,
  created_at timestamptz default now()
);

create table if not exists message_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  source_module text not null,
  event_type text not null,
  subject_type text,
  subject_id uuid,
  contact_id uuid,
  recipient_email text,
  channel text not null default 'email' check (channel in ('email', 'sms', 'in_app')),
  title text not null,
  body text,
  payload jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'skipped', 'failed')),
  handled_at timestamptz,
  handled_by text,
  -- Nullable, unlike the platform's 0060: trends' harness seed predates the
  -- dedupe column and modules always set it themselves. Nulls never collide
  -- in the unique index.
  dedupe_key text,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

alter table message_events enable row level security;

create table if not exists invoices (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  number text,
  invoice_number text,
  client_name text,
  client_email text,
  contact_id uuid,
  line_items jsonb,
  total_amount numeric(12,2),
  amount_minor bigint,
  currency text default 'USD',
  status text default 'draft',
  issued_date date,
  due_date date,
  paid_date date,
  paid_at timestamptz,
  paid_by_payment_id uuid,
  pdf_url text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table invoices enable row level security;

-- contacts: most harnesses key by user_id with a name column; the contact
-- harness keys by account_id with full_name (the module's configurable
-- column names, exercised on purpose). One table, both vocabularies.
create table if not exists contacts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  account_id uuid,
  name text,
  full_name text,
  email text,
  phone text,
  company text,
  source text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table contacts enable row level security;
"""

out = [PREAMBLE]

def add(label, path):
    out.append(f"\n-- ============================================================\n-- {label}\n-- source: {path.replace('/home/user/','')}\n-- ============================================================\n")
    out.append(open(path).read())

standins = [
    ("trends harness stand-ins", "/home/user/trends/harness/supabase/0000_source_tables.sql"),
    ("charted harness stand-ins", "/home/user/charted/harness/supabase/0000_source_tables.sql"),
    ("jotted harness stand-ins", "/home/user/jotted/harness/supabase/0000_source_tables.sql"),
    ("solved harness stand-ins", "/home/user/solved/harness/supabase/0000_source_tables.sql"),
    ("gated harness stand-ins", "/home/user/gated/harness/supabase/0000_harness.sql"),
    ("paid harness stand-ins", "/home/user/paid/harness/migrations/0001_harness.sql"),
    ("contact harness stand-ins", "/home/user/contact/apps/harness/supabase/0001_harness_contacts.sql"),
]
mods = ["trends", "charted", "jotted", "solved", "gated", "paid", "contact"]
for label, p in standins:
    add(label, p)
for m in mods:
    d = f"/home/user/{m}/migrations"
    for f in sorted(os.listdir(d)):
        if f.endswith(".sql"):
            add(f"{m} module migration {f}", os.path.join(d, f))
seeds = [
    ("trends demo seed", "/home/user/trends/harness/supabase/0002_seed.sql"),
    ("charted demo seed", "/home/user/charted/harness/supabase/0002_seed.sql"),
    ("jotted demo seed", "/home/user/jotted/harness/supabase/0002_seed.sql"),
    ("solved demo seed", "/home/user/solved/harness/supabase/0002_seed.sql"),
]
for label, p in seeds:
    add(label, p)

open("/tmp/lab-database.sql", "w").write("".join(out))
print("regenerated", sum(len(x) for x in out), "chars")
