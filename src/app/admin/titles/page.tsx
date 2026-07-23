export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { TitleManagement } from "@/components/admin/TitleManagement";

export default async function AdminTitlesPage() {
  const titles = await prisma.title.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { userTitles: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Управление титулами</h1>
      <TitleManagement
        initialTitles={titles.map((t) => ({
          id: t.id,
          key: t.key,
          name: t.name,
          emoji: t.emoji,
          color: t.color,
          rarity: t.rarity,
          description: t.description,
          animeSlug: t.animeSlug,
          minEpisodes: t.minEpisodes,
          owners: t._count.userTitles,
        }))}
      />
    </div>
  );
}
