# Team Leaderboard — Setup & Operations Guide (v2)

Private, read-only public leaderboard. No login, no signup, no admin panel.
You manage everything from the Supabase dashboard. The website only READS.

Architecture in one line:
`points_history` is the append-only audit log (source of truth) ·
`people.points_a / points_b` are cached totals ·
`add_points()` RPC updates both atomically + validates the source fits the person ·
RLS makes anon read-only · triggers cap the system at 20 people / 4 supervisors / 1 admin.

Point labels are DERIVED from `(role, board)` — never stored, never duplicated:

| Person | points_a | points_b | Total |
|---|---|---|---|
| Ahmed Sameh (admin) | Members | Management | Members + Management |
| Supervisors board (Eman, Basant, Abdel Rahman, Mohamed El Desouky) | Leaders | Admin | Leaders + Admin |
| Everyone else (members board) | Supervisors | Admin | Supervisors + Admin |

Roles: `ADMIN` = Ahmed Sameh · `LEADER` = Islam, Basant · `MEMBER` = everyone else.
Board placement ≠ role: Basant is LEADER on the supervisors board; Eman, Abdel Rahman,
Mohamed El Desouky are MEMBER role on the supervisors board.

Zones are computed live from rank (never stored, never hardcoded):
members board rank 1–10 = SAFE, 11+ = RED · supervisors board rank 1–3 = SAFE, 4+ = RED.

---

## Step 1 — Create the Supabase project

1. Go to https://supabase.com → New project.
2. Name it `team-leaderboard`, pick a region near your users, set a DB password.
3. Wait until the project is ready.
4. Go to **Project Settings → API** and copy:
   - `Project URL` → this is `VITE_SUPABASE_URL`
   - `anon public` key → this is `VITE_SUPABASE_ANON_KEY`
   - ⚠️ NEVER copy the `service_role` key into the frontend.

## Step 2 — Run the migration (existing v1 database) OR schema (fresh)

- **You have the old tables** (members/supervisors with بندق…): run
  **`supabase/migration_v2.sql`** in **SQL Editor**. It drops the old model,
  recreates everything, seeds exactly the 20 required people (all points 0),
  and ends with verification queries — confirm `total_people = 20`,
  boards `16 + 4`, roles `1 + 2 + 17`.
- **Fresh project:** run **`supabase/schema.sql`**, then **`supabase/seed.sql`**
  (same 20 people).

## Step 3 — Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` (local only, gitignored — never commit real values):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

Only these two variables exist. There is intentionally NO
`SUPABASE_SERVICE_ROLE_KEY` in this project.
Run locally with `npm install && npm run dev`.

## Step 4 — The 20 people (already seeded, all points 0)

**Supervisors board (4):** Eman (member), Basant (leader),
Abdel Rahman (member), Mohamed El Desouky (member).
**Members board (16):** Islam (leader), Ahmed Sameh (admin),
Ahmed Mohamed, Thomas, Jana, Habiba, Khaled, Zahra, Fayrouz,
Mohamed Ahmed, Mohamed Ashraf, Mohamed Sayed Hassan,
Mohamed Sayed Saleh, Mohamed Nady, Mohreal, Youssef.

The database refuses a 21st person, a 5th supervisor, a 2nd admin,
and any duplicate name (case-insensitive) — all enforced by triggers/indexes.

## Step 5 — How to rename someone

**Table Editor → people** → edit `name` → Save. History points at the same
`person_id`, so past records automatically show the new name. To change
role/board, edit those cells — the supervisor cap and admin uniqueness
are enforced even on edits.

## Step 6 — How to add points (the ONLY correct way)

NEVER edit `points_a` / `points_b` cells by hand — that bypasses history.
Use the atomic `add_points()` RPC in **SQL Editor**, which validates that
the source fits the person (e.g. `leader` is rejected for members-board
people, `management` is rejected for non-admins):

```sql
-- Member: Supervisors or Admin source
select public.add_points((select id from people where name='Jana'), 'supervisor', 20, 'Great work');
select public.add_points((select id from people where name='Jana'), 'admin', 15, 'Task done');

-- Supervisors board: Leader or Admin source
select public.add_points((select id from people where name='Eman'), 'leader', 15, 'Top review');
select public.add_points((select id from people where name='Basant'), 'admin', 10, 'Bonus');

-- Ahmed Sameh (admin): Members or Management source
select public.add_points((select id from people where name='Ahmed Sameh'), 'members', 20, 'Team effort');
select public.add_points((select id from people where name='Ahmed Sameh'), 'management', 10, 'Decision');

-- Deduct (negative):
select public.add_points((select id from people where name='Khaled'), 'supervisor', -5, 'Late submission');
```

Each call: locks the row → validates source → reads current → computes new →
updates `people` → inserts into `points_history` → all atomically.
The website updates live via Realtime (no refresh needed), ranks and
Safe/Red zones recalculate automatically.

## Step 7 — Cheat sheet

| Task | SQL |
|---|---|
| Find a person id | `select id, name, role, board, points_a, points_b from people order by name;` |
| Inspect history | `select * from points_history order by created_at desc limit 50;` |
| History for one person | `select * from points_history where person_id='<id>' order by created_at desc;` |
| Repair drift | `select rebuild_person_points();` |
| Verify counts | `select count(*) from people;` → 20 |

## Step 8 — Zones (automatic, nothing to configure)

- Members board: ranks 1–10 show SAFE ZONE, rank 11+ shows RED ZONE.
- Supervisors board: ranks 1–3 SAFE, rank 4+ RED.
- Someone moving #11 → #10 flips RED → SAFE on the next Realtime refresh.
- Zone = icon + text label + divider + subtle tint (never color alone).

## Step 9 — Deleting (avoid it)

The system is fixed at 20 people — there is no normal reason to delete.
If you must: **Table Editor → people → Delete** cascades their history
(the ONLY case where history disappears). The caps then allow re-adding
up to the limits.

## Step 10 — Deploy to Vercel

1. Push this folder to GitHub.
2. https://vercel.com → **Add New → Project → Import** the repo.
3. Framework preset: **Vite**. Build command: `npm run build`. Output: `dist`.
4. In **Environment Variables** add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. **Deploy.** Every push to `main` redeploys automatically.

---

## Security notes

- RLS is enabled on both tables with SELECT-only policies for
  `anon`/`authenticated`. No INSERT/UPDATE/DELETE policies exist for them.
- `EXECUTE` on all RPCs is revoked from `public`/`anon`/`authenticated`
  (the site never calls them — it only SELECTs). Re-running
  `schema.sql`/`migration_v2.sql` re-applies the revocation.
- Table Editor and `service_role` bypass RLS — that is how YOU write.
- Verify read-only yourself:
  1. **Authentication → Policies** — each table shows only a SELECT policy.
  2. In the browser console on the live site, `supabase.rpc('add_points', …)`
     must FAIL (function not exposed to anon).
  3. A direct REST `POST /rest/v1/people` with the anon key must return 401/403.
- Raw database errors are never shown to visitors (generic message + console log).
- Vercel serves `nosniff`, `DENY` framing, strict referrer policy, and a CSP
  allowing only self + Google Fonts + your Supabase project (`*.supabase.co`).

## Troubleshooting

**Site shows the error state / console shows `401` + `42501 permission denied
for schema public`:** the `anon` role is missing schema/table grants (RLS
policies alone are not enough for PostgREST). Run this in SQL Editor:

```sql
grant usage on schema public to anon, authenticated;
grant select on public.people to anon, authenticated;
grant select on public.points_history to anon, authenticated;
```

This is read-only — it does not weaken RLS or allow any writes.

## Verification checklist

- [x] Exactly 20 unique people, no old names, no duplicates (DB-enforced)
- [x] 4 on supervisors board, 16 on members board
- [x] Ahmed Sameh ADMIN (Members + Management), gold treatment
- [x] Islam + Basant LEADER (Supervisors + Admin for both)
- [x] Everyone else MEMBER; supervisor-board non-leaders stay MEMBER
- [x] Supervisors-board people use Leaders + Admin labels (never "Supervisor Points")
- [x] Zones rank-derived: members 1–10 safe / 11+ red, supervisors 1–3 safe / 4+ red
- [x] History records every transaction with per-type sources; filters for all 5
- [x] Supabase is the source of truth; zero hardcoded people in the frontend
- [x] No auth, no accounts, no unrelated breakage (`tsc` + `vite build` clean)
