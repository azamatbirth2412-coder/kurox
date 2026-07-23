import { NextRequest, NextResponse } from "next/server";

const BASE = "https://anime365.ru/api";
const PREFERRED = ["AniLibria", "SHIZA Project", "Dream Cast", "FumoDub", "StudioBand", "AniDUB", "AniBaza"];

interface Anime365Series {
  id: number;
  isHentai: number;
  titles: { ru?: string; en?: string; romaji?: string };
  episodes: { id: number; episodeInt: string; episodeType: string }[];
}

interface Anime365Translation {
  id: number;
  authorsSummary: string;
  typeKind: string;
  typeLang: string;
  embedUrl: string;
}

// --- GET /api/anime/smotret?title=...&titleEn=...
// Returns available studios and episode list
//
// --- GET /api/anime/smotret?episodeId=...&studio=...
// Returns embedUrl for a specific episode + studio
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const episodeId = searchParams.get("episodeId");
  const studio = searchParams.get("studio");

  // Mode 2: get embed URL for specific episode + studio
  if (episodeId && studio) {
    try {
      const res = await fetch(`${BASE}/episodes/${episodeId}`, {
        next: { revalidate: 3600 },
        headers: { "User-Agent": "kurox/1.0" },
      });
      if (!res.ok) return NextResponse.json({ embedUrl: null });
      const data = await res.json();
      const trans: Anime365Translation[] = data.data?.translations ?? [];
      const ruDubs = trans.filter(t => t.typeKind === "voice" && t.typeLang === "ru");
      // Fuzzy match studio name
      const match = ruDubs.find(t =>
        t.authorsSummary.toLowerCase().includes(studio.toLowerCase()) ||
        studio.toLowerCase().includes(t.authorsSummary.split(" ")[0].toLowerCase())
      );
      return NextResponse.json({ embedUrl: match?.embedUrl ?? null });
    } catch {
      return NextResponse.json({ embedUrl: null });
    }
  }

  // Mode 1: search series, return studios + episode list
  const title = searchParams.get("title");
  const titleEn = searchParams.get("titleEn") ?? "";
  if (!title) return NextResponse.json({ found: false });

  const queries = [title, titleEn].filter(Boolean);

  for (const q of queries) {
    try {
      const res = await fetch(
        `${BASE}/series?query=${encodeURIComponent(q)}&limit=5`,
        { next: { revalidate: 3600 }, headers: { "User-Agent": "kurox/1.0" } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const list: Anime365Series[] = data.data ?? [];
      const series = list.find(s => !s.isHentai);
      if (!series) continue;

      const tvEps = series.episodes
        .filter(e => e.episodeType === "tv")
        .sort((a, b) => parseFloat(a.episodeInt) - parseFloat(b.episodeInt));

      if (!tvEps.length) continue;

      // Fetch ep1 translations to discover available studios
      const ep1Res = await fetch(`${BASE}/episodes/${tvEps[0].id}`, {
        next: { revalidate: 3600 },
        headers: { "User-Agent": "kurox/1.0" },
      });
      if (!ep1Res.ok) continue;
      const ep1Data = await ep1Res.json();
      const trans: Anime365Translation[] = ep1Data.data?.translations ?? [];
      const ruDubs = trans.filter(t => t.typeKind === "voice" && t.typeLang === "ru");

      if (!ruDubs.length) continue;

      // Sort studios: preferred first
      const studios = ruDubs
        .map(t => t.authorsSummary)
        .sort((a, b) => {
          const ai = PREFERRED.findIndex(p => a.includes(p) || p.includes(a.split(" ")[0]));
          const bi = PREFERRED.findIndex(p => b.includes(p) || p.includes(b.split(" ")[0]));
          if (ai === -1 && bi === -1) return 0;
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });

      const episodes = tvEps.map(e => ({
        id: e.id,
        number: Math.round(parseFloat(e.episodeInt)),
      }));

      return NextResponse.json({ found: true, studios, episodes });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ found: false });
}
