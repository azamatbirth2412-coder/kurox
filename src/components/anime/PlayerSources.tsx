"use client";

import { useState } from "react";
import { EpisodePlayer } from "./EpisodePlayer";
import { KodikPlayer } from "./KodikPlayer";

interface Episode {
  id: string;
  ordinal: number;
  name: string | null;
  hls_480: string | null;
  hls_720: string | null;
  hls_1080: string | null;
  sort_order: number;
  opening?: { start: number | null; stop: number | null } | null;
}

interface Props {
  animeId: number;
  episodes: Episode[];
  title: string;
  titleEn?: string;
  poster?: string;
  slug?: string;
}

type Source = "anilibria" | "kodik";

const SOURCES: { id: Source; label: string }[] = [
  { id: "anilibria", label: "Anilibria" },
  { id: "kodik",     label: "Kodik" },
];

export function PlayerSources({ animeId, episodes, title, titleEn, poster, slug }: Props) {
  const [source, setSource] = useState<Source>("anilibria");

  return (
    <div>
      {/* Source tabs */}
      <div className="flex items-center gap-1 mb-3">
        <span className="text-xs text-[var(--text3)] mr-1">Источник:</span>
        {SOURCES.map(s => (
          <button
            key={s.id}
            onClick={() => setSource(s.id)}
            className={[
              "px-3 py-1 rounded-lg text-xs font-semibold transition-all",
              source === s.id
                ? "bg-[var(--accent)] text-white shadow-sm shadow-[var(--accent)]/30"
                : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text2)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)]",
            ].join(" ")}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Player */}
      {source === "anilibria" && (
        <EpisodePlayer
          animeId={animeId}
          episodes={episodes}
          title={title}
          poster={poster}
          slug={slug}
        />
      )}
      {source === "kodik" && (
        <KodikPlayer title={title} titleEn={titleEn} />
      )}
    </div>
  );
}
