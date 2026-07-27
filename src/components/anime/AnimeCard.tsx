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
  votes?: number | null;   // engagement count paired with the rating
  episodes?: number | null;
  episodesAired?: number | null;
  genres?: string[];
  isNew?: boolean;         // "NEW" badge
  color?: string | null;
}

// Score → colour, the way Shikimori / AniList / animeon signal quality at a glance.
function ratingColor(r: number): string {
  if (r >= 8) return "text-emerald-300";
  if (r >= 7) return "text-amber-300";
  if (r >= 6) return "text-orange-300";
  return "text-[var(--text2)]";
}

// Compact vote count: 842 → "842", 4 195 → "4.2K", 15 029 → "15K", 1.2M → "1.2M".
function formatVotes(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  if (n < 1_000_000) return Math.round(n / 1000) + "K";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
}

export function AnimeCard({
  id, slug, title, titleOrig, poster, year, format,
  status, rating, votes, episodes, episodesAired, genres, isNew,
}: AnimeCardProps) {
  const href = `/anime/${slug}`;
  const formatLabel = format ?? null;
  const isOngoing = status === "RELEASING";
  const hasRating = typeof rating === "number" && rating > 0;
  const hasVotes = typeof votes === "number" && votes > 0;
  const epText = episodes
    ? isOngoing && episodesAired
      ? `${episodesAired}/${episodes} эп.`
      : `${episodes} эп.`
    : null;

  // ONE status badge, never two. Callers derive `isNew` from the same
  // is_ongoing flag that produces RELEASING, so every airing title used to
  // wear "НОВОЕ" and "ОНГОИНГ" stacked on top of each other — two chips
  // saying one thing, over a poster only ~110px wide on a phone.
  const statusBadge = isOngoing
    ? { label: "ОНГОИНГ", tone: "bg-emerald-500/90 ring-emerald-300/30" }
    : isNew
      ? { label: "НОВОЕ", tone: "bg-rose-500/90 ring-rose-300/30" }
      : null;

  // Format is metadata, not status — it belongs with year and episode count,
  // not floating over the artwork. Moving it off the poster also ends the
  // collision between a long vote count and the format chip on narrow cards.
  const meta = [
    year ? String(year) : null,
    formatLabel,
    epText,
  ].filter(Boolean) as string[];

  const genreLine = genres?.length ? genres.slice(0, 2).join(" · ") : null;

  return (
    <Link href={href} className="group flex flex-col card-hover h-full">
      {/* Poster */}
      <div className="card-poster relative aspect-[2/3] rounded-[var(--radius)] overflow-hidden bg-[var(--surface2)] flex-shrink-0">
        {poster ? (
          <Image
            src={poster}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            sizes="(max-width:640px) 33vw,(max-width:768px) 25vw,(max-width:1024px) 20vw,200px"
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

        {/* Play button — optical nudge (ml-0.5) centres the triangle in the disc */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-[transform,opacity] duration-300 ease-out scale-90 group-hover:scale-100">
          <div className="w-14 h-14 rounded-full bg-violet-600/90 backdrop-blur-md ring-1 ring-white/25 flex items-center justify-center shadow-[0_10px_22px_-8px_rgba(0,0,0,.85)]">
            <Play size={22} className="text-white fill-white ml-0.5" />
          </div>
        </div>

        {/* TOP-LEFT: Rating — colour-coded by score, tabular so digits never jump.
            Vote count trails the score as a muted secondary signal (like animeon's "8.6 · 175 522"). */}
        {hasRating && (
          <div className={`absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-md rounded-md pl-1 pr-1.5 py-0.5 text-[11px] font-bold leading-none tabular-nums ring-1 ring-white/10 ${ratingColor(rating!)}`}>
            <Star size={10} fill="currentColor" className="shrink-0" /> {rating!.toFixed(1)}
            {hasVotes && (
              <span className="pl-0.5 font-semibold text-white/50">· {formatVotes(votes!)}</span>
            )}
          </div>
        )}

        {/* TOP-RIGHT: a single status chip. Hairline ring for definition instead
            of the coloured bloom the project bans. */}
        {statusBadge && (
          <span className={`absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-tight text-white ring-1 ring-inset shadow-[0_2px_6px_-2px_rgba(0,0,0,.8)] ${statusBadge.tone}`}>
            {statusBadge.label}
          </span>
        )}
      </div>

      {/* Info — flex-1 fills remaining card height so mt-auto pins meta to bottom */}
      <div className="pt-2.5 pb-1 px-0.5 flex flex-col flex-1 min-w-0">
        <h3 className="text-sm font-bold line-clamp-2 leading-snug text-[var(--text)] group-hover:text-[#c4b5fd] transition-colors duration-200" style={{ textWrap: "pretty" } as React.CSSProperties}>
          {title}
        </h3>
        {/* Two quiet lines instead of a line of text plus a row of chip boxes.
            At 10px inside a padded box the genre chips were barely legible and
            wrapped to two rows on phones, leaving neighbouring cards ragged. */}
        <div className="mt-auto pt-1.5 space-y-0.5 text-[11px] leading-tight text-[var(--text3)]">
          {meta.length > 0 && (
            <p className="tabular-nums truncate">{meta.join(" · ")}</p>
          )}
          {genreLine && <p className="truncate">{genreLine}</p>}
        </div>
      </div>
    </Link>
  );
}
