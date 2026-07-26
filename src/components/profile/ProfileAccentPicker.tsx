"use client";

import { useEffect, useState } from "react";
import { Check, Palette } from "lucide-react";

// Preset accent colors. `dim` is the same hue at ~15% alpha for soft glows/fills.
const ACCENTS = [
  { id: "violet",  color: "#8b5cf6" },
  { id: "blue",    color: "#3b82f6" },
  { id: "emerald", color: "#10b981" },
  { id: "rose",    color: "#f43f5e" },
  { id: "amber",   color: "#f59e0b" },
  { id: "cyan",    color: "#06b6d4" },
];

const STORAGE_KEY = "kurox:profile-accent";

function apply(color: string) {
  const root = document.documentElement;
  root.style.setProperty("--profile-accent", color);
  root.style.setProperty("--profile-accent-dim", `${color}26`);   // ~15% alpha
  root.style.setProperty("--profile-accent-glow", `${color}59`);  // ~35% alpha
}

export function ProfileAccentPicker() {
  const [active, setActive] = useState<string>("violet");

  // Restore saved accent on mount (client-only, so it never mismatches SSR).
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const preset = ACCENTS.find(a => a.id === saved) ?? ACCENTS[0];
    setActive(preset.id);
    apply(preset.color);
  }, []);

  function pick(id: string, color: string) {
    setActive(id);
    apply(color);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
  }

  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--text3)]">
        <Palette size={13} /> Акцент профиля
      </span>
      <div className="flex items-center gap-1.5">
        {ACCENTS.map(a => (
          <button
            key={a.id}
            type="button"
            onClick={() => pick(a.id, a.color)}
            aria-label={`Акцент ${a.id}`}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110"
            style={{
              backgroundColor: a.color,
              boxShadow: active === a.id
                ? `0 0 0 2px var(--surface), 0 0 0 4px ${a.color}, 0 0 10px ${a.color}88`
                : "none",
            }}
          >
            {active === a.id && <Check size={12} className="text-white drop-shadow" strokeWidth={3} />}
          </button>
        ))}
      </div>
    </div>
  );
}
