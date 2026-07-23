"use client";
import { useState, useRef, useEffect } from "react";
import { Search, Loader2, Play, AlertCircle, ExternalLink } from "lucide-react";
import Hls from "hls.js";

interface VideoLink  { quality: number; url: string }
interface EpSource   { dub: string; videos: VideoLink[] }
interface ExtEpisode {
  num: number;
  name: string;
  lazy?: boolean;
  // AnimeVost — videos already in episode list
  videos?: VideoLink[];
  // lazy sources loaded on demand
  sources?: EpSource[];
}
interface SearchResult {
  source: string;
  id: string;
  title: string;
  thumbnail: string;
  year?: string;
  genres?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  animevost: "AnimeVost",
  animego:   "AnimeGo",
  sameband:  "SameBand",
};
const SOURCE_COLORS: Record<string, string> = {
  animevost: "#3b82f6",
  animego:   "#8b5cf6",
  sameband:  "#10b981",
};

interface Props { title: string; titleEn?: string; sourceFilter?: string }

export function ExternalSources({ title, sourceFilter }: Props) {
  const [query, setQuery]           = useState(title);
  const [searching, setSearching]   = useState(false);
  const [results, setResults]       = useState<SearchResult[]>([]);
  const [searched, setSearched]     = useState(false);

  const [selected, setSelected]     = useState<SearchResult | null>(null);
  const [episodes, setEpisodes]     = useState<ExtEpisode[]>([]);
  const [loadingEps, setLoadingEps] = useState(false);

  const [currentEp, setCurrentEp]   = useState<ExtEpisode | null>(null);
  const [loadingVid, setLoadingVid] = useState(false);
  const [activeDub, setActiveDub]   = useState<string>("");
  const [quality, setQuality]       = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef   = useRef<Hls | null>(null);

  useEffect(() => { doSearch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Active video URL
  const activeVideos: VideoLink[] = (() => {
    if (!currentEp) return [];
    if (currentEp.videos?.length) return currentEp.videos;
    const src = currentEp.sources?.find(s => s.dub === activeDub) ?? currentEp.sources?.[0];
    return src?.videos ?? [];
  })();
  const videoUrl = activeVideos[quality]?.url ?? null;

  // Load video into player when URL changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    video.pause(); video.removeAttribute("src"); video.load();
    if (!videoUrl) return;

    if ((videoUrl.endsWith(".m3u8") || videoUrl.includes(".m3u8")) && Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 30 });
      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
    } else {
      video.src = videoUrl;
      video.play().catch(() => {});
    }
    return () => { hlsRef.current?.destroy(); };
  }, [videoUrl]);

  async function doSearch() {
    if (!query.trim()) return;
    setSearching(true); setSearched(false);
    setResults([]); setSelected(null); setEpisodes([]); setCurrentEp(null);
    try {
      const params = new URLSearchParams({ action: "search", query: query.trim() });
      if (sourceFilter) params.set("source", sourceFilter);
      const data = await fetch(`/api/anime/sources?${params}`).then(r => r.json());
      const list: SearchResult[] = data.results ?? [];
      setResults(list);
      if (list.length === 1) void selectResult(list[0]);
    } catch { /* silent */ }
    setSearching(false); setSearched(true);
  }

  async function selectResult(r: SearchResult) {
    setSelected(r); setEpisodes([]); setCurrentEp(null); setActiveDub(""); setQuality(0);
    setLoadingEps(true);
    try {
      const data = await fetch(
        `/api/anime/sources?action=episodes&source=${r.source}&id=${encodeURIComponent(r.id)}`
      ).then(res => res.json());
      const eps: ExtEpisode[] = data.episodes ?? [];
      setEpisodes(eps);
      if (eps.length > 0) void playEp(eps[0], r);
    } catch { /* silent */ }
    setLoadingEps(false);
  }

  async function playEp(ep: ExtEpisode, result?: SearchResult) {
    const src = result ?? selected;
    setCurrentEp(ep); setQuality(0); setActiveDub(""); setLoadingVid(false);

    // AnimeVost — videos already present, nothing to load
    if (ep.videos?.length) return;

    // Lazy: fetch video for this episode
    if (!src) return;
    setLoadingVid(true);
    try {
      const data = await fetch(
        `/api/anime/sources?action=video&source=${src.source}&id=${encodeURIComponent(src.id)}&ep=${ep.num}`
      ).then(r => r.json());
      const sources: EpSource[] = data.sources ?? [];
      if (sources.length) {
        setCurrentEp(prev => prev?.num === ep.num ? { ...prev, sources } : prev);
        setActiveDub(sources[0]?.dub ?? "");
      }
    } catch { /* silent */ }
    setLoadingVid(false);
  }

  const dubs = currentEp?.sources ?? [];

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex gap-2">
        <input value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && doSearch()}
          placeholder="Название аниме…"
          className="flex-1 bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-white placeholder-[var(--text3)] outline-none focus:border-violet-500 transition-colors"/>
        <button onClick={doSearch} disabled={searching}
          className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 rounded-xl text-sm font-semibold text-white transition-colors">
          {searching ? <Loader2 size={14} className="animate-spin"/> : <Search size={14}/>}
          Найти
        </button>
      </div>

      {/* Results */}
      {searched && !selected && (
        results.length === 0
          ? <div className="flex items-center gap-2 text-sm text-[var(--text3)] py-2">
              <AlertCircle size={14}/> Не найдено. Попробуй другое написание.
            </div>
          : <div className="space-y-1 max-h-64 overflow-y-auto">
              {results.map((r, i) => (
                <button key={i} onClick={() => selectResult(r)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-[var(--surface2)] hover:bg-[var(--surface3)] border border-[var(--border)] transition-colors text-left">
                  {r.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.thumbnail} alt="" className="w-10 h-14 object-cover rounded-lg flex-shrink-0"/>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{r.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{background:`${SOURCE_COLORS[r.source]}20`,color:SOURCE_COLORS[r.source]}}>
                        {SOURCE_LABELS[r.source] ?? r.source}
                      </span>
                      {r.year && <span className="text-[10px] text-[var(--text3)]">{r.year}</span>}
                    </div>
                  </div>
                  <Play size={12} className="text-[var(--text3)] flex-shrink-0"/>
                </button>
              ))}
            </div>
      )}

      {/* Player */}
      {selected && (
        <div className="space-y-2">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => { setSelected(null); setEpisodes([]); setCurrentEp(null); }}
              className="text-xs text-[var(--text3)] hover:text-white underline transition-colors">← Назад</button>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{background:`${SOURCE_COLORS[selected.source]}20`,color:SOURCE_COLORS[selected.source]}}>
              {SOURCE_LABELS[selected.source] ?? selected.source}
            </span>
            <span className="text-xs text-[var(--text2)] truncate flex-1">{selected.title}</span>
          </div>

          {loadingEps && (
            <div className="flex items-center gap-2 text-sm text-[var(--text3)] py-2">
              <Loader2 size={14} className="animate-spin"/> Загружаем список серий…
            </div>
          )}

          {/* Episodes */}
          {episodes.length > 1 && (
            <div className="flex gap-1.5 flex-wrap max-h-[100px] overflow-y-auto">
              {episodes.map(ep => (
                <button key={ep.num} onClick={() => playEp(ep)}
                  className={`w-10 h-10 rounded-lg text-sm font-bold transition-all flex-shrink-0 ${
                    currentEp?.num === ep.num
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40"
                      : "bg-[var(--surface2)] text-[var(--text2)] hover:bg-violet-600/20 hover:text-violet-300"
                  }`}>
                  {ep.num}
                </button>
              ))}
            </div>
          )}

          {currentEp && (
            <div className="space-y-2">
              {/* Loading video */}
              {loadingVid && (
                <div className="flex items-center gap-2 text-sm text-[var(--text3)] py-1">
                  <Loader2 size={13} className="animate-spin"/> Получаем видео…
                </div>
              )}

              {/* Dub switcher */}
              {!loadingVid && dubs.length > 1 && (
                <div className="flex gap-1.5 flex-wrap">
                  {dubs.map(s => (
                    <button key={s.dub} onClick={() => { setActiveDub(s.dub); setQuality(0); }}
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                        activeDub === s.dub
                          ? "bg-violet-600 text-white"
                          : "bg-[var(--surface2)] text-[var(--text3)] hover:text-white"
                      }`}>
                      {s.dub}
                    </button>
                  ))}
                </div>
              )}

              {/* Quality switcher */}
              {!loadingVid && activeVideos.length > 1 && (
                <div className="flex gap-1.5">
                  {activeVideos.map((v, i) => (
                    <button key={i} onClick={() => setQuality(i)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                        quality === i
                          ? "bg-violet-600 text-white"
                          : "bg-[var(--surface2)] text-[var(--text3)] hover:text-white"
                      }`}>
                      {v.quality}p
                    </button>
                  ))}
                </div>
              )}

              {/* Video player */}
              {videoUrl && !loadingVid
                ? <div className="aspect-video rounded-xl overflow-hidden bg-black">
                    <video ref={videoRef} className="w-full h-full" controls playsInline/>
                  </div>
                : !loadingVid && !loadingEps && (
                    <div className="aspect-video rounded-xl bg-[var(--surface)] flex flex-col items-center justify-center gap-2 text-[var(--text3)]">
                      <AlertCircle size={28} className="opacity-40"/>
                      <p className="text-sm">Видео недоступно</p>
                    </div>
                  )
              }

              <div className="flex justify-end">
                <a href={selected.id.startsWith("http") ? selected.id : "#"}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-[var(--text3)] hover:text-white transition-colors">
                  <ExternalLink size={10}/> Открыть на {SOURCE_LABELS[selected.source]}
                </a>
              </div>
            </div>
          )}

          {!loadingEps && episodes.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-[var(--text3)] py-2">
              <AlertCircle size={14}/> Серии не найдены.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
