"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Flame, Check, Loader2, Gift, Clock } from "lucide-react";

interface Quest {
  id: string;
  key: string;
  title: string;
  description: string;
  emoji: string;
  type: string;
  targetCount: number;
  xpReward: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

interface QuestsData {
  streak: number;
  resetAt: string;
  quests: Quest[];
}

const pad = (n: number) => String(n).padStart(2, "0");

export function QuestsPanel() {
  const [data, setData] = useState<QuestsData | null>(null);
  const [error, setError] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null); // "+20 XP" toast text
  const [resetIn, setResetIn] = useState<number | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/quests");
      if (!res.ok) { setError(true); return; }
      setData(await res.json());
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Countdown to the daily MSK reset.
  useEffect(() => {
    if (!data?.resetAt) return;
    const end = new Date(data.resetAt).getTime();
    const tick = () => setResetIn(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data?.resetAt]);

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  const claim = useCallback(async (quest: Quest) => {
    if (claiming || quest.claimed || !quest.completed) return;
    setClaiming(quest.id);
    try {
      const res = await fetch("/api/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId: quest.id }),
      });
      const body = await res.json();
      if (res.ok && body.claimed) {
        setData(prev => prev ? {
          ...prev,
          streak: body.streak ?? prev.streak,
          quests: prev.quests.map(q => q.id === quest.id ? { ...q, claimed: true } : q),
        } : prev);
        setFlash(`+${body.xpAwarded} XP`);
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(null), 2200);
        // Header stats cache refresh (level/XP pill) picks this up on next open.
        window.dispatchEvent(new CustomEvent("questClaimed", { detail: body.xpAwarded }));
      } else {
        await load();
      }
    } catch {
      await load();
    } finally {
      setClaiming(null);
    }
  }, [claiming, load]);

  const hrs = resetIn != null ? Math.floor(resetIn / 3_600_000) : 0;
  const mins = resetIn != null ? Math.floor((resetIn % 3_600_000) / 60_000) : 0;
  const secs = resetIn != null ? Math.floor((resetIn % 60_000) / 1000) : 0;

  const doneCount = data?.quests.filter(q => q.completed).length ?? 0;
  const totalCount = data?.quests.length ?? 0;
  const claimable = data?.quests.some(q => q.completed && !q.claimed) ?? false;

  return (
    <div className="qp">
      <style>{`
        .qp { max-width: 720px; margin: 0 auto; }

        /* ── Top strip: streak + reset ── */
        .qp-top { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
        .qp-card {
          position: relative; overflow: hidden; padding: 16px 18px;
          border: 1px solid var(--border); border-radius: var(--radius);
          background: var(--surface);
        }
        .qp-streak {
          background:
            radial-gradient(120% 140% at 0% 0%, rgba(245,158,11,.14), transparent 55%),
            var(--surface);
        }
        .qp-label { font-family: 'Courier New', monospace; font-size: 9px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; color: var(--text3); }
        .qp-streak-val { display: flex; align-items: baseline; gap: 8px; margin-top: 8px; }
        .qp-streak-num { font-size: 30px; font-weight: 900; color: #fff; line-height: 1; font-variant-numeric: tabular-nums; }
        .qp-streak-u { font-size: 13px; color: var(--text2); font-weight: 600; }
        .qp-reset-val { display: flex; align-items: baseline; gap: 6px; margin-top: 8px; }
        .qp-reset-num { font-size: 26px; font-weight: 800; color: #fff; line-height: 1; font-variant-numeric: tabular-nums; }
        .qp-reset-colon { font-size: 22px; font-weight: 800; color: var(--text3); }

        /* ── Progress summary ── */
        .qp-summary { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; padding: 0 2px; }
        .qp-summary-t { font-size: 15px; font-weight: 800; color: #fff; }
        .qp-summary-c { font-size: 12px; color: var(--text2); font-variant-numeric: tabular-nums; }

        /* ── Quest cards ── */
        .qp-list { display: flex; flex-direction: column; gap: 10px; }
        .qp-quest {
          display: flex; align-items: center; gap: 13px; padding: 14px;
          border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface);
          transition: border-color .18s var(--ease-out), background-color .18s var(--ease-out);
        }
        .qp-quest[data-state="claimable"] { border-color: rgba(34,197,94,.4); background: rgba(34,197,94,.05); }
        .qp-quest[data-state="claimed"] { opacity: .62; }
        .qp-emoji {
          display: grid; place-items: center; flex-shrink: 0; width: 44px; height: 44px;
          font-size: 22px; border-radius: 12px; background: var(--surface2); border: 1px solid var(--border); line-height: 1;
        }
        .qp-body { flex: 1; min-width: 0; }
        .qp-q-title { font-size: 14px; font-weight: 700; color: #fff; }
        .qp-q-desc { font-size: 12px; color: var(--text2); margin-top: 1px; }
        .qp-bar-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
        .qp-bar { flex: 1; height: 6px; border-radius: 20px; background: var(--surface2); overflow: hidden; border: 1px solid var(--border); }
        .qp-bar-fill { height: 100%; border-radius: 20px; transition: width .5s var(--ease-out); }
        .qp-bar-count { font-size: 11px; font-weight: 700; color: var(--text2); font-variant-numeric: tabular-nums; flex-shrink: 0; min-width: 34px; text-align: right; }
        .qp-action { flex-shrink: 0; }
        .qp-claim {
          display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
          min-height: 38px; padding: 0 15px; border-radius: 10px; border: none;
          font-size: 12.5px; font-weight: 800; white-space: nowrap;
          background: var(--green); color: #04140a;
          box-shadow: 0 5px 16px -6px rgba(34,197,94,.7);
          transition: filter .14s var(--ease-out), transform .14s var(--ease-out);
        }
        .qp-claim:hover { filter: brightness(1.08); }
        .qp-claim:active { transform: translateY(1px); }
        .qp-claim:disabled { cursor: default; }
        .qp-reward-idle {
          display: inline-flex; align-items: center; gap: 5px; min-height: 38px; padding: 0 13px;
          border-radius: 10px; font-size: 12px; font-weight: 700; color: #c4b5fd;
          background: var(--accent-dim); border: 1px solid rgba(139,92,246,.28); white-space: nowrap; font-variant-numeric: tabular-nums;
        }
        .qp-claimed {
          display: inline-flex; align-items: center; gap: 5px; min-height: 38px; padding: 0 13px;
          border-radius: 10px; font-size: 12px; font-weight: 700; color: #86efac;
          background: var(--green-dim); border: 1px solid rgba(34,197,94,.28); white-space: nowrap;
        }

        .qp-skel { height: 72px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); }
        .qp-flash {
          position: fixed; left: 50%; bottom: 84px; transform: translateX(-50%); z-index: 60;
          display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 12px;
          background: var(--green); color: #04140a; font-weight: 800; font-size: 14px;
          box-shadow: 0 12px 30px -8px rgba(34,197,94,.6); animation: qpFlash .25s var(--ease-out);
          font-variant-numeric: tabular-nums;
        }
        @keyframes qpFlash { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }

        @media (max-width: 480px) {
          .qp-top { grid-template-columns: 1fr; }
          .qp-q-desc { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .qp *, .qp *::before, .qp *::after { animation: none !important; transition-duration: .01ms !important; }
        }
      `}</style>

      {/* ── Streak + reset ── */}
      <div className="qp-top">
        <div className="qp-card qp-streak">
          <div className="qp-label"><Flame size={11} style={{ display: "inline", marginRight: 5, color: "#f59e0b" }} />Серия дней</div>
          <div className="qp-streak-val">
            <span className="qp-streak-num">{data ? data.streak : "—"}</span>
            <span className="qp-streak-u">{data && data.streak === 1 ? "день подряд" : "дней подряд"}</span>
          </div>
        </div>
        <div className="qp-card">
          <div className="qp-label"><Clock size={11} style={{ display: "inline", marginRight: 5 }} />Обновление через</div>
          <div className="qp-reset-val">
            <span className="qp-reset-num">{resetIn == null ? "--" : pad(hrs)}</span>
            <span className="qp-reset-colon">:</span>
            <span className="qp-reset-num">{resetIn == null ? "--" : pad(mins)}</span>
            <span className="qp-reset-colon">:</span>
            <span className="qp-reset-num">{resetIn == null ? "--" : pad(secs)}</span>
          </div>
        </div>
      </div>

      {/* ── Summary ── */}
      <div className="qp-summary">
        <span className="qp-summary-t">Дейлики</span>
        {data && (
          <span className="qp-summary-c">
            {claimable ? "есть награда к получению · " : ""}{doneCount}/{totalCount} выполнено
          </span>
        )}
      </div>

      {/* ── Quests ── */}
      {error ? (
        <div className="qp-card" style={{ textAlign: "center", color: "var(--text2)" }}>
          Не удалось загрузить квесты. <button onClick={load} style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Повторить</button>
        </div>
      ) : !data ? (
        <div className="qp-list">
          {[1, 2, 3, 4].map(i => <div key={i} className="qp-skel shimmer" />)}
        </div>
      ) : (
        <div className="qp-list">
          {data.quests.map(q => {
            const pct = Math.min(100, Math.round((q.progress / q.targetCount) * 100));
            const state = q.claimed ? "claimed" : q.completed ? "claimable" : "progress";
            const barColor = q.completed ? "linear-gradient(90deg,#16a34a,#22c55e)" : "linear-gradient(90deg,#7c3aed,#a78bfa)";
            return (
              <div key={q.id} className="qp-quest" data-state={state}>
                <div className="qp-emoji" aria-hidden>{q.emoji}</div>
                <div className="qp-body">
                  <div className="qp-q-title">{q.title}</div>
                  <div className="qp-q-desc">{q.description}</div>
                  <div className="qp-bar-row">
                    <div className="qp-bar"><div className="qp-bar-fill" style={{ width: `${pct}%`, background: barColor }} /></div>
                    <span className="qp-bar-count">{Math.min(q.progress, q.targetCount)}/{q.targetCount}</span>
                  </div>
                </div>
                <div className="qp-action">
                  {q.claimed ? (
                    <span className="qp-claimed"><Check size={13} /> Получено</span>
                  ) : q.completed ? (
                    <button
                      className="qp-claim"
                      onClick={() => claim(q)}
                      disabled={claiming === q.id}
                      aria-label={`Забрать ${q.xpReward} XP за квест «${q.title}»`}
                    >
                      {claiming === q.id ? <Loader2 size={13} className="animate-spin" /> : <Gift size={13} />}
                      +{q.xpReward} XP
                    </button>
                  ) : (
                    <span className="qp-reward-idle">+{q.xpReward} XP</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {flash && <div className="qp-flash"><Gift size={15} /> {flash}</div>}
    </div>
  );
}
