export interface ShikimoriAnime {
  id: number;
  name: string;
  russian: string | null;
  image: { original: string; preview: string; x96: string; x48: string };
  kind: string | null;
  score: string;
  status: string;
  episodes: number;
  episodes_aired: number;
  aired_on: string | null;
  released_on: string | null;
  genres?: Array<{ id: number; name: string; russian: string; kind: string }>;
}

const BASE = "https://shikimori.one/api";
const HEADERS = { "User-Agent": "Kurox/1.0 (kurox.ru)" };

async function apiFetch<T>(url: string, revalidate = 3600): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, next: { revalidate } });
    if (!res.ok) throw new Error(`Shikimori ${res.status}`);
    return res.json();
  } catch (e) {
    console.error("Shikimori fetch error:", url, e);
    return null;
  }
}

/* ── List helpers ── */
type ListParams = {
  order?: string;
  kind?: string;
  status?: string;
  season?: string;
  genre?: string;
  search?: string;
  limit?: number;
  page?: number;
};

async function getList(params: ListParams): Promise<ShikimoriAnime[]> {
  const q = new URLSearchParams();
  if (params.order)  q.set("order",  params.order);
  if (params.kind)   q.set("kind",   params.kind);
  if (params.status) q.set("status", params.status);
  if (params.season) q.set("season", params.season);
  if (params.genre)  q.set("genre",  params.genre);
  if (params.search) q.set("search", params.search);
  q.set("limit", String(params.limit ?? 20));
  q.set("page",  String(params.page  ?? 1));
  const data = await apiFetch<ShikimoriAnime[]>(`${BASE}/animes?${q}`, 3600);
  return data ?? [];
}

/* ── Current season ── */
function currentSeason(): string {
  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();
  const s = m <= 3 ? "winter" : m <= 6 ? "spring" : m <= 9 ? "summer" : "fall";
  return `${y}_${s}`;
}

/* ── Public API ── */
export async function getTrendingShikimori(page = 1, limit = 20) {
  return getList({ order: "popularity", status: "ongoing", limit, page });
}

export async function getPopularShikimori(page = 1, limit = 20) {
  return getList({ order: "ranked", kind: "tv,movie,ova,ona", limit, page });
}

export async function getSeasonalShikimori(page = 1, limit = 20) {
  return getList({ order: "popularity", season: currentSeason(), limit, page });
}

export async function getFilmsShikimori(page = 1, limit = 20) {
  return getList({ order: "popularity", kind: "movie", limit, page });
}

export async function getByKindShikimori(kind: string, page = 1, limit = 24) {
  return getList({ order: "popularity", kind, limit, page });
}

export async function getByGenreShikimori(genreId: string, page = 1, limit = 24) {
  return getList({ order: "popularity", genre: genreId, limit, page });
}

export async function searchShikimori(query: string, limit = 24, page = 1): Promise<ShikimoriAnime[]> {
  return getList({ search: query, limit, page });
}

export async function getShikimoriById(id: number): Promise<ShikimoriAnime | null> {
  return apiFetch<ShikimoriAnime>(`${BASE}/animes/${id}`, 3600);
}

/* ── Utilities ── */
export function shikimoriPoster(anime: ShikimoriAnime): string {
  const img = anime.image.original || anime.image.preview;
  if (!img) return "";
  return img.startsWith("http") ? img : `https://shikimori.one${img}`;
}

export function shikimoriYear(anime: ShikimoriAnime): number | null {
  const d = anime.aired_on || anime.released_on;
  if (!d) return null;
  const y = parseInt(d.split("-")[0], 10);
  return isNaN(y) ? null : y;
}

export function shikimoriTitle(anime: ShikimoriAnime): string {
  return anime.russian || anime.name;
}

export function shikimoriStatus(anime: ShikimoriAnime): string {
  if (anime.status === "ongoing") return "RELEASING";
  if (anime.status === "released") return "FINISHED";
  return "NOT_YET_RELEASED";
}

export const KIND_RU: Record<string, string> = {
  tv: "ТВ",
  movie: "Фильм",
  ova: "OVA",
  ona: "ONA",
  special: "Спецвыпуск",
  music: "Клип",
  tv_special: "ТВ-спецвыпуск",
};

export const STATUS_RU_S: Record<string, string> = {
  ongoing: "Онгоинг",
  released: "Завершён",
  anons: "Анонс",
};

export function isRussianQuery(query: string): boolean {
  return /[а-яё]/i.test(query);
}

export function shikimoriSlug(anime: ShikimoriAnime): string {
  const name = (anime.russian || anime.name)
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${name || "anime"}-mal${anime.id}`;
}

export function extractMalId(slug: string): number | null {
  const m = slug.match(/mal(\d+)$/);
  if (!m) return null;
  const id = parseInt(m[1], 10);
  return isNaN(id) ? null : id;
}

/* ── Genre mapping (Shikimori genre IDs) ── */
export const SHIKIMORI_GENRES: Array<{ id: string; ru: string; en: string }> = [
  { id: "1",  ru: "Экшен",             en: "Action" },
  { id: "2",  ru: "Приключения",       en: "Adventure" },
  { id: "4",  ru: "Комедия",           en: "Comedy" },
  { id: "8",  ru: "Драма",             en: "Drama" },
  { id: "10", ru: "Фэнтези",           en: "Fantasy" },
  { id: "14", ru: "Ужасы",             en: "Horror" },
  { id: "18", ru: "Меха",              en: "Mecha" },
  { id: "7",  ru: "Детектив",          en: "Mystery" },
  { id: "22", ru: "Романтика",         en: "Romance" },
  { id: "24", ru: "Фантастика",        en: "Sci-Fi" },
  { id: "36", ru: "Повседневность",    en: "Slice of Life" },
  { id: "30", ru: "Спорт",             en: "Sports" },
  { id: "37", ru: "Сверхъестественное",en: "Supernatural" },
  { id: "41", ru: "Триллер",           en: "Thriller" },
];
