"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Student {
  id: string;
  name: string;
  roll_no: string;
}

interface MarksEntryClientProps {
  assignmentId: string;
  classId: string;
  subjectId: string;
  students: Student[];
  teacherId: string;
  initialMarks: any[];
}

export default function MarksEntryClient({
  assignmentId,
  classId,
  subjectId,
  students,
  teacherId,
  initialMarks,
}: MarksEntryClientProps) {
  const supabase = createClient();

  const [testType, setTestType] = useState<"ST1" | "ST2" | "PUT">("ST1");
  const [testName, setTestName] = useState("");
  const [totalMarks, setTotalMarks] = useState<number>(100);
  const [marksRecord, setMarksRecord] = useState<Record<string, number>>({});
  const [allMarks, setAllMarks] = useState<any[]>(initialMarks);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When testType changes, pre-fill the form with existing database records
  useEffect(() => {
    const filtered = allMarks.filter((m) => m.test_type === testType);
    const newRecord: Record<string, number> = {};
    
    if (filtered.length > 0) {
      setTestName(filtered[0].test_name || "");
      setTotalMarks(Number(filtered[0].total_marks) || 100);
      for (const m of filtered) {
        newRecord[m.student_id] = Number(m.given_marks);
      }
    } else {
      setTestName("");
      setTotalMarks(100);
    }
    
    // Fill in default 0 for students with no marks
    for (const student of students) {
      if (newRecord[student.id] === undefined) {
        newRecord[student.id] = 0;
      }
    }
    
    setMarksRecord(newRecord);
    setSuccess(false);
    setError(null);
  }, [testType, allMarks, students]);

  function handleMarkChange(studentId: string, value: string) {
    const numericVal = parseFloat(value) || 0;
    setMarksRecord((prev) => ({
      ...prev,
      [studentId]: numericVal,
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);

    // Validate marks are not greater than total marks
    for (const student of students) {
      const mark = marksRecord[student.id] ?? 0;
      if (mark > totalMarks) {
        setError(`Marks for ${student.name} cannot be greater than Total Marks (${totalMarks}).`);
        setLoading(false);
        return;
      }
      if (mark < 0) {
        setError(`Marks for ${student.name} cannot be negative.`);
        setLoading(false);
        return;
      }
    }

    try {
      const rows = students.map((s) => ({
        student_id: s.id,
        subject_id: subjectId,
        test_type: testType,
        test_name: testName || `${testType} Exam`,
        total_marks: totalMarks,
        given_marks: marksRecord[s.id] ?? 0,
        marked_by: teacherId,
      }));

      // Upsert to marks table
      const { error } = await supabase
        .from("marks")
        .upsert(rows, { onConflict: "student_id,subject_id,test_type" });

      if (error) throw error;

      setSuccess(true);
      
      // Refetch from database to sync local state
      const { data } = await supabase
        .from("marks")
        .select("*")
        .eq("subject_id", subjectId);
      
      if (data) {
        setAllMarks(data);
      }
    } catch (e: any) {
      setError(e.message || "Failed to save marks.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      {/* Test details */}
      <div className="card p-5 border border-slate-200 flex flex-col gap-4">
        <h3 className="font-bold text-navy text-lg">Test Configurations</h3>
        
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase">Test / Exam Type</label>
          <select
            className="input"
            value={testType}
            onChange={(e) => setTestType(e.target.value as any)}
          >
            <option value="ST1">Sessional Test 1 (ST1)</option>
            <option value="ST2">Sessional Test 2 (ST2)</option>
            <option value="PUT">Pre University Test (PUT)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase">Test Name / Description</label>
            <input
              className="input"
              placeholder="e.g. Unit Test 1"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase">Total Marks</label>
            <input
              type="number"
              className="input"
              required
              min={1}
              value={totalMarks}
              onChange={(e) => setTotalMarks(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>

      {/* Student list and marks inputs */}
      <div className="card p-4 border border-slate-200">
        <h3 className="font-bold text-navy text-lg mb-4">Student Marks Roll</h3>
        
        {students.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No students enrolled in this section.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {students.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex-1 pr-4">
                  <div className="font-semibold text-navy text-sm">{student.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{student.roll_no}</div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Given Marks:</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input w-24 text-right"
                    min={0}
                    max={totalMarks}
                    value={marksRecord[student.id] ?? ""}
                    onChange={(e) => handleMarkChange(student.id, e.target.value)}
                  />
                  <span className="text-sm text-slate-400 font-semibold">/ {totalMarks}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {success && <p className="text-sm text-teal font-semibold">✓ Marks saved successfully!</p>}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary"
      >
        {loading ? "Saving Marks..." : "Save Marks to Database"}
      </button>
    </form>
  );
}
