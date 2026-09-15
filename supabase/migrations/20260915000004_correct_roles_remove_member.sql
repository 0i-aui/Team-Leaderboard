-- ============================================================
-- 20260915000004_correct_roles_remove_member.sql
-- Correction pass: definitive 19-member roster.
--  * Deletes Ahmed Sameh from the ACTIVE roster (no replacement,
--    no point transfer — all balances are 0 in reset state).
--  * Corrects roles to the definitive matrix:
--      leader ............ Islam, Basant
--      supervisor+leader . Eman
--      supervisor ........ Jana, Khaled, Mohamed Ashraf
--      member ............ everyone else active
--    (Habiba, Mohreal and Mohamed Sayed Hassan are MEMBER-only;
--    Islam is LEADER.)
--  * Tightens the people cap 20 → 19 to match the roster.
-- Audit note: `points_history.person_id` references `people(id)`
-- ON DELETE CASCADE, so the deleted member's audit rows go with the
-- row. This is the reset/experimental state (all points 0, no
-- meaningful history), so no audit information of value is lost;
-- the active leaderboard must not show the deleted member.
-- Applied with `supabase db reset` (fresh) or `supabase migration up`
-- (existing DBs). This file itself performs NO remote operation.
-- ============================================================

-- 1) Definitive role matrix (idempotent, matched by canonical name).
update public.people set roles = '{leader}' where name = 'Islam';
update public.people set roles = '{supervisor,leader}' where name = 'Eman';
update public.people set roles = '{supervisor}' where name in ('Jana', 'Khaled', 'Mohamed Ashraf');
update public.people set roles = '{leader}' where name = 'Basant';
update public.people set roles = '{}' where name in (
  'Ahmed Mohamed', 'Thomas', 'Habiba', 'Zahra', 'Abdel Rahman',
  'Fayrouz', 'Mohamed Ahmed', 'Mohamed El Desouky',
  'Mohamed Sayed Hassan', 'Mohamed Sayed Saleh', 'Mohamed Nady',
  'Mohreal', 'Youssef'
);

-- 2) Remove Ahmed Sameh from the active roster. Cascades to their
-- points_history / push rows (see audit note above). No replacement
-- row is created and no points are moved (all balances are 0).
delete from public.people where name = 'Ahmed Sameh';

-- 3) Cap matches the 19-member roster (10 in A, 9 in B).
create or replace function public.enforce_people_cap()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.people) >= 19 then
    raise exception 'Maximum 19 people allowed in the leaderboard';
  end if;
  return new;
end $$;

-- 4) Verification (expect 19 · A=10 · B=9 · supervisors=4 · leaders=3):
-- select count(*) as total from public.people;
-- select team, count(*) from public.people group by team order by team;
-- select name, roles from public.people where 'supervisor' = any (roles) order by name;
-- select name, roles from public.people where 'leader' = any (roles) order by name;
-- select count(*) as ahmed_sameh_rows from public.people where name = 'Ahmed Sameh';
