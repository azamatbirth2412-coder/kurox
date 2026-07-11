import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { animeId } = await req.json();
    if (!animeId) return NextResponse.json({ error: "animeId required" }, { status: 400 });

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existing = await prisma.view.findFirst({
      where: { animeId, ip, createdAt: { gte: oneHourAgo } },
    });

    if (!existing) {
      await prisma.$transaction([
        prisma.view.create({ data: { animeId, ip } }),
        prisma.anime.update({
          where: { id: animeId },
          data: { viewsCount: { increment: 1 } },
        }),
      ]);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("View track error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
