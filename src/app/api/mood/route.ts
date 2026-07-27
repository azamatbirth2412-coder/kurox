import { NextRequest, NextResponse } from "next/server";
import {
  getCatalogPage,
  animePoster,
  animeSlug,
  animeTitle,
  animeYear,
  animeRating,
  animeVotes,
  GENRE_IDS,
  type AnilibriaAnime,
} from "@/lib/anilibria";
import { franchiseKeys } from "@/lib/recommendations";

export const dynamic = "force-dynamic";

/**
 * "Аниме по настроению".
 *
 * This used to query the local Prisma `anime` table, which is empty
 * (`prisma.anime.count()` → 0) — every mood returned [] and the picker showed
 * "Ничего не нашлось". The whole site reads live Anilibria data, so this does
 * too.
 *
 * Only names present in GENRE_IDS resolve to a catalog filter; the old mapping
 * leaned on "Боевые искусства", "Пародия", "Гарем", "Трагедия", "Преодоление"
 * and "Сёнэн", none of which exist there. Worse, `getCatalogPage` SILENTLY
 * DROPS an unresolvable genre rather than failing, so such a mood would have
 * returned the unfiltered catalog. Every name below is verified against
 * GENRE_IDS at module load.
 */
const MOOD_GENRES: Record<string, string[]> = {
  hype:    ["Экшен", "Приключения", "Фэнтези"],
  chill:   ["Повседневность", "Романтика", "Музыка", "Школа"],
  laugh:   ["Комедия"],
  sad:     ["Драма", "Психологическое"],
  tense:   ["Триллер", "Детектив", "Ужасы", "Мистика"],
  inspire: ["Спорт", "Сёнен"],
};

// Fail loudly in development if a mood ever picks up a name the catalog can't
// filter on — that is exactly how this endpoint silently broke before.
if (process.env.NODE_ENV !== "production") {
  for (const [mood, genres] of Object.entries(MOOD_GENRES)) {
    for (const g of genres) {
      if (!(g in GENRE_IDS)) console.warn(`[api/mood] "${mood}": unknown genre "${g}"`);
    }
  }
}

const DEFAULT_MOOD = "hype";
const LIMIT = 14;
const POOL_LIMIT = 50; // the catalog endpoint 422s above 50

interface MoodResult {
  id: string;
  slug: string;
  title: string;
  poster: string | null;
  year: number | null;
  type: string;
  /** JSON-encoded string[] — MoodPicker runs JSON.parse on it. */
  genres: string;
}

// 1-hour in-memory cache, keyed by mood id.
const moodCache = new Map<string, { data: MoodResult[]; exp: number }>();
const CACHE_TTL = 60 * 60 * 1000;

function toResult(a: AnilibriaAnime): MoodResult {
  return {
    id: String(a.id),
    slug: animeSlug(a),
    title: animeTitle(a),
    poster: animePoster(a) || null,
    year: animeYear(a),
    type: a.type?.description ?? a.type?.value ?? "",
    genres: JSON.stringify((a.genres ?? []).map(g => g.name)),
  };
}

export async function GET(req: NextRequest) {
  const requested = req.nextUrl.searchParams.get("mood") ?? DEFAULT_MOOD;
  const mood = requested in MOOD_GENRES ? requested : DEFAULT_MOOD;

  const cached = moodCache.get(mood);
  if (cached && cached.exp > Date.now()) return NextResponse.json(cached.data);

  const genres = MOOD_GENRES[mood];

  // Multiple f[genres][] values are ANDed by the API (verified against the live
  // endpoint: Спорт+Музыка → 0 results), so each genre is fetched separately in
  // parallel and the pools are merged — correct under either semantics.
  const pools = await Promise.allSettled(
    genres.map(g => getCatalogPage({ genres: [g], sort: "rating", limit: POOL_LIMIT })),
  );

  const byId = new Map<number, AnilibriaAnime>();
  for (const p of pools) {
    if (p.status !== "fulfilled") continue;
    for (const a of p.value.data) if (!byId.has(a.id)) byId.set(a.id, a);
  }

  const moodSet = new Set(genres);
  // Matching 2 of a 4-genre mood already means a strong fit, so normalise by at
  // most 2 rather than by the full list (`laugh` has a single genre anyway).
  const fitDivisor = Math.min(moodSet.size, 2);
  const currentYear = new Date().getFullYear();

  const ranked = [...byId.values()]
    .map(a => {
      const own = (a.genres ?? []).map(g => g.name);
      const matched = own.filter(g => moodSet.has(g)).length;
      const moodFit = Math.min(1, matched / fitDivisor);

      const rating = animeRating(a);
      const quality = rating == null ? 0.25 : Math.min(1, Math.max(0, (rating - 5) / 4.5));
      const reach = Math.min(1, Math.log10(animeVotes(a) + 1) / 5);
      const recency = (a.year ?? 0) >= currentYear - 8 ? 0.05 : 0;

      return { a, score: moodFit * 0.45 + quality * 0.3 + reach * 0.2 + recency };
    })
    .sort((x, y) => y.score - x.score);

  // One title per franchise so a mood isn't six seasons of the same show.
  const usedKeys = new Set<string>();
  const picked: MoodResult[] = [];
  for (const { a } of ranked) {
    const [titleKey, aliasKey] = franchiseKeys(a);
    if (usedKeys.has(titleKey) || usedKeys.has(aliasKey)) continue;
    usedKeys.add(titleKey);
    usedKeys.add(aliasKey);
    picked.push(toResult(a));
    if (picked.length >= LIMIT) break;
  }

  // Only cache a real answer — an upstream outage must not be pinned for an hour.
  if (picked.length > 0) moodCache.set(mood, { data: picked, exp: Date.now() + CACHE_TTL });

  return NextResponse.json(picked);
}
