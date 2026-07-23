import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  let action: unknown, reason: unknown;
  try {
    ({ action, reason } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (action === "ban") {
      // Don't let an admin lock themselves out
      const self = await prisma.user.findUnique({ where: { email: session.user!.email! }, select: { id: true } });
      if (self?.id === id) {
        return NextResponse.json({ error: "Cannot ban yourself" }, { status: 400 });
      }
      await prisma.user.update({
        where: { id },
        data: { role: "BANNED", bannedAt: new Date(), banReason: (typeof reason === "string" && reason) || "Нарушение правил" },
      });
      return NextResponse.json({ ok: true });
    }
    if (action === "unban") {
      await prisma.user.update({
        where: { id },
        data: { role: "USER", bannedAt: null, banReason: null },
      });
      return NextResponse.json({ ok: true });
    }
    if (action === "makeAdmin") {
      await prisma.user.update({ where: { id }, data: { role: "ADMIN" } });
      return NextResponse.json({ ok: true });
    }
    if (action === "removeAdmin") {
      await prisma.user.update({ where: { id }, data: { role: "USER" } });
      return NextResponse.json({ ok: true });
    }
    if (action === "grantTitle") {
      const key = typeof reason === "string" ? reason : "secret_agent";
      const title = await prisma.title.findFirst({ where: { key } });
      if (!title) return NextResponse.json({ error: "Title not found" }, { status: 404 });
      await prisma.userTitle.upsert({
        where: { userId_titleId: { userId: id, titleId: title.id } },
        update: {},
        create: { userId: id, titleId: title.id },
      });
      return NextResponse.json({ ok: true });
    }
    if (action === "revokeTitle") {
      const key = typeof reason === "string" ? reason : "secret_agent";
      const title = await prisma.title.findFirst({ where: { key } });
      if (!title) return NextResponse.json({ error: "Title not found" }, { status: 404 });
      await prisma.userTitle.deleteMany({ where: { userId: id, titleId: title.id } });
      return NextResponse.json({ ok: true });
    }
  } catch (e: unknown) {
    // P2025 — record not found (e.g. user deleted in another tab)
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.error("Admin user PATCH error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const self = await prisma.user.findUnique({ where: { email: session.user!.email! } });
  if (self?.id === id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  try {
    await prisma.user.delete({ where: { id } });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.error("Admin user DELETE error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
