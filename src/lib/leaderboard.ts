import { prisma } from "@/lib/prisma";
import { calcLevel } from "@/lib/level";
import { weekStart, weekEnd, previousWeekStart } from "@/lib/competition";

/** Stable key of the rotating weekly champion title. */
export const HERO_TITLE_KEY = "hero-week";

export type WeeklyCategory = "active" | "level" | "episodes";

export const CATEGORIES: { id: WeeklyCategory; label: string; unit: string }[] = [
  { id: "active",   label: "Активные",  unit: "XP" },
  { id: "level",    label: "По уровню", unit: "ур." },
  { id: "episodes", label: "По аниме",  unit: "эп" },
];

export function isWeeklyCategory(v: string | null | undefined): v is WeeklyCategory {
  return v === "active" || v === "level" || v === "episodes";
}

export interface BoardRow {
  rank: number;
  id: string;
  name: string;
  image: string | null;
  profileFrame: string;
  level: number;
  xp: number;
  isAdmin: boolean;
  isPremium: boolean;
  activeTitle: { name: string; emoji: string; color: string; rarity: string } | null;
  metric: number; // the value ranked by, for the active category
}

const USER_SELECT = {
  id: true,
  name: true,
  image: true,
  profileFrame: true,
  xp: true,
  role: true,
  isPremium: true,
  activeTitle: { select: { name: true, emoji: true, color: true, rarity: true } },
} as const;

function toRow(
  u: {
    id: string; name: string | null; image: string | null; profileFrame: string;
    xp: number; role: string; isPremium: boolean;
    activeTitle: { name: string; emoji: string; color: string; rarity: string } | null;
  },
  rank: number,
  metric: number,
): BoardRow {
  return {
    rank,
    id: u.id,
    name: u.name || "Аноним",
    image: u.image ?? null,
    profileFrame: u.profileFrame ?? "default",
    level: calcLevel(u.xp),
    xp: u.xp,
    isAdmin: u.role === "ADMIN",
    isPremium: u.isPremium,
    activeTitle: u.activeTitle ?? null,
    metric,
  };
}

/** Ranked rows for a weekly-board category. */
export async function getWeeklyBoard(
  category: WeeklyCategory,
  limit = 100,
): Promise<BoardRow[]> {
  if (category === "level") {
    const users = await prisma.user.findMany({
      where: { bannedAt: null, xp: { gt: 0 } },
      orderBy: { xp: "desc" },
      take: limit,
      select: USER_SELECT,
    });
    return users.map((u, i) => toRow(u, i + 1, calcLevel(u.xp)));
  }

  const ws = weekStart();
  const orderField = category === "active" ? "xpGained" : "episodesWatched";
  const scores = await prisma.weeklyScore.findMany({
    where: {
      weekStart: ws,
      user: { bannedAt: null },
      ...(category === "active"
        ? { xpGained: { gt: 0 } }
        : { episodesWatched: { gt: 0 } }),
    },
    orderBy: { [orderField]: "desc" },
    take: limit,
    include: { user: { select: USER_SELECT } },
  });
  return scores.map((s, i) =>
    toRow(s.user, i + 1, category === "active" ? s.xpGained : s.episodesWatched),
  );
}

export function currentWeekWindow() {
  return { start: weekStart(), end: weekEnd() };
}

/** Count of ranked participants for the active weekly board (for the header). */
export async function weeklyParticipantCount(): Promise<number> {
  return prisma.weeklyScore.count({
    where: { weekStart: weekStart(), xpGained: { gt: 0 }, user: { bannedAt: null } },
  });
}

/**
 * Grant the «Герой недели» title to the just-closed week's #1 (by weekly XP).
 * Idempotent — safe to call repeatedly (e.g. from the cron job); the UserTitle
 * upsert dedupes. Returns whether a champion was found.
 */
export async function awardHeroOfWeek(): Promise<{ awarded: boolean; userId?: string }> {
  const prevStart = previousWeekStart();
  const top = await prisma.weeklyScore.findFirst({
    where: { weekStart: prevStart, xpGained: { gt: 0 }, user: { bannedAt: null } },
    orderBy: { xpGained: "desc" },
    select: { userId: true },
  });
  if (!top) return { awarded: false };

  const title = await prisma.title.upsert({
    where: { key: HERO_TITLE_KEY },
    update: {},
    create: {
      key: HERO_TITLE_KEY,
      name: "Герой недели",
      emoji: "🏆",
      color: "#f59e0b",
      rarity: "legendary",
      description: "№1 в недельном лидерборде Kurox",
    },
  });

  await prisma.userTitle.upsert({
    where: { userId_titleId: { userId: top.userId, titleId: title.id } },
    create: { userId: top.userId, titleId: title.id },
    update: {},
  });

  return { awarded: true, userId: top.userId };
}
