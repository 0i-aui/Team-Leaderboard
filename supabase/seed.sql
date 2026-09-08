-- ============================================================
-- Team Leaderboard — Seed: the 20 required people (all points 0)
-- Run AFTER schema.sql on a FRESH database.
-- ============================================================
-- ONE leaderboard, all 20 people. Roles are additive marks
-- (empty = MEMBER). Caps in the schema reject any 21st person
-- and any second admin automatically.
--  * Ahmed Sameh ......... {admin, mod}
--  * Eman ................ {supervisor, leader}
--  * Jana, Abdel Rahman,
--    Mohamed El Desouky .. {supervisor}
--  * Basant .............. {leader}
--  * everyone else ....... {} (displayed MEMBER)

insert into public.people (name, roles, avatar_color) values
  ('Islam',                '{leader}',             '#f59e0b'),
  ('Ahmed Sameh',          '{admin,mod}',          '#6366f1'),
  ('Ahmed Mohamed',        '{}',                   '#0ea5e9'),
  ('Thomas',               '{}',                   '#10b981'),
  ('Jana',                 '{supervisor}',         '#ec4899'),
  ('Habiba',               '{}',                   '#8b5cf6'),
  ('Khaled',               '{}',                   '#14b8a6'),
  ('Zahra',                '{}',                   '#f43f5e'),
  ('Abdel Rahman',         '{supervisor}',         '#0ea5e9'),
  ('Fayrouz',              '{}',                   '#f59e0b'),
  ('Mohamed Ahmed',        '{}',                   '#6366f1'),
  ('Mohamed Ashraf',       '{}',                   '#10b981'),
  ('Mohamed El Desouky',   '{supervisor}',         '#f59e0b'),
  ('Mohamed Sayed Hassan', '{}',                   '#14b8a6'),
  ('Mohamed Sayed Saleh',  '{}',                   '#8b5cf6'),
  ('Mohamed Nady',         '{}',                   '#ec4899'),
  ('Mohreal',              '{}',                   '#0ea5e9'),
  ('Youssef',              '{}',                   '#10b981'),
  ('Eman',                 '{supervisor,leader}',  '#ec4899'),
  ('Basant',               '{leader}',             '#f59e0b');

-- Verification (expect 20 people; 1 admin; Eman with both marks):
select count(*) as total_people from public.people;
select name, roles, points_a, points_b from public.people order by name;
