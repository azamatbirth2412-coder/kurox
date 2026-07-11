const KODIK_TOKEN = process.env.KODIK_TOKEN;
const KODIK_BASE = "https://kodikapi.com";

if (!KODIK_TOKEN && process.env.NODE_ENV === "production") {
  console.warn("KODIK_TOKEN is not set");
}

export interface KodikAnime {
  id: string;
  type: string;
  title: string;
  title_orig?: string;
  other_title?: string;
  link: string;
  year?: number;
  last_season?: number;
  last_episode?: number;
  episodes_count?: number;
  kinopoisk_id?: string;
  imdb_id?: string;
  shikimori_id?: string;
  quality?: string;
  camrip?: boolean;
  screenshots?: string[];
  material_data?: {
    title: string;
    title_en?: string;
    anime_title?: string;
    year?: number;
    tagline?: string;
    description?: string;
    poster_url?: string;
    duration?: number;
    genres?: string[];
    anime_genres?: string[];
    anime_studios?: string[];
    rating?: number;
    shikimori_rating?: number;
    shikimori_votes?: number;
    episodes_total?: number;
    episodes_aired?: number;
    anime_status?: string;
  };
  seasons?: Record<string, {
    link: string;
    episodes: Record<string, string>;
  }>;
  translations?: Array<{
    id: number;
    title: string;
    type: string;
  }>;
}

export interface KodikResponse {
  time: string;
  total: number;
  results: KodikAnime[];
  next_page?: string;
  prev_page?: string;
}

async function kodikRequest(
  endpoint: string,
  params: Record<string, string | number | boolean>
): Promise<KodikResponse> {
  if (!KODIK_TOKEN) {
    throw new Error("KODIK_TOKEN not configured");
  }

  const url = new URL(`${KODIK_BASE}${endpoint}`);
  url.searchParams.set("token", KODIK_TOKEN);
  url.searchParams.set("with_material_data", "true");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 },
    headers: { "User-Agent": "kurox/1.0" },
  });

  if (!res.ok) {
    throw new Error(`Kodik API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function searchAnime(query: string, limit = 20): Promise<KodikAnime[]> {
  try {
    const data = await kodikRequest("/search", {
      title: query,
      types: "anime,anime-serial",
      limit,
    });
    return data.results ?? [];
  } catch (err) {
    console.error("Kodik searchAnime error:", err);
    return [];
  }
}

export async function getAnimeById(id: string): Promise<KodikAnime | null> {
  try {
    const data = await kodikRequest("/search", {
      id,
      types: "anime,anime-serial",
    });
    return data.results?.[0] ?? null;
  } catch (err) {
    console.error("Kodik getAnimeById error:", err);
    return null;
  }
}

export async function getAnimeList(
  params: {
    genre?: string;
    year?: number;
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<KodikResponse> {
  try {
    const query: Record<string, string | number | boolean> = {
      types: params.type || "anime,anime-serial",
      limit: params.limit || 24,
    };
    if (params.genre) query.genre = params.genre;
    if (params.year) query.year = params.year;
    if (params.page && params.page > 1) query.page = params.page;

    return await kodikRequest("/list", query);
  } catch (err) {
    console.error("Kodik getAnimeList error:", err);
    return { time: "", total: 0, results: [] };
  }
}

export async function getTranslations(
  animeId: string
): Promise<Array<{ id: number; title: string; type: string }>> {
  try {
    const data = await kodikRequest("/search", {
      id: animeId,
      types: "anime,anime-serial",
      with_episodes: true,
    });
    return data.results?.[0]?.translations ?? [];
  } catch (err) {
    console.error("Kodik getTranslations error:", err);
    return [];
  }
}

export function buildPlayerUrl(link: string, episode?: number, translationId?: number): string {
  const url = new URL(link.startsWith("//") ? `https:${link}` : link);
  if (episode) url.searchParams.set("episode", String(episode));
  if (translationId) url.searchParams.set("translation", String(translationId));
  return url.toString();
}
