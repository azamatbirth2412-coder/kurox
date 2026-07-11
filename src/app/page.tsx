import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAnimeList } from "@/lib/kodik";
import { AnimeCard } from "@/components/anime/AnimeCard";
import { AnimeCardSkeleton } from "@/components/anime/AnimeCardSkeleton";

export const metadata: Metadata = {
  title: "Kurox — Смотреть аниме онлайн бесплатно в хорошем качестве",
  description:
    "Kurox — крупнейший каталог аниме онлайн. Смотрите новые серии, популярные тайтлы и классику в HD качестве бесплатно без регистрации.",
  alternates: { canonical: "/" },
};

function makeSlug(title?: string, id?: string): string {
  if (!title) return id || "unknown";
  return (
    title
      .toLowerCase()
      .replace(/[^a-zа-яё0-9\s]/gi, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") || id || "unknown"
  );
}

function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <AnimeCardSkeleton key={i} />
      ))}
    </div>
  );
}

async function PopularSection() {
  const data = await getAnimeList({ limit: 12 });
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Популярное сейчас</h2>
        <Link href="/anime?sort=popular" className="text-sm text-purple-400 hover:underline">Все →</Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {data.results.map((anime) => (
          <AnimeCard key={anime.id} id={anime.id}
            slug={makeSlug(anime.material_data?.title, anime.id)}
            title={anime.material_data?.title || anime.title}
            poster={anime.material_data?.poster_url}
            year={anime.material_data?.year || anime.year}
            type={anime.type === "anime-serial" ? "ТВ" : "Фильм"}
            rating={anime.material_data?.shikimori_rating} />
        ))}
      </div>
    </section>
  );
}

async function NewEpisodesSection() {
  const data = await getAnimeList({ limit: 6 });
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Новые эпизоды</h2>
        <Link href="/anime?sort=new" className="text-sm text-purple-400 hover:underline">Все →</Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {data.results.map((anime) => (
          <AnimeCard key={anime.id} id={anime.id}
            slug={makeSlug(anime.material_data?.title, anime.id)}
            title={anime.material_data?.title || anime.title}
            poster={anime.material_data?.poster_url}
            year={anime.material_data?.year || anime.year}
            type={anime.type === "anime-serial" ? "ТВ" : "Фильм"}
            rating={anime.material_data?.shikimori_rating} />
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      <section className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-900 via-gray-900 to-gray-900 p-8 md:p-12">
        <div className="relative z-10">
          <h1 className="text-3xl md:text-5xl font-black mb-4">Смотри аниме<br /><span className="text-purple-400">без ограничений</span></h1>
          <p className="text-gray-300 text-lg mb-6 max-w-xl">Тысячи тайтлов, новые серии каждый день, удобный плеер и быстрая загрузка.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/anime" className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors">Смотреть каталог</Link>
            <Link href="/anime?sort=new" className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors">Новинки</Link>
          </div>
        </div>
      </section>
      <Suspense fallback={<div><div className="h-7 bg-gray-800 rounded w-48 mb-4 animate-pulse" /><SkeletonGrid count={12} /></div>}>
        <PopularSection />
      </Suspense>
      <Suspense fallback={<div><div className="h-7 bg-gray-800 rounded w-48 mb-4 animate-pulse" /><SkeletonGrid count={6} /></div>}>
        <NewEpisodesSection />
      </Suspense>
      <section className="bg-gray-900 rounded-2xl p-6 md:p-8">
        <h2 className="text-xl font-bold mb-4">Аниме онлайн на Kurox</h2>
        <div className="text-gray-400 text-sm leading-relaxed space-y-3">
          <p><strong className="text-gray-200">Kurox</strong> — это современный сайт для просмотра аниме онлайн бесплатно. Обширная библиотека с русской озвучкой и субтитрами.</p>
          <p>Найдёте классику — «Наруто», «Bleach», «Атака Титанов» — и свежие новинки сезона. Каталог пополняется сразу после выхода в Японии.</p>
          <p>Быстрая загрузка, адаптивный дизайн, сохранение прогресса и персональные рекомендации. Premium убирает рекламу и открывает доп. возможности.</p>
        </div>
      </section>
    </div>
  );
}

