import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: true });

  const { animeId, episodeNum, timestampSeconds } = await req.json();
  if (!animeId || episodeNum === undefined) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  await prisma.watchHistory.upsert({
    where: { userId_animeId_episodeNum: { userId: session.user.id, animeId, episodeNum } },
    update: { timestampSeconds: timestampSeconds || 0 },
    create: { userId: session.user.id, animeId, episodeNum, timestampSeconds: timestampSeconds || 0 },
  });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const history = await prisma.watchHistory.findMany({
    where: { userId: session.user.id },
    include: { anime: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return NextResponse.json(history);
}
