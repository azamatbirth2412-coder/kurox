export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Star, Heart, Clock } from "lucide-react";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      favorites: { include: { anime: true }, orderBy: { createdAt: "desc" }, take: 12 },
      watchHistory: { include: { anime: true }, orderBy: { updatedAt: "desc" }, take: 12 },
      subscription: true,
    },
  });
  if (!user) redirect("/auth/login");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Профиль" }]} />
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-2xl p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-purple-700 flex items-center justify-center text-2xl font-bold mx-auto mb-3">
              {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
            </div>
            <h1 className="text-lg font-bold">{user.name || "Пользователь"}</h1>
            <p className="text-sm text-gray-400">{user.email}</p>
            {user.isPremium && (
              <div className="mt-2 inline-flex items-center gap-1 bg-yellow-500/20 text-yellow-400 rounded-full px-3 py-1 text-xs font-semibold">
                <Star size={12} fill="currentColor" /> Premium
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-800 rounded-xl p-3">
                <div className="text-xl font-bold text-purple-400">{user.favorites.length}</div>
                <div className="text-gray-400 text-xs mt-0.5">Избранное</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-3">
                <div className="text-xl font-bold text-blue-400">{user.watchHistory.length}</div>
                <div className="text-gray-400 text-xs mt-0.5">Просмотрено</div>
              </div>
            </div>
          </div>
          {!user.isPremium && (
            <Link href="/premium" className="block bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white rounded-2xl p-4 text-center transition-all">
              <div className="font-bold">Получить Premium</div>
              <div className="text-xs opacity-80 mt-1">Без рекламы и дополнительные возможности</div>
            </Link>
          )}
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Clock size={18} className="text-blue-400" /> История просмотров
            </h2>
            {user.watchHistory.length === 0 ? (
              <p className="text-gray-400 text-sm">История пуста. <Link href="/anime" className="text-purple-400 hover:underline">Начните смотреть!</Link></p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {user.watchHistory.map((h) => (
                  <Link key={h.id} href={`/anime/${h.anime.slug}-${h.anime.id}/episode-${h.episodeNum}`}
                    className="bg-gray-900 rounded-xl overflow-hidden hover:bg-gray-800 transition-colors">
                    <div className="aspect-[2/3] relative">
                      {h.anime.poster ? (
                        <Image src={h.anime.poster} alt={h.anime.title} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-700" />
                      )}
                    </div>
                    <div className="p-2 text-xs">
                      <div className="font-medium line-clamp-1">{h.anime.title}</div>
                      <div className="text-gray-400">Серия {h.episodeNum}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Heart size={18} className="text-red-400" /> Избранное
            </h2>
            {user.favorites.length === 0 ? (
              <p className="text-gray-400 text-sm">Список избранного пуст.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {user.favorites.map((f) => (
                  <Link key={f.id} href={`/anime/${f.anime.slug}-${f.anime.id}`}
                    className="bg-gray-900 rounded-xl overflow-hidden hover:bg-gray-800 transition-colors">
                    <div className="aspect-[2/3] relative">
                      {f.anime.poster ? (
                        <Image src={f.anime.poster} alt={f.anime.title} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-700" />
                      )}
                    </div>
                    <div className="p-2 text-xs">
                      <div className="font-medium line-clamp-2">{f.anime.title}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
