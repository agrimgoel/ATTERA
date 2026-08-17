import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import { DAYS } from "@/lib/types";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: teacher } = await supabase
    .from("teachers")
    .select("name, role")
    .eq("id", user!.id)
    .single();

  if (teacher?.role === "hod") {
    // HOD gets the institution-wide view instead of a personal timetable
    const { redirect } = await import("next/navigation");
    redirect("/admin/hod");
  }

  if (teacher?.role === "system_checker") {
    const { redirect } = await import("next/navigation");
    redirect("/admin/system-checker");
  }

  const today = new Date();
  const dow = today.getDay();
  const todayLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const { data: todaysClasses } = await supabase
    .from("schedules")
    .select(
      "id, start_time, end_time, room, assignment_id, assignments(id, subjects(name, code), classes(name))"
    )
    .eq("day_of_week", dow)
    .order("start_time");

  // Only this teacher's own classes today (RLS also enforces this, this is
  // just for ordering/display convenience)
  const myClasses = (todaysClasses ?? []).filter(
    (row: any) => row.assignments
  );

  return (
    <main className="pb-24">
      <header className="flex items-center justify-between px-5 pt-6">
        <div>
          <span className="text-xl font-bold text-navy">ATTERA</span>
        </div>
        <LogoutButton redirectTo="/admin/login" />
      </header>

      <section className="px-5 pt-6">
        <h1 className="text-2xl font-bold text-navy">
          Hello, {teacher?.name ?? "Teacher"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here is your daily overview for {todayLabel}.
        </p>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3 px-5">
        <Link
          href="/admin/attendance"
          className="rounded-xl bg-navy p-4 text-white"
        >
          <div className="text-lg">✓</div>
          <div className="mt-2 font-semibold">Mark Attendance</div>
          <div className="text-xs text-slate-300">
            {myClasses.length} classes today
          </div>
        </Link>
        <Link
          href="/admin/schedule"
          className="rounded-xl bg-white border border-slate-200 p-4"
        >
          <div className="text-lg">📅</div>
          <div className="mt-2 font-semibold text-navy">View Schedule</div>
          <div className="text-xs text-slate-500">
            {myClasses.length} classes today
          </div>
        </Link>
      </section>

      <section className="mt-3 px-5">
        <Link
          href="/admin/marks"
          className="card flex items-center gap-3 p-4 border border-teal/20 bg-teal/5 hover:bg-teal/10 hover:border-teal transition-all"
        >
          <div className="text-lg">📝</div>
          <div>
            <div className="font-semibold text-navy">Enter Marks</div>
            <div className="text-xs text-slate-500">
              Submit grades for ST1, ST2, and PUT
            </div>
          </div>
        </Link>
      </section>

      <section className="mt-3 px-5">
        <Link
          href="/admin/reports"
          className="card flex items-center gap-3 p-4"
        >
          <div className="text-lg">📊</div>
          <div>
            <div className="font-semibold text-navy">Export Reports</div>
            <div className="text-xs text-slate-500">
              Download attendance sheets
            </div>
          </div>
        </Link>
      </section>

      <section className="mt-6 px-5">
        <h2 className="text-lg font-bold text-navy">Today&apos;s Timeline</h2>
        <div className="mt-3 flex flex-col gap-3">
          {myClasses.length === 0 && (
            <p className="text-sm text-slate-500">
              No lectures scheduled for today ({DAYS[dow]}).
            </p>
          )}
          {myClasses.map((row: any) => (
            <div key={row.id} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-navy">
                  {row.assignments.subjects?.code} —{" "}
                  {row.assignments.subjects?.name}
                </span>
                <span className="rounded-full bg-teal-light px-2 py-0.5 text-xs text-teal">
                  {row.start_time?.slice(0, 5)}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Class {row.assignments.classes?.name}
                {row.room ? ` • Room ${row.room}` : ""}
              </div>
              <Link
                href={`/admin/attendance/${row.assignment_id}?schedule_id=${row.id}`}
                className="btn-primary mt-3 inline-block py-2 px-4 text-sm"
              >
                Mark Attendance
              </Link>
            </div>
          ))}
        </div>
      </section>

      <AdminNav />
    </main>
  );
}
