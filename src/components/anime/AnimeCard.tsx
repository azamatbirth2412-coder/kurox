import Link from "next/link";
import Image from "next/image";
import { Play, Star } from "lucide-react";

interface AnimeCardProps {
  id: string | number;
  slug: string;
  title: string;           // Russian or English title
  titleOrig?: string;      // Original (romaji/english) — shown secondary
  poster?: string | null;
  year?: number | null;
  format?: string;
  status?: string;
  rating?: number | null;
  episodes?: number | null;
  episodesAired?: number | null;
  genres?: string[];
  isNew?: boolean;         // "NEW" badge
  color?: string | null;
}

export function AnimeCard({
  id, slug, title, titleOrig, poster, year, format,
  status, rating, episodes, episodesAired, genres, isNew,
}: AnimeCardProps) {
  const href = `/anime/${slug}`;
  const formatLabel = format ?? null;
  const isOngoing = status === "RELEASING";
  const epText = episodes
    ? isOngoing && episodesAired
      ? `${episodesAired}/${episodes} эп.`
      : `${episodes} эп.`
    : null;

  return (
    <Link href={href} className="group flex flex-col card-hover h-full">
      {/* Poster */}
      <div className="relative aspect-[2/3] rounded-[var(--radius)] overflow-hidden bg-[var(--surface2)] flex-shrink-0">
        {poster ? (
          <Image
            src={poster}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            sizes="(max-width:640px) 50vw,(max-width:1024px) 33vw,200px"
            loading="lazy"
            style={{ outline: "1px solid rgba(255,255,255,0.07)", outlineOffset: "-1px" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--text3)]">
            <Play size={28} className="opacity-25" />
          </div>
        )}

        {/* Dark gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-[transform,opacity] duration-300 ease-out scale-75 group-hover:scale-100">
          <div className="w-14 h-14 rounded-full bg-violet-600/80 backdrop-blur-md border-2 border-violet-400/60 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.7)]">
            <Play size={22} className="text-white fill-white ml-1" />
          </div>
        </div>

        {/* TOP-LEFT: Rating */}
        {rating !== null && rating !== undefined && rating > 0 && (
          <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-black/65 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-[11px] font-bold text-[#fcd34d]">
            <Star size={9} fill="currentColor" /> {rating.toFixed(1)}
          </div>
        )}

        {/* TOP-RIGHT badges */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          {isNew && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-tight bg-rose-500/90 text-white shadow-[0_0_8px_rgba(244,63,94,0.6)]">
              НОВОЕ
            </span>
          )}
          {isOngoing && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-tight bg-emerald-500/90 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]">
              ОНГОИНГ
            </span>
          )}
          {formatLabel && (
            <span className="bg-black/70 backdrop-blur-sm text-white/70 text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-tight">
              {formatLabel}
            </span>
          )}
        </div>

        {/* BOTTOM: episodes on hover */}
        {epText && (
          <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md">
              {epText}
            </span>
          </div>
        )}
      </div>

      {/* Info — flex-1 fills remaining card height so mt-auto pins genres to bottom */}
      <div className="pt-2.5 pb-1 px-0.5 flex flex-col flex-1 min-w-0">
        <h3 className="text-sm font-bold line-clamp-2 leading-snug text-[var(--text)] group-hover:text-[var(--accent)] transition-colors duration-200" style={{ textWrap: "pretty" } as React.CSSProperties}>
          {title}
        </h3>
        <div className="mt-auto pt-1.5 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {year && <span className="text-[11px] text-[var(--text3)] tabular-nums">{year}</span>}
            {epText && <span className="text-[11px] text-[var(--text3)] tabular-nums">· {epText}</span>}
          </div>
          {genres && genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {genres.slice(0, 2).map(g => (
                <span key={g} className="text-[10px] text-[var(--text3)] bg-[var(--surface3)] rounded px-1.5 py-0.5">
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
