import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    classId: string;
  }>;
}

export default async function HodSectionDetailsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const classId = resolvedParams.classId;
  const supabase = await createClient();

  // 1. Fetch class details
  const { data: cls } = await supabase
    .from("classes")
    .select("id, name")
    .eq("id", classId)
    .single();

  if (!cls) {
    return notFound();
  }

  // 2. Fetch assignments / mapped teachers for this class
  const { data: assignments } = await supabase
    .from("assignments")
    .select(`
      id,
      subjects (id, name, code),
      teachers (id, name, email)
    `)
    .eq("class_id", classId);

  // 3. Fetch students in this class
  const { data: students } = await supabase
    .from("students")
    .select("id, name, roll_no")
    .eq("class_id", classId)
    .order("name");

  // 4. Fetch marks of students in this class
  const studentIds = (students ?? []).map((s) => s.id);
  let marksMap: Record<string, any[]> = {};
  if (studentIds.length > 0) {
    const { data: marks } = await supabase
      .from("marks")
      .select(`
        id,
        student_id,
        test_type,
        test_name,
        total_marks,
        given_marks,
        subjects (name, code)
      `)
      .in("student_id", studentIds);

    for (const m of marks ?? []) {
      marksMap[m.student_id] = marksMap[m.student_id] ?? [];
      marksMap[m.student_id].push(m);
    }
  }

  return (
    <main className="pb-24">
      <header className="px-5 pt-6 flex items-center gap-3">
        <Link href="/admin/hod" className="text-navy text-xl">
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-navy">Class {cls.name} Details</h1>
          <p className="text-xs text-slate-500 mt-0.5">View mapped teachers and student marks</p>
        </div>
      </header>

      {/* Mapped Teachers Section */}
      <section className="mt-6 px-5">
        <h2 className="text-sm font-bold uppercase text-slate-400 mb-3">Mapped Teachers</h2>
        {(!assignments || assignments.length === 0) ? (
          <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-lg border border-slate-100">
            No teachers are mapped to this section yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {assignments.map((item: any) => (
              <div key={item.id} className="card p-4 flex justify-between items-center border border-slate-200">
                <div>
                  <div className="font-bold text-navy text-sm">{item.teachers?.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{item.teachers?.email}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-teal bg-teal-light px-2 py-0.5 rounded">
                    {item.subjects?.code}
                  </span>
                  <div className="text-[10px] text-slate-500 mt-1">{item.subjects?.name}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Student Marks Section */}
      <section className="mt-6 px-5">
        <h2 className="text-sm font-bold uppercase text-slate-400 mb-3">Student Performance (Marks)</h2>
        {(!students || students.length === 0) ? (
          <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-lg border border-slate-100">
            No students enrolled in this section.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {students.map((student) => {
              const studentMarks = marksMap[student.id] || [];
              return (
                <div key={student.id} className="card p-4 border border-slate-200">
                  <div className="border-b border-slate-100 pb-2 mb-2 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-navy text-sm">{student.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{student.roll_no}</div>
                    </div>
                  </div>
                  {studentMarks.length === 0 ? (
                    <div className="text-[11px] text-slate-400">No marks entered yet.</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {studentMarks.map((tm) => (
                        <div key={tm.id} className="bg-slate-50 p-2 rounded text-center border border-slate-100">
                          <span className="font-bold text-[10px] text-navy block uppercase">{tm.test_type}</span>
                          <span className="text-[11px] font-bold text-teal block mt-0.5">
                            {tm.given_marks}/{tm.total_marks}
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-0.5 truncate">
                            {tm.subjects?.code}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <AdminNav />
    </main>
  );
}
