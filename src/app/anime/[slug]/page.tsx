import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getAnimeById } from "@/lib/kodik";
import { KodikPlayer } from "@/components/anime/KodikPlayer";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { StarRating } from "@/components/ui/StarRating";
import { CommentSection } from "@/components/anime/CommentSection";
import { Star, Calendar } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function extractIdFromSlug(slug: string): string {
  const parts = slug.split("-");
  return parts[parts.length - 1];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const id = extractIdFromSlug(slug);
  const anime = await getAnimeById(id);
  if (!anime) return { title: "Аниме не найдено" };

  const title = anime.material_data?.title || anime.title;
  const description =
    anime.material_data?.description?.slice(0, 155) ||
    `Смотреть ${title} онлайн бесплатно в хорошем качестве на Kurox.`;
  const poster = anime.material_data?.poster_url;

  return {
    title: `${title} смотреть онлайн`,
    description,
    alternates: { canonical: `/anime/${slug}` },
    openGraph: {
      title,
      description,
      images: poster ? [{ url: poster, alt: title }] : [],
      type: "video.tv_show",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: poster ? [poster] : [],
    },
  };
}

export default async function AnimePage({ params }: PageProps) {
  const { slug } = await params;
  const id = extractIdFromSlug(slug);
  const anime = await getAnimeById(id);
  if (!anime) notFound();

  const title = anime.material_data?.title || anime.title;
  const poster = anime.material_data?.poster_url;
  const genres = anime.material_data?.anime_genres || anime.material_data?.genres || [];
  const episodes = anime.seasons
    ? Object.values(anime.seasons).flatMap((s) => Object.keys(s.episodes))
    : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": anime.type === "anime-serial" ? "TVSeries" : "Movie",
    name: title,
    description: anime.material_data?.description,
    image: poster,
    datePublished: anime.year ? `${anime.year}-01-01` : undefined,
    genre: genres,
    aggregateRating: anime.material_data?.shikimori_rating
      ? {
          "@type": "AggregateRating",
          ratingValue: anime.material_data.shikimori_rating,
          bestRating: 10,
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: "Главная", href: "/" },
            { label: "Каталог", href: "/anime" },
            { label: title },
          ]}
        />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          {/* Sidebar */}
          <div className="space-y-4">
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden">
              {poster ? (
                <Image
                  src={poster}
                  alt={`${title} — постер`}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500">
                  Нет постера
                </div>
              )}
            </div>

            <div className="bg-gray-900 rounded-xl p-4 space-y-3 text-sm">
              {anime.material_data?.shikimori_rating && (
                <div className="flex items-center gap-2">
                  <Star size={16} className="text-yellow-400" />
                  <span className="text-gray-400">Shikimori:</span>
                  <span className="font-semibold">{anime.material_data.shikimori_rating}</span>
                </div>
              )}
              {anime.year && (
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-blue-400" />
                  <span className="text-gray-400">Год:</span>
                  <span>{anime.year}</span>
                </div>
              )}
              {anime.type && (
                <div>
                  <span className="text-gray-400">Тип: </span>
                  <span>{anime.type === "anime-serial" ? "ТВ-сериал" : "Фильм"}</span>
                </div>
              )}
              {anime.material_data?.episodes_total && (
                <div>
                  <span className="text-gray-400">Эпизодов: </span>
                  <span>
                    {anime.material_data.episodes_aired || "?"}/{anime.material_data.episodes_total}
                  </span>
                </div>
              )}
              {anime.material_data?.anime_studios && anime.material_data.anime_studios.length > 0 && (
                <div>
                  <span className="text-gray-400">Студия: </span>
                  <span>{anime.material_data.anime_studios.join(", ")}</span>
                </div>
              )}
              {anime.material_data?.anime_status && (
                <div>
                  <span className="text-gray-400">Статус: </span>
                  <span className={anime.material_data.anime_status === "ongoing" ? "text-green-400" : "text-gray-300"}>
                    {anime.material_data.anime_status === "ongoing" ? "Онгоинг" : "Завершён"}
                  </span>
                </div>
              )}
            </div>

            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {genres.map((g) => (
                  <Link
                    key={g}
                    href={`/genre/${encodeURIComponent(g.toLowerCase())}`}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs transition-colors text-purple-300"
                  >
                    {g}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Main content */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
              {anime.material_data?.title_en && (
                <p className="text-gray-400 mt-1">{anime.material_data.title_en}</p>
              )}
            </div>

            {anime.material_data?.description && (
              <p className="text-gray-300 leading-relaxed">{anime.material_data.description}</p>
            )}

            {/* Player */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Плеер</h2>
              <KodikPlayer link={anime.link} title={title} />
            </div>

            {/* Episodes list */}
            {episodes.length > 1 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Эпизоды</h2>
                <div className="flex flex-wrap gap-2">
                  {episodes.map((ep) => (
                    <Link
                      key={ep}
                      href={`/anime/${slug}/episode-${ep}`}
                      className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      {ep}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* User rating */}
            <div className="bg-gray-900 rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-3">Ваша оценка</h2>
              <StarRating />
            </div>

            {/* Comments */}
            <CommentSection animeId={id} />
          </div>
        </div>
      </div>
    </>
  );
}
