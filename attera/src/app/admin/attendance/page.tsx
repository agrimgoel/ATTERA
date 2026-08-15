import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";

export default async function AttendanceIndex() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, subjects(name, code), classes(id, name), schedules(id, day_of_week, start_time, end_time, room)")
    .eq("teacher_id", user!.id);

  return (
    <main className="pb-24">
      <header className="px-5 pt-6">
        <h1 className="text-2xl font-bold text-navy">Mark Attendance</h1>
        <p className="mt-1 text-sm text-slate-500">
          Choose a lecture slot to mark attendance
        </p>
      </header>

      <section className="mt-4 flex flex-col gap-4 px-5">
        {(assignments ?? []).map((a: any) => {
          const sortedSchedules = [...(a.schedules ?? [])].sort((x, y) => {
            if (x.day_of_week !== y.day_of_week) return x.day_of_week - y.day_of_week;
            return x.start_time.localeCompare(y.start_time);
          });
          const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

          return (
            <div key={a.id} className="card p-4 flex flex-col gap-3">
              <div>
                <span className="font-semibold text-navy">
                  {a.subjects?.code}
                </span>
                <span className="ml-2 text-sm text-slate-500">
                  {a.subjects?.name}
                </span>
                <div className="text-xs text-slate-400 font-medium">
                  Class {a.classes?.name}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Select Lecture Slot
                </div>
                {sortedSchedules.map((sch: any) => (
                  <Link
                    key={sch.id}
                    href={`/admin/attendance/${a.id}?schedule_id=${sch.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 p-2.5 transition text-xs font-semibold text-navy"
                  >
                    <span>
                      📅 {dayNames[sch.day_of_week]} • {sch.start_time.slice(0, 5)} - {sch.end_time.slice(0, 5)}
                      {sch.room ? ` (Room ${sch.room})` : ""}
                    </span>
                    <span className="text-teal font-bold">Mark →</span>
                  </Link>
                ))}
                <Link
                  href={`/admin/attendance/${a.id}`}
                  className="flex items-center justify-between rounded-lg border border-dashed border-slate-300 bg-white hover:bg-slate-50 p-2.5 transition text-xs font-semibold text-slate-500"
                >
                  <span>📝 Extra / Unscheduled Lecture</span>
                  <span className="text-slate-400 font-bold">Mark →</span>
                </Link>
              </div>
            </div>
          );
        })}
        {(assignments ?? []).length === 0 && (
          <p className="mt-6 text-center text-sm text-slate-500">
            No classes set up yet.{" "}
            <Link href="/admin/setup" className="text-teal font-semibold">
              Set one up
            </Link>
            .
          </p>
        )}
      </section>

      <AdminNav />
    </main>
  );
}
