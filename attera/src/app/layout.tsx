import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATTERA — Attendance Tracker",
  description: "Attendance tracking for students and teachers",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#0B2545",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-bg">
        <div className="mx-auto max-w-md min-h-screen bg-bg">{children}</div>
      </body>
    </html>
  );
}
