import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseArr(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (typeof val === "string") { try { return JSON.parse(val); } catch { return []; } }
  return [];
}

const MOODS: Record<string, { genres: string[]; types?: string[] }> = {
  hype:    { genres: ["Экшен", "Сёнен", "Приключения", "Фэнтези"] },
  chill:   { genres: ["Повседневность", "Комедия", "Романтика", "Магия"] },
  sad:     { genres: ["Драма", "Романтика", "Психологическое"] },
  tense:   { genres: ["Триллер", "Детектив", "Ужасы", "Психологическое"] },
  laugh:   { genres: ["Комедия", "Повседневность", "Пародия"] },
  inspire: { genres: ["Спорт", "Сёнен", "Приключения", "Исекай"] },
};

const moodCache = new Map<string, { data: unknown[]; exp: number }>();

export async function GET(req: NextRequest) {
  const mood = req.nextUrl.searchParams.get("mood") ?? "hype";
  const cfg = MOODS[mood] ?? MOODS.hype;

  const cached = moodCache.get(mood);
  if (cached && cached.exp > Date.now()) return NextResponse.json(cached.data);

  const all = await prisma.anime.findMany({
    where: { isHidden: false },
    select: {
      id: true, slug: true, title: true, poster: true,
      year: true, type: true, genres: true,
      shikimoriRating: true, episodesTotal: true, episodesAired: true, status: true,
    },
    take: 800,
  });

  // Score by mood genre overlap
  const scored = all
    .map(a => {
      const genres = parseArr(a.genres);
      const hits = genres.filter(g => cfg.genres.includes(g)).length;
      const score = hits / Math.max(cfg.genres.length, 1);
      return { ...a, _score: score };
    })
    .filter(a => a._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 14);

  moodCache.set(mood, { data: scored, exp: Date.now() + 30 * 60 * 1000 });
  return NextResponse.json(scored);
}
