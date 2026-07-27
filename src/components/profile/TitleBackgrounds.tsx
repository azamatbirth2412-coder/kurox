// Per-title decorative backdrops. Each elemental title owns a distinct motif so
// two cards never read alike; TitlesShowcase falls back to the rarity-tier
// backdrops for any title without an entry here.
//
// Conventions shared with the rarity backdrops in TitlesShowcase:
//   • 200×200 viewBox, absolutely positioned, pointer-events: none
//   • gradient ids are suffixed with `uid` so multiple cards can coexist
//   • everything is drawn in the title's own `color`

interface BgProps { color: string; uid: string }

const svgStyle: React.CSSProperties = {
  position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none",
};

/** Shared soft radial wash behind every motif. */
function Wash({ color, uid, cx = "50%", cy = "40%", opacity = ".28" }: BgProps & { cx?: string; cy?: string; opacity?: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`w-${uid}`} cx={cx} cy={cy}>
          <stop offset="0%" stopColor={color} stopOpacity={opacity} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#w-${uid})`} />
    </>
  );
}

// ── common ─────────────────────────────────────────────────────────

/** Искра — embers drifting up from a low flame arc. */
function SparkBg({ color, uid }: BgProps) {
  return (
    <svg viewBox="0 0 200 200" style={svgStyle} aria-hidden>
      <Wash color={color} uid={uid} cy="70%" />
      <path d="M100 150 C82 128 86 110 100 92 C114 110 118 128 100 150 Z" fill={color} fillOpacity=".14" />
      <path d="M100 150 C90 134 92 122 100 110 C108 122 110 134 100 150 Z" fill={color} fillOpacity=".22" />
      {[[62, 96, 2], [138, 88, 1.8], [80, 66, 1.4], [124, 58, 1.6], [100, 44, 1.2], [48, 62, 1]].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={color} fillOpacity={0.5 - i * 0.05} />
      ))}
    </svg>
  );
}

/** Поток — stacked water curves. */
function StreamBg({ color, uid }: BgProps) {
  return (
    <svg viewBox="0 0 200 200" style={svgStyle} aria-hidden>
      <Wash color={color} uid={uid} cy="55%" />
      {[70, 92, 114, 136].map((y, i) => (
        <path
          key={i}
          d={`M-10 ${y} Q 40 ${y - 14} 90 ${y} T 210 ${y}`}
          fill="none"
          stroke={color}
          strokeWidth={1.6 - i * 0.2}
          strokeOpacity={0.34 - i * 0.06}
        />
      ))}
      {[[54, 52], [146, 60], [100, 40]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2.2 - i * 0.4} fill={color} fillOpacity=".38" />
      ))}
    </svg>
  );
}

/** Ветерок — light gusts curling across the card. */
function BreezeBg({ color, uid }: BgProps) {
  return (
    <svg viewBox="0 0 200 200" style={svgStyle} aria-hidden>
      <Wash color={color} uid={uid} cx="40%" cy="45%" />
      {[
        "M20 74 Q 80 60 120 74 Q 140 81 132 92",
        "M28 104 Q 96 88 148 104 Q 168 111 158 122",
        "M34 134 Q 84 122 118 134",
      ].map((d, i) => (
        <path key={i} d={d} fill="none" stroke={color} strokeWidth={1.5 - i * 0.2} strokeOpacity={0.34 - i * 0.06} strokeLinecap="round" />
      ))}
      {[[150, 58], [58, 156], [172, 140]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.6" fill={color} fillOpacity=".3" />
      ))}
    </svg>
  );
}

// ── rare ───────────────────────────────────────────────────────────

/** Каменный — interlocking rock slabs. */
function StoneBg({ color, uid }: BgProps) {
  return (
    <svg viewBox="0 0 200 200" style={svgStyle} aria-hidden>
      <Wash color={color} uid={uid} cy="55%" opacity=".22" />
      <polygon points="62,132 84,96 118,104 128,140" fill={color} fillOpacity=".14" stroke={color} strokeWidth="1.2" strokeOpacity=".32" />
      <polygon points="84,96 104,66 132,84 118,104" fill={color} fillOpacity=".09" stroke={color} strokeWidth="1" strokeOpacity=".24" />
      <polygon points="128,140 118,104 156,112 158,142" fill={color} fillOpacity=".07" stroke={color} strokeWidth="1" strokeOpacity=".2" />
      <polygon points="42,146 62,132 68,152" fill={color} fillOpacity=".1" stroke={color} strokeWidth=".8" strokeOpacity=".18" />
    </svg>
  );
}

/** Громовой — forked bolt with discharge arcs. */
function ThunderBg({ color, uid }: BgProps) {
  return (
    <svg viewBox="0 0 200 200" style={svgStyle} aria-hidden>
      <Wash color={color} uid={uid} cy="35%" />
      <path d="M108 40 L82 104 L100 104 L88 158 L124 92 L104 92 L118 40 Z" fill={color} fillOpacity=".18" stroke={color} strokeWidth="1.4" strokeOpacity=".42" strokeLinejoin="round" />
      {["M44 66 L58 84 L48 90", "M156 78 L142 96 L152 104", "M52 128 L64 140"].map((d, i) => (
        <path key={i} d={d} fill="none" stroke={color} strokeWidth="1.2" strokeOpacity={0.3 - i * 0.05} strokeLinecap="round" />
      ))}
    </svg>
  );
}

/** Ледяной — six-point flake with shards. */
function IceBg({ color, uid }: BgProps) {
  return (
    <svg viewBox="0 0 200 200" style={svgStyle} aria-hidden>
      <Wash color={color} uid={uid} cy="45%" />
      <g stroke={color} strokeOpacity=".34" strokeWidth="1.3" strokeLinecap="round" fill="none">
        {[0, 60, 120].map((deg) => (
          <g key={deg} transform={`rotate(${deg} 100 100)`}>
            <line x1="52" y1="100" x2="148" y2="100" />
            <line x1="70" y1="100" x2="80" y2="90" />
            <line x1="70" y1="100" x2="80" y2="110" />
            <line x1="130" y1="100" x2="120" y2="90" />
            <line x1="130" y1="100" x2="120" y2="110" />
          </g>
        ))}
      </g>
      <circle cx="100" cy="100" r="7" fill={color} fillOpacity=".2" />
      {[[46, 52], [154, 148], [156, 50]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.5" fill={color} fillOpacity=".3" />
      ))}
    </svg>
  );
}

// ── epic ───────────────────────────────────────────────────────────

/** Буря — tightening spiral vortex. */
function StormBg({ color, uid }: BgProps) {
  return (
    <svg viewBox="0 0 200 200" style={svgStyle} aria-hidden>
      <Wash color={color} uid={uid} />
      {[62, 48, 34, 22, 12].map((r, i) => (
        <ellipse
          key={i}
          cx={100 + i * 3}
          cy={100 - i * 6}
          rx={r}
          ry={r * 0.36}
          fill="none"
          stroke={color}
          strokeWidth={1.4 - i * 0.15}
          strokeOpacity={0.34 - i * 0.04}
        />
      ))}
      <path d="M100 148 Q 112 128 104 108" fill="none" stroke={color} strokeWidth="1.2" strokeOpacity=".26" strokeLinecap="round" />
    </svg>
  );
}

/** Затмение — dark disc ringed by corona. */
function EclipseBg({ color, uid }: BgProps) {
  return (
    <svg viewBox="0 0 200 200" style={svgStyle} aria-hidden>
      <Wash color={color} uid={uid} opacity=".2" />
      <circle cx="100" cy="98" r="46" fill={color} fillOpacity=".1" />
      <circle cx="100" cy="98" r="46" fill="none" stroke={color} strokeWidth="2" strokeOpacity=".5" />
      <circle cx="100" cy="98" r="38" fill="#06050c" fillOpacity=".85" />
      <g stroke={color} strokeOpacity=".26" strokeWidth="1.1" strokeLinecap="round">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <line key={deg} x1="100" y1="42" x2="100" y2="30" transform={`rotate(${deg} 100 98)`} />
        ))}
      </g>
    </svg>
  );
}

/** Бездна — rings collapsing toward a void. */
function AbyssBg({ color, uid }: BgProps) {
  return (
    <svg viewBox="0 0 200 200" style={svgStyle} aria-hidden>
      <Wash color={color} uid={uid} opacity=".24" />
      {[76, 60, 46, 34, 24, 16].map((r, i) => (
        <circle
          key={i}
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={1.3 - i * 0.12}
          strokeOpacity={0.34 - i * 0.045}
          strokeDasharray={i % 2 ? "5 7" : undefined}
        />
      ))}
      <circle cx="100" cy="100" r="10" fill="#05040a" />
      <circle cx="100" cy="100" r="10" fill="none" stroke={color} strokeWidth="1.4" strokeOpacity=".55" />
    </svg>
  );
}

// ── legendary ──────────────────────────────────────────────────────

/** Кровавая луна — full moon with slow drips. */
function BloodMoonBg({ color, uid }: BgProps) {
  return (
    <svg viewBox="0 0 200 200" style={svgStyle} aria-hidden>
      <Wash color={color} uid={uid} cy="35%" opacity=".3" />
      <circle cx="100" cy="82" r="40" fill={color} fillOpacity=".16" stroke={color} strokeWidth="1.6" strokeOpacity=".45" />
      {[[86, 70, 7], [114, 92, 5], [96, 100, 4]].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={color} fillOpacity=".12" />
      ))}
      {[[72, 128, 16], [100, 136, 24], [130, 126, 12]].map(([x, y, len], i) => (
        <path key={i} d={`M${x} ${y} v${len}`} stroke={color} strokeWidth="2.4" strokeOpacity={0.34 - i * 0.05} strokeLinecap="round" />
      ))}
    </svg>
  );
}

/** Драконье пламя — flame plume over scale rows. */
function DragonBg({ color, uid }: BgProps) {
  return (
    <svg viewBox="0 0 200 200" style={svgStyle} aria-hidden>
      <Wash color={color} uid={uid} cy="45%" opacity=".3" />
      <path d="M100 154 C68 126 74 96 100 46 C126 96 132 126 100 154 Z" fill={color} fillOpacity=".14" stroke={color} strokeWidth="1.5" strokeOpacity=".4" />
      <path d="M100 146 C84 126 88 106 100 78 C112 106 116 126 100 146 Z" fill={color} fillOpacity=".2" />
      <g stroke={color} strokeOpacity=".2" strokeWidth="1" fill="none">
        {[150, 166, 182].map((y, row) =>
          [30, 62, 94, 126, 158].map((x, i) => (
            <path key={`${row}-${i}`} d={`M${x + (row % 2 ? 16 : 0)} ${y} a 10 8 0 0 1 20 0`} />
          ))
        )}
      </g>
    </svg>
  );
}

/** Кристалл — faceted gem with inner light. */
function CrystalBg({ color, uid }: BgProps) {
  return (
    <svg viewBox="0 0 200 200" style={svgStyle} aria-hidden>
      <Wash color={color} uid={uid} opacity=".26" />
      <polygon points="100,38 142,84 122,152 78,152 58,84" fill={color} fillOpacity=".1" stroke={color} strokeWidth="1.6" strokeOpacity=".45" />
      <g stroke={color} strokeWidth="1" strokeOpacity=".28" fill="none">
        <path d="M100 38 L100 152" />
        <path d="M58 84 L100 104 L142 84" />
        <path d="M78 152 L100 104 L122 152" />
      </g>
      <polygon points="100,60 124,88 100,104 76,88" fill={color} fillOpacity=".18" />
      {[[40, 46], [162, 58], [46, 160]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.6" fill={color} fillOpacity=".34" />
      ))}
    </svg>
  );
}

/** Звёздный — burst with a small constellation. */
function StarBg({ color, uid }: BgProps) {
  return (
    <svg viewBox="0 0 200 200" style={svgStyle} aria-hidden>
      <Wash color={color} uid={uid} opacity=".3" />
      <g stroke={color} strokeOpacity=".3" strokeWidth="1.2" strokeLinecap="round">
        {[0, 45, 90, 135].map((deg) => (
          <line key={deg} x1="42" y1="100" x2="158" y2="100" transform={`rotate(${deg} 100 100)`} />
        ))}
      </g>
      <path d="M100 68 L109 92 L134 92 L114 107 L122 131 L100 116 L78 131 L86 107 L66 92 L91 92 Z" fill={color} fillOpacity=".2" stroke={color} strokeWidth="1.4" strokeOpacity=".5" strokeLinejoin="round" />
      <g stroke={color} strokeOpacity=".22" strokeWidth=".9" fill="none">
        <path d="M32 42 L54 56 L44 78" />
        <path d="M160 130 L176 150 L154 162" />
      </g>
      {[[32, 42], [54, 56], [44, 78], [160, 130], [176, 150], [154, 162]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.7" fill={color} fillOpacity=".45" />
      ))}
    </svg>
  );
}

/** AniLibria — galaxy spiral, reserved for the final title. */
function CosmosBg({ color, uid }: BgProps) {
  return (
    <svg viewBox="0 0 200 200" style={svgStyle} aria-hidden>
      <defs>
        <radialGradient id={`cos-${uid}`} cx="50%" cy="50%">
          <stop offset="0%" stopColor={color} stopOpacity=".4" />
          <stop offset="55%" stopColor={color} stopOpacity=".12" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#cos-${uid})`} />
      <g fill="none" stroke={color} strokeLinecap="round">
        {[0, 120, 240].map((deg, i) => (
          <path
            key={deg}
            d="M100 100 C 118 88 140 90 152 108 C 162 124 152 146 130 152"
            transform={`rotate(${deg} 100 100)`}
            strokeWidth="1.5"
            strokeOpacity={0.38 - i * 0.05}
          />
        ))}
      </g>
      <circle cx="100" cy="100" r="9" fill={color} fillOpacity=".5" />
      <circle cx="100" cy="100" r="18" fill="none" stroke={color} strokeWidth="1" strokeOpacity=".25" />
      {[[36, 40, 1.8], [168, 52, 1.4], [26, 150, 1.5], [176, 158, 1.7], [92, 24, 1.3], [116, 176, 1.5], [58, 96, 1], [150, 112, 1.1]].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={color} fillOpacity={0.55 - i * 0.04} />
      ))}
    </svg>
  );
}

/** Title `key` → its backdrop. Keys mirror scripts/seed-titles-v4.mjs. */
export const TITLE_BG: Record<string, (p: BgProps) => React.ReactElement> = {
  spark: SparkBg,
  stream: StreamBg,
  breeze: BreezeBg,
  stone: StoneBg,
  thunder: ThunderBg,
  ice: IceBg,
  storm: StormBg,
  eclipse: EclipseBg,
  abyss: AbyssBg,
  bloodmoon: BloodMoonBg,
  dragonflame: DragonBg,
  crystal: CrystalBg,
  starlight: StarBg,
  anilibria: CosmosBg,
};

// ── procedural fallback ────────────────────────────────────────────
// Hand-drawn motifs above cover the elemental ladder. Every other title —
// including ones staff add later through the admin panel — still needs to look
// like its own thing, so the motif is derived from the title `key`: same key
// always yields the same art, different keys land on different families and
// parameters. This keeps "no two cards alike" true without hand-authoring one
// backdrop per title forever.

/** FNV-1a — small, stable, and no dependency. */
function hashKey(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Pull a bounded integer out of the hash at a given bit offset. */
function pick(hash: number, offset: number, range: number): number {
  return Math.floor(((hash >>> offset) % 1000) / 1000 * range);
}

function ProceduralBg({ color, uid, seed }: BgProps & { seed: string }) {
  const h = hashKey(seed);
  const family = h % 8;
  const rot = pick(h, 3, 360);
  const count = 5 + pick(h, 7, 5);
  const radius = 38 + pick(h, 11, 26);
  const dash = pick(h, 17, 2) ? "5 7" : undefined;

  let motif: React.ReactNode;
  switch (family) {
    case 0: // radiating spokes
      motif = (
        <g stroke={color} strokeOpacity=".3" strokeWidth="1.2" strokeLinecap="round">
          {Array.from({ length: count }, (_, i) => (
            <line key={i} x1="100" y1={100 - radius} x2="100" y2={100 - radius - 16}
              transform={`rotate(${rot + (360 / count) * i} 100 100)`} />
          ))}
          <circle cx="100" cy="100" r={radius * 0.5} fill="none" strokeOpacity=".22" />
        </g>
      );
      break;
    case 1: // tilted orbits
      motif = (
        <g fill="none" stroke={color} strokeOpacity=".26" strokeWidth="1.1" strokeDasharray={dash}>
          {Array.from({ length: 3 }, (_, i) => (
            <ellipse key={i} cx="100" cy="100" rx={radius} ry={radius * 0.4}
              transform={`rotate(${rot + i * 60} 100 100)`} />
          ))}
        </g>
      );
      break;
    case 2: // petals
      motif = (
        <g fill={color} fillOpacity=".1" stroke={color} strokeOpacity=".3" strokeWidth="1.1">
          {Array.from({ length: count }, (_, i) => (
            <ellipse key={i} cx="100" cy={100 - radius * 0.55} rx={radius * 0.22} ry={radius * 0.55}
              transform={`rotate(${rot + (360 / count) * i} 100 100)`} />
          ))}
        </g>
      );
      break;
    case 3: // hex lattice
      motif = (
        <g fill="none" stroke={color} strokeOpacity=".16" strokeWidth=".9">
          {Array.from({ length: 4 }, (_, row) =>
            Array.from({ length: 4 }, (_, col) => {
              const cx = 40 + col * 42 + (row % 2 ? 21 : 0);
              const cy = 44 + row * 40;
              return (
                <polygon key={`${row}-${col}`}
                  points={[0, 60, 120, 180, 240, 300]
                    .map((a) => {
                      const rad = ((a + rot) * Math.PI) / 180;
                      return `${(cx + 15 * Math.cos(rad)).toFixed(1)},${(cy + 15 * Math.sin(rad)).toFixed(1)}`;
                    })
                    .join(" ")}
                />
              );
            })
          )}
        </g>
      );
      break;
    case 4: // zigzag bolts
      motif = (
        <g fill="none" stroke={color} strokeOpacity=".28" strokeWidth="1.3" strokeLinecap="round">
          {Array.from({ length: 3 }, (_, i) => {
            const x = 50 + i * 50;
            return <path key={i} d={`M${x} 52 l14 30 l-10 6 l16 34 l-14 -6 l-8 26`}
              transform={`rotate(${rot / 12 - 15 + i * 8} ${x} 100)`} />;
          })}
        </g>
      );
      break;
    case 5: // stacked waves
      motif = (
        <g fill="none" stroke={color} strokeOpacity=".26" strokeWidth="1.3">
          {Array.from({ length: 5 }, (_, i) => {
            const y = 56 + i * 24;
            const amp = 10 + (pick(h, 19 + i, 10));
            return <path key={i} d={`M-10 ${y} Q 45 ${y - amp} 100 ${y} T 210 ${y}`} strokeOpacity={0.3 - i * 0.04} />;
          })}
        </g>
      );
      break;
    case 6: // shards
      motif = (
        <g stroke={color} strokeOpacity=".3" strokeWidth="1.1" fill={color} fillOpacity=".08">
          {Array.from({ length: count }, (_, i) => {
            const a = ((rot + (360 / count) * i) * Math.PI) / 180;
            const cx = 100 + Math.cos(a) * radius * 0.7;
            const cy = 100 + Math.sin(a) * radius * 0.7;
            return <polygon key={i}
              points={`${cx},${cy - 16} ${cx + 11},${cy + 10} ${cx - 11},${cy + 10}`}
              transform={`rotate(${(rot + i * 47) % 360} ${cx} ${cy})`} />;
          })}
        </g>
      );
      break;
    default: // scattered orbs
      motif = (
        <g fill={color}>
          {Array.from({ length: count + 4 }, (_, i) => {
            const a = ((rot + i * 63) * Math.PI) / 180;
            const dist = 22 + ((i * 37) % Math.max(radius, 24));
            return <circle key={i}
              cx={100 + Math.cos(a) * dist}
              cy={100 + Math.sin(a) * dist}
              r={1.2 + (i % 3) * 0.7}
              fillOpacity={0.45 - i * 0.03} />;
          })}
          <circle cx="100" cy="100" r={radius * 0.42} fill="none" stroke={color} strokeOpacity=".2" strokeWidth="1" />
        </g>
      );
  }

  return (
    <svg viewBox="0 0 200 200" style={svgStyle} aria-hidden>
      <Wash color={color} uid={uid} cy={`${38 + (h % 20)}%`} opacity=".26" />
      {motif}
    </svg>
  );
}

/**
 * Backdrop for any title: the hand-drawn elemental art when one exists,
 * otherwise a motif derived from the key so every card still looks distinct.
 */
export function TitleBg({ titleKey, color, uid }: { titleKey: string } & BgProps) {
  const Hand = TITLE_BG[titleKey];
  if (Hand) return <Hand color={color} uid={uid} />;
  return <ProceduralBg color={color} uid={uid} seed={titleKey} />;
}
