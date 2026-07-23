"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Clock } from "lucide-react";

interface UpcomingItem {
  title: string;
  titleEn: string;
  poster: string;
  releaseDate: Date;
  genre: string;
  studio: string;
  accent: string; // gradient color for fallback
}

const UPCOMING: UpcomingItem[] = [
  {
    title: "Наруто: Новое поколение",
    titleEn: "Boruto: Two Blue Vortex",
    poster: "https://anilibria.top/storage/releases/posters/3996/ZJHHMeMP0624ZTpWmc0j52brIzIY3wFE.webp",
    releaseDate: new Date(2026, 6, 19, 10, 0, 0),
    genre: "Сёнен / Экшен",
    studio: "Pierrot",
    accent: "from-orange-900 to-yellow-900",
  },
  {
    title: "Клинок, рассекающий демонов: Замок бесконечности",
    titleEn: "Demon Slayer: Infinity Castle",
    poster: "https://anilibria.top/storage/releases/posters/10144/2pbOQKX5ALrArnF5icp0oZ66MXTHOntY.webp",
    releaseDate: new Date(2026, 8, 12, 17, 30, 0),
    genre: "Экшен / Фэнтези",
    studio: "ufotable",
    accent: "from-red-900 to-pink-900",
  },
  {
    title: "Магическая битва 3",
    titleEn: "Jujutsu Kaisen Season 3",
    poster: "https://anilibria.top/storage/releases/posters/9470/7eU0f4bdWzlf2CCM3nDxRQW4qtdgI3m5.webp",
    releaseDate: new Date(2026, 9, 5, 9, 0, 0),
    genre: "Экшен / Сверхъестественное",
    studio: "MAPPA",
    accent: "from-blue-900 to-indigo-900",
  },
  {
    title: "Блич: Тысячелетняя кровавая война — Финал",
    titleEn: "Bleach: Thousand-Year Blood War",
    poster: "https://anilibria.top/storage/releases/posters/10229/1EvYQx7lRoYZwt9wGnEHwNbEtLXdsNl1.webp",
    releaseDate: new Date(2026, 9, 15, 14, 0, 0),
    genre: "Экшен / Сёнен",
    studio: "Pierrot",
    accent: "from-slate-800 to-zinc-900",
  },
];

function calcTime(target: Date) {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, past: true };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    past: false,
  };
}

function useCountdown(target: Date) {
  const [time, setTime] = useState<ReturnType<typeof calcTime> | null>(null);
  useEffect(() => {
    setTime(calcTime(target));
    const id = setInterval(() => setTime(calcTime(target)), 1000);
    return () => clearInterval(id);
  }, [target]);
  return time;
}

function CountdownBadge({ date }: { date: Date }) {
  const t = useCountdown(date);
  if (!t) return <span className="text-xs text-[var(--text3)]">—</span>;
  if (t.past) return <span className="text-xs text-green-400 font-bold">Уже вышло!</span>;

  const parts: string[] = [];
  if (t.days > 0) parts.push(`${t.days}д`);
  if (t.hours > 0 || t.days > 0) parts.push(`${t.hours}ч`);
  parts.push(`${String(t.minutes).padStart(2, "0")}м`);

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Clock size={11} className="text-[var(--accent)] flex-shrink-0" />
      <span className="text-[var(--text2)]">
        {t.days > 0 && <span className="text-[var(--accent)] font-bold">{t.days}д </span>}
        <span className="font-mono">{String(t.hours).padStart(2,"0")}:{String(t.minutes).padStart(2,"0")}</span>
      </span>
    </div>
  );
}

function PosterWithFallback({ item }: { item: UpcomingItem }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative aspect-video w-full overflow-hidden">
      {/* Gradient — always visible as base layer */}
      <div className={`absolute inset-0 bg-gradient-to-br ${item.accent}`} />

      {/* Fallback label when no image */}
      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 z-10">
          <span className="text-3xl font-black text-white/20 leading-none select-none">
            {item.title[0]}
          </span>
          <span className="text-[10px] text-white/30 font-medium uppercase tracking-widest">
            {item.studio}
          </span>
        </div>
      )}

      {/* Actual poster — hides if 404 */}
      {!failed && (
        <Image
          src={item.poster}
          alt={item.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          onError={() => setFailed(true)}
          unoptimized
        />
      )}

      {/* Bottom gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--surface)] z-20" />

      {/* СКОРО badge */}
      <div className="absolute top-2 left-2 z-30 bg-[var(--accent)] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
        СКОРО
      </div>
    </div>
  );
}

export function UpcomingAnime() {
  // Hide releases that already aired — otherwise they show a "СКОРО" badge
  // alongside "Уже вышло!" forever. Computed after mount to avoid a hydration
  // mismatch right around the release moment.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); }, []);

  const items = now === null
    ? UPCOMING
    : UPCOMING.filter(item => item.releaseDate.getTime() > now);

  if (now !== null && items.length === 0) {
    return (
      <p className="text-sm text-[var(--text3)] py-4">
        Все анонсированные релизы уже вышли — смотрите их в каталоге!
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.titleEn}
          className="group relative bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--accent)]/40 transition-[border-color,box-shadow] duration-200 hover:shadow-lg hover:shadow-purple-900/20 flex flex-col">
          <PosterWithFallback item={item} />

          <div className="p-3 flex flex-col flex-1">
            <div className="flex-1">
              <p className="font-bold text-sm leading-snug line-clamp-2">{item.title}</p>
              <p className="text-[11px] text-[var(--text3)] mt-0.5">{item.titleEn}</p>
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-[var(--text2)] bg-[var(--surface2)] px-2 py-0.5 rounded-full">{item.studio}</span>
              <span className="text-[10px] text-[var(--text3)]">
                {item.releaseDate.toLocaleDateString("ru", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>

            <div className="pt-2 mt-2 border-t border-[var(--border)]">
              <CountdownBadge date={item.releaseDate} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
