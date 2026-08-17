import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";

export default async function HodPage() {
  const supabase = await createClient();

  const { data: overall } = await supabase
    .from("attendance_overall")
    .select("*")
    .order("percentage", { ascending: true });

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .order("name");

  const rows = overall ?? [];
  const low = rows.filter((r) => (r.percentage ?? 0) < 75);
  const rest = rows.filter((r) => (r.percentage ?? 0) >= 75);

  return (
    <main className="pb-24">
      <header className="flex items-center justify-between px-5 pt-6">
        <h1 className="text-2xl font-bold text-navy">HOD Overview</h1>
        <Link href="/admin/upload" className="text-sm font-semibold text-teal">
          Upload CSVs
        </Link>
      </header>

      <section className="mt-2 grid grid-cols-2 gap-3 px-5">
        <div className="card p-4">
          <div className="text-xs text-slate-500">Total Students</div>
          <div className="text-2xl font-bold text-navy">{rows.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">Total Classes</div>
          <div className="text-2xl font-bold text-teal">{(classes ?? []).length}</div>
        </div>
      </section>

      <section className="mt-5 px-5">
        <h2 className="text-sm font-bold uppercase text-slate-400 mb-2">
          Sections / Classes
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {(classes ?? []).map((cls) => (
            <Link
              key={cls.id}
              href={`/admin/hod/sections/${cls.id}`}
              className="card p-4 text-center border border-slate-200 hover:border-navy transition-all"
            >
              <div className="font-bold text-navy">{cls.name}</div>
              <div className="text-xs text-slate-500 mt-1">View Teachers & Marks</div>
            </Link>
          ))}
        </div>
      </section>

      {low.length > 0 && (
        <section className="mt-5 px-5">
          <h2 className="text-sm font-bold uppercase text-danger">
            Below 75% attendance ({low.length})
          </h2>
          <div className="mt-2 flex flex-col gap-2">
            {low.map((r) => (
              <div
                key={r.student_id}
                className="card flex items-center justify-between border-danger/30 bg-red-50 p-4"
              >
                <div>
                  <div className="font-semibold text-navy">
                    {r.student_name}
                  </div>
                  <div className="text-xs text-slate-500">{r.roll_no}</div>
                </div>
                <span className="rounded-full bg-danger px-2 py-1 text-xs font-bold text-white">
                  {r.percentage}%
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-5 px-5">
        <h2 className="text-sm font-bold uppercase text-slate-400">
          All students
        </h2>
        <div className="mt-2 flex flex-col gap-2">
          {rest.map((r) => (
            <div
              key={r.student_id}
              className="card flex items-center justify-between p-4"
            >
              <div>
                <div className="font-semibold text-navy">
                  {r.student_name}
                </div>
                <div className="text-xs text-slate-500">{r.roll_no}</div>
              </div>
              <span className="rounded-full bg-teal-light px-2 py-1 text-xs font-bold text-teal">
                {r.percentage}%
              </span>
            </div>
          ))}
        </div>
      </section>

      <AdminNav />
    </main>
  );
}
