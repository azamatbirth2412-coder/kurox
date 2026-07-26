import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getWeeklyBoard,
  isWeeklyCategory,
  currentWeekWindow,
  type WeeklyCategory,
} from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

// GET /api/leaderboard/weekly?category=active|level|episodes
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("category");
  const category: WeeklyCategory = isWeeklyCategory(raw) ? raw : "active";

  const [board, session] = await Promise.all([getWeeklyBoard(category), auth()]);
  const { start, end } = currentWeekWindow();

  const myId = session?.user?.id;
  const me = myId ? board.find(r => r.id === myId) ?? null : null;

  return NextResponse.json({
    category,
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    total: board.length,
    board,
    me,
  });
}
