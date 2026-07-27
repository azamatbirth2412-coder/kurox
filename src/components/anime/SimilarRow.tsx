"use client";
import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Play, Star, Sparkles } from "lucide-react";

interface SimilarAnime {
  id: number;
  slug: string;
  title: string;
  poster: string | null;
  year: number | null;
  genres: string[];
  isOngoing: boolean;
  episodes: number | null;
  rating?: number | null;
}

// Score → colour, mirroring AnimeCard's emerald/amber/orange quality signal.
function ratingColor(r: number): string {
  if (r >= 8) return "text-emerald-300";
  if (r >= 7) return "text-amber-300";
  if (r >= 6) return "text-orange-300";
  return "text-[var(--text2)]";
}

export function SimilarRow({ items }: { items: SimilarAnime[] }) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    const el = rowRef.current;
    if (!el) return;
    // globals.css neutralises CSS transitions under reduced motion, but
    // programmatic smooth scrolling is a JS API it can't reach.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir === "right" ? 600 : -600, behavior: reduced ? "auto" : "smooth" });
  };

  // Nicer empty state instead of rendering nothing.
  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]/40 px-4 py-10 text-center">
        <Sparkles size={20} className="text-[var(--text3)] opacity-60" />
        <p className="text-sm text-[var(--text2)]">Похожих аниме пока не нашлось</p>
        <p className="text-xs text-[var(--text3)]">Загляните в каталог — там точно есть что посмотреть</p>
      </div>
    );
  }

  return (
    <div className="relative group/row">
      {/* Scroll buttons */}
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-xl flex items-center justify-center text-[var(--text2)] hover:text-white hover:border-[var(--accent)]/50 transition-[color,border-color,opacity] duration-200 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-0"
        aria-label="Назад"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-xl flex items-center justify-center text-[var(--text2)] hover:text-white hover:border-[var(--accent)]/50 transition-[color,border-color,opacity] duration-200 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        aria-label="Вперёд"
      >
        <ChevronRight size={18} />
      </button>

      {/* Row */}
      <div
        ref={rowRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-1"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {items.map(a => {
          const hasRating = typeof a.rating === "number" && a.rating > 0;
          return (
          <Link
            key={a.id}
            href={`/anime/${a.slug}`}
            className="group flex-shrink-0 w-[148px] sm:w-[160px]"
            style={{ scrollSnapAlign: "start" }}
          >
            {/* Poster */}
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[var(--surface2)] mb-2.5">
              {a.poster ? (
                <Image
                  src={a.poster}
                  alt={a.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="160px"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play size={24} className="text-[var(--text3)] opacity-30" />
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Play button on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-[transform,opacity] duration-300 ease-out scale-75 group-hover:scale-100">
                <div className="w-12 h-12 rounded-full bg-violet-600/80 backdrop-blur-sm border-2 border-violet-400/60 flex items-center justify-center shadow-[0_4px_16px_rgba(139,92,246,0.5)]">
                  <Play size={18} className="text-white fill-white ml-0.5" />
                </div>
              </div>

              {/* Rating — colour-coded by score, top-left (matches AnimeCard) */}
              {hasRating && (
                <div className={`absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-md rounded-md pl-1 pr-1.5 py-0.5 text-[11px] font-bold leading-none tabular-nums ring-1 ring-white/10 ${ratingColor(a.rating!)}`}>
                  <Star size={10} fill="currentColor" className="shrink-0" /> {a.rating!.toFixed(1)}
                </div>
              )}

              {/* Ongoing badge — top-right */}
              {a.isOngoing && (
                <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/90 text-white leading-tight shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                    ОНГОИНГ
                  </span>
                </div>
              )}

              {/* Episodes bottom */}
              {a.episodes && (
                <div className="absolute bottom-0 inset-x-0 px-2 pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-white/80 font-medium bg-black/50 rounded px-1.5 py-0.5">
                    {a.episodes} эп.
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="px-0.5">
              <h4 className="text-sm font-semibold leading-snug line-clamp-2 text-[var(--text)] group-hover:text-violet-300 transition-colors duration-200 mb-1">
                {a.title}
              </h4>
              <div className="flex items-center gap-1.5 flex-wrap">
                {a.year && (
                  <span className="text-[11px] text-[var(--text3)] tabular-nums">{a.year}</span>
                )}
                {a.genres[0] && (
                  <span className="text-[10px] text-[var(--text2)] bg-[var(--surface3)] rounded px-1.5 py-0.5">
                    {a.genres[0]}
                  </span>
                )}
              </div>
            </div>
          </Link>
          );
        })}
      </div>
    </div>
  );
}
