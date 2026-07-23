import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "rtxaza@gmail.com";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/auth/login?callbackUrl=/admin");
  if (email !== ADMIN_EMAIL) redirect("/");

  return (
    <div className="flex" style={{ minHeight: "calc(100vh - 62px)" }}>
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-[var(--border)] sticky top-[62px] h-[calc(100vh-62px)] bg-[var(--surface)] flex flex-col">
        {/* Admin badge */}
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={17} className="text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--text)]">Админ-панель</p>
              <p className="text-[11px] text-[var(--text3)] truncate">{email}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto">
          <AdminNav />
        </div>

        {/* Back to site */}
        <div className="p-2 border-t border-[var(--border)]">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--text3)] hover:bg-[var(--surface2)] hover:text-white transition-all"
          >
            <ArrowLeft size={15} /> На сайт
          </Link>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto min-w-0 bg-[var(--bg2)]">{children}</div>
    </div>
  );
}
