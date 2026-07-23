export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { searchAnilibria, animePoster, animeSlug, animeTitle, animeYear, animeEpisodes, type AnilibriaAnime } from "@/lib/anilibria";
import { AnimeCard } from "@/components/anime/AnimeCard";
import { Search } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Поиск: ${q}` : "Поиск аниме",
    description: q ? `Результаты поиска «${q}» на Kurox` : "Поиск аниме по названию на Kurox",
    robots: { index: false },
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q, page: pageStr } = await searchParams;
  const page = Math.max(0, (Number(pageStr) || 1) - 1);
  const PAGE = page + 1;

  let results: AnilibriaAnime[] = [];
  if (q) {
    results = await searchAnilibria(q, page, 24);
  }

  const hasNext = results.length === 24;

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text3)] mb-2">
          <a href="/" className="hover:text-[var(--accent)] transition-colors">Главная</a>
          <span>/</span>
          <span className="text-[var(--text2)]">Поиск</span>
        </div>
        <h1 className="text-2xl font-bold">Поиск аниме</h1>
      </div>

      <form method="GET" action="/search" className="mb-8">
        <div className="relative max-w-xl">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Введите название аниме на русском..."
            autoFocus={!q}
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl pl-12 pr-28 py-3.5 text-sm outline-none focus:border-[var(--accent)] transition-colors"
          />
          <button type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-[var(--accent)] hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            Найти
          </button>
        </div>
        <p className="text-xs text-[var(--text3)] mt-2 ml-1">Поиск по базе аниме с русской озвучкой</p>
      </form>

      {q && (
        <>
          <p className="text-sm text-[var(--text2)] mb-5">
            По запросу <strong className="text-[var(--text)]">«{q}»</strong>
            {results.length > 0 ? ` — найдено ${results.length}+` : ""}
          </p>

          {results.length === 0 ? (
            <div className="text-center py-24">
              <Search size={56} className="mx-auto mb-4 opacity-10" />
              <p className="text-lg font-medium mb-2">Ничего не найдено</p>
              <p className="text-sm text-[var(--text3)]">Попробуйте другой запрос</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {results.map(a => (
                <AnimeCard
                  key={a.id}
                  id={a.id}
                  slug={animeSlug(a)}
                  title={animeTitle(a)}
                  titleOrig={a.name?.english || undefined}
                  poster={animePoster(a)}
                  year={animeYear(a)}
                  format={a.type?.description}
                  status={a.is_ongoing ? "RELEASING" : "FINISHED"}
                  rating={null}
                  episodes={animeEpisodes(a)}
                  genres={a.genres?.slice(0, 2).map(g => g.name)}
                  isNew={a.is_ongoing}
                />
              ))}
            </div>
          )}

          {(PAGE > 1 || hasNext) && (
            <div className="flex justify-center items-center gap-3 mt-10">
              {PAGE > 1 && (
                <a href={`/search?q=${encodeURIComponent(q)}&page=${PAGE - 1}`}
                  className="px-5 py-2 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] rounded-xl text-sm transition-[color,border-color] duration-200">
                  ← Назад
                </a>
              )}
              <span className="w-10 h-10 flex items-center justify-center bg-[var(--accent)] text-white rounded-xl text-sm font-medium">{PAGE}</span>
              {hasNext && (
                <a href={`/search?q=${encodeURIComponent(q)}&page=${PAGE + 1}`}
                  className="px-5 py-2 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] rounded-xl text-sm transition-[color,border-color] duration-200">
                  Вперёд →
                </a>
              )}
            </div>
          )}
        </>
      )}

      {!q && (
        <div className="text-center py-24 text-[var(--text2)]">
          <Search size={56} className="mx-auto mb-4 opacity-10" />
          <p className="text-lg font-medium mb-2">Начните поиск</p>
          <p className="text-sm text-[var(--text3)]">Введите название аниме на русском языке</p>
        </div>
      )}
    </div>
  );
}
