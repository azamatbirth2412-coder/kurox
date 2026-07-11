import type { Metadata } from "next";
import { getAnimeList } from "@/lib/kodik";
import { AnimeCard } from "@/components/anime/AnimeCard";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const GENRE_MAP: Record<string, string> = {
  "экшен": "Экшен", "романтика": "Романтика", "комедия": "Комедия",
  "фэнтези": "Фэнтези", "сёнен": "Сёнен", "триллер": "Триллер",
  "ужасы": "Ужасы", "спорт": "Спорт", "меха": "Меха",
  "повседневность": "Повседневность", "приключения": "Приключения",
  "драма": "Драма", "школа": "Школа", "магия": "Магия", "исекай": "Исекай",
};

function makeSlug(title?: string, id?: string): string {
  if (!title) return id || "unknown";
  return title.toLowerCase().replace(/[^a-zа-яё0-9\s]/gi, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-") || id || "unknown";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const genreName = GENRE_MAP[decodeURIComponent(slug)] || decodeURIComponent(slug);
  return {
    title: `Аниме жанра ${genreName} — смотреть онлайн`,
    description: `Смотрите лучшие аниме жанра ${genreName} онлайн бесплатно на Kurox. Большой выбор тайтлов с озвучкой.`,
    alternates: { canonical: `/genre/${slug}` },
  };
}

export default async function GenrePage({ params }: PageProps) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const genreName = GENRE_MAP[decoded] || decoded;
  const data = await getAnimeList({ genre: genreName, limit: 24 });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: "Главная", href: "/" },
        { label: "Жанры", href: "/genres" },
        { label: genreName },
      ]} />
      <h1 className="text-2xl font-bold mt-4 mb-6">Аниме жанра «{genreName}»</h1>
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
      <div className="mt-12 bg-gray-900 rounded-xl p-6 text-sm text-gray-400 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-200 mb-3">Аниме жанра {genreName} на Kurox</h2>
        <p>В нашем каталоге собраны лучшие аниме жанра <strong className="text-gray-300">{genreName}</strong>. Все тайтлы доступны для просмотра онлайн бесплатно в высоком качестве с озвучкой и субтитрами.</p>
      </div>
    </div>
  );
}
