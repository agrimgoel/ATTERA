# ATTERA — Setup Guide

This is a working Next.js + Supabase app matching your UI mockups. Follow
these steps in order — nothing here needs you to write code.

## 1. Create the Supabase project

1. Go to https://supabase.com → New project.
2. Choose a name (e.g. "attera"), a strong database password (save it
   somewhere), and the region closest to your college.
3. Wait ~2 minutes for it to provision.

## 2. Get your API keys

In your new project: **Settings → API**.

You'll need three values:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key** (click "Reveal") → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ The service_role key bypasses all security rules. Never put it in a
`NEXT_PUBLIC_` variable, never commit it, never paste it into frontend code.
This project already keeps it isolated to `src/lib/supabase/admin.ts`,
`src/app/api/admin/upload-csv/route.ts`, and `scripts/import-csv.mjs` only.

## 3. Create the database tables

1. In Supabase: **SQL Editor → New query**.
2. Open `supabase/schema.sql` from this project, paste the whole file in,
   click **Run**.
3. New query again → paste `supabase/seed_subjects.sql` → **Run**. (This
   creates the subject list — COA, Data Structures, etc. — that teachers
   pick from in the app. Edit this file first if your subjects differ.)

You now have all tables, indexes, and Row Level Security policies in place.

## 4. Configure local environment variables

1. In the project folder, copy the example file:
   ```
   cp .env.example .env.local
   ```
2. Open `.env.local` and paste in the three values from Step 2.

## 5. Import your 280 students + 100 teachers

Two ways — pick whichever is easier for you.

### Option A — before the site is even deployed (recommended for the first load)

1. Install dependencies once:
   ```
   npm install
   ```
2. Prepare `teachers.csv` and `students.csv` matching the formats in
   `supabase/seed_templates/` (headers must match exactly):
   - teachers: `name,email,dob,role` (role is `teacher` or `hod`)
   - students: `name,roll_no,class,email,dob`
   - DOB format: `YYYY-MM-DD` (this becomes their login password)
3. Run:
   ```
   npm run import:csv teachers ./teachers.csv
   npm run import:csv students ./students.csv
   ```
   This creates every login (Supabase Auth user) and every profile row in
   one go. It prints progress and a final "created / skipped" count.

### Option B — from inside the app, after deploying

Log in as an HOD account, go to **Admin → HOD → Upload CSVs**, and upload
the same two files through the browser. Useful for adding a handful of
people later without touching the terminal.

## 6. Run it locally to check everything

```
npm install   # if you haven't already
npm run dev
```

Open http://localhost:3000. Try logging in with a teacher's email + DOB
from your CSV, and a student's, to confirm both portals work.

## 7. Deploy to Vercel

1. Push this project to a GitHub repo (Vercel deploys from Git).
2. Go to https://vercel.com → **Add New → Project** → import that repo.
3. In the "Configure Project" screen, expand **Environment Variables** and
   add the same three keys from Step 2:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Click **Deploy**. Vercel auto-detects Next.js — no extra config needed.
5. Once live, share the URL: `/admin/login` for teachers/HOD,
   `/student/login` for students (or just the root URL, which shows both
   options).

That's it — the same Supabase project serves both the local dev version and
the deployed Vercel version, so your data is always in one place.

## 8. Ongoing use

- **Adding subjects**: Supabase → Table Editor → `subjects` → Insert row.
- **Adding a class mid-year**: happens automatically the first time a
  student in that class is imported.
- **A teacher forgets they're logged out on a new device**: they just log
  in again with email + DOB — nothing to reset.
- **Changing someone's DOB/password**: update it in Supabase → Authentication
  → Users → find the user → Reset password. (The `dob` column in
  `teachers`/`students` is just a record; the *actual* login credential
  lives in Supabase Auth.)

## 9. A few things worth knowing before you scale this up

- **Before going live**: `package.json` currently pins `next@14.2.15`,
  which has a known security advisory. Run `npm install next@latest` (or
  the newest 14.2.x patch) before deploying to real student/teacher data.
- The "Export as PDF" button uses the browser's print dialog on a styled
  table — works everywhere with zero extra cost, but if you later want a
  polished branded PDF layout, that's a small upgrade (a PDF-generation
  library in an API route) rather than a rebuild.
- Attendance re-marked on the same day overwrites the previous mark (by
  design, so a teacher can fix a mis-tap). There's no audit trail of
  *changes* yet — only the final state — flag if you want history kept.
