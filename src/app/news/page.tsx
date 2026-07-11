export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Calendar } from "lucide-react";

export const metadata: Metadata = {
  title: "Новости аниме — Kurox",
  description: "Последние новости мира аниме, обзоры сезонов и анонсы новых тайтлов на Kurox.",
  alternates: { canonical: "/news" },
};

export default async function NewsPage() {
  const posts = await prisma.newsPost.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Новости" }]} />
      <h1 className="text-2xl font-bold mt-4 mb-8">Новости аниме</h1>
      {posts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Новостей пока нет. Заходите позже!</div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Link key={post.id} href={`/news/${post.slug}`}
              className="block bg-gray-900 hover:bg-gray-800 rounded-xl p-5 transition-colors">
              <h2 className="text-lg font-semibold mb-2">{post.title}</h2>
              {post.description && <p className="text-gray-400 text-sm line-clamp-2">{post.description}</p>}
              <div className="flex items-center gap-1 mt-3 text-xs text-gray-500">
                <Calendar size={12} />
                {new Date(post.createdAt).toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
