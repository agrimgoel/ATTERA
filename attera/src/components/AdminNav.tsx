"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setRole(data.user?.user_metadata?.role ?? null);
    });
  }, []);

  const items = [];
  if (role === "system_checker") {
    items.push(
      { href: "/admin/system-checker", label: "Classes", icon: "▦" },
      { href: "/admin/profile", label: "Profile", icon: "👤" }
    );
  } else if (role === "hod") {
    items.push(
      { href: "/admin/hod", label: "Dashboard", icon: "▦" },
      { href: "/admin/upload", label: "Upload", icon: "📤" },
      { href: "/admin/profile", label: "Profile", icon: "👤" }
    );
  } else if (role === "teacher") {
    items.push(
      { href: "/admin/dashboard", label: "Dashboard", icon: "▦" },
      { href: "/admin/schedule", label: "Schedule", icon: "📅" },
      { href: "/admin/attendance", label: "Attendance", icon: "✓" },
      { href: "/admin/marks", label: "Marks", icon: "📝" },
      { href: "/admin/reports", label: "Reports", icon: "📊" },
      { href: "/admin/profile", label: "Profile", icon: "👤" }
    );
  }

  return (
    <nav className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white z-50">
      <div className="flex justify-around py-2">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin/dashboard" && pathname?.startsWith(item.href));
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
