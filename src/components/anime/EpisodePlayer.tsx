"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  ChevronLeft, ChevronRight, Loader2, AlertCircle, Settings, SkipForward, Zap, Download
} from "lucide-react";

function useUserXp() {
  const [data, setData] = useState<{ xp: number; level: number } | null>(null);
  useEffect(() => {
    fetch("/api/me/stats").then(r => r.ok ? r.json() : null).then(d => { if (d?.xp != null) setData(d); }).catch(() => {});
  }, []);
  return data;
}

const fmtXp = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}к` : String(n);

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
  poster?: string;
  slug?: string;
}

const CDN = "https://anilibria.top";
type Quality    = "hls_1080" | "hls_720" | "hls_480";
type QualityOpt = Quality | "auto";

function proxyUrl(path: string | null): string | null {
  if (!path) return null;
  const abs = path.startsWith("http") ? path : CDN + path;
  return `/api/proxy/hls?url=${encodeURIComponent(abs)}`;
}

function DownloadMenu({ ep, show, onToggle, onDownload, downloading }: {
  ep: Episode;
  show: boolean;
  onToggle: () => void;
  onDownload: (q: Quality) => void;
  downloading: boolean;
}) {
  const qualities = (["hls_1080", "hls_720", "hls_480"] as Quality[]).filter(q => ep[q]);
  return (
    <div className="relative">
      <button
        onClick={e => { e.stopPropagation(); if (!downloading) onToggle(); }}
        title="Скачать эпизод"
        className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md hover:bg-white/10 transition-colors ${downloading ? "text-violet-400 animate-pulse cursor-default" : "text-white/60 hover:text-white"}`}
      >
        <Download size={14} />
      </button>
      {show && !downloading && (
        <div
          className="absolute bottom-10 right-0 bg-[#13131f] border border-white/10 rounded-xl shadow-2xl z-50 w-[190px] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 pt-3 pb-2 border-b border-white/8">
            <p className="text-white text-xs font-semibold">Скачать серию {ep.ordinal}</p>
            <p className="text-white/35 text-[10px] mt-0.5">Выбери качество</p>
          </div>
          <div className="p-2 space-y-1">
            {qualities.map(q => (
              <button
                key={q}
                onClick={() => { onDownload(q); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-violet-600/20 hover:text-white transition-colors"
              >
                <Download size={13} className="text-violet-400 flex-shrink-0" />
                {q.replace("hls_", "")}p
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function masterUrl(ep: Episode | null): string | null {
  if (!ep) return null;
  const p = new URLSearchParams();
  const abs = (s: string | null) => s ? (s.startsWith("http") ? s : CDN + s) : null;
  const u480 = abs(ep.hls_480); if (u480) p.set("hls_480", u480);
  const u720 = abs(ep.hls_720); if (u720) p.set("hls_720", u720);
  const u1080 = abs(ep.hls_1080); if (u1080) p.set("hls_1080", u1080);
  if (!p.toString()) return null;
  return `/api/proxy/master?${p.toString()}`;
}

function fmt(sec: number): string {
  if (!sec || isNaN(sec)) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export function EpisodePlayer({ animeId, episodes, title, poster, slug }: Props) {
  const userXp = useUserXp();
  const sorted = [...episodes].sort((a, b) => a.sort_order - b.sort_order);
  const [currentEp, setCurrentEp] = useState(sorted[0]);
  const [quality, setQuality] = useState<QualityOpt>("auto");
  const [autoLevel, setAutoLevel] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("loading");
  const [watchedEps, setWatchedEps] = useState<Set<string>>(new Set());

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [dlProgress, setDlProgress] = useState<{ quality: string; done: number; total: number } | null>(null);
  const [dlReady, setDlReady] = useState<{ href: string; name: string } | null>(null);
  const [dlError, setDlError] = useState<string | null>(null);
  const [buffered, setBuffered] = useState(0);
  const [introSkipped, setIntroSkipped] = useState(false);
  const [visible, setVisible] = useState(false);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const epRowRef    = useRef<HTMLDivElement>(null);
  const hlsRef      = useRef<Hls | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeTimeRef = useRef<number>(0);
  const touchStartX  = useRef<number>(0);

  const currentIdx = sorted.findIndex(e => e.id === currentEp?.id);
  const prevEp = currentIdx > 0 ? sorted[currentIdx - 1] : null;
  const nextEp = currentIdx < sorted.length - 1 ? sorted[currentIdx + 1] : null;

  const WATCHED_KEY = `kurox_watched_${animeId}`;

  useEffect(() => {
    try {
      const saved: string[] = JSON.parse(localStorage.getItem(WATCHED_KEY) || "[]");
      setWatchedEps(new Set(saved));
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animeId]);

  function markWatched(ep: Episode) {
    setWatchedEps(prev => {
      if (prev.has(ep.id)) return prev;
      const next = new Set(prev);
      next.add(ep.id);
      try { localStorage.setItem(WATCHED_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
    // Persist to DB so history survives browser cache clears and device changes
    fetch("/api/watch-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        animeId: String(animeId),
        episodeNum: ep.ordinal,
        title,
        poster: poster || null,
        slug: slug || null,
        timestampSeconds: 0,
      }),
    }).catch(() => {});
  }

  function getBestUrl(ep: Episode, q: Quality) {
    return proxyUrl(ep[q] ?? ep.hls_1080 ?? ep.hls_720 ?? ep.hls_480);
  }

  function directCdnUrl(path: string | null): string | null {
    if (!path) return null;
    return path.startsWith("http") ? path : CDN + path;
  }

  async function downloadEpisode(ep: Episode, q: Quality) {
    const rawPath = ep[q];
    if (!rawPath) return;
    const absUrl = rawPath.startsWith("http") ? rawPath : CDN + rawPath;
    const qualityLabel = q.replace("hls_", "") + "p";

    setShowDownload(false);
    setDlError(null);
    setDlReady(null);
    setDlProgress({ quality: qualityLabel, done: 0, total: 0 });

    try {
      // 1. Fetch the m3u8 manifest through proxy (proxy rewrites segment URLs)
      const manifestRes = await fetch(`/api/proxy/hls?url=${encodeURIComponent(absUrl)}`);
      if (!manifestRes.ok) throw new Error(`Ошибка манифеста: ${manifestRes.status}`);
      const manifest = await manifestRes.text();

      // 2. Parse .ts segment URLs from manifest
      // The proxy may return absolute CDN URLs or proxied URLs for segments
      const baseUrl = absUrl.substring(0, absUrl.lastIndexOf("/") + 1);
      const segments = manifest
        .split("\n")
        .map(l => l.trim())
        .filter(l => l && !l.startsWith("#"))
        .map(l => {
          if (l.startsWith("http")) return l;
          if (l.startsWith("/api/")) return l; // already proxied
          return baseUrl + l;
        });

      if (segments.length === 0) throw new Error("Сегменты не найдены");

      setDlProgress({ quality: qualityLabel, done: 0, total: segments.length });

      // 3. Download segments in order (sequential for stability)
      // Use Blob array — much more memory-efficient than a single Uint8Array
      const blobs: Blob[] = new Array(segments.length);
      let done = 0;
      const BATCH = 4;

      for (let i = 0; i < segments.length; i += BATCH) {
        await Promise.all(
          segments.slice(i, i + BATCH).map(async (seg, j) => {
            // Route through proxy to avoid CORS issues with direct CDN
            const proxyTarget = seg.startsWith("/api/")
              ? seg
              : `/api/proxy/hls?url=${encodeURIComponent(seg)}`;
            const r = await fetch(proxyTarget);
            if (!r.ok) throw new Error(`Сегмент ${i + j}: HTTP ${r.status}`);
            const buf = await r.arrayBuffer();
            blobs[i + j] = new Blob([buf], { type: "video/mp2t" });
            done++;
            setDlProgress({ quality: qualityLabel, done, total: segments.length });
          })
        );
      }

      // 4. Combine all segment blobs (efficient — no Uint8Array copy needed)
      const combined = new Blob(blobs, { type: "video/mp2t" });
      const href = URL.createObjectURL(combined);
      const safeName = title.replace(/[\\/:*?"<>|]/g, "").trim().slice(0, 60);
      const name = `${safeName} - Серия ${ep.ordinal} [${qualityLabel}].ts`;

      setDlProgress(null);
      setDlReady({ href, name });
      setTimeout(() => { URL.revokeObjectURL(href); setDlReady(null); }, 10 * 60_000);
    } catch (err) {
      console.error("Download failed:", err);
      setDlError(err instanceof Error ? err.message : "Ошибка скачивания");
      setDlProgress(null);
    }
  }

  function killHls(video: HTMLVideoElement) {
    if (hlsRef.current) {
      try { hlsRef.current.stopLoad(); hlsRef.current.detachMedia(); hlsRef.current.destroy(); } catch {}
      hlsRef.current = null;
    }
    video.pause();
    video.removeAttribute("src");
    video.load();
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const check = () => setVisible(el.getClientRects().length > 0);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const url = quality === "auto"
      ? masterUrl(currentEp)
      : (currentEp ? getBestUrl(currentEp, quality) : null);
    if (!video || !url) return;
    if (!visible) { killHls(video); return; }

    setStatus("loading");
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setIntroSkipped(false);
    setAutoLevel("");
    killHls(video);

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: quality === "auto" ? 60 : 30,
        maxMaxBufferLength: quality === "auto" ? 120 : 60,
        startLevel: -1,           // auto-select best quality for bandwidth
        enableWorker: true,
        lowLatencyMode: false,
        startFragPrefetch: true,
        maxBufferHole: 0.5,
        abrEwmaDefaultEstimate: 5_000_000, // assume 5 Mbps initially → starts at 1080p
        abrMaxWithRealBitrate: true,
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (resumeTimeRef.current > 0) { video.currentTime = resumeTimeRef.current; resumeTimeRef.current = 0; }
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const lvl = hls.levels[data.level];
        if (lvl?.height) setAutoLevel(`${lvl.height}p`);
      });
      hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) setStatus("error"); });
      return () => { killHls(video); };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.play().catch(() => {});
      return () => { killHls(video); };
    } else {
      setStatus("error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEp, quality, visible]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay        = () => { setPlaying(true); setStatus("ready"); };
    const onPause       = () => setPlaying(false);
    const onWaiting     = () => { if (!video.paused) setStatus("loading"); };
    const onCanPlay     = () => setStatus("ready");
    const onTimeUpdate  = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) setBuffered(video.buffered.end(video.buffered.length - 1));
      if (currentEp && video.duration > 0 && video.currentTime / video.duration > 0.85) markWatched(currentEp);
    };
    const onDuration    = () => setDuration(video.duration);
    const onVolumeChange = () => { setVolume(video.volume); setMuted(video.muted); };
    const onEnded       = () => { setPlaying(false); if (currentEp) markWatched(currentEp); if (nextEp) selectEp(nextEp); };
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDuration);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDuration);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("ended", onEnded);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextEp]);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const video = videoRef.current;
      const tag = (e.target as HTMLElement).tagName;
      if (!video || tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;
      if (video.getClientRects().length === 0) return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      if (e.code === "ArrowLeft")  { e.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 5); }
      if (e.code === "ArrowRight") { e.preventDefault(); video.currentTime = Math.min(video.duration, video.currentTime + 5); }
      if (e.code === "KeyM") toggleMute();
      if (e.code === "KeyF") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (!videoRef.current?.paused) setShowControls(false);
    }, 3000);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.paused ? video.play().catch(() => {}) : video.pause();
    resetControlsTimer();
  }, [resetControlsTimer]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) video.muted = !video.muted;
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    document.fullscreenElement ? document.exitFullscreen() : containerRef.current.requestFullscreen();
  }, []);

  const seek = useCallback((clientX: number, rect: DOMRect) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * duration;
  }, [duration]);

  function selectEp(ep: Episode) {
    if (videoRef.current) killHls(videoRef.current);
    setCurrentEp(ep);
    setStatus("loading");
    setTimeout(() => {
      const el = epRowRef.current?.querySelector(`[data-ep="${ep.id}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }, 50);
  }

  if (!sorted.length) return (
    <div className="aspect-video rounded-xl bg-[var(--surface)] flex flex-col items-center justify-center gap-3 text-[var(--text2)]">
      <Play size={40} className="opacity-20" />
      <p className="text-sm">Эпизоды недоступны</p>
    </div>
  );

  const qualities = (["hls_1080", "hls_720", "hls_480"] as Quality[]).filter(q => currentEp?.[q]);
  const progressPct = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;
  // Use API opening timestamps if available; fall back to 0–90s for new anime
  const apiStart = currentEp?.opening?.start ?? null;
  const apiStop  = currentEp?.opening?.stop  ?? null;
  const FALLBACK_OP_END = 90; // seconds — typical anime opening length
  const opStart = apiStart !== null ? apiStart : (duration > FALLBACK_OP_END ? 0 : null);
  const opStop  = apiStop  !== null ? apiStop  : (duration > FALLBACK_OP_END ? FALLBACK_OP_END : null);
  const showIntroBtn = !introSkipped && status === "ready" && opStart !== null && opStop !== null
    && currentTime >= opStart && currentTime < opStop;

  return (
    <div className="space-y-0">

      {/* ── Source bar ── */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text2)]">
          <span className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
          {sorted.length} эп.
        </div>
        {userXp != null && (
          <div className="flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm">
            <Zap size={13} className="text-yellow-400 flex-shrink-0" />
            <span className="font-bold text-white">{fmtXp(userXp.xp)}</span>
            <span className="text-[var(--text3)]">XP · Ур.{userXp.level}</span>
          </div>
        )}
      </div>

      {/* ── Episode buttons ── */}
      {sorted.length > 1 && (
        <div ref={epRowRef} className="flex gap-1.5 flex-wrap mb-3 max-h-[108px] overflow-y-auto">
          {sorted.map(ep => {
            const active  = currentEp?.id === ep.id;
            const watched = !active && watchedEps.has(ep.id);
            return (
              <button
                key={ep.id}
                data-ep={ep.id}
                onClick={() => selectEp(ep)}
                title={ep.name || `Серия ${ep.ordinal}`}
                className={`relative w-10 h-10 rounded-lg text-sm font-bold transition-all flex-shrink-0 ${
                  active
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40"
                    : watched
                    ? "bg-[var(--surface2)] text-[var(--text3)] opacity-60 hover:opacity-90"
                    : "bg-[var(--surface2)] text-[var(--text2)] hover:bg-violet-600/20 hover:text-violet-300"
                }`}
              >
                {ep.ordinal}
                {watched && !active && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-zinc-500 rounded-full border border-[var(--bg)]" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Player ── */}
      <div
        ref={containerRef}
        className="relative aspect-video w-full rounded-xl overflow-hidden bg-black select-none"
        onMouseMove={resetControlsTimer}
        onMouseLeave={() => { if (playing) setShowControls(false); }}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; resetControlsTimer(); }}
        onTouchEnd={(e) => {
          const video = videoRef.current;
          if (!video || !duration) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(dx) < 30) return;
          e.preventDefault();
          const secs = Math.min(90, Math.round(Math.abs(dx) / 40) * 5);
          video.currentTime = dx > 0
            ? Math.min(duration, video.currentTime + secs)
            : Math.max(0, video.currentTime - secs);
          resetControlsTimer();
        }}
        style={{ cursor: showControls ? "default" : "none" }}
      >
        <video ref={videoRef} playsInline className="w-full h-full" />

        {/* Spinner */}
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Loader2 size={44} className="text-violet-400 animate-spin drop-shadow-lg" />
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 pointer-events-none">
            <AlertCircle size={40} className="text-red-400" />
            <p className="text-white font-semibold">Видео недоступно</p>
          </div>
        )}

        {/* Пропустить опенинг */}
        {showIntroBtn && (
          <div className="absolute bottom-16 right-4 z-30">
            <button
              data-skip-intro
              onClick={e => {
                e.stopPropagation();
                const video = videoRef.current;
                if (video) video.currentTime = Math.min(video.duration, opStop!);
                setIntroSkipped(true);
              }}
              className="flex items-center gap-1.5 bg-black/75 backdrop-blur-sm border border-white/25 hover:bg-black/90 hover:border-white/50 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-all active:scale-95"
            >
              <SkipForward size={13} />
              Пропустить опенинг
            </button>
          </div>
        )}

        {/* Big play icon when paused */}
        {!playing && status === "ready" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <Play size={30} className="text-white fill-white ml-1" />
            </div>
          </div>
        )}

        {/* Controls overlay */}
        <div
          className={`absolute inset-0 flex flex-col transition-opacity duration-200 ${showControls || !playing ? "opacity-100" : "opacity-0"}`}
          onClick={e => e.stopPropagation()}
        >
          {/* Top gradient */}
          <div className="px-3 pt-3 pb-10 bg-gradient-to-b from-black/70 to-transparent flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate drop-shadow">{title}</p>
              <p className="text-white/60 text-xs mt-0.5">
                Серия {currentEp?.ordinal}{currentEp?.name ? ` — ${currentEp.name}` : ""}
              </p>
            </div>

            {/* Prev / Next episode в шапке */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {prevEp && (
                <button data-prev-ep onClick={() => selectEp(prevEp)}
                  className="w-7 h-7 flex items-center justify-center text-white/60 hover:text-white transition-colors rounded-md hover:bg-white/10">
                  <ChevronLeft size={16} />
                </button>
              )}
              {nextEp && (
                <button data-next-ep onClick={() => selectEp(nextEp)}
                  className="w-7 h-7 flex items-center justify-center text-white/60 hover:text-white transition-colors rounded-md hover:bg-white/10">
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" onClick={() => { togglePlay(); setShowDownload(false); setShowSettings(false); }} style={{ cursor: "pointer" }} />

          {/* Bottom controls */}
          <div className="px-3 pb-3 pt-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
            {/* Progress bar */}
            <div
              className="relative h-1 hover:h-[5px] bg-white/25 rounded-full mb-3 cursor-pointer transition-all duration-100 group"
              onClick={e => seek(e.clientX, e.currentTarget.getBoundingClientRect())}
            >
              <div className="absolute inset-y-0 left-0 bg-white/20 rounded-full" style={{ width: `${bufferedPct}%` }} />
              <div className="absolute inset-y-0 left-0 bg-violet-500 rounded-full" style={{ width: `${progressPct}%` }} />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 -translate-x-1/2 transition-opacity"
                style={{ left: `${progressPct}%` }}
              />
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-1.5">
              {/* Play/Pause */}
              <button onClick={togglePlay}
                className="w-8 h-8 flex items-center justify-center text-white hover:text-violet-300 transition-colors">
                {playing
                  ? <Pause size={20} fill="currentColor" />
                  : <Play  size={20} fill="currentColor" className="ml-0.5" />
                }
              </button>

              {/* Volume */}
              <button onClick={toggleMute}
                className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>

              <input
                type="range" min={0} max={1} step={0.05}
                value={muted ? 0 : volume}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0; }
                }}
                onClick={e => e.stopPropagation()}
                className="w-16 sm:w-20 accent-violet-500 cursor-pointer"
              />

              {/* Time */}
              <span className="text-white/55 text-xs tabular-nums ml-1 flex-shrink-0">
                {fmt(currentTime)} / {fmt(duration)}
              </span>

              <div className="flex-1" />

              {/* Download */}
              {currentEp && (currentEp.hls_480 || currentEp.hls_720 || currentEp.hls_1080) && (
                <DownloadMenu
                  ep={currentEp}
                  show={showDownload}
                  onToggle={() => { setShowDownload(s => !s); setShowSettings(false); }}
                  onDownload={(q) => downloadEpisode(currentEp, q)}
                  downloading={!!dlProgress}
                />
              )}

              {/* Quality / Settings */}
              <div className="relative">
                <button
                  onClick={() => { setShowSettings(s => !s); setShowDownload(false); }}
                  className="flex items-center gap-1 text-white/60 hover:text-white text-xs font-medium px-2 py-1 rounded-md hover:bg-white/10 transition-colors"
                >
                  {quality === "auto"
                    ? (autoLevel ? `${autoLevel}` : "Авто")
                    : `${quality.replace("hls_", "")}p`}
                  <Settings size={12} />
                </button>
                {showSettings && (
                  <div className="absolute bottom-9 right-0 bg-[#18182a]/97 backdrop-blur-xl border border-white/10 rounded-xl p-2.5 min-w-[130px] shadow-2xl z-50">
                    <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1.5 px-1">Качество</p>
                    {/* Auto (ABR) */}
                    <button onClick={() => {
                      if (videoRef.current && quality !== "auto") resumeTimeRef.current = videoRef.current.currentTime;
                      setQuality("auto"); setShowSettings(false);
                    }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                        quality === "auto" ? "bg-violet-600 text-white" : "text-white/65 hover:bg-white/10 hover:text-white"
                      }`}>
                      {quality === "auto" && <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />}
                      <span>Авто</span>
                      {quality === "auto" && autoLevel && (
                        <span className="ml-auto text-white/60 text-xs">{autoLevel}</span>
                      )}
                    </button>
                    {/* Manual quality levels */}
                    {qualities.map(q => (
                      <button key={q} onClick={() => {
                        if (videoRef.current && q !== quality) resumeTimeRef.current = videoRef.current.currentTime;
                        setQuality(q); setShowSettings(false);
                      }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                          quality === q ? "bg-violet-600 text-white" : "text-white/65 hover:bg-white/10 hover:text-white"
                        }`}>
                        {quality === q && <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />}
                        {q.replace("hls_", "")}p
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen */}
              <button onClick={toggleFullscreen}
                className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white transition-colors ml-1">
                {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Download progress */}
      {dlProgress && (
        <div className="mt-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[var(--text2)]">
              Скачивание {dlProgress.quality}…
            </span>
            <span className="text-xs text-violet-400 font-medium tabular-nums">
              {dlProgress.total > 0
                ? `${Math.round((dlProgress.done / dlProgress.total) * 100)}%`
                : "Загрузка…"}
            </span>
          </div>
          <div className="h-1.5 bg-[var(--surface2)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full transition-all duration-200"
              style={{ width: dlProgress.total > 0 ? `${(dlProgress.done / dlProgress.total) * 100}%` : "5%" }}
            />
          </div>
          {dlProgress.total > 0 && (
            <p className="text-[10px] text-[var(--text3)] mt-1">
              {dlProgress.done} / {dlProgress.total} сегментов
            </p>
          )}
        </div>
      )}

      {/* Save button — appears after download completes */}
      {dlReady && (
        <div className="mt-2 bg-[var(--surface)] border border-green-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
            <Download size={15} className="text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-green-400">Файл готов!</p>
            <p className="text-[10px] text-[var(--text3)] truncate mt-0.5">{dlReady.name}</p>
          </div>
          <a
            href={dlReady.href}
            download={dlReady.name}
            onClick={() => setDlReady(null)}
            className="flex-shrink-0 flex items-center gap-1.5 bg-green-500 hover:bg-green-400 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            <Download size={13} />
            Сохранить
          </a>
        </div>
      )}

      {/* Download error */}
      {dlError && (
        <div className="mt-2 bg-[var(--surface)] border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
          <p className="flex-1 text-xs text-red-400">{dlError}</p>
          <button
            onClick={() => setDlError(null)}
            className="text-[10px] text-[var(--text3)] hover:text-white transition-colors px-2 py-1 rounded"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
