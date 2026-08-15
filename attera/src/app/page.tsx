import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-white text-2xl font-bold">
          A
        </div>
        <h1 className="text-3xl font-bold text-navy">ATTERA</h1>
        <p className="mt-1 text-slate-500">Attendance, without the hassle.</p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <Link href="/admin/login" className="btn-primary text-center">
          Admin / Teacher Portal
        </Link>
        <Link href="/student/login" className="btn-outline text-center">
          Student Portal
        </Link>
      </div>
    </main>
  );
}
