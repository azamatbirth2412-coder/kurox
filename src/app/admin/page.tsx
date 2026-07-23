export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Users, Eye, Film, MessageSquare, Clock, Sparkles, CalendarClock, ShieldCheck, Radio, LibraryBig, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { getTrending, getScheduleWithDates, getTotalAnimeCount } from "@/lib/anilibria";
import { animeTitle, animePoster, animeSlug } from "@/lib/anilibria";
import Image from "next/image";
import { UpcomingAnimeAdmin } from "@/components/admin/UpcomingAnimeAdmin";

export default async function AdminDashboard() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalUsers, totalViews, totalComments, pendingComments, recentUsers, recentComments, freshAnime, schedule, totalAnimeCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.view.count(),
      prisma.comment.count(),
      prisma.comment.count({ where: { status: "PENDING" } }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" }, take: 5,
        select: { id: true, name: true, email: true, createdAt: true, role: true },
      }),
      prisma.comment.findMany({
        orderBy: { createdAt: "desc" }, take: 5,
        include: { user: { select: { name: true, email: true } } },
      }),
      getTrending(0, 50),
      getScheduleWithDates(),
      getTotalAnimeCount(),
    ]);

  // Sort schedule: episodes airing soonest first (only future episodes)
  const now = Date.now();
  const upcomingItems = schedule
    .filter(s => s.next_episode_at && new Date(s.next_episode_at).getTime() > now)
    .sort((a, b) => {
      const ta = new Date(a.next_episode_at!).getTime();
      const tb = new Date(b.next_episode_at!).getTime();
      return ta - tb;
    })
    .map(s => ({
      id: s.release.id,
      slug: animeSlug(s.release),
      title: animeTitle(s.release),
      poster: animePoster(s.release),
      nextEpisodeAt: s.next_episode_at,
      nextEpisodeOrdinal: s.next_episode_ordinal,
      isOngoing: s.release.is_ongoing,
    }));

  // Filter anime with fresh_at === today
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAnime = freshAnime.filter(a => a.fresh_at && a.fresh_at.startsWith(todayStr));

  // Episodes scheduled for today (may not be uploaded yet)
  const todayScheduled = schedule.filter(s =>
    s.next_episode_at && s.next_episode_at.startsWith(todayStr)
  );

  // Tomorrow's date string
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

  // Episodes airing tomorrow
  const tomorrowEpisodes = schedule.filter(s =>
    s.next_episode_at && s.next_episode_at.startsWith(tomorrowStr)
  );

  // Episodes airing this week (next 7 days)
  const weekEnd = Date.now() + 7 * 24 * 3600 * 1000;
  const weekEpisodes = schedule.filter(s =>
    s.next_episode_at && new Date(s.next_episode_at).getTime() <= weekEnd
  );

  const stats = [
    { label: "Аниме на сайте", value: totalAnimeCount, icon: Film, color: "text-purple-400", bg: "bg-purple-500/10", href: "/anime", hint: "Всего тайтлов в каталоге" },
    { label: "Пользователей", value: totalUsers, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10", href: "/admin/users", hint: null },
    { label: "Просмотров", value: totalViews, icon: Eye, color: "text-green-400", bg: "bg-green-500/10", href: null, hint: null },
    { label: "Комментариев", value: totalComments, icon: MessageSquare, color: "text-yellow-400", bg: "bg-yellow-500/10", href: "/admin/comments", hint: null },
    { label: "Новинок сегодня", value: todayAnime.length, icon: Sparkles, color: "text-rose-400", bg: "bg-rose-500/10", href: null, hint: "Серий добавлено сегодня" },
    { label: "Выйдет завтра", value: tomorrowEpisodes.length, icon: CalendarClock, color: "text-violet-400", bg: "bg-violet-500/10", href: "/schedule", hint: "Серий выходит завтра" },
  ];

  const quickActions = [
    { href: "/admin/comments", label: "Перейти к модерации", icon: ShieldCheck, badge: pendingComments > 0 ? pendingComments : null },
    { href: "/admin/ads", label: "Управление рекламой", icon: Radio, badge: null },
    { href: "/admin/users", label: "Список пользователей", icon: Users, badge: null },
    { href: "/anime", label: "Открыть каталог", icon: LibraryBig, badge: null },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Дашборд</h1>
        <p className="text-[var(--text2)] text-sm mt-1">Обзор активности сайта</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {stats.map((s) => {
          const inner = (
            <>
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon size={22} className={s.color} />
                </div>
                {s.href && <ArrowUpRight size={14} className="text-[var(--text3)]" />}
              </div>
              <div className="text-3xl font-black tracking-tight mb-1">{s.value.toLocaleString("ru")}</div>
              <div className="text-sm text-[var(--text2)]">{s.label}</div>
              {s.hint && <div className="text-[11px] text-[var(--text3)] mt-0.5">{s.hint}</div>}
            </>
          );
          return (
            <div key={s.label} className={`bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 ${s.href ? "hover:border-violet-500/50 hover:bg-[var(--surface2)] transition-all cursor-pointer" : ""}`}>
              {s.href ? <Link href={s.href} className="block">{inner}</Link> : inner}
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text3)] mb-3">Быстрые действия</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group flex items-center gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3.5 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/20 transition-colors">
                <a.icon size={16} className="text-violet-400" />
              </div>
              <span className="text-sm font-medium text-[var(--text2)] group-hover:text-white transition-colors">{a.label}</span>
              {a.badge != null && (
                <span className="ml-auto text-xs font-bold bg-yellow-500/15 text-yellow-400 px-2 py-0.5 rounded-lg">{a.badge}</span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Anime catalog summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--surface)] border border-purple-500/20 rounded-2xl p-4">
          <p className="text-xs text-[var(--text3)] mb-1">Всего аниме в каталоге</p>
          <p className="text-3xl font-black text-purple-400">{totalAnimeCount.toLocaleString("ru")}</p>
          <p className="text-xs text-[var(--text3)] mt-1">тайтлов от Anilibria</p>
        </div>
        <div className="bg-[var(--surface)] border border-violet-500/20 rounded-2xl p-4">
          <p className="text-xs text-[var(--text3)] mb-1">Серий выходит завтра</p>
          <p className="text-3xl font-black text-violet-400">{tomorrowEpisodes.length}</p>
          <p className="text-xs text-[var(--text3)] mt-1">
            {tomorrowEpisodes.length > 0
              ? tomorrowEpisodes.slice(0, 2).map(s => animeTitle(s.release)).join(", ") + (tomorrowEpisodes.length > 2 ? ` и ещё ${tomorrowEpisodes.length - 2}` : "")
              : "Завтра новых серий нет"}
          </p>
        </div>
        <div className="bg-[var(--surface)] border border-blue-500/20 rounded-2xl p-4">
          <p className="text-xs text-[var(--text3)] mb-1">Серий за эту неделю</p>
          <p className="text-3xl font-black text-blue-400">{weekEpisodes.length}</p>
          <p className="text-xs text-[var(--text3)] mt-1">онгоингов выходит</p>
        </div>
      </div>

      {/* Pending warning */}
      {pendingComments > 0 && (
        <Link href="/admin/comments" className="flex items-center gap-3 mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-5 py-4 hover:bg-yellow-500/15 transition-colors">
          <Clock size={18} className="text-yellow-400 flex-shrink-0" />
          <span className="text-sm text-yellow-300 font-medium">
            {pendingComments} {pendingComments === 1 ? "комментарий ожидает" : "комментариев ожидают"} модерации
          </span>
          <span className="ml-auto text-xs text-yellow-500">Перейти →</span>
        </Link>
      )}

      {/* Today's new anime */}
      {todayAnime.length > 0 && (
        <div className="mb-6 bg-[var(--surface)] border border-rose-500/20 rounded-2xl p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-rose-400" />
            Добавлено сегодня — <span className="text-rose-400">{todayAnime.length} аниме</span>
          </h2>
          <div className="flex flex-wrap gap-3">
            {todayAnime.map(a => (
              <Link key={a.id} href={`/anime/${animeSlug(a)}`} target="_blank"
                className="flex items-center gap-2 bg-[var(--surface2)] hover:bg-rose-500/10 border border-[var(--border)] hover:border-rose-500/30 rounded-xl px-3 py-2 transition-all group">
                <div className="w-8 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--surface3)]">
                  {animePoster(a) && (
                    <Image src={animePoster(a)} alt={animeTitle(a)} width={32} height={40} className="object-cover w-full h-full" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold line-clamp-1 group-hover:text-rose-300 transition-colors">{animeTitle(a)}</p>
                  <p className="text-[10px] text-[var(--text3)]">{a.is_ongoing ? "Онгоинг" : "Завершено"}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {todayAnime.length === 0 && (
        <div className="mb-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-5 py-4 text-sm text-[var(--text2)]">
          <Sparkles size={14} className="inline mr-2 text-[var(--text3)]" />
          {todayScheduled.length > 0
            ? <>Сегодня ожидается <span className="font-semibold text-violet-400">{todayScheduled.length} {todayScheduled.length === 1 ? "серия" : "серий"}</span> — ещё не загружены на Anilibria</>
            : "Сегодня новых аниме на Anilibria пока нет"
          }
        </div>
      )}

      {/* Upcoming releases this week */}
      <div className="mb-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <CalendarClock size={16} className="text-violet-400" />
            Скоро выйдут на сайте
            {upcomingItems.length > 0 && (
              <span className="text-xs text-[var(--text3)] font-normal">— {upcomingItems.length} аниме на этой неделе</span>
            )}
          </h2>
          <Link href="/schedule" target="_blank"
            className="text-xs text-[var(--text2)] hover:text-[var(--accent)] transition-colors">
            Расписание →
          </Link>
        </div>
        <UpcomingAnimeAdmin items={upcomingItems} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent users */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Users size={16} className="text-blue-400" /> Новые пользователи
            </h2>
            <Link href="/admin/users" className="text-xs text-[var(--text2)] hover:text-[var(--accent)] transition-colors">Все →</Link>
          </div>
          <div className="space-y-3">
            {recentUsers.length === 0 ? (
              <p className="text-[var(--text2)] text-sm">Нет пользователей</p>
            ) : recentUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {(u.name?.[0] || u.email[0]).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{u.name || u.email}</div>
                  <div className="text-[var(--text3)] text-xs">{new Date(u.createdAt).toLocaleDateString("ru")}</div>
                </div>
                {u.role === "ADMIN" && (
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-lg">Админ</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent comments */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageSquare size={16} className="text-yellow-400" /> Последние комментарии
            </h2>
            <Link href="/admin/comments" className="text-xs text-[var(--text2)] hover:text-[var(--accent)] transition-colors">Все →</Link>
          </div>
          <div className="space-y-3">
            {recentComments.length === 0 ? (
              <p className="text-[var(--text2)] text-sm">Нет комментариев</p>
            ) : recentComments.map((c) => (
              <div key={c.id} className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{c.user.name || c.user.email}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${c.status === "APPROVED" ? "bg-green-500/15 text-green-400" : c.status === "PENDING" ? "bg-yellow-500/15 text-yellow-400" : "bg-red-500/15 text-red-400"}`}>
                    {c.status === "APPROVED" ? "Одобрен" : c.status === "PENDING" ? "На проверке" : "Отклонён"}
                  </span>
                  <span className="text-[var(--text3)] text-xs ml-auto">{new Date(c.createdAt).toLocaleDateString("ru")}</span>
                </div>
                <p className="text-[var(--text2)] line-clamp-1">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
