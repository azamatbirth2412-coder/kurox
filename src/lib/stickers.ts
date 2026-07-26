// Sticker packs — a curated cosmetic set used inside comments (and shown as an
// inventory showcase on the profile). Like frames and avatars, ownership is
// DERIVED from the user's level / premium — there is no per-user table and no
// DB catalog model. Packs are a code constant, exactly like FRAMES in
// ProfileFrame.tsx: the lightest pattern that fits a fixed curated set.
//
// Rendering: a chosen sticker is embedded into the plain comment text as a
// shortcode token `[s:<id>]` (see stickerToken). Tokens survive comment
// sanitisation (no HTML / entities) and are replaced with the sticker glyph at
// render time by <StickerText>. Unknown tokens render as literal text, so a
// crafted token can never inject arbitrary markup or images.
//
// Stickers are emoji glyphs (self-contained, offline-safe, and inherently
// reduced-motion friendly since they don't animate) rendered large as "stickers".

import { type Rarity } from "@/lib/rarity";

export interface Sticker {
  /** Globally unique across all packs — used inside the `[s:id]` token. */
  id: string;
  emoji: string;
  name: string;
}

export interface StickerPack {
  id: string;
  name: string;
  rarity: Rarity;
  /** Level required to unlock the pack (0 = free). */
  unlockLevel: number;
  /** Premium unlocks this pack regardless of level. */
  premium: boolean;
  stickers: Sticker[];
}

export const STICKER_PACKS: StickerPack[] = [
  {
    id: "emotions",
    name: "Эмоции",
    rarity: "common",
    unlockLevel: 0,
    premium: false,
    stickers: [
      { id: "emo_grin",  emoji: "😀", name: "Улыбка" },
      { id: "emo_joy",   emoji: "😂", name: "Смех" },
      { id: "emo_love",  emoji: "😍", name: "Восторг" },
      { id: "emo_cry",   emoji: "😭", name: "Слёзы" },
      { id: "emo_rage",  emoji: "😡", name: "Злость" },
      { id: "emo_sleep", emoji: "😴", name: "Сон" },
      { id: "emo_shock", emoji: "😱", name: "Шок" },
      { id: "emo_think", emoji: "🤔", name: "Раздумье" },
    ],
  },
  {
    id: "reactions",
    name: "Реакции",
    rarity: "rare",
    unlockLevel: 5,
    premium: false,
    stickers: [
      { id: "rct_up",    emoji: "👍", name: "Лайк" },
      { id: "rct_clap",  emoji: "👏", name: "Аплодисменты" },
      { id: "rct_fire",  emoji: "🔥", name: "Огонь" },
      { id: "rct_100",   emoji: "💯", name: "Сотка" },
      { id: "rct_party", emoji: "🎉", name: "Праздник" },
      { id: "rct_skull", emoji: "💀", name: "Череп" },
      { id: "rct_pray",  emoji: "🙏", name: "Мольба" },
      { id: "rct_eyes",  emoji: "👀", name: "Слежка" },
    ],
  },
  {
    id: "otaku",
    name: "Отаку",
    rarity: "epic",
    unlockLevel: 20,
    premium: false,
    stickers: [
      { id: "otk_sword",   emoji: "⚔️", name: "Катана" },
      { id: "otk_sakura",  emoji: "🌸", name: "Сакура" },
      { id: "otk_ramen",   emoji: "🍜", name: "Рамен" },
      { id: "otk_japan",   emoji: "🗾", name: "Япония" },
      { id: "otk_flag",    emoji: "🎌", name: "Флаги" },
      { id: "otk_oni",     emoji: "👺", name: "Тэнгу" },
      { id: "otk_dragon",  emoji: "🐉", name: "Дракон" },
      { id: "otk_sparkle", emoji: "✨", name: "Искры" },
    ],
  },
  {
    id: "legends",
    name: "Легенды",
    rarity: "legendary",
    unlockLevel: 60,
    premium: true,
    stickers: [
      { id: "leg_crown",   emoji: "👑", name: "Корона" },
      { id: "leg_dragon",  emoji: "🐲", name: "Владыка" },
      { id: "leg_bolt",    emoji: "⚡", name: "Молния" },
      { id: "leg_galaxy",  emoji: "🌌", name: "Галактика" },
      { id: "leg_star",    emoji: "💫", name: "Звезда" },
      { id: "leg_trophy",  emoji: "🏆", name: "Трофей" },
      { id: "leg_arm",     emoji: "🦾", name: "Мощь" },
      { id: "leg_trident", emoji: "🔱", name: "Трезубец" },
    ],
  },
];

/** Flat index: sticker id → { sticker, pack }. */
export const STICKER_INDEX: Record<string, { sticker: Sticker; pack: StickerPack }> = (() => {
  const map: Record<string, { sticker: Sticker; pack: StickerPack }> = {};
  for (const pack of STICKER_PACKS) {
    for (const sticker of pack.stickers) map[sticker.id] = { sticker, pack };
  }
  return map;
})();

export const TOTAL_STICKERS = Object.keys(STICKER_INDEX).length;

// Token format: `[s:<id>]`. Kept to [a-z0-9_] so it survives comment sanitisation
// (which strips only HTML tags/entities and collapses whitespace).
export const STICKER_TOKEN_SOURCE = "\\[s:([a-z0-9_]+)\\]";
export function stickerToken(id: string): string {
  return `[s:${id}]`;
}
/** Fresh global matcher (RegExp.exec with /g is stateful — never share one). */
export function stickerTokenRegex(): RegExp {
  return new RegExp(STICKER_TOKEN_SOURCE, "g");
}

/** Ownership is derived (like frames/avatars): admin, premium-perk, or level. */
export function isPackUnlocked(
  pack: StickerPack,
  level: number,
  isPremium: boolean,
  isAdmin = false
): boolean {
  if (isAdmin) return true;
  if (pack.premium && isPremium) return true;
  return level >= pack.unlockLevel;
}

/**
 * Server-side guard: strip sticker tokens the user is not allowed to post
 * (unknown ids, or ids from packs they haven't unlocked). Keeps legitimate
 * tokens and all surrounding text intact.
 */
export function filterStickerTokens(
  text: string,
  level: number,
  isPremium: boolean,
  isAdmin = false
): string {
  return text.replace(stickerTokenRegex(), (whole, id: string) => {
    const entry = STICKER_INDEX[id];
    if (!entry) return "";
    return isPackUnlocked(entry.pack, level, isPremium, isAdmin) ? whole : "";
  });
}
