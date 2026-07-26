import { prisma } from "@/lib/prisma";
import { dayBucket, weekStart, isConsecutiveDay } from "@/lib/competition";

// ── Quest types ──────────────────────────────────────────────────────────────
export type QuestType = "WATCH_EPISODE" | "RATE" | "FAVORITE" | "COMMENT";

interface QuestSeed {
  key: string;
  title: string;
  description: string;
  type: QuestType;
  targetCount: number;
  xpReward: number;
  emoji: string;
  sortOrder: number;
}

// Default daily quest set. Only types that are actually advanced by a hooked
// action are seeded, so every visible quest is completable.
export const DEFAULT_QUESTS: QuestSeed[] = [
  { key: "watch-1",    title: "Первая серия дня",   description: "Посмотри 1 серию любого аниме",     type: "WATCH_EPISODE", targetCount: 1, xpReward: 20, emoji: "▶️", sortOrder: 0 },
  { key: "watch-3",    title: "Марафон",             description: "Посмотри 3 серии за день",           type: "WATCH_EPISODE", targetCount: 3, xpReward: 50, emoji: "🔥", sortOrder: 1 },
  { key: "rate-1",     title: "Критик",              description: "Оцени любое аниме",                  type: "RATE",          targetCount: 1, xpReward: 25, emoji: "⭐", sortOrder: 2 },
  { key: "favorite-1", title: "В коллекцию",         description: "Добавь аниме в избранное",           type: "FAVORITE",      targetCount: 1, xpReward: 15, emoji: "❤️", sortOrder: 3 },
];

// Seed once per warm server instance; the count check makes it idempotent and
// cheap on subsequent calls within the same process.
let seeded = false;
export async function ensureQuestsSeeded(): Promise<void> {
  if (seeded) return;
  const count = await prisma.quest.count();
  if (count === 0) {
    await prisma.quest.createMany({
      data: DEFAULT_QUESTS.map(q => ({ ...q })),
      skipDuplicates: true,
    });
  }
  seeded = true;
}

// ── Weekly score ─────────────────────────────────────────────────────────────
export async function addWeeklyScore(
  userId: string,
  delta: { xp?: number; episodes?: number; quests?: number },
): Promise<void> {
  const ws = weekStart();
  const xp = delta.xp ?? 0;
  const episodes = delta.episodes ?? 0;
  const quests = delta.quests ?? 0;
  await prisma.weeklyScore.upsert({
    where: { userId_weekStart: { userId, weekStart: ws } },
    create: {
      userId,
      weekStart: ws,
      xpGained: xp,
      episodesWatched: episodes,
      questsCompleted: quests,
    },
    update: {
      xpGained: { increment: xp },
      episodesWatched: { increment: episodes },
      questsCompleted: { increment: quests },
    },
  });
}

// ── Streak ───────────────────────────────────────────────────────────────────
// Bumped the first time any quest is completed on a given MSK day.
async function bumpStreak(userId: string, today: Date): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { questStreak: true, lastQuestDate: true },
  });
  if (!user) return;
  const last = user.lastQuestDate;
  if (last && last.getTime() === today.getTime()) return; // already counted today
  const streak = last && isConsecutiveDay(last, today) ? user.questStreak + 1 : 1;
  await prisma.user.update({
    where: { id: userId },
    data: { questStreak: streak, lastQuestDate: today },
  });
}

// ── Advance quest progress ───────────────────────────────────────────────────
// Called from action handlers (watch/rate/favorite). Advances every active quest
// of `type` for today's bucket. Marks complete at the target but never awards XP
// here — the user claims the reward via POST /api/quests. Wrapped safely by
// callers so a quest failure never breaks the underlying action.
export async function advanceQuest(
  userId: string,
  type: QuestType,
  amount = 1,
): Promise<void> {
  await ensureQuestsSeeded();
  const quests = await prisma.quest.findMany({ where: { type, active: true } });
  if (quests.length === 0) return;

  const today = dayBucket();
  let firstCompletionToday = false;

  for (const q of quests) {
    const existing = await prisma.userQuestProgress.findUnique({
      where: { userId_questId_date: { userId, questId: q.id, date: today } },
      select: { progress: true, completed: true },
    });
    const prevProgress = existing?.progress ?? 0;
    if (existing?.completed) continue; // already done today

    const nextProgress = Math.min(q.targetCount, prevProgress + amount);
    const nowCompleted = nextProgress >= q.targetCount;

    await prisma.userQuestProgress.upsert({
      where: { userId_questId_date: { userId, questId: q.id, date: today } },
      create: {
        userId,
        questId: q.id,
        date: today,
        progress: nextProgress,
        completed: nowCompleted,
      },
      update: { progress: nextProgress, completed: nowCompleted },
    });

    if (nowCompleted) firstCompletionToday = true;
  }

  if (firstCompletionToday) {
    await bumpStreak(userId, today).catch(() => {});
  }
}

/** Fire-and-forget wrapper: never throws, so it's safe inside action handlers. */
export function advanceQuestSafe(userId: string, type: QuestType, amount = 1): Promise<void> {
  return advanceQuest(userId, type, amount).catch(() => {});
}

export function addWeeklyScoreSafe(
  userId: string,
  delta: { xp?: number; episodes?: number; quests?: number },
): Promise<void> {
  return addWeeklyScore(userId, delta).catch(() => {});
}
