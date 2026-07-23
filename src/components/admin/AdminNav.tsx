"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Film, MessageSquare, Radio, RefreshCw, Award } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Дашборд", icon: LayoutDashboard },
  { href: "/admin/users", label: "Пользователи", icon: Users },
  { href: "/admin/anime", label: "Аниме", icon: Film },
  { href: "/admin/comments", label: "Комментарии", icon: MessageSquare },
  { href: "/admin/titles", label: "Титулы", icon: Award },
  { href: "/admin/ads", label: "Реклама", icon: Radio },
  { href: "/admin/sync", label: "Синхронизация", icon: RefreshCw },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="p-2 space-y-0.5">
      {NAV.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-[color,background-color] duration-150 ${
              active
                ? "bg-violet-500/15 text-white font-medium"
                : "text-[var(--text2)] hover:bg-[var(--surface2)] hover:text-white"
            }`}
          >
            <item.icon size={15} className={active ? "text-violet-400" : ""} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
