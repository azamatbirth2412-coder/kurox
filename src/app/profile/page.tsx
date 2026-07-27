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
import { ProfileAccentPicker } from "@/components/profile/ProfileAccentPicker";
import { TitleBadge } from "@/components/profile/TitleBadge";
import { Heart, Clock, Play, Film, Timer, Star, Sparkles } from "lucide-react";
import { calcLevel, levelProgress, getLevelInfo } from "@/lib/level";

// Emerald / amber / orange, matching the AnimeCard rating scale.
function ratingColor(r: number): string {
  if (r >= 8) return "text-emerald-300";
  if (r >= 7) return "text-amber-300";
  if (r >= 6) return "text-orange-300";
  return "text-[var(--text2)]";
}

// Accent-aware inline styles (fall back to the site accent until the picker runs).
const ACCENT = "var(--profile-accent, var(--accent))";
const ACCENT_DIM = "var(--profile-accent-dim, var(--accent-dim))";
const ACCENT_GLOW = "var(--profile-accent-glow, var(--accent-glow))";

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

  const [totalEpisodes, uniqueAnimeRows, favCount] = await Promise.all([
    prisma.watchHistory.count({ where: { userId: user.id } }),
    prisma.watchHistory.findMany({ where: { userId: user.id }, select: { animeId: true }, distinct: ["animeId"] }),
    prisma.favorite.count({ where: { userId: user.id } }),
  ]);
  const animeCount = uniqueAnimeRows.length;
  const hoursWatched = Math.round(totalEpisodes * 24 / 60);

  // Favourite genres — tally across the loaded favourites' genre lists.
  const genreCount = new Map<string, number>();
  for (const f of user.favorites) {
    try {
      const parsed = JSON.parse(f.anime.genres || "[]");
      if (Array.isArray(parsed)) {
        for (const g of parsed) {
          const name = typeof g === "string" ? g : g?.name;
          if (name) genreCount.set(name, (genreCount.get(name) ?? 0) + 1);
        }
      }
    } catch { /* ignore malformed genre JSON */ }
  }
  const favGenres = [...genreCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]);

  const level = calcLevel(user.xp);
  const progress = levelProgress(user.xp);
  const levelInfo = getLevelInfo(level);
  const displayName = user.name || "Пользователь";
  const activeTitle = userTitles.find(ut => ut.titleId === user.activeTitleId)?.title ?? null;

  const stats = [
    { icon: Play, value: totalEpisodes, label: "Эпизодов", color: "text-violet-400" },
    { icon: Film, value: animeCount, label: "Аниме", color: "text-sky-400" },
    { icon: Timer, value: hoursWatched, label: "Часов", color: "text-amber-400" },
    { icon: Heart, value: favCount, label: "В избранном", color: "text-rose-400" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Профиль" }]} />

      <div
        className="mt-6 relative overflow-hidden bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 md:p-8"
        style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,.03)` }}
      >
        {/* Accent glow */}
        <div aria-hidden className="absolute -top-28 -right-16 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-40"
          style={{ background: ACCENT_GLOW }} />

        <div className="relative flex flex-col md:flex-row gap-6 md:gap-8">
          <div className="flex-shrink-0 text-center md:w-64">
            {/* Soft accent ring behind the avatar/frame */}
            <div className="relative">
              <div aria-hidden className="absolute left-1/2 -translate-x-1/2 top-0 w-40 h-40 rounded-full blur-2xl pointer-events-none"
                style={{ background: ACCENT_DIM }} />
              <div className="relative">
                <FrameSelector
                  currentFrame={user.profileFrame}
                  currentImage={user.image ?? null}
                  name={displayName}
                  userLevel={level}
                  isPremium={user.isPremium}
                  isAdmin={user.role === "ADMIN"}
                />
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border"
                style={{ color: ACCENT, borderColor: ACCENT_DIM, background: ACCENT_DIM }}
              >
                Уровень {level}
                <span className="text-sm leading-none">{levelInfo.emoji}</span>
                {levelInfo.title}
              </span>
              {activeTitle && (
                <TitleBadge
                  name={activeTitle.name}
                  emoji={activeTitle.emoji}
                  color={activeTitle.color}
                  rarity={activeTitle.rarity}
                  titleKey={activeTitle.key}
                  size="md"
                />
              )}
            </div>
            <p className="text-sm text-[var(--text2)] mt-1">{user.email}</p>

            {/* Accent picker — also restores + applies saved --profile-accent vars on mount */}
            <div className="mt-4">
              <ProfileAccentPicker />
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-semibold">
                  {progress.currentXp} / {progress.neededXp} XP
                </span>
                <span className="text-[var(--text2)]">→ Ур. {level + 1}</span>
              </div>
              <div className="h-3 bg-[var(--surface2)] rounded-full overflow-hidden border border-[var(--border)]">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${progress.percent}%`, background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_GLOW})` }}
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
                  key: t.key,
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

            {/* Stats */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-[var(--surface2)] border border-[var(--border)] rounded-xl p-4 text-center"
                >
                  <stat.icon size={16} className={`${stat.color} mx-auto`} />
                  <div className="text-xl font-bold mt-1.5 tabular-nums">{stat.value}</div>
                  <div className="text-xs text-[var(--text2)] mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Favourite genres */}
            {favGenres.length > 0 && (
              <div className="mt-5">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[var(--text3)] mb-2.5">
                  <Sparkles size={12} style={{ color: ACCENT }} /> Любимые жанры
                </p>
                <div className="flex flex-wrap gap-2">
                  {favGenres.map(g => (
                    <Link
                      key={g}
                      href={`/anime?genre=${encodeURIComponent(g)}`}
                      className="px-3 py-1.5 rounded-full text-sm font-medium border transition-transform hover:scale-[1.04]"
                      style={{ color: ACCENT, borderColor: ACCENT_DIM, background: ACCENT_DIM }}
                    >
                      {g}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        <section id="history">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Clock size={18} className="text-blue-400" /> Продолжить просмотр
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
            <p className="text-[var(--text3)] text-sm">
              Список избранного пуст.{" "}
              <Link href="/anime" className="text-[var(--accent)] hover:underline">Найти аниме</Link>
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {user.favorites.map((f) => {
                const rt = f.anime.rating;
                const hasRating = typeof rt === "number" && rt > 0;
                return (
                  <Link key={f.id} href={`/anime/${f.anime.slug}`} className="group flex flex-col card-hover h-full">
                    <div className="relative aspect-[2/3] rounded-[var(--radius)] overflow-hidden bg-[var(--surface2)]">
                      {f.anime.poster ? (
                        <Image src={f.anime.poster} alt={f.anime.title} fill
                          sizes="(max-width:640px) 33vw, 180px"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.06]" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--text3)]"><Play size={24} className="opacity-25" /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {hasRating && (
                        <div className={`absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-md rounded-md pl-1 pr-1.5 py-0.5 text-[11px] font-bold leading-none tabular-nums ring-1 ring-white/10 ${ratingColor(rt!)}`}>
                          <Star size={10} fill="currentColor" className="shrink-0" /> {rt!.toFixed(1)}
                        </div>
                      )}
                    </div>
                    <div className="pt-2 px-0.5">
                      <h3 className="text-sm font-bold line-clamp-2 leading-snug text-[var(--text)] group-hover:text-[#c4b5fd] transition-colors">
                        {f.anime.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--text3)] tabular-nums">
                        {f.anime.year && <span>{f.anime.year}</span>}
                        {f.anime.type && <span>· {f.anime.type}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
