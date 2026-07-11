export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { AdManagement } from "@/components/admin/AdManagement";

export default async function AdminAdsPage() {
  const slots = await prisma.adSlot.findMany({ orderBy: { slot: "asc" } });
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Управление рекламой</h1>
      <AdManagement initialSlots={slots} />
    </div>
  );
}
