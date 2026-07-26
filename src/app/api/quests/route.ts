import { NextRequest, NextResponse } from "next/server";
import { auth, isUserBanned } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureQuestsSeeded, addWeeklyScore } from "@/lib/quests";
import { dayBucket, dayEnd } from "@/lib/competition";

export const dynamic = "force-dynamic";

// GET — today's quests with the current user's progress + streak.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  await ensureQuestsSeeded();
  const today = dayBucket();

  const [quests, progress, user] = await Promise.all([
    prisma.quest.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.userQuestProgress.findMany({ where: { userId, date: today } }),
    prisma.user.findUnique({ where: { id: userId }, select: { questStreak: true } }),
  ]);

  const byQuest = new Map(progress.map(p => [p.questId, p]));

  return NextResponse.json({
    streak: user?.questStreak ?? 0,
    resetAt: dayEnd().toISOString(),
    quests: quests.map(q => {
      const p = byQuest.get(q.id);
      return {
        id: q.id,
        key: q.key,
        title: q.title,
        description: q.description,
        emoji: q.emoji,
        type: q.type,
        targetCount: q.targetCount,
        xpReward: q.xpReward,
        progress: Math.min(q.targetCount, p?.progress ?? 0),
        completed: p?.completed ?? false,
        claimed: !!p?.claimedAt,
      };
    }),
  });
}

// POST — claim a completed quest's reward (idempotent per day).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await isUserBanned(session.user.id)) {
    return NextResponse.json({ error: "Аккаунт заблокирован" }, { status: 403 });
  }
  const userId = session.user.id;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { questId } = (body ?? {}) as { questId?: unknown };
  if (typeof questId !== "string" || !questId) {
    return NextResponse.json({ error: "questId required" }, { status: 400 });
  }

  const today = dayBucket();
  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  if (!quest || !quest.active) return NextResponse.json({ error: "Quest not found" }, { status: 404 });

  const progress = await prisma.userQuestProgress.findUnique({
    where: { userId_questId_date: { userId, questId, date: today } },
  });
  if (!progress || !progress.completed) {
    return NextResponse.json({ error: "Квест ещё не выполнен" }, { status: 400 });
  }
  if (progress.claimedAt) {
    return NextResponse.json({ error: "Награда уже получена" }, { status: 409 });
  }

  // Mark claimed only if still unclaimed — guards against a double-claim race.
  const claimed = await prisma.userQuestProgress.updateMany({
    where: { id: progress.id, claimedAt: null },
    data: { claimedAt: new Date() },
  });
  if (claimed.count === 0) {
    return NextResponse.json({ error: "Награда уже получена" }, { status: 409 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { xp: { increment: quest.xpReward } },
    select: { xp: true, questStreak: true },
  });
  await addWeeklyScore(userId, { xp: quest.xpReward, quests: 1 }).catch(() => {});

  return NextResponse.json({
    ok: true,
    claimed: true,
    xpAwarded: quest.xpReward,
    xp: updatedUser.xp,
    streak: updatedUser.questStreak,
  });
}
