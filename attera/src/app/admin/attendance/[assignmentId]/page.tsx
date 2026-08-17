"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { initials, todayISO } from "@/lib/utils";
import Papa from "papaparse";

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

  async function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    setSavedMsg("Parsing CSV...");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSavedMsg("Error: Not logged in.");
      setSaving(false);
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const headers = results.meta.fields || [];
          
          // Find the roll number column
          const rollNoHeader = headers.find(h => 
            h.toLowerCase() === "roll_no" || 
            h.toLowerCase() === "rollno" || 
            h.toLowerCase() === "roll number" ||
            h.toLowerCase() === "roll"
          );

          if (!rollNoHeader) {
            throw new Error("CSV must contain a 'roll_no' column.");
          }

          // Find headers that are valid dates (e.g. 2026-08-01, 08/01/2026)
          const dateCols: { header: string; dateStr: string }[] = [];
          for (const header of headers) {
            if (header === rollNoHeader) continue;
            // Clean up header and test if it is a valid date
            const cleaned = header.trim();
            const d = new Date(cleaned);
            if (!isNaN(d.getTime())) {
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, "0");
              const day = String(d.getDate()).padStart(2, "0");
              dateCols.push({ header, dateStr: `${y}-${m}-${day}` });
            }
          }

          // If we found date columns, it's a multi-date Excel CSV
          if (dateCols.length > 0) {
            setSavedMsg(`Uploading attendance for ${dateCols.length} dates...`);
            const upsertRows: any[] = [];
            let matchedStudents = 0;

            for (const row of results.data as any[]) {
              const rollNoVal = row[rollNoHeader]?.trim();
              if (!rollNoVal) continue;

              const matchedStudent = students.find((s) => s.roll_no === rollNoVal);
              if (!matchedStudent) continue;
              matchedStudents++;

              for (const { header, dateStr } of dateCols) {
                const statusVal = row[header]?.trim().toLowerCase();
                if (!statusVal) continue;

                const status = statusVal.includes("present") || statusVal === "p" || statusVal === "1" || statusVal.includes("pres") ? "present" : "absent";
                upsertRows.push({
                  assignment_id: assignmentId,
                  student_id: matchedStudent.id,
                  class_date: dateStr,
                  status,
                  marked_by: user.id,
                  schedule_id: scheduleId || null,
                });
              }
            }

            if (upsertRows.length === 0) {
              throw new Error("No matching student roll numbers or attendance records found in the CSV.");
            }

            // Perform bulk database upsert in chunks of 500
            const chunkSize = 500;
            for (let i = 0; i < upsertRows.length; i += chunkSize) {
              const chunk = upsertRows.slice(i, i + chunkSize);
              const { error } = await supabase
                .from("attendance")
                .upsert(chunk, { onConflict: "assignment_id,student_id,class_date,schedule_id" });
              if (error) throw error;
            }

            setSavedMsg(`Successfully uploaded ${upsertRows.length} attendance records across ${matchedStudents} students for ${dateCols.length} dates!`);
          } else {
            // Single-date CSV fallback (contains roll_no and status columns)
            const statusHeader = headers.find(h => h.toLowerCase() === "status" || h.toLowerCase() === "attendance");
            if (!statusHeader) {
              throw new Error("CSV must contain date columns (e.g. 2026-08-01) or a 'status' column.");
            }

            let matched = 0;
            const rows = results.data as any[];

            setStudents((prev) => {
              const updated = [...prev];
              for (const row of rows) {
                const rNo = row[rollNoHeader]?.trim();
                const statusStr = row[statusHeader]?.trim().toLowerCase();
                if (!rNo || !statusStr) continue;

                const normalizedStatus = statusStr.includes("present") || statusStr === "p" || statusStr.includes("pres") ? "present" : "absent";
                const idx = updated.findIndex((s) => s.roll_no === rNo);
                if (idx !== -1) {
                  updated[idx] = { ...updated[idx], status: normalizedStatus };
                  matched++;
                }
              }
              return updated;
            });

            setSavedMsg(`Imported single-date attendance for ${matched} students. Click 'Save Attendance' below to store.`);
          }
        } catch (err: any) {
          setSavedMsg(`Error: ${err.message || "Failed to process CSV."}`);
        } finally {
          setSaving(false);
        }
      },
      error: (err) => {
        setSavedMsg(`CSV Parsing Error: ${err.message}`);
        setSaving(false);
      }
    });
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
        <div className="flex gap-2 mt-2">
          <button
            onClick={markAllPresent}
            className="btn-primary flex-1 py-2"
          >
            Mark All Present
          </button>
          <label className="btn-outline flex-1 py-2 text-center cursor-pointer text-xs font-semibold flex items-center justify-center">
            📤 Upload CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCSVUpload}
            />
          </label>
        </div>
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
