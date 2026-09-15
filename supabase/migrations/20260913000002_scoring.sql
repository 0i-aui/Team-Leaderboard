-- ============================================================
-- 0002_scoring.sql — Team Leaderboard scoring logic
-- add_points() (the ONLY correct way to change points) plus the
-- rebuild integrity helper. Tables live in 0001, access control in 0003.
-- ============================================================
-- Scoring model (enforced here, in the database — never in React):
--  * normal members / supervisors / leaders ... source 'admin' ONLY,
--    max 100 gross positive points per week, all into points_a.
--  * ADMIN-marked people (historical — no active member currently
--    carries the mark; branches kept so old audit rows still
--    rebuild correctly) .................. 'members' → points_a
--    (max 50/week) and 'management' → points_b (max 50/week),
--    combined max 100/week.
--  * Week = Monday 00:00 → Sunday 23:59, computed SERVER-side as
--    date_trunc('week', now()) in the database timezone. The browser
--    clock is never trusted for enforcement.
--  * Caps count GROSS positive gains per week, so deductions can never
--    launder headroom (add 100, deduct 50, add 50 more is rejected).
--  * Deductions (negative points) are explicitly supported: allowed
--    while the grand total stays >= 0, never notify, never count
--    toward caps.
-- Race safety: the person's row is locked FOR UPDATE first, so two
-- concurrent calls serialize — the second re-reads fresh weekly sums
-- after the first commits. 90 + 10 + 10 can never become 110.
-- ============================================================

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
  v_week date := (date_trunc('week', now()))::date;
  v_gain integer;
  v_total_gain integer;
  v_prev integer;
  v_new integer;
  v_hist_id uuid;
begin
  if p_source_key not in ('admin', 'members', 'management') then
    raise exception 'invalid source_key: %', p_source_key;
  end if;
  if p_points is null or p_points = 0 then
    raise exception 'points must be a non-zero integer (use negative to deduct)';
  end if;

  -- Lock the row first: serializes concurrent scoring for this person.
  select roles into v_roles
  from public.people where id = p_person_id for update;
  if not found then
    raise exception 'person not found: %', p_person_id;
  end if;
  v_is_admin := 'admin' = any (v_roles);

  -- Source must fit this person (no spoofing, no role-derived bypass).
  if v_is_admin then
    if p_source_key not in ('members', 'management') then
      raise exception 'source "%" is not valid for the admin (use members/management)', p_source_key;
    end if;
  else
    if p_source_key <> 'admin' then
      raise exception 'source "%" is not valid for this person (only "admin" awards weekly points)', p_source_key;
    end if;
  end if;

  -- Weekly caps, accounted server-side from the audit log itself.
  if p_points > 0 then
    if v_is_admin then
      select coalesce(sum(points_change), 0) into v_gain
      from public.points_history
      where person_id = p_person_id and source_key = p_source_key
        and week_start = v_week and points_change > 0;
      if v_gain + p_points > 50 then
        raise exception 'weekly limit exceeded: "%" allows max 50/week (already % this week)', p_source_key, v_gain;
      end if;
      select coalesce(sum(points_change), 0) into v_total_gain
      from public.points_history
      where person_id = p_person_id
        and week_start = v_week and points_change > 0;
      if v_total_gain + p_points > 100 then
        raise exception 'weekly limit exceeded: total allows max 100/week (already % this week)', v_total_gain;
      end if;
    else
      select coalesce(sum(points_change), 0) into v_gain
      from public.points_history
      where person_id = p_person_id
        and week_start = v_week and points_change > 0;
      if v_gain + p_points > 100 then
        raise exception 'weekly limit exceeded: Admin allows max 100/week (already % this week)', v_gain;
      end if;
    end if;
  end if;

  select (points_a + points_b) into v_prev
  from public.people where id = p_person_id;

  v_new := v_prev + p_points;
  if v_new < 0 then
    raise exception 'insufficient points: current %, change %', v_prev, p_points;
  end if;

  -- Bucket update + history insert happen atomically in this transaction.
  if p_source_key = 'management' then
    update public.people set points_b = points_b + p_points where id = p_person_id;
  else
    -- 'admin' (normal members) and 'members' (historical ADMIN mark) → points_a.
    update public.people set points_a = points_a + p_points where id = p_person_id;
  end if;

  insert into public.points_history
    (person_id, source_key, points_change, previous_total, new_total, week_start, reason)
  values
    (p_person_id, p_source_key, p_points, v_prev, v_new, v_week,
     nullif(trim(coalesce(p_reason, '')), ''))
  returning id into v_hist_id;

  return v_hist_id;
end $$;

-- ---------- Integrity helper: rebuild cached buckets from history ----------
-- Re-derives points_a/points_b purely from the audit log under the
-- canonical bucket mapping. Owner-only (see 0003).
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
        (h.source_key = 'admin' and not ('admin' = any (p.roles))) or
        (h.source_key = 'members' and 'admin' = any (p.roles)))), 0),
    points_b = coalesce((select sum(h.points_change) from public.points_history h
      where h.person_id = p.id and h.source_key = 'management'
        and 'admin' = any (p.roles)), 0);
  get diagnostics r = row_count;
  return r;
end $$;
