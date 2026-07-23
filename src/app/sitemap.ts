import { MetadataRoute } from "next";
import { getPopular, animeSlug, type AnilibriaAnime } from "@/lib/anilibria";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kurox.ru";

// Match the genre slugs used in /anime?genre= links
const GENRE_NAMES = [
  "Экшен", "Романтика", "Комедия", "Фэнтези", "Сёнен", "Триллер",
  "Повседневность", "Спорт", "Меха", "Приключения", "Ужасы", "Драма",
  "Школа", "Магия", "Исекай",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL,                         lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE_URL}/anime`,              lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE_URL}/schedule`,           lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE_URL}/about`,              lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/privacy-policy`,     lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    // NOTE: /search is excluded — rendered with robots: { index: false }
    ...GENRE_NAMES.map(g => ({
      url: `${BASE_URL}/genre/${encodeURIComponent(g)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];

  try {
    // Fetch top 400 popular anime for sitemap.
    // NB: getPopular's first argument is a PAGE INDEX (0-based), not an offset.
    const [page0, page1, page2, page3, page4, page5, page6, page7] = await Promise.allSettled([
      getPopular(0, 50),
      getPopular(1, 50),
      getPopular(2, 50),
      getPopular(3, 50),
      getPopular(4, 50),
      getPopular(5, 50),
      getPopular(6, 50),
      getPopular(7, 50),
    ]);

    const animeList: AnilibriaAnime[] = [
      ...(page0.status === "fulfilled" ? page0.value : []),
      ...(page1.status === "fulfilled" ? page1.value : []),
      ...(page2.status === "fulfilled" ? page2.value : []),
      ...(page3.status === "fulfilled" ? page3.value : []),
      ...(page4.status === "fulfilled" ? page4.value : []),
      ...(page5.status === "fulfilled" ? page5.value : []),
      ...(page6.status === "fulfilled" ? page6.value : []),
      ...(page7.status === "fulfilled" ? page7.value : []),
    ];

    const animePages: MetadataRoute.Sitemap = animeList.map(a => ({
      url: `${BASE_URL}/anime/${animeSlug(a)}`,
      lastModified: now,
      changeFrequency: a.is_ongoing ? ("daily" as const) : ("weekly" as const),
      priority: a.is_ongoing ? 0.9 : 0.8,
    }));

    return [...staticPages, ...animePages];
  } catch {
    return staticPages;
  }
}
