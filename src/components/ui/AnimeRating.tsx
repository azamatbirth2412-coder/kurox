"use client";
import { useState, useEffect } from "react";
import { StarRating } from "./StarRating";
import { useSession } from "next-auth/react";

export function AnimeRating({ animeId, initialScore = 0 }: { animeId: string; initialScore?: number }) {
  const { data: session } = useSession();
  const [score, setScore] = useState(initialScore);
  const [avg, setAvg] = useState<{ score: number; votes: number } | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load existing rating (user's own + average)
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ratings?animeId=${encodeURIComponent(animeId)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data) return;
        if (typeof data.myScore === "number") setScore(data.myScore);
        if (typeof data.avgScore === "number" && data.totalVotes > 0) {
          setAvg({ score: data.avgScore, votes: data.totalVotes });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [animeId]);

  async function handleRate(newScore: number) {
    if (!session) {
      window.location.href = "/auth/login";
      return;
    }
    const prev = score;
    setScore(newScore);
    setLoading(true);
    setError(false);
    setSaved(false);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animeId, score: newScore }),
      });
      if (!res.ok) throw new Error("save failed");
      const data = await res.json();
      if (typeof data.avgScore === "number" && data.totalVotes > 0) {
        setAvg({ score: data.avgScore, votes: data.totalVotes });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setScore(prev); // rollback optimistic update
      setError(true);
      setTimeout(() => setError(false), 3000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <StarRating value={score} onRate={handleRate} />
      {avg && (
        <span className="text-xs text-[var(--text3)]">
          {avg.score.toFixed(1)} / 5 · {avg.votes} {avg.votes === 1 ? "оценка" : "оценок"}
        </span>
      )}
      {loading && <span className="text-xs text-[var(--text3)]">Сохраняем...</span>}
      {saved && !loading && <span className="text-xs text-green-400">Оценка сохранена!</span>}
      {error && !loading && <span className="text-xs text-red-400">Не удалось сохранить</span>}
      {!session && score === 0 && (
        <span className="text-xs text-[var(--text3)]">Войдите, чтобы оценить</span>
      )}
    </div>
  );
}
