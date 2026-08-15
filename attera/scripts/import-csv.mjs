// Bulk import script — run locally, never deployed to Vercel.
//
// Usage:
//   node -r dotenv/config scripts/import-csv.mjs teachers ./teachers.csv
//   node -r dotenv/config scripts/import-csv.mjs students ./students.csv
//
// Requires .env.local (or .env) with:
//   NEXT_PUBLIC_SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...
//
// This creates one Supabase Auth login per row (email + DOB as password)
// and inserts the matching row into the teachers/students table.

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const [, , kind, filePath] = process.argv;

if (!kind || !filePath || !["teachers", "students"].includes(kind)) {
  console.error(
    "Usage: node -r dotenv/config scripts/import-csv.mjs <teachers|students> <path-to-csv>"
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in your environment."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function parseCSV(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(",").map((h) => h.trim());
  return lines
    .filter(Boolean)
    .map((line) => {
      const cells = line.split(",").map((c) => c.trim());
      return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]));
    });
}

async function ensureClass(name) {
  const { data: existing } = await supabase
    .from("classes")
    .select("id")
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("classes")
    .insert({ name })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

async function main() {
  const text = fs.readFileSync(filePath, "utf8");
  const rows = parseCSV(text);
  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    try {
      if (kind === "teachers") {
        const { name, email, dob, role } = row;
        if (!name || !email || !dob) {
          skipped++;
          continue;
        }
        const { data: authUser, error: authErr } =
          await supabase.auth.admin.createUser({
            email: email.toLowerCase(),
            password: dob,
            email_confirm: true,
            user_metadata: { role: role || "teacher", name },
          });
        if (authErr) throw authErr;

        const { error } = await supabase.from("teachers").insert({
          id: authUser.user.id,
          name,
          email: email.toLowerCase(),
          dob,
          role: role || "teacher",
        });
        if (error) throw error;
      } else {
        const { name, roll_no, class: className, email, dob } = row;
        if (!name || !roll_no || !className || !email || !dob) {
          skipped++;
          continue;
        }
        const classId = await ensureClass(className);

        const { data: authUser, error: authErr } =
          await supabase.auth.admin.createUser({
            email: email.toLowerCase(),
            password: dob,
            email_confirm: true,
            user_metadata: { role: "student", name },
          });
        if (authErr) throw authErr;

        const { error } = await supabase.from("students").insert({
          id: authUser.user.id,
          name,
          roll_no,
          class_id: classId,
          email: email.toLowerCase(),
          dob,
        });
        if (error) throw error;
      }
      created++;
      process.stdout.write(`\rImported ${created}, skipped ${skipped}...`);
    } catch (e) {
      skipped++;
      console.error(`\nFailed row (${row.email ?? "?"}): ${e.message}`);
    }
  }

  console.log(`\nDone. ${created} ${kind} imported, ${skipped} skipped.`);
}

main();
