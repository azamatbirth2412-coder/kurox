import { Sticker as StickerIcon, Lock, Crown, Check } from "lucide-react";
import { STICKER_PACKS, isPackUnlocked, TOTAL_STICKERS } from "@/lib/stickers";
import { RARITY, RARITY_ORDER } from "@/lib/rarity";

interface StickerShowcaseProps {
  userLevel: number;
  isPremium: boolean;
  isAdmin?: boolean;
}

// Read-only sticker inventory shown on the profile: owned packs light up, locked
// ones show their unlock requirement. Ownership is derived from level/premium
// (no per-user table), matching frames. Legendary packs get the shimmer border.
// Stickers post inside comments via the composer's picker.
export function StickerShowcase({ userLevel, isPremium, isAdmin = false }: StickerShowcaseProps) {
  const unlockedCount = STICKER_PACKS.reduce(
    (n, p) => n + (isPackUnlocked(p, userLevel, isPremium, isAdmin) ? p.stickers.length : 0),
    0
  );

  // Order packs legendary → common (RARITY_ORDER) for a nice descending display.
  const packs = [...STICKER_PACKS].sort(
    (a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
  );

  return (
    <div style={{ marginTop: 28 }} id="stickers">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <StickerIcon size={15} style={{ color: "#a855f7" }} />
          <span style={{ fontWeight: 800, fontSize: 14 }}>Коллекция стикеров</span>
          <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 9px", borderRadius: 99, background: "rgba(168,85,247,.12)", color: "#c4b5fd", border: "1px solid rgba(168,85,247,.25)" }} className="tabular-nums">
            {unlockedCount} / {TOTAL_STICKERS}
          </span>
        </div>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>Используй в комментариях</span>
      </div>

      {/* Pack cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {packs.map((pack) => {
          const unlocked = isPackUnlocked(pack, userLevel, isPremium, isAdmin);
          const rm = RARITY[pack.rarity];
          const isLeg = pack.rarity === "legendary";
          return (
            <div
              key={pack.id}
              className={isLeg && unlocked ? "rarity-legendary-border" : ""}
              style={{
                position: "relative",
                borderRadius: 16,
                border: `1.5px solid ${unlocked ? `${rm.color}55` : `${rm.color}22`}`,
                background: `linear-gradient(160deg, ${rm.color}14 0%, #0b0a10 70%, ${rm.color}0a 100%)`,
                boxShadow: unlocked
                  ? `0 0 ${isLeg ? 18 : 12}px ${rm.glow}, 0 4px 16px rgba(0,0,0,.5)`
                  : "0 2px 12px rgba(0,0,0,.5)",
                padding: 14,
                opacity: unlocked ? 1 : 0.72,
              }}
            >
              {/* Pack header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: rm.color, fontSize: 12, fontWeight: 900, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: rm.color, boxShadow: `0 0 6px ${rm.color}` }} />
                  {pack.name}
                </span>
                <span style={{ flex: 1 }} />
                {unlocked ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 800, color: "#4ade80", background: "rgba(74,222,128,.14)", border: "1px solid rgba(74,222,128,.35)", padding: "2px 7px", borderRadius: 99 }}>
                    <Check size={9} /> ОТКРЫТ
                  </span>
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 800, color: "#facc15", background: "rgba(250,204,21,.1)", border: "1px solid rgba(250,204,21,.3)", padding: "2px 7px", borderRadius: 99 }}>
                    {pack.premium ? <Crown size={9} /> : <Lock size={9} />}
                    {pack.premium ? "PREMIUM" : `УР. ${pack.unlockLevel}`}
                  </span>
                )}
              </div>

              {/* Sticker glyphs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4 }}>
                {pack.stickers.map((s) => (
                  <span
                    key={s.id}
                    role="img"
                    aria-label={s.name}
                    title={s.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      aspectRatio: "1 / 1",
                      fontSize: 17,
                      borderRadius: 7,
                      background: "rgba(255,255,255,.03)",
                      filter: unlocked ? "drop-shadow(0 2px 2px rgba(0,0,0,.5))" : "grayscale(1)",
                      opacity: unlocked ? 1 : 0.4,
                    }}
                  >
                    {s.emoji}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
