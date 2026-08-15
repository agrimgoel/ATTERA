import { createClient } from "@/lib/supabase/server";
import StudentNav from "@/components/StudentNav";
import { DAYS } from "@/lib/types";

export default async function StudentSchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select("class_id")
    .eq("id", user!.id)
    .single();

  const { data: schedule } = await supabase
    .from("schedules")
    .select(
      "id, day_of_week, start_time, end_time, room, assignments!inner(class_id, subjects(name, code), teachers(name))"
    )
    .eq("assignments.class_id", student?.class_id)
    .order("start_time");

  const byDay: Record<number, any[]> = {};
  for (const row of schedule ?? []) {
    byDay[row.day_of_week] = byDay[row.day_of_week] ?? [];
    byDay[row.day_of_week].push(row);
  }

  return (
    <main className="pb-24">
      <header className="px-5 pt-6">
        <h1 className="text-2xl font-bold text-navy">Weekly Schedule</h1>
      </header>

      <section className="mt-4 px-5">
        {DAYS.map((day, idx) =>
          byDay[idx] ? (
            <div key={idx} className="mt-5">
              <h2 className="text-sm font-bold uppercase text-slate-400">
                {day}
              </h2>
              <div className="mt-2 flex flex-col gap-2">
                {byDay[idx].map((row: any) => (
                  <div key={row.id} className="card p-4">
                    <div className="flex justify-between">
                      <span className="font-semibold text-navy">
                        {row.assignments?.subjects?.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {row.start_time?.slice(0, 5)}–
                        {row.end_time?.slice(0, 5)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {row.assignments?.teachers?.name}
                      {row.room ? ` • Room ${row.room}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null
        )}
      </section>

      <StudentNav />
    </main>
  );
}
