import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcLevel, levelProgress, getLevelInfo } from "@/lib/level";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user, episodeCount, uniqueAnime, titlesCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { xp: true } }),
    prisma.watchHistory.count({ where: { userId: session.user.id } }),
    prisma.watchHistory.findMany({
      where: { userId: session.user.id },
      select: { animeId: true },
      distinct: ["animeId"],
    }),
    prisma.userTitle.count({ where: { userId: session.user.id } }),
  ]);

  const xp = user?.xp ?? 0;
  const level = calcLevel(xp);
  const progress = levelProgress(xp);
  const levelInfo = getLevelInfo(level);
  const hoursWatched = Math.round(episodeCount * 24 / 60);

  return NextResponse.json({
    xp,
    level,
    levelTitle: levelInfo.title,
    levelEmoji: levelInfo.emoji,
    progress: {
      currentXp: progress.currentXp,
      neededXp: progress.neededXp,
      percent: progress.percent,
    },
    stats: {
      episodes: episodeCount,
      anime: uniqueAnime.length,
      hours: hoursWatched,
      titles: titlesCount,
    },
  });
}
