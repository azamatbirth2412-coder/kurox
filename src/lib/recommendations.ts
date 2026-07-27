/**
 * Recommendation / similarity engine over LIVE Anilibria data.
 *
 * The local Prisma `anime` table is empty (`prisma.anime.count()` → 0) and the
 * rest of the site reads straight from the Anilibria API, so everything here
 * operates on `AnilibriaAnime` objects rather than DB rows.
 */
import {
  getCatalogPage,
  getPopular,
  animeRating,
  animeVotes,
  GENRE_IDS,
  type AnilibriaAnime,
} from "@/lib/anilibria";

/* ────────────────────────────────────────────────────────────────────────────
 * Genre-name resolution
 *
 * `getCatalogPage` maps Russian genre names to ids via GENRE_IDS and SILENTLY
 * DROPS anything it cannot resolve — a dropped genre doesn't return "nothing",
 * it returns the *unfiltered* top-rated catalog dressed up as a genre match.
 * That matters because a release's own `genres[]` uses the API's spelling, and:
 *   • the API calls genre 5 "Сейнен" while GENRE_IDS keys it as "Сэйнен";
 *   • 12 of the API's 35 genres are absent from GENRE_IDS altogether
 *     (Гарем, Этти, Пародия, Боевые искусства, Демоны, Игры, Сёдзе, Супер сила,
 *      Вампиры, Киберпанк, Сёдзе-ай, Дзёсей).
 * So resolve every name here first and only query the ones that really map.
 * ──────────────────────────────────────────────────────────────────────────── */

// Fold the spelling variants the two sources disagree on (ё/е, э/е, spacing).
function normGenre(s: string): string {
  return s.toLowerCase().replace(/ё/g, "е").replace(/э/g, "е").replace(/[\s\-_]+/g, "");
}

const GENRE_BY_NORM = new Map<string, string>(
  Object.keys(GENRE_IDS).map(k => [normGenre(k), k]),
);

/** Canonical GENRE_IDS key for an API genre name, or null if it isn't filterable. */
export function knownGenreName(name: string): string | null {
  return GENRE_BY_NORM.get(normGenre(name)) ?? null;
}

/**
 * Approximate catalog size per genre, measured against the live endpoint.
 * Used only to ORDER a title's genres, never as a hard number, so drift is
 * harmless — the ranking between broad and narrow genres is what matters.
 *
 * A release's `genres[]` comes back sorted by genre id, and the low ids happen
 * to be the broadest buckets (Комедия=1, Сёнен=4). Taking the first few would
 * therefore keep "Комедия/Сёнен/Школа" for Haikyuu and throw away "Спорт" — the
 * one genre that actually says what the show is. Rarest-first fixes that.
 */
const GENRE_SIZE: Record<string, number> = {
  "Исекай": 45, "Мистика": 50, "Спорт": 51, "Триллер": 56, "Музыка": 56,
  "Меха": 58, "Ужасы": 76, "Психологическое": 78, "Исторический": 93,
  "Магия": 111, "Детектив": 146, "Сэйнен": 191, "Повседневность": 216,
  "Фантастика": 269, "Сверхъестественное": 300, "Сёнен": 318, "Драма": 360,
  "Школа": 363, "Приключения": 454, "Романтика": 460, "Фэнтези": 617,
  "Экшен": 670, "Комедия": 671,
};

/** A title's filterable genres, most specific first. */
export function rankedGenres(a: AnilibriaAnime): string[] {
  const names: string[] = [];
  for (const g of a.genres ?? []) {
    const k = knownGenreName(g.name);
    if (k && !names.includes(k)) names.push(k);
  }
  return names.sort((x, y) => (GENRE_SIZE[x] ?? 400) - (GENRE_SIZE[y] ?? 400));
}

/* ────────────────────────────────────────────────────────────────────────────
 * Franchise detection
 *
 * "Similar" must not mean "the other six seasons of what you're already
 * watching". Both the title and the alias are reduced to a franchise key, and a
 * candidate is rejected if EITHER key collides with one already used.
 * ──────────────────────────────────────────────────────────────────────────── */

// Trailing words that mark a sequel/format rather than a different franchise.
const SEQUEL_TOKENS = new Set([
  "сезон", "сезона", "сезонов", "часть", "часть2", "финал", "фильм", "фильмы",
  "спешл", "спешлы", "спецвыпуск", "ова", "тв", "продолжение", "новый", "новая",
  "season", "part", "final", "movie", "film", "ova", "ona", "tv", "special",
  "specials", "the", "nd", "rd", "st", "th",
]);

const ROMAN_NUMERAL = /^(?:i{1,3}|iv|vi{0,3}|ix|xi{0,3}|x)$/;

function reduceToFranchise(raw: string): string {
  if (!raw) return "";
  // Everything after a subtitle separator is season/arc flavour, not identity.
  const head = raw
    .toLowerCase()
    .replace(/[‐-―]/g, "-")
    .split(/[:~!?•]|\s-\s|\s\/\s/)[0];

  const cleaned = head
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = cleaned.split(" ").filter(Boolean);
  while (tokens.length > 1) {
    const last = tokens[tokens.length - 1];
    // A trailing single character is a part marker, never a distinct title
    // ("Токийский Гуль √A" → "токийский гуль").
    if (
      last.length === 1 ||
      /^\d{1,2}$/.test(last) ||
      ROMAN_NUMERAL.test(last) ||
      SEQUEL_TOKENS.has(last)
    ) {
      tokens.pop();
      continue;
    }
    break;
  }
  return tokens.join(" ");
}

// Aliases are slugs of the romaji title, so the same trimming applies to the
// last path segment: "tokyo-ghoul-re" / "tokyo-ghoul-a" → "tokyo-ghoul".
const ALIAS_SUFFIX = /-(?:[a-z0-9]{1,2}|tv|ova|ona|movie|film|special|final|part\d?|season\d?|\d+(?:nd|rd|st|th)?)$/;

/** Title-derived and alias-derived franchise keys. Either colliding = same franchise. */
export function franchiseKeys(a: AnilibriaAnime): [string, string] {
  const titleKey = reduceToFranchise(a.name?.main || a.name?.english || a.alias || "");

  // At most two passes — a franchise marker is never longer than two segments
  // ("…-2nd-season", "…-movie-2") — and never below 4 chars, so a slug can't
  // erode into a prefix that collides with an unrelated short title
  // ("k-on" must not reduce to "k", "kimi-no-na-wa" must not reduce to "kimi").
  let aliasKey = (a.alias || "").toLowerCase();
  for (let i = 0; i < 2; i++) {
    const trimmed = aliasKey.replace(ALIAS_SUFFIX, "");
    if (trimmed === aliasKey || trimmed.length < 4) break;
    aliasKey = trimmed;
  }

  return [titleKey || String(a.id), aliasKey || String(a.id)];
}

/* ────────────────────────────────────────────────────────────────────────────
 * Scoring
 * ──────────────────────────────────────────────────────────────────────────── */

const WEIGHTS = {
  genre:   0.45, // dominant signal
  type:    0.15, // TV ↔ TV, MOVIE ↔ MOVIE
  year:    0.12, // penalise wildly different eras
  quality: 0.18, // derived audience score
  votes:   0.10, // audience-size confidence
} as const;

// IDF-style weight: sharing "Спорт" (51 titles) says far more about two shows
// than sharing "Комедия" (671). Genres outside GENRE_SIZE — Демоны, Гарем,
// Вампиры, Киберпанк … — are niche tags, so they default to a high weight.
// The numerator exceeds the largest genre, so every weight stays positive.
const weightMemo = new Map<string, number>();

function genreWeight(name: string): number {
  const hit = weightMemo.get(name);
  if (hit !== undefined) return hit;
  const canonical = knownGenreName(name);
  const w = Math.log10(1500 / (canonical ? GENRE_SIZE[canonical] ?? 150 : 150));
  weightMemo.set(name, w);
  return w;
}

function weightSum(genres: Iterable<string>): number {
  let sum = 0;
  for (const g of genres) sum += genreWeight(g);
  return sum;
}

// Weighted cosine: rewards a genuinely specific overlap while penalising
// candidates that match only because they carry a dozen genres.
// `baseWeight` is hoisted by the caller — it is constant across candidates.
function genreSimilarity(
  base: Set<string>,
  baseWeight: number,
  cand: Set<string>,
): { sim: number; shared: number } {
  if (!base.size || !cand.size) return { sim: 0, shared: 0 };
  let shared = 0;
  let inter = 0;
  for (const g of base) {
    if (!cand.has(g)) continue;
    shared++;
    inter += genreWeight(g);
  }
  if (!shared) return { sim: 0, shared: 0 };
  const denom = Math.sqrt(baseWeight * weightSum(cand));
  return { sim: denom > 0 ? Math.min(1, inter / denom) : 0, shared };
}

function yearScore(baseYear: number | null, candYear: number | null): number {
  if (!baseYear || !candYear) return 0.3; // unknown — neutral, never a bonus
  return Math.max(0, 1 - Math.abs(baseYear - candYear) / 15);
}

// animeRating() maps satisfaction onto 5.0–9.5 and returns null below 60 votes.
function qualityScore(a: AnilibriaAnime): number {
  const r = animeRating(a);
  if (r == null) return 0.25; // too little signal — don't promote, don't bury
  return Math.min(1, Math.max(0, (r - 5) / 4.5));
}

// log10 so 100k viewers ≈ 1.0 and a few hundred still register.
function votesScore(a: AnilibriaAnime): number {
  return Math.min(1, Math.log10(animeVotes(a) + 1) / 5);
}

export interface ScoredAnime {
  anime: AnilibriaAnime;
  score: number;
  /** Shares at least one genre with the source title. */
  related: boolean;
}

/**
 * Rank candidates against `base`. Pure and synchronous — no network calls, so it
 * is safe to run over a few hundred candidates per request.
 *
 * Genre-sharing candidates always outrank genre-less filler, so a very popular
 * but unrelated ongoing can never displace a genuine match (that inversion is
 * why every page used to recommend the same handful of titles).
 */
export function rankSimilar(
  base: AnilibriaAnime,
  candidates: AnilibriaAnime[],
  limit = 16,
): AnilibriaAnime[] {
  const baseGenres = new Set((base.genres ?? []).map(g => g.name));
  const baseWeight = weightSum(baseGenres);
  const baseYear = base.year ?? null;
  const baseType = base.type?.value ?? null;

  const scored: ScoredAnime[] = [];
  const seenIds = new Set<number>([base.id]);

  for (const c of candidates) {
    if (seenIds.has(c.id)) continue;
    seenIds.add(c.id);

    const candGenres = new Set((c.genres ?? []).map(g => g.name));
    const { sim, shared } = genreSimilarity(baseGenres, baseWeight, candGenres);
    const typeMatch = baseType && c.type?.value === baseType ? 1 : 0;

    const score =
      sim * WEIGHTS.genre +
      typeMatch * WEIGHTS.type +
      yearScore(baseYear, c.year ?? null) * WEIGHTS.year +
      qualityScore(c) * WEIGHTS.quality +
      votesScore(c) * WEIGHTS.votes;

    scored.push({ anime: c, score, related: shared > 0 });
  }

  // Related first, filler only after — then by score inside each tier.
  scored.sort((a, b) =>
    a.related === b.related ? b.score - a.score : Number(b.related) - Number(a.related),
  );

  // One entry per franchise, and never the source's own franchise.
  const usedKeys = new Set<string>(franchiseKeys(base));
  const out: AnilibriaAnime[] = [];
  for (const { anime } of scored) {
    const [titleKey, aliasKey] = franchiseKeys(anime);
    if (usedKeys.has(titleKey) || usedKeys.has(aliasKey)) continue;
    usedKeys.add(titleKey);
    usedKeys.add(aliasKey);
    out.push(anime);
    if (out.length >= limit) break;
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Candidate fetching
 * ──────────────────────────────────────────────────────────────────────────── */

const POOL_LIMIT = 50; // the catalog endpoint 422s above 50

const similarCache = new Map<string, { data: AnilibriaAnime[]; exp: number }>();
const SIMILAR_TTL = 30 * 60 * 1000; // 30 min

/**
 * Similar titles for an Anilibria release.
 *
 * Bounded fan-out: at most 6 catalog requests, all issued in parallel and all
 * memoised by `apiFetch`, so there is no per-card network work.
 *
 * Multiple `f[genres][]` values are ANDed by the API (verified: Спорт+Музыка →
 * 0 results), which is exploited deliberately — a genre *pair* query returns
 * titles sharing both genres, the strongest relevance signal available for one
 * round-trip. Single-genre pools (sorted by rating, not freshness) widen it.
 */
export async function getSimilar(base: AnilibriaAnime, limit = 16): Promise<AnilibriaAnime[]> {
  const cacheKey = `${base.id}:${limit}`;
  const cached = similarCache.get(cacheKey);
  if (cached && cached.exp > Date.now()) return cached.data;

  const top = rankedGenres(base).slice(0, 3);

  const queries: Promise<{ data: AnilibriaAnime[] }>[] = [];
  if (top.length >= 2) {
    queries.push(getCatalogPage({ genres: [top[0], top[1]], sort: "rating", limit: POOL_LIMIT }));
  }
  if (top.length >= 3) {
    queries.push(getCatalogPage({ genres: [top[0], top[2]], sort: "rating", limit: POOL_LIMIT }));
    queries.push(getCatalogPage({ genres: [top[1], top[2]], sort: "rating", limit: POOL_LIMIT }));
  }
  for (const g of top.slice(0, 2)) {
    queries.push(getCatalogPage({ genres: [g], sort: "rating", limit: POOL_LIMIT }));
  }

  const [pools, popular] = await Promise.all([
    Promise.allSettled(queries),
    getPopular(0, POOL_LIMIT),
  ]);

  const candidates: AnilibriaAnime[] = [];
  for (const p of pools) if (p.status === "fulfilled") candidates.push(...p.value.data);
  // Filler for titles whose genres are all unfilterable — appended last so it
  // only ever occupies slots no genre match could fill.
  candidates.push(...popular);

  const result = rankSimilar(base, candidates, limit);

  if (similarCache.size > 300) {
    const now = Date.now();
    for (const [k, v] of similarCache) if (v.exp < now) similarCache.delete(k);
    while (similarCache.size > 300) similarCache.delete(similarCache.keys().next().value as string);
  }
  similarCache.set(cacheKey, { data: result, exp: Date.now() + SIMILAR_TTL });
  return result;
}
