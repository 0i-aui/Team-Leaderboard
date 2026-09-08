# Team Leaderboard — Setup & Operations Guide (v3)

Private, read-only public leaderboard. No login, no signup, no admin panel.
You manage everything from the Supabase dashboard. The website only READS.

Architecture in one line:
`points_history` is the append-only audit log (source of truth) ·
`people.points_a / points_b` are cached totals ·
`add_points()` RPC updates both atomically + validates the source fits the person ·
RLS makes anon read-only · triggers cap the system at 20 people / 1 admin.

ONE leaderboard, all 20 people, ranked by Total Points. Roles are ADDITIVE
marks stored in `people.roles` (empty = regular member) — never stored twice,
never derived from names:

| Marks | points_a | points_b | Total |
|---|---|---|---|
| ADMIN (Ahmed Sameh) | Members | Management | Members + Management |
| SUPERVISOR (Eman, Jana, Abdel Rahman, Mohamed El Desouky) | Leaders | Admin | Leaders + Admin |
| otherwise (incl. LEADER-only Basant) | Supervisors | Admin | Supervisors + Admin |

Final marks: Ahmed Sameh = ADMIN + MOD · Eman = SUPERVISOR + LEADER ·
Jana, Abdel Rahman, Mohamed El Desouky = SUPERVISOR · Basant = LEADER ·
everyone else = MEMBER (shown automatically when no other marks exist).

Zones are computed live from rank (never stored, never hardcoded):
rank 1–10 = SAFE, rank 11+ = RED.

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

- **Fresh project:** run **`supabase/schema.sql`**, then **`supabase/seed.sql`**
  (the 20 people, all points 0).
- **Existing database on the old two-board model** (`role`/`board` columns):
  run the conversion SQL provided separately (it moves roles into the
  `roles` array, drops the board classification, and preserves every
  person, point, and history record). `supabase/migration_v2.sql` is kept
  only as the historical v1→v2 path — do not use it for new setups.

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

One leaderboard, all 20: Islam, Ahmed Sameh (`{admin,mod}`), Ahmed Mohamed,
Eman (`{supervisor,leader}`), Basant (`{leader}`), Thomas, Jana (`{supervisor}`),
Habiba, Khaled, Zahra, Abdel Rahman (`{supervisor}`), Fayrouz, Mohamed Ahmed,
Mohamed Ashraf, Mohamed El Desouky (`{supervisor}`), Mohamed Sayed Hassan,
Mohamed Sayed Saleh, Mohamed Nady, Mohreal, Youssef (all `{}` = MEMBER).

The database refuses a 21st person, a 2nd admin, an invalid mark,
and any duplicate name (case-insensitive) — all enforced by constraints/indexes.

## Step 5 — How to rename someone

**Table Editor → people** → edit `name` → Save. History points at the same
`person_id`, so past records automatically show the new name. To change
marks, edit the `roles` array (e.g. `{supervisor,leader}`) — invalid marks
and a second admin are rejected automatically.

## Step 6 — How to add points (the ONLY correct way)

NEVER edit `points_a` / `points_b` cells by hand — that bypasses history.
Use the atomic `add_points()` RPC in **SQL Editor**, which validates that
the source fits the person's marks (`leader` requires the SUPERVISOR mark,
`members`/`management` require ADMIN, `supervisor` requires neither):

```sql
-- Regular member: Supervisors or Admin source
select public.add_points((select id from people where name='Thomas'), 'supervisor', 20, 'Great work');
select public.add_points((select id from people where name='Thomas'), 'admin', 15, 'Task done');

-- Supervisor-marked: Leader or Admin source
select public.add_points((select id from people where name='Jana'), 'leader', 15, 'Top review');
select public.add_points((select id from people where name='Eman'), 'admin', 10, 'Bonus');

-- Ahmed Sameh (ADMIN mark): Members or Management source
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
| Find a person id | `select id, name, roles, points_a, points_b from people order by name;` |
| Inspect history | `select * from points_history order by created_at desc limit 50;` |
| History for one person | `select * from points_history where person_id='<id>' order by created_at desc;` |
| Repair drift | `select rebuild_person_points();` |
| Verify counts | `select count(*) from people;` → 20 |

## Step 8 — Zones (automatic, nothing to configure)

- Ranks 1–10 show SAFE ZONE, rank 11+ shows RED ZONE.
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
```

This is read-only — it does not weaken RLS or allow any writes.

## Verification checklist

- [x] Exactly 20 unique people, no old names, no duplicates (DB-enforced)
- [x] ONE leaderboard with all 20, ranked by Total Points
- [x] Ahmed Sameh ADMIN + MOD (Members + Management)
- [x] Eman SUPERVISOR + LEADER (Leaders + Admin)
- [x] Jana, Abdel Rahman, Mohamed El Desouky SUPERVISOR (Leaders + Admin)
- [x] Basant LEADER only (Supervisors + Admin)
- [x] Everyone else MEMBER; no invented roles
- [x] Zones rank-derived: 1–10 safe / 11+ red
- [x] History records every transaction with per-type sources; filters for all 5
- [x] Supabase is the source of truth; zero hardcoded people in the frontend
- [x] No auth, no accounts, no unrelated breakage (`tsc` + `vite build` clean)
