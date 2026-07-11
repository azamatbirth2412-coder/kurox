import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { animeId, score } = await req.json();
  if (!animeId || !score || score < 1 || score > 5) {
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
