import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: true });

  const { animeId, episodeNum, timestampSeconds, title, poster, slug } = await req.json();
  if (!animeId || episodeNum === undefined) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const userId = session.user.id;
  const existing = await prisma.watchHistory.findUnique({
    where: { userId_animeId_episodeNum: { userId, animeId: String(animeId), episodeNum } },
    select: { id: true },
  });

  await prisma.watchHistory.upsert({
    where: { userId_animeId_episodeNum: { userId, animeId: String(animeId), episodeNum } },
    update: {
      timestampSeconds: timestampSeconds || 0,
      title: title || "",
      poster: poster || null,
      slug: slug || null,
    },
    create: {
      userId,
      animeId: String(animeId),
      episodeNum,
      timestampSeconds: timestampSeconds || 0,
      title: title || "",
      poster: poster || null,
      slug: slug || null,
    },
  });

  if (!existing) {
    await prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: 10 } },
    });

    // Auto-award titles linked to this anime
    if (slug) {
      const animeTitles = await prisma.title.findMany({ where: { animeSlug: slug } });
      if (animeTitles.length > 0) {
        const episodeCount = await prisma.watchHistory.count({
          where: { userId, slug },
        });
        for (const t of animeTitles) {
          if (episodeCount >= t.minEpisodes) {
            await prisma.userTitle.upsert({
              where: { userId_titleId: { userId, titleId: t.id } },
              create: { userId, titleId: t.id },
              update: {},
            }).catch(() => null);
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const history = await prisma.watchHistory.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return NextResponse.json(history);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { id } = body as { id?: string };

  if (id) {
    // Delete single entry — only if it belongs to this user
    await prisma.watchHistory.deleteMany({ where: { id, userId: session.user.id } });
  } else {
    // Clear all history for this user
    await prisma.watchHistory.deleteMany({ where: { userId: session.user.id } });
  }

  return NextResponse.json({ ok: true });
}
