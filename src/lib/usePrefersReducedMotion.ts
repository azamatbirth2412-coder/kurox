"use client";
import { useEffect, useState } from "react";

// Reactive `prefers-reduced-motion` hook. Starts `false` on the server / first
// paint (so markup matches SSR) then syncs to the media query and updates live if
// the user toggles the OS setting. Used to swap animated GIF avatars for their
// still PNG frame when motion is not wanted.
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
