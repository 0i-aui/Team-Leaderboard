-- ============================================================
-- Team Leaderboard — Canonical Schema v3 (fresh installs)
-- Run this in: Supabase → SQL Editor → New Query → Paste → Run
-- Already have v2 tables with data? Ask for the conversion SQL
-- (it migrates role/board to the roles array, preserving everything).
-- Then optionally run seed.sql for the 20 required people.
-- ============================================================
-- Model: ONE leaderboard, ALL people, ranked by total.
-- Roles are ADDITIVE marks stored in people.roles (empty = MEMBER):
--  * ADMIN mark ............. points_a = Members,    points_b = Management
--  * SUPERVISOR mark ........ points_a = Leaders,    points_b = Admin
--  * otherwise .............. points_a = Supervisors, points_b = Admin
--  * total = points_a + points_b (computed live, never stored)
-- Point labels are DERIVED from marks, never stored, never duplicated.
-- Zones (computed live in the frontend from rank, never stored):
--  * rank 1–10 = SAFE, rank 11+ = RED
-- ============================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- people ----------
-- roles: additive marks from {admin, mod, supervisor, leader}.
-- Empty array = regular member. No separate board column exists:
-- everyone belongs to the single leaderboard.
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  roles text[] not null default '{}',
  points_a integer not null default 0 check (points_a >= 0),
  points_b integer not null default 0 check (points_b >= 0),
  avatar_color text default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint people_roles_valid check (roles <@ array['admin', 'mod', 'supervisor', 'leader'])
);

create unique index if not exists people_name_unique on public.people (lower(trim(name)));

-- At most ONE admin in the whole system (a second 'admin' mark is rejected).
create unique index if not exists people_one_admin on public.people ((true)) where 'admin' = any (roles);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_people_updated on public.people;
create trigger trg_people_updated before update on public.people
for each row execute function public.touch_updated_at();

-- At most 20 people in total.
create or replace function public.enforce_people_cap()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.people) >= 20 then
    raise exception 'Maximum 20 people allowed in the leaderboard';
  end if;
  return new;
end $$;

drop trigger if exists trg_people_cap on public.people;
create trigger trg_people_cap before insert on public.people
for each row execute function public.enforce_people_cap();

-- ---------- points_history (append-only audit log) ----------
-- source_key vocabulary per person type (validated by add_points()):
--  * ADMIN mark ............ 'members'    | 'management'
--  * SUPERVISOR mark ....... 'leader'     | 'admin'
--  * otherwise ............. 'supervisor' | 'admin'
create table if not exists public.points_history (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  source_key text not null check (source_key in ('supervisor', 'admin', 'leader', 'members', 'management')),
  points_change integer not null check (points_change <> 0),
  previous_points integer not null check (previous_points >= 0),
  new_points integer not null check (new_points >= 0),
  reason text default null,
  created_at timestamptz not null default now()
);
create index if not exists points_history_person_idx on public.points_history (person_id, created_at desc);
create index if not exists points_history_created_idx on public.points_history (created_at desc);
create index if not exists points_history_source_idx on public.points_history (source_key);

-- ---------- Atomic RPC: add points + history in one transaction ----------
-- Usage (SQL Editor):
--   select public.add_points((select id from people where name='Thomas'), 'supervisor', 20, 'Great work');
--   select public.add_points((select id from people where name='Jana'), 'leader', 15, 'Top review');
--   select public.add_points((select id from people where name='Ahmed Sameh'), 'management', 10, 'Decision');
create or replace function public.add_points(
  p_person_id uuid,
  p_source_key text,
  p_points integer,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_roles text[];
  v_is_admin boolean;
  v_is_sup boolean;
  v_col text;
  v_prev integer;
  v_new integer;
  v_hist_id uuid;
begin
  if p_source_key not in ('supervisor', 'admin', 'leader', 'members', 'management') then
    raise exception 'invalid source_key: %', p_source_key;
  end if;
  if p_points is null or p_points = 0 then
    raise exception 'points must be a non-zero integer (use negative to deduct)';
  end if;

  select roles into v_roles
  from public.people where id = p_person_id for update;
  if not found then
    raise exception 'person not found: %', p_person_id;
  end if;
  v_is_admin := 'admin' = any (v_roles);
  v_is_sup := 'supervisor' = any (v_roles);

  -- Map source → column AND validate it fits this person's marks.
  if p_source_key = 'members' then
    if not v_is_admin then raise exception 'source "members" is only valid for the admin'; end if;
    v_col := 'a';
  elsif p_source_key = 'management' then
    if not v_is_admin then raise exception 'source "management" is only valid for the admin'; end if;
    v_col := 'b';
  elsif p_source_key = 'leader' then
    if not v_is_sup then raise exception 'source "leader" is only valid for supervisors'; end if;
    v_col := 'a';
  elsif p_source_key = 'supervisor' then
    if v_is_sup or v_is_admin then raise exception 'source "supervisor" is only valid for non-supervisors'; end if;
    v_col := 'a';
  else -- 'admin'
    if v_is_admin then raise exception 'source "admin" is not valid for the admin (use members/management)'; end if;
    v_col := 'b';
  end if;

  if v_col = 'a' then
    select points_a into v_prev from public.people where id = p_person_id;
  else
    select points_b into v_prev from public.people where id = p_person_id;
  end if;

  v_new := v_prev + p_points;
  if v_new < 0 then
    raise exception 'insufficient points: current %, change %', v_prev, p_points;
  end if;

  if v_col = 'a' then
    update public.people set points_a = v_new where id = p_person_id;
  else
    update public.people set points_b = v_new where id = p_person_id;
  end if;

  insert into public.points_history (person_id, source_key, points_change, previous_points, new_points, reason)
  values (p_person_id, p_source_key, p_points, v_prev, v_new, nullif(trim(coalesce(p_reason, '')), ''))
  returning id into v_hist_id;

  return v_hist_id;
end $$;

-- ---------- Integrity helper: rebuild cached totals from history ----------
-- Note: 'leader' rows count for supervisor- AND leader-marked people, so
-- legacy leader-sourced points (e.g. Basant's) are preserved verbatim in
-- points_a even though new 'leader' points require the supervisor mark.
create or replace function public.rebuild_person_points()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare r integer := 0;
begin
  update public.people p set
    points_a = coalesce((select sum(h.points_change) from public.points_history h
      where h.person_id = p.id and (
        (h.source_key = 'supervisor' and not ('supervisor' = any (p.roles)) and not ('admin' = any (p.roles))) or
        (h.source_key = 'leader' and ('supervisor' = any (p.roles) or 'leader' = any (p.roles))) or
        (h.source_key = 'members' and 'admin' = any (p.roles)))), 0),
    points_b = coalesce((select sum(h.points_change) from public.points_history h
      where h.person_id = p.id and (
        (h.source_key = 'admin' and not ('admin' = any (p.roles))) or
        (h.source_key = 'management' and 'admin' = any (p.roles)))), 0);
  get diagnostics r = row_count;
  return r;
end $$;

-- ---------- Lock down RPC: owner-only execution ----------
revoke all on function public.add_points(uuid, text, integer, text) from public, anon, authenticated;
do $$
begin
  revoke all on function public.rebuild_person_points() from public, anon, authenticated;
  revoke all on function public.touch_updated_at() from public, anon, authenticated;
exception when undefined_function then null;
end $$;

-- ---------- RLS: public read-only ----------
alter table public.people enable row level security;
alter table public.points_history enable row level security;

drop policy if exists "public read people" on public.people;
drop policy if exists "public read points_history" on public.points_history;

create policy "public read people"
  on public.people for select to anon, authenticated using (true);

create policy "public read points_history"
  on public.points_history for select to anon, authenticated using (true);

-- NOTE: no INSERT / UPDATE / DELETE policies for anon/authenticated,
-- so the frontend (anon key) cannot write. Table Editor and service_role
-- bypass RLS — that is how you manage data.

-- ---------- API grants (read-only) ----------
-- RLS policies alone are NOT enough: PostgREST also requires schema USAGE
-- and table-level SELECT grants, or every request fails with
-- 401 / 42501 "permission denied for schema public". These grants give
-- anon/authenticated read access only — RLS still governs every row, and
-- with no write policies, all writes stay denied.
grant usage on schema public to anon, authenticated;
grant select on public.people to anon, authenticated;
grant select on public.points_history to anon, authenticated;

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
