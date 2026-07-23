export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { getByGenre, animePoster, animeSlug, animeTitle, animeYear, animeEpisodes } from "@/lib/anilibria";
import { AnimeCard } from "@/components/anime/AnimeCard";
import Link from "next/link";
import { BackButton } from "@/components/ui/BackButton";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kurox.ru";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const genre = decodeURIComponent(slug);
  const pageUrl = `${APP_URL}/genre/${slug}`;
  return {
    title: `Аниме жанра ${genre} — смотреть онлайн бесплатно`,
    description: `Смотреть аниме жанра «${genre}» онлайн бесплатно в HD 1080p с русской озвучкой. Лучшие ${genre}-аниме — онгоинги, новинки и классика на Kurox.`,
    alternates: { canonical: `/genre/${slug}` },
    openGraph: {
      title: `Аниме жанра ${genre} — Kurox`,
      description: `Лучшие аниме жанра «${genre}» с русской озвучкой в HD. Онгоинги, новинки и классика — бесплатно на Kurox.`,
      type: "website",
      locale: "ru_RU",
      siteName: "Kurox",
      url: pageUrl,
    },
    twitter: {
      card: "summary",
      title: `Аниме жанра ${genre} — Kurox`,
      description: `Лучшие аниме жанра «${genre}» с русской озвучкой в HD на Kurox.`,
    },
  };
}

export default async function GenrePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(0, (Number(pageStr) || 1) - 1);
  const PAGE = page + 1;
  const genre = decodeURIComponent(slug);

  const media = await getByGenre(genre, page, 24);
  const hasNext = media.length === 24;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная",  item: APP_URL },
      { "@type": "ListItem", position: 2, name: "Каталог",  item: `${APP_URL}/anime` },
      { "@type": "ListItem", position: 3, name: genre,      item: `${APP_URL}/genre/${slug}` },
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
          <BackButton />
          <span className="opacity-30">|</span>
          <a href="/" className="hover:text-[var(--accent)] transition-colors">Главная</a>
          <span>/</span>
          <a href="/anime" className="hover:text-[var(--accent)] transition-colors">Каталог</a>
          <span>/</span>
          <span className="text-[var(--text2)]">{genre}</span>
        </div>
        <h1 className="text-2xl font-bold">Аниме жанра «{genre}»</h1>
      </div>

      {media.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-5xl mb-4">🎌</div>
          <p className="text-lg font-semibold mb-1">Ничего не найдено</p>
          <a href="/anime" className="mt-5 px-5 py-2 bg-[var(--accent)] hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors">
            В каталог
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {media.map(a => (
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
            <a href={`/genre/${slug}?page=${PAGE - 1}`}
              className="px-5 py-2 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] rounded-xl text-sm transition-[color,border-color] duration-200">
              ← Назад
            </a>
          )}
          <span className="w-10 h-10 flex items-center justify-center bg-[var(--accent)] text-white rounded-xl text-sm font-medium">{PAGE}</span>
          {hasNext && (
            <a href={`/genre/${slug}?page=${PAGE + 1}`}
              className="px-5 py-2 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] rounded-xl text-sm transition-[color,border-color] duration-200">
              Вперёд →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
