import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// DANGER: this client uses the service_role key and bypasses Row Level
// Security entirely. It must NEVER be imported from a "use client" file or
// shipped to the browser. Only import this inside:
//   - src/app/api/**/route.ts  (Route Handlers, run server-side)
//   - scripts/*.mjs            (CLI scripts)
// It is used for exactly two things in this app:
//   1. Creating auth logins + rows when importing teacher/student CSVs
//   2. The HOD's "upload CSV" API route
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
