const RARITY_META: Record<string, { label: string; color: string; glow: string }> = {
  common:    { label: "Обычный",    color: "#64748b", glow: "none" },
  rare:      { label: "Редкий",     color: "#3b82f6", glow: "0 0 10px rgba(59,130,246,0.45)" },
  epic:      { label: "Эпический",  color: "#8b5cf6", glow: "0 0 14px rgba(139,92,246,0.55)" },
  legendary: { label: "Легендарный",color: "#f59e0b", glow: "0 0 18px rgba(245,158,11,0.6)" },
};

interface TitleBadgeProps {
  name: string;
  emoji: string;
  color: string;
  rarity?: string;
  size?: "sm" | "md";
}

export function TitleBadge({ name, emoji, color, rarity = "common", size = "sm" }: TitleBadgeProps) {
  const isLegendary = rarity === "legendary";
  const meta = RARITY_META[rarity] ?? RARITY_META.common;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap leading-none ${
        size === "sm" ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-[13px]"
      } ${isLegendary ? "title-badge-legendary" : ""}`}
      style={{
        background: `linear-gradient(135deg, ${color}22 0%, ${color}0e 100%)`,
        border: `1px solid ${color}55`,
        color,
        boxShadow: meta.glow !== "none" ? meta.glow : undefined,
      }}
      title={name}
    >
      <span aria-hidden="true" style={{ fontSize: size === "sm" ? 11 : 14 }}>{emoji}</span>
      <span className="truncate">{name}</span>
    </span>
  );
}
