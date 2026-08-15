import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// This route runs ONLY on the server. It is the one place allowed to use
// the service-role key, and only after confirming (via the caller's own
// session cookie) that they are logged in as an HOD.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: teacherRow } = await supabase
    .from("teachers")
    .select("role")
    .eq("id", user.id)
    .single();

  if (teacherRow?.role !== "hod") {
    return NextResponse.json(
      { error: "Only an HOD account can bulk-import data" },
      { status: 403 }
    );
  }

  const { kind, rows } = (await req.json()) as {
    kind: "teachers" | "students";
    rows: Record<string, string>[];
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows found in CSV" }, { status: 400 });
  }

  const admin = createAdminClient();
  let created = 0;
  let skipped = 0;

  if (kind === "teachers") {
    for (const row of rows) {
      const name = row.name?.trim();
      const email = row.email?.trim().toLowerCase();
      const dob = row.dob?.trim();
      const role = (row.role?.trim().toLowerCase() as "teacher" | "hod") || "teacher";
      if (!name || !email || !dob) {
        skipped++;
        continue;
      }

      const { data: authUser, error: authErr } =
        await admin.auth.admin.createUser({
          email,
          password: dob,
          email_confirm: true,
          user_metadata: { role, name },
        });

      if (authErr || !authUser.user) {
        skipped++;
        continue;
      }

      const { error: insertErr } = await admin.from("teachers").insert({
        id: authUser.user.id,
        name,
        email,
        dob,
        role,
      });

      if (insertErr) {
        skipped++;
        continue;
      }
      created++;
    }
  } else {
    for (const row of rows) {
      const name = row.name?.trim();
      const rollNo = row.roll_no?.trim();
      const className = row.class?.trim();
      const email = row.email?.trim().toLowerCase();
      const dob = row.dob?.trim();
      if (!name || !rollNo || !className || !email || !dob) {
        skipped++;
        continue;
      }

      // ensure the class exists (auto-create classes as they appear in the CSV)
      let { data: classRow } = await admin
        .from("classes")
        .select("id")
        .eq("name", className)
        .single();

      if (!classRow) {
        const { data: newClass, error: classErr } = await admin
          .from("classes")
          .insert({ name: className })
          .select("id")
          .single();
        if (classErr || !newClass) {
          skipped++;
          continue;
        }
        classRow = newClass;
      }

      const { data: authUser, error: authErr } =
        await admin.auth.admin.createUser({
          email,
          password: dob,
          email_confirm: true,
          user_metadata: { role: "student", name },
        });

      if (authErr || !authUser.user) {
        skipped++;
        continue;
      }

      const { error: insertErr } = await admin.from("students").insert({
        id: authUser.user.id,
        name,
        roll_no: rollNo,
        class_id: classRow.id,
        email,
        dob,
      });

      if (insertErr) {
        skipped++;
        continue;
      }
      created++;
    }
  }

  return NextResponse.json({ created, skipped });
}
