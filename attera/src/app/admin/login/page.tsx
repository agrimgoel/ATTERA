"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLogin() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: dob, // DOB (YYYY-MM-DD) was set as the password at CSV import time
    });

    if (error) {
      setError("Login failed. Check your official email and date of birth.");
      setLoading(false);
      return;
    }

    const role = data.user?.user_metadata?.role;
    if (role !== "teacher" && role !== "hod" && role !== "system_checker") {
      await supabase.auth.signOut();
      setError("This login is not registered as an authorized account.");
      setLoading(false);
      return;
    }

    // Session is persisted automatically (localStorage + cookie via @supabase/ssr),
    // so the teacher stays logged in on this device until they explicitly log out.
    router.push("/admin/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-bold text-navy">Teacher / HOD Login</h1>
      <p className="mt-1 text-sm text-slate-500">
        Use your official email and date of birth.
      </p>

      <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">
            Official email
          </label>
          <input
            type="email"
            required
            className="input"
            placeholder="you@college.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">
            Date of birth
          </label>
          <input
            type="date"
            required
            className="input"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
