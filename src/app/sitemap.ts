import { MetadataRoute } from "next";
import { getAnimeList } from "@/lib/kodik";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kurox.ru";
const GENRES = ["экшен", "романтика", "комедия", "фэнтези", "сёнен", "триллер", "ужасы", "спорт", "меха", "повседневность"];

function makeSlug(title?: string, id?: string): string {
  if (!title) return id || "unknown";
  return title.toLowerCase().replace(/[^a-zа-яё0-9\s]/gi, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-") || id || "unknown";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/anime`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/genres`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/news`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/premium`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    ...GENRES.map((g) => ({
      url: `${BASE_URL}/genre/${encodeURIComponent(g)}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];

  try {
    const data = await getAnimeList({ limit: 100 });
    const animePages: MetadataRoute.Sitemap = data.results.map((anime) => ({
      url: `${BASE_URL}/anime/${makeSlug(anime.material_data?.title, anime.id)}-${anime.id}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
    return [...staticPages, ...animePages];
  } catch {
    return staticPages;
  }
}
