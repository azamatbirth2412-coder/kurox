// Avatar catalog — static PNG portraits + animated GIF avatars, each tagged with
// a rarity tier and an unlock rule (level and/or premium). This mirrors the frame
// cosmetic system (src/lib/level.ts FRAME_UNLOCKS + src/lib/rarity.ts): the tier
// is *derived* from the unlock level, and ownership is derived from the user's
// level/premium — no per-user table.
//
// Storage: the selected avatar is saved in `User.image` as a plain path
// (e.g. "/avatars/avatar_07a.gif"). Paths are short and non-`data:`, so they pass
// `jwtSafeImage` (src/lib/auth.ts) and animate natively when rendered as <img>.
// Reusing `image` keeps a single source of truth for "the user's current avatar"
// across the header, comments and profile — a separate `animatedAvatar` column
// would force merge logic in every consumer and create "which one wins?" ambiguity.

import { type Rarity, frameRarity } from "@/lib/rarity";

export type AvatarKind = "static" | "animated";

export interface AvatarDef {
  id: string;
  name: string;
  /** The image used as the avatar (PNG for static, animated GIF for animated). */
  url: string;
  /** A still frame — for animated avatars this is the PNG counterpart, used as the
   *  reduced-motion fallback; for static avatars it equals `url`. */
  still: string;
  kind: AvatarKind;
  /** Level required to unlock (rarity is derived from this via frameRarity). */
  unlockLevel: number;
  /** Premium unlocks this avatar regardless of level (a premium perk). */
  premium: boolean;
  rarity: Rarity;
}

const pad = (n: number) => String(n).padStart(2, "0");

// Static portraits — the free starter set: 16 common (lvl 0–4) + 8 rare (lvl 5–12).
const STATIC_UNLOCKS = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 4, 4,
  5, 6, 7, 8, 9, 10, 11, 12,
];

// Animated GIF avatars — the premium-flavoured cosmetic:
//   8 rare (5–19) · 10 epic (20–59) · 6 legendary (60–90, also a premium perk).
const ANIMATED_UNLOCKS = [
  5, 7, 9, 11, 13, 15, 17, 19,
  20, 24, 28, 32, 36, 40, 45, 50, 54, 58,
  60, 65, 70, 75, 80, 90,
];

function makeStatic(i: number): AvatarDef {
  const n = i + 1;
  const url = `/avatars/avatar_${pad(n)}.png`;
  const lvl = STATIC_UNLOCKS[i];
  return {
    id: `static_${pad(n)}`,
    name: `Портрет ${n}`,
    url,
    still: url,
    kind: "static",
    unlockLevel: lvl,
    premium: false,
    rarity: frameRarity(lvl),
  };
}

function makeAnimated(i: number): AvatarDef {
  const n = i + 1;
  const lvl = ANIMATED_UNLOCKS[i];
  const rarity = frameRarity(lvl);
  return {
    id: `anim_${pad(n)}`,
    name: `Аниме ${n}`,
    url: `/avatars/avatar_${pad(n)}a.gif`,
    still: `/avatars/avatar_${pad(n)}.png`,
    kind: "animated",
    unlockLevel: lvl,
    premium: rarity === "legendary",
    rarity,
  };
}

export const STATIC_AVATARS: AvatarDef[] = Array.from({ length: 24 }, (_, i) => makeStatic(i));
export const ANIMATED_AVATARS: AvatarDef[] = Array.from({ length: 24 }, (_, i) => makeAnimated(i));
export const AVATAR_CATALOG: AvatarDef[] = [...STATIC_AVATARS, ...ANIMATED_AVATARS];

// Back-compat: this export previously held the animated set.
export const ANIME_AVATARS = ANIMATED_AVATARS;

/** Lookup by stored path (User.image) → catalog entry, for server-side gating. */
export const AVATAR_BY_URL: Record<string, AvatarDef> = Object.fromEntries(
  AVATAR_CATALOG.map((a) => [a.url, a])
);

/** Ownership is derived (like frames): admin, premium-perk, or reached the level. */
export function isAvatarUnlocked(
  a: AvatarDef,
  level: number,
  isPremium: boolean,
  isAdmin = false
): boolean {
  if (isAdmin) return true;
  if (a.premium && isPremium) return true;
  return level >= a.unlockLevel;
}
