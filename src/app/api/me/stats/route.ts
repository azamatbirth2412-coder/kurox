import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcLevel } from "@/lib/level";

export async function GET() {
  const session = await auth();
  const userId  = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ xp: 0, level: 0 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true },
  });
  if (!user) return NextResponse.json({ xp: 0, level: 0 });

  return NextResponse.json({ xp: user.xp, level: calcLevel(user.xp) });
}
