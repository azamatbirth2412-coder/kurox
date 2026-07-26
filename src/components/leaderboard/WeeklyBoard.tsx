"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProfileFrame } from "@/components/profile/ProfileFrame";
import { Trophy, Flame, Zap, Film, ArrowUp, Loader2 } from "lucide-react";
import type { BoardRow, WeeklyCategory } from "@/lib/leaderboard";

interface CategoryTab { id: WeeklyCategory; label: string; unit: string }

interface Props {
  categories: CategoryTab[];
  initialCategory: WeeklyCategory;
  initialBoard: BoardRow[];
  weekEndIso: string;
  myId?: string;
}

const fmt = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}М` : n >= 1000 ? `${(n / 1000).toFixed(1)}к` : String(n);

const pad = (n: number) => String(n).padStart(2, "0");

// Gold / silver / bronze for the podium, violet for the rest of the top-10.
function rankStyle(rank: number) {
  if (rank === 1) return { badge: "#f59e0b", glow: "rgba(245,158,11,.55)", row: "rgba(245,158,11,.05)" };
  if (rank === 2) return { badge: "#cbd5e1", glow: "rgba(203,213,225,.4)", row: "rgba(203,213,225,.04)" };
  if (rank === 3) return { badge: "#d97706", glow: "rgba(217,119,6,.42)", row: "rgba(217,119,6,.04)" };
  if (rank <= 10) return { badge: "#7c3aed", glow: "rgba(124,58,237,.34)", row: "rgba(124,58,237,.03)" };
  return { badge: "#3a3850", glow: "transparent", row: "transparent" };
}

function metricLabel(cat: WeeklyCategory, row: BoardRow) {
  if (cat === "level") return { value: String(row.metric), unit: "уровень" };
  if (cat === "episodes") return { value: fmt(row.metric), unit: "серий" };
  return { value: fmt(row.metric), unit: "XP" };
}

export function WeeklyBoard({ categories, initialCategory, initialBoard, weekEndIso, myId }: Props) {
  const [category, setCategory] = useState<WeeklyCategory>(initialCategory);
  const [board, setBoard] = useState<BoardRow[]>(initialBoard);
  const [loading, setLoading] = useState(false);
  const cache = useRef<Map<WeeklyCategory, BoardRow[]>>(new Map([[initialCategory, initialBoard]]));

  // ── Countdown (client-only to avoid hydration mismatch) ──
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const end = new Date(weekEndIso).getTime();
    const tick = () => setRemaining(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [weekEndIso]);

  const switchCategory = useCallback(async (next: WeeklyCategory) => {
    if (next === category) return;
    setCategory(next);
    const cached = cache.current.get(next);
    if (cached) { setBoard(cached); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard/weekly?category=${next}`);
      const data = await res.json();
      const rows: BoardRow[] = Array.isArray(data.board) ? data.board : [];
      cache.current.set(next, rows);
      setBoard(rows);
    } catch {
      setBoard([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  const me = myId ? board.find(r => r.id === myId) : undefined;
  const leader = board[0];
  const toTop = me && leader ? Math.max(0, leader.metric - me.metric) : 0;
  const activeUnit = categories.find(c => c.id === category)?.unit ?? "XP";

  const days = remaining != null ? Math.floor(remaining / 86_400_000) : 0;
  const hrs = remaining != null ? Math.floor((remaining % 86_400_000) / 3_600_000) : 0;
  const mins = remaining != null ? Math.floor((remaining % 3_600_000) / 60_000) : 0;
  const secs = remaining != null ? Math.floor((remaining % 60_000) / 1000) : 0;

  return (
    <div className="wb-wrap" id="wb-top">
      <style>{`
        .wb-wrap { max-width: 900px; margin: 0 auto; padding: 0 16px ${me ? "88px" : "48px"}; }

        /* ── Banner ── */
        .wb-banner {
          position: relative; overflow: hidden;
          margin-top: 20px; padding: 30px 26px;
          border: 1px solid var(--border); border-radius: var(--radius-lg);
          background:
            radial-gradient(120% 140% at 12% -10%, rgba(139,92,246,.16), transparent 55%),
            radial-gradient(120% 140% at 100% 120%, rgba(245,158,11,.08), transparent 50%),
            var(--surface);
        }
        .wb-kicker {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 4px 10px; border-radius: 5px; margin-bottom: 14px;
          background: var(--accent-dim); border: 1px solid rgba(139,92,246,.24);
          font-family: 'Courier New', monospace; font-size: 9px; font-weight: 700;
          letter-spacing: .26em; color: #c4b5fd; text-transform: uppercase;
        }
        .wb-kicker-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); }
        .wb-title { font-size: clamp(24px, 4.4vw, 34px); font-weight: 900; letter-spacing: -.03em; color: #fff; line-height: 1.06; margin: 0; }
        .wb-sub { font-size: 14px; color: var(--text2); margin-top: 8px; max-width: 46ch; }

        /* ── Countdown ── */
        .wb-count { display: flex; align-items: center; gap: 8px; margin-top: 18px; flex-wrap: wrap; }
        .wb-count-label {
          font-family: 'Courier New', monospace; font-size: 9px; font-weight: 700;
          letter-spacing: .2em; text-transform: uppercase; color: var(--text3); margin-right: 4px;
        }
        .wb-count-seg {
          display: flex; flex-direction: column; align-items: center;
          min-width: 46px; padding: 7px 8px; border-radius: 9px;
          background: var(--bg2); border: 1px solid var(--border);
        }
        .wb-count-num { font-size: 20px; font-weight: 800; color: #fff; line-height: 1; font-variant-numeric: tabular-nums; }
        .wb-count-u { font-size: 8.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--text3); margin-top: 4px; }
        .wb-count-colon { font-size: 18px; font-weight: 800; color: var(--text3); }

        /* ── Rewards ── */
        .wb-rewards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 20px; }
        .wb-reward {
          position: relative; overflow: hidden; padding: 16px 14px 15px;
          border-radius: var(--radius); border: 1px solid var(--border); background: var(--surface);
        }
        .wb-reward-rank {
          display: inline-flex; align-items: center; gap: 5px;
          font-family: 'Courier New', monospace; font-size: 10px; font-weight: 800;
          letter-spacing: .1em; text-transform: uppercase;
        }
        .wb-reward-name { font-size: 14px; font-weight: 800; color: #fff; margin-top: 8px; line-height: 1.2; }
        .wb-reward-desc { font-size: 11.5px; color: var(--text2); margin-top: 4px; line-height: 1.4; }
        .wb-reward-hero::after {
          content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 1px;
          background: linear-gradient(135deg, #fde68a, #f59e0b 45%, #b45309 60%, #fde68a);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none;
          animation: wbHeroPulse 2.6s ease-in-out infinite;
        }
        @keyframes wbHeroPulse { 0%,100% { opacity: .55; } 50% { opacity: 1; } }

        /* ── Tabs ── */
        .wb-tabs { display: flex; gap: 4px; margin-top: 26px; padding: 4px; border-radius: 11px; background: var(--bg2); border: 1px solid var(--border); overflow-x: auto; }
        .wb-tab {
          flex: 1; min-width: max-content; white-space: nowrap;
          padding: 9px 14px; border-radius: 8px; border: none; cursor: pointer;
          font-size: 13px; font-weight: 700; color: var(--text2); background: transparent;
          transition: color .15s var(--ease-out), background-color .15s var(--ease-out);
        }
        .wb-tab:hover { color: #fff; }
        .wb-tab[aria-selected="true"] { color: #fff; background: var(--accent); box-shadow: 0 4px 14px -4px rgba(139,92,246,.6); }

        /* ── List ── */
        .wb-list { margin-top: 12px; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; position: relative; }
        .wb-row {
          display: flex; align-items: center; gap: 12px; padding: 11px 14px;
          border-bottom: 1px solid rgba(255,255,255,.035); border-left: 3px solid transparent;
          transition: filter .12s var(--ease-out);
        }
        .wb-row:last-child { border-bottom: none; }
        .wb-row:hover { filter: brightness(1.08); }
        .wb-rank {
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          width: 34px; height: 34px; border-radius: 10px;
          font-family: 'Courier New', monospace; font-weight: 900; font-size: 14px;
          font-variant-numeric: tabular-nums;
        }
        .wb-center { flex: 1; min-width: 0; }
        .wb-name { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .wb-name-txt { font-weight: 700; font-size: 14px; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
        .wb-chips { display: flex; align-items: center; gap: 6px; margin-top: 4px; flex-wrap: wrap; }
        .wb-chip {
          display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 700;
          padding: 2px 7px; border-radius: 20px; border: 1px solid; font-variant-numeric: tabular-nums;
        }
        .wb-hero-badge {
          display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 800;
          padding: 2px 8px; border-radius: 20px; letter-spacing: .02em;
          color: #fcd34d; background: linear-gradient(90deg, rgba(245,158,11,.28), rgba(245,158,11,.12));
          border: 1px solid rgba(245,158,11,.55);
        }
        .wb-adm { font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 4px; color: #fca5a5; background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.2); }
        .wb-metric { text-align: right; flex-shrink: 0; }
        .wb-metric-num { font-size: 17px; font-weight: 900; color: #fff; line-height: 1; font-variant-numeric: tabular-nums; }
        .wb-metric-u { font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--text3); margin-top: 3px; }

        .wb-empty { text-align: center; padding: 72px 16px; color: var(--text3); }
        .wb-empty-code { font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: .3em; margin-bottom: 10px; }
        .wb-loading { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(13,12,17,.55); backdrop-filter: blur(2px); z-index: 4; }

        /* ── My sticky bar ── */
        .wb-mybar {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
          background: rgba(13,12,17,.96);
          backdrop-filter: blur(24px) saturate(1.5); -webkit-backdrop-filter: blur(24px) saturate(1.5);
          border-top: 1px solid var(--border);
        }
        .wb-mybar-inner { max-width: 900px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 16px; }
        .wb-mybar-left { display: flex; align-items: center; gap: 9px; min-width: 0; }
        .wb-mybar-rank { font-family: 'Courier New', monospace; font-weight: 900; font-size: 17px; color: var(--accent); font-variant-numeric: tabular-nums; }
        .wb-up {
          display: inline-flex; align-items: center; gap: 5px; padding: 7px 13px; border-radius: 8px;
          background: var(--accent-dim); color: #c4b5fd; border: 1px solid rgba(139,92,246,.3);
          font-size: 12px; font-weight: 700; text-decoration: none; transition: background-color .14s var(--ease-out);
        }
        .wb-up:hover { background: rgba(139,92,246,.25); }

        @media (max-width: 560px) {
          .wb-rewards { grid-template-columns: 1fr; }
          .wb-banner { padding: 24px 18px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .wb-wrap *, .wb-wrap *::before, .wb-wrap *::after { animation: none !important; transition-duration: .01ms !important; }
        }
      `}</style>

      {/* ── Banner + countdown ── */}
      <div className="wb-banner">
        <div className="wb-kicker"><span className="wb-kicker-dot" /> KUROX · НЕДЕЛЬНЫЙ ТУРНИР</div>
        <h1 className="wb-title">Соревнуйся каждую неделю — получай награды</h1>
        <p className="wb-sub">
          Смотри аниме, выполняй дейлики и поднимайся в топе. Каждый понедельник в 00:00 МСК счёт обнуляется — у всех новый шанс.
        </p>
        <div className="wb-count">
          <span className="wb-count-label">До сброса</span>
          <div className="wb-count-seg"><span className="wb-count-num">{remaining == null ? "—" : days}</span><span className="wb-count-u">дн</span></div>
          <span className="wb-count-colon">:</span>
          <div className="wb-count-seg"><span className="wb-count-num">{remaining == null ? "--" : pad(hrs)}</span><span className="wb-count-u">час</span></div>
          <span className="wb-count-colon">:</span>
          <div className="wb-count-seg"><span className="wb-count-num">{remaining == null ? "--" : pad(mins)}</span><span className="wb-count-u">мин</span></div>
          <span className="wb-count-colon">:</span>
          <div className="wb-count-seg"><span className="wb-count-num">{remaining == null ? "--" : pad(secs)}</span><span className="wb-count-u">сек</span></div>
        </div>
      </div>

      {/* ── Rewards ── */}
      <div className="wb-rewards">
        <div className="wb-reward wb-reward-hero">
          <span className="wb-reward-rank" style={{ color: "#f59e0b" }}><Trophy size={12} /> Топ-1</span>
          <div className="wb-reward-name">🏆 Титул «Герой недели»</div>
          <div className="wb-reward-desc">Эксклюзивный легендарный титул + 30 дней Premium</div>
        </div>
        <div className="wb-reward">
          <span className="wb-reward-rank" style={{ color: "#cbd5e1" }}><Trophy size={12} /> Топ-3</span>
          <div className="wb-reward-name">🥈 Подиум сезона</div>
          <div className="wb-reward-desc">Крупный XP-бонус и место на пьедестале недели</div>
        </div>
        <div className="wb-reward">
          <span className="wb-reward-rank" style={{ color: "#a78bfa" }}><Zap size={12} /> Топ-10</span>
          <div className="wb-reward-name">⚡ XP-бонус</div>
          <div className="wb-reward-desc">Бонусный опыт и значок участника топа недели</div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="wb-tabs" role="tablist" aria-label="Категории лидерборда">
        {categories.map(c => (
          <button
            key={c.id}
            role="tab"
            aria-selected={category === c.id}
            className="wb-tab"
            onClick={() => switchCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* ── List ── */}
      <div className="wb-list">
        {loading && <div className="wb-loading"><Loader2 size={22} className="animate-spin" style={{ color: "var(--accent)" }} /></div>}
        {board.length === 0 ? (
          <div className="wb-empty">
            <p className="wb-empty-code">РЕЙТИНГ ПУСТ</p>
            <p style={{ fontSize: 14 }}>Смотри аниме и выполняй дейлики — попади в топ первым!</p>
          </div>
        ) : (
          board.map(row => {
            const s = rankStyle(row.rank);
            const isMe = row.id === myId;
            const isHero = category === "active" && row.rank === 1;
            const m = metricLabel(category, row);
            return (
              <div
                key={row.id}
                className="wb-row"
                style={{ background: isMe ? "rgba(139,92,246,.08)" : s.row, borderLeftColor: row.rank <= 3 ? s.badge : "transparent" }}
              >
                <div
                  className="wb-rank"
                  style={{
                    background: row.rank <= 10 ? `linear-gradient(145deg, ${s.badge}, ${s.badge}bb)` : "var(--surface2)",
                    color: row.rank === 1 ? "#1a1206" : row.rank <= 10 ? "#fff" : "var(--text2)",
                    boxShadow: row.rank <= 3 ? `0 0 14px ${s.glow}` : undefined,
                  }}
                >
                  {row.rank}
                </div>

                <ProfileFrame image={row.image} name={row.name} frame={row.profileFrame} size="sm" />

                <div className="wb-center">
                  <div className="wb-name">
                    <span className="wb-name-txt">{row.name}</span>
                    {isHero && <span className="wb-hero-badge"><Trophy size={9} /> Герой недели</span>}
                    {row.activeTitle && !isHero && (() => {
                      const c = row.activeTitle.color || "#9ca3af";
                      return (
                        <span className="wb-chip" style={{ color: c, background: `${c}1f`, borderColor: `${c}55` }}>
                          {row.activeTitle.emoji} {row.activeTitle.name}
                        </span>
                      );
                    })()}
                    {row.isAdmin && <span className="wb-adm">ADM</span>}
                  </div>
                  <div className="wb-chips">
                    <span className="wb-chip" style={{ color: "#fbbf24", background: "rgba(245,158,11,.1)", borderColor: "rgba(245,158,11,.22)" }}>
                      <Flame size={9} /> Ур.{row.level}
                    </span>
                    {category !== "active" && (
                      <span className="wb-chip" style={{ color: "#a78bfa", background: "rgba(139,92,246,.08)", borderColor: "rgba(139,92,246,.2)" }}>
                        <Zap size={9} /> {fmt(row.xp)} XP
                      </span>
                    )}
                  </div>
                </div>

                <div className="wb-metric">
                  <div className="wb-metric-num">{m.value}</div>
                  <div className="wb-metric-u">{m.unit}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── My sticky bar ── */}
      {me && (
        <div className="wb-mybar">
          <div className="wb-mybar-inner">
            <div className="wb-mybar-left">
              <Trophy size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 500, flexShrink: 0 }}>Твоё место</span>
              <span className="wb-mybar-rank">#{me.rank}</span>
              <ProfileFrame image={me.image} name={me.name} frame={me.profileFrame} size="sm" />
              <span style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{me.name}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              {toTop > 0 && (
                <span style={{ fontSize: 12, color: "var(--text2)", whiteSpace: "nowrap" }}>
                  до топа <b style={{ color: "var(--accent)" }}>{fmt(toTop)} {activeUnit}</b>
                </span>
              )}
              <a href="#wb-top" className="wb-up"><ArrowUp size={12} /> Наверх</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
