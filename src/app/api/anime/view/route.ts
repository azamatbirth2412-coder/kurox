import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    const ip = getIp(req);

    // Rate limit the endpoint itself (IP dedup below only limits DB rows,
    // not request spam): 10 view pings per minute per IP
    if (!rateLimit(`view:${ip}`, 10, 60_000)) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const body = await req.json().catch(() => null);
    const animeId = (body as { animeId?: unknown } | null)?.animeId;

    // Anilibria release ids are numeric strings — reject garbage input that
    // would otherwise create unbounded junk rows in the views table
    if (typeof animeId !== "string" || !/^\d{1,12}$/.test(animeId)) {
      return NextResponse.json({ error: "animeId required" }, { status: 400 });
    }

    // Dedup by IP: count at most one view per anime per IP per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existing = await prisma.view.findFirst({
      where: { animeId, ip, createdAt: { gte: oneHourAgo } },
    });

    if (!existing) {
      await prisma.$transaction([
        prisma.view.deleteMany({ where: { animeId, ip } }),
        prisma.view.create({ data: { animeId, ip } }),
        // The Anilibria release id is stored in `kodikId` on the local anime
        // table (`id` is a cuid) — matching on `id` never incremented anything.
        // updateMany: no-op instead of P2025 crash when the row doesn't exist.
        prisma.anime.updateMany({
          where: { kodikId: animeId },
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
