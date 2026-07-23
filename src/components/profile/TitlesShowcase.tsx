"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Award, Lock, Loader2, Check, ChevronDown, ExternalLink, Sparkles, Crown, Gem, Star, Shield } from "lucide-react";
import Link from "next/link";

interface AnimeReq { slug: string; name: string; episodes: number }
interface ShowcaseTitle {
  id: string; name: string; emoji: string; color: string; rarity: string;
  description: string | null; animeSlug: string | null; animeTitle: string | null;
  minEpisodes: number; totalEpisodes: number; requiresAnime: AnimeReq[] | null;
  animated: boolean; earned: boolean;
}
interface TitlesShowcaseProps { allTitles: ShowcaseTitle[]; activeTitleId: string | null; isAdmin?: boolean; }

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return { r: 139, g: 92, b: 246 };
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
}

const RARITY_META: Record<string, { label: string; icon: React.ReactNode; tier: number }> = {
  legendary: { label: "Легендарный", icon: <Crown size={10}/>, tier: 0 },
  epic:      { label: "Эпический",   icon: <Gem   size={10}/>, tier: 1 },
  rare:      { label: "Редкий",      icon: <Star  size={10}/>, tier: 2 },
  common:    { label: "Обычный",     icon: <Shield size={10}/>, tier: 3 },
};

function RequirementsBlock({ title }: { title: ShowcaseTitle }) {
  const c = title.color;
  if (title.requiresAnime?.length) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        <p style={{ fontSize:9, fontWeight:700, letterSpacing:"0.1em", color:"rgba(255,255,255,.3)", margin:0, textTransform:"uppercase" }}>Нужно посмотреть:</p>
        {title.requiresAnime.map(r => (
          <Link key={r.slug} href={`/anime/${r.slug}`} onClick={e=>e.stopPropagation()}
            style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"4px 8px", borderRadius:7, gap:6, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", textDecoration:"none" }}>
            <span style={{ fontSize:10, color:"rgba(255,255,255,.5)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.name}</span>
            <span style={{ fontSize:9, fontWeight:700, color:c, flexShrink:0, display:"flex", alignItems:"center", gap:2 }}>{r.episodes} эп <ExternalLink size={7}/></span>
          </Link>
        ))}
      </div>
    );
  }
  if (title.totalEpisodes > 0)
    return <p style={{ fontSize:10, color:"rgba(255,255,255,.4)", textAlign:"center", margin:0 }}>Посмотри <b style={{ color:c }}>{title.totalEpisodes} серий</b> любого аниме</p>;
  if (title.animeSlug)
    return <p style={{ fontSize:10, color:"rgba(255,255,255,.4)", textAlign:"center", margin:0 }}>Посмотри <Link href={`/anime/${title.animeSlug}`} onClick={e=>e.stopPropagation()} style={{ color:c, textDecoration:"underline dotted" }}>{title.animeTitle ?? title.animeSlug}</Link>{title.minEpisodes > 1 && ` — ${title.minEpisodes} серий`}</p>;
  return null;
}

// ── Rarity-specific SVG decorations ─────────────────────────────────────────

function LegendaryBg({ color, uid }: { color: string; uid: string }) {
  return (
    <svg viewBox="0 0 200 200" style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }} aria-hidden>
      <defs>
        <radialGradient id={`lg1-${uid}`} cx="50%" cy="30%"><stop offset="0%" stopColor={color} stopOpacity=".35"/><stop offset="100%" stopColor={color} stopOpacity="0"/></radialGradient>
        <radialGradient id={`lg2-${uid}`} cx="80%" cy="80%"><stop offset="0%" stopColor={color} stopOpacity=".2"/><stop offset="100%" stopColor={color} stopOpacity="0"/></radialGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#lg1-${uid})`}/>
      <circle cx="160" cy="160" r="80" fill={`url(#lg2-${uid})`}/>
      {/* Crown outline */}
      <path d="M70 140 L70 105 L90 118 L100 95 L110 118 L130 105 L130 140 Z" fill="none" stroke={color} strokeWidth="1.5" strokeOpacity=".3"/>
      {/* Stars */}
      {[[28,32],[170,28],[18,140],[182,155],[100,170]].map(([cx,cy],i)=>(
        <circle key={i} cx={cx} cy={cy} r={i===4?2:1.5} fill={color} fillOpacity={.5+i*.05}/>
      ))}
      {[[55,60],[145,50],[35,110],[165,100]].map(([cx,cy],i)=>(
        <circle key={i} cx={cx} cy={cy} r={1} fill={color} fillOpacity={.4}/>
      ))}
      {/* Large crown center glow */}
      <circle cx="100" cy="118" r="32" fill={color} fillOpacity=".08"/>
    </svg>
  );
}

function EpicBg({ color, uid }: { color: string; uid: string }) {
  return (
    <svg viewBox="0 0 200 200" style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }} aria-hidden>
      <defs>
        <radialGradient id={`ep1-${uid}`} cx="50%" cy="50%"><stop offset="0%" stopColor={color} stopOpacity=".3"/><stop offset="100%" stopColor={color} stopOpacity="0"/></radialGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#ep1-${uid})`}/>
      {/* Diamond */}
      <path d="M100 60 L128 100 L100 148 L72 100 Z" fill="none" stroke={color} strokeWidth="1.5" strokeOpacity=".35"/>
      <path d="M100 75 L118 100 L100 130 L82 100 Z" fill={color} fillOpacity=".12"/>
      {/* Hex lines */}
      {[30,60,90,120,150].map((y,i)=>(
        <line key={i} x1="0" y1={y} x2="200" y2={y} stroke={color} strokeWidth=".6" strokeOpacity=".1"/>
      ))}
      {[30,60,90,120,150,180].map((x,i)=>(
        <line key={i} x1={x} y1="0" x2={x} y2="200" stroke={color} strokeWidth=".6" strokeOpacity=".1"/>
      ))}
    </svg>
  );
}

function RareBg({ color, uid }: { color: string; uid: string }) {
  return (
    <svg viewBox="0 0 200 200" style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }} aria-hidden>
      <defs>
        <radialGradient id={`rr1-${uid}`} cx="30%" cy="60%"><stop offset="0%" stopColor={color} stopOpacity=".28"/><stop offset="100%" stopColor={color} stopOpacity="0"/></radialGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#rr1-${uid})`}/>
      {/* Crystal */}
      <polygon points="100,55 120,90 100,130 80,90" fill="none" stroke={color} strokeWidth="1.5" strokeOpacity=".35"/>
      <polygon points="100,70 113,92 100,115 87,92" fill={color} fillOpacity=".12"/>
      {/* Orbit rings */}
      <ellipse cx="100" cy="100" rx="55" ry="20" fill="none" stroke={color} strokeWidth="1" strokeOpacity=".2" strokeDasharray="4 6"/>
      <ellipse cx="100" cy="100" rx="30" ry="55" fill="none" stroke={color} strokeWidth="1" strokeOpacity=".2" strokeDasharray="4 6"/>
    </svg>
  );
}

function CommonBg({ color, uid }: { color: string; uid: string }) {
  return (
    <svg viewBox="0 0 200 200" style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }} aria-hidden>
      <defs>
        <radialGradient id={`cm1-${uid}`} cx="50%" cy="40%"><stop offset="0%" stopColor={color} stopOpacity=".2"/><stop offset="100%" stopColor={color} stopOpacity="0"/></radialGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#cm1-${uid})`}/>
      <circle cx="100" cy="95" r="38" fill="none" stroke={color} strokeWidth="1.2" strokeOpacity=".25"/>
      <circle cx="100" cy="95" r="24" fill="none" stroke={color} strokeWidth=".8" strokeOpacity=".15"/>
    </svg>
  );
}

function LockedBg() {
  return (
    <svg viewBox="0 0 200 200" style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }} aria-hidden>
      {[30,60,90,120,150].map((y,i)=>(
        <line key={i} x1="0" y1={y} x2="200" y2={y} stroke="rgba(255,255,255,.025)" strokeWidth="1"/>
      ))}
      {[30,60,90,120,150,180].map((x,i)=>(
        <line key={i} x1={x} y1="0" x2={x} y2="200" stroke="rgba(255,255,255,.025)" strokeWidth="1"/>
      ))}
    </svg>
  );
}

// ── TitleCard ─────────────────────────────────────────────────────────────────

function TitleCard({ title, isActive, isSaving, claimState, claimError, onEquip, onClaim, isAdmin }: {
  title: ShowcaseTitle; isActive: boolean; isSaving: boolean;
  claimState:"idle"|"loading"|"success"|"error"; claimError:string;
  onEquip:()=>void; onClaim:()=>void; isAdmin?: boolean;
}) {
  const [showReqs, setShowReqs] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { r, g, b } = hexToRgb(title.color);
  const rgb = `${r},${g},${b}`;

  const isLeg = title.rarity === "legendary";
  const isEpic = title.rarity === "epic";
  const isRare = title.rarity === "rare";
  const meta = RARITY_META[title.rarity] ?? RARITY_META.common;

  // Background — locked cards show a dim version of the real design for motivation
  const bgBase = isLeg
    ? title.earned
      ? `linear-gradient(160deg, rgba(${rgb},.20) 0%, #0a0909 60%, rgba(${rgb},.09) 100%)`
      : `linear-gradient(160deg, rgba(${rgb},.14) 0%, #0a0909 60%, rgba(${rgb},.06) 100%)`
    : isEpic
    ? title.earned
      ? `linear-gradient(160deg, rgba(${rgb},.16) 0%, #0b0a10 60%, rgba(${rgb},.07) 100%)`
      : `linear-gradient(160deg, rgba(${rgb},.11) 0%, #0b0a10 60%, rgba(${rgb},.05) 100%)`
    : isRare
    ? title.earned
      ? `linear-gradient(160deg, rgba(${rgb},.13) 0%, #09090f 65%, rgba(${rgb},.06) 100%)`
      : `linear-gradient(160deg, rgba(${rgb},.09) 0%, #09090f 65%, rgba(${rgb},.04) 100%)`
    : title.earned
      ? `linear-gradient(160deg, rgba(${rgb},.09) 0%, #0a0a0c 70%, rgba(${rgb},.04) 100%)`
      : `linear-gradient(160deg, rgba(${rgb},.07) 0%, #0a0a0c 70%, rgba(${rgb},.03) 100%)`;

  const borderColor = isActive
    ? title.color
    : title.earned
      ? `rgba(${rgb},.45)`
      : `rgba(${rgb},.2)`;

  const glowShadow = isActive
    ? `0 0 0 1px ${title.color}50, 0 0 30px rgba(${rgb},.45), 0 4px 20px rgba(0,0,0,.7)`
    : title.earned
      ? isLeg
        ? `0 0 40px rgba(${rgb},.3), 0 4px 20px rgba(0,0,0,.6)`
        : `0 0 24px rgba(${rgb},.18), 0 4px 16px rgba(0,0,0,.5)`
      : hovered
        ? `0 0 20px rgba(${rgb},.18), 0 4px 16px rgba(0,0,0,.6)`
        : `0 2px 12px rgba(0,0,0,.5)`;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 18, overflow: "hidden",
        display: "flex", flexDirection: "column",
        position: "relative",
        border: `1.5px solid ${borderColor}`,
        background: bgBase,
        boxShadow: glowShadow,
        transform: hovered ? "translateY(-4px) scale(1.02)" : "translateY(0) scale(1)",
        transition: "transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s, border-color .2s",
        cursor: "default",
        minHeight: 0,
      }}
    >
      {/* SVG decorative background — always shown, dimmed when locked */}
      <div style={{ opacity: (title.earned || isAdmin) ? 1 : 0.75, position:"absolute", inset:0 }}>
        {isLeg  ? <LegendaryBg color={title.color} uid={title.id}/>
        : isEpic ? <EpicBg    color={title.color} uid={title.id}/>
        : isRare ? <RareBg    color={title.color} uid={title.id}/>
        :          <CommonBg  color={title.color} uid={title.id}/>}
      </div>

      {/* Shimmer for earned legendary */}
      {isLeg && title.earned && <div className="tc-shimmer" aria-hidden/>}

      {/* Top accent bar — always colored, dimmed when locked */}
      <div style={{
        height: isLeg ? 3 : 2,
        background: isLeg
          ? `linear-gradient(90deg, transparent, ${title.color}, ${title.color}cc, transparent)`
          : title.color,
        boxShadow: `0 0 ${title.earned ? 12 : 6}px ${title.color}${title.earned ? "80" : "40"}`,
        opacity: title.earned ? 1 : 0.5,
        position: "relative", zIndex: 1,
      }}/>

      {/* Rarity badge — top right, always colored */}
      <div style={{
        position: "absolute", top: 10, right: 10, zIndex: 10,
        display: "flex", alignItems: "center", gap: 3,
        padding: "3px 7px", borderRadius: 99,
        background: `rgba(${rgb},${title.earned ? .16 : .10})`,
        border: `1px solid rgba(${rgb},${title.earned ? .3 : .2})`,
        color: title.earned ? title.color : `rgba(${rgb},1)`,
        opacity: title.earned ? 1 : 0.7,
        fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
      }}>
        {meta.icon}
        {meta.label.toUpperCase()}
      </div>

      {/* Lock badge — top left, for unearned non-admin */}
      {!title.earned && !isAdmin && (
        <div style={{
          position: "absolute", top: 10, left: 10, zIndex: 10,
          display: "flex", alignItems: "center",
          padding: "3px 6px", borderRadius: 99,
          background: "rgba(0,0,0,.6)",
          border: "1px solid rgba(255,255,255,.07)",
          color: "rgba(255,255,255,.25)", fontSize: 9,
        }}>
          <Lock size={9}/>
        </div>
      )}

      {/* Active indicator */}
      {isActive && (
        <div style={{
          position: "absolute", top: 10, left: 10, zIndex: 10,
          display: "flex", alignItems: "center", gap: 4,
          padding: "3px 8px", borderRadius: 99,
          background: "rgba(74,222,128,.15)", border: "1px solid rgba(74,222,128,.4)",
          color: "#4ade80", fontSize: 9, fontWeight: 800,
        }}>
          <Check size={9}/> НАДЕТ
        </div>
      )}

      {/* MAIN BODY */}
      <div style={{
        padding: isLeg ? "36px 18px 20px" : "34px 16px 18px",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 10, flex: 1, position: "relative", zIndex: 1,
      }}>
        {/* Emoji */}
        {title.emoji && (
          <div style={{
            fontSize: isLeg ? 28 : isEpic ? 24 : 20,
            lineHeight: 1,
            opacity: (title.earned || isAdmin) ? 1 : 0.35,
            filter: (title.earned || isAdmin) ? `drop-shadow(0 0 8px ${title.color}80)` : "none",
            transition: "all .2s",
          }}>
            {title.emoji}
          </div>
        )}

        {/* Title name — always colored, dimmed when locked */}
        <div style={{
          fontSize: isLeg ? 17 : isEpic ? 15.5 : 14.5,
          fontWeight: 900,
          letterSpacing: isLeg ? "0.1em" : "0.05em",
          textTransform: "uppercase",
          textAlign: "center",
          lineHeight: 1.2,
          color: title.color,
          opacity: (title.earned || isAdmin) ? 1 : 0.45,
          textShadow: isLeg
            ? `0 0 20px ${title.color}${title.earned?"90":"50"}, 0 0 50px ${title.color}${title.earned?"40":"20"}`
            : isEpic
              ? `0 0 14px ${title.color}${title.earned?"70":"35"}`
              : `0 0 8px ${title.color}${title.earned?"50":"28"}`,
          transition: "all .2s",
        }}>
          {title.name}
        </div>

        {/* Description */}
        {title.description && title.earned && (
          <p style={{
            fontSize: 10.5, color: "rgba(255,255,255,.35)",
            textAlign: "center", margin: 0, lineHeight: 1.5,
            fontStyle: "italic",
          }}>
            {title.description}
          </p>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ padding: "0 12px 12px", position: "relative", zIndex: 1 }}>
        {(title.earned || (isAdmin && claimState === "success")) ? (
          <button type="button" onClick={onEquip} disabled={isSaving}
            style={{
              width: "100%", padding: "9px 0", borderRadius: 11,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              background: isActive
                ? "rgba(74,222,128,.14)"
                : `linear-gradient(135deg, rgba(${rgb},.22), rgba(${rgb},.10))`,
              border: `1.5px solid ${isActive ? "rgba(74,222,128,.5)" : `rgba(${rgb},.5)`}`,
              color: isActive ? "#4ade80" : title.color,
              fontSize: 11, fontWeight: 900, cursor: isSaving ? "wait" : "pointer",
              letterSpacing: "0.06em",
              boxShadow: isActive
                ? "0 0 14px rgba(74,222,128,.22)"
                : `0 0 12px rgba(${rgb},.2)`,
              transition: "all .15s",
            }}>
            {isSaving
              ? <><Loader2 size={11} className="animate-spin"/>Сохраняем...</>
              : isActive ? <><Check size={11}/>Снять</>
              : <><Sparkles size={11}/>Надеть</>}
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {/* How to get — only for non-admins */}
            {!isAdmin && (
              <>
                <button type="button" onClick={() => setShowReqs(s => !s)}
                  style={{
                    width: "100%", padding: "5px 0", borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                    background: "transparent", border: "1px solid rgba(255,255,255,.07)",
                    color: "rgba(255,255,255,.25)", fontSize: 10, fontWeight: 600, cursor: "pointer",
                    transition: "all .15s",
                  }}>
                  <Lock size={9}/> Как получить?
                  <ChevronDown size={9} style={{ transform: showReqs ? "rotate(180deg)" : "none", transition: "transform .2s" }}/>
                </button>

                {showReqs && (
                  <div style={{ padding: "3px 1px 1px" }}>
                    <RequirementsBlock title={title}/>
                  </div>
                )}
              </>
            )}

            {claimState === "error" && claimError && (
              <p style={{ fontSize: 10, color: "#f87171", textAlign: "center", margin: 0 }}>{claimError}</p>
            )}

            <button type="button" onClick={onClaim}
              disabled={claimState === "loading" || claimState === "success"}
              style={{
                width: "100%", padding: "10px 0", borderRadius: 11,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                background: claimState === "success"
                  ? "rgba(74,222,128,.14)"
                  : isLeg
                    ? `linear-gradient(135deg, rgba(${rgb},.5) 0%, rgba(${rgb},.25) 100%)`
                    : `linear-gradient(135deg, rgba(${rgb},.4) 0%, rgba(${rgb},.18) 100%)`,
                border: `1.5px solid ${claimState === "success" ? "rgba(74,222,128,.5)" : `rgba(${rgb},.6)`}`,
                color: claimState === "success" ? "#4ade80" : title.color,
                fontSize: 11, fontWeight: 900, letterSpacing: "0.07em",
                cursor: claimState === "loading" || claimState === "success" ? "not-allowed" : "pointer",
                opacity: claimState === "loading" ? 0.7 : 1,
                boxShadow: claimState !== "success" ? `0 4px 18px rgba(${rgb},.35)` : undefined,
                transition: "all .15s",
              }}>
              {claimState === "loading" ? <><Loader2 size={11} className="animate-spin"/>Проверяем...</>
                : claimState === "success" ? <><Check size={11}/>Получен!</>
                : <>✦ ПОЛУЧИТЬ</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main showcase ─────────────────────────────────────────────────────────────

export function TitlesShowcase({ allTitles, activeTitleId, isAdmin }: TitlesShowcaseProps) {
  const { update: updateSession } = useSession();
  const [activeId, setActiveId] = useState<string|null>(activeTitleId);
  const [savingId, setSavingId] = useState<string|null>(null);
  const [claimStates, setClaimStates] = useState<Record<string,"idle"|"loading"|"success"|"error">>({});
  const [claimErrors, setClaimErrors] = useState<Record<string,string>>({});
  const [globalError, setGlobalError] = useState("");
  const [filter, setFilter] = useState("all");
  const [claimingAll, setClaimingAll] = useState(false);

  const earnedCount = allTitles.filter(t => t.earned).length;
  const rarityOrder: Record<string, number> = { legendary:0, epic:1, rare:2, common:3 };
  const sorted = [...allTitles].sort((a, b) => {
    if (a.earned !== b.earned) return a.earned ? -1 : 1;
    return (rarityOrder[a.rarity] ?? 4) - (rarityOrder[b.rarity] ?? 4);
  });
  const filtered = filter === "all" ? sorted
    : filter === "earned" ? sorted.filter(t => t.earned)
    : sorted.filter(t => t.rarity === filter);

  async function handleEquip(id: string) {
    if (savingId) return;
    const next = activeId === id ? null : id;
    setSavingId(id); setGlobalError("");
    try {
      const res = await fetch("/api/profile/title", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ titleId: next }) });
      if (!res.ok) { const d = await res.json().catch(()=>({})); setGlobalError(d.error || "Ошибка"); return; }
      setActiveId(next);
      await updateSession(); // обновляем сессию чтобы шапка сайта показала новый титул
    } catch { setGlobalError("Ошибка соединения"); }
    finally { setSavingId(null); }
  }

  async function handleClaimAll() {
    const unearnedIds = allTitles.filter(t => !t.earned).map(t => t.id);
    if (!unearnedIds.length) return;
    setClaimingAll(true);
    setGlobalError("");
    for (const id of unearnedIds) {
      setClaimStates(s => ({ ...s, [id]: "loading" }));
      try {
        const res = await fetch("/api/titles/claim", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ titleId: id }) });
        if (res.ok) setClaimStates(s => ({ ...s, [id]: "success" }));
        else setClaimStates(s => ({ ...s, [id]: "idle" }));
      } catch { setClaimStates(s => ({ ...s, [id]: "idle" })); }
    }
    setClaimingAll(false);
    setTimeout(() => window.location.reload(), 800);
  }

  async function handleClaim(id: string) {
    setClaimStates(s => ({ ...s, [id]: "loading" }));
    setClaimErrors(e => ({ ...e, [id]: "" }));
    try {
      const res = await fetch("/api/titles/claim", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ titleId: id }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setClaimStates(s => ({ ...s, [id]: "error" }));
        setClaimErrors(e => ({ ...e, [id]: data.error || "Нельзя получить" }));
        setTimeout(() => setClaimStates(s => ({ ...s, [id]: "idle" })), 5000);
      } else {
        setClaimStates(s => ({ ...s, [id]: "success" }));
        setTimeout(() => window.location.reload(), 900);
      }
    } catch {
      setClaimStates(s => ({ ...s, [id]: "error" }));
      setClaimErrors(e => ({ ...e, [id]: "Ошибка соединения" }));
      setTimeout(() => setClaimStates(s => ({ ...s, [id]: "idle" })), 5000);
    }
  }

  if (allTitles.length === 0) return null;

  const filterBtns = [
    { key:"all",       label:"Все",          count: allTitles.length },
    { key:"earned",    label:"Получены",     count: earnedCount },
    { key:"legendary", label:"Легендарные",  count: null },
    { key:"epic",      label:"Эпические",    count: null },
    { key:"rare",      label:"Редкие",       count: null },
    { key:"common",    label:"Обычные",      count: null },
  ];

  return (
    <div style={{ marginTop: 28 }} id="titles">
      <style>{`
        @keyframes tcShimmer {
          0%   { transform:translateX(-160%) skewX(-10deg); opacity:0 }
          10%  { opacity:1 }
          90%  { opacity:1 }
          100% { transform:translateX(300%) skewX(-10deg); opacity:0 }
        }
        .tc-shimmer {
          position:absolute; inset:0; z-index:0; pointer-events:none; overflow:hidden; border-radius:18px;
        }
        .tc-shimmer::after {
          content:""; position:absolute; top:0; left:0; width:25%; height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.09),transparent);
          animation:tcShimmer 3.5s ease-in-out infinite;
        }
        @media (prefers-reduced-motion:reduce) { .tc-shimmer::after { animation:none; } }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <Award size={15} style={{ color:"#fbbf24" }}/>
          <span style={{ fontWeight:800, fontSize:14 }}>Коллекция титулов</span>
          <span style={{ fontSize:10, fontWeight:800, padding:"2px 9px", borderRadius:99, background:"rgba(251,191,36,.12)", color:"#fbbf24", border:"1px solid rgba(251,191,36,.25)" }}>
            {earnedCount} / {allTitles.length}
          </span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {globalError && <span style={{ fontSize:11, color:"#f87171" }}>{globalError}</span>}
          {isAdmin && earnedCount < allTitles.length && (
            <button type="button" onClick={handleClaimAll} disabled={claimingAll}
              style={{
                display:"flex", alignItems:"center", gap:5, padding:"5px 12px", borderRadius:9,
                background:"linear-gradient(135deg,rgba(139,92,246,.4),rgba(139,92,246,.2))",
                border:"1.5px solid rgba(139,92,246,.5)", color:"#c4b5fd",
                fontSize:11, fontWeight:800, cursor:claimingAll?"wait":"pointer",
                letterSpacing:"0.04em", transition:"all .15s",
              }}>
              {claimingAll ? <><Loader2 size={11} className="animate-spin"/>Получаем...</> : <>⚡ Получить все</>}
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:2, marginBottom:16, flexWrap:"wrap", background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:12, padding:"3px" }}>
        {filterBtns.map(btn => (
          <button key={btn.key} type="button" onClick={() => setFilter(btn.key)}
            style={{
              padding:"4px 12px", borderRadius:9, fontSize:10.5, fontWeight:700,
              cursor:"pointer", transition:"all .15s", display:"flex", alignItems:"center", gap:4,
              background: filter === btn.key ? "var(--accent)" : "transparent",
              color: filter === btn.key ? "#fff" : "rgba(255,255,255,.35)",
              border: "none",
              boxShadow: filter === btn.key ? "0 2px 10px rgba(139,92,246,.35)" : undefined,
            }}>
            {btn.label}
            {btn.count !== null && (
              <span style={{ fontSize:9, fontWeight:900, padding:"1px 5px", borderRadius:99, background:filter===btn.key?"rgba(255,255,255,.2)":"rgba(255,255,255,.07)", color:filter===btn.key?"#fff":"rgba(255,255,255,.3)" }}>
                {btn.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
        {filtered.map(t => (
          <TitleCard key={t.id} title={t}
            isActive={activeId === t.id} isSaving={savingId === t.id}
            claimState={claimStates[t.id] ?? "idle"} claimError={claimErrors[t.id] ?? ""}
            onEquip={() => handleEquip(t.id)} onClaim={() => handleClaim(t.id)}
            isAdmin={isAdmin}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign:"center", padding:"48px 0", color:"rgba(255,255,255,.2)", fontSize:13 }}>
          Ничего не найдено
        </div>
      )}
    </div>
  );
}
