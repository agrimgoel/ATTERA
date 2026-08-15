"use client";

import { useState } from "react";
import Papa from "papaparse";
import AdminNav from "@/components/AdminNav";

type Kind = "teachers" | "students";

export default function UploadPage() {
  const [busy, setBusy] = useState<Kind | null>(null);
  const [result, setResult] = useState<string | null>(null);

  function handleFile(kind: Kind, file: File) {
    setBusy(kind);
    setResult(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (parsed) => {
        try {
          const res = await fetch("/api/admin/upload-csv", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind, rows: parsed.data }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Upload failed");
          setResult(
            `Imported ${json.created} ${kind}. ${
              json.skipped ? `${json.skipped} skipped (already existed or invalid row).` : ""
            }`
          );
        } catch (e: any) {
          setResult(`Error: ${e.message}`);
        } finally {
          setBusy(null);
        }
      },
    });
  }

  return (
    <main className="pb-24">
      <header className="px-5 pt-6">
        <h1 className="text-2xl font-bold text-navy">Bulk Upload (HOD only)</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload the teacher and student CSVs. This creates their login
          (official email + DOB as password) automatically.
        </p>
      </header>

      <section className="mt-6 flex flex-col gap-4 px-5">
        <div className="card p-4">
          <h2 className="font-semibold text-navy">Teachers CSV</h2>
          <p className="mt-1 text-xs text-slate-500">
            Columns: name, email, dob (YYYY-MM-DD), role (teacher or hod)
          </p>
          <input
            type="file"
            accept=".csv"
            className="mt-3 w-full text-sm"
            disabled={busy !== null}
            onChange={(e) =>
              e.target.files?.[0] && handleFile("teachers", e.target.files[0])
            }
          />
        </div>

        <div className="card p-4">
          <h2 className="font-semibold text-navy">Students CSV</h2>
          <p className="mt-1 text-xs text-slate-500">
            Columns: name, roll_no, class, email, dob (YYYY-MM-DD)
          </p>
          <input
            type="file"
            accept=".csv"
            className="mt-3 w-full text-sm"
            disabled={busy !== null}
            onChange={(e) =>
              e.target.files?.[0] && handleFile("students", e.target.files[0])
            }
          />
        </div>

        {busy && <p className="text-sm text-slate-500">Uploading {busy}...</p>}
        {result && <p className="text-sm text-navy">{result}</p>}
      </section>

      <AdminNav />
    </main>
  );
}
