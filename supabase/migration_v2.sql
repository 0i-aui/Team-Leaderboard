-- ============================================================
-- Team Leaderboard — MIGRATION v2 (HISTORICAL — do not use for new setups)
-- This file migrates the ORIGINAL v1 tables to the two-board v2 model.
-- Current model is v3 (single board + roles array): fresh installs must
-- use schema.sql + seed.sql; existing v2 databases use the separately
-- provided conversion SQL. Kept for history only.
-- ============================================================
-- What this does:
--  1. DELETES all old leaderboard data + old tables/functions
--     (members, supervisors, points_history, supervisor_points_history,
--      add_member_points, add_supervisor_points, rebuild_member_points).
--  2. Creates the new model: people + points_history.
--  3. Enforces: max 20 people · max 4 on supervisors board · max 1 admin ·
--     unique names (case-insensitive) · valid roles/boards/sources.
--  4. Seeds EXACTLY the 20 required people, all points at 0.
--  5. Runs verification queries (check their output at the bottom).
--
-- Point model (no duplication, labels are DERIVED, never stored):
--  * role='admin' (Ahmed Sameh) ..... points_a = Members,    points_b = Management
--  * board='supervisors' ............ points_a = Leaders,    points_b = Admin
--  * board='members' (others) ....... points_a = Supervisors, points_b = Admin
--  * total = points_a + points_b (computed live, never stored)
-- ============================================================

-- ---------- 0. Remove the old world ----------
-- (people is dropped too so re-running this migration is always safe)
drop table if exists public.points_history cascade;
drop table if exists public.supervisor_points_history cascade;
drop table if exists public.members cascade;
drop table if exists public.supervisors cascade;
drop table if exists public.people cascade;

drop function if exists public.add_member_points(uuid, text, integer, text);
drop function if exists public.add_supervisor_points(uuid, integer, text);
drop function if exists public.rebuild_member_points();

-- ---------- 1. Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- 2. people ----------
create table public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  role text not null check (role in ('admin', 'leader', 'member')),
  board text not null check (board in ('members', 'supervisors')),
  points_a integer not null default 0 check (points_a >= 0),
  points_b integer not null default 0 check (points_b >= 0),
  avatar_color text default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique names, case-insensitive (Ahmed Mohamed ≠ Mohamed Ahmed, but
-- 'eman' ≠ 'Eman' is blocked as a duplicate).
create unique index if not exists people_name_unique on public.people (lower(trim(name)));

-- Structural caps (data rules, not hardcoded names):
--  * at most ONE admin in the whole system
create unique index if not exists people_one_admin on public.people (role) where role = 'admin';

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_people_updated on public.people;
create trigger trg_people_updated before update on public.people
for each row execute function public.touch_updated_at();

--  * at most 20 people in total
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

--  * at most 4 people on the supervisors board (insert + board moves)
create or replace function public.enforce_supervisor_cap()
returns trigger language plpgsql as $$
begin
  if new.board = 'supervisors'
     and (select count(*) from public.people where board = 'supervisors' and id <> new.id) >= 4 then
    raise exception 'Supervisor leaderboard is limited to 4 people';
  end if;
  return new;
end $$;

drop trigger if exists trg_supervisor_cap on public.people;
create trigger trg_supervisor_cap before insert or update of board on public.people
for each row execute function public.enforce_supervisor_cap();

-- ---------- 3. points_history (append-only audit log) ----------
-- source_key vocabulary per person type (validated by add_points()):
--  * members board ......... 'supervisor' | 'admin'
--  * supervisors board ..... 'leader'     | 'admin'
--  * admin (Ahmed Sameh) ... 'members'    | 'management'
create table public.points_history (
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

-- ---------- 4. Atomic RPC: add points + history in one transaction ----------
-- Usage (SQL Editor):
--   select public.add_points((select id from people where name='Jana'), 'supervisor', 20, 'Great work');
--   select public.add_points((select id from people where name='Eman'), 'leader', 15, 'Top review');
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
  v_role text;
  v_board text;
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

  select role, board into v_role, v_board
  from public.people where id = p_person_id for update;
  if not found then
    raise exception 'person not found: %', p_person_id;
  end if;

  -- Map source → column AND validate it fits this person's type.
  if p_source_key = 'members' then
    if v_role <> 'admin' then raise exception 'source "members" is only valid for the admin'; end if;
    v_col := 'a';
  elsif p_source_key = 'management' then
    if v_role <> 'admin' then raise exception 'source "management" is only valid for the admin'; end if;
    v_col := 'b';
  elsif p_source_key = 'leader' then
    if v_board <> 'supervisors' then raise exception 'source "leader" is only valid on the supervisors board'; end if;
    v_col := 'a';
  elsif p_source_key = 'supervisor' then
    if v_board <> 'members' or v_role = 'admin' then raise exception 'source "supervisor" is only valid for members-board non-admins'; end if;
    v_col := 'a';
  else -- 'admin'
    if v_role = 'admin' then raise exception 'source "admin" is not valid for the admin (use members/management)'; end if;
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

-- ---------- 5. Integrity helper: rebuild cached totals from history ----------
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
        (h.source_key = 'supervisor' and p.board = 'members' and p.role <> 'admin') or
        (h.source_key = 'leader' and p.board = 'supervisors') or
        (h.source_key = 'members' and p.role = 'admin'))), 0),
    points_b = coalesce((select sum(h.points_change) from public.points_history h
      where h.person_id = p.id and (
        (h.source_key = 'admin' and p.role <> 'admin') or
        (h.source_key = 'management' and p.role = 'admin'))), 0);
  get diagnostics r = row_count;
  return r;
end $$;

-- ---------- 6. Lock down RPC: owner-only execution ----------
revoke all on function public.add_points(uuid, text, integer, text) from public, anon, authenticated;
do $$
begin
  revoke all on function public.rebuild_person_points() from public, anon, authenticated;
  revoke all on function public.touch_updated_at() from public, anon, authenticated;
exception when undefined_function then null;
end $$;

-- ---------- 7. RLS: public read-only ----------
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

-- ---------- 7b. API grants (read-only) ----------
-- RLS policies alone are NOT enough: PostgREST also requires schema USAGE
-- and table-level SELECT grants, or every request fails with
-- 401 / 42501 "permission denied for schema public". These grants give
-- anon/authenticated read access only — RLS still governs every row, and
-- with no write policies, all writes stay denied.
grant usage on schema public to anon, authenticated;
grant select on public.people to anon, authenticated;
grant select on public.points_history to anon, authenticated;

-- ---------- 8. Realtime ----------
do $$
begin
  begin
    alter publication supabase_realtime add table public.people;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.points_history;
  exception when duplicate_object then null; end;
end $$;

-- ---------- 9. Seed: EXACTLY the 20 required people, all points at 0 ----------
insert into public.people (name, role, board, avatar_color) values
  ('Islam',               'leader', 'members',     '#f59e0b'),
  ('Ahmed Sameh',         'admin',  'members',     '#6366f1'),
  ('Ahmed Mohamed',       'member', 'members',     '#0ea5e9'),
  ('Thomas',              'member', 'members',     '#10b981'),
  ('Jana',                'member', 'members',     '#ec4899'),
  ('Habiba',              'member', 'members',     '#8b5cf6'),
  ('Khaled',              'member', 'members',     '#14b8a6'),
  ('Zahra',               'member', 'members',     '#f43f5e'),
  ('Abdel Rahman',        'member', 'supervisors', '#0ea5e9'),
  ('Fayrouz',             'member', 'members',     '#f59e0b'),
  ('Mohamed Ahmed',       'member', 'members',     '#6366f1'),
  ('Mohamed Ashraf',      'member', 'members',     '#10b981'),
  ('Mohamed El Desouky',  'member', 'supervisors', '#f59e0b'),
  ('Mohamed Sayed Hassan','member', 'members',     '#14b8a6'),
  ('Mohamed Sayed Saleh', 'member', 'members',     '#8b5cf6'),
  ('Mohamed Nady',        'member', 'members',     '#ec4899'),
  ('Mohreal',             'member', 'members',     '#0ea5e9'),
  ('Youssef',             'member', 'members',     '#10b981'),
  ('Eman',                'member', 'supervisors', '#ec4899'),
  ('Basant',              'leader', 'supervisors', '#f59e0b');

-- ---------- 10. Verification (read the output!) ----------
-- Expect: total_people = 20
select count(*) as total_people from public.people;
-- Expect: members = 16, supervisors = 4
select board, count(*) as n from public.people group by board order by board;
-- Expect: admin = 1, leader = 2, member = 17
select role, count(*) as n from public.people group by role order by role;
-- Expect: 20 rows below, in these boards/roles
select name, role, board, points_a, points_b from public.people order by board, name;
