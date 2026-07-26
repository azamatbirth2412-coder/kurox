"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, Heart, Trophy, TrendingUp, Zap, Play } from "lucide-react";

export interface TopItem {
  rank: number;
  id: number;
  slug: string;
  title: string;
  poster: string;
  year: number | null;
  genres: string[];
  format: string | null;
  isOngoing: boolean;
  score: number | null;
  favorites: number;
}

type TabKey = "rating" | "popular" | "ongoing";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "rating",  label: "По рейтингу",    icon: Trophy },
  { key: "popular", label: "По популярности", icon: TrendingUp },
  { key: "ongoing", label: "Онгоинги",        icon: Zap },
];

// Directional-shadow medal treatment for the top 3 (no neon bloom).
const MEDALS: Record<number, { color: string; ring: string; label: string; medal: string }> = {
  1: { color: "#f5b301", ring: "rgba(245,179,1,.55)",  label: "1 место", medal: "🥇" },
  2: { color: "#c7d0dc", ring: "rgba(199,208,220,.5)", label: "2 место", medal: "🥈" },
  3: { color: "#d08544", ring: "rgba(208,133,68,.5)",  label: "3 место", medal: "🥉" },
};

function scoreColor(r: number): string {
  if (r >= 8) return "text-emerald-300";
  if (r >= 7) return "text-amber-300";
  return "text-orange-300";
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}М`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}к`;
  return String(n);
}

function ScoreBadge({ score, className = "" }: { score: number | null; className?: string }) {
  if (score == null) return null;
  return (
    <span className={`inline-flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-md px-1.5 py-0.5 text-xs font-bold leading-none tabular-nums ring-1 ring-white/10 ${scoreColor(score)} ${className}`}>
      <Star size={11} fill="currentColor" className="shrink-0" /> {score.toFixed(1)}
    </span>
  );
}

function PodiumCard({ item, primary }: { item: TopItem; primary: "score" | "favorites" }) {
  const m = MEDALS[item.rank];
  const first = item.rank === 1;
  return (
    <Link
      href={`/anime/${item.slug}`}
      className="group relative flex flex-col rounded-[var(--radius-lg)] overflow-hidden bg-[var(--surface)] border transition-transform duration-300 hover:-translate-y-1.5"
      style={{
        borderColor: `${m.color}55`,
        boxShadow: `0 18px 40px -18px rgba(0,0,0,.8), 0 0 0 1px ${m.color}22`,
      }}
    >
      {/* Rank ribbon */}
      <div
        className="absolute top-0 left-0 z-20 flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-br-2xl text-sm font-black tabular-nums"
        style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}cc)`, color: "#1a1205" }}
      >
        <span className="text-base leading-none">{m.medal}</span> #{item.rank}
      </div>

      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[var(--surface2)]">
        {item.poster ? (
          <Image
            src={item.poster}
            alt={item.title}
            fill
            sizes="(max-width:640px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--text3)]"><Play size={28} className="opacity-25" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

        {/* Metric */}
        <div className="absolute bottom-2 right-2 z-10">
          {primary === "favorites" ? (
            <span className="inline-flex items-center gap-1 bg-black/65 backdrop-blur-md rounded-md px-1.5 py-0.5 text-xs font-bold leading-none text-pink-300 ring-1 ring-white/10">
              <Heart size={11} fill="currentColor" /> {fmt(item.favorites)}
            </span>
          ) : (
            <ScoreBadge score={item.score} />
          )}
        </div>

        {item.isOngoing && (
          <span className="absolute top-2 right-2 z-10 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/90 text-white">
            ОНГОИНГ
          </span>
        )}
      </div>

      <div className={`p-3 ${first ? "sm:p-4" : ""}`}>
        <h3 className={`font-bold leading-snug line-clamp-2 text-[var(--text)] group-hover:text-[#c4b5fd] transition-colors ${first ? "text-base" : "text-sm"}`}>
          {item.title}
        </h3>
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap text-[11px] text-[var(--text3)] tabular-nums">
          {item.year && <span>{item.year}</span>}
          {item.format && <span>· {item.format}</span>}
        </div>
        {item.genres.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.genres.slice(0, 2).map(g => (
              <span key={g} className="text-[10px] text-[var(--text3)] bg-[var(--surface3)] rounded px-1.5 py-0.5">{g}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

function ListRow({ item, primary }: { item: TopItem; primary: "score" | "favorites" }) {
  return (
    <Link
      href={`/anime/${item.slug}`}
      className="group flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 rounded-xl border border-transparent hover:border-[var(--border)] hover:bg-[var(--surface)] transition-colors"
    >
      {/* Rank */}
      <span className="w-8 sm:w-10 shrink-0 text-center text-lg sm:text-xl font-black tabular-nums text-[var(--text3)] group-hover:text-[var(--accent)] transition-colors">
        {item.rank}
      </span>

      {/* Poster */}
      <div className="relative w-10 sm:w-12 aspect-[2/3] shrink-0 rounded-lg overflow-hidden bg-[var(--surface2)]">
        {item.poster && (
          <Image src={item.poster} alt={item.title} fill sizes="48px" className="object-cover" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold line-clamp-1 text-[var(--text)] group-hover:text-[#c4b5fd] transition-colors">
          {item.title}
        </h3>
        <div className="mt-0.5 flex items-center gap-1.5 flex-wrap text-[11px] text-[var(--text3)]">
          {item.year && <span className="tabular-nums">{item.year}</span>}
          {item.format && <span>· {item.format}</span>}
          {item.genres.slice(0, 2).map(g => (
            <span key={g} className="hidden sm:inline text-[10px] text-[var(--text3)] bg-[var(--surface3)] rounded px-1.5 py-0.5">{g}</span>
          ))}
        </div>
      </div>

      {/* Metric */}
      <div className="shrink-0 flex items-center gap-3">
        {primary === "favorites" ? (
          <span className="inline-flex items-center gap-1 text-sm font-bold text-pink-300 tabular-nums">
            <Heart size={13} fill="currentColor" /> {fmt(item.favorites)}
          </span>
        ) : (
          item.score != null && (
            <span className={`inline-flex items-center gap-1 text-sm font-bold tabular-nums ${scoreColor(item.score)}`}>
              <Star size={13} fill="currentColor" /> {item.score.toFixed(1)}
            </span>
          )
        )}
      </div>
    </Link>
  );
}

export function AnimeLeaderboard({ rating, popular, ongoing }: { rating: TopItem[]; popular: TopItem[]; ongoing: TopItem[] }) {
  const [tab, setTab] = useState<TabKey>("rating");
  const data = tab === "rating" ? rating : tab === "popular" ? popular : ongoing;
  const primary: "score" | "favorites" = tab === "popular" ? "favorites" : "score";

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <div>
      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 mb-6 bg-[var(--surface)] border border-[var(--border)] rounded-full p-1 w-fit">
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                active ? "bg-[var(--accent)] text-white shadow-lg shadow-purple-900/30" : "text-[var(--text2)] hover:text-[var(--text)]"
              }`}
            >
              <t.icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {data.length === 0 ? (
        <div className="py-24 text-center text-[var(--text3)]">
          <Trophy size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Данные временно недоступны</p>
        </div>
      ) : (
        <>
          {/* Podium — top 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 sm:items-end mb-8">
            {top3.map(item => (
              <div
                key={item.id}
                className={
                  item.rank === 1 ? "sm:order-2" : item.rank === 2 ? "sm:order-1" : "sm:order-3 sm:pt-0"
                }
              >
                <PodiumCard item={item} primary={primary} />
              </div>
            ))}
          </div>

          {/* Ranked list — 4+ */}
          {rest.length > 0 && (
            <div className="bg-[var(--surface)]/40 border border-[var(--border)] rounded-[var(--radius-lg)] p-2 sm:p-3 divide-y divide-[var(--border)]/50">
              {rest.map(item => <ListRow key={item.id} item={item} primary={primary} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
