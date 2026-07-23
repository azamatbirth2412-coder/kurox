import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const { titleId } = await req.json().catch(() => ({}));
  if (!titleId) return NextResponse.json({ error: "titleId обязателен" }, { status: 400 });

  const [title, user] = await Promise.all([
    prisma.title.findUnique({ where: { id: titleId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, xp: true, role: true } }),
  ]);

  if (!title) return NextResponse.json({ error: "Титул не найден" }, { status: 404 });
  if (!user)  return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });

  const existing = await prisma.userTitle.findUnique({
    where: { userId_titleId: { userId, titleId } },
  });
  if (existing) return NextResponse.json({ error: "Уже получен!" }, { status: 409 });

  // ── Admin bypass: skip all requirements ───────────────────────────
  const isAdmin = (user as any).role === "ADMIN";

  if (!isAdmin) {
    // 1. Total episodes across all anime
    if (title.totalEpisodes > 0) {
      const watched = await prisma.watchHistory.count({ where: { userId } });
      if (watched < title.totalEpisodes) {
        return NextResponse.json({
          error: `Нужно ещё ${title.totalEpisodes - watched} серий! У тебя сейчас ${watched}.`,
        }, { status: 403 });
      }
    }

    // 2. Multi-anime requirement (requiresAnime JSON)
    if (title.requiresAnime) {
      type Req = { slug: string; name: string; episodes: number };
      let reqs: Req[] = [];
      try { reqs = JSON.parse(title.requiresAnime); } catch { /* ignore */ }

      const lacking: string[] = [];
      for (const r of reqs) {
        const anime = await prisma.anime.findFirst({ where: { slug: r.slug }, select: { id: true } });
        if (!anime) { lacking.push(`${r.name} (аниме не найдено на сайте)`); continue; }
        const count = await prisma.watchHistory.count({ where: { userId, animeId: anime.id } });
        if (count < r.episodes) lacking.push(`${r.name} (${count}/${r.episodes} серий)`);
      }

      if (lacking.length > 0) {
        return NextResponse.json({
          error: `Не хватает: ${lacking.join(", ")}`,
        }, { status: 403 });
      }
    }

    // 3. Single anime requirement
    if (title.animeSlug && !title.requiresAnime) {
      const anime = await prisma.anime.findFirst({ where: { slug: title.animeSlug }, select: { id: true } });
      if (!anime) return NextResponse.json({ error: "Аниме не найдено на сайте" }, { status: 404 });
      const count = await prisma.watchHistory.count({ where: { userId, animeId: anime.id } });
      if (count < title.minEpisodes) {
        return NextResponse.json({
          error: `Нужно ещё ${title.minEpisodes - count} серий аниме!`,
        }, { status: 403 });
      }
    }
  }

  // ── Grant title ────────────────────────────────────────────────────
  await prisma.userTitle.create({ data: { userId, titleId } });
  return NextResponse.json({ ok: true });
}
