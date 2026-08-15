"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/student/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/student/schedule", label: "Schedule", icon: "📅" },
  { href: "/student/attendance", label: "Attendance", icon: "✓" },
];

export default function StudentNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white">
      <div className="flex justify-around py-2">
        {items.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-nav-item ${active ? "active" : ""}`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
