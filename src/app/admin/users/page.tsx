export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Users, Shield, Ban } from "lucide-react";
import { UserManagement } from "@/components/admin/UserManagement";

export default async function AdminUsersPage() {
  const [users, totalUsers, adminCount, bannedCount, secretTitle] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        bannedAt: true,
        banReason: true,
        createdAt: true,
        _count: { select: { comments: true } },
      },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { role: "BANNED" } }),
    prisma.title.findFirst({ where: { key: "secret_agent" }, select: { id: true } }),
  ]);

  const agentUserIds = secretTitle
    ? new Set((await prisma.userTitle.findMany({ where: { titleId: secretTitle.id }, select: { userId: true } })).map(ut => ut.userId))
    : new Set<string>();

  const summary = [
    { label: "Всего пользователей", value: totalUsers, icon: Users, color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Администраторов", value: adminCount, icon: Shield, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Заблокированных", value: bannedCount, icon: Ban, color: "text-red-400", bg: "bg-red-500/10" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Пользователи</h1>
        <p className="text-[var(--text2)] text-sm mt-1">
          Зарегистрировано: <span className="font-bold text-violet-400">{totalUsers.toLocaleString("ru")}</span>
          {totalUsers > users.length && <span className="text-[var(--text3)]"> · показаны последние {users.length}</span>}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {summary.map((s) => (
          <div key={s.label} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={22} className={s.color} />
            </div>
            <div>
              <div className="text-3xl font-black tracking-tight">{s.value.toLocaleString("ru")}</div>
              <div className="text-sm text-[var(--text2)]">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-5 py-3 border-b border-[var(--border)] text-xs font-bold uppercase tracking-widest text-[var(--text3)] bg-[var(--surface2)]">
          <span>Пользователь</span>
          <span className="text-center">Роль</span>
          <span className="text-center w-8">Комм.</span>
          <span className="text-right">Регистрация</span>
          <span className="text-right">Действия</span>
        </div>
        <UserManagement initialUsers={users.map(u => ({ ...u, hasSecretAgent: agentUserIds.has(u.id) })) as any} />
      </div>
    </div>
  );
}
