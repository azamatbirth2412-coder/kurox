import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Film, MessageSquare, Radio, CreditCard } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Дашборд", icon: LayoutDashboard },
  { href: "/admin/users", label: "Пользователи", icon: Users },
  { href: "/admin/anime", label: "Аниме", icon: Film },
  { href: "/admin/comments", label: "Комментарии", icon: MessageSquare },
  { href: "/admin/ads", label: "Реклама", icon: Radio },
  { href: "/admin/subscriptions", label: "Подписки", icon: CreditCard },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") redirect("/");

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-gray-900 border-r border-gray-800 flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
        <div className="p-4 border-b border-gray-800">
          <Link href="/" className="text-xl font-black text-purple-500">KUROX</Link>
          <div className="text-xs text-gray-500 mt-1">Админ-панель</div>
        </div>
        <nav className="p-2 space-y-1">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 p-6 overflow-auto">{children}</div>
    </div>
  );
}
