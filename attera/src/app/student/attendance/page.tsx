import { createClient } from "@/lib/supabase/server";
import StudentNav from "@/components/StudentNav";

export default async function StudentAttendancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: overall } = await supabase
    .from("attendance_overall")
    .select("percentage, present_count, total_count")
    .eq("student_id", user!.id)
    .maybeSingle();

  const { data: subjectWise } = await supabase
    .from("attendance_summary")
    .select("subject_name, subject_code, present_count, total_count, percentage")
    .eq("student_id", user!.id)
    .order("subject_name");

  return (
    <main className="pb-24">
      <header className="px-5 pt-6">
        <h1 className="text-2xl font-bold text-navy">My Attendance</h1>
      </header>

      <section className="mt-4 px-5">
        <div className="card p-5 text-center">
          <div className="text-3xl font-bold text-navy">
            {overall?.percentage ?? 0}%
          </div>
          <div className="text-xs text-slate-500">
            {overall?.present_count ?? 0} / {overall?.total_count ?? 0} classes
            attended overall
          </div>
          {(overall?.percentage ?? 0) < 75 && (
            <p className="mt-2 text-xs font-semibold text-danger">
              Your attendance is below the 75% requirement.
            </p>
          )}
        </div>
      </section>

      <section className="mt-4 flex flex-col gap-2 px-5">
        {(subjectWise ?? []).map((s) => (
          <div key={s.subject_code} className="card p-4">
            <div className="flex justify-between">
              <span className="font-semibold text-navy">
                {s.subject_code} — {s.subject_name}
              </span>
              <span
                className={`font-bold ${
                  (s.percentage ?? 0) < 75 ? "text-danger" : "text-teal"
                }`}
              >
                {s.percentage}%
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {s.present_count} present / {s.total_count} total
            </div>
          </div>
        ))}
        {(subjectWise ?? []).length === 0 && (
          <p className="mt-6 text-center text-sm text-slate-500">
            No attendance recorded yet.
          </p>
        )}
      </section>

      <StudentNav />
    </main>
  );
}
