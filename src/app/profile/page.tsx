export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { FrameSelector } from "@/components/profile/FrameSelector";
import { TitlesShowcase } from "@/components/profile/TitlesShowcase";
import { WatchHistorySection } from "@/components/profile/WatchHistorySection";
import { Heart, Clock, Play, Film, Timer } from "lucide-react";
import { calcLevel, levelProgress, getLevelInfo } from "@/lib/level";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      favorites: { include: { anime: true }, orderBy: { createdAt: "desc" }, take: 12 },
      watchHistory: { orderBy: { updatedAt: "desc" }, take: 12 },
      subscription: true,
    },
  });
  if (!user) redirect("/auth/login");

  const userTitles = await prisma.userTitle.findMany({
    where: { userId: user.id },
    include: { title: true },
    orderBy: { earnedAt: "asc" },
  });

  const allTitles = await prisma.title.findMany({
    orderBy: [{ rarity: "asc" }, { createdAt: "asc" }],
  });

  const animeSlugs = [...new Set(allTitles.filter(t => t.animeSlug).map(t => t.animeSlug!))];
  const animeRows = animeSlugs.length > 0
    ? await prisma.anime.findMany({
        where: { slug: { in: animeSlugs } },
        select: { slug: true, title: true },
      })
    : [];
  const animeBySlug = Object.fromEntries(animeRows.map(a => [a.slug, a.title]));
  const earnedIds = new Set(userTitles.map(ut => ut.titleId));

  const totalEpisodes = await prisma.watchHistory.count({ where: { userId: user.id } });
  const uniqueAnimeRows = await prisma.watchHistory.findMany({
    where: { userId: user.id },
    select: { animeId: true },
    distinct: ["animeId"],
  });
  const animeCount = uniqueAnimeRows.length;
  const hoursWatched = Math.round(totalEpisodes * 24 / 60);

  const level = calcLevel(user.xp);
  const progress = levelProgress(user.xp);
  const levelInfo = getLevelInfo(level);
  const displayName = user.name || "Пользователь";
  const activeTitle = userTitles.find(ut => ut.titleId === user.activeTitleId)?.title ?? null;

  const stats = [
    { icon: Play, value: totalEpisodes, label: "Эпизодов", color: "text-violet-400" },
    { icon: Film, value: animeCount, label: "Аниме", color: "text-sky-400" },
    { icon: Timer, value: hoursWatched, label: "Часов", color: "text-amber-400" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Профиль" }]} />

      <div className="mt-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <div className="flex-shrink-0 text-center md:w-64">
            <FrameSelector
              currentFrame={user.profileFrame}
              currentImage={user.image ?? null}
              name={displayName}
              userLevel={level}
              isAdmin={user.role === "ADMIN"}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <span className="inline-flex items-center gap-1.5 bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-semibold px-3 py-1 rounded-full">
                Уровень {level}
                <span className="text-sm leading-none">{levelInfo.emoji}</span>
                {levelInfo.title}
              </span>
              {activeTitle && (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border"
                  style={{
                    color: activeTitle.color,
                    borderColor: `${activeTitle.color}50`,
                    background: `${activeTitle.color}15`,
                  }}
                >
                  <span>{activeTitle.emoji}</span>
                  {activeTitle.name}
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--text2)] mt-1">{user.email}</p>

            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-semibold">
                  {progress.currentXp} / {progress.neededXp} XP
                </span>
                <span className="text-[var(--text2)]">→ Ур. {level + 1}</span>
              </div>
              <div className="h-3 bg-[var(--surface2)] rounded-full overflow-hidden border border-[var(--border)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-violet-400 transition-[width] duration-700 ease-out"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="text-xs text-[var(--text3)] mt-1.5">
                {Math.round(progress.percent)}% до следующего уровня
              </p>
            </div>

            <TitlesShowcase
              allTitles={allTitles.map(t => {
                let requiresAnime = null;
                try { if (t.requiresAnime) requiresAnime = JSON.parse(t.requiresAnime); } catch { /* */ }
                return {
                  id: t.id,
                  name: t.name,
                  emoji: t.emoji,
                  color: t.color,
                  rarity: t.rarity,
                  description: t.description,
                  animeSlug: t.animeSlug,
                  animeTitle: t.animeSlug ? (animeBySlug[t.animeSlug] ?? t.animeSlug) : null,
                  minEpisodes: t.minEpisodes,
                  totalEpisodes: t.totalEpisodes,
                  requiresAnime,
                  animated: t.animated,
                  earned: earnedIds.has(t.id),
                };
              })}
              activeTitleId={user.activeTitleId ?? null}
              isAdmin={user.role === "ADMIN"}
            />

            <div className="mt-6 grid grid-cols-3 gap-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-[var(--surface2)] border border-[var(--border)] rounded-xl p-4 text-center"
                >
                  <stat.icon size={16} className={`${stat.color} mx-auto`} />
                  <div className="text-xl font-bold mt-1.5">{stat.value}</div>
                  <div className="text-xs text-[var(--text2)] mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        <section>
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Clock size={18} className="text-blue-400" /> История просмотров
          </h2>
          <WatchHistorySection initial={user.watchHistory.map(h => ({
            id: h.id,
            title: h.title,
            poster: h.poster,
            slug: h.slug,
            episodeNum: h.episodeNum,
          }))} />
        </section>

        <section>
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Heart size={18} className="text-red-400" /> Избранное
          </h2>
          {user.favorites.length === 0 ? (
            <p className="text-gray-400 text-sm">Список избранного пуст.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {user.favorites.map((f) => (
                <Link key={f.id} href={`/anime/${f.anime.slug}`}
                  className="bg-gray-900 rounded-xl overflow-hidden hover:bg-gray-800 transition-colors">
                  <div className="aspect-[2/3] relative">
                    {f.anime.poster ? (
                      <Image src={f.anime.poster} alt={f.anime.title} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-700" />
                    )}
                  </div>
                  <div className="p-2 text-xs">
                    <div className="font-medium line-clamp-2">{f.anime.title}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
