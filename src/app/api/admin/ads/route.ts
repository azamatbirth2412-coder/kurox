import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const slots = await prisma.adSlot.findMany({ where: { isActive: true } });
  return NextResponse.json(slots);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { slot, code, isActive } = await req.json();
  if (!slot) return NextResponse.json({ error: "slot required" }, { status: 400 });

  await prisma.adSlot.upsert({
    where: { slot },
    update: { code, isActive },
    create: { slot, code: code || "", isActive: isActive ?? true },
  });
  return NextResponse.json({ ok: true });
}
