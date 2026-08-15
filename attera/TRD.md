# ATTERA — Technical Requirements Document (TRD)

Derived from the PRD for a two-portal attendance system serving 280 students
and 100 teachers.

## 1. Architecture

- **Frontend/Backend**: Next.js 14 (App Router, TypeScript), deployed on
  Vercel. Server Components fetch data directly from Supabase on the server;
  Client Components handle interactive forms (login, attendance marking,
  schedule setup).
- **Database & Auth**: Supabase (Postgres + built-in Auth + Row Level
  Security). One Postgres project holds both portals' data — access is
  separated by RLS policies, not by separate databases.
- **Hosting**: Vercel (serverless functions for API routes, static/edge for
  pages).
- **Styling**: Tailwind CSS, mobile-first (max-width 448px shell, bottom tab
  navigation), matching the supplied UI mockups.

## 2. Identity model

Every teacher and student is both:
1. A row in `public.teachers` / `public.students` (profile data: name, roll
   no, class, etc.)
2. A Supabase Auth user (`auth.users`), created at CSV-import time with
   `email = official email` and `password = DOB`. The two are linked by a
   shared UUID (`teachers.id = auth.users.id`).

Role (`teacher` / `hod` / `student`) is stamped into
`auth.users.user_metadata.role` at creation time and mirrored in
`teachers.role`. This is what `middleware.ts` uses to block a student token
from ever reaching `/admin/*` routes, and vice versa — satisfying the PRD's
requirement that students cannot reach admin data.

**Persistent login**: Supabase Auth's browser client stores the session in
`localStorage` + an httpOnly-refresh cookie by default, and
`@supabase/ssr`'s middleware silently refreshes it on every request. That's
what keeps a teacher/student logged in on their phone across visits without
Claude needing to build a custom "remember me" system.

## 3. Data model

See `supabase/schema.sql` for the authoritative definitions. Summary:

| Table | Purpose |
|---|---|
| `classes` | e.g. "2D" |
| `subjects` | e.g. COA, Data Structures |
| `teachers` | profile + role (`teacher`/`hod`) |
| `students` | profile + class |
| `assignments` | "this teacher teaches this subject to this class" — the join table the whole app hangs off |
| `schedules` | weekly lecture slots per assignment (day, start, end, room) |
| `attendance` | one row per (assignment, student, date) |

Two views compute the numbers the UI needs without per-request aggregation
logic in application code:
- `attendance_summary` — per student, per subject, percentage
- `attendance_overall` — per student, all subjects combined (used by both
  the student dashboard's "82% Overall" ring and the HOD's <75% flagging)

## 4. Core flows, mapped to PRD steps

1. **Teacher login** → Supabase `signInWithPassword(email, dob)`.
2. **Select subject → select class(es) → weekly schedule** →
   `/admin/setup`, a 3-step wizard that writes to `assignments` then
   `schedules` in one save.
3. **Dashboard shows saved classes** → `/admin/dashboard` reads
   `assignments` + today's `schedules` for the logged-in teacher (RLS scopes
   this automatically — no manual `WHERE teacher_id = ...` needed in most
   reads, though it's added for clarity/index usage).
4. **Student portal shows the full day/date-wise schedule for their class**
   → `/student/schedule`, joined across every teacher's `assignments` for
   that `class_id`.
5. **Mark attendance (Present/Absent)** → `/admin/attendance/[assignmentId]`,
   upserts into `attendance` keyed on `(assignment_id, student_id,
   class_date)` so re-marking the same day updates rather than duplicates.
6. **Export CSV/PDF** → `/admin/reports` aggregates `attendance` client-side
   into present/absent/% per student and offers a CSV download; "Export as
   PDF" uses the browser's native print-to-PDF on a print-styled table
   (no extra PDF library/server cost).
7. **HOD view, all 280 students, red-flag <75%** → `/admin/hod`, reads
   `attendance_overall`, splits into "below 75%" (pinned to top, red) and
   the rest.
8. **Student portal — view only** → RLS on `attendance`, `schedules`, and
   `students` grants students `SELECT` on their own rows only; there is no
   `INSERT`/`UPDATE` policy for the `student` role on any table, so even a
   compromised client can't write attendance or see other students' data.

## 5. CSV bulk import (teachers + students)

Two equivalent paths, both server-side only (service-role key never reaches
the browser):

- **Web**: `/admin/upload` (HOD-only page) → `POST /api/admin/upload-csv` →
  route handler checks the caller's session is `role = hod`, then uses the
  Supabase service-role client to create one Auth user + one DB row per CSV
  row.
- **CLI**: `scripts/import-csv.mjs`, for the initial one-time load of all
  280 students / 100 teachers — faster than uploading through the browser
  and doesn't depend on the app being deployed yet.

Classes are auto-created the first time they're seen in the students CSV
(`ensureClass`), so there's no separate step to pre-declare "2D", "2C", etc.

## 6. Security

- All secrets (`SUPABASE_SERVICE_ROLE_KEY`) live only in `.env.local` /
  Vercel Environment Variables — never committed, never sent to the client
  (enforced by the naming convention: only `NEXT_PUBLIC_*` vars are exposed
  by Next.js to the browser).
- RLS is the real access-control boundary, not application code — even if a
  client-side bug leaked a query, Postgres itself rejects reads/writes
  outside a user's role.
- `middleware.ts` adds a second layer (route-level redirect) so a student
  session never even renders an `/admin` page shell.

## 7. Performance ("lag free")

- Server Components fetch data on the server and stream HTML — no
  client-side waterfall of loading spinners for the dashboards.
- Attendance marking batches all changes into one `upsert` call on Save,
  not one network request per tap.
- Postgres indexes on `attendance(student_id)` and
  `attendance(assignment_id, class_date)` keep the two hottest queries
  (a student's own history; a teacher's class-day lookup) fast at this
  scale (280 students × ~5 subjects × ~15 weeks ≈ 20k attendance rows —
  trivial for Postgres with indexes).
- Vercel's edge network + Supabase's connection pooler handle concurrency
  for 380 total users without additional tuning.

## 8. Out of scope / explicitly deferred

- Push notifications
- Native mobile app (the manifest.json makes it installable as a PWA, which
  covers "feels like an app on your phone" without a native build)
- Editing/deleting individual attendance records after the fact (currently:
  re-marking the same day overwrites via upsert; historical correction
  would need an explicit HOD-only edit flow — flag if you need this)
