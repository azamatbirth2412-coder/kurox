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
  episodes_total: number | null;
  average_duration_of_episode: number | null;
  added_in_users_favorites: number;
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
        headers: { "Accept": "application/json" },
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
