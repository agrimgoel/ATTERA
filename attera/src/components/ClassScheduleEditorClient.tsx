"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DAYS } from "@/lib/types";

interface ClassScheduleEditorClientProps {
  classId: string;
  className: string;
  subjects: { id: string; name: string; code: string }[];
  teachers: { id: string; name: string; email: string }[];
  initialSchedules: any[];
}

export default function ClassScheduleEditorClient({
  classId,
  className,
  subjects,
  teachers,
  initialSchedules,
}: ClassScheduleEditorClientProps) {
  const supabase = createClient();
  const router = useRouter();

  const [schedules, setSchedules] = useState<any[]>(initialSchedules);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("10:00");
  const [room, setRoom] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || "");
  const [teacherSearch, setTeacherSearch] = useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);

  const filteredTeachers = teachers.filter((t) =>
    t.name.toLowerCase().includes(teacherSearch.toLowerCase())
  );

  async function handleAddSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeacherId) {
      setError("Please select a teacher from the search list.");
      return;
    }
    if (!selectedSubjectId) {
      setError("Please select a subject.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create or get assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from("assignments")
        .upsert(
          {
            teacher_id: selectedTeacherId,
            subject_id: selectedSubjectId,
            class_id: classId,
          },
          { onConflict: "teacher_id,subject_id,class_id" }
        )
        .select("id")
        .single();

      if (assignmentError) throw assignmentError;

      // 2. Insert schedule slot
      const { error: scheduleError } = await supabase.from("schedules").insert({
        assignment_id: assignment.id,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        room: room || null,
      });

      if (scheduleError) throw scheduleError;

      // Reset form
      setRoom("");
      setTeacherSearch("");
      setSelectedTeacherId("");
      
      // Refresh list
      await refreshSchedules();
    } catch (e: any) {
      setError(e.message || "Failed to add schedule slot.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSlot(slotId: string) {
    if (!confirm("Are you sure you want to delete this schedule slot?")) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.from("schedules").delete().eq("id", slotId);
      if (error) throw error;
      await refreshSchedules();
    } catch (e: any) {
      setError(e.message || "Failed to delete slot.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshSchedules() {
    const { data, error } = await supabase
      .from("schedules")
      .select(`
        id,
        day_of_week,
        start_time,
        end_time,
        room,
        assignment_id,
        assignments!inner (
          id,
          teacher_id,
          subject_id,
          class_id,
          teachers (
            id,
            name
          ),
          subjects (
            id,
            name,
            code
          )
        )
      `)
      .eq("assignments.class_id", classId);

    if (!error && data) {
      setSchedules(data);
    }
  }

  // Group schedules by day of week
  const byDay: Record<number, any[]> = {};
  for (const s of schedules) {
    byDay[s.day_of_week] = byDay[s.day_of_week] ?? [];
    byDay[s.day_of_week].push(s);
  }
  for (const d of Object.keys(byDay)) {
    byDay[Number(d)].sort((x, y) => x.start_time.localeCompare(y.start_time));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Add Slot Card */}
      <div className="card p-5 border border-slate-200">
        <h3 className="font-bold text-navy text-lg mb-4">Add Schedule Slot</h3>
        <form onSubmit={handleAddSlot} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase">Day</label>
              <select
                className="input"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
              >
                {DAYS.map((day, idx) => (
                  <option key={idx} value={idx}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase">Room</label>
              <input
                className="input"
                placeholder="e.g. 301"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase">Start Time</label>
              <input
                type="time"
                className="input"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase">End Time</label>
              <input
                type="time"
                className="input"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase">Subject</label>
            <select
              className="input"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.code} • {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase">Search Teacher</label>
            <input
              type="text"
              className="input"
              placeholder="Type to search teachers..."
              value={teacherSearch}
              onChange={(e) => {
                setTeacherSearch(e.target.value);
                setShowTeacherDropdown(true);
              }}
              onFocus={() => setShowTeacherDropdown(true)}
            />
            {showTeacherDropdown && teacherSearch && (
              <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                {filteredTeachers.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500">No teachers found</div>
                ) : (
                  filteredTeachers.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTeacherId(t.id);
                        setTeacherSearch(t.name);
                        setShowTeacherDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm text-navy border-b border-slate-100 last:border-0"
                    >
                      {t.name} <span className="text-xs text-slate-400">({t.email})</span>
                    </button>
                  ))
                )}
              </div>
            )}
            {selectedTeacherId && (
              <span className="text-xs text-teal mt-1 block">✓ Selected: {teachers.find((t) => t.id === selectedTeacherId)?.name}</span>
            )}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-2"
          >
            {loading ? "Adding..." : "+ Add Slot"}
          </button>
        </form>
      </div>

      {/* Timetable/Days view */}
      <div className="flex flex-col gap-4">
        <h3 className="font-bold text-navy text-lg">Weekly Schedule</h3>
        {DAYS.map((day, idx) => {
          const slots = byDay[idx] || [];
          return (
            <div key={idx} className="card p-4 border border-slate-200">
              <h4 className="font-bold text-navy uppercase text-sm border-b border-slate-100 pb-2">{day}</h4>
              {slots.length === 0 ? (
                <p className="text-xs text-slate-400 mt-2">No slots scheduled</p>
              ) : (
                <div className="mt-3 flex flex-col gap-2">
                  {slots.map((slot: any) => (
                    <div key={slot.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div>
                        <div className="font-semibold text-navy text-sm">
                          {slot.assignments?.subjects?.code} • {slot.assignments?.subjects?.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Teacher: {slot.assignments?.teachers?.name} {slot.room ? `| Room ${slot.room}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-500">
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="text-danger hover:text-red-700 text-xs font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
