export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.newsPost.findUnique({ where: { slug, isPublished: true } });
  if (!post) return { title: "Статья не найдена" };
  return {
    title: post.title,
    description: post.description || undefined,
    alternates: { canonical: `/news/${slug}` },
  };
}

export default async function NewsPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await prisma.newsPost.findUnique({ where: { slug, isPublished: true } });
  if (!post) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: "Главная", href: "/" },
        { label: "Новости", href: "/news" },
        { label: post.title },
      ]} />
      <article className="mt-6">
        <h1 className="text-3xl font-bold mb-3">{post.title}</h1>
        <div className="text-sm text-gray-400 mb-8">
          {new Date(post.createdAt).toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" })}
        </div>
        <div className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">{post.content}</div>
      </article>
    </div>
  );
}
