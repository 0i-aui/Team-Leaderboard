-- ============================================================
-- Team Leaderboard — seed.sql (DEVELOPMENT DATA ONLY)
-- Applied automatically after `supabase db reset` (migrations first).
-- Inserts the 19 active members with teams, roles, display aliases, and
-- a clean zero point state. No schema, functions, policies, secrets,
-- and no First Week point transactions (added separately later).
-- ============================================================
-- Roles (additive marks, empty = MEMBER):
--  * Eman ................ {supervisor, leader}
--  * Islam, Basant ....... {leader}
--  * Jana, Khaled,
--    Mohamed Ashraf ...... {supervisor}
--  * everyone else ....... {} — incl. Habiba, Mohreal,
--    Mohamed Sayed Hassan, Abdel Rahman and
--    Mohamed El Desouky (MEMBER only)
-- Teams: exactly 10 in A, 9 in B (enforced by this list; the
-- `team` column itself guarantees one-team-per-member).
-- Aliases: canonical `name` never changes; `nickname_*` are display
-- only (Turkey/تركي, Don't Care/دونت كير). `name_ar` covers all 19.
-- Ahmed Sameh is NOT an active member (deleted — see migration
-- 20260915000004). No replacement was created; his points were not
-- transferred. Historical audit note: `points_history.person_id`
-- references `people(id)` ON DELETE CASCADE, so deleting the member
-- row removes their audit rows with it; in this experimental/reset
-- state all balances are 0 and no meaningful history exists.

insert into public.people (name, team, roles, name_ar, nickname_en, nickname_ar, avatar_color) values
  ('Islam',                'B', '{leader}',            'إسلام',          null,        null,        '#f59e0b'),
  ('Ahmed Mohamed',        'B', '{}',                  'أحمد محمد',      null,        null,        '#0ea5e9'),
  ('Thomas',               'B', '{}',                  'توماس',          null,        null,        '#10b981'),
  ('Jana',                 'A', '{supervisor}',        'جنى',            null,        null,        '#ec4899'),
  ('Habiba',               'A', '{}',                  'حبيبة',          null,        null,        '#8b5cf6'),
  ('Khaled',               'B', '{supervisor}',        'خالد',           null,        null,        '#14b8a6'),
  ('Zahra',                'A', '{}',                  'زهرة',           null,        null,        '#f43f5e'),
  ('Abdel Rahman',         'A', '{}',                  'عبد الرحمن',     null,        null,        '#0ea5e9'),
  ('Fayrouz',              'A', '{}',                  'فيروز',          null,        null,        '#f59e0b'),
  ('Mohamed Ahmed',        'B', '{}',                  'محمد أحمد',      null,        null,        '#6366f1'),
  ('Mohamed Ashraf',       'B', '{supervisor}',        'محمد أشرف',      null,        null,        '#10b981'),
  ('Mohamed El Desouky',   'A', '{}',                  'محمد الدسوقي',   'Turkey',    'تركي',      '#f59e0b'),
  ('Mohamed Sayed Hassan', 'A', '{}',                  'محمد سيد حسن',   'Don''t Care','دونت كير', '#14b8a6'),
  ('Mohamed Sayed Saleh',  'B', '{}',                  'محمد سيد صالح',  null,        null,        '#8b5cf6'),
  ('Mohamed Nady',         'B', '{}',                  'محمد نادي',      null,        null,        '#ec4899'),
  ('Mohreal',              'A', '{}',                  'مهرائيل',        null,        null,        '#0ea5e9'),
  ('Youssef',              'B', '{}',                  'يوسف',           null,        null,        '#10b981'),
  ('Eman',                 'A', '{supervisor,leader}', 'إيمان',          null,        null,        '#ec4899'),
  ('Basant',               'A', '{leader}',            'بسنت',           null,        null,        '#f59e0b');

-- Verification (expect 19 people · 10 in A · 9 in B · all points 0):
select count(*) as total_people from public.people;
select team, count(*) as n from public.people group by team order by team;
select count(*) as nonzero_balances from public.people where points_a <> 0 or points_b <> 0;
select name, team, roles from public.people order by team, name;
