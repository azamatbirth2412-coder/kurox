import type { Metadata } from "next";
import { searchAnime } from "@/lib/kodik";
import { AnimeCard } from "@/components/anime/AnimeCard";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SearchForm } from "@/components/SearchForm";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Поиск: ${q}` : "Поиск аниме",
    description: q ? `Результаты поиска по запросу «${q}» на Kurox` : "Поиск аниме на Kurox",
    robots: { index: false },
  };
}

function makeSlug(title?: string, id?: string): string {
  if (!title) return id || "unknown";
  return (
    title.toLowerCase().replace(/[^a-zа-яё0-9\s]/gi, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-") ||
    id || "unknown"
  );
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const results = q ? await searchAnime(q) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Поиск" }]} />
      <h1 className="text-2xl font-bold mt-4 mb-6">Поиск аниме</h1>
      <SearchForm initialQuery={q} />
      {q && (
        <div className="mt-6">
          <p className="text-gray-400 mb-4 text-sm">
            {results.length > 0
              ? `Найдено ${results.length} результатов по запросу «${q}»`
              : `По запросу «${q}» ничего не найдено`}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {results.map((anime) => (
              <AnimeCard
                key={anime.id}
                id={anime.id}
                slug={makeSlug(anime.material_data?.title, anime.id)}
                title={anime.material_data?.title || anime.title}
                poster={anime.material_data?.poster_url}
                year={anime.material_data?.year || anime.year}
                type={anime.type === "anime-serial" ? "ТВ" : "Фильм"}
                rating={anime.material_data?.shikimori_rating}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
