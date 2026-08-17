import { createClient } from "@/lib/supabase/server";
import StudentNav from "@/components/StudentNav";
import LogoutButton from "@/components/LogoutButton";

export default async function StudentMarksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch all marks for this student
  const { data: marks } = await supabase
    .from("marks")
    .select(`
      id,
      test_type,
      test_name,
      total_marks,
      given_marks,
      subjects (id, name, code)
    `)
    .eq("student_id", user!.id);

  // Group marks by subject code/name
  const bySubject: Record<string, { code: string; name: string; testMarks: any[] }> = {};
  for (const m of marks ?? []) {
    const sub = (m as any).subjects;
    if (!sub) continue;
    const key = sub.code;
    if (!bySubject[key]) {
      bySubject[key] = {
        code: sub.code,
        name: sub.name,
        testMarks: [],
      };
    }
    bySubject[key].testMarks.push(m);
  }

  // Sort test types for consistent display (ST1, ST2, PUT)
  const sortOrder: Record<string, number> = { ST1: 1, ST2: 2, PUT: 3 };
  for (const key of Object.keys(bySubject)) {
    bySubject[key].testMarks.sort((a, b) => (sortOrder[a.test_type] || 0) - (sortOrder[b.test_type] || 0));
  }

  const subjectList = Object.values(bySubject);

  return (
    <main className="pb-24">
      <header className="flex items-center justify-between px-5 pt-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">My Academic Marks</h1>
          <p className="text-xs text-slate-500 mt-0.5">View your performance in ST1, ST2, and PUT</p>
        </div>
        <LogoutButton redirectTo="/student/login" />
      </header>

      <section className="mt-6 px-5 flex flex-col gap-4">
        {subjectList.length === 0 ? (
          <p className="text-sm text-slate-500 mt-8 text-center">
            No academic test marks have been uploaded by teachers yet.
          </p>
        ) : (
          subjectList.map((subject) => (
            <div key={subject.code} className="card p-5 border border-slate-200">
              <h2 className="font-bold text-navy text-lg border-b border-slate-100 pb-2">
                {subject.code} • <span className="text-sm font-semibold text-slate-500">{subject.name}</span>
              </h2>

              <div className="mt-4 flex flex-col gap-3">
                {subject.testMarks.map((tm) => {
                  const percentage = ((Number(tm.given_marks) / Number(tm.total_marks)) * 100).toFixed(1);
                  return (
                    <div key={tm.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div>
                        <span className="font-bold text-navy text-sm uppercase bg-navy-light text-white px-2 py-0.5 rounded mr-2">
                          {tm.test_type}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">{tm.test_name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-navy text-sm">
                          {tm.given_marks} / {tm.total_marks}
                        </div>
                        <div className="text-xs text-slate-400 font-semibold mt-0.5">{percentage}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </section>

      <StudentNav />
    </main>
  );
}
