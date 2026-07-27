import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import {
  getTrending, getPopular, getSchedule, getOngoingPage, getNewReleases, getClassics,
  animePoster, animeSlug, animeTitle, animeYear, animeEpisodes, animeEpisodesAired, animeRating, animeVotes,
  GENRES, GENRE_ICONS, type AnilibriaAnime,
} from "@/lib/anilibria";
import { AnimeCard } from "@/components/anime/AnimeCard";
import { AnimeCardSkeleton } from "@/components/anime/AnimeCardSkeleton";
import { AdBanner } from "@/components/ui/AdBanner";
import { UpcomingAnime } from "@/components/anime/UpcomingAnime";
import { HeroBannerSlider } from "@/components/anime/HeroBannerSlider";
import { MoodPicker } from "@/components/anime/MoodPicker";

export const revalidate = 300; // 5 минут — новые аниме/серии появятся быстрее

export const metadata: Metadata = {
  title: "Kurox — Смотреть аниме онлайн бесплатно",
  description: "Kurox — лучший сайт для просмотра аниме с русской озвучкой онлайн. Тысячи тайтлов, новые серии каждый день.",
  alternates: { canonical: "/" },
};

function SkeletonRow({ count = 7 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
      {Array.from({ length: count }).map((_, i) => <AnimeCardSkeleton key={i} />)}
    </div>
  );
}

function toCard(a: AnilibriaAnime) {
  return {
    id: a.id,
    slug: animeSlug(a),
    title: animeTitle(a),
    titleOrig: a.name?.english || undefined,
    poster: animePoster(a),
    year: animeYear(a),
    format: a.type?.description,
    status: a.is_ongoing ? "RELEASING" : "FINISHED",
    rating: animeRating(a),
    votes: animeVotes(a),
    episodes: animeEpisodes(a),
    episodesAired: animeEpisodesAired(a) || undefined,
    genres: a.genres?.slice(0, 2).map(g => g.name),
    isNew: a.is_ongoing,
  };
}

/* One head, one system, on every section.
   Before: six of the eight heads carried an accent-tinted icon chip and two
   did not, so titles started at two different x positions and none of them
   lined up with the poster grid directly underneath. Dropping the chip lets
   every title sit on the same left edge as the content it labels, and frees
   the violet accent to mean one thing — "this is the thing you can click". */
function SHeader({ title, href, hrefLabel = "Все" }: { title: string; href?: string; hrefLabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-[var(--gap-head)] md:mb-[var(--gap-head-lg)]">
      <h2
        className="font-bold tracking-tight text-[var(--text)]"
        style={{ fontSize: "var(--text-section)" }}
      >
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="group -mr-2 shrink-0 inline-flex items-center gap-1 rounded-lg px-2 text-sm font-medium text-[var(--text2)] hover:text-white transition-colors"
          style={{ minHeight: "var(--tap)" }}
        >
          {hrefLabel}
          <ChevronRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

// Shared fetch — called once, cached in memory for both Hero + TrendingRow
let _trendingCache: { data: Promise<AnilibriaAnime[]>; at: number } | null = null;
function getTrendingCached(): Promise<AnilibriaAnime[]> {
  if (_trendingCache && Date.now() - _trendingCache.at < 5 * 60 * 1000) return _trendingCache.data;
  const p = getTrending(0, 14).then(list => {
    // Never cache a failed/empty fetch — it would pin a blank hero + empty
    // "Свежие серии" row for 5 minutes even after the API recovers
    if (!list.length) _trendingCache = null;
    return list;
  });
  _trendingCache = { data: p, at: Date.now() };
  return p;
}

async function HeroBanner() {
  const list = await getTrendingCached();
  if (!list.length) return (
    <div className="h-[520px] hero-bg flex flex-col items-center justify-center gap-5 text-center px-4">
      <div className="text-5xl font-black text-white tracking-tight" style={{ fontFamily: "var(--font-heading, sans-serif)" }}>
        <span className="text-[var(--accent)]">K</span>urox
      </div>
      <p className="text-[var(--text2)] text-lg max-w-md">Тысячи аниме с русской озвучкой в HD</p>
      <div className="flex gap-3">
        <a href="/anime" className="px-6 py-2.5 bg-[var(--accent)] hover:bg-violet-500 text-white rounded-xl font-semibold text-sm transition-colors">
          Каталог
        </a>
        <a href="/anime?sort=trending" className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl font-semibold text-sm transition-colors border border-white/10">
          Популярное
        </a>
      </div>
    </div>
  );

  // Rotate banner selection daily: shift starting index by day-of-year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const offset = (dayOfYear * 3) % Math.max(list.length - 7, 1);
  const pool = list.length >= 14 ? list.slice(offset, offset + 14) : list;
  // Pick 7 with daily shuffle using day as seed
  const shuffled = [...pool].sort((a, b) => {
    const ha = ((a.id * 2654435761) ^ dayOfYear) >>> 0;
    const hb = ((b.id * 2654435761) ^ dayOfYear) >>> 0;
    return ha - hb;
  });

  const items = shuffled.slice(0, 7).map(a => ({
    id: a.id,
    slug: animeSlug(a),
    title: animeTitle(a),
    titleEn: a.name?.english ?? null,
    poster: animePoster(a),
    desc: a.description?.slice(0, 200) ?? null,
    genres: (a.genres ?? []).slice(0, 3).map(g => g.name),
    type: a.type?.description ?? null,
    year: animeYear(a),
    isOngoing: !!a.is_ongoing,
  }));

  return <HeroBannerSlider items={items} />;
}

async function TrendingRow() {
  const list = await getTrendingCached();
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
      {list.map(a => <AnimeCard key={a.id} {...toCard(a)} />)}
    </div>
  );
}

async function ScheduleRow() {
  const list = await getSchedule();
  const unique = Array.from(new Map(list.map(a => [a.id, a])).values()).slice(0, 7);
  if (!unique.length) return null;
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
      {unique.map(a => <AnimeCard key={a.id} {...toCard(a)} />)}
    </div>
  );
}

async function OngoingRow() {
  const { data } = await getOngoingPage(0, 14);
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
      {data.slice(0, 14).map(a => <AnimeCard key={a.id} {...toCard(a)} />)}
    </div>
  );
}

async function PopularRow() {
  // Fetch trending to exclude already-shown anime
  const trending = await getTrendingCached();
  const trendingIds = new Set(trending.map(a => a.id));
  // Fetch more to have enough after filtering
  const all = await getPopular(0, 28);
  const list = all.filter(a => !trendingIds.has(a.id)).slice(0, 14);
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
      {list.map(a => <AnimeCard key={a.id} {...toCard(a)} />)}
    </div>
  );
}

// Rotates a pool daily — different 7 items each calendar day
function dailyPick(pool: AnilibriaAnime[], count = 7): AnilibriaAnime[] {
  if (pool.length <= count) return pool;
  const day = Math.floor(Date.now() / 86_400_000); // UTC day index
  const offset = (day * 2971) % (pool.length - count + 1); // prime spread
  return pool.slice(offset, offset + count);
}

async function NewReleasesRow() {
  const pool = await getNewReleases(42);
  const list = dailyPick(pool, 7);
  if (!list.length) return null;
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
      {list.map(a => <AnimeCard key={a.id} {...toCard(a)} />)}
    </div>
  );
}

async function ClassicsRow() {
  const pool = await getClassics(42);
  const list = dailyPick(pool, 7);
  if (!list.length) return null;
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
      {list.map(a => <AnimeCard key={a.id} {...toCard(a)} />)}
    </div>
  );
}


export default function HomePage() {
  return (
    <div className="pb-16">
      <Suspense fallback={<div className="h-[520px] hero-bg" />}><HeroBanner /></Suspense>
      {/* One rhythm token for every gap between sections, one for head→content.
          Previously the page mixed mt-12 / space-y-14 / mb-5 with an ad banner
          that inherited a full section gap on both sides. */}
      <div className="max-w-[1400px] mx-auto px-4 mt-10 md:mt-14 space-y-[var(--gap-section)] md:space-y-[var(--gap-section-lg)]">
        <section>
          <SHeader title="Свежие серии" href="/anime?sort=trending" />
          <Suspense fallback={<SkeletonRow />}><TrendingRow /></Suspense>
        </section>

        <AdBanner slot="between-cards" />

        <section>
          <SHeader title="Выходит на этой неделе" href="/anime?sort=schedule" />
          <Suspense fallback={<SkeletonRow />}><ScheduleRow /></Suspense>
        </section>

        <section>
          <SHeader title="По жанрам" href="/genres" hrefLabel="Все жанры" />
          <div className="flex flex-wrap gap-2">
            {GENRES.map(g => (
              <Link key={g} href={`/genre/${encodeURIComponent(g)}`}
                className="inline-flex items-center gap-2 min-h-10 px-4 bg-[var(--surface)] border border-[var(--border)] rounded-full text-sm text-[var(--text2)] hover:border-[var(--accent)]/50 hover:text-white hover:bg-[var(--accent)]/10 transition-[color,background-color,border-color] duration-200 group">
                <span aria-hidden className="text-base leading-none group-hover:scale-110 transition-transform">{GENRE_ICONS[g] || "🎬"}</span>
                <span className="font-medium">{g}</span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <SHeader title="Что сейчас хочется смотреть?" />
          <MoodPicker />
        </section>

        <section>
          <SHeader title="Онгоинги" href="/anime?sort=ongoing" />
          <Suspense fallback={<SkeletonRow />}><OngoingRow /></Suspense>
        </section>

        <section>
          <SHeader title="Популярное за всё время" href="/anime?sort=popular" />
          <Suspense fallback={<SkeletonRow count={14} />}><PopularRow /></Suspense>
        </section>

        <section>
          <SHeader title="Новинки — рекомендуем сегодня" href="/anime?sort=trending" />
          <Suspense fallback={<SkeletonRow />}><NewReleasesRow /></Suspense>
        </section>

        <section>
          <SHeader title="Классика — выбор дня" href="/anime?sort=popular" />
          <Suspense fallback={<SkeletonRow />}><ClassicsRow /></Suspense>
        </section>

        <section>
          {/* No year in the label: it was hard-coded "2026" and would quietly
              start lying the moment the calendar rolled over. */}
          <SHeader title="Скоро выйдут" />
          <UpcomingAnime />
        </section>

        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 md:p-8">
          <h1 className="text-base font-bold mb-3">Смотреть аниме онлайн бесплатно с русской озвучкой — Kurox</h1>
          <div className="text-sm text-[var(--text2)] leading-relaxed space-y-2 max-w-[70ch]" style={{ textWrap: "pretty" } as React.CSSProperties}>
            <p><strong className="text-[var(--text)]">Kurox</strong> — лучший сайт для просмотра аниме онлайн с русской озвучкой в HD 1080p. Тысячи аниме бесплатно, без рекламы и без регистрации.</p>
            <p>Онгоинги 2025–2026, классика, новинки — всё с озвучкой от команды Anilibria. Удобный каталог с фильтрами по жанрам, расписание выхода серий и персональные рекомендации.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
