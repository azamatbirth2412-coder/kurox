"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";

interface UpcomingItem {
  id: number;
  slug: string;
  title: string;
  poster: string;
  nextEpisodeAt: string | null;
  nextEpisodeOrdinal: number | null;
  isOngoing: boolean;
}

function useCountdown(target: string | null) {
  const [diff, setDiff] = useState<number | null>(null);

  useEffect(() => {
    if (!target) return;
    const targetMs = new Date(target).getTime();
    const calc = () => Math.max(0, targetMs - Date.now());
    setDiff(calc());
    const id = setInterval(() => setDiff(calc()), 1000);
    return () => clearInterval(id);
  }, [target]);

  return diff;
}

function Countdown({ target, ordinal }: { target: string; ordinal: number | null }) {
  const diff = useCountdown(target);

  if (diff === null) return <span className="text-[var(--text3)] text-xs">...</span>;

  if (diff === 0) {
    return (
      <span className="text-green-400 text-xs font-bold animate-pulse">
        Вышла{ordinal ? ` серия ${ordinal}` : ""}!
      </span>
    );
  }

  const days    = Math.floor(diff / 86400000);
  const hours   = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  const date = new Date(target);
  const dateStr = date.toLocaleDateString("ru", { day: "numeric", month: "short", weekday: "short" });
  const timeStr = date.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-0.5">
      {ordinal && (
        <span className="text-[10px] text-violet-400 font-semibold">Серия {ordinal}</span>
      )}
      {/* Countdown digits */}
      <div className="flex items-center gap-1">
        {days > 0 && (
          <span className="bg-[var(--surface3)] rounded px-1.5 py-0.5 text-[11px] font-bold text-white tabular-nums">
            {days}д
          </span>
        )}
        <span className="bg-[var(--surface3)] rounded px-1.5 py-0.5 text-[11px] font-bold text-white tabular-nums">
          {String(hours).padStart(2, "0")}ч
        </span>
        <span className="bg-[var(--surface3)] rounded px-1.5 py-0.5 text-[11px] font-bold text-white tabular-nums">
          {String(minutes).padStart(2, "0")}м
        </span>
        <span className="bg-violet-600/80 rounded px-1.5 py-0.5 text-[11px] font-bold text-white tabular-nums">
          {String(seconds).padStart(2, "0")}с
        </span>
      </div>
      {/* Exact date */}
      <span className="text-[10px] text-[var(--text3)]">{dateStr} в {timeStr}</span>
    </div>
  );
}

export function UpcomingAnimeAdmin({ items }: { items: UpcomingItem[] }) {
  if (!items.length) return (
    <div className="text-sm text-[var(--text2)] py-2">
      Расписание на эту неделю недоступно
    </div>
  );

  return (
    <div className="space-y-3">
      {items.map(item => (
        <Link key={item.id} href={`/anime/${item.slug}`} target="_blank"
          className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface2)] hover:bg-[var(--surface3)] border border-[var(--border)] hover:border-violet-500/30 transition-all group">
          {/* Poster */}
          <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--surface3)]">
            {item.poster && (
              <Image src={item.poster} alt={item.title} width={40} height={56}
                className="object-cover w-full h-full" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold line-clamp-1 group-hover:text-violet-300 transition-colors">
              {item.title}
            </p>
            <div className="mt-1">
              {item.nextEpisodeAt ? (
                <Countdown target={item.nextEpisodeAt} ordinal={item.nextEpisodeOrdinal} />
              ) : (
                <span className="text-xs text-[var(--text3)]">Дата не указана</span>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="flex-shrink-0">
            {item.nextEpisodeAt && new Date(item.nextEpisodeAt) > new Date() ? (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1">
                <Clock size={10} /> Ожидается
              </span>
            ) : (
              <span className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-2 py-1">
                Сегодня
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
