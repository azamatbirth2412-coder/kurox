import { NextRequest, NextResponse } from "next/server";
import { auth, isUserBanned } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: commentId } = await params;
  const { type } = await req.json() as { type: "LIKE" | "DISLIKE" };

  if (type !== "LIKE" && type !== "DISLIKE") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const userId = session.user.id;

  // Banned-after-login users still hold a valid JWT — re-check the DB
  if (await isUserBanned(userId)) {
    return NextResponse.json({ error: "Аккаунт заблокирован" }, { status: 403 });
  }

  const existing = await prisma.commentLike.findUnique({
    where: { commentId_userId: { commentId, userId } },
  });

  if (existing) {
    if (existing.type === type) {
      // Toggle off
      await prisma.commentLike.delete({ where: { id: existing.id } });
    } else {
      // Switch type
      await prisma.commentLike.update({ where: { id: existing.id }, data: { type } });
    }
  } else {
    await prisma.commentLike.create({ data: { commentId, userId, type } });
  }

  const [likes, dislikes] = await Promise.all([
    prisma.commentLike.count({ where: { commentId, type: "LIKE" } }),
    prisma.commentLike.count({ where: { commentId, type: "DISLIKE" } }),
  ]);

  const myVote = existing?.type === type
    ? null
    : (existing ? type : type);

  return NextResponse.json({ likes, dislikes, myVote });
}
