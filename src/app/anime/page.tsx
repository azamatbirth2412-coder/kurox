import type { Metadata } from "next";
import { getAnimeList } from "@/lib/kodik";
import { AnimeCard } from "@/components/anime/AnimeCard";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = {
  title: "Каталог аниме — все тайтлы",
  description: "Полный каталог аниме онлайн. Фильтрация по жанрам, годам, статусу. Смотрите онлайн бесплатно.",
  alternates: { canonical: "/anime" },
};

interface PageProps {
  searchParams: Promise<{
    genre?: string;
    year?: string;
    type?: string;
    page?: string;
    sort?: string;
  }>;
}

function makeSlug(title?: string, id?: string): string {
  if (!title) return id || "unknown";
  return (
    title
      .toLowerCase()
      .replace(/[^a-zа-яё0-9\s]/gi, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") || id || "unknown"
  );
}

const GENRES = [
  "Экшен", "Романтика", "Комедия", "Фэнтези", "Сёнен",
  "Триллер", "Ужасы", "Спорт", "Меха", "Повседневность",
];
const TYPES = [
  { value: "anime-serial", label: "ТВ" },
  { value: "anime", label: "Фильм" },
];

export default async function AnimeCatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const data = await getAnimeList({
    genre: params.genre,
    year: params.year ? Number(params.year) : undefined,
    type: params.type,
    page,
    limit: 24,
  });

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = { genre: params.genre, year: params.year, type: params.type, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    return `/anime${p.toString() ? `?${p}` : ""}`;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Каталог" }]} />
      <h1 className="text-2xl font-bold mt-4 mb-6">Каталог аниме</h1>

      {/* Filters */}
      <div className="bg-gray-900 rounded-xl p-4 mb-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 self-center mr-1">Жанр:</span>
          <a href={buildUrl({ genre: undefined })}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${!params.genre ? "bg-purple-600 text-white" : "bg-gray-800 hover:bg-gray-700 text-gray-300"}`}>
            Все
          </a>
          {GENRES.map((g) => (
            <a key={g} href={buildUrl({ genre: g })}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${params.genre === g ? "bg-purple-600 text-white" : "bg-gray-800 hover:bg-gray-700 text-gray-300"}`}>
              {g}
            </a>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-gray-500 self-center mr-1">Тип:</span>
          <a href={buildUrl({ type: undefined })}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${!params.type ? "bg-purple-600 text-white" : "bg-gray-800 hover:bg-gray-700 text-gray-300"}`}>
            Все
          </a>
          {TYPES.map((t) => (
            <a key={t.value} href={buildUrl({ type: t.value })}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${params.type === t.value ? "bg-purple-600 text-white" : "bg-gray-800 hover:bg-gray-700 text-gray-300"}`}>
              {t.label}
            </a>
          ))}
        </div>
      </div>

      {/* Grid */}
      {data.results.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Ничего не найдено по выбранным фильтрам.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {data.results.map((anime) => (
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
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-2 mt-8">
        {page > 1 && (
          <a href={buildUrl({ page: String(page - 1) })}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            ← Назад
          </a>
        )}
        <span className="px-4 py-2 bg-gray-900 rounded-lg text-gray-400 select-none">
          Страница {page}
        </span>
        {data.results.length === 24 && (
          <a href={buildUrl({ page: String(page + 1) })}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            Вперёд →
          </a>
        )}
      </div>
    </div>
  );
}
