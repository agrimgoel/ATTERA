import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import { DAYS } from "@/lib/types";

export default async function AdminSchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: assignments } = await supabase
    .from("assignments")
    .select(
      "id, subjects(name, code), classes(name), schedules(id, day_of_week, start_time, end_time, room)"
    )
    .eq("teacher_id", user!.id);

  // flatten into (day -> slots) grouping
  const byDay: Record<number, any[]> = {};
  for (const a of assignments ?? []) {
    for (const sch of (a as any).schedules ?? []) {
      byDay[sch.day_of_week] = byDay[sch.day_of_week] ?? [];
      byDay[sch.day_of_week].push({ ...sch, assignment: a });
    }
  }
  for (const d of Object.keys(byDay)) {
    byDay[Number(d)].sort((x, y) => x.start_time.localeCompare(y.start_time));
  }

  return (
    <main className="pb-24">
      <header className="flex items-center justify-between px-5 pt-6">
        <h1 className="text-2xl font-bold text-navy">My Schedule</h1>
        <Link href="/admin/setup" className="text-sm font-semibold text-teal">
          + Add class
        </Link>
      </header>

      <section className="mt-4 px-5">
        {Object.keys(byDay).length === 0 && (
          <p className="mt-8 text-center text-sm text-slate-500">
            No classes set up yet. Tap &quot;Add class&quot; to select a
            subject, classes, and weekly timing.
          </p>
        )}

        {DAYS.map((day, idx) =>
          byDay[idx] ? (
            <div key={idx} className="mt-5">
              <h2 className="text-sm font-bold uppercase text-slate-400">
                {day}
              </h2>
              <div className="mt-2 flex flex-col gap-2">
                {byDay[idx].map((slot) => (
                  <div key={slot.id} className="card p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-navy">
                        {slot.assignment.subjects?.code} • Class{" "}
                        {slot.assignment.classes?.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {slot.start_time?.slice(0, 5)}–
                        {slot.end_time?.slice(0, 5)}
                      </span>
                    </div>
                    {slot.room && (
                      <div className="mt-1 text-xs text-slate-500">
                        Room {slot.room}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null
        )}
      </section>

      <AdminNav />
    </main>
  );
}
