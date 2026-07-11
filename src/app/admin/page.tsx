export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Users, Eye, Film, MessageSquare } from "lucide-react";

export default async function AdminDashboard() {
  const [totalUsers, totalViews, totalAnime, pendingComments, recentUsers, topAnime] =
    await Promise.all([
      prisma.user.count(),
      prisma.view.count(),
      prisma.anime.count(),
      prisma.comment.count({ where: { status: "PENDING" } }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" }, take: 5,
        select: { id: true, name: true, email: true, createdAt: true },
      }),
      prisma.anime.findMany({
        orderBy: { viewsCount: "desc" }, take: 10,
        select: { id: true, title: true, viewsCount: true },
      }),
    ]);

  const stats = [
    { label: "Пользователей", value: totalUsers, icon: Users, color: "text-blue-400" },
    { label: "Просмотров", value: totalViews, icon: Eye, color: "text-green-400" },
    { label: "Тайтлов", value: totalAnime, icon: Film, color: "text-purple-400" },
    { label: "Коммент. на модерации", value: pendingComments, icon: MessageSquare, color: "text-yellow-400" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Дашборд</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-gray-900 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={18} className={s.color} />
              <span className="text-sm text-gray-400">{s.label}</span>
            </div>
            <div className="text-2xl font-bold">{s.value.toLocaleString("ru")}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl p-4">
          <h2 className="font-semibold mb-4">Топ-10 тайтлов по просмотрам</h2>
          <div className="space-y-2">
            {topAnime.length === 0 ? (
              <p className="text-gray-500 text-sm">Нет данных</p>
            ) : topAnime.map((a, i) => (
              <div key={a.id} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-gray-500 text-right">{i + 1}</span>
                <span className="flex-1 truncate">{a.title}</span>
                <span className="text-gray-400">{a.viewsCount.toLocaleString("ru")}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <h2 className="font-semibold mb-4">Новые пользователи</h2>
          <div className="space-y-2">
            {recentUsers.length === 0 ? (
              <p className="text-gray-500 text-sm">Нет пользователей</p>
            ) : recentUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {u.name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate">{u.name || u.email}</div>
                  <div className="text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString("ru")}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
