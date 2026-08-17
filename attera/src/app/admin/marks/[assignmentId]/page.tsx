import { createClient } from "@/lib/supabase/server";
import MarksEntryClient from "@/components/MarksEntryClient";
import AdminNav from "@/components/AdminNav";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    assignmentId: string;
  }>;
}

export default async function MarksEntryPage({ params }: PageProps) {
  const resolvedParams = await params;
  const assignmentId = resolvedParams.assignmentId;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Fetch assignment details
  const { data: assignment } = await supabase
    .from("assignments")
    .select(`
      id,
      class_id,
      subject_id,
      classes (name),
      subjects (name, code)
    `)
    .eq("id", assignmentId)
    .single();

  if (!assignment) {
    return notFound();
  }

  // 2. Fetch all students in the assigned class
  const { data: students } = await supabase
    .from("students")
    .select("id, name, roll_no")
    .eq("class_id", (assignment as any).class_id)
    .order("name");

  // 3. Fetch existing marks for this subject
  const { data: initialMarks } = await supabase
    .from("marks")
    .select("*")
    .eq("subject_id", (assignment as any).subject_id);

  return (
    <main className="pb-24">
      <header className="px-5 pt-6 flex items-center gap-3">
        <Link href="/admin/marks" className="text-navy text-xl">
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-navy">Class {(assignment as any).classes?.name} Marks</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {(assignment as any).subjects?.code} • {(assignment as any).subjects?.name}
          </p>
        </div>
      </header>

      <section className="mt-6 px-5">
        <MarksEntryClient
          assignmentId={assignment.id}
          classId={(assignment as any).class_id}
          subjectId={(assignment as any).subject_id}
          students={students ?? []}
          teacherId={user!.id}
          initialMarks={initialMarks ?? []}
        />
      </section>

      <AdminNav />
    </main>
  );
}
