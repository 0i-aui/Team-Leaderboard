-- ============================================================
-- 0003_access.sql — Team Leaderboard access control
-- RLS policies, PostgREST grants, and push-subscription RPCs.
-- Security model:
--  * The public frontend is READ-ONLY (anon key). It SELECTs people,
--    points_history, and scoring_resets — nothing else.
--  * points/ranks/history are managed via SQL Editor / service_role,
--    which bypass RLS. add_points()/rebuild_person_points() are
--    revoked from anon/authenticated (defense in depth: even if a
--    grant slipped, there is no public write path through them).
--  * push_subscriptions/push_log are SENSITIVE and RPC-only: RLS is
--    enabled with NO policies for anon/authenticated (all direct
--    access denied, reads included). The two functions below run as
--    SECURITY DEFINER with fixed search_path and are the only public
--    entry points — granted to anon/authenticated because the
--    frontend bell calls them directly (no login exists).
--  * No VAPID/service/webhook secrets live anywhere in SQL.
-- ============================================================

-- ---------- RLS: public read-only tables ----------
alter table public.people enable row level security;
alter table public.points_history enable row level security;
alter table public.scoring_resets enable row level security;

drop policy if exists "public read people" on public.people;
drop policy if exists "public read points_history" on public.points_history;
drop policy if exists "public read scoring_resets" on public.scoring_resets;

create policy "public read people"
  on public.people for select to anon, authenticated using (true);

create policy "public read points_history"
  on public.points_history for select to anon, authenticated using (true);

create policy "public read scoring_resets"
  on public.scoring_resets for select to anon, authenticated using (true);

-- NOTE: no INSERT / UPDATE / DELETE policies for anon/authenticated
-- on any table, so the frontend (anon key) cannot write anything.

-- ---------- RLS: sensitive push tables (RPC-only, deny everything) ----------
alter table public.push_subscriptions enable row level security;
alter table public.push_log enable row level security;
-- Intentionally NO policies: every direct anon/authenticated access
-- (SELECT included) is denied. service_role and SECURITY DEFINER
-- functions bypass RLS — those are the only legitimate paths.

-- ---------- Push-subscription RPCs (called by the frontend bell) ----------
-- One row per browser endpoint (upsert); each device keeps its own row.
-- Per-person cap prunes the oldest rows past 10 active subscriptions so
-- one member's list can never grow without bound.
create or replace function public.register_push_subscription(
  p_person_id uuid,
  p_endpoint text,
  p_p256dh text,
  p_auth text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_endpoint is null or char_length(trim(p_endpoint)) = 0 then
    raise exception 'endpoint is required';
  end if;
  if p_p256dh is null or p_auth is null
     or char_length(trim(p_p256dh)) = 0 or char_length(trim(p_auth)) = 0 then
    raise exception 'subscription keys are required';
  end if;
  if not exists (select 1 from public.people where id = p_person_id) then
    raise exception 'person not found: %', p_person_id;
  end if;

  insert into public.push_subscriptions (person_id, endpoint, p256dh, auth, is_active)
  values (p_person_id, trim(p_endpoint), p_p256dh, p_auth, true)
  on conflict (endpoint) do update set
    person_id = excluded.person_id,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    is_active = true,
    updated_at = now()
  returning id into v_id;

  -- Per-person cap: keep the 10 most recently updated active rows.
  delete from public.push_subscriptions s using (
    select id from public.push_subscriptions
    where person_id = p_person_id and is_active = true
    order by updated_at desc, created_at desc
    offset 10
  ) old
  where s.id = old.id;

  return v_id;
end $$;

create or replace function public.unregister_push_subscription(
  p_person_id uuid,
  p_endpoint text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare n integer := 0;
begin
  update public.push_subscriptions
  set is_active = false, updated_at = now()
  where person_id = p_person_id and endpoint = p_endpoint and is_active = true;
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- ---------- Lock down scoring RPCs: owner-only execution ----------
revoke all on function public.add_points(uuid, text, integer, text) from public, anon, authenticated;
do $$
begin
  revoke all on function public.rebuild_person_points() from public, anon, authenticated;
  revoke all on function public.touch_updated_at() from public, anon, authenticated;
exception when undefined_function then null;
end $$;

-- ---------- API grants ----------
-- RLS policies alone are NOT enough: PostgREST also requires schema USAGE
-- and table-level SELECT grants, or reads fail with 401/42501. Read-only.
grant usage on schema public to anon, authenticated;
grant select on public.people to anon, authenticated;
grant select on public.points_history to anon, authenticated;
grant select on public.scoring_resets to anon, authenticated;

-- Push RPCs are the ONLY functions the public frontend may execute.
grant execute on function public.register_push_subscription(uuid, text, text, text) to anon, authenticated;
grant execute on function public.unregister_push_subscription(uuid, text) to anon, authenticated;
