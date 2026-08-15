"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ClassRow, DAYS, SubjectRow } from "@/lib/types";

interface DraftSlot {
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string;
}

export default function SetupPage() {
  const supabase = createClient();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjectId, setSubjectId] = useState<string>("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [slots, setSlots] = useState<DraftSlot[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: c }] = await Promise.all([
        supabase.from("subjects").select("*").order("name"),
        supabase.from("classes").select("*").order("name"),
      ]);
      setSubjects(s ?? []);
      setClasses(c ?? []);
    })();
  }, []);

  function toggleClass(id: string) {
    setSelectedClassIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function addSlot() {
    if (selectedClassIds.length === 0) return;
    setSlots((prev) => [
      ...prev,
      {
        class_id: selectedClassIds[0],
        day_of_week: 1,
        start_time: "10:00",
        end_time: "11:00",
        room: "",
      },
    ]);
  }

  function updateSlot(idx: number, patch: Partial<DraftSlot>) {
    setSlots((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    );
  }

  function removeSlot(idx: number) {
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  }

  async function saveAll() {
    setSaving(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // 1. create one assignment per selected class for this subject
      const assignmentIds: Record<string, string> = {};
      for (const class_id of selectedClassIds) {
        const { data, error } = await supabase
          .from("assignments")
          .upsert(
            { teacher_id: user.id, subject_id: subjectId, class_id },
            { onConflict: "teacher_id,subject_id,class_id" }
          )
          .select("id, class_id")
          .single();
        if (error) throw error;
        assignmentIds[class_id] = data.id;
      }

      // 2. insert every schedule slot against the right assignment
      const rows = slots.map((slot) => ({
        assignment_id: assignmentIds[slot.class_id],
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        room: slot.room || null,
      }));
      if (rows.length > 0) {
        const { error } = await supabase.from("schedules").insert(rows);
        if (error) throw error;
      }

      router.push("/admin/dashboard");
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? "Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen px-5 pb-10 pt-6">
      <h1 className="text-2xl font-bold text-navy">Set up a class</h1>
      <p className="mt-1 text-sm text-slate-500">
        Step {step} of 3 —{" "}
        {step === 1
          ? "Select your subject"
          : step === 2
          ? "Select your classes"
          : "Add weekly lecture schedule"}
      </p>

      {step === 1 && (
        <div className="mt-6 flex flex-col gap-2">
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => setSubjectId(s.id)}
              className={`card flex items-center justify-between p-4 text-left ${
                subjectId === s.id ? "border-navy ring-1 ring-navy" : ""
              }`}
            >
              <span>
                <span className="font-semibold text-navy">{s.code}</span>
                <span className="ml-2 text-sm text-slate-500">{s.name}</span>
              </span>
              {subjectId === s.id && <span className="text-teal">✓</span>}
            </button>
          ))}
          <button
            disabled={!subjectId}
            onClick={() => setStep(2)}
            className="btn-primary mt-4"
          >
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 flex flex-col gap-2">
          {classes.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleClass(c.id)}
              className={`card flex items-center justify-between p-4 text-left ${
                selectedClassIds.includes(c.id)
                  ? "border-navy ring-1 ring-navy"
                  : ""
              }`}
            >
              <span className="font-semibold text-navy">Class {c.name}</span>
              {selectedClassIds.includes(c.id) && (
                <span className="text-teal">✓</span>
              )}
            </button>
          ))}
          <div className="mt-4 flex gap-3">
            <button onClick={() => setStep(1)} className="btn-outline flex-1">
              Back
            </button>
            <button
              disabled={selectedClassIds.length === 0}
              onClick={() => setStep(3)}
              className="btn-primary flex-1"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-6 flex flex-col gap-3">
          {slots.map((slot, idx) => (
            <div key={idx} className="card p-4">
              <div className="flex items-center justify-between">
                <select
                  className="input w-auto"
                  value={slot.class_id}
                  onChange={(e) =>
                    updateSlot(idx, { class_id: e.target.value })
                  }
                >
                  {selectedClassIds.map((id) => {
                    const c = classes.find((x) => x.id === id);
                    return (
                      <option key={id} value={id}>
                        Class {c?.name}
                      </option>
                    );
                  })}
                </select>
                <button
                  onClick={() => removeSlot(idx)}
                  className="text-sm text-danger"
                >
                  Remove
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select
                  className="input"
                  value={slot.day_of_week}
                  onChange={(e) =>
                    updateSlot(idx, { day_of_week: Number(e.target.value) })
                  }
                >
                  {DAYS.map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  placeholder="Room"
                  value={slot.room}
                  onChange={(e) => updateSlot(idx, { room: e.target.value })}
                />
                <input
                  type="time"
                  className="input"
                  value={slot.start_time}
                  onChange={(e) =>
                    updateSlot(idx, { start_time: e.target.value })
                  }
                />
                <input
                  type="time"
                  className="input"
                  value={slot.end_time}
                  onChange={(e) =>
                    updateSlot(idx, { end_time: e.target.value })
                  }
                />
              </div>
            </div>
          ))}

          <button onClick={addSlot} className="btn-outline">
            + Add lecture slot
          </button>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="mt-2 flex gap-3">
            <button onClick={() => setStep(2)} className="btn-outline flex-1">
              Back
            </button>
            <button
              disabled={saving}
              onClick={saveAll}
              className="btn-primary flex-1"
            >
              {saving ? "Saving..." : "Save schedule"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
