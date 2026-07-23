"use client";
import { useEffect, useRef } from "react";

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusables(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

function center(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function spatialNav(dir: 'up' | 'down' | 'left' | 'right') {
  const cur = document.activeElement as HTMLElement | null;
  if (!cur || cur === document.body) { getFocusables()[0]?.focus({ preventScroll: true }); return; }

  const { x: cx, y: cy } = center(cur);
  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const el of getFocusables()) {
    if (el === cur) continue;
    const { x: ex, y: ey } = center(el);
    const dx = ex - cx, dy = ey - cy;
    const inDir = dir === 'up' ? dy < -5 : dir === 'down' ? dy > 5 : dir === 'left' ? dx < -5 : dx > 5;
    if (!inDir) continue;
    const primary   = (dir === 'up' || dir === 'down') ? Math.abs(dy) : Math.abs(dx);
    const secondary = (dir === 'up' || dir === 'down') ? Math.abs(dx) : Math.abs(dy);
    const score = primary + secondary * 3;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (best) {
    best.focus({ preventScroll: true });
    best.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }
}

function getVideo(): HTMLVideoElement | null {
  return document.querySelector<HTMLVideoElement>('video');
}

export function TVMode() {
  const rafRef    = useRef<number>(0);
  const prevBtn   = useRef<boolean[]>([]);
  const axisLock  = useRef([false, false, false, false]); // up/down/left/right

  useEffect(() => {
    const root = document.documentElement;

    // TV detection via user-agent
    if (/SmartTV|WebOS|Tizen|SMART-TV|HbbTV|googletv|crkey|AppleTV|FireTV/i.test(navigator.userAgent)) {
      root.setAttribute('data-tv', 'true');
    }

    // Show focus rings on keyboard use; hide on mouse move
    const onKeyDown = (e: KeyboardEvent) => {
      root.setAttribute('data-kb', 'true');
      const tag = (document.activeElement as HTMLElement)?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const video = getVideo();
      const videoPlaying = video && !video.paused;

      switch (e.code) {
        case 'ArrowUp':    if (!videoPlaying) { spatialNav('up');    e.preventDefault(); } break;
        case 'ArrowDown':  if (!videoPlaying) { spatialNav('down');  e.preventDefault(); } break;
        case 'ArrowLeft':  if (!videoPlaying) { spatialNav('left');  e.preventDefault(); } break;
        case 'ArrowRight': if (!videoPlaying) { spatialNav('right'); e.preventDefault(); } break;
      }
    };
    const onMouse = () => root.removeAttribute('data-kb');

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousemove', onMouse, { passive: true });

    // Gamepad polling
    const poll = () => {
      const gamepads = navigator.getGamepads?.() ?? [];
      for (const gp of gamepads) {
        if (!gp) continue;
        const btns  = gp.buttons.map(b => b.pressed);
        const prev  = prevBtn.current;
        const ax    = gp.axes;
        const lock  = axisLock.current;

        const just = (i: number) => btns[i] && !prev[i];

        const video       = getVideo();
        const videoPlaying = video && !video.paused;

        if (videoPlaying && video) {
          // ── Player controls ──
          if (just(0))  video.paused ? video.play().catch(() => {}) : video.pause(); // A = play/pause
          if (just(14)) video.currentTime = Math.max(0, video.currentTime - 10);     // ← = -10s
          if (just(15)) video.currentTime = Math.min(video.duration || 0, video.currentTime + 10); // → = +10s
          if (just(12)) video.volume = Math.min(1, video.volume + 0.1);               // ↑ = vol+
          if (just(13)) video.volume = Math.max(0, video.volume - 0.1);               // ↓ = vol-
          if (just(4))  document.querySelector<HTMLElement>('[data-prev-ep]')?.click(); // LB = prev ep
          if (just(5))  document.querySelector<HTMLElement>('[data-next-ep]')?.click(); // RB = next ep
          if (just(3))  document.querySelector<HTMLElement>('[data-skip-intro]')?.click(); // Y = skip intro
          if (just(6))  { if (video) { const v = video.volume; video.muted = v > 0 ? true : false; } } // LT = mute
        } else {
          // ── UI navigation ──
          const axUp    = (ax[1] ?? 0) < -0.5;
          const axDown  = (ax[1] ?? 0) >  0.5;
          const axLeft  = (ax[0] ?? 0) < -0.5;
          const axRight = (ax[0] ?? 0) >  0.5;

          if ((just(12) || (axUp    && !lock[0])) && !(lock[0] && !just(12))) { spatialNav('up');    lock[0] = true; }
          if ((just(13) || (axDown  && !lock[1])) && !(lock[1] && !just(13))) { spatialNav('down');  lock[1] = true; }
          if ((just(14) || (axLeft  && !lock[2])) && !(lock[2] && !just(14))) { spatialNav('left');  lock[2] = true; }
          if ((just(15) || (axRight && !lock[3])) && !(lock[3] && !just(15))) { spatialNav('right'); lock[3] = true; }

          if (Math.abs(ax[1] ?? 0) < 0.3) { lock[0] = false; lock[1] = false; }
          if (Math.abs(ax[0] ?? 0) < 0.3) { lock[2] = false; lock[3] = false; }

          if (just(0)) (document.activeElement as HTMLElement)?.click(); // A = confirm
          if (just(9)) document.querySelector<HTMLElement>('[data-search-btn]')?.click(); // Start = search
        }

        // B = back (always)
        if (just(1)) window.history.back();

        prevBtn.current = btns;
      }
      rafRef.current = requestAnimationFrame(poll);
    };

    const onConnect = () => {
      root.setAttribute('data-gamepad', 'true');
      root.setAttribute('data-kb', 'true');
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(poll);
    };
    const onDisconnect = () => {
      root.removeAttribute('data-gamepad');
      cancelAnimationFrame(rafRef.current);
    };

    window.addEventListener('gamepadconnected',    onConnect);
    window.addEventListener('gamepaddisconnected', onDisconnect);
    if ([...( navigator.getGamepads?.() ?? [])].some(g => g)) onConnect();

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('gamepadconnected',    onConnect);
      window.removeEventListener('gamepaddisconnected', onDisconnect);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return null;
}
