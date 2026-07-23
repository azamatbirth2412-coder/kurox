"use client";

import { useState } from "react";
import { Award, Loader2 } from "lucide-react";
import { TitleBadge } from "./TitleBadge";

interface EarnedTitle {
  id: string;
  name: string;
  emoji: string;
  color: string;
  rarity: string;
  earnedAt: string;
}

interface TitleSelectorProps {
  titles: EarnedTitle[];
  activeTitleId: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" });
}

export function TitleSelector({ titles, activeTitleId }: TitleSelectorProps) {
  const [activeId, setActiveId] = useState<string | null>(activeTitleId);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleSelect(id: string) {
    if (savingId) return;
    const next = activeId === id ? null : id;
    setSavingId(id);
    setError("");
    try {
      const res = await fetch("/api/profile/title", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleId: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Не удалось сохранить");
        return;
      }
      setActiveId(next);
    } catch {
      setError("Не удалось сохранить. Проверьте соединение.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Award size={16} className="text-amber-400" /> Мои титулы
        </h2>
        <span className="text-xs text-[var(--text3)] bg-[var(--surface2)] px-2 py-0.5 rounded-full">
          {titles.length}
        </span>
        {error && <span className="text-xs text-red-400 ml-auto">{error}</span>}
      </div>

      {titles.length === 0 ? (
        <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-xl p-5 text-center text-sm text-[var(--text3)]">
          Зарабатывай титулы, смотри аниме
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {titles.map((t) => {
            const isActive = activeId === t.id;
            const isSaving = savingId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelect(t.id)}
                disabled={savingId !== null}
                title={isActive ? "Нажмите, чтобы снять титул" : "Нажмите, чтобы сделать активным"}
                className={`relative text-left bg-[var(--surface2)] border rounded-xl p-3 transition-colors disabled:cursor-wait ${
                  isActive
                    ? "border-violet-500/60 bg-violet-500/10"
                    : "border-[var(--border)] hover:border-violet-500/40 hover:bg-[var(--surface3)]"
                }`}
              >
                {isActive && !isSaving && (
                  <span className="absolute top-2 right-2 text-[10px] font-semibold text-violet-300 bg-violet-500/15 border border-violet-500/30 px-1.5 py-0.5 rounded-full">
                    Активен
                  </span>
                )}
                {isSaving && (
                  <span className="absolute top-2 right-2 text-violet-300">
                    <Loader2 size={13} className="animate-spin" />
                  </span>
                )}
                <TitleBadge name={t.name} emoji={t.emoji} color={t.color} rarity={t.rarity} size="sm" />
                <p className="text-[11px] text-[var(--text3)] mt-2">
                  Получен {formatDate(t.earnedAt)}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
