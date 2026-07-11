import { prisma } from "@/lib/prisma";
import type { Anime } from "@prisma/client";

function genreScore(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  const matches = a.filter((g) => setB.has(g)).length;
  return matches / Math.max(a.length, b.length);
}

function studioScore(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  return a.some((s) => setB.has(s)) ? 1 : 0;
}

function yearScore(a?: number | null, b?: number | null): number {
  if (!a || !b) return 0;
  const diff = Math.abs(a - b);
  return diff <= 3 ? 1 - diff / 6 : 0;
}

function ratingScore(a?: number | null, b?: number | null): number {
  if (!a || !b) return 0;
  const diff = Math.abs(a - b);
  return diff <= 1 ? 1 - diff : 0;
}

function typeScore(a: string, b: string): number {
  return a === b ? 1 : 0;
}

function similarity(base: Anime, candidate: Anime): number {
  return (
    genreScore(base.genres, candidate.genres) * 0.4 +
    studioScore(base.studios, candidate.studios) * 0.2 +
    yearScore(base.year, candidate.year) * 0.15 +
    ratingScore(base.shikimoriRating, candidate.shikimoriRating) * 0.15 +
    typeScore(base.type, candidate.type) * 0.1
  );
}

const cache = new Map<string, { data: Anime[]; exp: number }>();

export async function getSimilarAnime(animeId: string, limit = 10): Promise<Anime[]> {
  const cacheKey = `similar_${animeId}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.exp > Date.now()) return cached.data;

  const base = await prisma.anime.findUnique({ where: { id: animeId } });
  if (!base) return [];

  const candidates = await prisma.anime.findMany({
    where: { id: { not: animeId }, isHidden: false },
    take: 200,
  });

  const scored = candidates
    .map((c) => ({ anime: c, score: similarity(base, c) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.anime);

  cache.set(cacheKey, { data: scored, exp: Date.now() + 24 * 60 * 60 * 1000 });
  return scored;
}

export async function getPersonalRecommendations(userId: string, limit = 10): Promise<Anime[]> {
  const cacheKey = `personal_${userId}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.exp > Date.now()) return cached.data;

  const history = await prisma.watchHistory.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 10,
    include: { anime: true },
  });

  if (!history.length) {
    const topAnime = await prisma.anime.findMany({
      where: { isHidden: false },
      orderBy: { viewsCount: "desc" },
      take: limit,
    });
    cache.set(cacheKey, { data: topAnime, exp: Date.now() + 6 * 60 * 60 * 1000 });
    return topAnime;
  }

  const watchedIds = new Set(history.map((h) => h.animeId));
  const favorites = await prisma.favorite.findMany({ where: { userId } });
  const favIds = new Set(favorites.map((f) => f.animeId));
  const excludeIds = new Set([...watchedIds, ...favIds]);

  const allGenres = history.flatMap((h) => h.anime.genres);
  const genreCount: Record<string, number> = {};
  for (const g of allGenres) genreCount[g] = (genreCount[g] || 0) + 1;
  const topGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([g]) => g);

  const candidates = await prisma.anime.findMany({
    where: {
      isHidden: false,
      id: { notIn: [...excludeIds] },
      genres: { hasSome: topGenres },
    },
    take: 100,
  });

  const baseAnimes = history.map((h) => h.anime);
  const scored = candidates
    .map((c) => ({
      anime: c,
      score: Math.max(...baseAnimes.map((b) => similarity(b, c))),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.anime);

  cache.set(cacheKey, { data: scored, exp: Date.now() + 6 * 60 * 60 * 1000 });
  return scored;
}
