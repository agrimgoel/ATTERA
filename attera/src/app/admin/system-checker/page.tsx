import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";

export default async function SystemCheckerDashboard() {
  const supabase = await createClient();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .order("name");

  return (
    <main className="pb-24">
      <header className="flex items-center justify-between px-5 pt-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">System Checker</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage class schedules</p>
        </div>
        <LogoutButton redirectTo="/admin/login" />
      </header>

      <section className="mt-6 px-5">
        <h2 className="text-sm font-bold uppercase text-slate-400 mb-3">Select Class / Section</h2>
        <div className="grid grid-cols-2 gap-3">
          {(classes ?? []).map((cls) => (
            <Link
              key={cls.id}
              href={`/admin/system-checker/${cls.id}`}
              className="card p-5 text-center flex flex-col items-center justify-center hover:border-navy transition-all border border-slate-200"
            >
              <span className="text-2xl mb-2">🏫</span>
              <span className="font-bold text-navy text-lg">{cls.name}</span>
              <span className="text-xs text-slate-500 mt-1">Manage Schedule</span>
            </Link>
          ))}
        </div>
      </section>

      <AdminNav />
    </main>
  );
}
