"use client";
import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";

interface SimilarAnime {
  id: number;
  slug: string;
  title: string;
  poster: string | null;
  year: number | null;
  genres: string[];
  isOngoing: boolean;
  episodes: number | null;
}

export function SimilarRow({ items }: { items: SimilarAnime[] }) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "right" ? 600 : -600, behavior: "smooth" });
  };

  if (!items.length) return null;

  return (
    <div className="relative group/row">
      {/* Scroll buttons */}
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-xl flex items-center justify-center text-[var(--text2)] hover:text-white hover:border-[var(--accent)]/50 transition-[color,border-color,opacity] duration-200 opacity-0 group-hover/row:opacity-100 disabled:opacity-0"
        aria-label="Назад"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-xl flex items-center justify-center text-[var(--text2)] hover:text-white hover:border-[var(--accent)]/50 transition-[color,border-color,opacity] duration-200 opacity-0 group-hover/row:opacity-100"
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
        {items.map(a => (
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
                <div className="w-12 h-12 rounded-full bg-violet-600/80 backdrop-blur-sm border-2 border-violet-400/60 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.6)]">
                  <Play size={18} className="text-white fill-white ml-0.5" />
                </div>
              </div>

              {/* Badges */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {a.isOngoing && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/90 text-white leading-tight">
                    ОНГОИНГ
                  </span>
                )}
              </div>

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
                  <span className="text-[11px] text-[var(--text3)]">{a.year}</span>
                )}
                {a.genres[0] && (
                  <span className="text-[10px] text-[var(--text3)] bg-[var(--surface3)] rounded px-1.5 py-0.5">
                    {a.genres[0]}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
