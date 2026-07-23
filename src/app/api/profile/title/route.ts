import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const titleId = (body as { titleId?: string | null } | null)?.titleId ?? null;

  if (titleId !== null) {
    // Verify user actually owns this title
    const owned = await prisma.userTitle.findUnique({
      where: { userId_titleId: { userId: session.user.id, titleId } },
    });
    if (!owned) return NextResponse.json({ error: "Титул не найден" }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { activeTitleId: titleId },
  });

  return NextResponse.json({ ok: true });
}
