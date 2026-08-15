"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/admin/schedule", label: "Schedule", icon: "📅" },
  { href: "/admin/attendance", label: "Attendance", icon: "✓" },
  { href: "/admin/reports", label: "Reports", icon: "📊" },
];

export default function AdminNav() {
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
