import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // DB-backed — see requireAdminUser: a year-long JWT keeps a stale ADMIN role.
  if (!(await requireAdminUser())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const { action } = await req.json();

  if (action === "approve") {
    await prisma.comment.update({ where: { id }, data: { status: "APPROVED" } });
  } else if (action === "reject") {
    await prisma.comment.update({ where: { id }, data: { status: "REJECTED" } });
  } else if (action === "delete") {
    await prisma.comment.delete({ where: { id } });
  }
  return NextResponse.json({ ok: true });
}
