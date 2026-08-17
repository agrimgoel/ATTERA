import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: teacher } = await supabase
    .from("teachers")
    .select("name, email, dob, role")
    .eq("id", user!.id)
    .single();

  const dobFormatted = teacher?.dob
    ? new Date(teacher.dob).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  const roleFormatted =
    teacher?.role === "hod"
      ? "Head of Department (HOD)"
      : teacher?.role === "system_checker"
      ? "System Checker"
      : "Teacher";

  return (
    <main className="pb-24">
      <header className="flex items-center justify-between px-5 pt-6">
        <h1 className="text-2xl font-bold text-navy">My Profile</h1>
        <LogoutButton redirectTo="/admin/login" />
      </header>

      <section className="mt-6 px-5">
        <div className="card p-6 bg-gradient-to-br from-navy to-navy/90 text-white rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/5 rounded-full blur-xl" />
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-teal-light text-navy font-bold flex items-center justify-center text-2xl shadow">
              {teacher?.name?.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold">{teacher?.name}</h2>
              <p className="text-sm text-slate-300">{roleFormatted}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <div className="card p-4">
            <label className="text-xs font-semibold text-slate-400 uppercase">Role</label>
            <p className="text-base font-bold text-navy mt-1">{roleFormatted}</p>
          </div>

          <div className="card p-4">
            <label className="text-xs font-semibold text-slate-400 uppercase">Official Email</label>
            <p className="text-base font-semibold text-navy mt-1">{teacher?.email ?? "N/A"}</p>
          </div>

          <div className="card p-4">
            <label className="text-xs font-semibold text-slate-400 uppercase">Date of Birth</label>
            <p className="text-base font-semibold text-navy mt-1">{dobFormatted}</p>
          </div>
        </div>
      </section>

      <AdminNav />
    </main>
  );
}
