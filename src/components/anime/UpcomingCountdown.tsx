"use client";
import { useState, useEffect } from "react";

export function UpcomingCountdown({ date }: { date: string }) {
  const target = new Date(date).getTime();

  // null = date already passed; undefined = not calculated yet (SSR / first paint)
  const calc = () => {
    const diff = target - Date.now();
    if (diff <= 0) return null;
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  };

  const [t, setT] = useState<ReturnType<typeof calc> | undefined>(undefined);

  useEffect(() => {
    setT(calc());
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // Not hydrated yet — show neutral placeholder, NOT "already released"
  if (t === undefined) return <span className="text-xs text-[var(--text3)]">—</span>;
  if (t === null) return <span className="text-xs text-green-400 font-bold">Уже вышло!</span>;

  return (
    <div className="flex items-center gap-1">
      {[
        { v: t.days, label: "д" },
        { v: t.hours, label: "ч" },
        { v: t.minutes, label: "м" },
        { v: t.seconds, label: "с" },
      ].map(({ v, label }) => (
        <div key={label} className="flex flex-col items-center">
          <div className="bg-[var(--accent)]/20 border border-[var(--accent)]/30 text-[var(--accent)] font-black text-xs w-8 h-7 flex items-center justify-center rounded-lg font-mono">
            {String(v).padStart(2, "0")}
          </div>
          <span className="text-[8px] text-[var(--text3)] mt-0.5">{label}</span>
        </div>
      ))}
    </div>
  );
}
