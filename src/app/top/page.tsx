import type { Metadata } from "next";
import Link from "next/link";
import {
  getCatalogPage, animePoster, animeSlug, animeTitle, animeYear, animeRating,
  type AnilibriaAnime,
} from "@/lib/anilibria";
import { AnimeLeaderboard, type TopItem } from "@/components/anime/AnimeLeaderboard";
import { Trophy } from "lucide-react";

export const revalidate = 600; // 10 минут

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kurox.ru";

export const metadata: Metadata = {
  title: "Топ аниме — рейтинг лучших тайтлов",
  description: "Лучшие аниме по рейтингу и популярности. Топ онгоингов и тайтлов всех времён с русской озвучкой на Kurox.",
  alternates: { canonical: "/top" },
};

const TOP_N = 50;

function toItem(a: AnilibriaAnime, rank: number): TopItem {
  return {
    rank,
    id: a.id,
    slug: animeSlug(a),
    title: animeTitle(a),
    poster: animePoster(a),
    year: animeYear(a),
    genres: (a.genres ?? []).slice(0, 3).map(g => g.name),
    format: a.type?.description ?? null,
    isOngoing: !!a.is_ongoing,
    score: animeRating(a),
    favorites: a.added_in_users_favorites ?? 0,
  };
}

// Rank by derived audience score (desc), tie-broken by favorites; titles without
// enough data to score fall to the end, ordered by favorites.
function rankByScore(list: AnilibriaAnime[]): TopItem[] {
  return [...list]
    .sort((a, b) => {
      const ra = animeRating(a), rb = animeRating(b);
      if (ra == null && rb == null) return (b.added_in_users_favorites ?? 0) - (a.added_in_users_favorites ?? 0);
      if (ra == null) return 1;
      if (rb == null) return -1;
      if (rb !== ra) return rb - ra;
      return (b.added_in_users_favorites ?? 0) - (a.added_in_users_favorites ?? 0);
    })
    .slice(0, TOP_N)
    .map((a, i) => toItem(a, i + 1));
}

function rankByFavorites(list: AnilibriaAnime[]): TopItem[] {
  return [...list]
    .sort((a, b) => (b.added_in_users_favorites ?? 0) - (a.added_in_users_favorites ?? 0))
    .slice(0, TOP_N)
    .map((a, i) => toItem(a, i + 1));
}

export default async function TopPage() {
  // Two pages of the rating-sorted catalog form a 100-title pool for the rating
  // and popularity boards; ongoing has its own status-filtered fetch.
  const [pool0, pool1, ongoingRes] = await Promise.all([
    getCatalogPage({ sort: "rating", page: 0, limit: 50 }),
    getCatalogPage({ sort: "rating", page: 1, limit: 50 }),
    getCatalogPage({ status: "ongoing", sort: "rating", page: 0, limit: 50 }),
  ]);

  const pool = [...pool0.data, ...pool1.data];
  const ratingBoard = rankByScore(pool);
  const popularBoard = rankByFavorites(pool);
  const ongoingBoard = rankByScore(ongoingRes.data);

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Топ аниме Kurox",
    itemListElement: ratingBoard.slice(0, 10).map(i => ({
      "@type": "ListItem",
      position: i.rank,
      url: `${APP_URL}/anime/${i.slug}`,
      name: i.title,
    })),
  };

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text3)] mb-2">
          <Link href="/" className="hover:text-[var(--accent)] transition-colors">Главная</Link>
          <span>/</span>
          <span className="text-[var(--text2)]">Топ аниме</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-[var(--accent)]/12 ring-1 ring-[var(--accent)]/20 text-[var(--accent)] shrink-0">
            <Trophy size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-bold leading-tight">Топ аниме</h1>
            <p className="text-sm text-[var(--text3)] mt-0.5">Лучшее по рейтингу зрителей, популярности и среди онгоингов</p>
          </div>
        </div>
      </div>

      <AnimeLeaderboard rating={ratingBoard} popular={popularBoard} ongoing={ongoingBoard} />
    </div>
  );
}
