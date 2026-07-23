"use client";
import { useState, useEffect } from "react";

interface Props {
  episodeAt: string;
  episodeNum: number | null;
}

// null = episode air time already passed; undefined = not calculated yet
function calcDiff(target: number) {
  const diff = target - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    total: diff,
  };
}

export function EpisodeTimer({ episodeAt, episodeNum }: Props) {
  const target = new Date(episodeAt).getTime();
  const [t, setT] = useState<ReturnType<typeof calcDiff> | undefined>(undefined);

  useEffect(() => {
    setT(calcDiff(target));
    const id = setInterval(() => setT(calcDiff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const epLabel = episodeNum ? `Серия ${episodeNum}` : "Новая серия";

  // Not hydrated yet — neutral placeholder instead of a wrong "уже вышла!" flash
  if (t === undefined) {
    return (
      <div className="mt-1 space-y-0.5">
        <p className="text-[10px] font-bold text-violet-400">{epLabel}</p>
        <p className="text-[9px] text-[var(--text3)] font-mono">…</p>
      </div>
    );
  }

  if (t === null) {
    return (
      <div className="mt-1 space-y-0.5">
        <p className="text-[10px] font-bold text-green-400">{epLabel} — уже вышла!</p>
        <p className="text-[9px] text-[var(--text3)]">Скоро появится на сайте</p>
      </div>
    );
  }

  // Compact format for small cards
  let timeStr = "";
  if (t.days > 0) timeStr = `через ${t.days}д ${t.hours}ч`;
  else if (t.hours > 0) timeStr = `через ${t.hours}ч ${t.minutes}м`;
  else timeStr = `через ${t.minutes}м ${t.seconds}с`;

  return (
    <div className="mt-1 space-y-0.5">
      <p className="text-[10px] font-bold text-violet-400">{epLabel}</p>
      <p className="text-[9px] text-[var(--text3)] font-mono">{timeStr}</p>
    </div>
  );
}
