"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toCSV, pct } from "@/lib/utils";
import AdminNav from "@/components/AdminNav";

interface Row {
  roll_no: string;
  name: string;
  present: number;
  absent: number;
  total: number;
  percentage: number;
}

export default function ReportsPage() {
  const supabase = createClient();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentId, setAssignmentId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("assignments")
        .select("id, subjects(name, code), classes(name)")
        .eq("teacher_id", user!.id);
      setAssignments(data ?? []);
    })();
  }, []);

  async function loadReport(id: string) {
    setAssignmentId(id);
    setLoading(true);
    const a = assignments.find((x) => x.id === id);
    setLabel(`${a?.subjects?.code} • Class ${a?.classes?.name}`);

    const { data: attendance } = await supabase
      .from("attendance")
      .select("student_id, status, students(name, roll_no)")
      .eq("assignment_id", id);

    const byStudent: Record<string, Row> = {};
    for (const r of attendance ?? []) {
      const sid = r.student_id;
      const st = (r as any).students;
      if (!byStudent[sid]) {
        byStudent[sid] = {
          roll_no: st?.roll_no ?? "",
          name: st?.name ?? "",
          present: 0,
          absent: 0,
          total: 0,
          percentage: 0,
        };
      }
      byStudent[sid].total += 1;
      if (r.status === "present") byStudent[sid].present += 1;
      else byStudent[sid].absent += 1;
    }
    const list = Object.values(byStudent)
      .map((r) => ({ ...r, percentage: pct(r.present, r.total) }))
      .sort((a, b) => a.roll_no.localeCompare(b.roll_no));

    setRows(list);
    setLoading(false);
  }

  function downloadCSV() {
    const csv = toCSV(
      rows.map((r) => ({
        "Roll No": r.roll_no,
        Name: r.name,
        "Classes Attended": r.present,
        Absent: r.absent,
        "Total Classes": r.total,
        "Attendance %": r.percentage,
      }))
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${label.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="pb-24">
      <header className="px-5 pt-6">
        <h1 className="text-2xl font-bold text-navy">Export Reports</h1>
      </header>

      <section className="mt-4 px-5">
        <select
          className="input"
          value={assignmentId}
          onChange={(e) => loadReport(e.target.value)}
        >
          <option value="">Select a class...</option>
          {assignments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.subjects?.code} • Class {a.classes?.name}
            </option>
          ))}
        </select>
      </section>

      {loading && (
        <p className="mt-4 px-5 text-sm text-slate-500">Loading...</p>
      )}

      {!loading && rows.length > 0 && (
        <section className="mt-4 px-5" id="printable">
          <div className="mb-3 flex gap-2">
            <button onClick={downloadCSV} className="btn-primary flex-1">
              Download CSV
            </button>
            <button
              onClick={() => window.print()}
              className="btn-outline flex-1"
            >
              Export as PDF
            </button>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-500">
                <tr>
                  <th className="p-3">Roll</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Present</th>
                  <th className="p-3">Absent</th>
                  <th className="p-3">%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.roll_no} className="border-t border-slate-100">
                    <td className="p-3">{r.roll_no}</td>
                    <td className="p-3">{r.name}</td>
                    <td className="p-3">{r.present}</td>
                    <td className="p-3">{r.absent}</td>
                    <td
                      className={`p-3 font-semibold ${
                        r.percentage < 75 ? "text-danger" : "text-teal"
                      }`}
                    >
                      {r.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <AdminNav />
    </main>
  );
}
