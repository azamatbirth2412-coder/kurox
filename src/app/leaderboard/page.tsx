export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getWeeklyBoard, currentWeekWindow, CATEGORIES } from "@/lib/leaderboard";
import { WeeklyBoard } from "@/components/leaderboard/WeeklyBoard";

export const metadata: Metadata = {
  title: "Недельный лидерборд — Kurox",
  description: "Соревнуйся каждую неделю: смотри аниме, выполняй дейлики и попади в топ. Сброс каждый понедельник в 00:00 МСК, награды для топ-10.",
};

export default async function LeaderboardPage() {
  const initialCategory = "active" as const;
  const [board, session] = await Promise.all([
    getWeeklyBoard(initialCategory),
    auth(),
  ]);
  const { end } = currentWeekWindow();
  const myId = (session?.user as { id?: string } | undefined)?.id;

  return (
    <WeeklyBoard
      categories={CATEGORIES}
      initialCategory={initialCategory}
      initialBoard={board}
      weekEndIso={end.toISOString()}
      myId={myId}
    />
  );
}
