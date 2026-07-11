import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAnimeById } from "@/lib/kodik";
import { KodikPlayer } from "@/components/anime/KodikPlayer";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string; num: string }>;
}

function extractIdFromSlug(slug: string): string {
  const parts = slug.split("-");
  return parts[parts.length - 1];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, num } = await params;
  const id = extractIdFromSlug(slug);
  const anime = await getAnimeById(id);
  if (!anime) return { title: "Эпизод не найден" };

  const title = anime.material_data?.title || anime.title;
  return {
    title: `${title} — эпизод ${num} смотреть онлайн`,
    description: `Смотреть ${title} эпизод ${num} онлайн бесплатно на Kurox.`,
    alternates: { canonical: `/anime/${slug}/episode-${num}` },
    robots: { index: false },
  };
}

export default async function EpisodePage({ params }: PageProps) {
  const { slug, num } = await params;
  const episodeNum = Number(num);
  const id = extractIdFromSlug(slug);
  const anime = await getAnimeById(id);
  if (!anime) notFound();

  const title = anime.material_data?.title || anime.title;

  const allEpisodes = anime.seasons
    ? Object.values(anime.seasons).flatMap((s) => Object.keys(s.episodes).map(Number)).sort((a, b) => a - b)
    : [];

  const prevEp = allEpisodes.filter((e) => e < episodeNum).pop();
  const nextEp = allEpisodes.find((e) => e > episodeNum);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Breadcrumbs
        items={[
          { label: "Главная", href: "/" },
          { label: "Каталог", href: "/anime" },
          { label: title, href: `/anime/${slug}` },
          { label: `Эпизод ${episodeNum}` },
        ]}
      />

      <h1 className="text-xl font-bold mt-4 mb-4">
        {title} — Эпизод {episodeNum}
      </h1>

      {/* Player */}
      <KodikPlayer link={anime.link} title={title} episode={episodeNum} />

      {/* Episode navigation */}
      <div className="flex items-center justify-between mt-4 gap-3">
        {prevEp !== undefined ? (
          <Link
            href={`/anime/${slug}/episode-${prevEp}`}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <ChevronLeft size={16} /> Эпизод {prevEp}
          </Link>
        ) : (
          <div />
        )}

        <Link
          href={`/anime/${slug}`}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Все серии
        </Link>

        {nextEp !== undefined ? (
          <Link
            href={`/anime/${slug}/episode-${nextEp}`}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-xl text-sm transition-colors"
          >
            Эпизод {nextEp} <ChevronRight size={16} />
          </Link>
        ) : (
          <div />
        )}
      </div>

      {/* Episode list */}
      {allEpisodes.length > 1 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Все эпизоды</h2>
          <div className="flex flex-wrap gap-2">
            {allEpisodes.map((ep) => (
              <Link
                key={ep}
                href={`/anime/${slug}/episode-${ep}`}
                className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  ep === episodeNum
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                }`}
              >
                {ep}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
