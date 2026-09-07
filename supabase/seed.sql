-- ============================================================
-- Team Leaderboard — Seed: the 20 required people (all points 0)
-- Run AFTER schema.sql on a FRESH database.
-- (migration_v2.sql already includes this seed — do not run both.)
-- ============================================================
-- Boards: 16 members + 4 supervisors (Eman, Basant,
-- Abdel Rahman, Mohamed El Desouky). Roles: 1 admin
-- (Ahmed Sameh), 2 leaders (Islam, Basant), 17 members.
-- Caps in the schema reject any 21st person automatically.

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

-- Verification (expect 20 / 16+4 / 1+2+17):
select count(*) as total_people from public.people;
select board, count(*) as n from public.people group by board order by board;
select role, count(*) as n from public.people group by role order by role;
