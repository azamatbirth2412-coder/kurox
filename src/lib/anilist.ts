const ENDPOINT = "https://graphql.anilist.co";

export interface AniListAnime {
  id: number;
  title: { romaji: string; english: string | null; native: string | null };
  coverImage: { extraLarge: string; large: string; color: string | null };
  bannerImage: string | null;
  description: string | null;
  genres: string[];
  episodes: number | null;
  status: string;
  season: string | null;
  seasonYear: number | null;
  meanScore: number | null;
  averageScore: number | null;
  popularity: number;
  format: string;
  studios: { nodes: Array<{ name: string }> };
  trailer: { id: string; site: string } | null;
  tags: Array<{ name: string; rank: number }>;
  recommendations: {
    nodes: Array<{ mediaRecommendation: AniListAnime | null }>;
  };
  nextAiringEpisode: { episode: number; airingAt: number } | null;
}

const FIELDS = `
  id
  title { romaji english native }
  coverImage { extraLarge large color }
  bannerImage
  description(asHtml: false)
  genres
  episodes
  status
  season
  seasonYear
  meanScore
  averageScore
  popularity
  format
  studios(isMain: true) { nodes { name } }
  nextAiringEpisode { episode airingAt }
`;

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || "AniList error");
  return json.data as T;
}

type PageResult = { Page: { pageInfo: { total: number; hasNextPage: boolean }; media: AniListAnime[] } };

export async function getTrendingAnime(page = 1, perPage = 20) {
  try {
    const d = await gql<PageResult>(`
      query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){
        pageInfo{total hasNextPage}
        media(type:ANIME,sort:TRENDING_DESC,status_in:[RELEASING,FINISHED]){${FIELDS}}
      }}`, { page, perPage });
    return { media: d.Page.media, total: d.Page.pageInfo.total, hasNext: d.Page.pageInfo.hasNextPage };
  } catch (e) { console.error("AniList trending:", e); return { media: [], total: 0, hasNext: false }; }
}

export async function getPopularAnime(page = 1, perPage = 20) {
  try {
    const d = await gql<PageResult>(`
      query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){
        pageInfo{total hasNextPage}
        media(type:ANIME,sort:POPULARITY_DESC){${FIELDS}}
      }}`, { page, perPage });
    return { media: d.Page.media, total: d.Page.pageInfo.total, hasNext: d.Page.pageInfo.hasNextPage };
  } catch (e) { console.error("AniList popular:", e); return { media: [], total: 0, hasNext: false }; }
}

export async function getSeasonalAnime(page = 1, perPage = 20) {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const m = now.getMonth() + 1;
    const season = m <= 3 ? "WINTER" : m <= 6 ? "SPRING" : m <= 9 ? "SUMMER" : "FALL";
    const d = await gql<PageResult>(`
      query($page:Int,$perPage:Int,$season:MediaSeason,$year:Int){Page(page:$page,perPage:$perPage){
        pageInfo{total hasNextPage}
        media(type:ANIME,season:$season,seasonYear:$year,sort:POPULARITY_DESC){${FIELDS}}
      }}`, { page, perPage, season, year });
    return { media: d.Page.media, total: d.Page.pageInfo.total, hasNext: d.Page.pageInfo.hasNextPage };
  } catch (e) { console.error("AniList seasonal:", e); return { media: [], total: 0, hasNext: false }; }
}

export async function getAnimeById(id: number): Promise<AniListAnime | null> {
  try {
    const d = await gql<{ Media: AniListAnime }>(`
      query($id:Int){Media(id:$id,type:ANIME){
        ${FIELDS}
        trailer{id site}
        tags{name rank}
        recommendations(perPage:6){nodes{mediaRecommendation{${FIELDS}}}}
      }}`, { id });
    return d.Media;
  } catch (e) { console.error("AniList getById:", e); return null; }
}

export async function searchAniList(query: string, page = 1, perPage = 24) {
  try {
    const d = await gql<PageResult>(`
      query($search:String,$page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){
        pageInfo{total hasNextPage}
        media(type:ANIME,search:$search){${FIELDS}}
      }}`, { search: query, page, perPage });
    return { media: d.Page.media, total: d.Page.pageInfo.total, hasNext: d.Page.pageInfo.hasNextPage };
  } catch (e) { console.error("AniList search:", e); return { media: [], total: 0, hasNext: false }; }
}

export async function getByGenre(genre: string, page = 1, perPage = 24) {
  try {
    const d = await gql<PageResult>(`
      query($genre:String,$page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){
        pageInfo{total hasNextPage}
        media(type:ANIME,genre:$genre,sort:POPULARITY_DESC){${FIELDS}}
      }}`, { genre, page, perPage });
    return { media: d.Page.media, total: d.Page.pageInfo.total, hasNext: d.Page.pageInfo.hasNextPage };
  } catch (e) { console.error("AniList genre:", e); return { media: [], total: 0, hasNext: false }; }
}

export async function getByMalId(malId: number): Promise<AniListAnime | null> {
  try {
    const d = await gql<{ Media: AniListAnime }>(`
      query($malId:Int){Media(idMal:$malId,type:ANIME){
        ${FIELDS}
        trailer{id site}
        tags{name rank}
        recommendations(perPage:6){nodes{mediaRecommendation{${FIELDS}}}}
      }}`, { malId });
    return d.Media;
  } catch (e) { console.error("AniList getByMalId:", e); return null; }
}

export async function getByFormat(format: string, page = 1, perPage = 24) {
  try {
    const d = await gql<PageResult>(`
      query($format:MediaFormat,$page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){
        pageInfo{total hasNextPage}
        media(type:ANIME,format:$format,sort:POPULARITY_DESC){${FIELDS}}
      }}`, { format, page, perPage });
    return { media: d.Page.media, total: d.Page.pageInfo.total, hasNext: d.Page.pageInfo.hasNextPage };
  } catch (e) { console.error("AniList format:", e); return { media: [], total: 0, hasNext: false }; }
}

export function makeSlug(anime: AniListAnime): string {
  const title = anime.title.romaji || anime.title.english || String(anime.id);
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
  return `${slug || "anime"}-${anime.id}`;
}

export function extractAniListId(slug: string): number | null {
  const parts = slug.split("-");
  const last = parts[parts.length - 1];
  const id = parseInt(last, 10);
  return isNaN(id) ? null : id;
}

export const GENRE_RU: Record<string, string> = {
  Action: "Экшен",
  Adventure: "Приключения",
  Comedy: "Комедия",
  Drama: "Драма",
  Ecchi: "Этти",
  Fantasy: "Фэнтези",
  Horror: "Ужасы",
  "Mahou Shoujo": "Махо-сёдзё",
  Mecha: "Меха",
  Music: "Музыка",
  Mystery: "Детектив",
  Psychological: "Психологическое",
  Romance: "Романтика",
  "Sci-Fi": "Sci-Fi",
  "Slice of Life": "Повседневность",
  Sports: "Спорт",
  Supernatural: "Сверхъестественное",
  Thriller: "Триллер",
};

export const FORMAT_RU: Record<string, string> = {
  TV: "ТВ",
  TV_SHORT: "ТВ шорт",
  MOVIE: "Фильм",
  SPECIAL: "Спецвыпуск",
  OVA: "OVA",
  ONA: "ONA",
  MUSIC: "Клип",
};

export const STATUS_RU: Record<string, string> = {
  FINISHED: "Завершён",
  RELEASING: "Онгоинг",
  NOT_YET_RELEASED: "Анонс",
  CANCELLED: "Отменён",
  HIATUS: "Пауза",
};

export const SEASON_RU: Record<string, string> = {
  WINTER: "Зима",
  SPRING: "Весна",
  SUMMER: "Лето",
  FALL: "Осень",
};

export const CATALOG_GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy",
  "Horror", "Mecha", "Mystery", "Romance", "Sci-Fi",
  "Slice of Life", "Sports", "Supernatural", "Thriller",
];
