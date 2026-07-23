import { prisma } from "@/lib/prisma";

function parseArr(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return []; }
  }
  return [];
}

interface AnimeRow {
  id: string;
  genres: unknown;
  studios: unknown;
  year: number | null;
  shikimoriRating: number | null;
  type: string;
  [key: string]: unknown;
}

function genreScore(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  return a.filter(g => setB.has(g)).length / Math.max(a.length, b.length);
}

function studioScore(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  return a.some(s => new Set(b).has(s)) ? 1 : 0;
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

function similarity(base: AnimeRow, candidate: AnimeRow): number {
  return (
    genreScore(parseArr(base.genres), parseArr(candidate.genres)) * 0.4 +
    studioScore(parseArr(base.studios), parseArr(candidate.studios)) * 0.2 +
    yearScore(base.year, candidate.year) * 0.15 +
    ratingScore(base.shikimoriRating, candidate.shikimoriRating) * 0.15 +
    (base.type === candidate.type ? 1 : 0) * 0.1
  );
}

const cache = new Map<string, { data: AnimeRow[]; exp: number }>();

export async function getSimilarAnime(animeId: string, limit = 10): Promise<AnimeRow[]> {
  const cacheKey = `similar_${animeId}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.exp > Date.now()) return cached.data;

  const base = await prisma.anime.findUnique({ where: { id: animeId } }) as AnimeRow | null;
  if (!base) return [];

  const candidates = await prisma.anime.findMany({
    where: { id: { not: animeId }, isHidden: false },
    take: 200,
  }) as AnimeRow[];

  const scored = candidates
    .map(c => ({ anime: c, score: similarity(base, c) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.anime);

  cache.set(cacheKey, { data: scored, exp: Date.now() + 24 * 60 * 60 * 1000 });
  return scored;
}

export async function getPersonalRecommendations(userId: string, limit = 10): Promise<AnimeRow[]> {
  const cacheKey = `personal_${userId}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.exp > Date.now()) return cached.data;

  // Get recently watched slugs (last 30 unique anime)
  const history = await prisma.watchHistory.findMany({
    where: { userId, slug: { not: null } },
    select: { slug: true, animeId: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const seenAnimeIds = new Set<string>();
  const uniqueSlugs: string[] = [];
  for (const h of history) {
    if (!seenAnimeIds.has(h.animeId) && h.slug) {
      seenAnimeIds.add(h.animeId);
      uniqueSlugs.push(h.slug);
      if (uniqueSlugs.length >= 30) break;
    }
  }

  if (uniqueSlugs.length === 0) {
    // Cold start — top viewed
    const top = await prisma.anime.findMany({
      where: { isHidden: false },
      orderBy: { viewsCount: "desc" },
      take: limit,
    }) as AnimeRow[];
    cache.set(cacheKey, { data: top, exp: Date.now() + 6 * 60 * 60 * 1000 });
    return top;
  }

  // Match slugs against local catalog to extract taste profile
  const watched = await prisma.anime.findMany({
    where: { slug: { in: uniqueSlugs }, isHidden: false },
  }) as AnimeRow[];

  if (watched.length === 0) {
    // No catalog matches — top viewed
    const top = await prisma.anime.findMany({
      where: { isHidden: false },
      orderBy: { viewsCount: "desc" },
      take: limit,
    }) as AnimeRow[];
    cache.set(cacheKey, { data: top, exp: Date.now() + 6 * 60 * 60 * 1000 });
    return top;
  }

  // Build genre/studio/type frequency map from watch history
  const genreFreq = new Map<string, number>();
  const studioFreq = new Map<string, number>();
  const typeFreq = new Map<string, number>();

  for (const a of watched) {
    parseArr(a.genres).forEach(g => genreFreq.set(g, (genreFreq.get(g) || 0) + 1));
    parseArr(a.studios).forEach(s => studioFreq.set(s, (studioFreq.get(s) || 0) + 1));
    typeFreq.set(a.type, (typeFreq.get(a.type) || 0) + 1);
  }

  const favType = [...typeFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const watchedIds = new Set(watched.map(a => a.id));

  // Get all candidates not yet watched
  const candidates = await prisma.anime.findMany({
    where: { id: { notIn: [...watchedIds] }, isHidden: false },
    take: 500,
  }) as AnimeRow[];

  // Score each candidate by affinity to user taste
  const scored = candidates
    .map(c => {
      const genres = parseArr(c.genres);
      const studios = parseArr(c.studios);
      const total = watched.length || 1;

      const genreAffinity = genres.reduce((sum, g) => sum + (genreFreq.get(g) || 0), 0) / (total * Math.max(genres.length, 1));
      const studioAffinity = studios.reduce((sum, s) => sum + (studioFreq.get(s) || 0), 0) / (total * Math.max(studios.length, 1));
      const typeMatch = c.type === favType ? 1 : 0;

      return { anime: c, score: genreAffinity * 0.6 + studioAffinity * 0.25 + typeMatch * 0.15 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.anime);

  // If scores are all zero (no catalog overlap), fall back to top viewed
  const result = scored.length ? scored : (await prisma.anime.findMany({
    where: { isHidden: false },
    orderBy: { viewsCount: "desc" },
    take: limit,
  }) as AnimeRow[]);

  cache.set(cacheKey, { data: result, exp: Date.now() + 2 * 60 * 60 * 1000 });
  return result;
}

export function invalidatePersonalCache(userId: string) {
  cache.delete(`personal_${userId}`);
}
