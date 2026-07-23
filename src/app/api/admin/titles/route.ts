import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) return null;
  const adminEmail = process.env.ADMIN_EMAIL ?? "rtxaza@gmail.com";
  if (session.user.email !== adminEmail) return null;
  return session;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const titles = await prisma.title.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { userTitles: true } } },
  });
  return NextResponse.json(titles);
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const { key, name, emoji, color, rarity, description, animeSlug, minEpisodes } =
    (body ?? {}) as Record<string, string>;

  if (!key?.trim() || !name?.trim())
    return NextResponse.json({ error: "key и name обязательны" }, { status: 400 });

  try {
    const title = await prisma.title.create({
      data: {
        key: key.trim().toLowerCase().replace(/\s+/g, "_"),
        name: name.trim(),
        emoji: emoji?.trim() || "🏅",
        color: color?.trim() || "#8b5cf6",
        rarity: ["common", "rare", "epic", "legendary"].includes(rarity) ? rarity : "common",
        description: description?.trim() || null,
        animeSlug: animeSlug?.trim() || null,
        minEpisodes: Math.max(1, parseInt(minEpisodes ?? "1") || 1),
      },
    });
    return NextResponse.json(title);
  } catch {
    return NextResponse.json({ error: "Ключ уже занят" }, { status: 409 });
  }
}
