"use client";

import { createBrowserClient } from "@supabase/ssr";

// Used inside client components. The anon key is safe to expose — access
// control is enforced by the RLS policies in supabase/schema.sql, not by
// keeping this key secret.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
