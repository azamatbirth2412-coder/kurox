import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = {
  title: "Жанры аниме — все жанры на Kurox",
  description: "Выберите жанр аниме для просмотра онлайн на Kurox. Экшен, романтика, комедия, фэнтези и многие другие.",
  alternates: { canonical: "/genres" },
};

const GENRES = [
  { slug: "экшен", name: "Экшен", count: "1200+" },
  { slug: "романтика", name: "Романтика", count: "800+" },
  { slug: "комедия", name: "Комедия", count: "950+" },
  { slug: "фэнтези", name: "Фэнтези", count: "700+" },
  { slug: "сёнен", name: "Сёнен", count: "600+" },
  { slug: "триллер", name: "Триллер", count: "400+" },
  { slug: "ужасы", name: "Ужасы", count: "200+" },
  { slug: "спорт", name: "Спорт", count: "300+" },
  { slug: "меха", name: "Меха", count: "150+" },
  { slug: "повседневность", name: "Повседневность", count: "500+" },
  { slug: "приключения", name: "Приключения", count: "550+" },
  { slug: "драма", name: "Драма", count: "650+" },
  { slug: "школа", name: "Школа", count: "450+" },
  { slug: "магия", name: "Магия", count: "350+" },
  { slug: "исекай", name: "Исекай", count: "400+" },
];

export default function GenresPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Жанры" }]} />
      <h1 className="text-2xl font-bold mt-4 mb-8">Все жанры аниме</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {GENRES.map((genre) => (
          <Link
            key={genre.slug}
            href={`/genre/${encodeURIComponent(genre.slug)}`}
            className="bg-gray-900 hover:bg-purple-900/30 border border-gray-800 hover:border-purple-700 rounded-xl p-4 transition-all group"
          >
            <div className="font-semibold group-hover:text-purple-400 transition-colors">{genre.name}</div>
            <div className="text-sm text-gray-500 mt-1">{genre.count} тайтлов</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
