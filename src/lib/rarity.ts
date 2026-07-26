// Shared rarity tier system for all cosmetics (frames, titles, future items).
// Colours mirror the CSS tokens in globals.css (--rarity-*).

export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface RarityMeta {
  /** Feminine label — used for "рамка" (frame). */
  label: string;
  /** Neutral/masculine label — used for "титул" (title). */
  labelM: string;
  color: string;
  /** rgba glow used for box-shadows. */
  glow: string;
  /** Sort weight: legendary first. */
  order: number;
}

export const RARITY: Record<Rarity, RarityMeta> = {
  legendary: { label: "Легендарная", labelM: "Легендарный", color: "#f59e0b", glow: "rgba(245,158,11,.6)",  order: 0 },
  epic:      { label: "Эпическая",   labelM: "Эпический",   color: "#a855f7", glow: "rgba(168,85,247,.5)",  order: 1 },
  rare:      { label: "Редкая",      labelM: "Редкий",      color: "#3b82f6", glow: "rgba(59,130,246,.45)", order: 2 },
  common:    { label: "Обычная",     labelM: "Обычный",     color: "#9ca3af", glow: "rgba(156,163,175,.35)", order: 3 },
};

export const RARITY_ORDER: Rarity[] = ["legendary", "epic", "rare", "common"];

/** Derive a frame's rarity tier from the level at which it unlocks. */
export function frameRarity(unlockLevel: number): Rarity {
  if (unlockLevel >= 60) return "legendary"; // smoke (60), starlight (80)
  if (unlockLevel >= 20) return "epic";      // soul, thorns, firering, nebula
  if (unlockLevel >= 5)  return "rare";      // eclipse, arrows, vortex
  return "common";                            // default
}

/** Normalise an arbitrary string to a known rarity (falls back to common). */
export function asRarity(value: string | null | undefined): Rarity {
  return value === "legendary" || value === "epic" || value === "rare" || value === "common"
    ? value
    : "common";
}
