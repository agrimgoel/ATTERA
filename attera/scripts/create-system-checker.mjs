// Script to create a system checker login in Supabase auth and teachers table.
// Usage: node -r dotenv/config scripts/create-system-checker.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const email = "systemchecker@college.edu";
  const password = "2000-01-01"; // DOB as password
  const name = "System Checker";
  const dob = "2000-01-01";
  const role = "system_checker";

  console.log(`Creating user: ${email}...`);

  // 1. Create auth user
  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, name },
  });

  if (authErr) {
    if (authErr.message.includes("already exists")) {
      console.log("Auth user already exists. Fetching existing user...");
      const { data: users, error: listErr } = await supabase.auth.admin.listUsers();
      if (listErr) throw listErr;
      const existing = users.users.find((u) => u.email === email);
      if (!existing) throw new Error("Could not find existing user");
      
      // Upsert into teachers table
      const { error: insertErr } = await supabase.from("teachers").upsert({
        id: existing.id,
        name,
        email,
        dob,
        role,
      });
      if (insertErr) throw insertErr;
      console.log("System Checker successfully updated in database.");
      return;
    }
    throw authErr;
  }

  // 2. Insert into teachers table
  const { error: insertErr } = await supabase.from("teachers").insert({
    id: authUser.user.id,
    name,
    email,
    dob,
    role,
  });

  if (insertErr) throw insertErr;

  console.log("\n==============================================");
  console.log("System Checker login successfully created!");
  console.log(`Email: ${email}`);
  console.log(`Password (DOB): ${dob}`);
  console.log("==============================================");
}

run().catch((e) => {
  console.error("Error creating system checker:", e.message);
});
