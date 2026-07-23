export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { CommentModerationList } from "@/components/admin/CommentModerationList";

export default async function AdminCommentsPage() {
  const comments = await prisma.comment.findMany({
    where: { status: "PENDING" },
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Модерация комментариев</h1>
      <CommentModerationList initialComments={comments as any} />
    </div>
  );
}
