"use client";

import { useEffect, useRef, useState } from "react";
import { Smile, Lock, Crown } from "lucide-react";
import { STICKER_PACKS, isPackUnlocked, TOTAL_STICKERS } from "@/lib/stickers";
import { RARITY } from "@/lib/rarity";

interface StickerPickerProps {
  /** Called with the chosen sticker id; the composer inserts its `[s:id]` token. */
  onPick: (stickerId: string) => void;
}

// Popover sticker picker for the comment composer. Fetches the user's level /
// premium once (on first open) to gate packs, mirroring how frames/avatars gate.
export function StickerPicker({ onPick }: StickerPickerProps) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    fetch("/api/me/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setLevel(d.level ?? 0);
        setIsPremium(!!d.isPremium);
        setIsAdmin(!!d.isAdmin);
        setLoaded(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [open, loaded]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unlockedCount = STICKER_PACKS.reduce(
    (n, p) => n + (isPackUnlocked(p, level, isPremium, isAdmin) ? p.stickers.length : 0),
    0
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Стикеры"
        className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--surface2)] hover:bg-[var(--surface3)] text-[var(--text3)] hover:text-violet-300 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
      >
        <Smile size={16} />
      </button>

      {open && (
        <div
          className="absolute z-30 bottom-full mb-2 right-0 w-[300px] max-h-[340px] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3"
          style={{ boxShadow: "0 18px 44px rgba(0,0,0,.6)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text3)]">Стикеры</span>
            <span className="text-[10px] font-extrabold text-[var(--text2)] tabular-nums">
              {unlockedCount}/{TOTAL_STICKERS}
            </span>
          </div>

          {STICKER_PACKS.map((pack) => {
            const unlocked = isPackUnlocked(pack, level, isPremium, isAdmin);
            const rm = RARITY[pack.rarity];
            const isLeg = pack.rarity === "legendary";
            return (
              <div key={pack.id} className="mb-3 last:mb-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider"
                    style={{ color: rm.color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: rm.color, boxShadow: `0 0 6px ${rm.color}` }} />
                    {pack.name}
                  </span>
                  <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${rm.color}55, transparent)` }} />
                  {!unlocked && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-yellow-400">
                      {pack.premium ? <Crown size={9} /> : <Lock size={9} />}
                      {pack.premium ? "Premium" : `ур. ${pack.unlockLevel}`}
                    </span>
                  )}
                </div>
                <div className={`grid grid-cols-6 gap-1 ${isLeg && unlocked ? "rarity-legendary-border rounded-xl p-1" : ""}`}>
                  {pack.stickers.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => { onPick(s.id); setOpen(false); }}
                      title={unlocked ? s.name : pack.premium ? `${pack.name} · Premium` : `${pack.name} · ур. ${pack.unlockLevel}`}
                      aria-label={s.name}
                      className={`aspect-square rounded-lg flex items-center justify-center text-xl transition-[transform,background-color] duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 ${
                        unlocked
                          ? "hover:bg-[var(--surface3)] hover:scale-110 cursor-pointer"
                          : "opacity-30 grayscale cursor-not-allowed"
                      }`}
                      style={{ filter: unlocked ? "drop-shadow(0 2px 2px rgba(0,0,0,.5))" : undefined }}
                    >
                      {s.emoji}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
