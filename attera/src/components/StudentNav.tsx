"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/student/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/student/schedule", label: "Schedule", icon: "📅" },
  { href: "/student/attendance", label: "Attendance", icon: "✓" },
  { href: "/student/marks", label: "Marks", icon: "📝" },
  { href: "/student/profile", label: "Profile", icon: "👤" },
];

export default function StudentNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white z-50">
      <div className="flex justify-around py-2">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/student/dashboard" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-nav-item ${active ? "active" : ""}`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
