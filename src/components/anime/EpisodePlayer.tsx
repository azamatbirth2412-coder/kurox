"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  ChevronLeft, ChevronRight, Loader2, AlertCircle, Settings, SkipForward, Zap,
  RotateCcw, Check
} from "lucide-react";

function useUserXp() {
  const [data, setData] = useState<{ xp: number; level: number } | null>(null);
  useEffect(() => {
    fetch("/api/user/stats").then(r => r.ok ? r.json() : null).then(d => { if (d?.xp != null) setData(d); }).catch(() => {});
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

/** "auto" = let ABR choose; a number = pin that rendition height. */
type QualityPref = "auto" | number;

const LS_QUALITY = "kurox_player_quality";
const LS_VOLUME  = "kurox_player_volume";
const LS_MUTED   = "kurox_player_muted";
const LS_BW      = "kurox_player_bw";

// Fallback for the very first play on a device, before any real throughput has
// been measured. Deliberately optimistic: the master playlist declares 1080p at
// 6 Mbps peak / 3 Mbps average, so 8 Mbps starts everyone at 1080p, and hls.js
// abandons an over-ambitious first fragment within a second or two if the line
// can't keep up. Every later session uses the measured estimate below instead.
const DEFAULT_BW_ESTIMATE = 8_000_000;

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch {}
}
function lsDel(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

function proxyUrl(path: string | null): string | null {
  if (!path) return null;
  const abs = path.startsWith("http") ? path : CDN + path;
  return `/api/proxy/hls?url=${encodeURIComponent(abs)}`;
}

/** Rendition heights this episode actually has, best first. */
function episodeHeights(ep: Episode | null): number[] {
  if (!ep) return [];
  const out: number[] = [];
  if (ep.hls_1080) out.push(1080);
  if (ep.hls_720)  out.push(720);
  if (ep.hls_480)  out.push(480);
  return out;
}

/** Single-rendition playlist — only used on players without MSE (iOS Safari). */
function renditionUrl(ep: Episode | null, height: number): string | null {
  if (!ep) return null;
  if (height === 1080) return proxyUrl(ep.hls_1080);
  if (height === 720)  return proxyUrl(ep.hls_720);
  if (height === 480)  return proxyUrl(ep.hls_480);
  return null;
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

// ── Quality switching ───────────────────────────────────────────────────────
// hls.currentLevel is an in-place switch: same manifest, same session, same
// position. The old code tore the whole player down and re-seeked, which
// restarted the episode whenever the seek landed before the first fragment.
function applyQualityToHls(hls: Hls, pref: QualityPref) {
  if (!hls.levels.length) return;
  if (pref === "auto") { hls.currentLevel = -1; return; }
  const idx = hls.levels.findIndex(l => l.height === pref);
  hls.currentLevel = idx >= 0 ? idx : -1;
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
  const [quality, setQuality] = useState<QualityPref>("auto");
  const [heights, setHeights] = useState<number[]>(() => episodeHeights(sorted[0]));
  const [activeHeight, setActiveHeight] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [watchedEps, setWatchedEps] = useState<Set<string>>(new Set());

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [introSkipped, setIntroSkipped] = useState(false);
  const [visible, setVisible] = useState(false);

  const videoRef     = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const epRowRef     = useRef<HTMLDivElement>(null);
  const barRef       = useRef<HTMLDivElement>(null);
  const hlsRef       = useRef<Hls | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeTimeRef = useRef<number>(0);
  const touchStartX  = useRef<number>(0);
  // Episodes already persisted to the DB this session — prevents the timeupdate
  // handler (fires several times a second) from re-POSTing /api/watch-history.
  const persistedRef = useRef<Set<string>>(new Set());
  // Always reflects the latest currentEp — prevents stale closures in video event handlers
  const currentEpRef = useRef(currentEp);
  // Latest quality preference, for handlers created once per source load
  const qualityRef   = useRef<QualityPref>(quality);
  // True when playback runs on the browser's own HLS engine (no hls.js)
  const nativeRef    = useRef(false);
  // Throttle for localStorage position writes (no network involved)
  const lastPosSaveRef = useRef(0);
  // Recovery attempt counters, reset once playback is healthy again
  const netRetryRef   = useRef(0);
  const mediaRetryRef = useRef(0);
  // Pointer is over / keyboard focus is inside the player — gates the extra
  // shortcuts that would otherwise hijack page-level keys such as arrow-up.
  const engagedRef   = useRef(false);

  // Keep refs in sync so event handlers always see the latest values
  currentEpRef.current = currentEp;
  qualityRef.current = quality;

  const currentIdx = sorted.findIndex(e => e.id === currentEp?.id);
  const prevEp = currentIdx > 0 ? sorted[currentIdx - 1] : null;
  const nextEp = currentIdx < sorted.length - 1 ? sorted[currentIdx + 1] : null;

  const WATCHED_KEY = `kurox_watched_${animeId}`;
  const posKey = useCallback((epId: string) => `kurox_pos_${animeId}_${epId}`, [animeId]);

  // ── Persisted playback position (per episode, localStorage only) ───────────
  const readPos = useCallback((epId: string): number => {
    const raw = lsGet(posKey(epId));
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [posKey]);

  const savePos = useCallback((epId: string, t: number, d: number) => {
    // Don't bookmark the first half-minute or the credits — resuming there is
    // more annoying than starting over.
    if (!d || t < 30 || t > d - 60) lsDel(posKey(epId));
    else lsSet(posKey(epId), String(Math.floor(t)));
  }, [posKey]);

  // ── Restore stored preferences (client-only, after hydration) ──────────────
  // localStorage cannot be read during render without desyncing the server
  // markup, so the preferences land one commit after mount. That is the whole
  // point of this effect, hence the rule opt-out.
  useEffect(() => {
    const q = lsGet(LS_QUALITY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (q === "auto") setQuality("auto");
    else if (q) {
      const h = parseInt(q, 10);
      if (Number.isFinite(h)) setQuality(h);
    }
    try {
      const saved: string[] = JSON.parse(localStorage.getItem(WATCHED_KEY) || "[]");
      setWatchedEps(new Set(saved));
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animeId]);

  function markWatched(ep: Episode, atSeconds = 0) {
    // Run once per episode per mount. onTimeUpdate fires ~4×/sec, so without this
    // guard the last 15% of every episode would fire dozens of identical
    // /api/watch-history POSTs (each doing several DB queries).
    if (persistedRef.current.has(ep.id)) return;
    persistedRef.current.add(ep.id);

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
        timestampSeconds: Math.floor(atSeconds) || 0,
      }),
    }).catch(() => {});
  }

  function killHls(video: HTMLVideoElement) {
    if (hlsRef.current) {
      try {
        // Carry the measured throughput into the next session so the very first
        // fragment is requested at the right rendition instead of guessing.
        const bw = hlsRef.current.bandwidthEstimate;
        if (Number.isFinite(bw) && bw > 200_000) {
          lsSet(LS_BW, String(Math.round(Math.min(bw, 60_000_000))));
        }
      } catch {}
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

  // ── Source loading ────────────────────────────────────────────────────────
  // Note the deps: quality is NOT one of them. A quality change is a level
  // switch on the already-loaded stream (see the effect below), so the manifest
  // is never re-fetched and the playback position is never lost.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentEp) return;
    if (!visible) { killHls(video); return; }

    const master = masterUrl(currentEp);
    const epHeights = episodeHeights(currentEp);
    // This effect owns the media element: attaching a source and resetting the
    // transport state are one operation, so the status writes belong here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!master || !epHeights.length) { setStatus("error"); setErrorMsg("Нет доступных источников"); return; }

    setStatus("loading");
    setErrorMsg(null);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setIntroSkipped(false);
    setActiveHeight(null);
    setHeights(epHeights);
    netRetryRef.current = 0;
    mediaRetryRef.current = 0;
    killHls(video);

    // Resume: an explicit request (retry button) wins over the stored bookmark.
    const startAt = resumeTimeRef.current > 0 ? resumeTimeRef.current : readPos(currentEp.id);
    resumeTimeRef.current = 0;

    // Restore the remembered volume before the first frame so nobody gets
    // blasted at 100% because the element defaulted there.
    const savedVol = parseFloat(lsGet(LS_VOLUME) ?? "");
    if (Number.isFinite(savedVol) && savedVol >= 0 && savedVol <= 1) video.volume = savedVol;
    video.muted = lsGet(LS_MUTED) === "1";

    if (Hls.isSupported()) {
      nativeRef.current = false;
      const savedBw = parseInt(lsGet(LS_BW) ?? "", 10);
      const hls = new Hls({
        // Buffer generously — this is VOD, and a deep buffer is what lets ABR
        // hold the top rendition through a dip instead of stepping down.
        maxBufferLength: 60,
        maxMaxBufferLength: 240,
        maxBufferSize: 120 * 1000 * 1000,
        backBufferLength: 90,
        maxBufferHole: 0.5,
        startPosition: startAt > 0 ? startAt : -1,
        startLevel: -1,
        // hls.js's bandwidth probe loads the FIRST fragment at the lowest level.
        // With ~10 s segments that means every episode opened at 480p for its
        // first ten seconds. We seed a real estimate instead, so the probe is
        // dead weight.
        testBandwidth: false,
        abrEwmaDefaultEstimate:
          Number.isFinite(savedBw) && savedBw > 200_000 ? savedBw : DEFAULT_BW_ESTIMATE,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.75,
        // Takes max(declared, measured) — it can only ever make a rendition look
        // MORE expensive than it is, which is exactly backwards for reaching
        // 1080p. The master playlist now declares measured values anyway.
        abrMaxWithRealBitrate: false,
        // 10 s segments cannot load inside the stock 4 s starvation budget at
        // 1080p, so ABR rejected the top rendition on arithmetic alone.
        maxStarvationDelay: 10,
        enableWorker: true,
        lowLatencyMode: false,
        startFragPrefetch: true,
      });
      hlsRef.current = hls;
      hls.loadSource(master);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const hs = hls.levels
          .map(l => l.height)
          .filter((h): h is number => !!h)
          .sort((a, b) => b - a);
        if (hs.length) setHeights(hs);
        applyQualityToHls(hls, qualityRef.current);
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const lvl = hls.levels[data.level];
        if (lvl?.height) setActiveHeight(lvl.height);
      });
      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        netRetryRef.current = 0;
        mediaRetryRef.current = 0;
      });
      hls.on(Hls.Events.ERROR, (_, d) => {
        if (!d.fatal) return;
        // Two cheap recoveries before surfacing anything to the viewer: a
        // dropped connection and a decoder hiccup are both routine on long HLS
        // streams and both are fixable without losing the buffer.
        if (d.type === Hls.ErrorTypes.NETWORK_ERROR && netRetryRef.current < 3) {
          netRetryRef.current++;
          try { hls.startLoad(); return; } catch {}
        }
        if (d.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRetryRef.current < 2) {
          mediaRetryRef.current++;
          try { hls.recoverMediaError(); return; } catch {}
        }
        setErrorMsg(
          d.type === Hls.ErrorTypes.NETWORK_ERROR
            ? "Не удалось загрузить видео — проверьте соединение"
            : "Ошибка воспроизведения"
        );
        setStatus("error");
      });
      return () => { killHls(video); };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS (iOS Safari): the browser owns ABR. Feed it the master
      // playlist for auto, or a single rendition when the viewer pinned one.
      nativeRef.current = true;
      const pref = qualityRef.current;
      const url = pref === "auto" ? master : (renditionUrl(currentEp, pref) ?? master);
      video.src = url;
      if (startAt > 0) {
        const onMeta = () => {
          video.currentTime = startAt;
          video.removeEventListener("loadedmetadata", onMeta);
        };
        video.addEventListener("loadedmetadata", onMeta);
      }
      video.play().catch(() => {});
      return () => { killHls(video); };
    }

    setStatus("error");
    setErrorMsg("Браузер не поддерживает HLS");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEp, visible, reloadKey]);

  // Apply a quality change to whatever engine is currently playing.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const hls = hlsRef.current;
    if (hls) { applyQualityToHls(hls, quality); return; }

    if (!nativeRef.current || !video.src) return;
    // Native path has no level API — swap the source and restore the position.
    const ep = currentEpRef.current;
    const next = quality === "auto" ? masterUrl(ep) : renditionUrl(ep, quality);
    if (!next || video.src.endsWith(next)) return;
    const at = video.currentTime;
    const wasPlaying = !video.paused;
    video.src = next;
    const onMeta = () => {
      video.currentTime = at;
      if (wasPlaying) video.play().catch(() => {});
      video.removeEventListener("loadedmetadata", onMeta);
    };
    video.addEventListener("loadedmetadata", onMeta);
  }, [quality]);

  const changeQuality = useCallback((pref: QualityPref) => {
    setQuality(pref);
    lsSet(LS_QUALITY, pref === "auto" ? "auto" : String(pref));
    setShowSettings(false);
  }, []);

  const retry = useCallback(() => {
    const video = videoRef.current;
    resumeTimeRef.current = video && video.currentTime > 0 ? video.currentTime : 0;
    setErrorMsg(null);
    setStatus("loading");
    setReloadKey(k => k + 1);
  }, []);

  // ── Video element events ──────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay        = () => { setPlaying(true); setStatus("ready"); };
    const onPause       = () => setPlaying(false);
    const onWaiting     = () => { if (!video.paused) setStatus("loading"); };
    const onCanPlay     = () => setStatus("ready");
    const onPlaying     = () => setStatus("ready");
    const onTimeUpdate  = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) setBuffered(video.buffered.end(video.buffered.length - 1));
      const ep = currentEpRef.current;
      if (!ep) return;
      if (video.duration > 0 && video.currentTime / video.duration > 0.85) {
        markWatched(ep, video.currentTime);
      }
      // localStorage bookmark, at most once every 5 s. No network call here —
      // the DB write stays behind the persistedRef guard above.
      const now = Date.now();
      if (now - lastPosSaveRef.current > 5000) {
        lastPosSaveRef.current = now;
        savePos(ep.id, video.currentTime, video.duration);
      }
    };
    const onDuration    = () => setDuration(video.duration);
    const onVolumeChange = () => {
      setVolume(video.volume);
      setMuted(video.muted);
      lsSet(LS_VOLUME, String(video.volume));
      lsSet(LS_MUTED, video.muted ? "1" : "0");
    };
    const onEnded       = () => {
      setPlaying(false);
      const ep = currentEpRef.current;
      if (ep) { markWatched(ep, video.duration); lsDel(posKey(ep.id)); }
      if (nextEp) selectEp(nextEp);
    };
    video.addEventListener("play", onPlay);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDuration);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDuration);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("ended", onEnded);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextEp, savePos, posKey]);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); };
  }, []);

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
    if (video.paused) video.play().catch(() => {});
    else video.pause();
    resetControlsTimer();
  }, [resetControlsTimer]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) video.muted = !video.muted;
  }, []);

  const nudgeVolume = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = Math.max(0, Math.min(1, video.volume + delta));
    if (video.volume > 0) video.muted = false;
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current.requestFullscreen().catch(() => {});
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    video.currentTime = Math.max(0, Math.min(video.duration, seconds));
    setCurrentTime(video.currentTime);
  }, []);

  const seekBy = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    seekTo(video.currentTime + delta);
    resetControlsTimer();
  }, [seekTo, resetControlsTimer]);

  const seekFromPointer = useCallback((clientX: number) => {
    const bar = barRef.current;
    const video = videoRef.current;
    if (!bar || !video || !video.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    seekTo(ratio * video.duration);
  }, [seekTo]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const video = videoRef.current;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (!video || tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      if (video.getClientRects().length === 0) return;

      // Always-on shortcuts (the player is the only thing on the page that
      // wants these keys while a video is on screen).
      switch (e.code) {
        case "Space":
        case "KeyK":
          e.preventDefault(); togglePlay(); return;
        case "ArrowLeft":
          e.preventDefault(); seekBy(-5); return;
        case "ArrowRight":
          e.preventDefault(); seekBy(5); return;
        case "KeyM":
          e.preventDefault(); toggleMute(); resetControlsTimer(); return;
        case "KeyF":
          e.preventDefault(); toggleFullscreen(); return;
        case "Escape":
          if (showSettings) { setShowSettings(false); }
          return;
      }

      // Shortcuts that would fight the page (scrolling, browser find) only fire
      // while the pointer is over the player or focus is inside it.
      if (!engagedRef.current) return;
      switch (e.code) {
        case "KeyJ": e.preventDefault(); seekBy(-10); break;
        case "KeyL": e.preventDefault(); seekBy(10); break;
        case "ArrowUp":   e.preventDefault(); nudgeVolume(0.05); resetControlsTimer(); break;
        case "ArrowDown": e.preventDefault(); nudgeVolume(-0.05); resetControlsTimer(); break;
        case "Home": e.preventDefault(); seekTo(0); break;
        case "End":  e.preventDefault(); if (video.duration) seekTo(video.duration - 1); break;
        default: {
          const m = /^Digit([0-9])$/.exec(e.code);
          if (m && video.duration) {
            e.preventDefault();
            seekTo((parseInt(m[1], 10) / 10) * video.duration);
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, toggleMute, toggleFullscreen, seekBy, seekTo, nudgeVolume, resetControlsTimer, showSettings]);

  // Close the settings popover on any click outside it
  useEffect(() => {
    if (!showSettings) return;
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest("[data-settings-menu]") && !el.closest("[data-settings-toggle]")) {
        setShowSettings(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [showSettings]);

  function selectEp(ep: Episode) {
    const video = videoRef.current;
    // Bookmark where we're leaving off before tearing the stream down
    if (video && currentEpRef.current && video.duration) {
      savePos(currentEpRef.current.id, video.currentTime, video.duration);
    }
    if (video) killHls(video);
    setCurrentEp(ep);
    setStatus("loading");
    setErrorMsg(null);
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

  const qualityLabel = quality === "auto"
    ? (activeHeight ? `Авто · ${activeHeight}p` : "Авто")
    : `${quality}p`;

  const btn = "inline-flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-[color,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

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
                aria-current={active ? "true" : undefined}
                className={`relative w-10 h-10 rounded-lg text-sm font-bold flex-shrink-0 transition-[background-color,color,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                  active
                    ? "bg-violet-600 text-white shadow-[0_4px_12px_-4px_rgba(124,58,237,0.7)]"
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
        className="relative aspect-video w-full rounded-xl overflow-hidden bg-black select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        tabIndex={-1}
        onMouseMove={resetControlsTimer}
        onPointerEnter={() => { engagedRef.current = true; }}
        onPointerLeave={() => { engagedRef.current = false; }}
        onFocusCapture={() => { engagedRef.current = true; setShowControls(true); }}
        onBlurCapture={e => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) engagedRef.current = false;
        }}
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
          seekBy(dx > 0 ? secs : -secs);
        }}
        style={{ cursor: showControls ? "default" : "none" }}
      >
        {/* No `poster` attribute on purpose: Anilibria art is 2:3 portrait and
            letterboxes badly inside a 16:9 frame. The loading state below is
            the startup affordance. */}
        <video ref={videoRef} playsInline preload="auto" className="w-full h-full" />

        {/* Loading */}
        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 pointer-events-none">
            <Loader2 size={40} className="text-violet-400 animate-spin motion-reduce:animate-none" />
            <p className="text-white/70 text-xs font-medium">Загрузка…</p>
          </div>
        )}

        {/* Error + retry */}
        {status === "error" && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black/85 px-6 text-center">
            <AlertCircle size={38} className="text-red-400" />
            <p className="text-white font-semibold">Видео недоступно</p>
            {errorMsg && <p className="text-white/55 text-xs max-w-xs">{errorMsg}</p>}
            <button
              onClick={e => { e.stopPropagation(); retry(); }}
              className="mt-1 inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
            >
              <RotateCcw size={15} />
              Повторить
            </button>
          </div>
        )}

        {/* Пропустить опенинг */}
        {showIntroBtn && (
          <div className="absolute bottom-20 right-4 z-30">
            <button
              data-skip-intro
              onClick={e => {
                e.stopPropagation();
                if (opStop !== null) seekTo(opStop);
                setIntroSkipped(true);
              }}
              className="flex items-center gap-1.5 h-10 bg-black/75 backdrop-blur-sm border border-white/25 hover:bg-black/90 hover:border-white/50 text-white text-xs font-semibold px-4 rounded-lg transition-[background-color,border-color] duration-150 active:scale-95 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
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
          className={`absolute inset-0 flex flex-col transition-opacity duration-200 ${
            showControls || !playing || showSettings ? "opacity-100" : "opacity-0 focus-within:opacity-100"
          }`}
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
                <button data-prev-ep onClick={() => selectEp(prevEp)} aria-label="Предыдущая серия"
                  className={`${btn} w-10 h-10`}>
                  <ChevronLeft size={18} />
                </button>
              )}
              {nextEp && (
                <button data-next-ep onClick={() => selectEp(nextEp)} aria-label="Следующая серия"
                  className={`${btn} w-10 h-10`}>
                  <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" onClick={() => { togglePlay(); setShowSettings(false); }} style={{ cursor: "pointer" }} />

          {/* Bottom controls */}
          <div className="px-3 pb-3 pt-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
            {/* Progress bar — click, drag, and keyboard */}
            <div
              ref={barRef}
              role="slider"
              tabIndex={0}
              aria-label="Позиция воспроизведения"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration) || 0}
              aria-valuenow={Math.round(currentTime)}
              aria-valuetext={`${fmt(currentTime)} из ${fmt(duration)}`}
              className="relative h-1.5 hover:h-2 bg-white/25 rounded-full mb-3 cursor-pointer transition-[height] duration-150 group/bar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              onPointerDown={e => {
                e.currentTarget.setPointerCapture(e.pointerId);
                seekFromPointer(e.clientX);
              }}
              onPointerMove={e => {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) seekFromPointer(e.clientX);
              }}
              onPointerUp={e => {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
              }}
              onKeyDown={e => {
                if (e.key === "ArrowLeft")  { e.preventDefault(); seekBy(-5); }
                if (e.key === "ArrowRight") { e.preventDefault(); seekBy(5); }
                if (e.key === "Home")       { e.preventDefault(); seekTo(0); }
                if (e.key === "End" && duration) { e.preventDefault(); seekTo(duration - 1); }
              }}
            >
              <div className="absolute inset-y-0 left-0 bg-white/20 rounded-full" style={{ width: `${bufferedPct}%` }} />
              <div className="absolute inset-y-0 left-0 bg-violet-500 rounded-full" style={{ width: `${progressPct}%` }} />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.5)] opacity-0 group-hover/bar:opacity-100 group-focus-visible/bar:opacity-100 -translate-x-1/2 transition-opacity duration-150"
                style={{ left: `${progressPct}%` }}
              />
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-0.5">
              {/* Play/Pause */}
              <button onClick={togglePlay} aria-label={playing ? "Пауза" : "Воспроизвести"}
                className={`${btn} w-10 h-10 text-white`}>
                {playing
                  ? <Pause size={20} fill="currentColor" />
                  : <Play  size={20} fill="currentColor" className="ml-0.5" />
                }
              </button>

              {/* Volume */}
              <button onClick={toggleMute} aria-label={muted || volume === 0 ? "Включить звук" : "Выключить звук"}
                className={`${btn} w-10 h-10`}>
                {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              <input
                type="range" min={0} max={1} step={0.05}
                value={muted ? 0 : volume}
                aria-label="Громкость"
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0; }
                }}
                onClick={e => e.stopPropagation()}
                className="w-16 sm:w-20 h-10 accent-violet-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded"
              />

              {/* Time */}
              <span className="text-white/60 text-xs tabular-nums ml-1.5 flex-shrink-0">
                {fmt(currentTime)} / {fmt(duration)}
              </span>

              <div className="flex-1" />

              {/* Quality / Settings */}
              <div className="relative">
                <button
                  data-settings-toggle
                  onClick={() => setShowSettings(s => !s)}
                  aria-haspopup="menu"
                  aria-expanded={showSettings}
                  aria-label={`Качество: ${qualityLabel}`}
                  className={`${btn} h-10 gap-1.5 px-2.5 text-xs font-medium tabular-nums`}
                >
                  {qualityLabel}
                  <Settings size={13} />
                </button>
                {showSettings && (
                  <div
                    data-settings-menu
                    role="menu"
                    className="absolute bottom-12 right-0 bg-[#18182a]/97 backdrop-blur-xl border border-white/10 rounded-xl p-2 min-w-[168px] shadow-[0_12px_28px_-8px_rgba(0,0,0,0.85)] z-50"
                  >
                    <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1.5 px-2">Качество</p>
                    {/* Auto (ABR) */}
                    <button
                      role="menuitemradio"
                      aria-checked={quality === "auto"}
                      onClick={() => changeQuality("auto")}
                      className={`w-full flex items-center gap-2 h-10 px-2.5 rounded-lg text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                        quality === "auto" ? "bg-violet-600 text-white" : "text-white/65 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Check size={14} className={quality === "auto" ? "opacity-100" : "opacity-0"} />
                      <span>Авто</span>
                      {quality === "auto" && activeHeight && (
                        <span className="ml-auto text-white/70 text-xs tabular-nums">{activeHeight}p</span>
                      )}
                    </button>
                    {/* Manual quality levels — best first */}
                    {heights.map(h => (
                      <button
                        key={h}
                        role="menuitemradio"
                        aria-checked={quality === h}
                        onClick={() => changeQuality(h)}
                        className={`w-full flex items-center gap-2 h-10 px-2.5 rounded-lg text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                          quality === h ? "bg-violet-600 text-white" : "text-white/65 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <Check size={14} className={quality === h ? "opacity-100" : "opacity-0"} />
                        <span className="tabular-nums">{h}p</span>
                        {h === 1080 && (
                          <span className="ml-auto text-[10px] text-white/40 uppercase tracking-wide">HD</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} aria-label={fullscreen ? "Выйти из полноэкранного режима" : "Полный экран"}
                className={`${btn} w-10 h-10`}>
                {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
