export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { QuestsPanel } from "@/components/quests/QuestsPanel";
import { Target, Trophy } from "lucide-react";

export const metadata: Metadata = {
  title: "Дейлики — ежедневные квесты | Kurox",
  robots: { index: false, follow: false },
};

export default async function QuestsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Дейлики" }]} />

      <div className="mt-6 mb-7 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center w-11 h-11 rounded-xl bg-[var(--accent)]/12 ring-1 ring-[var(--accent)]/20 text-[var(--accent)] shrink-0">
            <Target size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold leading-tight">Ежедневные квесты</h1>
            <p className="text-sm text-[var(--text3)] mt-0.5">Выполняй задания каждый день, копи серию и зарабатывай XP</p>
          </div>
        </div>
        <Link
          href="/leaderboard"
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-[#c4b5fd] bg-[var(--accent-dim)] border border-[rgba(139,92,246,.28)] hover:bg-[rgba(139,92,246,.22)] transition-colors"
        >
          <Trophy size={15} /> Лидерборд
        </Link>
      </div>

      <QuestsPanel />
    </div>
  );
}
