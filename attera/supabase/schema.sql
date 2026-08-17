-- =====================================================================
-- ATTERA — Supabase schema
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run
-- =====================================================================

-- ---------- extensions ----------
create extension if not exists "pgcrypto";

-- ---------- lookup tables ----------
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique          -- e.g. "2D"
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,                -- e.g. "Computer Organization & Architecture"
  code text not null unique          -- e.g. "COA"
);

-- ---------- people ----------
-- id = auth.users.id (created via Supabase Auth: email + DOB as password)
create table if not exists public.teachers (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  dob date not null,                 -- stored for admin re-issue only; NOT used to log in (auth password is)
  role text not null default 'teacher' check (role in ('teacher','hod','system_checker')),
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  roll_no text not null unique,
  class_id uuid not null references public.classes(id),
  email text not null unique,
  dob date not null,
  created_at timestamptz not null default now()
);

-- ---------- teacher <-> subject <-> class assignment ----------
-- one row = "this teacher teaches this subject to this class"
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (teacher_id, subject_id, class_id)
);

-- ---------- weekly lecture schedule per assignment ----------
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0=Sun .. 6=Sat
  start_time time not null,
  end_time time not null,
  room text,
  created_at timestamptz not null default now()
);

-- ---------- attendance ----------
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_date date not null,
  status text not null check (status in ('present','absent')),
  marked_by uuid not null references public.teachers(id),
  marked_at timestamptz not null default now(),
  schedule_id uuid references public.schedules(id) on delete cascade,
  unique NULLS NOT DISTINCT (assignment_id, student_id, class_date, schedule_id)
);

create index if not exists idx_attendance_student on public.attendance(student_id);
create index if not exists idx_attendance_assignment_date on public.attendance(assignment_id, class_date);
create index if not exists idx_assignments_teacher on public.assignments(teacher_id);
create index if not exists idx_schedules_assignment on public.schedules(assignment_id);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.assignments enable row level security;
alter table public.schedules enable row level security;
alter table public.attendance enable row level security;
alter table public.classes enable row level security;
alter table public.subjects enable row level security;

-- helper: is the current auth user an HOD?
create or replace function public.is_hod()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.teachers t where t.id = auth.uid() and t.role = 'hod'
  );
$$;

-- helper: get class_id for current student (security definer bypasses RLS)
create or replace function public.get_student_class_id()
returns uuid
language sql
security definer
stable
as $$
  select class_id from public.students where id = auth.uid();
$$;

-- classes / subjects: readable by any logged-in user
create policy "classes readable by authenticated" on public.classes
  for select using (auth.role() = 'authenticated');
create policy "subjects readable by authenticated" on public.subjects
  for select using (auth.role() = 'authenticated');

-- teachers: readable by any authenticated user
create policy "teachers readable by authenticated" on public.teachers
  for select using (auth.role() = 'authenticated');
create policy "teacher updates own row" on public.teachers
  for update using (id = auth.uid());

-- students: student reads only their own row.
-- teachers/HOD can read students who belong to a class they are assigned to.
create policy "student reads own row" on public.students
  for select using (
    id = auth.uid()
    or public.is_hod()
    or exists (
      select 1 from public.assignments a
      where a.class_id = students.class_id and a.teacher_id = auth.uid()
    )
  );

-- assignments: teacher manages their own assignments; HOD reads all; students can read assignments for their class
create policy "teacher reads own assignments" on public.assignments
  for select using (
    teacher_id = auth.uid()
    or public.is_hod()
    or class_id = public.get_student_class_id()
  );
create policy "teacher inserts own assignments" on public.assignments
  for insert with check (teacher_id = auth.uid());
create policy "teacher deletes own assignments" on public.assignments
  for delete using (teacher_id = auth.uid());

-- schedules: visible to the owning teacher, HOD, and any student in that class
create policy "schedule visible to teacher/hod" on public.schedules
  for select using (
    public.is_hod()
    or exists (
      select 1 from public.assignments a
      where a.id = schedules.assignment_id and a.teacher_id = auth.uid()
    )
    or exists (
      select 1 from public.assignments a
      join public.students s on s.class_id = a.class_id
      where a.id = schedules.assignment_id and s.id = auth.uid()
    )
  );
create policy "teacher writes own schedule" on public.schedules
  for insert with check (
    exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid())
  );
create policy "teacher updates own schedule" on public.schedules
  for update using (
    exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid())
  );
create policy "teacher deletes own schedule" on public.schedules
  for delete using (
    exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid())
  );

-- attendance: teacher can insert/update for their own assignment;
-- student can read only their own records; HOD reads all
create policy "attendance select" on public.attendance
  for select using (
    student_id = auth.uid()
    or public.is_hod()
    or exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid())
  );
create policy "attendance insert by owning teacher" on public.attendance
  for insert with check (
    exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid())
  );
create policy "attendance update by owning teacher" on public.attendance
  for update using (
    exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid())
  );

-- =====================================================================
-- Convenience view: per-student, per-subject attendance percentage
-- =====================================================================
create or replace view public.attendance_summary as
select
  s.id as student_id,
  s.name as student_name,
  s.roll_no,
  s.class_id,
  sub.id as subject_id,
  sub.name as subject_name,
  sub.code as subject_code,
  count(*) filter (where att.status = 'present') as present_count,
  count(*) as total_count,
  round(
    100.0 * count(*) filter (where att.status = 'present') / nullif(count(*), 0), 1
  ) as percentage
from public.attendance att
join public.assignments a on a.id = att.assignment_id
join public.subjects sub on sub.id = a.subject_id
join public.students s on s.id = att.student_id
group by s.id, s.name, s.roll_no, s.class_id, sub.id, sub.name, sub.code;

-- overall (all subjects combined) percentage per student, used by HOD view
create or replace view public.attendance_overall as
select
  s.id as student_id,
  s.name as student_name,
  s.roll_no,
  s.class_id,
  count(*) filter (where att.status = 'present') as present_count,
  count(*) as total_count,
  round(
    100.0 * count(*) filter (where att.status = 'present') / nullif(count(*), 0), 1
  ) as percentage
from public.students s
left join public.attendance att on att.student_id = s.id
group by s.id, s.name, s.roll_no, s.class_id;

-- Views inherit RLS from underlying tables via security invoker (default in
-- recent Postgres/Supabase). If your project defaults to security definer
-- views, explicitly run:
-- alter view public.attendance_summary set (security_invoker = true);
-- alter view public.attendance_overall set (security_invoker = true);

-- =====================================================================
-- System Checker Helper and RLS policies
-- =====================================================================
create or replace function public.is_system_checker()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.teachers t where t.id = auth.uid() and t.role = 'system_checker'
  );
$$;

create policy "system_checker manages assignments" on public.assignments
  for all using (public.is_system_checker()) with check (public.is_system_checker());

create policy "system_checker manages schedules" on public.schedules
  for all using (public.is_system_checker()) with check (public.is_system_checker());

-- =====================================================================
-- Marks Table and RLS Policies
-- =====================================================================
create table if not exists public.marks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  test_type text not null check (test_type in ('ST1', 'ST2', 'PUT')),
  test_name text,
  total_marks numeric not null,
  given_marks numeric not null,
  marked_by uuid not null references public.teachers(id),
  created_at timestamptz not null default now(),
  unique (student_id, subject_id, test_type)
);

alter table public.marks enable row level security;

create policy "marks select policy" on public.marks
  for select using (
    student_id = auth.uid()
    or public.is_hod()
    or exists (
      select 1 from public.assignments a
      where a.subject_id = marks.subject_id and a.teacher_id = auth.uid()
    )
  );

create policy "marks insert policy" on public.marks
  for insert with check (
    exists (
      select 1 from public.assignments a
      where a.subject_id = subject_id and a.teacher_id = auth.uid()
    )
  );

create policy "marks update policy" on public.marks
  for update using (
    exists (
      select 1 from public.assignments a
      where a.subject_id = subject_id and a.teacher_id = auth.uid()
    )
  );

