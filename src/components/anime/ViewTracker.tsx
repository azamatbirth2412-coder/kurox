"use client";
import { useEffect } from "react";

// Fire-and-forget view ping. Without this the /api/anime/view endpoint is
// never called and the "Просмотров" counter never grows.
export function ViewTracker({ animeId }: { animeId: string }) {
  useEffect(() => {
    if (!animeId) return;
    const timer = setTimeout(() => {
      fetch("/api/anime/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animeId }),
        keepalive: true,
      }).catch(() => {});
    }, 3000); // count only visits that last a few seconds
    return () => clearTimeout(timer);
  }, [animeId]);

  return null;
}
