"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Flame } from "lucide-react";

interface AnimeItem {
  id: number;
  slug: string;
  title: string;
  titleEn?: string | null;
  poster?: string | null;
  desc?: string | null;
  genres: string[];
  type?: string | null;
  year?: number | null;
  isOngoing: boolean;
}

interface Props {
  items: AnimeItem[];
}

const INTERVAL = 6000; // 6 секунд

export function HeroBannerSlider({ items }: Props) {
  const [idx, setIdx] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((next: number) => {
    if (transitioning || next === idx) return;
    setPrev(idx);
    setTransitioning(true);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      setIdx(next);
      setPrev(null);
      setTransitioning(false);
    }, 600);
  }, [idx, transitioning]);

  useEffect(() => {
    return () => { if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current); };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      goTo((idx + 1) % items.length);
    }, INTERVAL);
    return () => clearInterval(timer);
  }, [idx, items.length, goTo]);

  if (!items.length) return null;

  const current = items[idx];
  const prevItem = prev !== null ? items[prev] : null;

  return (
    <section className="relative -mx-4 overflow-hidden" style={{ minHeight: 520 }}>

      {/* Previous poster — stays visible during transition so hero never goes blank */}
      {prevItem?.poster && (
        <div className="absolute inset-0 transition-opacity duration-500" style={{ zIndex: 1, opacity: transitioning ? 1 : 0 }}>
          <Image src={prevItem.poster} alt={prevItem.title} fill priority className="object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg)] via-[var(--bg)]/80 to-[var(--bg)]/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/10 to-[var(--bg)]/75" />
        </div>
      )}

      {/* Current poster — fades in after transition */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{ zIndex: 2, opacity: transitioning ? 0 : 1 }}
      >
        {current.poster ? (
          <>
            <Image src={current.poster} alt={current.title} fill priority className="object-cover object-top" />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg)] via-[var(--bg)]/80 to-[var(--bg)]/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/10 to-[var(--bg)]/75" />
          </>
        ) : (
          <div className="absolute inset-0 hero-bg" />
        )}
      </div>

      {/* Content */}
      <div className="relative flex items-end pb-14 pt-28 h-full" style={{ zIndex: 10, minHeight: 520 }}>
        <div className="max-w-[1400px] mx-auto px-4 w-full flex items-end">
          <div
            className="max-w-[560px] transition-[transform,opacity] duration-500 ease-out"
            style={{ opacity: transitioning ? 0 : 1, transform: transitioning ? "translateY(8px)" : "translateY(0)" }}
          >
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="badge badge-purple text-xs"><Flame size={10} /> Новинка</span>
              {current.type && <span className="badge badge-gray text-xs">{current.type}</span>}
              {current.year && <span className="badge badge-gray text-xs tabular-nums">{current.year}</span>}
              {current.isOngoing && <span className="badge badge-green text-xs">● Онгоинг</span>}
            </div>

            <h1 className="text-3xl md:text-[40px] font-black leading-tight text-white drop-shadow-2xl mb-2">
              {current.title}
            </h1>
            {current.titleEn && (
              <p className="text-sm text-white/50 mb-2 font-medium">{current.titleEn}</p>
            )}

            {current.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {current.genres.map(g => (
                  <span key={g} className="text-xs text-white/60 bg-white/8 border border-white/10 rounded-full px-2.5 py-0.5">{g}</span>
                ))}
              </div>
            )}

            {current.desc && (
              <p className="text-sm text-white/60 leading-relaxed line-clamp-3 mb-6 max-w-md">{current.desc}</p>
            )}

            <div className="flex gap-3 flex-wrap items-center">
              <Link href={`/anime/${current.slug}`}
                className="flex items-center gap-2 bg-[var(--accent)] hover:bg-violet-500 active:scale-[.97] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-[transform,background-color] duration-200 neon-glow">
                <Play size={15} fill="currentColor" /> Смотреть
              </Link>
              <Link href="/anime"
                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 active:scale-[.97] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-[transform,background-color] duration-200 border border-white/10">
                Каталог
              </Link>
            </div>
          </div>

          {/* Side ranking */}
          <div className="absolute right-4 bottom-10 hidden xl:flex flex-col gap-2">
            {items.filter((_, i) => i !== idx).slice(0, 4).map((a, i) => (
              <Link key={a.id} href={`/anime/${a.slug}`}
                className="flex items-center gap-2.5 bg-black/55 backdrop-blur-sm border border-white/8 rounded-2xl px-3 py-2 w-[220px] hover:bg-black/75 transition-colors group">
                <span className="text-xs font-black text-[var(--text3)] w-4">#{i + 2}</span>
                <div className="relative w-9 h-[54px] rounded-lg overflow-hidden flex-shrink-0">
                  {a.poster && <Image src={a.poster} alt={a.title} fill className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold line-clamp-2 leading-snug group-hover:text-violet-300 transition-colors">{a.title}</p>
                  {a.type && <p className="text-[10px] text-[var(--text3)] mt-0.5">{a.type}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Slide indicators — active pill fills over the auto-advance interval */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2 px-4">
          {items.map((_, i) => {
            const active = i === idx;
            return (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Показать слайд ${i + 1} из ${items.length}`}
                aria-current={active}
                className="grid h-9 place-items-center px-1"
              >
                <span
                  className="relative block h-1.5 overflow-hidden rounded-full transition-[width,background-color] duration-300 ease-out"
                  style={{ width: active ? 34 : 12, background: "rgba(255,255,255,.28)" }}
                >
                  {active && (
                    <span
                      key={idx}
                      className="absolute inset-0 origin-left rounded-full bg-[var(--accent)]"
                      style={{ animation: `heroProgress ${INTERVAL}ms linear forwards` }}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
