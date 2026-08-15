"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { initials, todayISO } from "@/lib/utils";

interface StudentAttendance {
  id: string;
  name: string;
  roll_no: string;
  status: "present" | "absent" | null;
}

export default function MarkAttendancePage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const searchParams = useSearchParams();
  const scheduleId = searchParams.get("schedule_id");
  const supabase = createClient();

  const [subjectLabel, setSubjectLabel] = useState("");
  const [className, setClassName] = useState("");
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());

  useEffect(() => {
    (async () => {
      const { data: assignment } = await supabase
        .from("assignments")
        .select("class_id, subjects(name, code), classes(name)")
        .eq("id", assignmentId)
        .single();

      if (!assignment) return;
      setSubjectLabel(
        `${(assignment as any).subjects?.code} - ${
          (assignment as any).subjects?.name
        }`
      );
      setClassName((assignment as any).classes?.name);

      const { data: classStudents } = await supabase
        .from("students")
        .select("id, name, roll_no")
        .eq("class_id", assignment.class_id)
        .order("roll_no");

      const query = supabase
        .from("attendance")
        .select("student_id, status")
        .eq("assignment_id", assignmentId)
        .eq("class_date", date);

      if (scheduleId) {
        query.eq("schedule_id", scheduleId);
      } else {
        query.is("schedule_id", null);
      }

      const { data: existing } = await query;

      const statusMap = new Map(
        (existing ?? []).map((r) => [r.student_id, r.status])
      );

      setStudents(
        (classStudents ?? []).map((s) => ({
          ...s,
          status: (statusMap.get(s.id) as any) ?? null,
        }))
      );
    })();
  }, [assignmentId, date]);

  const filtered = useMemo(
    () =>
      students.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.roll_no.toLowerCase().includes(search.toLowerCase())
      ),
    [students, search]
  );

  const markedCount = students.filter((s) => s.status !== null).length;

  function setStatus(id: string, status: "present" | "absent") {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  }

  function markAllPresent() {
    setStudents((prev) => prev.map((s) => ({ ...s, status: "present" })));
  }

  async function saveAttendance() {
    setSaving(true);
    setSavedMsg(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const rows = students
      .filter((s) => s.status !== null)
      .map((s) => ({
        assignment_id: assignmentId,
        student_id: s.id,
        class_date: date,
        status: s.status,
        marked_by: user!.id,
        schedule_id: scheduleId || null,
      }));

    const { error } = await supabase
      .from("attendance")
      .upsert(rows, { onConflict: "assignment_id,student_id,class_date,schedule_id" });

    setSaving(false);
    setSavedMsg(error ? "Failed to save. Try again." : "Attendance saved.");
  }

  return (
    <main className="min-h-screen pb-28">
      <header className="flex items-center gap-3 px-5 pt-6">
        <Link href="/admin/attendance" className="text-xl text-navy">
          ←
        </Link>
        <h1 className="text-xl font-bold text-navy">Mark Attendance</h1>
      </header>

      <section className="mt-4 px-5">
        <div className="card p-4">
          <h2 className="text-lg font-bold text-navy">{subjectLabel}</h2>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>📄 Class {className}</span>
            <div className="flex items-center gap-1">
              <span>📅</span>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setSavedMsg(null);
                }}
                className="rounded border border-slate-200 px-1 py-0.5 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-3">
            <div className="flex-1 rounded-lg bg-slate-100 p-2 text-center">
              <div className="text-xs text-slate-500">Total</div>
              <div className="font-bold text-navy">{students.length}</div>
            </div>
            <div className="flex-1 rounded-lg bg-teal-light p-2 text-center">
              <div className="text-xs text-teal">Marked</div>
              <div className="font-bold text-teal">{markedCount}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 px-5">
        <input
          className="input"
          placeholder="Search by name or roll number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={markAllPresent}
          className="btn-primary mt-2 w-full py-2"
        >
          Mark All Present
        </button>
      </section>

      <section className="mt-4 flex flex-col gap-3 px-5">
        {filtered.map((s) => (
          <div key={s.id} className="card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-navy">
                {initials(s.name)}
              </div>
              <div>
                <div className="font-semibold text-navy">{s.name}</div>
                <div className="text-xs text-slate-500">{s.roll_no}</div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200">
              <button
                onClick={() => setStatus(s.id, "present")}
                className={`py-2 text-sm font-semibold ${
                  s.status === "present"
                    ? "bg-teal text-white"
                    : "bg-white text-slate-600"
                }`}
              >
                PRESENT
              </button>
              <button
                onClick={() => setStatus(s.id, "absent")}
                className={`py-2 text-sm font-semibold ${
                  s.status === "absent"
                    ? "bg-danger text-white"
                    : "bg-white text-slate-600"
                }`}
              >
                ABSENT
              </button>
            </div>
          </div>
        ))}
      </section>

      <div className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white p-4">
        {savedMsg && (
          <p className="mb-2 text-center text-sm text-slate-500">
            {savedMsg}
          </p>
        )}
        <button
          onClick={saveAttendance}
          disabled={saving}
          className="btn-primary w-full"
        >
          {saving ? "Saving..." : "Save Attendance"}
        </button>
      </div>
    </main>
  );
}
