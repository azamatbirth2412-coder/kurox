const BASE = "https://anilibria.top/api/v1";
const CDN  = "https://anilibria.top";

// ── In-memory cache (server-side) ──────────────────────────────────────────
const cache = new Map<string, { data: unknown; expires: number }>();

function fromCache<T>(key: string, allowStale = false): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  // Keep expired entries around as a stale fallback for when the API is down
  if (!allowStale && Date.now() > entry.expires) return null;
  return entry.data as T;
}

function toCache(key: string, data: unknown, ttlMs: number) {
  // Bound cache size (search queries create unbounded keys)
  if (cache.size > 500) {
    const now = Date.now();
    for (const [k, v] of cache) if (now > v.expires) cache.delete(k);
    while (cache.size > 500) cache.delete(cache.keys().next().value as string);
  }
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

export interface AnilibriaAnime {
  id: number;
  alias: string;
  name: { main: string; english: string | null; alternative: string | null };
  year: number | null;
  type: { value: string; description: string } | null;
  season: { value: string; description: string } | null;
  poster: {
    src: string;
    thumbnail: string;
    optimized: { src: string; thumbnail: string } | null;
  } | null;
  genres: { id: number; name: string }[];
  description: string | null;
  is_ongoing: boolean;
  is_in_production?: boolean;
  episodes_total: number | null;
  average_duration_of_episode: number | null;
  added_in_users_favorites: number;
  // User-collection counts — the API exposes no numeric score, so these
  // engagement signals are the basis for the derived audience rating below.
  added_in_watched_collection?: number | null;
  added_in_watching_collection?: number | null;
  added_in_planned_collection?: number | null;
  added_in_postponed_collection?: number | null;
  added_in_abandoned_collection?: number | null;
  fresh_at: string | null;
  publish_day?: { value: number; description: string } | null; // 1=Пн … 7=Вс
  // Only on full release page
  episodes?: AnilibriaEpisode[];
}

export interface AnilibriaEpisode {
  id: string;
  ordinal: number;
  name: string | null;
  name_english: string | null;
  hls_480: string | null;
  hls_720: string | null;
  hls_1080: string | null;
  duration: number | null;
  sort_order: number;
  opening: { start: number | null; stop: number | null } | null;
  ending: { start: number | null; stop: number | null } | null;
}

type PagedResponse = {
  data: AnilibriaAnime[];
  meta: { pagination: { total: number; current_page: number; total_pages: number } };
};

async function apiFetch<T>(path: string, ttlSec = 3600): Promise<T | null> {
  const cached = fromCache<T>(path);
  if (cached) return cached;

  // 2 attempts — a single transient timeout must not blank the homepage
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12_000); // 12s timeout

    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36" },
        next: { revalidate: ttlSec },
        signal: ctrl.signal,
      });
      if (!res.ok) {
        console.warn(`Anilibria HTTP ${res.status}:`, path, `(attempt ${attempt + 1})`);
        continue;
      }
      const data: T = await res.json();
      toCache(path, data, ttlSec * 1000);
      return data;
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        console.warn("Anilibria timeout:", path, `(attempt ${attempt + 1})`);
      } else {
        console.error("Anilibria error:", path, e);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  // All attempts failed — serve stale cached data rather than an empty page
  const stale = fromCache<T>(path, true);
  if (stale) {
    console.warn("Anilibria: serving stale cache for", path);
    return stale;
  }
  return null;
}

/* ── Utilities ── */
export function animePoster(a: AnilibriaAnime): string {
  const url = a.poster?.optimized?.src || a.poster?.src || "";
  if (!url) return "";
  return url.startsWith("http") ? url : `${CDN}${url}`;
}

export function animeSlug(a: AnilibriaAnime): string {
  return a.alias;
}

export function animeTitle(a: AnilibriaAnime): string {
  return a.name?.main || a.name?.english || a.alias;
}

export function animeYear(a: AnilibriaAnime): number | null {
  return a.year ?? null;
}

export function animeEpisodes(a: AnilibriaAnime): number | null {
  return a.episodes_total ?? null;
}

export function animeEpisodesAired(a: AnilibriaAnime): number | null {
  return a.episodes ? a.episodes.length : null;
}

export function animeStatus(a: AnilibriaAnime): string {
  if (a.is_ongoing) return "RELEASING";
  return "FINISHED";
}

// ── Derived audience rating ────────────────────────────────────────────────
// The Anilibria API exposes NO numeric quality score (only the RATING_DESC sort
// and per-user collection counts). We derive a believable 0–10 audience score
// from the completion-vs-drop ratio: viewers who finished or are actively
// watching a title (positive signal) versus those who dropped it (negative).
// A minimum sample is required so obscure/brand-new titles show no badge rather
// than a fabricated one. The meaningful 0.80–1.00 satisfaction band is mapped
// onto a 5.0–9.5 range so scores spread realistically instead of clumping at 10.
export function animeRating(a: AnilibriaAnime): number | null {
  const watched  = a.added_in_watched_collection  ?? 0;
  const watching = a.added_in_watching_collection ?? 0;
  const dropped  = a.added_in_abandoned_collection ?? 0;
  const positive = watched + watching;
  const n = positive + dropped;
  if (n < 60) return null; // too little signal — hide the badge
  const satisfaction = positive / n; // ~0.80–1.00 in practice
  const score = 5 + ((satisfaction - 0.8) / 0.2) * 4.5;
  return Math.round(Math.min(9.5, Math.max(5, score)) * 10) / 10;
}

// ── Vote / engagement count ────────────────────────────────────────────────
// The number of viewers who actually formed an opinion on a title — exactly the
// population animeRating() derives its score from (finished + still watching +
// dropped). This is the closest thing the API offers to a "vote count", shown
// next to the score as a confidence signal (animeon.fun renders "8.6 · 175 522").
// Planned/postponed collections are excluded: those users have not watched it,
// so they cast no vote. Whenever a rating badge shows (n ≥ 60) this is ≥ 60, so
// pairing the two never surfaces a misleadingly tiny number.
export function animeVotes(a: AnilibriaAnime): number {
  const watched  = a.added_in_watched_collection  ?? 0;
  const watching = a.added_in_watching_collection ?? 0;
  const dropped  = a.added_in_abandoned_collection ?? 0;
  return watched + watching + dropped;
}

/* ── Public API ── */
export interface CatalogResult {
  data: AnilibriaAnime[];
  total: number;
  totalPages: number;
}

// NB: the catalog endpoint ignores legacy `sort_by`/`order` params.
// The real (documented) params are `f[sorting]` and `f[publish_statuses][]`.
const SORT_FRESH  = "f%5Bsorting%5D=FRESH_AT_DESC";
const SORT_RATING = "f%5Bsorting%5D=RATING_DESC";
const FILTER_ONGOING = "f%5Bpublish_statuses%5D%5B%5D=IS_ONGOING";

export async function getTrending(page = 0, limit = 20): Promise<AnilibriaAnime[]> {
  const p = page + 1;
  const d = await apiFetch<PagedResponse>(
    `/anime/catalog/releases?limit=${limit}&page=${p}&${SORT_FRESH}`,
    300
  );
  return d?.data ?? [];
}

export async function getTrendingPage(page = 0, limit = 48): Promise<CatalogResult> {
  const p = page + 1;
  const d = await apiFetch<PagedResponse>(
    `/anime/catalog/releases?limit=${limit}&page=${p}&${SORT_FRESH}`,
    300
  );
  const total = d?.meta?.pagination?.total ?? 0;
  return { data: d?.data ?? [], total, totalPages: Math.ceil(total / limit) };
}

export async function getPopular(page = 0, limit = 20): Promise<AnilibriaAnime[]> {
  const p = page + 1;
  const d = await apiFetch<PagedResponse>(
    `/anime/catalog/releases?limit=${limit}&page=${p}&${SORT_RATING}`
  );
  return d?.data ?? [];
}

export async function getPopularPage(page = 0, limit = 48): Promise<CatalogResult> {
  const p = page + 1;
  const d = await apiFetch<PagedResponse>(
    `/anime/catalog/releases?limit=${limit}&page=${p}&${SORT_RATING}`
  );
  const total = d?.meta?.pagination?.total ?? 0;
  return { data: d?.data ?? [], total, totalPages: Math.ceil(total / limit) };
}

// API caps limit at 50 (limit=100 → HTTP 422), so fetch two pages
async function getTopRated100(): Promise<AnilibriaAnime[]> {
  const [p0, p1] = await Promise.allSettled([getPopular(0, 50), getPopular(1, 50)]);
  return [
    ...(p0.status === "fulfilled" ? p0.value : []),
    ...(p1.status === "fulfilled" ? p1.value : []),
  ];
}

// Returns anime released in the last 2 years (new releases), sorted by rating
export async function getNewReleases(limit = 50): Promise<AnilibriaAnime[]> {
  const currentYear = new Date().getFullYear();
  const data = await getTopRated100();
  return data
    .filter(a => a.year != null && a.year >= currentYear - 2)
    .slice(0, limit);
}

// Returns classic anime (5+ years old) sorted by all-time favorites
export async function getClassics(limit = 50): Promise<AnilibriaAnime[]> {
  const currentYear = new Date().getFullYear();
  const data = await getTopRated100();
  return data
    .filter(a => a.year != null && a.year <= currentYear - 5)
    .sort((a, b) => (b.added_in_users_favorites ?? 0) - (a.added_in_users_favorites ?? 0))
    .slice(0, limit);
}

export async function getTotalAnimeCount(): Promise<number> {
  const d = await apiFetch<PagedResponse>("/anime/catalog/releases?limit=1&page=1", 3600);
  return d?.meta?.pagination?.total ?? 0;
}

export async function getOngoingPage(page = 0, limit = 48): Promise<CatalogResult> {
  const p = page + 1;
  const d = await apiFetch<PagedResponse>(
    `/anime/catalog/releases?limit=${limit}&page=${p}&${FILTER_ONGOING}&${SORT_FRESH}`,
    300
  );
  const total = d?.meta?.pagination?.total ?? 0;
  return { data: d?.data ?? [], total, totalPages: Math.ceil(total / limit) };
}

export interface ScheduleEntry {
  release: AnilibriaAnime;
  next_episode_at: string | null; // ISO date string (estimated: last episode + 7 days)
  next_episode_ordinal: number | null;
}

// Real shape of /anime/schedule/week entries (verified against live API):
// { release, full_season_is_released, published_release_episode, next_release_episode_number }
type ScheduleApiEntry = {
  release: AnilibriaAnime;
  full_season_is_released?: boolean;
  published_release_episode?: { ordinal?: number } | null;
  next_release_episode_number?: number | null;
};

export async function getSchedule(): Promise<AnilibriaAnime[]> {
  const d = await apiFetch<ScheduleApiEntry[]>("/anime/schedule/week", 900);
  if (!Array.isArray(d)) return [];
  return d.map(x => x.release);
}

// Weekly releases come out ~every 7 days at the same time.
// The API gives no exact timestamp, so estimate: fresh_at + N*7 days (first future occurrence).
function estimateNextEpisodeAt(e: ScheduleApiEntry): string | null {
  if (!e.release?.is_ongoing || e.full_season_is_released) return null;
  if (e.next_release_episode_number == null) return null;
  const last = e.release.fresh_at ? new Date(e.release.fresh_at).getTime() : NaN;
  if (isNaN(last)) return null;
  const WEEK = 7 * 86_400_000;
  let next = last + WEEK;
  // If the estimate is already in the past (hiatus/late), roll forward to the next weekly slot
  while (next < Date.now()) next += WEEK;
  // Don't show a countdown if the estimate drifted more than 3 weeks from the last episode
  if (next - last > 3 * WEEK) return null;
  return new Date(next).toISOString();
}

export async function getScheduleWithDates(): Promise<ScheduleEntry[]> {
  const d = await apiFetch<ScheduleApiEntry[]>("/anime/schedule/week", 900);
  if (!Array.isArray(d)) return [];
  return d.map(x => ({
    release: x.release,
    next_episode_at: estimateNextEpisodeAt(x),
    next_episode_ordinal: x.next_release_episode_number ?? null,
  }));
}

export async function searchAnilibria(query: string, page = 0, limit = 48): Promise<AnilibriaAnime[]> {
  const p = page + 1;
  const d = await apiFetch<PagedResponse>(
    `/anime/catalog/releases?limit=${limit}&page=${p}&f%5Bsearch%5D=${encodeURIComponent(query)}`,
    60
  );
  return d?.data ?? [];
}

export async function searchAnilibriaPage(query: string, page = 0, limit = 48): Promise<CatalogResult> {
  const p = page + 1;
  const d = await apiFetch<PagedResponse>(
    `/anime/catalog/releases?limit=${limit}&page=${p}&f%5Bsearch%5D=${encodeURIComponent(query)}`,
    60
  );
  const total = d?.meta?.pagination?.total ?? 0;
  return { data: d?.data ?? [], total, totalPages: Math.ceil(total / limit) };
}

// Case-insensitive genre lookup — /genres page and old links use lowercase slugs ("экшен")
function genreId(genre: string): number | undefined {
  if (GENRE_IDS[genre]) return GENRE_IDS[genre];
  const lower = genre.trim().toLowerCase();
  for (const [name, id] of Object.entries(GENRE_IDS)) {
    if (name.toLowerCase() === lower) return id;
  }
  return undefined;
}

export async function getByGenre(genre: string, page = 0, limit = 48): Promise<AnilibriaAnime[]> {
  const p = page + 1;
  const id = genreId(genre);
  if (!id) return [];
  const d = await apiFetch<PagedResponse>(
    `/anime/catalog/releases?limit=${limit}&page=${p}&f%5Bgenres%5D%5B%5D=${id}&${SORT_FRESH}`
  );
  return d?.data ?? [];
}

export async function getByGenrePage(genre: string, page = 0, limit = 48): Promise<CatalogResult> {
  const p = page + 1;
  const id = genreId(genre);
  if (!id) return { data: [], total: 0, totalPages: 0 };
  const d = await apiFetch<PagedResponse>(
    `/anime/catalog/releases?limit=${limit}&page=${p}&f%5Bgenres%5D%5B%5D=${id}&${SORT_FRESH}`
  );
  const total = d?.meta?.pagination?.total ?? 0;
  return { data: d?.data ?? [], total, totalPages: Math.ceil(total / limit) };
}

// ── Combined catalog filter (status + type + genre + year + sort) ───────────
export type CatalogStatus = "ongoing" | "finished" | "announce";
export type CatalogSort = "fresh" | "rating";

// Release types the Anilibria catalog accepts, with Russian labels for the UI.
export const RELEASE_TYPES: { value: string; label: string }[] = [
  { value: "TV",      label: "ТВ" },
  { value: "MOVIE",   label: "Фильм" },
  { value: "OVA",     label: "OVA" },
  { value: "ONA",     label: "ONA" },
  { value: "SPECIAL", label: "Спецвыпуск" },
];

export const CATALOG_STATUSES: { value: CatalogStatus; label: string }[] = [
  { value: "ongoing",  label: "Онгоинг" },
  { value: "finished", label: "Завершён" },
  { value: "announce", label: "Анонс" },
];

// Age ratings the catalog filters by server-side (f[age_ratings][]).
// Verified against /anime/catalog/references/age-ratings.
export const AGE_RATINGS: { value: string; label: string }[] = [
  { value: "R0_PLUS",  label: "0+" },
  { value: "R6_PLUS",  label: "6+" },
  { value: "R12_PLUS", label: "12+" },
  { value: "R16_PLUS", label: "16+" },
  { value: "R18_PLUS", label: "18+" },
];

// Airing seasons the catalog filters by server-side (f[seasons][]).
// Verified against /anime/catalog/references/seasons (lowercase values).
export const SEASONS: { value: string; label: string }[] = [
  { value: "winter", label: "Зима" },
  { value: "spring", label: "Весна" },
  { value: "summer", label: "Лето" },
  { value: "autumn", label: "Осень" },
];

export interface CatalogFilters {
  genres?: string[];     // Russian genre names (mapped to ids internally)
  types?: string[];      // TV | MOVIE | OVA | ONA | SPECIAL
  status?: CatalogStatus;
  ageRatings?: string[]; // R0_PLUS | R6_PLUS | R12_PLUS | R16_PLUS | R18_PLUS
  seasons?: string[];    // winter | spring | summer | autumn
  yearFrom?: number;
  yearTo?: number;
  sort?: CatalogSort;
  search?: string;
  page?: number;         // 0-based
  limit?: number;
}

export async function getCatalogPage(f: CatalogFilters): Promise<CatalogResult> {
  const limit = f.limit ?? 48;
  const p = (f.page ?? 0) + 1;
  const parts: string[] = [`limit=${limit}`, `page=${p}`];
  parts.push(f.sort === "rating" ? SORT_RATING : SORT_FRESH);

  if (f.search) parts.push(`f%5Bsearch%5D=${encodeURIComponent(f.search)}`);

  for (const g of f.genres ?? []) {
    const id = genreId(g);
    if (id) parts.push(`f%5Bgenres%5D%5B%5D=${id}`);
  }
  for (const t of f.types ?? []) {
    parts.push(`f%5Btypes%5D%5B%5D=${encodeURIComponent(t)}`);
  }
  for (const ar of f.ageRatings ?? []) {
    parts.push(`f%5Bage_ratings%5D%5B%5D=${encodeURIComponent(ar)}`);
  }
  for (const s of f.seasons ?? []) {
    parts.push(`f%5Bseasons%5D%5B%5D=${encodeURIComponent(s)}`);
  }
  if (f.status === "ongoing")       parts.push(FILTER_ONGOING);
  else if (f.status === "finished") parts.push("f%5Bpublish_statuses%5D%5B%5D=IS_NOT_ONGOING");
  else if (f.status === "announce") parts.push("f%5Bproduction_statuses%5D%5B%5D=IS_IN_PRODUCTION");

  if (f.yearFrom) parts.push(`f%5Byears%5D%5Bfrom_year%5D=${f.yearFrom}`);
  if (f.yearTo)   parts.push(`f%5Byears%5D%5Bto_year%5D=${f.yearTo}`);

  const d = await apiFetch<PagedResponse>(`/anime/catalog/releases?${parts.join("&")}`, 300);
  const total = d?.meta?.pagination?.total ?? 0;
  return { data: d?.data ?? [], total, totalPages: Math.ceil(total / limit) };
}

export async function getByCode(alias: string): Promise<AnilibriaAnime | null> {
  return apiFetch<AnilibriaAnime>(`/anime/releases/${encodeURIComponent(alias)}`);
}

export async function getById(id: number): Promise<AnilibriaAnime | null> {
  return apiFetch<AnilibriaAnime>(`/anime/releases/${id}`);
}

/* ── Genre list (in Russian, matching Anilibria's genre names) ── */
export const GENRE_IDS: Record<string, number> = {
  "Экшен": 14,
  "Комедия": 1,
  "Фэнтези": 29,
  "Романтика": 11,
  "Приключения": 27,
  "Школа": 7,
  "Драма": 8,
  "Сёнен": 4,
  "Сверхъестественное": 28,
  "Фантастика": 22,
  "Повседневность": 10,
  "Сэйнен": 5,
  "Детектив": 25,
  "Магия": 18,
  "Исторический": 26,
  "Психологическое": 3,
  "Ужасы": 13,
  "Меха": 2,
  "Триллер": 6,
  "Спорт": 12,
  "Мистика": 9,
  "Исекай": 34,
  "Музыка": 19,
};

export const GENRES = Object.keys(GENRE_IDS);

export const GENRE_ICONS: Record<string, string> = {
  "Экшен": "⚔️",
  "Комедия": "😂",
  "Фэнтези": "🧙",
  "Романтика": "💖",
  "Приключения": "🗺️",
  "Школа": "🏫",
  "Драма": "🎭",
  "Сёнен": "💪",
  "Сверхъестественное": "✨",
  "Фантастика": "🚀",
  "Повседневность": "☕",
  "Сэйнен": "📚",
  "Детектив": "🔍",
  "Магия": "🌟",
  "Исторический": "📜",
  "Психологическое": "🧠",
  "Ужасы": "👻",
  "Меха": "🤖",
  "Триллер": "🔪",
  "Спорт": "⚽",
  "Мистика": "🔮",
  "Исекай": "🌀",
  "Музыка": "🎵",
};
