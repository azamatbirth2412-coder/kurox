export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import {
  getCatalogPage, getSchedule,
  animePoster, animeSlug, animeTitle, animeYear, animeEpisodes, animeEpisodesAired, animeRating, animeVotes,
  RELEASE_TYPES, CATALOG_STATUSES, AGE_RATINGS, SEASONS, type AnilibriaAnime, type CatalogStatus, type CatalogSort,
} from "@/lib/anilibria";
import { AnimeCard } from "@/components/anime/AnimeCard";
import { CatalogFilters, type CatalogFilterState } from "@/components/anime/CatalogFilters";
import { AdBanner } from "@/components/ui/AdBanner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { jsonLdHtml } from "@/lib/jsonld";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kurox.ru";
const CURRENT_YEAR = new Date().getFullYear();

export const metadata: Metadata = {
  title: "Каталог аниме — все тайтлы с озвучкой",
  description: "Полный каталог аниме с русской озвучкой. Фильтры по жанрам, типу, году, статусу и рейтингу. Смотрите онлайн бесплатно.",
  alternates: { canonical: "/anime" },
};

interface PageProps {
  searchParams: Promise<{
    genre?: string; type?: string; status?: string; year?: string;
    age?: string; season?: string;
    rating?: string; sort?: string; page?: string; q?: string;
  }>;
}

const LIMIT = 48;

function csv(v?: string): string[] {
  return v ? v.split(",").map(s => s.trim()).filter(Boolean) : [];
}

// Legacy sort values used across the site are mapped onto the new filter model.
function normalizeSort(sort?: string): { sort: CatalogSort; status?: CatalogStatus; schedule: boolean } {
  if (sort === "schedule") return { sort: "fresh", schedule: true };
  if (sort === "popular")  return { sort: "rating", schedule: false };
  if (sort === "ongoing")  return { sort: "fresh", status: "ongoing", schedule: false };
  if (sort === "rating")   return { sort: "rating", schedule: false };
  return { sort: "fresh", schedule: false }; // trending / default
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

function Pagination({ page, totalPages, buildUrlFn }: {
  page: number;
  totalPages: number;
  buildUrlFn: (p: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pages.add(i);
  const sorted = [...pages].sort((a, b) => a - b);

  const items: (number | "...")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) items.push("...");
    items.push(sorted[i]);
  }

  return (
    <div className="flex flex-wrap justify-center items-center gap-1.5 mt-10">
      {page > 1 && (
        <a href={buildUrlFn(page - 1)}
          className="flex items-center gap-1 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] rounded-xl text-sm transition-colors">
          <ChevronLeft size={14} /> Назад
        </a>
      )}
      {items.map((item, i) =>
        item === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-[var(--text3)] text-sm">…</span>
        ) : (
          <a key={item} href={buildUrlFn(item)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-medium transition-colors ${
              item === page
                ? "bg-[var(--accent)] text-white shadow-lg shadow-purple-900/40"
                : "bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
            }`}>
            {item}
          </a>
        )
      )}
      {page < totalPages && (
        <a href={buildUrlFn(page + 1)}
          className="flex items-center gap-1 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] rounded-xl text-sm transition-colors">
          Вперёд <ChevronRight size={14} />
        </a>
      )}
    </div>
  );
}

export default async function AnimeCatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const { sort, status: legacyStatus, schedule } = normalizeSort(params.sort);
  const genres = csv(params.genre);
  const types = csv(params.type).filter(t => RELEASE_TYPES.some(rt => rt.value === t));
  const status = (["ongoing", "finished", "announce"].includes(params.status ?? "")
    ? (params.status as CatalogStatus)
    : legacyStatus);
  const ageRatings = csv(params.age).filter(a => AGE_RATINGS.some(r => r.value === a));
  const seasons = csv(params.season).filter(s => SEASONS.some(x => x.value === s));
  const year = params.year;
  const minRating = params.rating && ["7", "8", "9"].includes(params.rating) ? Number(params.rating) : undefined;
  const q = params.q?.trim() || undefined;

  // Resolve the year filter into a from/to range.
  let yearFrom: number | undefined;
  let yearTo: number | undefined;
  if (year === "older") {
    yearTo = CURRENT_YEAR - 6; // everything before the 6-year quick-pick window
  } else if (year && /^\d{4}$/.test(year)) {
    yearFrom = yearTo = Number(year);
  }

  let media: AnilibriaAnime[] = [];
  let total = 0;
  let totalPages = 1;

  if (schedule) {
    const sched = await getSchedule();
    media = Array.from(new Map(sched.map(a => [a.id, a])).values());
    total = media.length;
    totalPages = 1;
  } else {
    const r = await getCatalogPage({
      genres, types, status, ageRatings, seasons, yearFrom, yearTo, sort, search: q,
      page: page - 1, limit: LIMIT,
    });
    media = r.data;
    total = r.total;
    totalPages = r.totalPages;
  }

  // The API exposes no numeric score, so the "Рейтинг N+" filter is applied to
  // the derived audience rating of the fetched page (see animeRating()).
  if (minRating != null) {
    media = media.filter(a => {
      const rt = animeRating(a);
      return rt != null && rt >= minRating;
    });
  }

  // Heading reflects the primary active facet.
  let activeLabel = "Каталог аниме";
  if (q) activeLabel = `Поиск: ${q}`;
  else if (schedule) activeLabel = "Расписание";
  else if (genres.length === 1) activeLabel = genres[0];
  else if (status) activeLabel = CATALOG_STATUSES.find(s => s.value === status)?.label ?? "Каталог аниме";
  else if (sort === "rating") activeLabel = "По рейтингу";

  const filterState: CatalogFilterState = {
    status, types, genres, ageRatings, seasons, year,
    rating: params.rating && ["7", "8", "9"].includes(params.rating) ? params.rating : undefined,
    sort, q,
  };

  const buildPageUrl = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    if (types.length) sp.set("type", types.join(","));
    if (genres.length) sp.set("genre", genres.join(","));
    if (ageRatings.length) sp.set("age", ageRatings.join(","));
    if (seasons.length) sp.set("season", seasons.join(","));
    if (year) sp.set("year", year);
    if (params.rating && minRating != null) sp.set("rating", params.rating);
    if (params.sort) sp.set("sort", params.sort);
    else if (sort === "rating") sp.set("sort", "rating");
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/anime${qs ? `?${qs}` : ""}`;
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: APP_URL },
      { "@type": "ListItem", position: 2, name: "Каталог", item: `${APP_URL}/anime` },
    ],
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumbSchema) }}
      />
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text3)] mb-2">
          <Link href="/" className="hover:text-[var(--accent)] transition-colors">Главная</Link>
          <span>/</span>
          <span className="text-[var(--text2)]">Каталог</span>
          {activeLabel !== "Каталог аниме" && <><span>/</span><span className="text-[var(--text2)]">{activeLabel}</span></>}
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">{activeLabel}</h1>
          {total > 0 && (
            <span className="text-sm text-[var(--text3)] mb-0.5">
              {total.toLocaleString("ru")} аниме{totalPages > 1 ? ` · стр. ${page} из ${totalPages}` : ""}
            </span>
          )}
        </div>
      </div>

      {!schedule && <CatalogFilters initial={filterState} />}

      <AdBanner slot="header" className="mb-4" />

      {media.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-5xl mb-4">🎌</div>
          <p className="text-lg font-semibold mb-1">Ничего не найдено</p>
          <p className="text-sm text-[var(--text3)]">Попробуйте изменить фильтры</p>
          <Link href="/anime" className="mt-5 px-5 py-2 bg-[var(--accent)] hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors">Сбросить</Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3">
          {media.map(a => <AnimeCard key={a.id} {...toCard(a)} />)}
        </div>
      )}

      {!schedule && <Pagination page={page} totalPages={totalPages} buildUrlFn={buildPageUrl} />}
    </div>
  );
}
