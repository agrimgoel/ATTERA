import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";

export default async function TeacherMarksDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch sections/subjects the teacher is assigned to
  const { data: assignments } = await supabase
    .from("assignments")
    .select(`
      id,
      classes (id, name),
      subjects (id, name, code)
    `)
    .eq("teacher_id", user!.id);

  return (
    <main className="pb-24">
      <header className="flex items-center justify-between px-5 pt-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Enter Marks</h1>
          <p className="text-xs text-slate-500 mt-0.5">Select a section and subject to input marks</p>
        </div>
        <LogoutButton redirectTo="/admin/login" />
      </header>

      <section className="mt-6 px-5">
        <h2 className="text-sm font-bold uppercase text-slate-400 mb-3">Your Classes</h2>
        {(!assignments || assignments.length === 0) ? (
          <p className="text-sm text-slate-500 mt-6 text-center">
            You are not assigned to teach any sections yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {assignments.map((item: any) => (
              <Link
                key={item.id}
                href={`/admin/marks/${item.id}`}
                className="card p-4 flex justify-between items-center hover:border-navy transition-all border border-slate-200"
              >
                <div>
                  <span className="font-bold text-navy text-base">Class {item.classes?.name}</span>
                  <div className="text-xs text-slate-500 mt-1">
                    {item.subjects?.code} • {item.subjects?.name}
                  </div>
                </div>
                <span className="text-xs text-teal font-semibold">Enter Marks →</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <AdminNav />
    </main>
  );
}
