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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await prisma.title.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}

// Award title to a user by email or name
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: titleId } = await params;

  const body = await req.json().catch(() => null);
  const identifier = ((body as { identifier?: string } | null)?.identifier ?? "").trim();
  if (!identifier) return NextResponse.json({ error: "identifier обязателен" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { name: identifier }] },
    select: { id: true, name: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });

  await prisma.userTitle.upsert({
    where: { userId_titleId: { userId: user.id, titleId } },
    create: { userId: user.id, titleId },
    update: {},
  });

  return NextResponse.json({ ok: true, user: { name: user.name, email: user.email } });
}
