import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FRAME_UNLOCKS, calcLevel } from "@/lib/level";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const frame = (body as { frame?: unknown } | null)?.frame;

  if (typeof frame !== "string" || !(frame in FRAME_UNLOCKS)) {
    return NextResponse.json({ error: "Неизвестная рамка" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { xp: true, role: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = user.role === "ADMIN";
  if (!isAdmin) {
    const level = calcLevel(user.xp);
    if (FRAME_UNLOCKS[frame] > level) {
      return NextResponse.json(
        { error: `Рамка откроется на уровне ${FRAME_UNLOCKS[frame]}` },
        { status: 403 }
      );
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { profileFrame: frame },
  });

  return NextResponse.json({ ok: true, frame });
}
