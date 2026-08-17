import { createClient } from "@/lib/supabase/server";
import ClassScheduleEditorClient from "@/components/ClassScheduleEditorClient";
import AdminNav from "@/components/AdminNav";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    classId: string;
  }>;
}

export default async function ClassSchedulePage({ params }: PageProps) {
  const resolvedParams = await params;
  const classId = resolvedParams.classId;
  const supabase = await createClient();

  // 1. Fetch class details
  const { data: cls } = await supabase
    .from("classes")
    .select("id, name")
    .eq("id", classId)
    .single();

  if (!cls) {
    return notFound();
  }

  // 2. Fetch all subjects
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, code")
    .order("name");

  // 3. Fetch all teachers (excluding system_checker to only assign real teaching staff)
  const { data: teachers } = await supabase
    .from("teachers")
    .select("id, name, email")
    .neq("role", "system_checker")
    .order("name");

  // 4. Fetch initial schedules for this class
  const { data: initialSchedules } = await supabase
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

  return (
    <main className="pb-24">
      <header className="px-5 pt-6 flex items-center gap-3">
        <Link href="/admin/system-checker" className="text-navy text-xl">
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-navy">Schedule for Class {cls.name}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage schedule slots and assignments</p>
        </div>
      </header>

      <section className="mt-6 px-5">
        <ClassScheduleEditorClient
          classId={cls.id}
          className={cls.name}
          subjects={subjects ?? []}
          teachers={teachers ?? []}
          initialSchedules={initialSchedules ?? []}
        />
      </section>

      <AdminNav />
    </main>
  );
}
