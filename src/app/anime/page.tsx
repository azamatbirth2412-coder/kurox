export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import {
  getTrendingPage, getPopularPage, getSchedule, getByGenrePage, searchAnilibriaPage, getOngoingPage,
  animePoster, animeSlug, animeTitle, animeYear, animeEpisodes, animeEpisodesAired,
  GENRES, type AnilibriaAnime,
} from "@/lib/anilibria";
import { AnimeCard } from "@/components/anime/AnimeCard";
import { AdBanner } from "@/components/ui/AdBanner";
import { SlidersHorizontal, Search, ChevronLeft, ChevronRight, X } from "lucide-react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kurox.ru";

export const metadata: Metadata = {
  title: "Каталог аниме — все тайтлы с озвучкой",
  description: "Полный каталог аниме с русской озвучкой. Фильтрация по жанрам, рейтингу. Смотрите онлайн бесплатно.",
  alternates: { canonical: "/anime" },
};

interface PageProps {
  searchParams: Promise<{ genre?: string; sort?: string; page?: string; q?: string }>;
}

const SORT_OPTIONS = [
  { value: "trending", label: "Свежие серии" },
  { value: "ongoing",  label: "Онгоинги" },
  { value: "popular",  label: "Популярное" },
  { value: "schedule", label: "Расписание" },
];

const LIMIT = 48;

function buildUrl(overrides: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(overrides)) { if (v) p.set(k, v); }
  return `/anime${p.toString() ? `?${p}` : ""}`;
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
    rating: null,
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

  // Build visible page numbers: first, last, current ±2, with "..." gaps
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
          className="flex items-center gap-1 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] rounded-xl text-sm transition-all">
          <ChevronLeft size={14} /> Назад
        </a>
      )}
      {items.map((item, i) =>
        item === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-[var(--text3)] text-sm">…</span>
        ) : (
          <a key={item} href={buildUrlFn(item)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-medium transition-all ${
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
          className="flex items-center gap-1 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] rounded-xl text-sm transition-all">
          Вперёд <ChevronRight size={14} />
        </a>
      )}
    </div>
  );
}

export default async function AnimeCatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page  = Math.max(1, Number(params.page) || 1);
  const sort  = params.sort || "trending";
  const genre = params.genre;
  const query = params.q;

  let media: AnilibriaAnime[] = [];
  let total = 0;
  let totalPages = 1;

  if (query) {
    const r = await searchAnilibriaPage(query, page - 1, LIMIT);
    media = r.data; total = r.total; totalPages = r.totalPages;
  } else if (genre) {
    const r = await getByGenrePage(genre, page - 1, LIMIT);
    media = r.data; total = r.total; totalPages = r.totalPages;
  } else if (sort === "popular") {
    const r = await getPopularPage(page - 1, LIMIT);
    media = r.data; total = r.total; totalPages = r.totalPages;
  } else if (sort === "ongoing") {
    const r = await getOngoingPage(page - 1, LIMIT);
    media = r.data; total = r.total; totalPages = r.totalPages;
  } else if (sort === "schedule") {
    const sched = await getSchedule();
    media = Array.from(new Map(sched.map(a => [a.id, a])).values());
    total = media.length; totalPages = 1;
  } else {
    const r = await getTrendingPage(page - 1, LIMIT);
    media = r.data; total = r.total; totalPages = r.totalPages;
  }

  let activeLabel = "Каталог аниме";
  if (query)        activeLabel = `Поиск: ${query}`;
  else if (genre)   activeLabel = genre;
  else if (sort === "popular")  activeLabel = "Популярное за всё время";
  else if (sort === "ongoing")  activeLabel = "Онгоинги";
  else if (sort === "schedule") activeLabel = "Расписание";
  else activeLabel = "Свежие серии";

  const urlBuilder = (p: number) => buildUrl({ sort: params.sort, genre, q: query, page: p === 1 ? undefined : String(p) });

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text3)] mb-2">
          <a href="/" className="hover:text-[var(--accent)] transition-colors">Главная</a>
          <span>/</span>
          <span className="text-[var(--text2)]">Каталог</span>
          {(genre || query) && <><span>/</span><span className="text-[var(--text2)]">{activeLabel}</span></>}
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

      <div className="flex gap-6 items-start">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col gap-4 w-[220px] flex-shrink-0">
          <form method="GET" action="/anime" className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)] pointer-events-none" />
            <input name="q" defaultValue={query} placeholder="Поиск..."
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] pl-9 pr-4 py-2 text-sm outline-none focus:border-[var(--accent)] transition-colors" />
          </form>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
              <SlidersHorizontal size={13} className="text-[var(--accent)]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--text3)]">Сортировка</span>
            </div>
            <div className="py-1">
              {SORT_OPTIONS.map(s => {
                const active = sort === s.value && !genre && !query;
                return (
                  <a key={s.value} href={buildUrl({ sort: s.value })}
                    className={`flex items-center px-4 py-2.5 text-sm transition-colors ${active ? "text-[var(--accent)] bg-[var(--accent-dim)] font-semibold" : "text-[var(--text2)] hover:text-white hover:bg-white/4"}`}>
                    {active && <span className="w-1 h-4 bg-[var(--accent)] rounded-full mr-2.5 flex-shrink-0" />}
                    {s.label}
                  </a>
                );
              })}
            </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--text3)]">Жанр</span>
            </div>
            <div className="py-1 max-h-80 overflow-y-auto">
              {GENRES.map(g => {
                const active = genre === g;
                return (
                  <a key={g} href={buildUrl({ genre: g })}
                    className={`flex items-center px-4 py-2 text-sm transition-colors ${active ? "text-[var(--accent)] bg-[var(--accent-dim)] font-semibold" : "text-[var(--text2)] hover:text-white hover:bg-white/4"}`}>
                    {active && <span className="w-1 h-4 bg-[var(--accent)] rounded-full mr-2.5 flex-shrink-0" />}
                    {g}
                  </a>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Mobile filters */}
          <div className="lg:hidden flex items-center gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
            <form method="GET" action="/anime" className="relative flex-shrink-0">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text3)] pointer-events-none" />
              <input name="q" defaultValue={query} placeholder="Поиск..."
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl pl-8 pr-3 py-1.5 text-sm outline-none focus:border-[var(--accent)] transition-colors w-40" />
            </form>
            {SORT_OPTIONS.map(s => (
              <a key={s.value} href={buildUrl({ sort: s.value })}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap ${sort === s.value && !genre && !query ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text2)]"}`}>
                {s.label}
              </a>
            ))}
          </div>

          <AdBanner slot="header" className="mb-4" />

          {(genre || query) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {genre && <a href="/anime" className="flex items-center gap-1.5 px-3 py-1 bg-[var(--accent-dim)] border border-[var(--accent)]/30 rounded-full text-xs text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors">{genre} <X size={11} /></a>}
              {query && <a href="/anime" className="flex items-center gap-1.5 px-3 py-1 bg-[var(--accent-dim)] border border-[var(--accent)]/30 rounded-full text-xs text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors">«{query}» <X size={11} /></a>}
            </div>
          )}

          {media.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="text-5xl mb-4">🎌</div>
              <p className="text-lg font-semibold mb-1">Ничего не найдено</p>
              <p className="text-sm text-[var(--text3)]">Попробуйте изменить фильтры</p>
              <a href="/anime" className="mt-5 px-5 py-2 bg-[var(--accent)] hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors">Сбросить</a>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3">
              {media.map(a => <AnimeCard key={a.id} {...toCard(a)} />)}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} buildUrlFn={urlBuilder} />
        </div>
      </div>
    </div>
  );
}
