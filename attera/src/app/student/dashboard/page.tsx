import { createClient } from "@/lib/supabase/server";
import StudentNav from "@/components/StudentNav";
import { DAYS } from "@/lib/types";
import LogoutButton from "@/components/LogoutButton";

export default async function StudentDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select("name, class_id")
    .eq("id", user!.id)
    .single();

  const { data: overall } = await supabase
    .from("attendance_overall")
    .select("percentage, present_count, total_count")
    .eq("student_id", user!.id)
    .maybeSingle();

  const { data: subjectWise } = await supabase
    .from("attendance_summary")
    .select("subject_name, subject_code, percentage")
    .eq("student_id", user!.id)
    .order("subject_name");

  const dow = new Date().getDay();
  const { data: todaysSchedule } = await supabase
    .from("schedules")
    .select(
      "id, start_time, end_time, room, assignments(subjects(name, code), teachers(name))"
    )
    .eq("day_of_week", dow)
    .order("start_time");

  // RLS already scopes this to the student's own class via the schedules
  // policy, so no extra client-side filtering by class is required.

  return (
    <main className="pb-24">
      <header className="flex items-center justify-between px-5 pt-6">
        <span className="text-xl font-bold text-navy">ATTERA</span>
        <LogoutButton redirectTo="/student/login" />
      </header>

      <section className="mt-4 px-5">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-navy">
              Attendance Overview
            </h1>
            <span className="rounded-full bg-teal-light px-2 py-1 text-xs text-teal">
              Current Semester
            </span>
          </div>

          <div className="mx-auto mt-4 flex h-28 w-28 items-center justify-center rounded-2xl border-4 border-navy">
            <div className="text-center">
              <div className="text-2xl font-bold text-navy">
                {overall?.percentage ?? 0}%
              </div>
              <div className="text-xs text-slate-500">Overall</div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {(subjectWise ?? []).map((s) => (
              <div key={s.subject_code}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">{s.subject_name}</span>
                  <span className="font-semibold text-navy">
                    {s.percentage}%
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-200">
                  <div
                    className={`h-2 rounded-full ${
                      (s.percentage ?? 0) < 75 ? "bg-danger" : "bg-teal"
                    }`}
                    style={{ width: `${s.percentage ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
            {(subjectWise ?? []).length === 0 && (
              <p className="text-sm text-slate-500">
                No attendance recorded yet.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-4 px-5">
        <div className="card overflow-hidden">
          <div className="bg-slate-50 px-4 py-3">
            <h2 className="font-bold text-navy">Today&apos;s Schedule</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {(todaysSchedule ?? []).map((row: any) => (
              <div key={row.id} className="flex gap-3 p-4">
                <div className="w-16 text-xs text-slate-500">
                  <div>{row.start_time?.slice(0, 5)}</div>
                  <div>{row.end_time?.slice(0, 5)}</div>
                </div>
                <div>
                  <div className="font-semibold text-navy">
                    {row.assignments?.subjects?.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {row.assignments?.teachers?.name}
                  </div>
                </div>
              </div>
            ))}
            {(todaysSchedule ?? []).length === 0 && (
              <p className="p-4 text-sm text-slate-500">
                No classes today ({DAYS[dow]}).
              </p>
            )}
          </div>
        </div>
      </section>

      <StudentNav />
    </main>
  );
}
