# Team Leaderboard — Setup & Operations Guide (v4)

Private, read-only public leaderboard. No login, no signup, no admin panel.
You manage everything from the Supabase dashboard. The website only READS.

Architecture in one line:
`points_history` is the append-only audit log (source of truth) ·
`people.points_a / points_b` are cached buckets ·
`add_points()` RPC updates both atomically + validates source + enforces weekly caps ·
RLS makes anon read-only · triggers cap the system at 20 people / 1 admin.

**Repository SQL is the source of truth.** The database is built from
`supabase/migrations/` (ordered, reproducible) plus `supabase/seed.sql`
(data only). Never hand-edit the remote database and leave it
undocumented — if the schema must change, add a migration and re-run
`supabase db reset` locally first.

Two team leaderboards (Team A / Team B, 10 members each, membership in
`people.team`), each ranked 1–10 separately. Roles are ADDITIVE marks
stored in `people.roles` (empty = regular member) — never stored twice,
never derived from names:

| Marks | points_a | points_b | Total |
|---|---|---|---|
| ADMIN (Ahmed Sameh) | Members | Management | Members + Management |
| everyone else (MEMBER / SUPERVISOR / LEADER) | Admin | — | Admin |

Weekly scoring comes from Admin for everyone except Ahmed Sameh, whose
points split into Members (max 50/week) + Management (max 50/week),
total max 100/week. Normal members: Admin max 100/week. Caps are
enforced inside `add_points()` against a server-computed Monday week —
never in the frontend.

Final marks: Ahmed Sameh = ADMIN + MOD · Eman = SUPERVISOR + LEADER ·
Jana, Habiba, Mohreal, Mohamed Sayed Hassan, Khaled, Mohamed Ashraf =
SUPERVISOR · Basant = LEADER · everyone else = MEMBER (shown
automatically when no other marks exist).

Zones are computed live from each member's rank inside their own team
(never stored, never hardcoded):
rank 1–5 = SAFE, rank 6–10 = RED.

---

## Step 1 — Create the Supabase project

1. Go to https://supabase.com → New project.
2. Name it `team-leaderboard`, pick a region near your users, set a DB password.
3. Wait until the project is ready.
4. Go to **Project Settings → API** and copy:
   - `Project URL` → this is `VITE_SUPABASE_URL`
   - `anon public` key → this is `VITE_SUPABASE_ANON_KEY`
   - ⚠️ NEVER copy the `service_role` key into the frontend.

## Step 2 — Database setup

The database is reproducible from the repository — no manual SQL Editor
steps required:

```bash
supabase db reset   # builds from supabase/migrations/, then runs supabase/seed.sql
```

- `supabase/migrations/0001_core_schema.sql` — tables, indexes, triggers
- `supabase/migrations/0002_scoring.sql` — `add_points()`, rebuild helper
- `supabase/migrations/0003_access.sql` — RLS, grants, push-subscription RPCs
- `supabase/seed.sql` — development data only: the 20 people (teams,
  roles, display aliases, zero points). No schema, no secrets, no
  First Week points.

Schema changes always go through a new migration file — never through
undocumented remote edits (that causes migration drift).

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

Team A (10): Eman (`{supervisor,leader}`), Jana, Habiba, Mohreal,
Mohamed Sayed Hassan (`{supervisor}`), Zahra, Fayrouz, Basant
(`{leader}`), Mohamed El Desouky, Abdel Rahman (all `{}` = MEMBER
unless marked).
Team B (10): Mohamed Ashraf, Khaled (`{supervisor}`), Thomas,
Mohamed Ahmed, Mohamed Sayed Saleh, Mohamed Nady, Youssef, Islam,
Ahmed Mohamed (all MEMBER), Ahmed Sameh (`{admin,mod}`).

The database refuses a 21st person, a 2nd admin, an invalid mark,
an invalid team, and any duplicate name (case-insensitive) — all
enforced by constraints/indexes.

## Step 5 — How to rename someone

**Table Editor → people** → edit `name` → Save. History points at the same
`person_id`, so past records automatically show the new name. To change
marks, edit the `roles` array (e.g. `{supervisor,leader}`) — invalid marks
and a second admin are rejected automatically.

## Step 6 — How to add points (the ONLY correct way)

NEVER edit `points_a` / `points_b` cells by hand — that bypasses history.
Use the atomic `add_points()` RPC in **SQL Editor**. The database (not
the UI) validates the source, computes the Monday week server-side, and
enforces caps — concurrent calls serialize on the person's row lock, so
limits cannot be raced:

```sql
-- Normal member/supervisor/leader: Admin source only (max 100/week)
select public.add_points((select id from people where name='Thomas'), 'admin', 20, 'Great work');

-- Ahmed Sameh (ADMIN mark): Members (max 50/week) or Management (max 50/week)
select public.add_points((select id from people where name='Ahmed Sameh'), 'members', 20, 'Team effort');
select public.add_points((select id from people where name='Ahmed Sameh'), 'management', 10, 'Decision');

-- Deduct (negative, explicitly supported; floor is 0, never notifies):
select public.add_points((select id from people where name='Khaled'), 'admin', -5, 'Late submission');
```

Any other source (e.g. `supervisor`, `leader`) is rejected, as is
anything that would exceed the weekly cap. Each call: locks the row →
validates source → checks the weekly cap from the audit log → reads the
grand total → computes new → updates the bucket → inserts history with
previous/new grand totals and the week identifier → all atomically.
The website updates live via Realtime (no refresh needed); ranks, zones,
and movement recalculate automatically.

## Step 7 — Cheat sheet

| Task | SQL |
|---|---|
| Find a person id | `select id, name, team, roles, points_a, points_b from people order by name;` |
| Inspect history | `select * from points_history order by created_at desc limit 50;` |
| History for one person | `select * from points_history where person_id='<id>' order by created_at desc;` |
| This week's gains | `select person_id, sum(points_change) from points_history where week_start = date_trunc('week', now())::date and points_change > 0 group by person_id;` |
| Repair drift | `select rebuild_person_points();` |
| Verify counts | `select count(*) from people;` → 20 |

## Step 8 — Zones (automatic, nothing to configure)

- Each team ranks its own 10 members 1–10: ranks 1–5 show SAFE ZONE,
  ranks 6–10 show RED ZONE.
- Someone moving #6 → #5 flips RED → SAFE on the next Realtime refresh.
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

- RLS is enabled on all tables. `people`, `points_history`, and
  `scoring_resets` have SELECT-only policies for `anon`/`authenticated`;
  no INSERT/UPDATE/DELETE policies exist for them anywhere.
- `push_subscriptions` and `push_log` have RLS enabled with NO policies
  at all — every direct access (reads included) is denied. Only the
  `register/unregister_push_subscription()` RPCs (SECURITY DEFINER,
  the only functions granted to anon) and `service_role` can touch them.
- `EXECUTE` on `add_points()` / `rebuild_person_points()` is revoked from
  `public`/`anon`/`authenticated` (the site never calls them — it only
  SELECTs, plus the two push RPCs). Re-running the migrations
  re-applies the revocation.
- Table Editor and `service_role` bypass RLS — that is how YOU write.
- Verify read-only yourself:
  1. **Authentication → Policies** — `people`/`points_history`/
     `scoring_resets` show only a SELECT policy; push tables show none.
  2. In the browser console on the live site, `supabase.rpc('add_points', …)`
     must FAIL (function not exposed to anon).
  3. A direct REST `POST /rest/v1/people` with the anon key must return 401/403.
  4. A direct REST `GET /rest/v1/push_subscriptions` with the anon key
     must return 401/403 (RPC-only table).
- Raw database errors are never shown to visitors (generic message + console log).
- Vercel serves `nosniff`, `DENY` framing, strict referrer policy, and a CSP
  allowing only self + Google Fonts + your Supabase project (`*.supabase.co`).

## Step 11 — Web Push notifications (optional)

Team members can opt in (bell icon in the header → choose name → Enable)
to receive a "Weekly Points Updated" push on their devices whenever their
own points increase — even with the site closed. Sending is server-side
only; the frontend can never send pushes.

1. **Generate VAPID keys** (once, locally — `web-push` is already a dependency):
   `npx web-push generate-vapid-keys`
2. **Vercel → Project → Settings → Environment Variables** — add:
   - `SUPABASE_URL` = your project URL (server use only, no `VITE_` prefix)
   - `SUPABASE_SERVICE_ROLE_KEY` = service-role key (**server only — never in the frontend**)
   - `VAPID_PUBLIC_KEY` = public key from step 1
   - `VAPID_PRIVATE_KEY` = private key from step 1 (**server only**)
   - `PUSH_WEBHOOK_SECRET` = any long random string you invent (server only)
   Then redeploy so `api/notify-points` picks them up.
3. **Local `.env`** — add `VITE_VAPID_PUBLIC_KEY=<same public key>` so the
   browser can subscribe. (Only the public key belongs in `VITE_` variables.)
4. **Supabase → Database → Webhooks → Create a new hook:**
   - Name: `notify-points` · Table: `points_history` · Events: `Insert`
   - Type: `HTTP POST` · Method: `POST`
   - URL: `https://YOUR-DOMAIN.vercel.app/api/notify-points`
   - Add one HTTP Header: `x-push-secret` = your `PUSH_WEBHOOK_SECRET` value
   - Leave the rest default, then create and confirm one successful delivery
     after your next points update.
5. **Test:** on your phone, open the site → bell → select your name →
   Enable → add points for yourself via SQL → the push should arrive with
   your back in the notifications tray, even with the tab closed.

Notes: deductions never notify (additions only); repeat webhook deliveries
for the same history row are acknowledged without resending; dead
endpoints (404/410) are deactivated automatically on send.

## Troubleshooting

**Site shows the error state / console shows `401` + `42501 permission denied
for schema public`:** the `anon` role is missing schema/table grants (RLS
policies alone are not enough for PostgREST). Run this in SQL Editor:

```sql
grant usage on schema public to anon, authenticated;
grant select on public.people to anon, authenticated;
grant select on public.points_history to anon, authenticated;
grant select on public.scoring_resets to anon, authenticated;
```

This is read-only — it does not weaken RLS or allow any writes.

## Verification checklist

- [x] Exactly 20 unique people, no old names, no duplicates (DB-enforced)
- [x] Team A = 10, Team B = 10, membership stored in `people.team`
- [x] Ahmed Sameh ADMIN + MOD (Members max 50/week + Management max 50/week)
- [x] Eman SUPERVISOR + LEADER; Jana, Habiba, Mohreal, Mohamed Sayed Hassan, Khaled, Mohamed Ashraf SUPERVISOR
- [x] Basant LEADER only; Abdel Rahman + Mohamed El Desouky MEMBER only
- [x] Everyone else MEMBER; no invented roles
- [x] Normal members score from Admin only (max 100/week, DB-enforced)
- [x] Zones rank-derived per team: 1–5 safe / 6–10 red
- [x] History records every transaction with grand totals + week identifier; rank/point movement replayed from the log (never fabricated)
- [x] Display aliases (Turkey/تركي, Don't Care/دونت كير) seeded in DB; canonical names unchanged
- [x] Push subscriptions RPC-only and unreadable publicly; no secrets in SQL
- [x] Migrations + seed are the source of truth; zero hardcoded people in the frontend
- [x] No auth, no accounts, no unrelated breakage (`tsc` + `vite build` clean)
