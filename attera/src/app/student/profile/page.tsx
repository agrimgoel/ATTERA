import { createClient } from "@/lib/supabase/server";
import StudentNav from "@/components/StudentNav";
import LogoutButton from "@/components/LogoutButton";

export default async function StudentProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select("name, roll_no, email, dob, classes(name)")
    .eq("id", user!.id)
    .single();

  const dobFormatted = student?.dob
    ? new Date(student.dob).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  return (
    <main className="pb-24">
      <header className="flex items-center justify-between px-5 pt-6">
        <h1 className="text-2xl font-bold text-navy">My Profile</h1>
        <LogoutButton redirectTo="/student/login" />
      </header>

      <section className="mt-6 px-5">
        <div className="card p-6 bg-gradient-to-br from-navy to-navy/90 text-white rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/5 rounded-full blur-xl" />
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-teal-light text-navy font-bold flex items-center justify-center text-2xl shadow">
              {student?.name?.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold">{student?.name}</h2>
              <p className="text-sm text-slate-300">Student</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <div className="card p-4">
            <label className="text-xs font-semibold text-slate-400 uppercase">Roll Number</label>
            <p className="text-base font-bold text-navy mt-1">{student?.roll_no ?? "N/A"}</p>
          </div>

          <div className="card p-4">
            <label className="text-xs font-semibold text-slate-400 uppercase">Class / Section</label>
            <p className="text-base font-bold text-navy mt-1">
              Class {Array.isArray(student?.classes) ? (student?.classes as any)[0]?.name : (student?.classes as any)?.name ?? "N/A"}
            </p>
          </div>

          <div className="card p-4">
            <label className="text-xs font-semibold text-slate-400 uppercase">Official Email</label>
            <p className="text-base font-semibold text-navy mt-1">{student?.email ?? "N/A"}</p>
          </div>

          <div className="card p-4">
            <label className="text-xs font-semibold text-slate-400 uppercase">Date of Birth</label>
            <p className="text-base font-semibold text-navy mt-1">{dobFormatted}</p>
          </div>
        </div>
      </section>

      <StudentNav />
    </main>
  );
}
