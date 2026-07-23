export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  getTrendingPage, searchAnilibriaPage, getByGenrePage,
  animePoster, animeSlug, animeTitle, animeYear, GENRES,
  type AnilibriaAnime,
} from "@/lib/anilibria";
import { getTotalAnimeCount } from "@/lib/anilibria";
import { ExternalLink, Search, ChevronLeft, ChevronRight, Film, Star, Calendar } from "lucide-react";

export const metadata: Metadata = { title: "Аниме — Админ-панель" };

interface PageProps {
  searchParams: Promise<{ q?: string; genre?: string; page?: string }>;
}

const LIMIT = 40;

function buildUrl(overrides: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(overrides)) { if (v) p.set(k, v); }
  return `/admin/anime${p.toString() ? `?${p}` : ""}`;
}

function Pagination({ page, totalPages, buildUrlFn }: {
  page: number; totalPages: number; buildUrlFn: (p: number) => string;
}) {
  if (totalPages <= 1) return null;
  const pages = new Set<number>();
  pages.add(1); pages.add(totalPages);
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pages.add(i);
  const sorted = [...pages].sort((a, b) => a - b);
  const items: (number | "...")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) items.push("...");
    items.push(sorted[i]);
  }
  return (
    <div className="flex flex-wrap justify-center items-center gap-1.5 mt-6">
      {page > 1 && (
        <a href={buildUrlFn(page - 1)}
          className="flex items-center gap-1 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] hover:border-violet-400/50 rounded-lg text-sm transition-all">
          <ChevronLeft size={13} /> Назад
        </a>
      )}
      {items.map((item, i) =>
        item === "..." ? (
          <span key={`d-${i}`} className="px-2 text-[var(--text3)] text-sm">…</span>
        ) : (
          <a key={item} href={buildUrlFn(item)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${item === page
              ? "bg-violet-500 text-white"
              : "bg-[var(--surface)] border border-[var(--border)] hover:border-violet-400/50"}`}>
            {item}
          </a>
        )
      )}
      {page < totalPages && (
        <a href={buildUrlFn(page + 1)}
          className="flex items-center gap-1 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] hover:border-violet-400/50 rounded-lg text-sm transition-all">
          Вперёд <ChevronRight size={13} />
        </a>
      )}
    </div>
  );
}

function AnimeRow({ a }: { a: AnilibriaAnime }) {
  const poster = animePoster(a);
  const slug = animeSlug(a);
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-violet-500/5 transition-colors border-b border-[var(--border)] last:border-0">
      {/* Poster */}
      <div className="relative w-10 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-[var(--surface2)]">
        {poster && (
          <Image src={poster} alt={animeTitle(a)} fill className="object-cover" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-sm font-semibold leading-snug line-clamp-1">{animeTitle(a)}</span>
          {a.is_ongoing && (
            <span className="text-[10px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">ОНГОИНГ</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--text3)]">
          {a.name?.english && <span className="truncate max-w-[200px]">{a.name.english}</span>}
          {animeYear(a) && <span className="flex items-center gap-0.5"><Calendar size={10} />{animeYear(a)}</span>}
          {a.type?.description && <span>{a.type.description}</span>}
          {a.episodes_total && <span>{a.episodes_total} эп.</span>}
        </div>
        {a.genres?.length ? (
          <div className="flex flex-wrap gap-1 mt-1">
            {a.genres.slice(0, 3).map(g => (
              <span key={g.id} className="text-[10px] bg-[var(--surface2)] text-[var(--text3)] px-1.5 py-0.5 rounded-full">{g.name}</span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Favorites */}
      <div className="text-xs text-[var(--text3)] flex items-center gap-1 flex-shrink-0 w-16 justify-end">
        <Star size={10} className="text-yellow-400" />
        {a.added_in_users_favorites.toLocaleString("ru")}
      </div>

      {/* ID */}
      <div className="text-xs text-[var(--text3)] w-10 text-right flex-shrink-0">#{a.id}</div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Link href={`/anime/${slug}`} target="_blank"
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-[var(--surface2)] hover:bg-violet-500/20 hover:text-violet-300 rounded-lg transition-colors">
          <ExternalLink size={11} /> Открыть
        </Link>
      </div>
    </div>
  );
}

export default async function AdminAnimePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page  = Math.max(1, Number(params.page) || 1);
  const query = params.q?.trim();
  const genre = params.genre;

  let anime: AnilibriaAnime[] = [];
  let total = 0;
  let totalPages = 1;

  if (query) {
    const r = await searchAnilibriaPage(query, page - 1, LIMIT);
    anime = r.data; total = r.total; totalPages = r.totalPages;
  } else if (genre) {
    const r = await getByGenrePage(genre, page - 1, LIMIT);
    anime = r.data; total = r.total; totalPages = r.totalPages;
  } else {
    const r = await getTrendingPage(page - 1, LIMIT);
    anime = r.data; total = r.total; totalPages = r.totalPages;
  }

  const totalCount = (!query && !genre && page === 1) ? total : await getTotalAnimeCount();
  const urlBuilder = (p: number) => buildUrl({ q: query, genre, page: p === 1 ? undefined : String(p) });

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Каталог аниме</h1>
          <p className="text-[var(--text2)] text-sm mt-1">
            Всего в Anilibria:{" "}
            <span className="font-bold text-violet-400">{totalCount.toLocaleString("ru")}</span> аниме
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-1.5">
          <Film size={16} className="text-violet-400 ml-1" />
          <span className="text-sm text-[var(--text2)] pr-2">Источник: Anilibria API</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 mb-5 flex flex-wrap gap-3 items-end">
        <form method="GET" action="/admin/anime" className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)] pointer-events-none" />
          <input name="q" defaultValue={query} placeholder="Поиск по названию..."
            className="w-full bg-[var(--bg2)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-violet-400 transition-colors" />
          {genre && <input type="hidden" name="genre" value={genre} />}
        </form>

        <div className="flex flex-wrap gap-1.5">
          <a href="/admin/anime"
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${!genre && !query ? "bg-violet-500 text-white" : "bg-[var(--bg2)] border border-[var(--border)] text-[var(--text2)] hover:text-white"}`}>
            Все
          </a>
          {GENRES.slice(0, 8).map(g => (
            <a key={g} href={buildUrl({ genre: g })}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${genre === g ? "bg-violet-500 text-white" : "bg-[var(--bg2)] border border-[var(--border)] text-[var(--text2)] hover:text-white"}`}>
              {g}
            </a>
          ))}
        </div>
      </div>

      {/* Results info */}
      <div className="flex items-center justify-between mb-3 text-sm text-[var(--text3)]">
        <span>
          {query ? `Результаты поиска «${query}»: ` : genre ? `Жанр «${genre}»: ` : "Свежие серии: "}
          <span className="text-[var(--text)]">{total.toLocaleString("ru")} аниме</span>
          {totalPages > 1 && <span> · стр. {page} из {totalPages}</span>}
        </span>
        {(query || genre) && (
          <a href="/admin/anime" className="text-violet-400 hover:text-violet-300 transition-colors">Сбросить фильтр</a>
        )}
      </div>

      {/* Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-2.5 bg-[var(--surface2)] border-b border-[var(--border)] text-xs font-bold uppercase tracking-widest text-[var(--text3)]">
          <span className="w-10">Фото</span>
          <span>Название / Жанры</span>
          <span className="w-16 text-right">Favs</span>
          <span className="w-10 text-right">ID</span>
          <span className="w-20 text-right">Действия</span>
        </div>

        {anime.length === 0 ? (
          <div className="py-16 text-center text-[var(--text2)] text-sm">
            <div className="text-4xl mb-3">🎌</div>
            <p>Ничего не найдено</p>
          </div>
        ) : (
          <div>
            {anime.map(a => <AnimeRow key={a.id} a={a} />)}
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} buildUrlFn={urlBuilder} />
    </div>
  );
}
