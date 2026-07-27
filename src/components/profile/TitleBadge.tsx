/** The single final title, rendered with the one-off holographic treatment. */
export const MYTHIC_TITLE_KEY = "anilibria";

interface TitleBadgeProps {
  name: string;
  emoji: string;
  color: string;
  rarity?: string;
  size?: "sm" | "md";
  /** Pass the title's `key` so the final title can claim its unique style. */
  titleKey?: string;
}

/** Tier → the animation class that drives its aura. Common stays static. */
const TIER_CLASS: Record<string, string> = {
  rare: "title-badge-rare",
  epic: "title-badge-epic",
  legendary: "title-badge-legendary",
};

export function TitleBadge({ name, emoji, color, rarity = "common", size = "sm", titleKey }: TitleBadgeProps) {
  const isMythic = titleKey === MYTHIC_TITLE_KEY;
  const tierClass = isMythic ? "title-badge-mythic" : (TIER_CLASS[rarity] ?? "");

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap leading-none ${
        size === "sm" ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-[13px]"
      } ${tierClass}`}
      style={
        isMythic
          ? {
              // The rotating ring supplies the border; keep the fill transparent
              // so ::after shows through, and let the text carry the colour.
              color,
              textShadow: `0 0 10px ${color}88`,
            }
          : ({
              background: `linear-gradient(135deg, ${color}26 0%, ${color}0e 100%)`,
              border: `1px solid ${color}${rarity === "legendary" ? "80" : rarity === "epic" ? "66" : "55"}`,
              color,
              // Consumed by the tier keyframes so each badge glows in its own hue.
              "--tc-soft": `${color}40`,
              "--tc-strong": `${color}99`,
              textShadow: rarity === "legendary" ? `0 0 8px ${color}55` : undefined,
            } as React.CSSProperties)
      }
      title={name}
    >
      <span aria-hidden="true" style={{ fontSize: size === "sm" ? 11 : 14 }}>{emoji}</span>
      <span className="truncate">{name}</span>
    </span>
  );
}
