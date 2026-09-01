-- ═══════════════════════════════════════════════════════════════════════════
-- SUPERSEDED 2026-09-01 — DO NOT APPLY THIS FILE.
--
-- The Lab database is live and it is NOT built this way. It is one Supabase
-- project (ref pgcvdgkqgagfbiseodwe, "Belnoda Lab") with each module's tables
-- in ITS OWN Postgres schema: trends, contact, gated, jotted, charted, solved,
-- paid. All seven harnesses read SUPABASE_SCHEMA and are deployed against it.
--
-- This file takes the other road: one `public` schema, with superset
-- definitions for the shared tables so every create-if-not-exists no-ops. It
-- is a legitimate design and it was validated against PostgreSQL 16. It is
-- simply not the one that was chosen, and the two cannot both be applied:
-- running this would fill `public` with a second copy of all 125 tables while
-- the harnesses keep reading their schemas, and nothing would look wrong until
-- somebody wondered why their edits never showed up.
--
-- Kept for the record, and because its merged preamble is the clearest
-- statement anywhere of how the shared stand-in tables actually differ.
-- ═══════════════════════════════════════════════════════════════════════════

-- The Lab database, in one paste.
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

-- ============================================================
-- trends harness stand-ins
-- source: trends/harness/supabase/0000_source_tables.sql
-- ============================================================
-- The sandbox's stand-in for the platform's shared database.
--
-- Trends reads other modules' tables. In production those tables belong to the
-- platform. Here they do not exist, so this file creates the SUBSET Trends
-- actually reads, with the same names and the same columns, and the seed file
-- fills them.
--
-- This is not part of the module and it never ships inside the package. It is
-- scaffolding for the sandbox, which is exactly why it lives in the harness.
-- If a Trends adapter ever needs a column that is not here, add it here, and
-- that mismatch is itself the signal that the adapter is reaching for something
-- the platform may not have either.
--
-- A client instance pointed at a real database does NOT run this file. It runs
-- only the module's own `migrations/0001_trends.sql`.

create extension if not exists "uuid-ossp";

-- The tenant. Trends filters shared tables on `user_id`, which is what the
-- platform calls it, and the column name is a config option for anyone whose
-- schema disagrees.
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text,
  created_at timestamptz default now()
);

create table if not exists contacts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  name text,
  email text,
  created_at timestamptz default now()
);

create table if not exists contact_interactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  interaction_type text not null,
  summary text,
  created_at timestamptz default now()
);

create table if not exists pipeline_deals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  prospect_name text,
  deal_value numeric(12, 2),
  stage text check (stage in ('lead', 'contacted', 'proposal', 'negotiation', 'won', 'lost')) default 'lead',
  last_contact_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists invoices (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  client_name text,
  total_amount numeric(12, 2),
  status text check (status in ('draft', 'sent', 'paid', 'overdue', 'void')) default 'draft',
  issued_date date,
  due_date date,
  paid_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists quotes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  total_amount numeric(12, 2),
  status text check (status in ('draft', 'sent', 'accepted', 'declined', 'expired')) default 'draft',
  sent_date date,
  created_at timestamptz default now()
);

-- Revenue reads THIS table, not invoices, because the ledger is net of sales
-- tax and invoice totals are gross. The two are not meant to reconcile.
create table if not exists bookkeeping_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  entry_date date not null,
  type text check (type in ('income', 'expense')),
  category text,
  amount numeric(12, 2),
  created_at timestamptz default now()
);

create table if not exists invoice_chases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  invoice_id uuid references invoices(id) on delete cascade,
  step int not null default 1,
  created_at timestamptz default now()
);

create table if not exists jobs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  title text not null,
  status text default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'completed', 'invoiced', 'paid', 'cancelled')),
  value numeric(12, 2),
  scheduled_date date,
  completed_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists calendar_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  event_date date not null,
  created_at timestamptz default now()
);

create table if not exists message_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  source_module text not null,
  event_type text not null,
  channel text not null default 'email' check (channel in ('email', 'sms', 'in_app')),
  title text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'skipped', 'failed')),
  handled_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  platform text default 'google',
  rating integer check (rating between 1 and 5),
  review_date date,
  created_at timestamptz default now()
);

create table if not exists media_kits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists media_kit_metrics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  media_kit_id uuid not null references media_kits(id) on delete cascade,
  platform text not null,
  followers bigint,
  created_at timestamptz default now(),
  unique (media_kit_id, platform)
);

create table if not exists deal_deliverables (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  deal_id uuid not null references pipeline_deals(id) on delete cascade,
  kind text not null,
  due_date date,
  status text not null default 'todo' check (status in ('todo', 'submitted', 'live', 'approved')),
  went_live_at timestamptz,
  created_at timestamptz default now()
);

-- Same posture as the module's own tables: enabled, no policies, service role
-- only. The sandbox is a test database, not a public one.
alter table users enable row level security;
alter table contacts enable row level security;
alter table contact_interactions enable row level security;
alter table pipeline_deals enable row level security;
alter table invoices enable row level security;
alter table quotes enable row level security;
alter table bookkeeping_entries enable row level security;
alter table invoice_chases enable row level security;
alter table jobs enable row level security;
alter table calendar_events enable row level security;
alter table message_events enable row level security;
alter table reviews enable row level security;
alter table media_kits enable row level security;
alter table media_kit_metrics enable row level security;
alter table deal_deliverables enable row level security;

-- ============================================================
-- charted harness stand-ins
-- source: charted/harness/supabase/0000_source_tables.sql
-- ============================================================
-- The shared tables Charted expects to find, for an instance that has no
-- platform behind it.
--
-- Run this ONLY on a database that does not already have the platform's own
-- schema. A client instance pointed at a database that already has `contacts`
-- and `client_documents` skips this file entirely and runs only the module's
-- own migration.
--
-- These are deliberately the platform's shapes, not Charted's. The module reads
-- exactly one of them (`contacts`, and only to check that a subject's client
-- record is on the account) and writes to neither: the harness's vault adapter
-- is what puts a row in `client_documents`, because filing a document is the
-- consumer's job.

create extension if not exists "pgcrypto";

-- The client database. The spine every module hangs off.
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,

  name text not null,
  email text,
  phone text,
  company text,
  source text default 'manual',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contacts_user_idx on contacts (user_id, created_at desc);
create index if not exists contacts_user_name_idx on contacts (user_id, name);

alter table contacts enable row level security;

-- The document vault. A file, attached to a client. Charted's progress photos
-- land here alongside every other document the account holds about that person,
-- which is the whole point of filing them through the shared vault rather than
-- into a table of the module's own.
create table if not exists client_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid not null references contacts(id) on delete cascade,

  file_url text not null,
  filename text not null,
  content_type text default 'application/octet-stream',
  size_bytes bigint,

  doc_type text default 'upload',
  note text,
  created_by text default 'human',

  created_at timestamptz not null default now()
);

create index if not exists client_documents_user_idx
  on client_documents (user_id, created_at desc);
create index if not exists client_documents_contact_idx
  on client_documents (contact_id, created_at desc);

alter table client_documents enable row level security;

-- The storage bucket the harness vault adapter uploads to. Private: every read
-- goes through a signed URL that expires, because a permanent URL to somebody's
-- progress photos is exactly the leak this arrangement avoids.
--
-- Create it once, in the Supabase dashboard or with the CLI:
--
--   insert into storage.buckets (id, name, public)
--   values ('charted-photos', 'charted-photos', false)
--   on conflict (id) do nothing;
--
-- It is left commented out here because a database restored without the storage
-- schema would fail this whole file on a line that is not about Charted.

-- ============================================================
-- jotted harness stand-ins
-- source: jotted/harness/supabase/0000_source_tables.sql
-- ============================================================
-- The HOST tables this sandbox stands in for.
--
-- These are NOT Jotted's tables. Jotted's own tables all carry the `jotted_`
-- prefix and are created by ../../migrations/0001_jotted.sql.
--
-- On the platform, `contacts` already exists and is shared by every module.
-- Here the sandbox has to provide it, because Jotted's contacts port reads and
-- writes it, and a module that invented its own client list would be the exact
-- fork this whole arrangement exists to prevent.
--
-- Apply this FIRST, then the module's migration.

create table if not exists contacts (
  id      uuid primary key,
  user_id uuid not null,
  name    text not null,
  email   text,
  phone   text,
  created_at timestamptz not null default now()
);

create index if not exists contacts_user on contacts (user_id);

-- The harness reads this table with the service role, same as everything else.
alter table contacts enable row level security;

-- ============================================================
-- solved harness stand-ins
-- source: solved/harness/supabase/0000_source_tables.sql
-- ============================================================
-- The tables this instance provides that Solved only READS.
--
-- Run this ONLY on a database that does not already have the platform's own
-- tables. A client instance pointed at a database that already has them runs
-- just `../migrations/0001_solved.sql`.
--
-- Solved reads exactly two things it does not own:
--
--   the clients table, so a file dropped on a board can be filed against a
--   client record. Its name is `config.tables.contacts` and the column it is
--   scoped by is `config.tenantColumn`, both of which default to the
--   platform's names.
--
--   whatever the injected directory reads to turn a user id into a person.
--   That is not a Solved concern at all: `demo_users` below exists because THIS
--   harness needs somewhere to look, and the platform's directory reads its own
--   `users` table instead.

create extension if not exists "pgcrypto";

-- ── People ─────────────────────────────────────────────────────────────────
--
-- Read only by `lib/directory.ts`. Solved never touches it: the module stores
-- membership and never identity, which is why there is no copy of any of this
-- inside `solved_` anything.

create table if not exists demo_users (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null,
  display_name text not null,
  email        text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

create index if not exists demo_users_account_idx on demo_users(account_id);

-- ── Clients ────────────────────────────────────────────────────────────────
--
-- The platform calls this `contacts` and scopes it by `user_id`, so the harness
-- uses the same names rather than inventing its own. That way the default
-- config works here without an override, and any override that IS needed for a
-- client instance gets exercised deliberately rather than by accident.

create table if not exists contacts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  name       text not null,
  email      text,
  created_at timestamptz not null default now()
);

create index if not exists contacts_user_idx on contacts(user_id);

alter table demo_users enable row level security;
alter table contacts   enable row level security;

-- ============================================================
-- gated harness stand-ins
-- source: gated/harness/supabase/0000_harness.sql
-- ============================================================
-- The harness's own tables. NOT part of the module.
--
-- Gated owns everything prefixed `gated_` and nothing else. These four tables
-- stand in for what a real consumer already has: a shared client database, an
-- interaction log, a message outbox its campaign machinery drains, and a
-- payment ledger. They exist here so the module's PORTS are genuinely exercised
-- on the test bed rather than left unplugged.
--
-- A client instance replaces this file with whatever their platform already
-- has, and changes `harness/lib/config.ts` to point at it. The module is never
-- touched.
--
-- Run this BEFORE the module's own migration.

create extension if not exists "pgcrypto";

-- ── The shared client database ─────────────────────────────────────────────
-- Column names deliberately match the platform's: `user_id` for the tenant,
-- which is also Gated's `tenantColumn` default.
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  name text,
  created_at timestamptz not null default now(),
  unique (user_id, email)
);

alter table contacts enable row level security;

create table if not exists contact_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid not null references contacts(id) on delete cascade,
  kind text not null,
  summary text,
  created_at timestamptz not null default now()
);

create index if not exists contact_interactions_contact_idx
  on contact_interactions (contact_id, created_at desc);

alter table contact_interactions enable row level security;

-- ── The message outbox ─────────────────────────────────────────────────────
-- Same shape as the platform's `message_events`. Gated writes a pending row
-- through `onEvent` and stops. Something else drains it. That is the whole of
-- the messaging integration, and it is why the module contains no sender.
create table if not exists message_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,

  source_module text not null,
  event_type text not null,

  subject_type text not null,
  subject_id uuid,

  contact_id uuid references contacts(id) on delete set null,

  channel text not null default 'email' check (channel in ('email', 'sms', 'in_app')),

  title text not null,
  body text,
  payload jsonb not null default '{}'::jsonb,

  scheduled_for timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'skipped', 'failed')),
  handled_at timestamptz,
  handled_by text,

  dedupe_key text not null,
  created_at timestamptz not null default now(),

  unique (user_id, dedupe_key)
);

create index if not exists message_events_pending_idx
  on message_events (user_id, scheduled_for)
  where status = 'pending';

alter table message_events enable row level security;

-- ── The payment ledger ─────────────────────────────────────────────────────
-- What the stub payment port was asked to do. Real installs have their own
-- record of this inside their payment provider; this is here so the test bed
-- can show the request that would have been made.
create table if not exists harness_payments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  reference text not null,
  payment_ref text not null,

  amount_minor integer not null,
  currency text not null,
  description text,
  buyer_email text,
  kind text not null check (kind in ('one_time', 'recurring')),

  created_at timestamptz not null default now(),
  refunded_at timestamptz
);

create index if not exists harness_payments_ref_idx on harness_payments (payment_ref);

alter table harness_payments enable row level security;

-- ============================================================
-- paid harness stand-ins
-- source: paid/harness/migrations/0001_harness.sql
-- ============================================================
-- The stand-ins this test bed needs, which the module does NOT own.
--
-- Run this FIRST, then run the module's own migrations with `npm run migrate`.
--
-- ── Why these exist ────────────────────────────────────────────────────────
-- Paid reaches the shared client database, the platform's invoicing and the
-- platform's messaging through ports, so it never assumes their schema. On this
-- deployment there is no platform behind those ports, so these three tables
-- stand in for it with the same shape the platform uses.
--
-- Standing them up rather than passing no ports at all is the difference between
-- a harness and a demo: it means the contact loop, the invoice-settles-itself
-- loop and the receipt delivery are all genuinely exercised end to end rather
-- than skipped.
--
-- A real client instance points the ports at THEIR tables instead and does not
-- run this file.

-- ═══════════════════════════════════════════════════════════════════════════
-- The shared client database
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  name text,
  created_at timestamptz not null default now()
);

alter table contacts enable row level security;

-- One contact per email per account, which is what makes findOrCreate safe to
-- call on every settlement without growing a duplicate every time somebody pays.
create unique index if not exists contacts_user_email_key on contacts (user_id, email);

create table if not exists contact_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid not null references contacts (id) on delete cascade,
  kind text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

alter table contact_interactions enable row level security;

create index if not exists contact_interactions_contact_idx
  on contact_interactions (user_id, contact_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- Invoicing, so the loop can actually close
-- ═══════════════════════════════════════════════════════════════════════════

-- Tie a payment link to a row here, pay it on Stripe, and watch `status` become
-- 'paid' without anybody typing anything. That single behaviour is the loudest
-- thing this module does, so it gets a real table to prove itself against.
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  number text not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'USD',
  due_date date,
  status text not null default 'open',
  contact_id uuid references contacts (id) on delete set null,
  client_name text,
  client_email text,
  paid_at timestamptz,
  paid_by_payment_id uuid,
  created_at timestamptz not null default now()
);

alter table invoices enable row level security;

create unique index if not exists invoices_user_number_key on invoices (user_id, number);
create index if not exists invoices_user_status_idx on invoices (user_id, status);

-- ═══════════════════════════════════════════════════════════════════════════
-- Messaging outbox
-- ═══════════════════════════════════════════════════════════════════════════

-- Paid fires an event and stops. The platform's campaign machinery drains a
-- table shaped like this and turns each row into an email. Here nothing drains
-- it, which is exactly right for a test bed: the rows are the proof that the
-- module fired the right event with the right wording at the right moment, and
-- no real person is emailed while somebody is testing.
create table if not exists message_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source_module text not null,
  event_type text not null,
  subject_type text,
  contact_id uuid,
  recipient_email text,
  channel text not null default 'email',
  title text not null,
  body text not null,
  status text not null default 'pending',
  dedupe_key text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table message_events enable row level security;

-- The deduplication contract. Paid builds a stable key per fact and expects the
-- consumer to enforce uniqueness on it, so a settlement that runs twice cannot
-- send two receipts.
create unique index if not exists message_events_user_dedupe_key
  on message_events (user_id, dedupe_key);

create index if not exists message_events_user_created_idx
  on message_events (user_id, created_at desc);

-- ============================================================
-- contact harness stand-ins
-- source: contact/apps/harness/supabase/0001_harness_contacts.sql
-- ============================================================
-- The harness's own client database.
--
-- Contact requires a `contacts` table carrying at least `id` and `account_id`,
-- and references client records by id. On the platform that table already
-- exists. A standalone instance provides its own, and this is the minimum.
--
-- Contact never writes to this table. It reads it and joins to it.

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  full_name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create index if not exists contacts_account_idx on public.contacts (account_id);

-- Same posture as Contact's own tables: RLS on, deny all. The harness talks to
-- Postgres with the service role key and scopes by account_id in code.
alter table public.contacts enable row level security;
drop policy if exists contacts_deny on public.contacts;
create policy contacts_deny on public.contacts for all using (false);

-- ============================================================
-- trends module migration 0001_trends.sql
-- source: trends/migrations/0001_trends.sql
-- ============================================================
-- Trends 0001: the intelligence layer's own tables.
--
-- Every table here is prefixed `trends_` so it is obvious at a glance which
-- module owns it, and so a consumer can see exactly what a Trends release adds
-- to their database.
--
-- ── Tenancy ────────────────────────────────────────────────────────────────
-- Every row carries `account_id`, and every index leads with it. There is no
-- table here that can be read without naming an account.
--
-- `account_id` is a uuid that REFERENCES a shared record by id, with no foreign
-- key constraint. That is deliberate and it is the contract: Trends is mounted
-- against a database it does not own, whose accounts table may be called
-- `users`, `accounts` or something else entirely, and a hard FK would make the
-- module refuse to install anywhere but one platform. The consumer owns
-- referential integrity for its own accounts. We own everything downstream of
-- `account_id`, and those FKs are real.
--
-- ── Row level security ─────────────────────────────────────────────────────
-- RLS is enabled with no policies, matching the platform's own convention.
-- Server code reaches these tables with the service role; every other role is
-- denied every row. A module that shipped permissive policies would be handing
-- its data to whatever anon key the consumer's front end carries.
--
-- ── Dates ──────────────────────────────────────────────────────────────────
-- Period boundaries are `date`, inclusive on both ends, and are written by the
-- module as YYYY-MM-DD. That is the format `toLocaleDateString("en-CA")`
-- produces, which is why the module formats with that locale everywhere.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Metric definitions
-- ═══════════════════════════════════════════════════════════════════════════

-- What this account tracks. Built-ins are seeded from the vertical's default
-- set on first mount; the owner can switch any of them off and add their own.
--
-- `metric_key` is permanent: it is stored on every observation, goal and alert
-- rule, so renaming one orphans history. Treat it the way the platform treats a
-- capability id.
create table if not exists trends_metrics (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  metric_key text not null,
  label text not null,
  unit text not null check (unit in ('currency', 'count', 'percent', 'days', 'ratio')),
  grain text not null default 'month' check (grain in ('day', 'week', 'month')),
  direction_good text not null default 'up' check (direction_good in ('up', 'down', 'neutral')),

  source_kind text not null default 'manual'
    check (source_kind in ('auto', 'manual', 'csv', 'natural_language')),
  -- Which module feeds it and which adapter inside that module. Both null for
  -- anything entered by hand. Not a check constraint pair, because a metric
  -- that loses its source module should degrade to manual entry rather than
  -- fail an insert.
  source_module text,
  source_adapter text,

  enabled boolean not null default true,
  -- True for anything from the shipped catalog. Built-ins can be disabled but
  -- never deleted, so a later release can add a capability to one without
  -- resurrecting a row the owner meant to be rid of.
  builtin boolean not null default false,

  description text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (account_id, metric_key)
);

create index if not exists trends_metrics_account_enabled_idx
  on trends_metrics (account_id, enabled);

alter table trends_metrics enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Observations
-- ═══════════════════════════════════════════════════════════════════════════

-- One measured value for one metric over one period.
--
-- The unique constraint is the whole design: re-running ingestion for a period
-- UPDATES the row rather than adding a second one, so a cron that fires twice,
-- a backfill, and an owner who corrects a number by hand all converge on one
-- value per metric per period. Nothing in Trends ever needs to deduplicate a
-- series at read time.
create table if not exists trends_observations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  metric_key text not null,
  grain text not null check (grain in ('day', 'week', 'month')),
  period_start date not null,
  period_end date not null,

  value numeric(18, 4) not null,

  source text not null default 'manual'
    check (source in ('auto', 'manual', 'csv', 'natural_language')),
  -- Who or what wrote it. A user id for a hand entry, null for the cron.
  entered_by uuid,
  note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (account_id, metric_key, grain, period_start),
  check (period_end >= period_start)
);

-- The shape of every series read: one account, one metric, ordered by period.
create index if not exists trends_observations_series_idx
  on trends_observations (account_id, metric_key, grain, period_start desc);

alter table trends_observations enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Baselines
-- ═══════════════════════════════════════════════════════════════════════════

-- What normal looks like for THIS business.
--
-- Recomputed rather than accumulated, so a correction to an old observation is
-- reflected the next time the baseline is built. `sample_n` is stored because
-- every consumer of a baseline has to be able to refuse to use one that is too
-- thin, and re-deriving that from the observations would mean a second query on
-- every read.
create table if not exists trends_baselines (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  metric_key text not null,
  window_start date not null,
  window_end date not null,

  mean numeric(18, 4) not null default 0,
  median numeric(18, 4) not null default 0,
  stddev numeric(18, 4) not null default 0,
  p25 numeric(18, 4) not null default 0,
  p75 numeric(18, 4) not null default 0,
  sample_n integer not null default 0,

  computed_at timestamptz not null default now(),

  unique (account_id, metric_key)
);

alter table trends_baselines enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Goals
-- ═══════════════════════════════════════════════════════════════════════════

-- A number to reach, or a number to stay under. These are the points Trends
-- watches.
--
-- `status` is cached rather than derived on read, because an alert has to know
-- what the status was LAST time it ran in order to fire only on a transition.
-- A goal that is at risk on Monday and still at risk on Tuesday is not two
-- alerts.
create table if not exists trends_goals (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  metric_key text not null,
  target_value numeric(18, 4) not null,
  comparator text not null default 'gte' check (comparator in ('gte', 'lte')),

  period text not null default 'month'
    check (period in ('month', 'quarter', 'year', 'custom')),
  period_start date not null,
  deadline date not null,

  status text not null default 'on_track'
    check (status in ('on_track', 'at_risk', 'hit', 'missed')),
  status_changed_at timestamptz,

  note text,
  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (deadline >= period_start)
);

create index if not exists trends_goals_account_active_idx
  on trends_goals (account_id, active, deadline);

alter table trends_goals enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Alert rules
-- ═══════════════════════════════════════════════════════════════════════════

-- What to watch and where to send it. Configurable per metric and per channel,
-- which is why channel lives on the rule and not on the account.
--
-- Trends decides WHAT and WHEN. The platform decides HOW: the module fires an
-- event through `onEvent` and never sends anything itself.
create table if not exists trends_alert_rules (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  -- Null means "every metric", which is how an account subscribes to anomalies
  -- across the board without a row per metric.
  metric_key text,
  kind text not null check (kind in ('goal', 'anomaly', 'milestone', 'threshold')),
  channel text not null default 'in_app' check (channel in ('in_app', 'email', 'sms')),

  -- Threshold rules only.
  comparator text check (comparator in ('gte', 'lte')),
  threshold_value numeric(18, 4),

  enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A threshold rule without a threshold would fire on every evaluation.
  check (kind <> 'threshold' or (comparator is not null and threshold_value is not null))
);

create index if not exists trends_alert_rules_account_enabled_idx
  on trends_alert_rules (account_id, enabled);

alter table trends_alert_rules enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Alert log
-- ═══════════════════════════════════════════════════════════════════════════

-- What actually fired.
--
-- `dedupe_key` carries the same guarantee the platform's own message queue
-- does: one alert per fact per day, so a cron that reruns and an owner who
-- opens the dashboard four times cannot produce four messages. The uniqueness
-- is enforced here rather than trusted to the consumer, because Trends is the
-- one deciding what counts as the same fact.
create table if not exists trends_alert_log (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  rule_id uuid references trends_alert_rules(id) on delete set null,
  metric_key text,
  kind text not null check (kind in ('goal', 'anomaly', 'milestone', 'threshold')),
  channel text not null check (channel in ('in_app', 'email', 'sms')),

  title text not null,
  body text not null,
  payload jsonb,

  fired_at timestamptz not null default now(),
  -- Set when the consumer's onEvent accepted it. Null means Trends recorded the
  -- alert but nothing was asked to deliver it, which is the correct state when
  -- no onEvent is configured.
  dispatched_at timestamptz,

  read boolean not null default false,
  dismissed boolean not null default false,

  dedupe_key text not null,
  unique (account_id, dedupe_key)
);

create index if not exists trends_alert_log_account_fired_idx
  on trends_alert_log (account_id, fired_at desc);

alter table trends_alert_log enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Digests
-- ═══════════════════════════════════════════════════════════════════════════

-- The weekly and monthly recap the owner gets without opening the app.
create table if not exists trends_digests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  cadence text not null check (cadence in ('weekly', 'monthly')),
  channel text not null default 'email' check (channel in ('in_app', 'email', 'sms')),
  enabled boolean not null default true,

  -- 0 is Sunday. Only meaningful for weekly. Monthly always lands on the 1st,
  -- because a digest for "last month" written on the 14th is history, not news.
  send_weekday smallint not null default 1 check (send_weekday between 0 and 6),

  last_sent_for date,
  last_sent_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (account_id, cadence)
);

alter table trends_digests enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. Business context
-- ═══════════════════════════════════════════════════════════════════════════

-- What the numbers alone do not carry, captured in the guided onboarding.
--
-- Deliberately thin. "What the business does" belongs in the platform's own
-- business context, and Trends reads that through its services rather than
-- keeping a second copy. What lives here is only what Trends needs and nothing
-- else has: what a good month looks like TO THEM, known seasonality, and the
-- baseline window that decides what new data gets judged against.
create table if not exists trends_context (
  account_id uuid primary key,

  -- Free text, in the owner's words. Given to the Analyst verbatim.
  good_month text,
  known_seasonality text,
  primary_focus text,

  -- The period Trends treats as "normal" for this business. Set at onboarding
  -- from whatever history exists, and widened as more accrues.
  baseline_start date,
  baseline_end date,
  -- False until the owner has finished onboarding AND there is enough history
  -- to have an opinion. Until then the dashboard says it is still learning
  -- rather than judging a month against three weeks of data.
  baseline_established boolean not null default false,

  onboarding_completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table trends_context enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. Insights
-- ═══════════════════════════════════════════════════════════════════════════

-- What the Analyst said, kept.
--
-- Stored rather than streamed for three reasons: the owner can act on one and
-- come back to it, a recommendation that was ignored is itself a signal, and
-- caching is the difference between an advisory layer and an expensive one.
-- `model` is null on a teaser, which is computed from the base engine with no
-- model call at all, which is what lets the locked state be specific without
-- costing tokens for an account that has not bought the AI tier.
create table if not exists trends_insights (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  kind text not null
    check (kind in ('opportunity', 'risk', 'efficiency', 'timing', 'observation')),
  headline text not null,
  body text not null,
  metric_keys text[] not null default '{}',

  status text not null default 'new' check (status in ('new', 'acted', 'dismissed')),

  generated_at timestamptz not null default now(),
  -- Null on a teaser. Set to the model id on a real Analyst run.
  model text,
  -- The period the advice was formed about, so stale advice is visibly stale.
  covers_start date,
  covers_end date
);

create index if not exists trends_insights_account_generated_idx
  on trends_insights (account_id, generated_at desc);

alter table trends_insights enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. Metered usage
-- ═══════════════════════════════════════════════════════════════════════════

-- Two capabilities cost money per call: parsing a typed sentence into a number,
-- and running the Analyst. Both are capped per account per calendar month.
--
-- The counter is incremented BEFORE the model call, not after, so a request
-- that fails halfway still consumes its allowance. The alternative leaves a
-- retry loop with an uncapped valve, which is exactly the failure the platform
-- plan warns about.
create table if not exists trends_usage (
  account_id uuid not null,
  -- YYYY-MM.
  month_key text not null,
  kind text not null check (kind in ('natural_language', 'analyst')),
  used integer not null default 0,
  updated_at timestamptz not null default now(),

  primary key (account_id, month_key, kind)
);

alter table trends_usage enable row level security;

-- Atomic increment. Doing this in application code would be a read, a decision
-- and a write with a race in the middle, and the race is precisely the case
-- that matters: two tabs, one allowance.
create or replace function trends_consume_usage(
  p_account_id uuid,
  p_month_key text,
  p_kind text,
  p_cap integer
) returns jsonb
language plpgsql
as $$
declare
  v_used integer;
begin
  insert into trends_usage (account_id, month_key, kind, used)
  values (p_account_id, p_month_key, p_kind, 0)
  on conflict (account_id, month_key, kind) do nothing;

  update trends_usage
     set used = used + 1,
         updated_at = now()
   where account_id = p_account_id
     and month_key = p_month_key
     and kind = p_kind
     and used < p_cap
  returning used into v_used;

  if v_used is null then
    select used into v_used
      from trends_usage
     where account_id = p_account_id
       and month_key = p_month_key
       and kind = p_kind;
    return jsonb_build_object('allowed', false, 'used', coalesce(v_used, p_cap), 'cap', p_cap);
  end if;

  return jsonb_build_object('allowed', true, 'used', v_used, 'cap', p_cap);
end;
$$;

-- ============================================================
-- trends module migration 0002_notes_and_outcomes.sql
-- source: trends/migrations/0002_notes_and_outcomes.sql
-- ============================================================
-- Trends 0002: annotations, and insight follow-through.
--
-- Two additions, both downstream of the same complaint about this category:
-- dashboards show the number and stop.
--
-- 1. `trends_annotations` holds the owner's own "why" next to their numbers:
--    "ran the spring promo", "was away two weeks", "raised prices". The digest
--    shows the period's notes and the Analyst reads recent ones, so the advice
--    stops rediscovering things the owner already explained.
--
-- 2. Follow-through columns on `trends_insights`. When the owner marks a
--    recommendation acted on, Trends records when, and later the base engine
--    compares the cited metrics before and after and writes down whether they
--    actually moved. No other analytics product closes that loop; this one does.
--
-- Conventions carried over from 0001, unchanged: every table is `trends_`
-- prefixed, every row carries `account_id`, every index leads with it, RLS is
-- enabled with no policies so only the service role can reach anything, and
-- dates are `date` columns written as YYYY-MM-DD.
--
-- 0001 is applied and immutable. This file only ADDS: one table, one index,
-- four nullable columns. Nothing existing is altered in shape or meaning.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Annotations
-- ═══════════════════════════════════════════════════════════════════════════

-- A note the owner attached to their numbers.
--
-- `metric_key` is nullable: a null means the note is about the whole business
-- rather than one metric. `note_date` is the day the note is ABOUT, not the day
-- it was written, so "December was slow because of the reno" can be recorded in
-- January and still land on December. There is no foreign key to
-- `trends_metrics` on purpose: deleting a metric keeps its history, and a note
-- is history.
create table if not exists trends_annotations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  metric_key text,
  note_date date not null,
  body text not null check (char_length(body) between 1 and 500),

  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The shape of every read: one account's notes, newest first, optionally for
-- one metric. Leading with account_id keeps the index useful for both.
create index if not exists trends_annotations_account_date_idx
  on trends_annotations (account_id, note_date desc);

alter table trends_annotations enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Insight follow-through
-- ═══════════════════════════════════════════════════════════════════════════

-- `acted_at` is stamped when the owner marks an insight acted on, and it is the
-- anchor the review measures around. The three outcome columns are written once
-- by `reviewInsightOutcomes` when enough time has passed to judge: what the
-- cited metrics did (`outcome`), the plain-language version (`outcome_note`),
-- and when the review ran. All four are nullable, and every insight that
-- existed before this migration simply has no follow-through yet, which is
-- true.
alter table trends_insights
  add column if not exists acted_at timestamptz,
  add column if not exists outcome text
    check (outcome in ('improved', 'worsened', 'mixed', 'flat', 'unclear')),
  add column if not exists outcome_note text,
  add column if not exists outcome_checked_at timestamptz;

-- ============================================================
-- charted module migration 0001_charted.sql
-- source: charted/migrations/0001_charted.sql
-- ============================================================
-- Charted 0001: the progress tracker's own tables.
--
-- Every table here is prefixed `charted_` so it is obvious at a glance which
-- module owns it, and so a consumer can see exactly what a Charted release adds
-- to their database.
--
-- ── What is NOT here ───────────────────────────────────────────────────────
-- No client records, no contacts, no files. A subject references the shared
-- client database by id and a photo references the shared file vault by id.
-- Charted owns tracking data and nothing else, which is what lets it sit beside
-- the other modules rather than competing with them for the same rows.
--
-- Also not here: a single metric. Charted ships no industry metrics at any
-- tier. `charted_metrics` starts empty on every account and fills up with
-- whatever that business actually measures.
--
-- ── Tenancy ────────────────────────────────────────────────────────────────
-- Every row carries `account_id`, and every index leads with it. There is no
-- table here that can be read without naming an account, with two deliberate
-- exceptions: `charted_portal_access` and `charted_report_shares` are also
-- reachable by `token_hash` alone, because the token IS the credential and the
-- caller holding one does not know an account id yet.
--
-- `account_id` is a uuid that REFERENCES a shared record by id, with no foreign
-- key constraint. That is deliberate and it is the contract: Charted is mounted
-- against a database it does not own, whose accounts table may be called
-- `users`, `accounts` or something else entirely, and a hard FK would make the
-- module refuse to install anywhere but one platform. The consumer owns
-- referential integrity for its own accounts. We own everything downstream of
-- `account_id`, and those FKs are real.
--
-- ── Row level security ─────────────────────────────────────────────────────
-- RLS is enabled with no policies, matching the platform's own convention.
-- Server code reaches these tables with the service role; every other role is
-- denied every row. A module that shipped permissive policies would be handing
-- its data, including somebody's progress photos, to whatever anon key the
-- consumer's front end carries.
--
-- ── Dates ──────────────────────────────────────────────────────────────────
-- Every date is a `date` column written by the module as YYYY-MM-DD, which is
-- what `toLocaleDateString("en-CA")` produces, which is why the module formats
-- with that locale everywhere.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Subjects
-- ═══════════════════════════════════════════════════════════════════════════

-- One thing with a journey. `client_id` is NOT NULL on purpose, for every kind
-- of subject including a project: anchoring to the shared client record is what
-- makes a subject visible to the rest of the platform.
create table if not exists charted_subjects (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  client_id uuid not null,

  name text not null,
  kind text not null default 'person' check (kind in ('person', 'project', 'thing')),
  status text not null default 'active'
    check (status in ('active', 'paused', 'complete', 'archived')),

  -- The zero point every "since start" figure is measured from.
  started_on date not null,
  ended_on date,
  summary text,

  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists charted_subjects_account_status_idx
  on charted_subjects (account_id, status, created_at desc);
create index if not exists charted_subjects_client_idx
  on charted_subjects (account_id, client_id);

alter table charted_subjects enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Metrics, all of them user-defined
-- ═══════════════════════════════════════════════════════════════════════════

-- `metric_key` is permanent: it is stored on every value, goal and milestone,
-- so renaming one orphans history. The label is what people see and can change
-- freely; the key is what the data is filed under.
create table if not exists charted_metrics (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  metric_key text not null,
  label text not null,
  value_type text not null default 'number'
    check (value_type in ('number', 'rating', 'count', 'duration', 'boolean', 'text')),
  -- Free text, whatever the user types. A fixed list of units would be another
  -- way of shipping an opinion about what businesses measure.
  unit text,
  direction_good text not null default 'up'
    check (direction_good in ('up', 'down', 'neutral')),
  precision smallint not null default 1,

  -- For `rating` only.
  scale_min numeric,
  scale_max numeric,

  description text,
  -- Never deleted, because readings taken against it stay chartable.
  archived boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (account_id, metric_key)
);

create index if not exists charted_metrics_account_idx
  on charted_metrics (account_id, archived);

alter table charted_metrics enable row level security;

-- Which subjects track which metrics, and in what order.
create table if not exists charted_subject_metrics (
  account_id uuid not null,
  subject_id uuid not null references charted_subjects(id) on delete cascade,
  metric_key text not null,
  position smallint not null default 0,
  pinned boolean not null default false,

  created_at timestamptz not null default now(),

  primary key (subject_id, metric_key)
);

create index if not exists charted_subject_metrics_account_idx
  on charted_subject_metrics (account_id, subject_id, position);

alter table charted_subject_metrics enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Check-ins and their values
-- ═══════════════════════════════════════════════════════════════════════════

-- One per subject per date. Logging twice on a date corrects the first rather
-- than making a second, which is what the unique constraint enforces: two
-- readings of the same thing on the same day are almost always a correction,
-- and a chart with two points stacked on one date cannot be read.
create table if not exists charted_check_ins (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  subject_id uuid not null references charted_subjects(id) on delete cascade,

  occurred_on date not null,
  source text not null default 'operator'
    check (source in ('operator', 'subject', 'import')),
  note text,

  created_by text,
  created_at timestamptz not null default now(),

  unique (subject_id, occurred_on)
);

create index if not exists charted_check_ins_account_subject_idx
  on charted_check_ins (account_id, subject_id, occurred_on desc);

alter table charted_check_ins enable row level security;

-- Typed columns rather than one JSON blob, because every chart sorts and
-- averages on this and a blob would make that a cast at query time.
create table if not exists charted_values (
  account_id uuid not null,
  subject_id uuid not null references charted_subjects(id) on delete cascade,
  check_in_id uuid not null references charted_check_ins(id) on delete cascade,
  metric_key text not null,

  numeric numeric,
  flag boolean,
  text text,

  created_at timestamptz not null default now(),

  primary key (check_in_id, metric_key)
);

create index if not exists charted_values_series_idx
  on charted_values (account_id, subject_id, metric_key);

alter table charted_values enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Photos
-- ═══════════════════════════════════════════════════════════════════════════

-- A reference and nothing more. `document_id` is the SHARED file vault's id,
-- filed against the client record. Charted never stores a URL, a storage key or
-- a byte, because a permanent URL to somebody's progress photos sitting in a
-- database row is exactly the leak this shape avoids.
create table if not exists charted_photos (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  subject_id uuid not null references charted_subjects(id) on delete cascade,
  check_in_id uuid not null references charted_check_ins(id) on delete cascade,

  document_id text not null,
  -- The user's own word for the angle. Never a fixed list.
  pose text,
  taken_on date not null,

  created_at timestamptz not null default now(),

  unique (check_in_id, document_id)
);

create index if not exists charted_photos_timeline_idx
  on charted_photos (account_id, subject_id, taken_on);

alter table charted_photos enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Goals and milestones
-- ═══════════════════════════════════════════════════════════════════════════

-- `start_value` is captured when the goal is set. Without it, a subject going
-- from 100 down to a target of 80 would read as 25 percent done at 95, measured
-- from zero, which is nonsense.
create table if not exists charted_goals (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  subject_id uuid not null references charted_subjects(id) on delete cascade,
  metric_key text not null,

  target_value numeric not null,
  comparator text not null default 'gte' check (comparator in ('gte', 'lte')),
  start_value numeric,
  started_on date not null,
  deadline date,

  status text not null default 'on_track'
    check (status in ('on_track', 'at_risk', 'hit', 'missed')),
  note text,
  closed_at timestamptz,

  created_at timestamptz not null default now(),

  -- One open goal per metric per subject. A second target on the same number
  -- is a moved target, not another goal.
  unique (subject_id, metric_key)
);

create index if not exists charted_goals_account_idx
  on charted_goals (account_id, subject_id, closed_at);

alter table charted_goals enable row level security;

-- Either a value to pass or a date to reach, never both. The service enforces
-- the exclusivity, because a check constraint here would refuse the insert with
-- a message no operator could act on.
create table if not exists charted_milestones (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  subject_id uuid not null references charted_subjects(id) on delete cascade,
  goal_id uuid references charted_goals(id) on delete set null,

  metric_key text,
  label text not null,
  threshold_value numeric,
  due_on date,
  reached_on date,
  position smallint not null default 0,

  created_at timestamptz not null default now()
);

create index if not exists charted_milestones_subject_idx
  on charted_milestones (account_id, subject_id, position);

alter table charted_milestones enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Points, streaks and badges
-- ═══════════════════════════════════════════════════════════════════════════

-- A ledger, not a counter. A counter cannot be audited, cannot be explained to
-- the person who earned it, and drifts the first time a check-in is deleted.
-- `idempotency_key` is what stops a re-run from paying twice.
create table if not exists charted_points_ledger (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  subject_id uuid not null references charted_subjects(id) on delete cascade,

  points integer not null,
  reason text not null,
  badge text,
  idempotency_key text not null,

  created_at timestamptz not null default now(),

  unique (account_id, idempotency_key)
);

create index if not exists charted_points_subject_idx
  on charted_points_ledger (account_id, subject_id, created_at desc);

alter table charted_points_ledger enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Tags and stages
-- ═══════════════════════════════════════════════════════════════════════════

-- User-defined, always. Charted seeds none of these and has no fixed set hiding
-- behind a flag. A `stage` is a board column and is exclusive; a `tag` is a
-- label and is not.
create table if not exists charted_tags (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  name text not null,
  color text,
  kind text not null default 'tag' check (kind in ('tag', 'stage')),
  position smallint not null default 0,

  created_at timestamptz not null default now()
);

create index if not exists charted_tags_account_idx
  on charted_tags (account_id, kind, position);

alter table charted_tags enable row level security;

create table if not exists charted_subject_tags (
  account_id uuid not null,
  subject_id uuid not null references charted_subjects(id) on delete cascade,
  tag_id uuid not null references charted_tags(id) on delete cascade,

  created_at timestamptz not null default now(),

  primary key (subject_id, tag_id)
);

create index if not exists charted_subject_tags_account_idx
  on charted_subject_tags (account_id, tag_id);

alter table charted_subject_tags enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. Notes
-- ═══════════════════════════════════════════════════════════════════════════

-- `check_in_id` is nullable: a note either belongs to one moment or to the
-- whole journey, and one that starts as the first should not have to be
-- retyped to become the second.
create table if not exists charted_notes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  subject_id uuid not null references charted_subjects(id) on delete cascade,
  check_in_id uuid references charted_check_ins(id) on delete cascade,

  body text not null,
  -- 'typed' or 'voice'. Charted stores no audio and calls no transcription
  -- service: speech recognition happens in the browser and arrives here as text.
  source text not null default 'typed' check (source in ('typed', 'voice')),

  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists charted_notes_subject_idx
  on charted_notes (account_id, subject_id, created_at desc);

alter table charted_notes enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. Reports, share links and portal access
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists charted_reports (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  subject_id uuid not null references charted_subjects(id) on delete cascade,

  title text not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft', 'final')),

  -- The composed document: intro, ordered sections, closing. JSON because a
  -- report's shape is the module's own and no consumer queries inside it.
  body jsonb not null,
  -- 'narrator' on the base tier, the model id when the Coach drafted it.
  generated_by text not null default 'narrator',

  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists charted_reports_subject_idx
  on charted_reports (account_id, subject_id, created_at desc);

alter table charted_reports enable row level security;

-- Only the HASH of the token is stored, so a leak of this table does not hand
-- anybody a working link, and it is unique globally because the share route
-- looks a token up before it knows an account.
create table if not exists charted_report_shares (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  report_id uuid not null references charted_reports(id) on delete cascade,
  subject_id uuid not null references charted_subjects(id) on delete cascade,

  token_hash text not null unique,
  expires_on date,
  revoked_at timestamptz,
  views integer not null default 0,
  last_viewed_at timestamptz,

  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists charted_report_shares_report_idx
  on charted_report_shares (account_id, report_id, created_at desc);

alter table charted_report_shares enable row level security;

-- The subject's own way in. Same hashing rule, same global uniqueness, same
-- reason.
create table if not exists charted_portal_access (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  subject_id uuid not null references charted_subjects(id) on delete cascade,

  token_hash text not null unique,
  can_log_check_ins boolean not null default true,
  expires_on date,
  revoked_at timestamptz,
  last_seen_at timestamptz,

  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists charted_portal_access_subject_idx
  on charted_portal_access (account_id, subject_id, revoked_at);

alter table charted_portal_access enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. The alert log
-- ═══════════════════════════════════════════════════════════════════════════

-- Written BEFORE `config.onEvent` is called, and the unique dedupe key is what
-- makes the deduplication real rather than best-effort. A cron that reruns and
-- an operator who refreshes four times cannot produce four messages.
create table if not exists charted_alerts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  subject_id uuid references charted_subjects(id) on delete cascade,

  kind text not null
    check (kind in ('goal', 'milestone', 'stall', 'regression', 'due', 'badge')),
  title text not null,
  body text not null,
  dedupe_key text not null,

  dismissed_at timestamptz,
  created_at timestamptz not null default now(),

  unique (account_id, dedupe_key)
);

create index if not exists charted_alerts_account_idx
  on charted_alerts (account_id, created_at desc);

alter table charted_alerts enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. Coach insights and the metered allowance
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists charted_insights (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  subject_id uuid not null references charted_subjects(id) on delete cascade,

  kind text not null default 'observation'
    check (kind in ('risk', 'adjustment', 'encouragement', 'observation')),
  headline text not null,
  body text not null,
  metric_keys text[] not null default '{}',
  status text not null default 'new' check (status in ('new', 'acted', 'dismissed')),

  -- Null would mean a base-tier computation. Everything in this table came from
  -- a model, so it is recorded which one.
  model text,
  created_at timestamptz not null default now()
);

create index if not exists charted_insights_subject_idx
  on charted_insights (account_id, subject_id, created_at desc);

alter table charted_insights enable row level security;

create table if not exists charted_usage (
  account_id uuid not null,
  month_key text not null,
  kind text not null check (kind in ('coach')),
  used integer not null default 0,

  updated_at timestamptz not null default now(),

  primary key (account_id, month_key, kind)
);

alter table charted_usage enable row level security;

-- Spend one unit of a monthly allowance, atomically, and say whether it was
-- allowed. Atomic because two Coach runs starting in the same second must not
-- both read the same count and both decide there was room.
create or replace function charted_consume_usage(
  p_account_id uuid,
  p_month_key text,
  p_kind text,
  p_cap integer
) returns table (allowed boolean, used integer, cap integer)
language plpgsql
as $$
declare
  v_used integer;
begin
  insert into charted_usage (account_id, month_key, kind, used)
  values (p_account_id, p_month_key, p_kind, 0)
  on conflict (account_id, month_key, kind) do nothing;

  update charted_usage
     set used = charted_usage.used + 1,
         updated_at = now()
   where charted_usage.account_id = p_account_id
     and charted_usage.month_key = p_month_key
     and charted_usage.kind = p_kind
     and charted_usage.used < p_cap
  returning charted_usage.used into v_used;

  if v_used is null then
    select charted_usage.used into v_used
      from charted_usage
     where charted_usage.account_id = p_account_id
       and charted_usage.month_key = p_month_key
       and charted_usage.kind = p_kind;

    return query select false, coalesce(v_used, 0), p_cap;
  else
    return query select true, v_used, p_cap;
  end if;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. The two optional features
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Both ship OFF, behind `config.features`, and these tables ship empty. They
-- are here in the FIRST migration on purpose: switching a feature on later is
-- then a config change in the consumer and a redeploy, with no new Charted
-- version and no migration to run against a live database.

create table if not exists charted_subject_collaborators (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  subject_id uuid not null references charted_subjects(id) on delete cascade,

  user_id text not null,
  role text not null default 'assistant'
    check (role in ('lead', 'assistant', 'observer')),

  created_at timestamptz not null default now(),

  unique (subject_id, user_id)
);

create index if not exists charted_collaborators_account_idx
  on charted_subject_collaborators (account_id, subject_id);

alter table charted_subject_collaborators enable row level security;

create table if not exists charted_challenges (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  name text not null,
  basis text not null default 'points'
    check (basis in ('points', 'metric_change', 'check_ins')),
  metric_key text,
  starts_on date not null,
  ends_on date,

  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists charted_challenges_account_idx
  on charted_challenges (account_id, starts_on desc);

alter table charted_challenges enable row level security;

create table if not exists charted_challenge_members (
  account_id uuid not null,
  challenge_id uuid not null references charted_challenges(id) on delete cascade,
  subject_id uuid not null references charted_subjects(id) on delete cascade,

  created_at timestamptz not null default now(),

  primary key (challenge_id, subject_id)
);

create index if not exists charted_challenge_members_account_idx
  on charted_challenge_members (account_id, challenge_id);

alter table charted_challenge_members enable row level security;

-- ============================================================
-- charted module migration 0002_programs_lifecycle.sql
-- source: charted/migrations/0002_programs_lifecycle.sql
-- ============================================================
-- Charted 0002: programs, pauses, the engagement lifecycle, and follow-through.
--
-- Four additions, all downstream of the same complaint about this category:
-- the tools record the journey and then stop watching it.
--
-- 1. `charted_programs` holds reusable tracking setups: which metrics to
--    assign, which goals to set, which milestones to lay out, and the check-in
--    cadence to expect. Onboarding the tenth client stops being a retyping of
--    the first nine. Like everything else in Charted the CONTENT is entirely
--    user-defined: the module ships no programs, no metrics and no opinions.
--
-- 2. `charted_pauses` records windows when a subject is deliberately away: a
--    holiday, an injury, a term break. Days inside a pause do not count toward
--    being due, overdue or lapsed, so the lifecycle engine does not cry wolf
--    about somebody everyone knew was on a beach.
--
-- 3. `charted_engagement` stores one row per subject with the lifecycle state
--    the scheduled pass last computed. Storing the state is what makes
--    TRANSITIONS detectable, and transitions are what fire events: a subject
--    who drifts from due to overdue to lapsed produces one event per crossing,
--    not one per day, and a check-in after a lapse produces a comeback.
--
-- 4. Follow-through columns on `charted_insights`, matching the family
--    pattern: when the operator marks a Coach recommendation acted on, the
--    base engine later compares the cited metrics before and after and writes
--    down whether they actually moved. No model is involved in the judging.
--
-- Conventions carried over from 0001, unchanged: every table is `charted_`
-- prefixed, every row carries `account_id`, every index leads with it, RLS is
-- enabled with no policies so only the service role reaches anything, and
-- dates are `date` columns written as YYYY-MM-DD.
--
-- 0001 is applied and immutable. This file only ADDS: three tables, four
-- indexes, one nullable column on `charted_subjects`, four nullable columns on
-- `charted_insights`, and a widened check constraint on `charted_alerts.kind`.
-- Nothing existing changes in shape or meaning.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Programs
-- ═══════════════════════════════════════════════════════════════════════════

-- A reusable tracking setup. `spec` is jsonb because its shape is the module's
-- own document (metric assignments, goal templates, milestone templates) and
-- no consumer queries inside it; the service validates it on the way in.
-- `cadence_days` is the expected check-in rhythm the program sets on a subject
-- it is applied to; null means the account default stays.
create table if not exists charted_programs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  name text not null,
  description text,
  cadence_days smallint,
  spec jsonb not null default '{}'::jsonb,

  -- Never deleted out from under history; archiving hides it from pickers.
  archived boolean not null default false,

  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists charted_programs_account_idx
  on charted_programs (account_id, archived, name);

alter table charted_programs enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Pauses
-- ═══════════════════════════════════════════════════════════════════════════

-- A deliberate away window. `ends_on` is inclusive. Days inside any pause are
-- excluded from the lifecycle gap arithmetic, so a two-week holiday does not
-- turn a weekly subject into a lapse alert on day eight.
create table if not exists charted_pauses (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  subject_id uuid not null references charted_subjects(id) on delete cascade,

  starts_on date not null,
  ends_on date not null,
  reason text,

  created_by text,
  created_at timestamptz not null default now(),

  check (ends_on >= starts_on)
);

create index if not exists charted_pauses_subject_idx
  on charted_pauses (account_id, subject_id, starts_on desc);

alter table charted_pauses enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. The engagement lifecycle
-- ═══════════════════════════════════════════════════════════════════════════

-- One row per subject: the state the last pass computed, and when it was
-- entered. The stored state exists so the NEXT pass can see the crossing;
-- everything user-facing is recomputed live. `since` is the date the current
-- state began, and it is what the per-episode event dedupe keys are built
-- from, so an episode fires once however many times the pass reruns.
create table if not exists charted_engagement (
  account_id uuid not null,
  subject_id uuid primary key references charted_subjects(id) on delete cascade,

  state text not null default 'waiting'
    check (state in ('waiting', 'active', 'due', 'overdue', 'lapsed', 'paused')),
  since date not null,
  last_check_in_on date,

  updated_at timestamptz not null default now()
);

create index if not exists charted_engagement_state_idx
  on charted_engagement (account_id, state);

alter table charted_engagement enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Per-subject cadence
-- ═══════════════════════════════════════════════════════════════════════════

-- Null means the account-level `config.checkIn.cadenceDays` applies, which is
-- what every existing row keeps meaning. A weekly account with one monthly
-- client sets 30 here and the lifecycle engine stops nagging about them.
alter table charted_subjects
  add column if not exists cadence_days smallint;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Insight follow-through
-- ═══════════════════════════════════════════════════════════════════════════

-- `acted_at` is stamped when the operator marks an insight acted on, and it is
-- the anchor the review measures around. The outcome columns are written once
-- by `reviewInsightOutcomes` when enough time has passed to judge: what the
-- cited metrics did, the plain-language version, and when the review ran. All
-- nullable; every insight from before this migration simply has no
-- follow-through yet, which is true.
alter table charted_insights
  add column if not exists acted_at timestamptz,
  add column if not exists outcome text
    check (outcome in ('improved', 'worsened', 'mixed', 'flat', 'unclear')),
  add column if not exists outcome_note text,
  add column if not exists outcome_checked_at timestamptz;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. New alert kinds
-- ═══════════════════════════════════════════════════════════════════════════

-- The lifecycle pass records what it fires in the same alert log as everything
-- else, so the new kinds join the check constraint: `lapse` for a subject who
-- has quietly stopped, `risk` for one drifting while mid-goal, `comeback` for
-- a return after a lapse, and `report` for a write-up that was finished but
-- never sent, or finally opened.
alter table charted_alerts
  drop constraint if exists charted_alerts_kind_check;

alter table charted_alerts
  add constraint charted_alerts_kind_check
    check (kind in ('goal', 'milestone', 'stall', 'regression', 'due', 'badge',
                    'lapse', 'risk', 'comeback', 'report'));

-- ============================================================
-- jotted module migration 0001_jotted.sql
-- source: jotted/migrations/0001_jotted.sql
-- ============================================================
-- Jotted 0001
--
-- Every table is prefixed `jotted_` and carries `account_id`. Nothing here is
-- shared with another module: clients live in the platform's own contacts table
-- and are referenced by id only, deliberately WITHOUT a foreign key, so that a
-- custom client instance can point Jotted at a database whose contacts table is
-- named or shaped differently.
--
-- Row level security is ENABLED WITH NO POLICIES on every table, which denies
-- all access to anon and authenticated roles and leaves service role as the
-- only way in. That is the correct shape for records a business shows its
-- clients: the module reads on the server through an injected service-role
-- client, and nothing reaches a browser that the consumer did not hand it.
--
-- Every statement is idempotent, so re-running this file is safe.

-- ── Templates ───────────────────────────────────────────────────────────────

create table if not exists jotted_templates (
  id            uuid primary key,
  account_id    uuid not null,
  key           text not null,
  name          text not null,
  description   text,
  version       integer not null default 1,
  archived      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- The key is minted once from the first name given and is then immutable, so it
-- must be unique per account. The display name is free to change and to repeat.
create unique index if not exists jotted_templates_account_key
  on jotted_templates (account_id, key);

create index if not exists jotted_templates_account_archived
  on jotted_templates (account_id, archived);

create table if not exists jotted_template_sections (
  id            uuid primary key,
  account_id    uuid not null,
  template_id   uuid not null references jotted_templates (id) on delete cascade,
  title         text not null,
  position      integer not null default 0
);

create index if not exists jotted_template_sections_template
  on jotted_template_sections (template_id, position);

create table if not exists jotted_template_fields (
  id             uuid primary key,
  account_id     uuid not null,
  template_id    uuid not null references jotted_templates (id) on delete cascade,
  section_id     uuid not null references jotted_template_sections (id) on delete cascade,
  key            text not null,
  label          text not null,
  kind           text not null,
  required       boolean not null default false,
  options        jsonb not null default '[]'::jsonb,
  price_item_key text,
  position       integer not null default 0,
  help           text,
  constraint jotted_template_fields_kind check (kind in (
    'text','longtext','number','measurement','choice','multichoice','boolean','rating','photo'
  ))
);

-- Scoped by template, not by account: two templates may both ask "condition".
create unique index if not exists jotted_template_fields_template_key
  on jotted_template_fields (template_id, key);

create index if not exists jotted_template_fields_template
  on jotted_template_fields (template_id, position);

-- ── Visits ──────────────────────────────────────────────────────────────────

create table if not exists jotted_assessments (
  id               uuid primary key,
  account_id       uuid not null,
  template_id      uuid not null references jotted_templates (id),
  -- Snapshotted at start, so editing a template tomorrow cannot rewrite what
  -- was asked today.
  template_version integer not null,
  -- No foreign key on purpose. See the header.
  contact_id       uuid,
  site_label       text not null,
  status           text not null default 'in_progress',
  visited_on       date not null,
  notes            text,
  created_by       uuid not null,
  completed_at     timestamptz,
  constraint jotted_assessments_status check (status in (
    'draft','in_progress','completed','quoted','accepted','declined','invoiced'
  ))
);

create index if not exists jotted_assessments_account_visited
  on jotted_assessments (account_id, visited_on desc);

create index if not exists jotted_assessments_account_status
  on jotted_assessments (account_id, status);

create index if not exists jotted_assessments_account_contact
  on jotted_assessments (account_id, contact_id);

create table if not exists jotted_answers (
  account_id    uuid not null,
  assessment_id uuid not null references jotted_assessments (id) on delete cascade,
  field_key     text not null,
  value_text    text,
  value_number  double precision,
  value_bool    boolean,
  value_choices jsonb,
  primary key (assessment_id, field_key)
);

-- The upsert in saveAnswer conflicts on this pair, which is why it is the
-- primary key: a flaky connection retrying one tap must not create a second
-- answer to one question.

create index if not exists jotted_answers_account
  on jotted_answers (account_id);

-- ── Photos and measurements ─────────────────────────────────────────────────

create table if not exists jotted_media (
  id            uuid primary key,
  account_id    uuid not null,
  assessment_id uuid not null references jotted_assessments (id) on delete cascade,
  field_key     text,
  storage_key   text not null,
  content_type  text not null,
  bytes         bigint not null default 0,
  caption       text,
  -- Shapes in normalised 0..1 coordinates, never burned into the pixels, so the
  -- original photo stays evidence and the annotation stays editable.
  markup        jsonb not null default '[]'::jsonb,
  taken_at      timestamptz not null default now()
);

create index if not exists jotted_media_assessment
  on jotted_media (assessment_id, taken_at);

create table if not exists jotted_measurements (
  id            uuid primary key,
  account_id    uuid not null,
  assessment_id uuid not null references jotted_assessments (id) on delete cascade,
  field_key     text,
  label         text not null,
  value         double precision not null,
  unit          text not null,
  note          text
);

create index if not exists jotted_measurements_assessment
  on jotted_measurements (assessment_id);

-- ── Quotes ──────────────────────────────────────────────────────────────────

create table if not exists jotted_quotes (
  id               uuid primary key,
  account_id       uuid not null,
  assessment_id    uuid not null references jotted_assessments (id) on delete cascade,
  status           text not null default 'draft',
  currency         text not null,
  -- Every amount is an INTEGER in minor units. A quote is a document somebody
  -- signs, so nothing here is a float.
  subtotal         bigint not null default 0,
  tax_rate_percent double precision not null default 0,
  tax_amount       bigint not null default 0,
  total            bigint not null default 0,
  deposit_amount   bigint not null default 0,
  valid_until      date not null,
  public_token     text not null,
  note             text,
  sent_at          timestamptz,
  decided_at       timestamptz,
  constraint jotted_quotes_status check (status in (
    'draft','sent','accepted','declined','expired'
  ))
);

-- Globally unique, not per account: this token is what gets sent to a client,
-- so it has to identify one quote on its own.
create unique index if not exists jotted_quotes_public_token
  on jotted_quotes (public_token);

create index if not exists jotted_quotes_account_status
  on jotted_quotes (account_id, status);

create index if not exists jotted_quotes_assessment
  on jotted_quotes (assessment_id);

create table if not exists jotted_quote_lines (
  id             uuid primary key,
  account_id     uuid not null,
  quote_id       uuid not null references jotted_quotes (id) on delete cascade,
  description    text not null,
  quantity       double precision not null default 1,
  unit_amount    bigint not null,
  from_field_key text,
  position       integer not null default 0
);

create index if not exists jotted_quote_lines_quote
  on jotted_quote_lines (quote_id, position);

create table if not exists jotted_signatures (
  id          uuid primary key,
  account_id  uuid not null,
  quote_id    uuid not null references jotted_quotes (id) on delete cascade,
  signer_name text not null,
  -- SVG path data. Small, scales to any print size, and still recognisably the
  -- mark the person drew.
  strokes     text not null,
  signed_at   timestamptz not null default now(),
  user_agent  text
);

-- One signature per quote. A second signature on the same document is a new
-- quote, not an amendment to this one.
create unique index if not exists jotted_signatures_quote
  on jotted_signatures (quote_id);

-- ── Write-ups and metering ──────────────────────────────────────────────────

create table if not exists jotted_writeups (
  id            uuid primary key,
  account_id    uuid not null,
  assessment_id uuid not null references jotted_assessments (id) on delete cascade,
  tone          text not null default 'plain',
  body          text not null,
  -- Null when the deterministic composer produced it, which costs nothing and
  -- is how the whole base tier stays free of model tokens.
  model         text,
  generated_at  timestamptz not null default now()
);

create index if not exists jotted_writeups_assessment
  on jotted_writeups (assessment_id, generated_at desc);

create table if not exists jotted_usage (
  account_id uuid not null,
  capability text not null,
  -- YYYY-MM. Caps are per calendar month.
  month      text not null,
  used       integer not null default 0,
  primary key (account_id, capability, month)
);

-- ── Lock everything ─────────────────────────────────────────────────────────
--
-- RLS on with NO policies denies anon and authenticated outright. Service role
-- bypasses RLS, which is the only way this module's data is ever read.

alter table jotted_templates          enable row level security;
alter table jotted_template_sections  enable row level security;
alter table jotted_template_fields    enable row level security;
alter table jotted_assessments        enable row level security;
alter table jotted_answers            enable row level security;
alter table jotted_media              enable row level security;
alter table jotted_measurements       enable row level security;
alter table jotted_quotes             enable row level security;
alter table jotted_quote_lines        enable row level security;
alter table jotted_signatures         enable row level security;
alter table jotted_writeups           enable row level security;
alter table jotted_usage              enable row level security;

-- ============================================================
-- jotted module migration 0002_price_book_followups_site_notes.sql
-- source: jotted/migrations/0002_price_book_followups_site_notes.sql
-- ============================================================
-- Jotted 0002: the price book, lifecycle follow-through, and site memory.
--
-- Three additions, all downstream of the same complaint about this category:
-- field tools capture the visit and then stop. The quote goes out and nobody
-- chases it, the gate code lives in somebody's head, and the photos never
-- reach the customer.
--
-- 1. `jotted_price_items` is the reusable price book. Template fields already
--    carry `price_item_key`; this table is what that key points at, so an
--    answer given on site can become a priced quote line deterministically.
--
-- 2. `jotted_followups` is scheduled follow-through with recorded outcomes.
--    Sending a quote schedules its chases; deciding it settles them; and when
--    a chase has been out long enough to judge, Jotted writes down whether it
--    worked. The module only ever emits events about these; the platform
--    delivers them.
--
-- 3. `jotted_site_notes` is the owner's own knowledge pinned to a place or a
--    client: the gate code, the dog, the panel that lies about its breakers.
--    It resurfaces when the next visit starts there.
--
-- Conventions carried over from 0001, unchanged: every table is `jotted_`
-- prefixed, every row carries `account_id`, every index leads with the column
-- its reads lead with, RLS is enabled with no policies so only the service
-- role can reach anything, and dates are `date` columns written as YYYY-MM-DD.
--
-- 0001 is applied and immutable. This file only ADDS: three tables and their
-- indexes. Nothing existing is altered in shape or meaning, and every
-- statement is idempotent.

-- ── The price book ──────────────────────────────────────────────────────────

create table if not exists jotted_price_items (
  id          uuid primary key,
  account_id  uuid not null,
  -- Minted once from the first name given, then immutable, exactly like a
  -- template key. `price_item_key` on a template field references THIS value,
  -- deliberately without a foreign key: a business can wire its questions to
  -- prices it has not written down yet, and the suggestion step reports the
  -- gap honestly instead of the insert failing on site.
  key         text not null,
  name        text not null,
  description text,
  -- What one unit means, for display only: 'each', 'hour', 'sqft'. Free text,
  -- because Jotted prices work, it does not model inventory.
  unit        text,
  -- Integer minor units, always, like every amount in this module.
  unit_amount bigint not null,
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);

create unique index if not exists jotted_price_items_account_key
  on jotted_price_items (account_id, key);

create index if not exists jotted_price_items_account_archived
  on jotted_price_items (account_id, archived);

-- ── Follow-through ──────────────────────────────────────────────────────────

create table if not exists jotted_followups (
  id            uuid primary key,
  account_id    uuid not null,
  -- 'quote_chase' is created automatically when a quote is sent. 'rebook' is
  -- scheduled deliberately, for work that should be looked at again: the
  -- furnace next autumn, the gutters after the leaves.
  kind          text not null,
  quote_id      uuid references jotted_quotes (id) on delete cascade,
  assessment_id uuid references jotted_assessments (id) on delete cascade,
  -- No foreign key on contacts, for the same reason as everywhere else in
  -- this module: the contacts table belongs to the host.
  contact_id    uuid,
  -- The day this follow-up is due to fire. YYYY-MM-DD.
  due_on        date not null,
  note          text,
  -- scheduled: waiting for its day. sent: the event went to the platform.
  -- settled: sent and its outcome has been judged. cancelled: overtaken by
  -- events before it fired, such as a quote decided before its chase.
  status        text not null default 'scheduled',
  sent_on       date,
  -- Written once, by the deterministic review in runFollowThrough or by the
  -- decision that settles it. 'worked' means the thing the follow-up wanted
  -- happened after it fired. This is the loop nobody else closes: not just
  -- chasing, but writing down whether chasing earned anything.
  outcome       text,
  outcome_note  text,
  outcome_checked_at timestamptz,
  created_at    timestamptz not null default now(),
  constraint jotted_followups_kind check (kind in ('quote_chase', 'rebook')),
  constraint jotted_followups_status check (status in (
    'scheduled', 'sent', 'settled', 'cancelled'
  )),
  constraint jotted_followups_outcome check (outcome is null or outcome in (
    'worked', 'declined', 'no_answer', 'unknown'
  ))
);

-- The shape of the scheduler's read: one account's due work, by status and day.
create index if not exists jotted_followups_account_status_due
  on jotted_followups (account_id, status, due_on);

create index if not exists jotted_followups_quote
  on jotted_followups (quote_id);

create index if not exists jotted_followups_assessment
  on jotted_followups (assessment_id);

-- ── Site memory ─────────────────────────────────────────────────────────────

create table if not exists jotted_site_notes (
  id          uuid primary key,
  account_id  uuid not null,
  -- One of these two anchors is always present, enforced below. `contact_id`
  -- when the place has a client record; `site_label` for the doorstep case,
  -- matched exactly against the label typed on the visit.
  contact_id  uuid,
  site_label  text,
  body        text not null,
  created_by  uuid not null,
  created_at  timestamptz not null default now(),
  constraint jotted_site_notes_anchored check (
    contact_id is not null or site_label is not null
  ),
  constraint jotted_site_notes_body_length check (
    char_length(body) between 1 and 500
  )
);

create index if not exists jotted_site_notes_account_contact
  on jotted_site_notes (account_id, contact_id);

create index if not exists jotted_site_notes_account_site
  on jotted_site_notes (account_id, site_label);

-- ── Lock everything ─────────────────────────────────────────────────────────
--
-- RLS on with NO policies denies anon and authenticated outright. Service role
-- bypasses RLS, which is the only way this module's data is ever read.

alter table jotted_price_items enable row level security;
alter table jotted_followups   enable row level security;
alter table jotted_site_notes  enable row level security;

-- ============================================================
-- solved module migration 0001_solved.sql
-- source: solved/migrations/0001_solved.sql
-- ============================================================
-- Solved 0001: the module's own tables.
--
-- Everything here is prefixed `solved_` and scoped by `account_id`. Team
-- members and any linked clients live in the consumer's shared tables and are
-- only ever read; nothing in this file writes to anything it does not own.
--
-- ── Row-level security ─────────────────────────────────────────────────────
-- RLS is ENABLED with NO policies on every table, which denies everything by
-- default. That is deliberate and matches the platform: isolation is enforced
-- in application code, where every query runs under the service role with an
-- explicit account filter. A module that shipped permissive policies would be
-- handing a team's private workspace to whatever anon key the consumer's front
-- end carries.
--
-- Realtime never reads these tables. Presence and operations travel over
-- broadcast channels, which carry no rows out of the database and therefore
-- need no policy. See src/contract.ts.

-- ── Spaces ─────────────────────────────────────────────────────────────────

create table if not exists solved_spaces (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null,

  title        text not null,
  icon         text,

  -- Names the realtime broadcast channel. Random and never rendered: a
  -- predictable value would let anybody holding the consumer's anon key join a
  -- space they are not in. Rotated when somebody is removed.
  room_key     text not null,

  settings     jsonb not null default '{}'::jsonb,

  is_template  boolean not null default false,
  template_of  uuid references solved_spaces(id) on delete set null,

  version      bigint not null default 1,

  created_by   uuid not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz
);

create index if not exists solved_spaces_account_idx
  on solved_spaces(account_id, archived_at, updated_at desc);

create unique index if not exists solved_spaces_room_key_idx
  on solved_spaces(room_key);

-- ── Pages ──────────────────────────────────────────────────────────────────

create table if not exists solved_pages (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null,
  space_id       uuid not null references solved_spaces(id) on delete cascade,
  parent_page_id uuid references solved_pages(id) on delete cascade,

  title          text not null,

  -- Chooses the SURFACE, not the storage. A document, a board and a timeline
  -- are three ways of looking at rows in solved_elements, which is why changing
  -- this is cheap and moves nothing.
  kind           text not null default 'document'
                   check (kind in ('document', 'board', 'timeline')),

  position       integer not null default 0,

  created_by     uuid not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  archived_at    timestamptz
);

create index if not exists solved_pages_space_idx
  on solved_pages(account_id, space_id, position);

-- ── Elements ───────────────────────────────────────────────────────────────
--
-- One table for every kind of content. Comments, activity, tags, copy and
-- paste, filtering, version history and the write-up each need one uniform
-- anchor; a table per kind would mean a variant of every one of those features
-- per kind.
--
-- Geometry is six real columns rather than a jsonb blob because the board
-- queries it: "everything in this rectangle" is a where clause, and a jsonb
-- geometry would make it a table scan.

create table if not exists solved_elements (
  id                 uuid primary key default gen_random_uuid(),
  account_id         uuid not null,
  space_id           uuid not null references solved_spaces(id) on delete cascade,
  page_id            uuid not null references solved_pages(id) on delete cascade,

  -- Inside a group.
  parent_element_id  uuid references solved_elements(id) on delete set null,
  -- Stuck ONTO something, rather than contained by it. A sticky note on
  -- somebody else's photo has an anchor, and moving the photo takes it along.
  anchor_element_id  uuid references solved_elements(id) on delete set null,

  kind               text not null
                       check (kind in (
                         'text', 'heading', 'list', 'quote', 'code', 'divider',
                         'embed', 'image', 'file',
                         'shape', 'connector', 'freehand', 'sticky',
                         'chart', 'table', 'timeline_item', 'group'
                       )),

  content            jsonb not null default '{}'::jsonb,
  style              jsonb not null default '{}'::jsonb,

  -- Flow order on a document surface.
  position           integer not null default 0,

  -- Board geometry. Ignored by the document surface.
  x                  double precision not null default 0,
  y                  double precision not null default 0,
  w                  double precision not null default 200,
  h                  double precision not null default 120,
  rotation           double precision not null default 0,
  z                  integer not null default 0,

  -- Monotonic. Every conflict decision is made against this.
  version            bigint not null default 1,

  created_by         uuid not null,
  updated_by         uuid,

  -- The soft lock. Expiry is COMPUTED from locked_at against the configured
  -- TTL rather than stored as a flag, so a browser that closed without
  -- releasing cannot hold an element past the TTL.
  locked_by          uuid,
  locked_at          timestamptz,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- Soft. Version history and undo both depend on the row surviving, and an
  -- undo across two clients cannot resurrect a row that is gone.
  deleted_at         timestamptz
);

create index if not exists solved_elements_page_idx
  on solved_elements(account_id, space_id, page_id, deleted_at, position);

create index if not exists solved_elements_space_updated_idx
  on solved_elements(account_id, space_id, updated_at desc);

create index if not exists solved_elements_anchor_idx
  on solved_elements(account_id, anchor_element_id)
  where anchor_element_id is not null;

-- Connectors are looked up by which elements they join, when one of those
-- elements is removed and its connectors have to go with it.
create index if not exists solved_elements_connector_from_idx
  on solved_elements(account_id, space_id, (content ->> 'fromElementId'))
  where kind = 'connector';

create index if not exists solved_elements_connector_to_idx
  on solved_elements(account_id, space_id, (content ->> 'toElementId'))
  where kind = 'connector';

-- ── The operation log ──────────────────────────────────────────────────────
--
-- The durable record of every change, and the sync seam.
--
-- `seq` is a bigserial, so ordering is assigned by the DATABASE and is total.
-- Not a client timestamp: two browsers disagree about the time by seconds, and
-- a rule that read a client clock would let the machine with the fast clock
-- quietly win every conflict forever.
--
-- This is what a reconnecting client replays, what the polling fallback reads
-- on a deploy with no realtime transport, and what a future CRDT provider would
-- keep writing to. It exists on every deploy, realtime or not, which is what
-- makes the two roads converge on the same document.

create table if not exists solved_ops (
  seq          bigserial primary key,

  account_id   uuid not null,
  space_id     uuid not null references solved_spaces(id) on delete cascade,
  page_id      uuid references solved_pages(id) on delete cascade,
  element_id   uuid,

  -- Client-generated and unique, so an op that arrives twice (once over
  -- broadcast, once over the poll) is applied once.
  op_id        text not null,

  kind         text not null
                 check (kind in (
                   'element.create', 'element.update', 'element.move',
                   'element.delete', 'element.restore',
                   'page.create', 'page.update', 'page.reorder',
                   'space.update'
                 )),

  -- The version the author was looking at. Null for a create.
  base_version bigint,

  patch        jsonb not null default '{}'::jsonb,

  actor_id     uuid not null,
  created_at   timestamptz not null default now()
);

create unique index if not exists solved_ops_op_id_idx
  on solved_ops(account_id, op_id);

create index if not exists solved_ops_replay_idx
  on solved_ops(account_id, space_id, seq);

-- ── Membership ─────────────────────────────────────────────────────────────
--
-- Solved owns membership and never identity. There is no copy of the platform's
-- user table here: `user_id` is whatever the consumer calls a user, and names
-- and avatars are resolved through the injected directory at render time.
--
-- A guest is an ordinary row at the `guest` role, which is why every membership
-- check already handles them and there is no second permission system that
-- could disagree with the first.

create table if not exists solved_members (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null,
  space_id    uuid not null references solved_spaces(id) on delete cascade,
  user_id     uuid not null,

  role        text not null default 'member'
                check (role in ('owner', 'admin', 'member', 'viewer', 'guest')),

  invited_by  uuid,
  created_at  timestamptz not null default now()
);

create unique index if not exists solved_members_unique_idx
  on solved_members(account_id, space_id, user_id);

create index if not exists solved_members_user_idx
  on solved_members(account_id, user_id);

-- ── Comments ───────────────────────────────────────────────────────────────
--
-- A comment targets a space, a page, an element, or a RANGE inside an element,
-- so the same code marks up a paragraph, a shape, a photo and three words in
-- the middle of a sentence.
--
-- A range stores the text it covered as well as the offsets. When the paragraph
-- changes, the quote is what finds the passage again, and `orphaned` is set
-- when it cannot be found at all. A comment that quietly re-attached itself to
-- whatever words are there now is how a note reading "this number is wrong"
-- ends up pointing at somebody's name.

create table if not exists solved_comments (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null,
  space_id          uuid not null references solved_spaces(id) on delete cascade,
  page_id           uuid references solved_pages(id) on delete cascade,

  target_kind       text not null
                      check (target_kind in ('space', 'page', 'element', 'range')),
  target_id         uuid,

  -- { elementId, from, to, quoted }
  range             jsonb,
  orphaned          boolean not null default false,

  -- Threads are one level deep. A reply to a reply joins the same thread rather
  -- than starting a third tier nobody can follow.
  parent_comment_id uuid references solved_comments(id) on delete cascade,

  body              text not null,
  author_id         uuid not null,

  resolved_at       timestamptz,
  resolved_by       uuid,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

create index if not exists solved_comments_space_idx
  on solved_comments(account_id, space_id, resolved_at, created_at);

create index if not exists solved_comments_target_idx
  on solved_comments(account_id, target_id, deleted_at)
  where target_id is not null;

create index if not exists solved_comments_thread_idx
  on solved_comments(account_id, parent_comment_id)
  where parent_comment_id is not null;

-- ── Mentions ───────────────────────────────────────────────────────────────
--
-- Derivable from the body, and stored anyway: "what was I mentioned in" is a
-- question a badge asks on every page load, and parsing every comment body to
-- answer it would be the slowest thing on the screen.

create table if not exists solved_mentions (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null,
  space_id          uuid not null references solved_spaces(id) on delete cascade,
  comment_id        uuid not null references solved_comments(id) on delete cascade,
  element_id        uuid,
  mentioned_user_id uuid not null,
  seen_at           timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists solved_mentions_user_idx
  on solved_mentions(account_id, mentioned_user_id, seen_at, created_at desc);

-- ── The activity channel ───────────────────────────────────────────────────
--
-- Append only. Every service that changes anything writes one row through a
-- single helper, so a missing entry is a bug in one function rather than an
-- omission in forty. The summary is written in plain language at the moment the
-- thing happened, which is why the feed reads as sentences and why the same
-- lines can be handed straight to the digest.

create table if not exists solved_activity (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null,
  space_id    uuid not null references solved_spaces(id) on delete cascade,
  page_id     uuid references solved_pages(id) on delete set null,
  element_id  uuid,

  actor_id    uuid not null,

  verb        text not null
                check (verb in (
                  'created', 'edited', 'moved', 'deleted', 'restored',
                  'commented', 'replied', 'resolved', 'mentioned',
                  'uploaded', 'tagged', 'shared', 'joined', 'assigned'
                )),

  target_kind text not null
                check (target_kind in
                  ('space', 'page', 'element', 'comment', 'attachment', 'tag')),
  target_id   uuid,

  summary     text not null,
  data        jsonb not null default '{}'::jsonb,

  created_at  timestamptz not null default now()
);

create index if not exists solved_activity_feed_idx
  on solved_activity(account_id, space_id, created_at desc);

create index if not exists solved_activity_actor_idx
  on solved_activity(account_id, space_id, actor_id, created_at desc);

-- ── Following and muting ───────────────────────────────────────────────────
--
-- Muting stops notifications and nothing else. The record stays readable,
-- because a member who muted a busy space still needs to catch up deliberately,
-- and hiding it would be a different and worse feature.

create table if not exists solved_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null,
  space_id     uuid not null references solved_spaces(id) on delete cascade,
  user_id      uuid not null,

  state        text not null default 'following'
                 check (state in ('following', 'muted')),

  last_seen_at timestamptz,
  created_at   timestamptz not null default now()
);

create unique index if not exists solved_subscriptions_unique_idx
  on solved_subscriptions(account_id, space_id, user_id);

-- ── Tags ───────────────────────────────────────────────────────────────────
--
-- Account-wide and editable. Assignment is by id and the name lives on the tag,
-- which is what makes renaming safe: everything carrying it follows, with no
-- write to any element.

create table if not exists solved_tags (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  name       text not null,
  color      text not null default '#8a94a3',
  created_by uuid not null,
  created_at timestamptz not null default now()
);

-- Case-insensitively unique per account. Two tags that look identical in a
-- filter bar are a bug people report as "the filter is broken".
create unique index if not exists solved_tags_name_idx
  on solved_tags(account_id, lower(name));

create table if not exists solved_element_tags (
  account_id  uuid not null,
  space_id    uuid not null references solved_spaces(id) on delete cascade,
  element_id  uuid not null references solved_elements(id) on delete cascade,
  tag_id      uuid not null references solved_tags(id) on delete cascade,
  assigned_by uuid,
  created_at  timestamptz not null default now(),

  primary key (account_id, element_id, tag_id)
);

create index if not exists solved_element_tags_tag_idx
  on solved_element_tags(account_id, space_id, tag_id);

-- ── Attachments ────────────────────────────────────────────────────────────
--
-- REFERENCE rows only. The file itself lives in whatever vault the consumer
-- injected, and `vault_id` is that vault's own identifier, opaque here. Solved
-- never writes the platform's document table, because hardcoding a table name
-- into the module would break any client instance whose schema differs.
--
-- `contact_id` is how a file dropped on a board also lands on a client record.
-- Not a foreign key: the clients table belongs to the consumer and may not even
-- be called that.

create table if not exists solved_attachments (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null,
  space_id     uuid not null references solved_spaces(id) on delete cascade,
  element_id   uuid references solved_elements(id) on delete set null,

  vault_id     text not null,
  url          text not null,
  filename     text not null,
  content_type text not null default 'application/octet-stream',
  size_bytes   bigint not null default 0,

  contact_id   uuid,

  uploaded_by  uuid not null,
  created_at   timestamptz not null default now()
);

create index if not exists solved_attachments_space_idx
  on solved_attachments(account_id, space_id, created_at desc);

create index if not exists solved_attachments_element_idx
  on solved_attachments(account_id, element_id)
  where element_id is not null;

-- ── Tasks: the optional feature, shipped dark ──────────────────────────────
--
-- Task assignment is off by default behind `config.features.tasks.enabled`. The
-- schema, the services, the tools and the UI all ship complete; the flag is the
-- only thing that decides whether they are reachable, so switching it on later
-- is a config change and never a rebuild.
--
-- A task is a row BESIDE an element, never a change to it. An element that
-- stops being a task goes back to being an ordinary item with no trace, and a
-- workspace with the feature off reads exactly as it did before.
--
-- `status` is intentionally free text with no check constraint: the allowed set
-- is `config.features.tasks.statuses` and is validated in the service, because
-- a client that renames its columns should not need a migration.

create table if not exists solved_tasks (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null,
  space_id    uuid not null references solved_spaces(id) on delete cascade,
  element_id  uuid not null references solved_elements(id) on delete cascade,

  assignee_id uuid,
  due_date    date,
  status      text not null default 'todo',

  created_by  uuid not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists solved_tasks_element_idx
  on solved_tasks(account_id, element_id);

create index if not exists solved_tasks_due_idx
  on solved_tasks(account_id, space_id, due_date);

-- ── Row-level security ─────────────────────────────────────────────────────
-- On, with no policies. Deny by default; the application is the boundary.

alter table solved_spaces        enable row level security;
alter table solved_pages         enable row level security;
alter table solved_elements      enable row level security;
alter table solved_ops           enable row level security;
alter table solved_members       enable row level security;
alter table solved_comments      enable row level security;
alter table solved_mentions      enable row level security;
alter table solved_activity      enable row level security;
alter table solved_subscriptions enable row level security;
alter table solved_tags          enable row level security;
alter table solved_element_tags  enable row level security;
alter table solved_attachments   enable row level security;
alter table solved_tasks         enable row level security;

-- ============================================================
-- solved module migration 0002_followthrough.sql
-- source: solved/migrations/0002_followthrough.sql
-- ============================================================
-- Solved 0002: reuse, the write-up, history and delivery, the AI allowance,
-- and follow-through.
--
-- Everything downstream of the same complaint about this category: workspaces
-- capture thinking and then stop. A decision written on a board never becomes
-- an action anyone is reminded of, a document quietly goes stale, and the tool
-- does nothing about either. This migration adds the rows that let Solved
-- close those loops deterministically, plus the tables groups nine through
-- eleven were designed around and the usage counter the AI tier's monthly
-- allowance is enforced on.
--
-- Conventions carried over from 0001, unchanged: every table is `solved_`
-- prefixed, every row carries `account_id`, every index leads with it, RLS is
-- enabled with no policies so only the service role can reach anything, and
-- user-facing dates are `date` columns written as YYYY-MM-DD.
--
-- 0001 is applied and immutable. This file only ADDS: five tables, their
-- indexes, and three nullable columns on `solved_pages`. Nothing existing is
-- altered in shape or meaning.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Write-ups
-- ═══════════════════════════════════════════════════════════════════════════

-- The written summary of a space: what was decided, what is open, what the
-- charts say. The base tier builds one deterministically from the space's own
-- content at zero token cost; the AI tier drafts a better one from the same
-- material. Either way it is an ordinary editable row, and publishing it fires
-- one `writeup.ready` event that the PLATFORM delivers. Solved never sends.
--
-- `built_from` records what the builder saw (element counts, the op sequence
-- at build time, which sections had material), so a reader can tell whether a
-- write-up predates the week's changes.

create table if not exists solved_writeups (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null,
  space_id     uuid not null references solved_spaces(id) on delete cascade,

  title        text not null,
  body         text not null default '',

  status       text not null default 'draft'
                 check (status in ('draft', 'published')),

  -- 'base' for the deterministic builder, 'facilitator' for the AI draft,
  -- 'manual' for one written from scratch. Provenance, not permission.
  source       text not null default 'base'
                 check (source in ('base', 'facilitator', 'manual')),

  built_from   jsonb not null default '{}'::jsonb,

  created_by   uuid not null,
  published_at timestamptz,
  published_by uuid,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists solved_writeups_space_idx
  on solved_writeups(account_id, space_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Snapshots: version history
-- ═══════════════════════════════════════════════════════════════════════════

-- A snapshot is the whole element state of a space at one op sequence, stored
-- as one jsonb payload. The op log stays the truth; a snapshot is the fast
-- road back to a moment, and `up_to_seq` says exactly which moment.
--
-- Restores never rewrite history. Restoring writes NEW operations that walk
-- the elements back, and it takes a `restore_point` snapshot first, so a
-- restore is itself undoable. `kind = 'auto'` rows are written every
-- `config.collaboration.opsPerSnapshot` operations by the client that happens
-- to join next, which is why the column exists on config.

create table if not exists solved_snapshots (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null,
  space_id      uuid not null references solved_spaces(id) on delete cascade,

  label         text not null default '',
  kind          text not null default 'manual'
                  check (kind in ('manual', 'auto', 'restore_point')),

  -- The highest op sequence this snapshot has incorporated.
  up_to_seq     bigint not null default 0,

  -- Every live element in the space at that moment, as the contract shape.
  elements      jsonb not null default '[]'::jsonb,
  element_count integer not null default 0,

  created_by    uuid not null,
  created_at    timestamptz not null default now()
);

create index if not exists solved_snapshots_space_idx
  on solved_snapshots(account_id, space_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Share links
-- ═══════════════════════════════════════════════════════════════════════════

-- A share link lets somebody outside the workspace see a space or one page.
-- Solved stores the grant and VALIDATES tokens; serving the shared page is the
-- consumer's route, because the module never owns a URL.
--
-- What is stored is a SHA-256 of the token's secret, never the secret itself,
-- so a leaked table cannot be turned back into working links. The permission
-- is capped at creation by `config.sharing.maxPermission` and the expiry
-- defaults from `config.sharing.defaultExpiryDays`; revocation is a stamp, so
-- the row survives as a record of what was shared and when it stopped.

create table if not exists solved_share_links (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null,
  space_id     uuid not null references solved_spaces(id) on delete cascade,
  page_id      uuid references solved_pages(id) on delete cascade,

  permission   text not null default 'view'
                 check (permission in ('view', 'comment', 'edit')),

  token_hash   text not null default '',

  expires_at   timestamptz,
  revoked_at   timestamptz,

  last_used_at timestamptz,
  use_count    integer not null default 0,

  created_by   uuid not null,
  created_at   timestamptz not null default now()
);

create index if not exists solved_share_links_space_idx
  on solved_share_links(account_id, space_id, created_at desc);

create unique index if not exists solved_share_links_lookup_idx
  on solved_share_links(account_id, token_hash);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Decisions, with follow-through
-- ═══════════════════════════════════════════════════════════════════════════

-- A decision is a row BESIDE the content, never a change to it, the same shape
-- of choice as `solved_tasks`. It may point at the element it was written on
-- and it may not, because plenty of decisions are made out loud.
--
-- The lifecycle is the point. `status` moves open -> acted (or dropped);
-- `acted_at` is stamped when somebody marks it acted on; and the outcome
-- columns are written once, by the owner, when the follow-through sweep asks
-- whether acting on it actually worked. `nudged_at` and `checkin_sent_at`
-- record that the sweep has already spoken, so a decision is nudged once and
-- checked on once, from database state rather than from anybody's memory.
-- No workspace product closes this loop; this one does.

create table if not exists solved_decisions (
  id                  uuid primary key default gen_random_uuid(),
  account_id          uuid not null,
  space_id            uuid not null references solved_spaces(id) on delete cascade,
  page_id             uuid references solved_pages(id) on delete set null,
  element_id          uuid references solved_elements(id) on delete set null,

  title               text not null check (char_length(title) between 1 and 300),
  detail              text not null default '',

  owner_id            uuid,
  decided_on          date not null,

  status              text not null default 'open'
                        check (status in ('open', 'acted', 'dropped')),
  acted_at            timestamptz,

  outcome             text
                        check (outcome in ('worked', 'did_not_work', 'mixed', 'unclear')),
  outcome_note        text,
  outcome_recorded_at timestamptz,

  -- Stamped by the follow-through sweep, once each.
  nudged_at           timestamptz,
  checkin_sent_at     timestamptz,

  created_by          uuid not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists solved_decisions_space_idx
  on solved_decisions(account_id, space_id, status, decided_on desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. The AI allowance
-- ═══════════════════════════════════════════════════════════════════════════

-- One row per account per month, counting assistant calls against
-- `config.ai.monthlyCap`. A counter rather than a log: the module needs to
-- refuse politely at the cap, not to bill by the token, and the consumer's own
-- systems are where real metering belongs.

create table if not exists solved_ai_usage (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  -- YYYY-MM.
  month      text not null check (month ~ '^\d{4}-\d{2}$'),
  used       integer not null default 0,

  updated_at timestamptz not null default now()
);

create unique index if not exists solved_ai_usage_month_idx
  on solved_ai_usage(account_id, month);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Page freshness
-- ═══════════════════════════════════════════════════════════════════════════

-- Three nullable columns on `solved_pages`, and every page that existed before
-- this migration simply has no review policy yet, which is true.
--
-- `review_every_days` is the owner saying "this page matters enough to check".
-- `last_reviewed_at` is the last time somebody confirmed it still holds up,
-- which is a DIFFERENT fact from `updated_at`: an edit proves somebody touched
-- it, a review proves somebody read it and stands behind it. The follow-through
-- sweep fires one `page.stale` event per overdue period, and marking the page
-- reviewed resets the clock.

alter table solved_pages
  add column if not exists review_every_days integer,
  add column if not exists last_reviewed_at  timestamptz,
  add column if not exists last_reviewed_by  uuid;

create index if not exists solved_pages_review_idx
  on solved_pages(account_id, space_id)
  where review_every_days is not null;

-- ── Row-level security ─────────────────────────────────────────────────────
-- On, with no policies, exactly as 0001. Deny by default; the application is
-- the boundary.

alter table solved_writeups    enable row level security;
alter table solved_snapshots   enable row level security;
alter table solved_share_links enable row level security;
alter table solved_decisions   enable row level security;
alter table solved_ai_usage    enable row level security;

-- ============================================================
-- gated module migration 0001_gated.sql
-- source: gated/migrations/0001_gated.sql
-- ============================================================
-- Gated 0001: content, access and pricing.
--
-- Every table here is prefixed `gated_` so it is obvious at a glance which
-- module owns it, and so a consumer can see exactly what a Gated release adds
-- to their database.
--
-- ── Tenancy ────────────────────────────────────────────────────────────────
-- Every row carries `account_id`, and every index leads with it. There is no
-- table here that can be read without naming an account.
--
-- `account_id` is a uuid that REFERENCES a shared record by id, with no foreign
-- key constraint. That is deliberate and it is the contract: Gated is mounted
-- against a database it does not own, whose accounts table may be called
-- `users`, `accounts` or something else entirely, and a hard FK would make the
-- module refuse to install anywhere but one platform. The same applies to
-- `gated_members.contact_id`, which points at the shared client database.
-- The consumer owns referential integrity for its own records. We own
-- everything downstream of `account_id`, and those FKs are real.
--
-- ── Row level security ─────────────────────────────────────────────────────
-- RLS is enabled with no policies, matching the platform's own convention.
-- Server code reaches these tables with the service role; every other role is
-- denied every row. A module that shipped permissive policies would be handing
-- its data to whatever anon key the consumer's front end carries. This matters
-- more here than in most modules: these tables are the paywall.
--
-- ── Dates ──────────────────────────────────────────────────────────────────
-- Anything that is a calendar boundary rather than a moment is a `date`,
-- written by the module as YYYY-MM-DD. That is the format
-- `toLocaleDateString("en-CA")` produces, which is why the module formats with
-- that locale everywhere.
--
-- ── Money ──────────────────────────────────────────────────────────────────
-- Every amount is an integer in MINOR UNITS with an explicit currency beside
-- it. No floats anywhere near a price.
--
-- ── The two optional features ──────────────────────────────────────────────
-- `gated_comments` and `gated_certificates` are created here even though both
-- features ship switched off. Creating them now is what makes the flags a
-- config change later rather than a migration, which is the whole point of
-- shipping the stubs.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Content
-- ═══════════════════════════════════════════════════════════════════════════

-- One piece of content. Exactly one of `storage_key`, `external_url` and `body`
-- carries the payload, decided by `kind`, and the service layer enforces which.
-- Not a check constraint: an item whose file is still uploading legitimately
-- has all three null, and failing that insert would mean no draft state.
create table if not exists gated_items (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  kind text not null check (kind in ('video', 'audio', 'file', 'text', 'link', 'embed')),
  title text not null,
  description text,

  -- Permanent once shared. It is half of every public sales URL, so renaming
  -- one breaks links a creator has already posted. The service layer refuses to
  -- change it after first publish.
  slug text not null,

  storage_key text,
  external_url text,
  body text,

  duration_seconds integer,
  size_bytes bigint,

  published boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (account_id, slug)
);

create index if not exists gated_items_account_idx
  on gated_items (account_id, published, created_at desc);

alter table gated_items enable row level security;

-- A collection, or a course, which is a collection whose order matters.
create table if not exists gated_collections (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  kind text not null default 'collection' check (kind in ('collection', 'course')),
  title text not null,
  description text,
  slug text not null,
  cover_url text,

  published boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (account_id, slug)
);

create index if not exists gated_collections_account_idx
  on gated_collections (account_id, published, created_at desc);

alter table gated_collections enable row level security;

-- Membership of an item in a collection, plus how it unlocks.
--
-- `drip_mode` is the whole of the drip feature. `immediate` is everything at
-- once. `days_after_join` counts from the member's own access start, so two
-- members who joined a month apart see the same sequence at the same pace.
-- `on_date` is a scheduled release, the same day for everybody.
--
-- `free_preview` is a sample inside an otherwise paid collection. It is here
-- rather than on the item because the same item can be a paid lesson in one
-- collection and a free taster in another.
create table if not exists gated_collection_items (
  collection_id uuid not null references gated_collections(id) on delete cascade,
  item_id uuid not null references gated_items(id) on delete cascade,
  account_id uuid not null,

  position integer not null default 0,

  drip_mode text not null default 'immediate'
    check (drip_mode in ('immediate', 'days_after_join', 'on_date')),
  drip_days integer check (drip_days is null or drip_days >= 0),
  drip_date date,

  free_preview boolean not null default false,

  primary key (collection_id, item_id)
);

create index if not exists gated_collection_items_order_idx
  on gated_collection_items (collection_id, position);

alter table gated_collection_items enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Pricing
-- ═══════════════════════════════════════════════════════════════════════════

-- What something costs, right now.
--
-- Prices are VERSIONED rather than edited. Changing a price retires the current
-- row and writes a new one, and every grant records the price id it was bought
-- under, so a creator can reprice at any time without touching anyone's
-- existing access. That is the reason this is a table and not a column on the
-- item, and it is the requirement that most often gets built wrong.
create table if not exists gated_prices (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  scope text not null check (scope in ('item', 'collection', 'bundle', 'tier')),
  target_id uuid not null,

  kind text not null check (kind in ('free', 'one_time', 'recurring', 'pwyw')),

  -- Minor units. Null for `free`. For `pwyw` this is the SUGGESTED amount and
  -- `minimum_minor` is the floor.
  amount_minor integer check (amount_minor is null or amount_minor >= 0),
  minimum_minor integer check (minimum_minor is null or minimum_minor >= 0),
  currency text not null default 'USD',

  interval text check (interval is null or interval in ('month', 'year')),
  trial_days integer not null default 0 check (trial_days >= 0),

  -- Days of access this buys. Null means forever, the normal case for a
  -- one-time purchase. Set, it is time-limited access that expires.
  access_days integer check (access_days is null or access_days > 0),

  -- Free, in exchange for an email address. Only meaningful when kind = 'free'.
  requires_email boolean not null default true,

  active boolean not null default true,
  created_at timestamptz not null default now(),
  retired_at timestamptz,

  -- A recurring price without an interval is not chargeable, and a one-time
  -- price with one is a contradiction. Both are cheap to catch here.
  constraint gated_prices_interval_matches_kind check (
    (kind = 'recurring' and interval is not null)
    or (kind <> 'recurring' and interval is null)
  ),
  constraint gated_prices_amount_present check (
    kind = 'free' or amount_minor is not null
  )
);

-- Only one active price per target per kind. A creator repricing writes the new
-- row and retires the old one in the same transaction, so this never fights a
-- legitimate change, and it does stop two live prices for one thing.
create unique index if not exists gated_prices_one_active_idx
  on gated_prices (account_id, scope, target_id, kind)
  where active;

create index if not exists gated_prices_target_idx
  on gated_prices (account_id, scope, target_id);

alter table gated_prices enable row level security;

-- A membership tier. What it includes is stored as arrays of ids rather than a
-- join table: the list is read whole on every access check, it is short, and a
-- join table would buy referential integrity we do not need at the cost of a
-- second query on the hot path.
create table if not exists gated_tiers (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  name text not null,
  description text,
  slug text not null,
  position integer not null default 0,

  collection_ids uuid[] not null default '{}',
  item_ids uuid[] not null default '{}',

  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (account_id, slug)
);

alter table gated_tiers enable row level security;

-- Several things at one price.
create table if not exists gated_bundles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  title text not null,
  description text,
  slug text not null,

  collection_ids uuid[] not null default '{}',
  item_ids uuid[] not null default '{}',

  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (account_id, slug)
);

alter table gated_bundles enable row level security;

-- A discount code.
--
-- `redeemed_count` is incremented on settlement, not on checkout start, so an
-- abandoned checkout does not burn a redemption.
create table if not exists gated_coupons (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  code text not null,
  kind text not null check (kind in ('percent', 'amount')),
  -- Percent as a whole number 1..100, or minor units for `amount`.
  value integer not null check (value > 0),

  -- Null scope means it applies to everything this account sells.
  scope text check (scope is null or scope in ('item', 'collection', 'bundle', 'tier')),
  target_id uuid,

  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redeemed_count integer not null default 0,
  expires_at timestamptz,

  active boolean not null default true,
  created_at timestamptz not null default now(),

  unique (account_id, code)
);

alter table gated_coupons enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Members and access
-- ═══════════════════════════════════════════════════════════════════════════

-- A member.
--
-- `contact_id` points at the shared client database, so a buyer is a client
-- like any other and shows up wherever the creator's clients show up. It is
-- nullable because a consumer may not have supplied a contacts port, and
-- because a free signup should never fail on the CRM's account.
--
-- `email` is the member's identity for magic links, and it is unique per
-- account: one person, one membership, however many things they buy.
create table if not exists gated_members (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  contact_id uuid,

  email text not null,
  name text,

  status text not null default 'active'
    check (status in ('active', 'trialing', 'lapsed', 'cancelled')),
  tier_id uuid references gated_tiers(id) on delete set null,

  joined_at timestamptz not null default now(),
  last_seen_at timestamptz,

  unique (account_id, email)
);

create index if not exists gated_members_account_status_idx
  on gated_members (account_id, status, joined_at desc);

alter table gated_members enable row level security;

-- What a member can reach, why, and until when.
--
-- A grant names exactly one target. Buying a bundle writes one grant per
-- included thing, all sharing a `purchase_id`, because unpicking a bundle later
-- should not require knowing what was in it at the time it was sold.
--
-- Revocation is a timestamp rather than a delete, so a creator who revokes by
-- mistake can see what happened and a refund leaves a trail.
create table if not exists gated_access_grants (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  member_id uuid not null references gated_members(id) on delete cascade,

  scope text not null check (scope in ('item', 'collection', 'bundle', 'tier')),
  target_id uuid not null,

  source text not null
    check (source in ('purchase', 'subscription', 'manual', 'free', 'bundle', 'tier')),

  price_id uuid references gated_prices(id) on delete set null,
  purchase_id uuid,
  subscription_id uuid,

  starts_at timestamptz not null default now(),
  -- Null means it does not expire.
  expires_at timestamptz,
  revoked_at timestamptz,

  created_at timestamptz not null default now()
);

-- The hot path: "can this member reach this thing". Leads with member_id
-- because every check names one.
create index if not exists gated_grants_lookup_idx
  on gated_access_grants (member_id, scope, target_id)
  where revoked_at is null;

create index if not exists gated_grants_account_idx
  on gated_access_grants (account_id, created_at desc);

-- For the expiry sweep and the "expiring soon" notice.
create index if not exists gated_grants_expiry_idx
  on gated_access_grants (account_id, expires_at)
  where revoked_at is null and expires_at is not null;

alter table gated_access_grants enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Money taken
-- ═══════════════════════════════════════════════════════════════════════════

-- One payment attempt.
--
-- `payment_ref` is whatever the consumer's payment port handed back. Gated
-- stores it and never interprets it, which is what keeps this module out of the
-- payments business.
create table if not exists gated_purchases (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  member_id uuid references gated_members(id) on delete set null,

  scope text not null check (scope in ('item', 'collection', 'bundle', 'tier')),
  target_id uuid not null,
  price_id uuid references gated_prices(id) on delete set null,

  amount_minor integer not null check (amount_minor >= 0),
  currency text not null default 'USD',
  coupon_id uuid references gated_coupons(id) on delete set null,

  status text not null default 'pending'
    check (status in ('pending', 'paid', 'refunded', 'failed')),
  payment_ref text,

  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists gated_purchases_account_idx
  on gated_purchases (account_id, status, created_at desc);

create index if not exists gated_purchases_ref_idx
  on gated_purchases (payment_ref);

alter table gated_purchases enable row level security;

-- A recurring membership.
--
-- `subscription_ref` is null until the platform's payment service actually
-- supports recurring billing. Until then a subscription row can exist in a
-- simulated state on a development instance, which is why the ref is nullable
-- rather than required.
create table if not exists gated_subscriptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  member_id uuid not null references gated_members(id) on delete cascade,

  tier_id uuid references gated_tiers(id) on delete set null,
  price_id uuid references gated_prices(id) on delete set null,

  status text not null default 'active'
    check (status in ('trialing', 'active', 'past_due', 'cancelled')),
  subscription_ref text,

  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gated_subscriptions_account_idx
  on gated_subscriptions (account_id, status);

alter table gated_subscriptions enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. The portal
-- ═══════════════════════════════════════════════════════════════════════════

-- Where a member got to. One row per member per item, upserted, because the
-- history of every scrub position is worth nothing and would be the largest
-- table in the module.
create table if not exists gated_progress (
  member_id uuid not null references gated_members(id) on delete cascade,
  item_id uuid not null references gated_items(id) on delete cascade,
  account_id uuid not null,

  position integer not null default 0 check (position >= 0),
  completed boolean not null default false,

  updated_at timestamptz not null default now(),

  primary key (member_id, item_id)
);

create index if not exists gated_progress_member_idx
  on gated_progress (member_id, updated_at desc);

alter table gated_progress enable row level security;

-- The creator's own FAQ, shown on sales pages, in the portal, or both.
create table if not exists gated_faqs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  question text not null,
  answer text not null,
  position integer not null default 0,

  show_on_sales boolean not null default true,
  show_in_portal boolean not null default true,
  published boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gated_faqs_order_idx
  on gated_faqs (account_id, position);

alter table gated_faqs enable row level security;

-- The updates feed. `tier_id` null means everybody with any access.
create table if not exists gated_announcements (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  title text not null,
  body text not null,
  tier_id uuid references gated_tiers(id) on delete set null,

  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists gated_announcements_feed_idx
  on gated_announcements (account_id, published_at desc);

alter table gated_announcements enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Protection
-- ═══════════════════════════════════════════════════════════════════════════

-- One row per download, so a limit can be enforced and a creator can see when
-- one account is behaving like ten people.
create table if not exists gated_downloads (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  member_id uuid not null references gated_members(id) on delete cascade,
  item_id uuid not null references gated_items(id) on delete cascade,

  downloaded_at timestamptz not null default now(),
  ip_hash text,
  user_agent text
);

create index if not exists gated_downloads_count_idx
  on gated_downloads (member_id, item_id);

alter table gated_downloads enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Counters
-- ═══════════════════════════════════════════════════════════════════════════

-- The analytics rows.
--
-- This is a log, not an analytics engine. Gated writes what happened and the
-- platform's intelligence layer reads it. Keeping the shape this dumb is what
-- stops a reporting product growing inside a content module.
create table if not exists gated_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  kind text not null check (kind in ('view', 'conversion', 'sale', 'signup', 'download')),

  scope text check (scope is null or scope in ('item', 'collection', 'bundle', 'tier')),
  target_id uuid,
  member_id uuid references gated_members(id) on delete set null,

  -- Minor units, for `sale`. Null otherwise.
  amount_minor integer,
  currency text,

  -- The calendar day, for grouping without a timezone argument on every query.
  occurred_on date not null default (now() at time zone 'utc')::date,
  occurred_at timestamptz not null default now()
);

create index if not exists gated_events_rollup_idx
  on gated_events (account_id, kind, occurred_on);

create index if not exists gated_events_target_idx
  on gated_events (account_id, scope, target_id, kind);

alter table gated_events enable row level security;

-- Metered AI usage, per account per calendar month. Mirrors the platform's own
-- monthly cap convention so a consumer does not have to learn a second one.
create table if not exists gated_usage (
  account_id uuid not null,
  -- YYYY-MM, written by the module in en-CA so it sorts.
  month_key text not null,
  assistant_runs integer not null default 0,

  updated_at timestamptz not null default now(),

  primary key (account_id, month_key)
);

alter table gated_usage enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. The two optional features, shipped switched OFF
-- ═══════════════════════════════════════════════════════════════════════════

-- Behind `config.features.community`. Nothing reads or writes this while the
-- flag is false. The table exists now so that switching the flag on later is a
-- config change and not a migration.
create table if not exists gated_comments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  item_id uuid references gated_items(id) on delete cascade,
  collection_id uuid references gated_collections(id) on delete cascade,
  member_id uuid references gated_members(id) on delete set null,

  -- Null member with a body means the creator posted it.
  author_is_creator boolean not null default false,
  body text not null,
  parent_id uuid references gated_comments(id) on delete cascade,

  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists gated_comments_thread_idx
  on gated_comments (account_id, item_id, created_at);

alter table gated_comments enable row level security;

-- Behind `config.features.certificates`.
create table if not exists gated_certificates (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  member_id uuid not null references gated_members(id) on delete cascade,
  collection_id uuid not null references gated_collections(id) on delete cascade,

  -- The public verification code printed on the certificate.
  code text not null,
  issued_on date not null default (now() at time zone 'utc')::date,
  storage_key text,

  unique (account_id, code)
);

create index if not exists gated_certificates_member_idx
  on gated_certificates (member_id, collection_id);

alter table gated_certificates enable row level security;

-- ============================================================
-- gated module migration 0002_lifecycle_reviews_notes.sql
-- source: gated/migrations/0002_lifecycle_reviews_notes.sql
-- ============================================================
-- Gated 0002: lifecycle follow-ups, verified reviews, and owner notes.
--
-- Three additions, all downstream of the same finding about this category:
-- every serious competitor takes the sale and stops. Kajabi mails an abandoned
-- cart and calls it a feature; nobody separates the new member who never
-- started from the regular who went quiet from the lapsed member who needs a
-- reason to return, and nobody at all writes down whether the message worked.
--
-- 1. `gated_nudges` is the lifecycle engine's ledger. The sweep decides WHO
--    should hear WHAT and WHEN, writes one row per fact, and hands one
--    deduplicated event to the consumer's `onEvent`. The row's unique dedupe
--    key is what makes the sweep idempotent: a cron that runs hourly can never
--    send the same nudge twice, because the second insert fails and the emit
--    never happens. The module still sends nothing itself. The platform
--    delivers, exactly as it does for receipts and magic links.
--
--    The outcome columns are the follow-through, carried over from the
--    family's Trends 0002 pattern: after a waiting period the review sweep
--    looks at what actually happened (the abandoned checkout got paid, the
--    quiet member came back, nothing moved) and writes the answer down once.
--    "12 win-backs sent, 3 came back" instead of "12 emails sent".
--
-- 2. `gated_reviews` is social proof with a spine. Only a member holding live
--    access can leave one, which is what "verified" means here, and nothing is
--    public until the creator approves it. Approved reviews render on the
--    sales page next to the price.
--
-- 3. `gated_member_notes` is the owner's own "why" next to a member record:
--    "met at the spring workshop", "comped for a testimonial", "asked for an
--    invoice". The family's owner-notes-next-to-data pattern, applied to the
--    person instead of the metric.
--
-- Conventions carried over from 0001, unchanged: every table is `gated_`
-- prefixed, every row carries `account_id`, every index leads with it, RLS is
-- enabled with no policies so only the service role can reach anything,
-- amounts are integers in minor units, and calendar boundaries are YYYY-MM-DD.
--
-- 0001 is applied and immutable. This file only ADDS three tables and their
-- indexes. Nothing existing is altered in shape or meaning.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Lifecycle nudges
-- ═══════════════════════════════════════════════════════════════════════════

-- One row per nudge the sweep decided to send. The row is written BEFORE the
-- event is emitted, and the unique dedupe key means a given fact can only ever
-- produce one row, so it can only ever produce one message.
--
-- `kind` is the segment, and there are four on purpose. The category's lazy
-- habit is one generic "we miss you"; these four are different moments in a
-- member's life and each gets its own words, its own timing and its own link.
--
--   abandoned_checkout   started paying and stopped
--   stalled_onboarding   bought or joined, never opened anything
--   gone_quiet           was active, has not been seen in a while
--   winback              lapsed, their access ran out and nothing replaced it
--
-- `scope` and `target_id` name the thing the nudge points back at, when there
-- is one: the item left in the cart, the collection whose access lapsed. No
-- foreign key on target_id, same as every other polymorphic target in 0001.
--
-- `outcome` is written once by the outcome review, never updated after:
--   converted     they paid after the nudge
--   returned      they came back and opened things
--   no_response   the waiting period passed and nothing moved
create table if not exists gated_nudges (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  member_id uuid not null references gated_members(id) on delete cascade,

  kind text not null check (
    kind in ('abandoned_checkout', 'stalled_onboarding', 'gone_quiet', 'winback')
  ),

  scope text check (scope is null or scope in ('item', 'collection', 'bundle', 'tier')),
  target_id uuid,

  -- The pending purchase an abandoned checkout nudge is about.
  purchase_id uuid references gated_purchases(id) on delete cascade,

  -- Stable per fact. The same string goes out on the emitted event, so the
  -- platform's own dedupe and this table can never disagree about identity.
  dedupe_key text not null,

  sent_at timestamptz not null default now(),

  outcome text check (
    outcome is null or outcome in ('converted', 'returned', 'no_response')
  ),
  outcome_note text,
  outcome_checked_at timestamptz,

  unique (account_id, dedupe_key)
);

-- The creator's list, newest first.
create index if not exists gated_nudges_account_idx
  on gated_nudges (account_id, sent_at desc);

-- The outcome review's read: every nudge not yet judged, oldest first.
create index if not exists gated_nudges_unjudged_idx
  on gated_nudges (account_id, sent_at)
  where outcome is null;

alter table gated_nudges enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Verified reviews
-- ═══════════════════════════════════════════════════════════════════════════

-- A member's rating of a thing they can actually reach.
--
-- The service refuses a review from anybody without live access to the target,
-- which is the whole meaning of "verified" and the reason `member_id` is not
-- nullable. One review per member per thing: coming back to change your mind
-- updates the row and sends it back to moderation rather than adding a second
-- opinion from the same person.
--
-- `status` starts at 'pending' and nothing public renders it until the creator
-- moves it to 'approved'. 'hidden' keeps the row so a creator can un-hide, and
-- so a deleted-and-resubmitted review cannot dodge a moderation decision.
create table if not exists gated_reviews (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  member_id uuid not null references gated_members(id) on delete cascade,

  scope text not null check (scope in ('item', 'collection', 'bundle', 'tier')),
  target_id uuid not null,

  rating integer not null check (rating between 1 and 5),
  body text check (body is null or char_length(body) <= 2000),

  status text not null default 'pending'
    check (status in ('pending', 'approved', 'hidden')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (account_id, member_id, scope, target_id)
);

-- The sales page's read: approved reviews for one target.
create index if not exists gated_reviews_target_idx
  on gated_reviews (account_id, scope, target_id, status);

alter table gated_reviews enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Owner notes on members
-- ═══════════════════════════════════════════════════════════════════════════

-- A note the creator attached to a member. Never shown to the member, never
-- sent anywhere: it is the owner's memory, next to the person it is about.
-- `created_by` records which platform user wrote it, with no foreign key for
-- the same reason `account_id` has none: the users table belongs to the
-- consumer.
create table if not exists gated_member_notes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  member_id uuid not null references gated_members(id) on delete cascade,

  body text not null check (char_length(body) between 1 and 1000),

  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The member drawer's read: one member's notes, newest first.
create index if not exists gated_member_notes_member_idx
  on gated_member_notes (account_id, member_id, created_at desc);

alter table gated_member_notes enable row level security;

-- ============================================================
-- paid module migration 0001_paid.sql
-- source: paid/migrations/0001_paid.sql
-- ============================================================
-- Paid 0001: payments, requests, receipts, revenue.
--
-- Every table here is prefixed `paid_` so it is obvious at a glance which module
-- owns it, and so a consumer can see exactly what a Paid release adds to their
-- database.
--
-- ── Tenancy ────────────────────────────────────────────────────────────────
-- Every row carries `account_id`, and every index leads with it. There is no
-- table here that can be read without naming an account.
--
-- `account_id` is a uuid that REFERENCES a shared record by id, with no foreign
-- key constraint. That is deliberate and it is the contract: Paid is mounted
-- against a database it does not own, whose accounts table may be called
-- `users`, `accounts` or something else entirely, and a hard FK would make the
-- module refuse to install anywhere but one platform. The same applies to
-- `contact_id`, which points at the shared client database, and to
-- `invoice_id`, which points at the platform's own invoicing. The consumer owns
-- referential integrity for its own records. We own everything downstream of
-- `account_id`, and those FKs are real.
--
-- ── Row level security ─────────────────────────────────────────────────────
-- RLS is enabled with no policies, matching the platform's own convention.
-- Server code reaches these tables with the service role; every other role is
-- denied every row. This matters more here than almost anywhere else in the
-- platform: these tables are a business's revenue history, and an anon key that
-- could read `paid_payments` would be handing a competitor the whole picture.
--
-- ── There is no card data in this schema ───────────────────────────────────
-- Not a column for it, not a place to put one. The only card-shaped thing
-- stored anywhere is `last4`, which exists so a receipt can say which card was
-- used and is useless to anybody who steals it. Every payment identifier here
-- (`payment_ref`, `refund_ref`, `payout_ref`, `dispute_ref`, `account_ref`) is
-- an OPAQUE string handed back by the shared payment service. The module stores
-- them and never interprets them. Card details go from the payer's browser
-- straight to Stripe's hosted surfaces and never touch this database, this
-- module, or this platform, which is what keeps PCI scope with Stripe.
--
-- ── Money ──────────────────────────────────────────────────────────────────
-- Every amount is a bigint in MINOR UNITS with an explicit currency beside it.
-- No floats, no numerics, nothing that can round. A cent is a whole number.
--
-- ── Fees are stored, not computed ──────────────────────────────────────────
-- `processing_fee_minor`, `platform_fee_minor` and `net_minor` are nullable and
-- are filled in from what the rails REPORT after settlement. They are null until
-- then, and the UI says pending rather than guessing. A fee this module
-- calculated itself would eventually disagree with Stripe's, and a fee table
-- that disagrees with the bank is worse than no fee table at all.
--
-- ── Dates ──────────────────────────────────────────────────────────────────
-- Anything that is a calendar boundary rather than a moment is a `date`, written
-- by the module as YYYY-MM-DD. That is the format `toLocaleDateString("en-CA")`
-- produces, which is why the module formats with that locale everywhere.
--
-- ── The subscription tables exist before the rail does ─────────────────────
-- `paid_subscriptions` is created here even though `supportsRecurring` is false
-- in every install today. Creating it now is what makes switching recurring on
-- a config change later rather than a migration, which is the whole point of
-- stubbing the port instead of leaving a hole.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. The connected account
-- ═══════════════════════════════════════════════════════════════════════════

-- One row per account: which Stripe account this business connected and what
-- Stripe currently says about it.
--
-- Every boolean here is a CACHE of what the rails reported, never a decision
-- this module made. `checked_at` says how stale it is, and the connect service
-- refreshes it rather than trusting a value from last week. A business whose
-- account was restricted yesterday must not be shown a working payment form
-- today.
create table if not exists paid_connections (
  account_id uuid primary key,

  -- Opaque. The shared payment service knows what it means; we do not.
  account_ref text,

  -- Standard keeps the business as merchant of record: Stripe runs their
  -- identity checks, owns the compliance relationship, and files their 1099-K.
  -- Express is stored so the column exists, and is not implemented in 0.1.0.
  -- Custom is not offered at all, because taking over onboarding and compliance
  -- is exactly what would make this platform a payment facilitator.
  account_type text not null default 'standard'
    check (account_type in ('standard', 'express')),

  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,

  -- What Stripe is still waiting for, already translated into readable
  -- sentences by the port. We store the strings, not Stripe's requirement codes,
  -- because that mapping is Stripe's business and would rot in here.
  outstanding jsonb not null default '[]'::jsonb,

  country text,
  default_currency text,

  -- Which payment methods the account can actually complete today, reported
  -- rather than assumed, so the module never offers ACH to an account that
  -- cannot take it.
  methods jsonb not null default '[]'::jsonb,

  connected_at timestamptz,
  checked_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table paid_connections enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Payments
-- ═══════════════════════════════════════════════════════════════════════════

-- One attempt to take money. The central table of the module.
--
-- A row is written BEFORE the payer is sent anywhere, in `pending`, so a
-- checkout that is abandoned still leaves a trace and a settlement that arrives
-- by webhook has something to attach itself to. Nothing here is created by a
-- returning browser.
create table if not exists paid_payments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  -- Where this payment came from. All three are nullable: a payment can be a
  -- one-off with no request behind it and no invoice in front of it.
  request_id uuid,
  subscription_id uuid,
  invoice_id uuid,

  -- The shared client database. Null when we never learned who paid, which is
  -- possible and is flagged by the reconciliation check rather than prevented.
  contact_id uuid,
  payer_email text,
  payer_name text,

  description text not null,

  -- What this was for, so revenue by product works without an invoice behind
  -- every payment. Free text on purpose: a small business's product list is
  -- whatever they type, and forcing a catalog on them to see a report would mean
  -- most of them never see the report.
  product_name text,

  amount_minor bigint not null check (amount_minor > 0),
  currency text not null,

  -- Reported by the rails after settlement. Null means not yet known.
  processing_fee_minor bigint,
  platform_fee_minor bigint,
  net_minor bigint,

  amount_refunded_minor bigint not null default 0 check (amount_refunded_minor >= 0),

  status text not null default 'pending' check (status in (
    'pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'disputed', 'cancelled'
  )),

  method text check (method in ('card', 'wallet', 'ach', 'link', 'other')),

  -- The last four digits of the card, and nothing else about it. Enough for a
  -- receipt line, useless to anybody who steals the database.
  last4 text check (last4 is null or last4 ~ '^[0-9]{4}$'),

  -- Opaque references from the rails.
  payment_ref text,
  payout_ref text,

  -- Plain language, when an attempt failed. Shown to the business as-is.
  failure_message text,

  created_at timestamptz not null default now(),
  paid_at timestamptz,

  -- Cannot refund more than was charged. A database-level guard as well as a
  -- service-level one, because this is somebody's money and the two checks cost
  -- nothing.
  constraint paid_payments_refund_within_charge
    check (amount_refunded_minor <= amount_minor)
);

alter table paid_payments enable row level security;

create index if not exists paid_payments_account_created_idx
  on paid_payments (account_id, created_at desc);

create index if not exists paid_payments_account_status_idx
  on paid_payments (account_id, status);

-- Revenue reports bucket by when the money landed, not when the row was made.
create index if not exists paid_payments_account_paid_idx
  on paid_payments (account_id, paid_at desc) where paid_at is not null;

create index if not exists paid_payments_account_contact_idx
  on paid_payments (account_id, contact_id) where contact_id is not null;

create index if not exists paid_payments_request_idx
  on paid_payments (request_id) where request_id is not null;

create index if not exists paid_payments_invoice_idx
  on paid_payments (account_id, invoice_id) where invoice_id is not null;

-- Settlement looks a payment up by the rails' own reference, and it must find
-- exactly one. Unique so a replayed webhook cannot settle two rows, and partial
-- so the many pending rows with a null ref do not collide with each other.
create unique index if not exists paid_payments_payment_ref_key
  on paid_payments (payment_ref) where payment_ref is not null;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Payment requests
-- ═══════════════════════════════════════════════════════════════════════════

-- A shareable ask for money. The thing that closes the getting-paid loop.
--
-- `token` is what appears in the public URL and is the only thing between a
-- stranger and this request, so the service generates a long random one. It is
-- deliberately NOT a signed self-contained token: a request can be cancelled,
-- and a signed token cannot be taken back once it is out in the world.
create table if not exists paid_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  token text not null,

  contact_id uuid,
  -- The platform's invoice this settles. When set, paying this request marks
  -- that invoice paid through the invoicing port, which is the whole point.
  invoice_id uuid,

  payer_email text,
  payer_name text,

  description text not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null,

  status text not null default 'open'
    check (status in ('open', 'paid', 'expired', 'cancelled')),

  -- Null means it never expires, which is what `requestTtlDays: 0` produces.
  expires_at timestamptz,

  -- How many times the payer opened it. The strongest single signal the chase
  -- ranking has: opened and unpaid is hesitation, never opened is a
  -- deliverability problem, and they need opposite responses.
  view_count integer not null default 0,
  last_viewed_at timestamptz,

  reminders_sent integer not null default 0,
  last_reminder_at timestamptz,

  payment_id uuid references paid_payments (id) on delete set null,

  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table paid_requests enable row level security;

-- The public page looks a request up by token alone, with no account in hand,
-- so this has to be unique across every account in the database.
create unique index if not exists paid_requests_token_key on paid_requests (token);

create index if not exists paid_requests_account_status_idx
  on paid_requests (account_id, status, created_at desc);

create index if not exists paid_requests_account_contact_idx
  on paid_requests (account_id, contact_id) where contact_id is not null;

create index if not exists paid_requests_invoice_idx
  on paid_requests (account_id, invoice_id) where invoice_id is not null;

-- One open request per invoice. Two live links for the same invoice is how a
-- customer pays twice, and the second refund is always awkward.
create unique index if not exists paid_requests_one_open_per_invoice
  on paid_requests (account_id, invoice_id)
  where invoice_id is not null and status = 'open';

alter table paid_payments
  add constraint paid_payments_request_fk
  foreign key (request_id) references paid_requests (id) on delete set null;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Subscriptions
-- ═══════════════════════════════════════════════════════════════════════════

-- Recurring plans. The table exists; the rail does not, yet.
--
-- `supportsRecurring` is false in every install today, so nothing writes here.
-- It is created now so that turning recurring on later is a config change and a
-- redeploy rather than a migration against a live payments database. The
-- `unavailable` status exists for exactly one situation: a plan that was live
-- and whose rail was withdrawn underneath it, which must be visible rather than
-- silently reported as active.
create table if not exists paid_subscriptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  contact_id uuid,
  payer_email text,

  description text not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null,

  interval text not null check (interval in ('week', 'month', 'year')),

  -- Null means it runs until cancelled. A number makes it a payment plan: four
  -- monthly instalments is `total_cycles = 4`, which is the same machinery as a
  -- subscription and is why there is no separate instalments table.
  total_cycles integer check (total_cycles is null or total_cycles > 0),
  cycles_billed integer not null default 0,

  trial_days integer not null default 0 check (trial_days >= 0),

  status text not null default 'active' check (status in (
    'trialing', 'active', 'past_due', 'cancelled', 'unavailable'
  )),

  subscription_ref text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,

  -- Drives dunning. Reset to zero by a successful charge, so a plan that failed
  -- once in March and has been fine since is not treated as a problem.
  failure_count integer not null default 0,
  last_failure_at timestamptz,

  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);

alter table paid_subscriptions enable row level security;

create index if not exists paid_subscriptions_account_status_idx
  on paid_subscriptions (account_id, status);

create unique index if not exists paid_subscriptions_ref_key
  on paid_subscriptions (subscription_ref) where subscription_ref is not null;

alter table paid_payments
  add constraint paid_payments_subscription_fk
  foreign key (subscription_id) references paid_subscriptions (id) on delete set null;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Receipts
-- ═══════════════════════════════════════════════════════════════════════════

-- A receipt is a RECORD that one was issued, not the email itself.
--
-- There is no email body here and no template. Paid fires an event with the
-- numbers in it and the platform's messaging turns that into a branded email,
-- which is why this module has no sender, no provider and no renderer. This row
-- is what makes the receipt re-viewable at a stable URL afterwards.
create table if not exists paid_receipts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  payment_id uuid not null references paid_payments (id) on delete cascade,

  -- Human-facing and sequential per account. A business asked for "the receipt
  -- numbered 41" needs that to mean something.
  number text not null,

  contact_id uuid,
  email text,

  amount_minor bigint not null,
  currency text not null,

  issued_at timestamptz not null default now()
);

alter table paid_receipts enable row level security;

-- One receipt per payment. A payer who refreshes the success page four times
-- gets one receipt, not four, and this is the constraint that guarantees it
-- rather than the application remembering to check.
create unique index if not exists paid_receipts_payment_key
  on paid_receipts (payment_id);

create unique index if not exists paid_receipts_account_number_key
  on paid_receipts (account_id, number);

create index if not exists paid_receipts_account_issued_idx
  on paid_receipts (account_id, issued_at desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Refunds
-- ═══════════════════════════════════════════════════════════════════════════

-- Money going back out. Never automatic, never anonymous.
--
-- `created_by` is not nullable, and that is the point: every refund in this
-- table names the person who confirmed it. The service refuses to run without an
-- explicit confirmation flag, so an AI employee holding these tools can propose
-- a refund all day and still not move anybody's money.
create table if not exists paid_refunds (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  payment_id uuid not null references paid_payments (id) on delete cascade,

  amount_minor bigint not null check (amount_minor > 0),
  currency text not null,
  reason text,

  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed')),

  refund_ref text,

  created_by uuid not null,
  created_at timestamptz not null default now()
);

alter table paid_refunds enable row level security;

create index if not exists paid_refunds_account_created_idx
  on paid_refunds (account_id, created_at desc);

create index if not exists paid_refunds_payment_idx on paid_refunds (payment_id);

create unique index if not exists paid_refunds_ref_key
  on paid_refunds (refund_ref) where refund_ref is not null;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Disputes
-- ═══════════════════════════════════════════════════════════════════════════

-- Chargebacks, pulled from the rails rather than raised here.
--
-- Every row is a copy of something Stripe owns, refreshed by a sync. Nothing in
-- this module creates or resolves a dispute; it surfaces them, because a
-- business that finds out about a chargeback after the evidence deadline has
-- already lost it.
create table if not exists paid_disputes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  payment_id uuid references paid_payments (id) on delete set null,

  dispute_ref text not null,

  amount_minor bigint not null,
  currency text not null,

  -- Stripe's reason, already in plain language by the time the port hands it
  -- over. We store what will be shown.
  reason text not null,

  status text not null check (status in (
    'needs_response', 'under_review', 'won', 'lost', 'warning', 'closed'
  )),

  -- A calendar boundary, not a moment. Missing it loses the dispute by default.
  evidence_due_by date,

  opened_at timestamptz not null,
  synced_at timestamptz not null default now()
);

alter table paid_disputes enable row level security;

create unique index if not exists paid_disputes_ref_key on paid_disputes (dispute_ref);

create index if not exists paid_disputes_account_status_idx
  on paid_disputes (account_id, status, opened_at desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. Payouts
-- ═══════════════════════════════════════════════════════════════════════════

-- When money actually lands in the business's bank.
--
-- This is the number a small business cares about more than any other, and it is
-- the one most payment dashboards bury. It is a cached copy of what the rails
-- report; Stripe owns the schedule and this module never sets one.
create table if not exists paid_payouts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  payout_ref text not null,

  amount_minor bigint not null,
  currency text not null,

  -- The day it arrives. A date, because that is what somebody checking their
  -- bank cares about.
  arrival_date date not null,

  status text not null check (status in (
    'paid', 'in_transit', 'pending', 'failed', 'canceled'
  )),

  -- In words. "Chase ending 4821". Never an account number, and there is no
  -- column here that could hold one.
  destination text,

  synced_at timestamptz not null default now()
);

alter table paid_payouts enable row level security;

create unique index if not exists paid_payouts_ref_key on paid_payouts (payout_ref);

create index if not exists paid_payouts_account_arrival_idx
  on paid_payouts (account_id, arrival_date desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. Events
-- ═══════════════════════════════════════════════════════════════════════════

-- Every fact Paid handed to the platform, kept.
--
-- The module fires events on `onEvent` and the platform delivers them. This
-- table is the module's own record that it did so, which means an install with
-- no `onEvent` handler at all still has a complete history on screen. It is also
-- where the analytics counters live, so a consumer without an intelligence layer
-- loses nothing.
create table if not exists paid_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  kind text not null,

  contact_id uuid,
  payment_id uuid references paid_payments (id) on delete cascade,
  request_id uuid references paid_requests (id) on delete cascade,

  -- Stable per fact. The uniqueness constraint below is what stops a retried
  -- settlement and a payer who refreshes four times from producing four
  -- receipts, and it does it here rather than relying on the consumer's own
  -- deduplication being correct.
  dedupe_key text not null,

  title text not null,
  body text not null,

  data jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

alter table paid_events enable row level security;

create unique index if not exists paid_events_account_dedupe_key
  on paid_events (account_id, dedupe_key);

create index if not exists paid_events_account_created_idx
  on paid_events (account_id, created_at desc);

create index if not exists paid_events_account_kind_idx
  on paid_events (account_id, kind, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. Metered usage
-- ═══════════════════════════════════════════════════════════════════════════

-- The assistant's monthly allowance, counted per calendar month.
--
-- Checked BEFORE the model runs rather than after, so an account at its cap
-- never incurs the cost. `month_key` is YYYY-MM, produced by the same date
-- helper as everything else in the module.
create table if not exists paid_usage (
  account_id uuid not null,
  month_key text not null,

  assistant_runs integer not null default 0,

  updated_at timestamptz not null default now(),

  primary key (account_id, month_key)
);

alter table paid_usage enable row level security;

-- ============================================================
-- paid module migration 0002_followups.sql
-- source: paid/migrations/0002_followups.sql
-- ============================================================
-- Paid 0002: saved items, owner notes, and lifecycle follow-through.
--
-- Everything here is downstream of the same complaint about this category:
-- payment tools take the payment and stop. A link is sent once and never
-- chased, a failed payment is recorded and never retried or explained, and a
-- customer who paid once is never invited back. 0001 already chases open
-- links on a schedule; this migration gives the module the state it needs to
-- follow through on the rest.
--
-- 1. `paid_items` holds named amounts a business charges again and again, so
--    making a payment link is one tap instead of retyping, and revenue by
--    product stops depending on everybody spelling the same service the same
--    way.
--
-- 2. `paid_notes` holds the owner's own "why" next to their money: "agreed to
--    pay after the 15th", "paid by cheque", "waived the fee". The chase
--    ranking shows it and the assistant reads it, so the advice stops
--    rediscovering things the owner already explained.
--
-- 3. `paid_payer_followups` records which quiet payers have been invited back
--    and how many times, so the win-back sweep can cap itself and a retried
--    sweep cannot invite the same person twice.
--
-- 4. Two columns on `paid_payments`: `recovery_request_id` marks a failed
--    payment the recovery sweep has already handled, and `tip_minor` records
--    what a payer added on top when the shared rails offer tipping. Both are
--    nullable, and every payment that existed before this migration simply
--    has neither, which is true.
--
-- 5. One column on `paid_requests`: `allow_tip`, stored per request so the
--    checkout the payer eventually reaches matches what the business chose
--    when the link was made.
--
-- Conventions carried over from 0001, unchanged: every table is `paid_`
-- prefixed, every row carries `account_id`, every index leads with it, RLS is
-- enabled with no policies so only the service role can reach anything,
-- amounts are bigint minor units with a currency beside them, and calendar
-- boundaries are `date` columns written as YYYY-MM-DD.
--
-- 0001 is applied and immutable. This file only ADDS: three tables, their
-- indexes, and three nullable-or-defaulted columns. Nothing existing is
-- altered in shape or meaning.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Saved items
-- ═══════════════════════════════════════════════════════════════════════════

-- A named amount the business charges repeatedly.
--
-- Deliberately not a catalog: no SKU, no inventory, no tax class. A small
-- business's product list is whatever they type, and this exists only so they
-- stop retyping it. `archived_at` soft-deletes, because an item that was used
-- by a hundred payments is history and history does not get dropped.
create table if not exists paid_items (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  name text not null check (char_length(name) between 1 and 120),

  amount_minor bigint not null check (amount_minor > 0),
  currency text not null,

  -- What the payer sees on the payment page. Falls back to the name.
  description text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

alter table paid_items enable row level security;

-- One live item per name per account. Case-insensitive, because "Lawn cut"
-- and "lawn cut" as two different items is a data-entry accident, not intent.
-- Partial, so an archived name can be reused.
create unique index if not exists paid_items_account_name_key
  on paid_items (account_id, lower(name)) where archived_at is null;

create index if not exists paid_items_account_created_idx
  on paid_items (account_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Owner notes
-- ═══════════════════════════════════════════════════════════════════════════

-- A note the owner attached to their money.
--
-- All three subject columns are nullable and a note may have none of them, in
-- which case it is about the business rather than one record. `note_date` is
-- the day the note is ABOUT, not the day it was written, so "they were away
-- all of March" can be recorded in April and still land on March.
--
-- `created_by` is not nullable: a note is somebody's words and it says whose.
create table if not exists paid_notes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  payment_id uuid references paid_payments (id) on delete cascade,
  request_id uuid references paid_requests (id) on delete cascade,
  -- The shared client database. No FK on purpose, same as everywhere else the
  -- module points at a table it does not own.
  contact_id uuid,

  note_date date not null,
  body text not null check (char_length(body) between 1 and 500),

  created_by uuid not null,
  created_at timestamptz not null default now()
);

alter table paid_notes enable row level security;

create index if not exists paid_notes_account_created_idx
  on paid_notes (account_id, created_at desc);

-- The chase ranking looks notes up by request, so that read has its own path.
create index if not exists paid_notes_account_request_idx
  on paid_notes (account_id, request_id) where request_id is not null;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Win-back follow-through
-- ═══════════════════════════════════════════════════════════════════════════

-- Which quiet payers have been invited back, and how many times.
--
-- The lapse DETECTION is computed from payment history at read time and is
-- never stored, so it cannot go stale. This table records only what the
-- module has done about it: invites sent, when the last one went, and whether
-- the business said to stop. `payer_key` is the contact id when there is one
-- and the lowercased email otherwise, which is the same grouping the revenue
-- reports use.
create table if not exists paid_payer_followups (
  account_id uuid not null,
  payer_key text not null,

  contact_id uuid,
  email text,

  invites_sent integer not null default 0 check (invites_sent >= 0),
  last_invite_at timestamptz,

  -- The business said to leave this person alone. Wins over every schedule.
  stopped boolean not null default false,

  updated_at timestamptz not null default now(),

  primary key (account_id, payer_key)
);

alter table paid_payer_followups enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Recovery and tips, on payments
-- ═══════════════════════════════════════════════════════════════════════════

-- `recovery_request_id` is the recovery sweep's marker: set once a failed
-- payment has been handled, whether that meant a fresh link or a decision
-- that there was nothing to recover. Null means the sweep has not looked yet.
--
-- `tip_minor` is what the payer added on top, reported by the rails when the
-- install's shared payment service offers tipping. It is separate from
-- `amount_minor` on purpose: the ask and the gratuity are different facts,
-- and the refund guard (`amount_refunded_minor <= amount_minor`) keeps
-- meaning what it meant.
alter table paid_payments
  add column if not exists recovery_request_id uuid references paid_requests (id) on delete set null,
  add column if not exists tip_minor bigint check (tip_minor is null or tip_minor >= 0);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Tips, on requests
-- ═══════════════════════════════════════════════════════════════════════════

-- Whether the payer should be offered a tip line on the hosted page. Stored
-- per request so the choice made when the link was created is the choice the
-- payer sees, however long the link sits. False everywhere until the shared
-- rails report they support tipping, and the module never offers what the
-- rails cannot complete.
alter table paid_requests
  add column if not exists allow_tip boolean not null default false;

-- ============================================================
-- contact module migration 0001_contact_roles.sql
-- source: contact/migrations/0001_contact_roles.sql
-- ============================================================
-- Contact 0001: account-defined roles.
--
-- No roles are seeded. Not one. A fresh account has an empty table and the UI
-- asks the owner to name their first role. A seeded row, or a clickable preset
-- in the UI, would put one industry's vocabulary into every account.
--
-- `key` is minted once from the first name given and is then immutable. `name`
-- is freely editable. Saved filters, CSV import mappings and AI tool arguments
-- resolve against `key`, which is why renaming cannot be allowed to touch it.

create table if not exists public.contact_roles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  key text not null,
  name text not null,
  name_plural text not null,
  color text not null default '#6b7280',
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (account_id, key),
  -- Non-empty, lower case, no whitespace. Deliberately NOT an ASCII pattern:
  -- `toRoleKey` preserves any Unicode letter or number, so an account naming
  -- its roles in Cyrillic, Japanese or Arabic mints perfectly valid keys, and
  -- an ASCII-only check would reject every one of them.
  constraint contact_roles_key_format
    check (length(key) > 0 and key !~ '\s' and key = lower(key)),
  constraint contact_roles_name_present check (length(btrim(name)) > 0),
  -- Redundant against the primary key, and deliberately so: it is the target
  -- of the composite foreign key below, which stops an assignment citing a
  -- ROLE that belongs to a different account. It says nothing about the
  -- assignment's contact_id; see the note on the assignment indexes below for
  -- why that half needs its own, separate protection.
  constraint contact_roles_account_id_uq unique (account_id, id)
);

create index if not exists contact_roles_account_idx
  on public.contact_roles (account_id, sort_order)
  where archived_at is null;

-- Assignments reference the HOST's client record by id. Contact keeps only
-- CRM-specific data and never copies a client record into its own table.
-- No foreign key to that table: the host owns it and may name it differently,
-- so the reference is by id and integrity is enforced in service code.
create table if not exists public.contact_role_assignments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  contact_id uuid not null,
  role_id uuid not null,
  is_primary boolean not null default false,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text,
  -- Composite on purpose. A single-column reference would let account B assign
  -- a role owned by account A: the row would be internally consistent and
  -- permanently wrong, with nothing at the database layer to catch it. RLS is
  -- deny-all here, so application scoping is the only other boundary, and this
  -- is the one place a backstop is cheap.
  --
  -- This closes only the ROLE half of cross-tenant risk. contact_id is a
  -- host-owned id with no foreign key at all (the host owns that table and
  -- may name it differently; see the comment above this table), so nothing
  -- here stops an assignment row from citing a contact_id that actually
  -- belongs to a different account. That is what account-scoping the indexes
  -- below is for.
  constraint contact_role_assignments_role_account_fk
    foreign key (account_id, role_id)
    references public.contact_roles (account_id, id)
    on delete restrict
);

-- A contact holds a given role once at a time. Ended assignments stay as
-- history, so the constraint is partial rather than a plain unique.
--
-- account_id is part of the key, not just role_id and contact_id. Without it,
-- account A could occupy account B's "one active role X per contact" slot for
-- a contact id it merely guessed, since contact_id carries no foreign key to
-- check it against.
create unique index if not exists contact_role_assignments_active_idx
  on public.contact_role_assignments (account_id, contact_id, role_id)
  where ended_at is null;

-- At most one primary per contact PER ACCOUNT. Enforced here rather than in
-- application code, because two primaries make every group heading
-- non-deterministic. Scoped by account_id for the same reason as the active
-- index above: on contact_id alone, account A could occupy account B's
-- primary slot for a contact id it guessed, and B's own setPrimaryRole would
-- then fail on a row B cannot even see.
create unique index if not exists contact_role_assignments_primary_idx
  on public.contact_role_assignments (account_id, contact_id)
  where is_primary and ended_at is null;

-- Supports the (account_id, contact_id) filter that most assignment queries
-- use (listing or checking a contact's current roles), not just the two
-- partial indexes above, which only cover their own narrower conditions.
create index if not exists contact_role_assignments_account_contact_idx
  on public.contact_role_assignments (account_id, contact_id)
  where ended_at is null;

create index if not exists contact_role_assignments_role_idx
  on public.contact_role_assignments (role_id)
  where ended_at is null;

-- Deleting a role is blocked by `on delete restrict` above. Removal is an
-- archive: assignments are history and a hard delete would rewrite the past.

-- RLS on, deny all. Tenant isolation is enforced in service code, which runs
-- under the service-role key and scopes every query by account_id explicitly.
-- A policy that looked permissive here would be a silent tenancy hole.
alter table public.contact_roles enable row level security;
alter table public.contact_role_assignments enable row level security;

-- Postgres has no CREATE POLICY IF NOT EXISTS, so the drop makes this file
-- safe to re-run, matching every other statement above it.
drop policy if exists contact_roles_deny on public.contact_roles;
drop policy if exists contact_role_assignments_deny on public.contact_role_assignments;

create policy contact_roles_deny on public.contact_roles for all using (false);
create policy contact_role_assignments_deny on public.contact_role_assignments for all using (false);

-- ============================================================
-- contact module migration 0002_contact_cadence.sql
-- source: contact/migrations/0002_contact_cadence.sql
-- ============================================================
-- Contact 0002: keeping in touch.
--
-- The complaint this answers is the one the whole category earns: a CRM
-- records relationships and then watches them go cold. Three additions, all
-- deterministic, none seeded:
--
-- 1. `cadence_days` on `contact_roles`. The owner attaches a rhythm to a role
--    they named themselves ("every one of these, every 90 days"). Null means
--    no rhythm, and nothing ships with one.
--
-- 2. `contact_touchpoints`: the module's own log of when the account actually
--    reached a contact, with the owner's note stored next to the fact it
--    explains. `occurred_on` is the day the touch HAPPENED, not the day it was
--    typed, so last week's call logged today still lands on last week.
--
-- 3. `contact_nudges`: one row per lapsed relationship the sweep noticed.
--    `dedupe_key` is stable per fact (contact + computed due date) and unique
--    per account, so a reran sweep or a double-fired cron cannot nag twice
--    about the same lapse. Every nudge ends with a recorded outcome: `done`
--    with `days_to_touch` when a touch closed it, `dismissed` when skipping
--    was deliberate, `lapsed` when nobody acted inside the grace window. The
--    module writes down whether its own reminder worked.
--
-- Conventions carried over from 0001, unchanged: every table is `contact_`
-- prefixed, every row carries `account_id`, every index leads with it, RLS is
-- enabled with deny-all policies so only the service role can reach anything,
-- and every statement here is safe to re-run.
--
-- 0001 is applied and immutable. This file only ADDS: one nullable column,
-- two tables, their indexes and policies. Nothing existing changes shape or
-- meaning.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Cadence on the role
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.contact_roles
  add column if not exists cadence_days integer;

-- Postgres has no ADD CONSTRAINT IF NOT EXISTS, so drop-then-add keeps the
-- file re-runnable, matching the policy statements in 0001.
alter table public.contact_roles
  drop constraint if exists contact_roles_cadence_days_range;
alter table public.contact_roles
  add constraint contact_roles_cadence_days_range
  check (cadence_days is null or (cadence_days between 1 and 3650));

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. The touch log
-- ═══════════════════════════════════════════════════════════════════════════

-- References the HOST's client record by id, same as assignments in 0001: the
-- host owns that table and may name it differently, so there is no foreign
-- key and integrity is enforced in service code.
create table if not exists public.contact_touchpoints (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  contact_id uuid not null,
  -- The day the touch happened. A date, not a timestamp: cadence arithmetic
  -- is day-grained, and YYYY-MM-DD is also how every date renders (en-CA).
  occurred_on date not null,
  -- The owner's own word for how: "call", "text", "dropped by". Free text on
  -- purpose; a fixed channel list would be shipped vocabulary.
  channel text,
  summary text,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint contact_touchpoints_channel_len
    check (channel is null or char_length(channel) between 1 and 40),
  constraint contact_touchpoints_summary_len
    check (summary is null or char_length(summary) between 1 and 1000)
);

-- The shape of every read: one account's touches, newest first, optionally
-- for one contact. Leading with account_id serves both.
create index if not exists contact_touchpoints_account_contact_idx
  on public.contact_touchpoints (account_id, contact_id, occurred_on desc);

create index if not exists contact_touchpoints_account_recent_idx
  on public.contact_touchpoints (account_id, occurred_on desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Nudges
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.contact_nudges (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  contact_id uuid not null,
  role_id uuid not null,
  -- The day the touch was due, per the cadence arithmetic at sweep time.
  due_on date not null,
  -- Stable per fact: touch-due:<contact_id>:<due_on>. The unique constraint
  -- below is the real dedupe guard; service code merely reacts to 23505.
  dedupe_key text not null,
  status text not null default 'open'
    check (status in ('open', 'done', 'dismissed', 'lapsed')),
  resolved_at timestamptz,
  -- Days from due to the touch that closed it. Written only for `done`; the
  -- follow-through record of whether the reminder actually worked.
  days_to_touch integer,
  created_at timestamptz not null default now(),
  constraint contact_nudges_dedupe_uq unique (account_id, dedupe_key),
  -- Composite on purpose, exactly as in 0001: a single-column reference would
  -- let one account hold a nudge citing a role owned by another. This closes
  -- only the ROLE half; contact_id is host-owned with no foreign key, which
  -- is why every index below leads with account_id.
  constraint contact_nudges_role_account_fk
    foreign key (account_id, role_id)
    references public.contact_roles (account_id, id)
    on delete restrict
);

-- The open queue, which is what the UI and the sweep both read.
create index if not exists contact_nudges_account_open_idx
  on public.contact_nudges (account_id, due_on)
  where status = 'open';

-- "Does this contact have an open nudge", which logTouchpoint asks on every
-- logged touch.
create index if not exists contact_nudges_account_contact_open_idx
  on public.contact_nudges (account_id, contact_id)
  where status = 'open';

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS: on, deny all, same posture as 0001
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.contact_touchpoints enable row level security;
alter table public.contact_nudges enable row level security;

drop policy if exists contact_touchpoints_deny on public.contact_touchpoints;
drop policy if exists contact_nudges_deny on public.contact_nudges;

create policy contact_touchpoints_deny on public.contact_touchpoints for all using (false);
create policy contact_nudges_deny on public.contact_nudges for all using (false);

-- ============================================================
-- trends demo seed
-- source: trends/harness/supabase/0002_seed.sql
-- ============================================================
-- Eighteen months of plausible history for one demo account.
--
-- The point of seeding rather than starting empty: Trends refuses to have an
-- opinion until it has enough of an account's own history, which is correct and
-- which also means an empty sandbox shows nothing but "still learning". This
-- gives it something to be right about.
--
-- The data has deliberate shape, so the engine has something to find:
--   * revenue trends up with a real December dip
--   * one enormous month, so the anomaly detector has a spike to catch
--   * invoices that age, so receivables have somewhere to go
--   * jobs left sitting on a past date, so "unfulfilled" is not always zero
--   * a Thursday-heavy cancellation pattern, which is the sort of thing the
--     Analyst is supposed to notice and nobody would spot by eye
--
-- Run order: 0000_source_tables.sql, then the module's migrations/0001_trends.sql,
-- then this file. Re-running it is safe: it clears the demo account first.

do $$
declare
  demo_id uuid := '00000000-0000-4000-8000-000000000001';
  kit_id uuid;
  deal_id uuid;
  month_start date;
  i int;
  revenue numeric;
  seasonal numeric;
begin
  -- Idempotent. The whole account goes, then comes back.
  delete from users where id = demo_id;
  insert into users (id, email) values (demo_id, 'demo@trends.local');

  insert into media_kits (user_id) values (demo_id) returning id into kit_id;
  insert into media_kit_metrics (user_id, media_kit_id, platform, followers)
  values
    (demo_id, kit_id, 'instagram', 48200),
    (demo_id, kit_id, 'tiktok', 91400),
    (demo_id, kit_id, 'youtube', 12600);

  for i in 0..17 loop
    month_start := (date_trunc('month', current_date) - (17 - i) * interval '1 month')::date;

    -- A rising baseline with a December dip, and one outlier month.
    seasonal := case when extract(month from month_start) = 12 then 0.55 else 1.0 end;
    revenue := round((6000 + i * 320) * seasonal);
    if i = 12 then revenue := revenue * 2.6; end if;

    insert into bookkeeping_entries (user_id, entry_date, type, category, amount)
    values
      (demo_id, month_start + 5, 'income', 'services', revenue * 0.7),
      (demo_id, month_start + 18, 'income', 'sponsorship', revenue * 0.3),
      (demo_id, month_start + 9, 'expense', 'software', 240 + i * 4),
      (demo_id, month_start + 21, 'expense', 'contractors', 800 + i * 30);

    -- Deals. Won ones are stamped inside the month, which is what the pipeline
    -- adapter reads, because the pipeline keeps no stage history.
    insert into pipeline_deals (user_id, prospect_name, deal_value, stage, last_contact_date, created_at, updated_at)
    values
      (demo_id, 'Brand ' || i || 'A', 2400 + i * 90, 'won', month_start + 10,
       month_start, month_start + 10),
      (demo_id, 'Brand ' || i || 'B', 1800 + i * 60,
       case when i % 3 = 0 then 'lost' else 'won' end, month_start + 14,
       month_start, month_start + 14);

    -- Two open deals per month for the last three, so open pipeline and stale
    -- deals are not both zero.
    if i >= 15 then
      insert into pipeline_deals (user_id, prospect_name, deal_value, stage, last_contact_date, created_at, updated_at)
      values (demo_id, 'Prospect ' || i, 5200, 'negotiation', month_start + 2, month_start, month_start + 2)
      returning id into deal_id;

      insert into deal_deliverables (user_id, deal_id, kind, due_date, status, went_live_at)
      values
        (demo_id, deal_id, 'reel', month_start + 20, 'live', (month_start + 19)::timestamptz),
        (demo_id, deal_id, 'post', month_start + 25, 'live', (month_start + 27)::timestamptz);
    end if;

    -- Invoices. Most paid, one left to age in each of the last two months.
    insert into invoices (user_id, client_name, total_amount, status, issued_date, due_date, paid_date)
    values
      (demo_id, 'Client ' || i, round(revenue * 0.4), 'paid', month_start + 3,
       month_start + 33, month_start + 3 + (12 + (i % 9)));

    if i >= 16 then
      insert into invoices (user_id, client_name, total_amount, status, issued_date, due_date)
      values (demo_id, 'Slow payer ' || i, 3200, 'overdue', month_start + 4, month_start + 34);
    end if;

    insert into quotes (user_id, total_amount, status, sent_date)
    values (demo_id, 4100, case when i >= 16 then 'sent' else 'accepted' end, month_start + 6);

    -- Jobs and appointments. Cancellations cluster on Thursdays, which is the
    -- kind of pattern the Analyst is meant to find and a person is not.
    insert into jobs (user_id, title, status, value, scheduled_date, completed_date, created_at, updated_at)
    select
      demo_id,
      'Job ' || i || '-' || g,
      case
        when g = 4 and i % 2 = 0 then 'cancelled'
        when g = 5 and i >= 16 then 'scheduled'
        else 'completed'
      end,
      420 + g * 35,
      month_start + g * 4,
      case when g = 4 and i % 2 = 0 then null when g = 5 and i >= 16 then null else month_start + g * 4 end,
      month_start,
      month_start + g * 4
    from generate_series(1, 6) as g;

    insert into calendar_events (user_id, title, event_date)
    select demo_id, 'Appointment ' || i || '-' || g, month_start + g * 3
    from generate_series(1, 8) as g;

    insert into contacts (user_id, name, email, created_at)
    select demo_id, 'Contact ' || i || '-' || g, 'c' || i || g || '@example.com', month_start + g
    from generate_series(1, 3) as g;

    insert into contact_interactions (user_id, contact_id, interaction_type, summary, created_at)
    select demo_id, c.id, 'note', 'Checked in', month_start + 7
    from contacts c
    where c.user_id = demo_id
    limit 5;

    insert into message_events (user_id, source_module, event_type, channel, title, status, handled_at)
    select
      demo_id, 'campaigns', 'nudge', 'email', 'Follow up ' || i || '-' || g,
      case when g = 9 then 'failed' else 'sent' end,
      (month_start + g)::timestamptz
    from generate_series(1, 10) as g;

    insert into reviews (user_id, platform, rating, review_date)
    values (demo_id, 'google', 4 + (i % 2), month_start + 11);
  end loop;
end $$;

-- ============================================================
-- charted demo seed
-- source: charted/harness/supabase/0002_seed.sql
-- ============================================================
-- Demo data for the sandbox.
--
-- The shape here is deliberate, because an empty tracker looks identical to a
-- broken one and a tracker full of straight lines proves nothing. Four subjects
-- from four different trades, so it is obvious at a glance that the module has
-- no opinion about what a business measures:
--
--   Dana      strength training. Steady progress, then a real plateau.
--   Sam       tutoring. Rising scores with one bad week that is NOT a regression.
--   Priya     physiotherapy. Progress, then genuine lost ground.
--   Unit 4    a renovation project, tracked as a project rather than a person.
--
-- Set the account id to whatever CHARTED_DEMO_ACCOUNT_ID is set to on the
-- deploy, then run this file. Running it twice is safe: every insert is keyed
-- and conflicts are ignored.

do $$
declare
  v_account uuid := '00000000-0000-4000-8000-000000000001';

  v_dana_client uuid;
  v_sam_client uuid;
  v_priya_client uuid;
  v_unit_client uuid;

  v_dana uuid;
  v_sam uuid;
  v_priya uuid;
  v_unit uuid;

  v_stage_intake uuid;
  v_stage_program uuid;

  v_check uuid;
  v_date date;
  v_i integer;
  v_value numeric;
begin

-- ── The client records every subject hangs from ────────────────────────────
insert into contacts (user_id, name, email, source)
values
  (v_account, 'Dana Whitfield', 'dana@example.com', 'charted'),
  (v_account, 'Sam Okafor', 'sam@example.com', 'charted'),
  (v_account, 'Priya Raman', 'priya@example.com', 'charted'),
  (v_account, 'Unit 4, Harbour Road', null, 'charted')
on conflict do nothing;

select id into v_dana_client from contacts where user_id = v_account and name = 'Dana Whitfield' limit 1;
select id into v_sam_client from contacts where user_id = v_account and name = 'Sam Okafor' limit 1;
select id into v_priya_client from contacts where user_id = v_account and name = 'Priya Raman' limit 1;
select id into v_unit_client from contacts where user_id = v_account and name = 'Unit 4, Harbour Road' limit 1;

-- ── Metrics. All four trades' worth, all of them "user-defined" ────────────
-- Charted seeds none of these itself. They are here because a demo account has
-- to have been used by somebody.
insert into charted_metrics
  (account_id, metric_key, label, value_type, unit, direction_good, precision)
values
  (v_account, 'body_weight', 'Body weight', 'number', 'kg', 'down', 1),
  (v_account, 'squat_1rm', 'Squat one rep max', 'number', 'kg', 'up', 0),
  (v_account, 'reading_score', 'Reading score', 'count', null, 'up', 0),
  (v_account, 'homework_done', 'Homework done', 'boolean', null, 'up', 0),
  (v_account, 'knee_flexion', 'Knee flexion', 'number', 'degrees', 'up', 0),
  (v_account, 'pain_level', 'Pain level', 'rating', null, 'down', 0),
  (v_account, 'rooms_complete', 'Rooms complete', 'count', null, 'up', 0)
on conflict (account_id, metric_key) do nothing;

update charted_metrics set scale_min = 0, scale_max = 10
 where account_id = v_account and metric_key = 'pain_level';

-- ── Stages, which are this account's own and not a shipped set ─────────────
insert into charted_tags (account_id, name, kind, position)
values (v_account, 'Intake', 'stage', 0), (v_account, 'On program', 'stage', 1)
on conflict do nothing;

select id into v_stage_intake from charted_tags
 where account_id = v_account and name = 'Intake' limit 1;
select id into v_stage_program from charted_tags
 where account_id = v_account and name = 'On program' limit 1;

-- ── Subjects ───────────────────────────────────────────────────────────────
insert into charted_subjects (account_id, client_id, name, kind, started_on, summary)
values
  (v_account, v_dana_client, 'Dana Whitfield', 'person', current_date - 180,
   'Strength and body composition, twice a week.'),
  (v_account, v_sam_client, 'Sam Okafor', 'person', current_date - 120,
   'Reading and comprehension, weekly sessions.'),
  (v_account, v_priya_client, 'Priya Raman', 'person', current_date - 150,
   'Post-operative knee rehabilitation.'),
  (v_account, v_unit_client, 'Unit 4, Harbour Road', 'project', current_date - 90,
   'Full refit, four rooms.')
on conflict do nothing;

select id into v_dana from charted_subjects where account_id = v_account and name = 'Dana Whitfield' limit 1;
select id into v_sam from charted_subjects where account_id = v_account and name = 'Sam Okafor' limit 1;
select id into v_priya from charted_subjects where account_id = v_account and name = 'Priya Raman' limit 1;
select id into v_unit from charted_subjects where account_id = v_account and name = 'Unit 4, Harbour Road' limit 1;

insert into charted_subject_tags (account_id, subject_id, tag_id)
values
  (v_account, v_dana, v_stage_program),
  (v_account, v_sam, v_stage_program),
  (v_account, v_priya, v_stage_program),
  (v_account, v_unit, v_stage_intake)
on conflict do nothing;

insert into charted_subject_metrics (account_id, subject_id, metric_key, position, pinned)
values
  (v_account, v_dana, 'body_weight', 0, true),
  (v_account, v_dana, 'squat_1rm', 1, true),
  (v_account, v_sam, 'reading_score', 0, true),
  (v_account, v_sam, 'homework_done', 1, false),
  (v_account, v_priya, 'knee_flexion', 0, true),
  (v_account, v_priya, 'pain_level', 1, true),
  (v_account, v_unit, 'rooms_complete', 0, true)
on conflict do nothing;

-- ══════════════════════════════════════════════════════════════════════════
-- Dana: steady loss for four months, then a real plateau.
-- ══════════════════════════════════════════════════════════════════════════
for v_i in 0..25 loop
  v_date := current_date - 180 + (v_i * 7);

  insert into charted_check_ins (account_id, subject_id, occurred_on, source, note)
  values (v_account, v_dana, v_date, 'operator',
          case when v_i = 18 then 'Weight has not moved in a month. Changing the plan.' else null end)
  on conflict (subject_id, occurred_on) do nothing
  returning id into v_check;

  if v_check is null then
    select id into v_check from charted_check_ins
     where subject_id = v_dana and occurred_on = v_date;
  end if;

  -- Falls 88 to 80 over the first eighteen weeks, then sits at 80.
  v_value := case when v_i <= 17 then 88 - (v_i * 0.45) else 80.1 + ((v_i % 3) * 0.05) end;

  insert into charted_values (account_id, subject_id, check_in_id, metric_key, numeric)
  values (v_account, v_dana, v_check, 'body_weight', round(v_value, 1))
  on conflict (check_in_id, metric_key) do nothing;

  insert into charted_values (account_id, subject_id, check_in_id, metric_key, numeric)
  values (v_account, v_dana, v_check, 'squat_1rm', 80 + (v_i * 2))
  on conflict (check_in_id, metric_key) do nothing;

  v_check := null;
end loop;

insert into charted_goals
  (account_id, subject_id, metric_key, target_value, comparator, start_value, started_on, deadline)
values
  (v_account, v_dana, 'body_weight', 78, 'lte', 88, current_date - 180, current_date + 30)
on conflict (subject_id, metric_key) do nothing;

insert into charted_milestones
  (account_id, subject_id, metric_key, label, threshold_value, position)
values
  (v_account, v_dana, 'body_weight', 'Under 85', 85, 0),
  (v_account, v_dana, 'body_weight', 'Under 80', 80, 1),
  (v_account, v_dana, 'squat_1rm', 'Squat 120', 120, 2)
on conflict do nothing;

-- ══════════════════════════════════════════════════════════════════════════
-- Sam: rising scores with one bad week. Inside the noise band on purpose, so
-- the regression detector should NOT fire on it.
-- ══════════════════════════════════════════════════════════════════════════
for v_i in 0..16 loop
  v_date := current_date - 119 + (v_i * 7);

  insert into charted_check_ins (account_id, subject_id, occurred_on, source)
  values (v_account, v_sam, v_date, 'operator')
  on conflict (subject_id, occurred_on) do nothing
  returning id into v_check;

  if v_check is null then
    select id into v_check from charted_check_ins
     where subject_id = v_sam and occurred_on = v_date;
  end if;

  insert into charted_values (account_id, subject_id, check_in_id, metric_key, numeric)
  values (v_account, v_sam, v_check, 'reading_score',
          case when v_i = 11 then 62 else 48 + (v_i * 2) end)
  on conflict (check_in_id, metric_key) do nothing;

  insert into charted_values (account_id, subject_id, check_in_id, metric_key, flag)
  values (v_account, v_sam, v_check, 'homework_done', v_i % 4 <> 3)
  on conflict (check_in_id, metric_key) do nothing;

  v_check := null;
end loop;

insert into charted_goals
  (account_id, subject_id, metric_key, target_value, comparator, start_value, started_on, deadline)
values
  (v_account, v_sam, 'reading_score', 90, 'gte', 48, current_date - 119, current_date + 60)
on conflict (subject_id, metric_key) do nothing;

-- ══════════════════════════════════════════════════════════════════════════
-- Priya: real progress, then genuine lost ground. The regression detector
-- SHOULD fire on this one, and the pain rating should turn with it.
-- ══════════════════════════════════════════════════════════════════════════
for v_i in 0..20 loop
  v_date := current_date - 147 + (v_i * 7);

  insert into charted_check_ins (account_id, subject_id, occurred_on, source, note)
  values (v_account, v_priya, v_date, 'operator',
          case when v_i = 17 then 'Flare-up after the weekend. Backing off the load.' else null end)
  on conflict (subject_id, occurred_on) do nothing
  returning id into v_check;

  if v_check is null then
    select id into v_check from charted_check_ins
     where subject_id = v_priya and occurred_on = v_date;
  end if;

  insert into charted_values (account_id, subject_id, check_in_id, metric_key, numeric)
  values (v_account, v_priya, v_check, 'knee_flexion',
          case when v_i <= 16 then 60 + (v_i * 4) else 124 - ((v_i - 16) * 6) end)
  on conflict (check_in_id, metric_key) do nothing;

  insert into charted_values (account_id, subject_id, check_in_id, metric_key, numeric)
  values (v_account, v_priya, v_check, 'pain_level',
          case when v_i <= 16 then greatest(1, 7 - (v_i / 3)) else 5 end)
  on conflict (check_in_id, metric_key) do nothing;

  v_check := null;
end loop;

insert into charted_goals
  (account_id, subject_id, metric_key, target_value, comparator, start_value, started_on, deadline)
values
  (v_account, v_priya, 'knee_flexion', 135, 'gte', 60, current_date - 147, current_date + 45)
on conflict (subject_id, metric_key) do nothing;

-- ══════════════════════════════════════════════════════════════════════════
-- Unit 4: a project, and one that has gone quiet. It should show up as overdue
-- for a check-in, which is what the attention list is for.
-- ══════════════════════════════════════════════════════════════════════════
for v_i in 0..5 loop
  v_date := current_date - 90 + (v_i * 10);

  insert into charted_check_ins (account_id, subject_id, occurred_on, source)
  values (v_account, v_unit, v_date, 'operator')
  on conflict (subject_id, occurred_on) do nothing
  returning id into v_check;

  if v_check is null then
    select id into v_check from charted_check_ins
     where subject_id = v_unit and occurred_on = v_date;
  end if;

  insert into charted_values (account_id, subject_id, check_in_id, metric_key, numeric)
  values (v_account, v_unit, v_check, 'rooms_complete', least(4, v_i))
  on conflict (check_in_id, metric_key) do nothing;

  v_check := null;
end loop;

insert into charted_milestones
  (account_id, subject_id, metric_key, label, threshold_value, position)
values
  (v_account, v_unit, 'rooms_complete', 'Two rooms done', 2, 0),
  (v_account, v_unit, 'rooms_complete', 'Handover', 4, 1)
on conflict do nothing;

-- ── A note or two, so the write-up has something to quote ──────────────────
insert into charted_notes (account_id, subject_id, body, source)
values
  (v_account, v_dana, 'Sleeping better since we moved the sessions to mornings.', 'typed'),
  (v_account, v_priya, 'Says the stairs at home are the hard part, not the exercises.', 'voice')
on conflict do nothing;

end $$;

-- ============================================================
-- jotted demo seed
-- source: jotted/harness/supabase/0002_seed.sql
-- ============================================================
-- Sandbox seed.
--
-- One account, one client, one template with two questions. Enough to walk the
-- whole path on the subdomain: start a visit, answer it, price it, sign it, and
-- watch the accept step tell you plainly that no invoicing service is
-- configured, which is the degradation worth seeing.
--
-- Replace the uuid below with whatever JOTTED_DEMO_ACCOUNT_ID is set to.

\set account '00000000-0000-0000-0000-000000000001'

insert into contacts (id, user_id, name, email, phone)
values (
  '00000000-0000-0000-0000-0000000000c1',
  :'account',
  'Sample Client',
  'client@example.com',
  '+1 555 0100'
)
on conflict (id) do nothing;

insert into jotted_templates (id, account_id, key, name, description, version, archived)
values (
  '00000000-0000-0000-0000-0000000000e1',
  :'account',
  'job_estimate',
  'Job estimate',
  'The questions we ask on every callout.',
  1,
  false
)
on conflict (id) do nothing;

insert into jotted_template_sections (id, account_id, template_id, title, position)
values (
  '00000000-0000-0000-0000-0000000000d1',
  :'account',
  '00000000-0000-0000-0000-0000000000e1',
  'The work',
  0
)
on conflict (id) do nothing;

insert into jotted_template_fields
  (id, account_id, template_id, section_id, key, label, kind, required, options, position)
values
  (
    '00000000-0000-0000-0000-0000000000f1',
    :'account',
    '00000000-0000-0000-0000-0000000000e1',
    '00000000-0000-0000-0000-0000000000d1',
    'scope', 'Scope of work', 'longtext', true, '[]'::jsonb, 0
  ),
  (
    '00000000-0000-0000-0000-0000000000f2',
    :'account',
    '00000000-0000-0000-0000-0000000000e1',
    '00000000-0000-0000-0000-0000000000d1',
    'condition', 'Condition on arrival', 'rating', false, '[]'::jsonb, 1
  )
on conflict (id) do nothing;

-- ============================================================
-- solved demo seed
-- source: solved/harness/supabase/0002_seed.sql
-- ============================================================
-- Demo data for the sandbox.
--
-- The seed has deliberate SHAPE rather than volume, because the things worth
-- testing in a collaborative workspace are the awkward ones:
--
--   a space with four members at four different roles, so the permission
--   differences are visible without inventing accounts;
--   a document with an unresolved comment thread on somebody else's paragraph,
--   which is the capability the module exists for;
--   a range comment whose quoted passage still matches, sitting next to a
--   paragraph that has been edited since, so re-anchoring has something to do;
--   a board with connectors, a sticky note stuck ONTO a shape, and a freehand
--   stroke, so every element kind on the board surface is exercised;
--   a chart with enough history to project and one with too little, so the
--   refusal path is visible;
--   a timeline with two overlapping phases, so lane packing has to do work.
--
-- Everything belongs to one account, whose id is below. Set
-- SOLVED_DEMO_ACCOUNT_ID to it.

do $$
declare
  v_account  uuid := '11111111-1111-1111-1111-111111111111';
  v_dillon   uuid := '22222222-2222-2222-2222-222222222222';
  v_sam      uuid := '33333333-3333-3333-3333-333333333333';
  v_riley    uuid := '44444444-4444-4444-4444-444444444444';
  v_jo       uuid := '55555555-5555-5555-5555-555555555555';

  v_space    uuid;
  v_doc      uuid;
  v_board    uuid;
  v_time     uuid;

  v_para     uuid;
  v_edited   uuid;
  v_shape_a  uuid;
  v_shape_b  uuid;
  v_sticky   uuid;
  v_contact  uuid;
begin
  -- ── People ───────────────────────────────────────────────────────────────
  insert into demo_users (id, account_id, display_name, email) values
    (v_dillon, v_account, 'Dillon',  'dillon@example.com'),
    (v_sam,    v_account, 'Sam Okafor', 'sam@example.com'),
    (v_riley,  v_account, 'Riley Chen', 'riley@example.com'),
    (v_jo,     v_account, 'Jo Barnes',  'jo@example.com')
  on conflict (id) do nothing;

  insert into contacts (user_id, name, email)
  values (v_account, 'Northwind Studios', 'hello@northwind.example')
  returning id into v_contact;

  -- ── The space ────────────────────────────────────────────────────────────
  insert into solved_spaces (account_id, title, icon, room_key, created_by)
  values (v_account, 'Northwind rebrand', 'N', encode(gen_random_bytes(24), 'hex'), v_dillon)
  returning id into v_space;

  -- Four roles, so the difference between them is visible on one screen. Jo is
  -- a viewer, which is the interesting one: a viewer may COMMENT and may not
  -- edit, and that is the point of the role.
  insert into solved_members (account_id, space_id, user_id, role, invited_by) values
    (v_account, v_space, v_dillon, 'owner',  v_dillon),
    (v_account, v_space, v_sam,    'admin',  v_dillon),
    (v_account, v_space, v_riley,  'member', v_dillon),
    (v_account, v_space, v_jo,     'viewer', v_dillon);

  insert into solved_subscriptions (account_id, space_id, user_id, state) values
    (v_account, v_space, v_dillon, 'following'),
    (v_account, v_space, v_sam,    'following'),
    (v_account, v_space, v_riley,  'following'),
    (v_account, v_space, v_jo,     'muted');

  -- ── Pages ────────────────────────────────────────────────────────────────
  insert into solved_pages (account_id, space_id, title, kind, position, created_by)
  values (v_account, v_space, 'Brief', 'document', 0, v_dillon) returning id into v_doc;

  insert into solved_pages (account_id, space_id, title, kind, position, created_by)
  values (v_account, v_space, 'Ideas', 'board', 1, v_sam) returning id into v_board;

  insert into solved_pages (account_id, space_id, title, kind, position, created_by)
  values (v_account, v_space, 'Timeline', 'timeline', 2, v_dillon) returning id into v_time;

  -- ── The document ─────────────────────────────────────────────────────────
  insert into solved_elements
    (account_id, space_id, page_id, kind, content, position, created_by, updated_by)
  values
    (v_account, v_space, v_doc, 'heading',
     '{"text":"What we are doing","level":2}'::jsonb, 0, v_dillon, v_dillon);

  insert into solved_elements
    (account_id, space_id, page_id, kind, content, position, created_by, updated_by)
  values
    (v_account, v_space, v_doc, 'text',
     '{"text":"Northwind have outgrown the mark they registered in 2019. The wordmark still works at large sizes and falls apart on a phone."}'::jsonb,
     1, v_sam, v_sam)
  returning id into v_para;

  -- Edited SINCE the range comment below was written, so the quoted passage no
  -- longer sits where its offsets say. This is what `reanchorComments` is for,
  -- and having it in the seed means the orphaned path is visible on first run
  -- rather than in six months on somebody's real workspace.
  insert into solved_elements
    (account_id, space_id, page_id, kind, content, position, created_by, updated_by, version)
  values
    (v_account, v_space, v_doc, 'text',
     '{"text":"The budget has moved. We are now working to a smaller number and a shorter runway than the original scope assumed."}'::jsonb,
     2, v_riley, v_riley, 3)
  returning id into v_edited;

  insert into solved_elements
    (account_id, space_id, page_id, kind, content, position, created_by, updated_by)
  values
    (v_account, v_space, v_doc, 'list',
     '{"style":"bullet","items":["A mark that reads at 24px","Something that survives being embroidered","Keep the green"]}'::jsonb,
     3, v_dillon, v_dillon);

  -- ── Comments ─────────────────────────────────────────────────────────────
  -- An open thread on somebody else's paragraph, with a mention and a reply.
  -- The mention format is @[Name](userId), which keeps the id beside the name
  -- so renaming a person does not break every mention of them.
  declare v_thread uuid;
  begin
    insert into solved_comments
      (account_id, space_id, page_id, target_kind, target_id, body, author_id)
    values
      (v_account, v_space, v_doc, 'element', v_para,
       'Is 2019 right? I thought the mark predated the company name. @[Dillon](22222222-2222-2222-2222-222222222222)',
       v_jo)
    returning id into v_thread;

    insert into solved_mentions
      (account_id, space_id, comment_id, element_id, mentioned_user_id)
    values (v_account, v_space, v_thread, v_para, v_dillon);

    insert into solved_comments
      (account_id, space_id, page_id, target_kind, target_id, parent_comment_id, body, author_id)
    values
      (v_account, v_space, v_doc, 'element', v_para, v_thread,
       'Registered 2019, drawn 2017. I will make that clearer.', v_dillon);

    -- A range comment whose quoted text has since been edited out of the
    -- paragraph. Left NOT orphaned so that the first call to reanchorComments
    -- is the thing that discovers it, which is the behaviour worth watching.
    insert into solved_comments
      (account_id, space_id, page_id, target_kind, target_id, range, body, author_id)
    values
      (v_account, v_space, v_doc, 'range', v_edited,
       jsonb_build_object('elementId', v_edited, 'from', 18, 'to', 41, 'quoted', 'a much shorter runway'),
       'How much shorter are we talking?', v_sam);

    -- A resolved thread, so the write-up has a decision to pull from later and
    -- so the resolved filter has something to show.
    insert into solved_comments
      (account_id, space_id, page_id, target_kind, target_id, body, author_id,
       resolved_at, resolved_by)
    values
      (v_account, v_space, v_doc, 'element', v_para,
       'Agreed we keep the green and change everything else.', v_riley,
       now() - interval '2 days', v_dillon);
  end;

  -- ── The board ────────────────────────────────────────────────────────────
  insert into solved_elements
    (account_id, space_id, page_id, kind, content, style, x, y, w, h, z, created_by, updated_by)
  values
    (v_account, v_space, v_board, 'shape',
     '{"shape":"rectangle","label":"Wordmark"}'::jsonb,
     '{"stroke":"#8a94a3","fill":"transparent"}'::jsonb,
     80, 80, 220, 140, 1, v_sam, v_sam)
  returning id into v_shape_a;

  insert into solved_elements
    (account_id, space_id, page_id, kind, content, style, x, y, w, h, z, created_by, updated_by)
  values
    (v_account, v_space, v_board, 'shape',
     '{"shape":"ellipse","label":"Icon"}'::jsonb,
     '{"stroke":"#5aa469","fill":"transparent"}'::jsonb,
     440, 80, 200, 140, 1, v_sam, v_sam)
  returning id into v_shape_b;

  insert into solved_elements
    (account_id, space_id, page_id, kind, content, x, y, w, h, z, created_by, updated_by)
  values
    (v_account, v_space, v_board, 'connector',
     ('{"fromElementId":"' || v_shape_a || '","toElementId":"' || v_shape_b ||
      '","fromAnchor":"auto","toAnchor":"auto","routing":"curved","label":"","arrow":"end"}')::jsonb,
     0, 0, 0, 0, 0, v_sam, v_sam);

  -- A sticky note stuck ONTO the shape rather than merely near it. The anchor
  -- is what makes markup-on-somebody-else's-work travel with the thing it is
  -- about.
  insert into solved_elements
    (account_id, space_id, page_id, kind, content, style,
     anchor_element_id, x, y, w, h, z, created_by, updated_by)
  values
    (v_account, v_space, v_board, 'sticky',
     '{"text":"This one, but heavier"}'::jsonb,
     '{"fill":"#f6d365"}'::jsonb,
     v_shape_a, 316, 80, 180, 180, 2, v_jo, v_jo)
  returning id into v_sticky;

  -- A freehand stroke. Points are element-relative, which is what lets a stroke
  -- be dragged and pasted without rewriting every point.
  insert into solved_elements
    (account_id, space_id, page_id, kind, content, style, x, y, w, h, z, created_by, updated_by)
  values
    (v_account, v_space, v_board, 'freehand',
     '{"points":[{"x":0,"y":40},{"x":30,"y":10},{"x":60,"y":45},{"x":95,"y":5},{"x":130,"y":38}]}'::jsonb,
     '{"stroke":"#e8ecf1","strokeWidth":2}'::jsonb,
     90, 280, 132, 50, 1, v_riley, v_riley);

  -- Enough history to project from. Twelve months, rising with a real dip.
  insert into solved_elements
    (account_id, space_id, page_id, kind, content, x, y, w, h, z, created_by, updated_by)
  values
    (v_account, v_space, v_board, 'chart',
     '{"spec":{"type":"line","title":"Site visits","categories":["Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"],"series":[{"label":"Visits","values":[1200,1350,1410,980,1520,1610,1700,1780,1910,2050,2140,2260]}],"showTrend":true,"projectPeriods":3,"movingAverage":3,"yAxisIncludesZero":true}}'::jsonb,
     700, 80, 480, 320, 1, v_dillon, v_dillon);

  -- Too little history. The chart draws and the projection REFUSES, in a
  -- sentence a person can read, which is the behaviour worth being able to see.
  insert into solved_elements
    (account_id, space_id, page_id, kind, content, x, y, w, h, z, created_by, updated_by)
  values
    (v_account, v_space, v_board, 'chart',
     '{"spec":{"type":"bar","title":"Signups so far","categories":["Jul","Aug"],"series":[{"label":"Signups","values":[14,22]}],"showTrend":false,"projectPeriods":3,"movingAverage":0,"yAxisIncludesZero":true}}'::jsonb,
     700, 440, 380, 260, 1, v_dillon, v_dillon);

  -- ── The timeline ─────────────────────────────────────────────────────────
  -- Two phases that OVERLAP, so lane packing has to put them on separate rows,
  -- plus a milestone and an item linked back to the board.
  insert into solved_elements
    (account_id, space_id, page_id, kind, content, x, y, w, h, created_by, updated_by)
  values
    (v_account, v_space, v_time, 'timeline_item',
     '{"title":"Discovery","itemKind":"phase","start":"2026-08-03","end":"2026-08-28","linkElementId":null}'::jsonb,
     0, 0, 0, 0, v_dillon, v_dillon),

    (v_account, v_space, v_time, 'timeline_item',
     ('{"title":"Concepts","itemKind":"phase","start":"2026-08-17","end":"2026-09-18","linkElementId":"' || v_shape_a || '"}')::jsonb,
     0, 0, 0, 0, v_sam, v_sam),

    (v_account, v_space, v_time, 'timeline_item',
     '{"title":"Present to Northwind","itemKind":"milestone","start":"2026-09-22","end":null,"linkElementId":null}'::jsonb,
     0, 0, 0, 0, v_dillon, v_dillon),

    (v_account, v_space, v_time, 'timeline_item',
     '{"title":"Rollout","itemKind":"phase","start":"2026-10-05","end":"2026-11-13","linkElementId":null}'::jsonb,
     0, 0, 0, 0, v_dillon, v_dillon);

  -- ── Tags ─────────────────────────────────────────────────────────────────
  declare
    v_tag_urgent uuid;
    v_tag_client uuid;
  begin
    insert into solved_tags (account_id, name, color, created_by)
    values (v_account, 'Needs a decision', '#c39236', v_dillon)
    returning id into v_tag_urgent;

    insert into solved_tags (account_id, name, color, created_by)
    values (v_account, 'Client said', '#4a7dbd', v_sam)
    returning id into v_tag_client;

    insert into solved_element_tags (account_id, space_id, element_id, tag_id, assigned_by)
    values
      (v_account, v_space, v_edited,  v_tag_urgent, v_dillon),
      (v_account, v_space, v_sticky,  v_tag_client, v_sam),
      (v_account, v_space, v_shape_a, v_tag_urgent, v_sam);
  end;

  -- ── Activity ─────────────────────────────────────────────────────────────
  -- Written directly rather than by replaying the services, so the seed does
  -- not need an app running. Real activity is always written by
  -- `recordActivity`, which is the only writer.
  insert into solved_activity
    (account_id, space_id, page_id, actor_id, verb, target_kind, target_id, summary, created_at)
  values
    (v_account, v_space, v_doc,   v_dillon, 'created',   'space',   v_space, 'created the space "Northwind rebrand"', now() - interval '6 days'),
    (v_account, v_space, v_doc,   v_sam,    'edited',    'element', v_para,  'edited "Northwind have outgrown the mark..."', now() - interval '5 days'),
    (v_account, v_space, v_doc,   v_jo,     'commented', 'comment', null,    'commented on "Northwind have outgrown the mark..."', now() - interval '4 days'),
    (v_account, v_space, v_board, v_sam,    'created',   'element', v_shape_a, 'added a item', now() - interval '3 days'),
    (v_account, v_space, v_board, v_jo,     'created',   'element', v_sticky,  'added a note', now() - interval '2 days'),
    (v_account, v_space, v_doc,   v_dillon, 'resolved',  'comment', null,    'resolved a comment', now() - interval '2 days'),
    (v_account, v_space, v_time,  v_dillon, 'created',   'element', null,    'added a milestone', now() - interval '1 day'),
    (v_account, v_space, v_board, v_riley,  'moved',     'element', v_shape_b, 'moved a item', now() - interval '6 hours');

  raise notice 'Seeded. Set SOLVED_DEMO_ACCOUNT_ID=% and SOLVED_DEMO_USER_ID=%', v_account, v_dillon;
end $$;
