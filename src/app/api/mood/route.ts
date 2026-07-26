import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Map mood IDs to genre keywords that match the Russian genre names stored in
// the local `anime` table. The catalog is synced from the Anilibria API
// (see /api/admin/sync), so the genre names use Anilibria's taxonomy — note
// "Сёнен" (е), not the Shikimori spelling "Сёнэн". Both spellings are listed so
// the mapping stays correct if data is ever re-sourced. Keywords that don't
// exist in the taxonomy are harmless: every mood still has genres that match.
const MOOD_GENRES: Record<string, string[]> = {
  hype:    ["Экшен", "Приключения", "Боевые искусства", "Фэнтези"],
  chill:   ["Повседневность", "Романтика", "Музыка", "Школа"],
  laugh:   ["Комедия", "Пародия", "Гарем"],
  sad:     ["Драма", "Трагедия", "Психологическое"],
  tense:   ["Триллер", "Детектив", "Ужасы", "Психологическое", "Мистика"],
  inspire: ["Спорт", "Сёнен", "Сёнэн", "Преодоление"],
};

const LIMIT = 14;

interface MoodResult {
  id: string;
  slug: string;
  title: string;
  poster: string | null;
  year: number | null;
  type: string;
  genres: string;
}

// 1-hour in-memory cache, keyed by mood id.
const moodCache = new Map<string, { data: MoodResult[]; exp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function parseGenres(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const mood = req.nextUrl.searchParams.get("mood") ?? "hype";
  const keywords = MOOD_GENRES[mood] ?? MOOD_GENRES.hype;

  const cached = moodCache.get(mood);
  if (cached && cached.exp > Date.now()) {
    return NextResponse.json(cached.data);
  }

  // `genres` is a JSON string column (e.g. ["Экшен","Приключения"]), so a
  // substring match against the raw text is the simplest reliable filter.
  const rows = await prisma.anime.findMany({
    where: {
      isHidden: false,
      OR: keywords.map(k => ({ genres: { contains: k } })),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      poster: true,
      year: true,
      type: true,
      genres: true,
    },
    take: 400,
  });

  // Rank by how many of the mood's genres each title matches — the catalog has
  // no populated rating/views to sort on, so genre overlap is the best signal.
  const keywordSet = new Set(keywords);
  const ranked = rows
    .map(a => {
      const hits = parseGenres(a.genres).filter(g => keywordSet.has(g)).length;
      return { anime: a, hits };
    })
    .sort((a, b) => b.hits - a.hits)
    .slice(0, LIMIT)
    .map(x => x.anime);

  moodCache.set(mood, { data: ranked, exp: Date.now() + CACHE_TTL });
  return NextResponse.json(ranked);
}
