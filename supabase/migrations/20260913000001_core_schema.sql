-- ============================================================
-- 0001_core_schema.sql — Team Leaderboard canonical schema
-- Tables, indexes, and data-integrity triggers only.
-- No functions with business logic, no RLS, no grants here
-- (those live in 0002/0003). Data lives in supabase/seed.sql.
-- ============================================================
-- Model:
--  * people ......... the 19 active members. Canonical English `name` is the
--    stable human identity; all relationships use `id` (never names).
--    `team` ('A'/'B') is stored here — the database owns membership.
--    Display strings (`name_ar`, `nickname_en/ar`) are nullable
--    presentation data; canonical `name` never changes for display.
--  * points_history . append-only audit log, one row per scoring action.
--    Grand totals (not per-bucket values) in previous_total/new_total,
--    plus a server-computed `week_start` (Monday) per row.
--  * scoring_resets . reset-event markers; the latest row bounds the
--    current scoring period. History rows are never deleted/rewritten.
--  * push_* ......... Web Push subscriptions + idempotency log.
--    Sensitive: RPC-only access (see 0003), never publicly readable.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- people ----------
create table public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  -- Team membership: exactly one of 'A' / 'B', owned by the database.
  team text not null check (team in ('A', 'B')),
  -- Additive role marks; empty array = regular MEMBER (displayed MEMBER).
  roles text[] not null default '{}',
  -- Point buckets. Canonical meaning (see add_points in 0002):
  --  * non-admin ...... all 'admin' points land in points_a
  --  * admin .......... 'members' → points_a, 'management' → points_b
  --  * total = points_a + points_b (derived live, never stored)
  points_a integer not null default 0 check (points_a >= 0),
  points_b integer not null default 0 check (points_b >= 0),
  -- Presentation-layer display data (nullable; canonical `name` is truth).
  name_ar text default null,
  nickname_en text default null,
  nickname_ar text default null,
  avatar_color text default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint people_roles_valid check (roles <@ array['admin', 'mod', 'supervisor', 'leader'])
);

-- Unique canonical names (case-insensitive, trimmed).
create unique index people_name_unique on public.people (lower(trim(name)));

-- At most ONE admin in the whole system.
create unique index people_one_admin on public.people ((true)) where 'admin' = any (roles);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_people_updated on public.people;
create trigger trg_people_updated before update on public.people
for each row execute function public.touch_updated_at();

-- At most 19 people in total (10 in Team A, 9 in Team B).
create or replace function public.enforce_people_cap()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.people) >= 19 then
    raise exception 'Maximum 19 people allowed in the leaderboard';
  end if;
  return new;
end $$;

drop trigger if exists trg_people_cap on public.people;
create trigger trg_people_cap before insert on public.people
for each row execute function public.enforce_people_cap();

-- ---------- points_history (append-only audit log) ----------
-- Strict current source vocabulary (validated again by add_points()):
--  * normal members/supervisors/leaders ... 'admin' only
--  * ADMIN-marked people (historical — no active member currently
--    carries the mark) ................... 'members' | 'management'
create table public.points_history (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  source_key text not null check (source_key in ('admin', 'members', 'management')),
  points_change integer not null check (points_change <> 0),
  -- Grand totals (points_a + points_b) before/after this transaction.
  previous_total integer not null check (previous_total >= 0),
  new_total integer not null check (new_total >= 0),
  reason text default null,
  -- Server-computed Monday of this row's week (week = Mon 00:00 → Sun 23:59
  -- in the database timezone). Used for weekly-cap accounting and filters.
  week_start date not null default (date_trunc('week', now()))::date,
  created_at timestamptz not null default now()
);
create index points_history_person_idx on public.points_history (person_id, created_at desc);
create index points_history_created_idx on public.points_history (created_at desc);
create index points_history_source_idx on public.points_history (source_key);
create index points_history_week_idx on public.points_history (person_id, week_start);

-- ---------- scoring_resets (reset-event markers) ----------
-- A reset zeroes `people` buckets and inserts one row here. History is
-- preserved; the latest row bounds the current scoring period.
create table public.scoring_resets (
  id uuid primary key default gen_random_uuid(),
  reason text default null,
  created_at timestamptz not null default now()
);

-- ---------- push_subscriptions (SENSITIVE — RPC-only, see 0003) ----------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index push_subscriptions_endpoint_unique on public.push_subscriptions (endpoint);
create index push_subscriptions_person_idx on public.push_subscriptions (person_id) where is_active;

-- ---------- push_log (webhook idempotency — RPC/server-only, see 0003) ----------
create table public.push_log (
  history_id uuid primary key,
  person_id uuid not null references public.people(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------- Realtime ----------
do $$
begin
  begin
    alter publication supabase_realtime add table public.people;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.points_history;
  exception when duplicate_object then null; end;
end $$;
