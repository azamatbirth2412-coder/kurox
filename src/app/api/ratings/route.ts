import { NextRequest, NextResponse } from "next/server";
import { auth, isUserBanned } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/ratings?animeId=… — average score + current user's score
export async function GET(req: NextRequest) {
  const animeId = req.nextUrl.searchParams.get("animeId");
  if (!animeId) return NextResponse.json({ error: "animeId required" }, { status: 400 });

  const session = await auth();

  const [avg, mine] = await Promise.all([
    prisma.rating.aggregate({ where: { animeId }, _avg: { score: true }, _count: true }),
    session?.user?.id
      ? prisma.rating.findUnique({
          where: { userId_animeId: { userId: session.user.id, animeId } },
          select: { score: true },
        })
      : Promise.resolve(null),
  ]);

  return NextResponse.json({
    avgScore: avg._avg.score,
    totalVotes: avg._count,
    myScore: mine?.score ?? null,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Banned-after-login users still hold a valid JWT — re-check the DB
  if (await isUserBanned(session.user.id)) {
    return NextResponse.json({ error: "Аккаунт заблокирован" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { animeId, score } = (body ?? {}) as { animeId?: unknown; score?: unknown };
  if (
    typeof animeId !== "string" || !animeId ||
    typeof score !== "number" || !Number.isInteger(score) || score < 1 || score > 5
  ) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const rating = await prisma.rating.upsert({
    where: { userId_animeId: { userId: session.user.id, animeId } },
    update: { score },
    create: { userId: session.user.id, animeId, score },
  });

  const avg = await prisma.rating.aggregate({
    where: { animeId },
    _avg: { score: true },
    _count: true,
  });

  return NextResponse.json({ rating, avgScore: avg._avg.score, totalVotes: avg._count });
}
