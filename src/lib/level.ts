export const LEVEL_TITLES = [
  { minLevel: 0,   title: "Новичок",  emoji: "⭐" },
  { minLevel: 5,   title: "Зритель",  emoji: "👀" },
  { minLevel: 10,  title: "Любитель", emoji: "🎌" },
  { minLevel: 20,  title: "Фанат",    emoji: "💜" },
  { minLevel: 30,  title: "Отаку",    emoji: "🔥" },
  { minLevel: 50,  title: "Мастер",   emoji: "⚡" },
  { minLevel: 75,  title: "Легенда",  emoji: "👑" },
  { minLevel: 100, title: "Аномалия", emoji: "💀" },
];

export const FRAME_UNLOCKS: Record<string, number> = {
  default:   0,
  eclipse:   5,
  arrows:    10,
  vortex:    15,
  soul:      20,
  thorns:    25,
  firering:  30,
  nebula:    45,
  smoke:     60,
  starlight: 80,
};

export function calcLevel(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 0;
  return Math.floor(Math.sqrt(xp / 100));
}

export function xpForLevel(level: number): number {
  if (!Number.isFinite(level) || level <= 0) return 0;
  return level * level * 100;
}

export function getLevelInfo(level: number): { title: string; emoji: string } {
  let info = LEVEL_TITLES[0];
  for (const t of LEVEL_TITLES) {
    if (level >= t.minLevel) info = t;
  }
  return { title: info.title, emoji: info.emoji };
}

export function levelProgress(xp: number): {
  level: number;
  currentXp: number;
  neededXp: number;
  percent: number;
} {
  const safeXp = Number.isFinite(xp) && xp > 0 ? xp : 0;
  const level = calcLevel(safeXp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const neededXp = next - base;
  const currentXp = safeXp - base;
  const percent = Math.min(100, Math.max(0, (currentXp / neededXp) * 100));
  return { level, currentXp, neededXp, percent };
}
