export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calcLevel } from "@/lib/level";
import { ProfileFrame } from "@/components/profile/ProfileFrame";
import { Users, Trophy, Flame, ArrowUp, Zap, Film } from "lucide-react";

export const metadata: Metadata = { title: "Лидерборд — Kurox" };

const PRIZES_DATA = [
  { rank: 1, label: "Легенда сезона",   rarity: "Легендарный",
    color: "#39ff14", cx: "#aaff88", bg: "linear-gradient(148deg,#010a01,#000601)" },
  { rank: 2, label: "Вице-чемпион",     rarity: "Эпический",
    color: "#ff2244", cx: "#ff8899", bg: "linear-gradient(148deg,#0a0103,#050001)" },
  { rank: 3, label: "Бронзовый призёр", rarity: "Редкий",
    color: "#a855f7", cx: "#d8b4fe", bg: "linear-gradient(148deg,#05010a,#020006)" },
];

type User = {
  rank: number; id: string; name: string; image: string | null;
  profileFrame: string; xp: number; level: number;
  isPremium: boolean; isAdmin: boolean;
  activeTitle: { name: string; emoji: string; color: string; rarity: string } | null;
  episodes: number; animeCount: number; hours: number; mins: number;
};

async function getLeaderboard() {
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { bannedAt: null, xp: { gt: 0 } },
      orderBy: { xp: "desc" }, take: 100,
      select: {
        id: true, name: true, image: true, profileFrame: true,
        xp: true, isPremium: true, role: true,
        activeTitle: { select: { name: true, emoji: true, color: true, rarity: true } },
        _count: { select: { watchHistory: true } },
      },
    }),
    prisma.user.count({ where: { bannedAt: null, xp: { gt: 0 } } }),
  ]);
  const groups = await prisma.watchHistory.groupBy({
    by: ["userId", "animeId"],
    where: { userId: { in: users.map(u => u.id) } },
  });
  const animeMap = new Map<string, number>();
  for (const g of groups) animeMap.set(g.userId, (animeMap.get(g.userId) ?? 0) + 1);
  return {
    total,
    board: users.map((u, i) => {
      const eps = u._count.watchHistory;
      const m = eps * 24;
      return {
        rank: i + 1, id: u.id, name: u.name || "Аноним",
        image: u.image ?? null, profileFrame: u.profileFrame ?? "default",
        xp: u.xp, level: calcLevel(u.xp),
        isPremium: u.isPremium, isAdmin: u.role === "ADMIN",
        activeTitle: u.activeTitle ?? null,
        episodes: eps, animeCount: animeMap.get(u.id) ?? 0,
        hours: Math.floor(m / 60), mins: m % 60,
      } as User;
    }),
  };
}

const fmt = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}М` : n >= 1000 ? `${(n / 1000).toFixed(1)}к` : String(n);

function rankStyle(rank: number) {
  if (rank === 1) return { badge: "#f59e0b", glow: "rgba(245,158,11,.65)", rowBg: "rgba(245,158,11,.055)", bar: "#f59e0b,#fcd34d" };
  if (rank === 2) return { badge: "#a855f7", glow: "rgba(168,85,247,.5)",  rowBg: "rgba(139,92,246,.05)",  bar: "#a855f7,#c084fc" };
  if (rank === 3) return { badge: "#3b82f6", glow: "rgba(59,130,246,.5)",  rowBg: "rgba(59,130,246,.045)", bar: "#3b82f6,#60a5fa" };
  if (rank <= 10) return { badge: "#6d28d9", glow: "rgba(109,40,217,.35)", rowBg: "rgba(109,40,217,.025)", bar: "#7c3aed,#8b5cf6" };
  return { badge: "#22c55e", glow: "rgba(34,197,94,.3)", rowBg: "transparent", bar: "#16a34a,#22c55e" };
}

export default async function LeaderboardPage() {
  const [{ board, total }, session] = await Promise.all([getLeaderboard(), auth()]);
  const myId   = (session?.user as any)?.id;
  const myUser = myId ? board.find(u => u.id === myId) : undefined;
  const maxXp  = board[0]?.xp ?? 1;
  const toTop  = myUser && board[0] ? Math.max(0, board[0].xp - myUser.xp) : 0;

  return (
    <>
      <style>{`
        html { scroll-behavior: smooth; }

        .lb-wrap {
          max-width: 900px; margin: 0 auto;
          padding: 0 16px;
          padding-bottom: ${myUser ? "88px" : "48px"};
        }

        /* ── Header ── */
        .lb-header {
          position: relative; overflow: hidden;
          padding: 52px 28px 38px;
          background:
            linear-gradient(150deg, rgba(139,92,246,.10) 0%, transparent 45%),
            linear-gradient(200deg, rgba(57,255,20,.04) 0%, transparent 40%),
            var(--bg2);
          border-bottom: 1px solid var(--border);
        }
        .lb-header::before {
          content: "";
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(139,92,246,.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,.06) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: linear-gradient(135deg, transparent 20%, rgba(0,0,0,.7) 60%, transparent 100%);
          pointer-events: none;
        }
        .lb-header::after {
          content: "";
          position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent 3%, var(--accent) 35%, rgba(57,255,20,.4) 55%, rgba(139,92,246,.5) 70%, transparent 97%);
        }
        @keyframes headerOrb {
          0%,100% { opacity: .22; transform: scale(1); }
          50%      { opacity: .36; transform: scale(1.12); }
        }
        .lb-header-orb {
          position: absolute; right: 12%; top: 50%;
          transform: translateY(-50%);
          width: 260px; height: 260px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(139,92,246,.18) 0%, rgba(57,255,20,.05) 50%, transparent 70%);
          animation: headerOrb 4s ease-in-out infinite;
          pointer-events: none;
        }
        .lb-jp {
          position: absolute; right: -8px; top: 50%;
          transform: translateY(-50%);
          font-size: 130px; font-weight: 900; letter-spacing: -.04em;
          color: rgba(255,255,255,.042);
          user-select: none; pointer-events: none;
          white-space: nowrap; line-height: 1;
        }
        .lb-header-kicker {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 4px 10px; border-radius: 5px; margin-bottom: 14px;
          background: rgba(139,92,246,.10); border: 1px solid rgba(139,92,246,.22);
          font-family: 'Courier New', monospace;
          font-size: 9px; font-weight: 700; letter-spacing: .28em;
          color: var(--accent); text-transform: uppercase;
        }
        .lb-header-kicker-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 6px var(--accent);
        }
        .lb-stats-bar {
          display: flex; align-items: center; gap: 18px;
          margin-top: 18px; flex-wrap: wrap;
        }
        .lb-stat-chip {
          display: flex; align-items: center; gap: 5px;
          font-size: 12px; color: var(--text2);
        }
        .lb-stat-chip b { color: #fff; }
        .lb-stat-sep {
          width: 1px; height: 14px;
          background: var(--border);
        }
        /* ── Prizes section header ── */
        .lb-prizes-section {
          border-bottom: 1px solid var(--border);
        }
        .lb-prizes-header {
          display: flex; align-items: center; gap: 10px;
          padding: 20px 20px 0;
        }
        .lb-prizes-title {
          font-family: 'Courier New', monospace; font-size: 9px; font-weight: 700;
          letter-spacing: .28em; text-transform: uppercase; color: var(--text3);
        }
        .lb-prizes-line {
          flex: 1; height: 1px;
          background: linear-gradient(90deg, var(--border), transparent);
        }

        /* ── Prize title badges ── */
        .lb-prizes {
          display: flex; align-items: flex-end; justify-content: center;
          gap: 16px; padding: 28px 20px 32px;
        }
        .lb-prize-col {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
        }
        @keyframes titleBadgeScan {
          0%   { left: -70%; opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { left: 130%; opacity: 0; }
        }
        @keyframes titlePulse1 {
          0%,100% { box-shadow: 0 0 0 1px rgba(57,255,20,.40), 0 0 22px rgba(57,255,20,.30), 0 0 50px rgba(57,255,20,.10); }
          50%      { box-shadow: 0 0 0 2px rgba(57,255,20,.80), 0 0 40px rgba(57,255,20,.56), 0 0 90px rgba(57,255,20,.22); }
        }
        @keyframes titlePulse2 {
          0%,100% { box-shadow: 0 0 0 1px rgba(255,34,68,.34), 0 0 18px rgba(255,34,68,.24), 0 0 44px rgba(255,34,68,.09); }
          50%      { box-shadow: 0 0 0 2px rgba(255,34,68,.72), 0 0 34px rgba(255,34,68,.48), 0 0 76px rgba(255,34,68,.18); }
        }
        @keyframes titlePulse3 {
          0%,100% { box-shadow: 0 0 0 1px rgba(168,85,247,.32), 0 0 18px rgba(168,85,247,.22), 0 0 44px rgba(168,85,247,.09); }
          50%      { box-shadow: 0 0 0 2px rgba(168,85,247,.68), 0 0 34px rgba(168,85,247,.46), 0 0 76px rgba(168,85,247,.18); }
        }
        .lb-title-badge {
          position: relative; overflow: hidden; border-radius: 10px;
          display: flex; align-items: stretch; flex-shrink: 0;
        }
        .lb-title-badge-1 { width: 238px; height: 62px; animation: titlePulse1 2.5s ease-in-out infinite; }
        .lb-title-badge-2 { width: 206px; height: 52px; animation: titlePulse2 2.5s ease-in-out infinite .5s; }
        .lb-title-badge-3 { width: 206px; height: 52px; animation: titlePulse3 2.5s ease-in-out infinite 1s; }
        .lb-tbadge-rank {
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          width: 58px; border-right: 1px solid;
          font-family: 'Courier New', monospace; font-weight: 900; font-size: 20px;
        }
        .lb-title-badge-2 .lb-tbadge-rank,
        .lb-title-badge-3 .lb-tbadge-rank { width: 50px; font-size: 17px; }
        .lb-tbadge-name {
          flex: 1; display: flex; align-items: center; justify-content: center;
          font-family: 'Courier New', monospace; font-weight: 800; font-size: 12.5px;
          letter-spacing: .06em; text-transform: uppercase;
          padding: 0 12px; text-align: center; line-height: 1.25;
        }
        .lb-title-badge-2 .lb-tbadge-name,
        .lb-title-badge-3 .lb-tbadge-name { font-size: 11px; padding: 0 10px; }
        .lb-prize-meta {
          font-family: 'Courier New', monospace; font-size: 9px; font-weight: 700;
          letter-spacing: .18em; text-transform: uppercase; opacity: .62;
        }
        @media (max-width: 560px) {
          .lb-prizes { flex-direction: column; align-items: center; gap: 14px; padding: 24px 16px 22px; }
          .lb-title-badge-1 { width: min(270px, 90vw); }
          .lb-title-badge-2, .lb-title-badge-3 { width: min(248px, 90vw); height: 50px; }
        }

        /* ── Rows ── */
        .lb-list { border-bottom: 1px solid var(--border); }
        .lb-row {
          position: relative; overflow: hidden;
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255,255,255,.032);
          border-left: 3px solid transparent;
          transition: filter .12s;
        }
        .lb-row:hover { filter: brightness(1.07); }
        .lb-row-top1 { padding: 16px 18px; }
        .lb-row-top2, .lb-row-top3 { padding: 14px 16px; }

        /* Rank badge */
        .lb-rank {
          display: flex; align-items: center; justify-content: center;
          border-radius: 11px; flex-shrink: 0;
          font-weight: 900; font-family: 'Courier New', monospace;
        }
        .lb-rank-top { width: 46px; height: 46px; font-size: 22px; border-radius: 14px; }
        .lb-rank-mid { width: 40px; height: 40px; font-size: 19px; }
        .lb-rank-sm  { width: 36px; height: 36px; font-size: 15px; }
        .lb-rank-xs  { width: 32px; height: 32px; font-size: 13px; }

        @keyframes rankPulse {
          0%, 100% { box-shadow: 0 0 14px rgba(245,158,11,.55); }
          50%       { box-shadow: 0 0 32px rgba(245,158,11,.95), 0 0 0 5px rgba(245,158,11,.1); }
        }
        .lb-rank-pulse { animation: rankPulse 2.4s ease-in-out infinite; }

        @keyframes titleShimmer {
          0%   { background-position: 150% 0; }
          100% { background-position: -50% 0; }
        }

        /* Center column */
        .lb-center { flex: 1; min-width: 0; }
        .lb-name-row  { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 5px; }
        .lb-badge-row { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }

        .lb-lvl {
          display: inline-flex; align-items: center; gap: 3px;
          font-size: 10px; font-weight: 700;
          padding: 2px 7px; border-radius: 20px;
          background: rgba(245,158,11,.1); color: #fbbf24;
          border: 1px solid rgba(245,158,11,.2);
        }
        .lb-eps-chip {
          display: inline-flex; align-items: center; gap: 3px;
          font-size: 10px; font-weight: 600;
          padding: 2px 7px; border-radius: 20px;
          background: rgba(96,165,250,.08); color: #60a5fa;
          border: 1px solid rgba(96,165,250,.18);
        }
        .lb-anime-chip {
          display: inline-flex; align-items: center; gap: 3px;
          font-size: 10px; font-weight: 600;
          padding: 2px 7px; border-radius: 20px;
          background: rgba(139,92,246,.08); color: #a78bfa;
          border: 1px solid rgba(139,92,246,.18);
        }
        .lb-title {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 10px; font-weight: 700;
          padding: 2px 9px; border-radius: 20px;
          letter-spacing: .03em;
        }
        .lb-title-legendary {
          position: relative; overflow: hidden; font-weight: 800;
        }
        .lb-title-legendary::after {
          content: "";
          position: absolute; inset: 0; border-radius: inherit;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,.22) 50%, transparent 60%);
          background-size: 250% 100%;
          animation: titleShimmer 2.6s linear infinite;
          pointer-events: none;
        }
        .lb-adm {
          font-size: 9px; font-weight: 700;
          padding: 1px 5px; border-radius: 4px;
          background: rgba(239,68,68,.12); color: #fca5a5;
          border: 1px solid rgba(239,68,68,.2);
        }

        /* ── Anilibria-style XP card ── */
        @keyframes xpCardGlow {
          0%, 100% {
            box-shadow:
              0 0 0 1.5px rgba(57,255,20,.35),
              0 0 18px rgba(57,255,20,.28),
              0 0 40px rgba(57,255,20,.12),
              inset 0 0 18px rgba(0,200,50,.04);
          }
          50% {
            box-shadow:
              0 0 0 2px rgba(57,255,20,.72),
              0 0 28px rgba(57,255,20,.5),
              0 0 60px rgba(57,255,20,.22),
              0 0 100px rgba(57,255,20,.08),
              inset 0 0 28px rgba(0,200,50,.07);
          }
        }
        @keyframes orbit {
          from { transform: translate(-50%,-50%) rotate(0deg) translateX(var(--orb-r)); }
          to   { transform: translate(-50%,-50%) rotate(360deg) translateX(var(--orb-r)); }
        }
        @keyframes xpScan {
          0%   { transform: translateX(-160%) rotate(28deg); opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { transform: translateX(260%) rotate(28deg); opacity: 0; }
        }
        /* Outer wrapper that holds card + orbiting dots */
        .lb-xp-wrap {
          position: relative; flex-shrink: 0;
        }
        /* Orbiting particle dots */
        .lb-xp-orb {
          position: absolute; top: 50%; left: 50%;
          width: 5px; height: 5px;
          margin-left: -2.5px; margin-top: -2.5px;
          border-radius: 50%;
          background: #39ff14;
          box-shadow: 0 0 8px #39ff14, 0 0 18px rgba(57,255,20,.5);
          animation: orbit 2.8s linear infinite;
          pointer-events: none; z-index: 6;
        }
        .lb-xp-card {
          position: absolute; inset: 0;
          border-radius: 22px;
          background:
            radial-gradient(ellipse at 28% 18%, rgba(0,160,50,.22) 0%, transparent 55%),
            linear-gradient(145deg, #021205, #000c02);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          overflow: hidden;
          animation: xpCardGlow 2.4s ease-in-out infinite;
        }
        /* Glass highlight top */
        .lb-xp-card::before {
          content: "";
          position: absolute; top: 0; left: 0; right: 0; height: 48%;
          border-radius: 22px 22px 0 0;
          background: linear-gradient(180deg, rgba(255,255,255,.09) 0%, transparent 100%);
          pointer-events: none; z-index: 2;
        }
        /* Scanning diagonal light */
        .lb-xp-scan {
          position: absolute; top: -25%; left: 0;
          width: 30%; height: 150%;
          background: linear-gradient(90deg, transparent, rgba(57,255,20,.055) 50%, transparent);
          animation: xpScan 3.2s ease-in-out infinite;
          pointer-events: none; z-index: 2;
        }
        /* Circuit lines SVG */
        .lb-xp-circuit {
          position: absolute; inset: 0; pointer-events: none; z-index: 1;
        }
        /* Spinning SVG dashes */
        .lb-xp-svg {
          position: absolute; inset: 0; width: 100%; height: 100%;
          pointer-events: none; z-index: 3; overflow: visible;
        }
        .lb-xp-corner {
          position: absolute;
          width: 6px; height: 6px;
          background: #39ff14;
          transform: rotate(45deg);
          border-radius: 1px;
          top: 8px; left: 8px; z-index: 4;
          box-shadow: 0 0 7px #39ff14, 0 0 14px rgba(57,255,20,.4);
        }
        .lb-xp-label {
          font-family: 'Courier New', monospace;
          font-weight: 900; color: #fff;
          letter-spacing: -.01em; line-height: 1;
          position: relative; z-index: 5;
          text-shadow: 0 0 14px #39ff14, 0 0 28px rgba(57,255,20,.35);
        }
        .lb-xp-sub2 {
          display: flex; align-items: center; gap: 3px; justify-content: center;
          font-size: 9px; color: rgba(57,255,20,.65); margin-top: 3px;
          position: relative; z-index: 5;
        }

        /* Progress bar */
        .lb-bar {
          position: absolute; bottom: 0; left: 0; height: 2px;
          border-radius: 0 1px 0 0; opacity: .45;
        }
        .lb-row-top1 .lb-bar { height: 3px; opacity: .65; }

        /* Divider */
        .lb-divider {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 18px;
          background: var(--bg2);
          border-bottom: 1px solid var(--border);
        }
        .lb-divider span {
          font-family: 'Courier New', monospace;
          font-size: 9px; font-weight: 700; letter-spacing: .22em;
          color: var(--text3); text-transform: uppercase;
        }

        /* ── Sticky bottom bar ── */
        .lb-mybar {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
          background: rgba(13,12,17,.96);
          backdrop-filter: blur(24px) saturate(1.5);
          -webkit-backdrop-filter: blur(24px) saturate(1.5);
          border-top: 1px solid var(--border);
        }
        .lb-mybar-inner {
          max-width: 900px; margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between;
          padding: 11px 16px; gap: 10px;
        }
        .lb-mybar-left  { display: flex; align-items: center; gap: 9px; min-width: 0; }
        .lb-mybar-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .lb-mybar-rank {
          font-family: 'Courier New', monospace; font-weight: 900;
          font-size: 17px; color: var(--accent); flex-shrink: 0;
        }
        .lb-up-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 7px 14px; border-radius: 8px;
          background: rgba(139,92,246,.14); color: var(--accent);
          border: 1px solid rgba(139,92,246,.3);
          font-size: 12px; font-weight: 700; text-decoration: none;
          transition: background .14s;
        }
        .lb-up-btn:hover { background: rgba(139,92,246,.25); }

        /* Mobile */
        @media (max-width: 580px) {
          .lb-prizes { grid-template-columns: 1fr; }
          .lb-prize + .lb-prize { border-left: none; border-top: 1px solid var(--border); }
          .lb-jp { font-size: 64px; }
          .lb-header { padding: 36px 20px 28px; }
          .lb-anime-chip { display: none; }
          .lb-row { padding: 10px 10px; gap: 8px; }
          .lb-row-top1 { padding: 13px 12px; }
          .lb-mybar-inner { padding: 10px 12px; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { transition-duration: .01ms !important; animation: none !important; }
        }
      `}</style>

      <div id="lb-top" className="lb-wrap">

        {/* ── Header ── */}
        <div className="lb-header">
          <div aria-hidden className="lb-header-orb"/>
          <div aria-hidden className="lb-jp">ランキング</div>
          <div className="lb-header-kicker">
            <div className="lb-header-kicker-dot"/>
            KUROX · СЕЗОН 01
          </div>
          <h1 style={{
            fontSize: "clamp(30px, 5vw, 42px)", fontWeight: 900,
            letterSpacing: "-0.035em", color: "#fff", lineHeight: 1.05, margin: 0,
          }}>Лидерборд</h1>
          <p style={{ fontSize: 14, color: "var(--text2)", marginTop: 8, lineHeight: 1.5 }}>
            Топ зрителей по XP за текущий сезон
          </p>
          <div className="lb-stats-bar">
            <div className="lb-stat-chip">
              <Users size={12} />
              <b>{total.toLocaleString()}</b> участников
            </div>
            <div className="lb-stat-sep"/>
            <div className="lb-stat-chip">
              <Trophy size={12} />
              <b>3</b> призовых места
            </div>
            <div className="lb-stat-sep"/>
            <div className="lb-stat-chip">
              <Flame size={12} />
              сезон активен
            </div>
          </div>
        </div>

        {/* ── Prize title badges – podium order: 2nd / 1st / 3rd ── */}
        <div className="lb-prizes-section">
          <div className="lb-prizes-header">
            <span className="lb-prizes-title">🏆 призы за сезон</span>
            <div className="lb-prizes-line"/>
          </div>
        <div className="lb-prizes">
          {([PRIZES_DATA[1], PRIZES_DATA[0], PRIZES_DATA[2]]).map(p => (
            <div key={p.rank} className="lb-prize-col" style={{
              marginBottom: p.rank === 1 ? 30 : p.rank === 2 ? 12 : 0,
            }}>
              <div className={`lb-title-badge lb-title-badge-${p.rank}`} style={{ background: p.bg }}>
                {/* scan sweep */}
                <div style={{
                  position: "absolute", top: 0, left: "-70%", width: "38%", height: "100%",
                  background: "linear-gradient(90deg,transparent,rgba(255,255,255,.07) 50%,transparent)",
                  animation: "titleBadgeScan 4.8s ease-in-out infinite",
                  pointerEvents: "none", zIndex: 2,
                }}/>
                {/* subtle circuit traces */}
                <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:1 }}
                  viewBox="0 0 238 62" preserveAspectRatio="none">
                  <path d="M178 5 L205 5 L215 15" fill="none" stroke={p.color} strokeWidth="0.8" strokeOpacity="0.28"/>
                  <path d="M23 57 L50 57 L60 47"  fill="none" stroke={p.color} strokeWidth="0.8" strokeOpacity="0.20"/>
                  <circle cx="205" cy="5"  r="2"   fill={p.color} fillOpacity="0.26"/>
                  <circle cx="50"  cy="57" r="1.5" fill={p.color} fillOpacity="0.18"/>
                  <circle cx="195" cy="32" r="1"   fill={p.color} fillOpacity="0.14"/>
                  <circle cx="38"  cy="26" r="1"   fill={p.color} fillOpacity="0.11"/>
                  <path d="M218 28 L230 28 L230 52" fill="none" stroke={p.color} strokeWidth="0.7" strokeOpacity="0.16"/>
                  <circle cx="230" cy="52" r="1.5" fill={p.color} fillOpacity="0.14"/>
                  <path d="M8 10 L8 22 L18 22"   fill="none" stroke={p.color} strokeWidth="0.7" strokeOpacity="0.16"/>
                  <circle cx="8"  cy="10" r="1.5" fill={p.color} fillOpacity="0.14"/>
                </svg>
                {/* rank №N */}
                <div className="lb-tbadge-rank" style={{
                  color: p.cx,
                  borderColor: `${p.color}44`,
                  textShadow: `0 0 14px ${p.color}, 0 0 30px ${p.color}99`,
                  zIndex: 3,
                }}>
                  №{p.rank}
                </div>
                {/* title name */}
                <div className="lb-tbadge-name" style={{
                  color: p.cx,
                  textShadow: `0 0 10px ${p.color}, 0 0 22px ${p.color}77`,
                  zIndex: 3,
                }}>
                  {p.label}
                </div>
              </div>
              <span className="lb-prize-meta" style={{ color: p.color }}>
                {p.rarity} · сезонный титул
              </span>
            </div>
          ))}
        </div>
        </div>

        {/* ── Board ── */}
        {board.length === 0 ? (
          <div style={{ textAlign: "center", padding: "96px 0", color: "var(--text3)" }}>
            <p style={{ fontFamily: "'Courier New', monospace", fontSize: 11, letterSpacing: "0.3em", marginBottom: 12 }}>
              РЕЙТИНГ ПУСТ
            </p>
            <p style={{ fontSize: 14 }}>Смотри аниме и зарабатывай XP!</p>
          </div>
        ) : (
          <div className="lb-list">
            {board.map(u => {
              const isMe   = u.id === myId;
              const s      = rankStyle(u.rank);
              const isTop3 = u.rank <= 3;
              const isTop1 = u.rank === 1;
              const pct    = Math.max(3, Math.round((u.xp / maxXp) * 100));

              /* XP card sizing */
              const cardSize = isTop1 ? 72 : isTop3 ? 64 : 56;
              const cornerOffset = cardSize - 19; // distance between TL corner and TR/BL corner elements

              const rankClass =
                isTop1 ? "lb-rank lb-rank-top" :
                isTop3 ? "lb-rank lb-rank-mid" :
                u.rank <= 10 ? "lb-rank lb-rank-sm" :
                "lb-rank lb-rank-xs";

              const rowCls = `lb-row${isTop1 ? " lb-row-top1" : isTop3 ? ` lb-row-top${u.rank}` : ""}`;

              return (
                <div key={u.id}>
                  {u.rank === 11 && (
                    <div className="lb-divider">
                      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                      <span>За пределами топ-10</span>
                      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    </div>
                  )}

                  <div
                    className={rowCls}
                    style={{
                      background: isMe ? "rgba(139,92,246,.08)" : s.rowBg,
                      borderLeftColor: isTop3 ? s.badge : "transparent",
                    }}
                  >
                    {/* Rank badge */}
                    <div
                      className={`${rankClass}${isTop1 ? " lb-rank-pulse" : ""}`}
                      style={{
                        background: isTop3
                          ? `linear-gradient(145deg, ${s.badge}, ${s.badge}bb)`
                          : s.badge,
                        color: isTop1 ? "#000" : "#fff",
                        boxShadow: isTop3 ? `0 0 14px ${s.glow}` : undefined,
                      }}
                    >{u.rank}</div>

                    {/* Avatar */}
                    <ProfileFrame image={u.image} name={u.name} frame={u.profileFrame} size="sm" />

                    {/* Center */}
                    <div className="lb-center">
                      <div className="lb-name-row">
                        <span style={{
                          fontWeight: isTop3 ? 800 : 600,
                          fontSize: isTop3 ? 15 : 13,
                          color: "#fff",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {u.name}
                        </span>
                        {u.activeTitle && (() => {
                          const c = u.activeTitle.color || "#6b7280";
                          const r = u.activeTitle.rarity;
                          const isLeg  = r === "legendary";
                          const isEpic = r === "epic";
                          return (
                            <span
                              className={`lb-title${isLeg ? " lb-title-legendary" : ""}`}
                              style={{
                                background: isLeg
                                  ? `linear-gradient(90deg, ${c}40, ${c}25)`
                                  : isEpic ? `${c}30` : `${c}22`,
                                color: c,
                                border: `1px solid ${c}${isLeg ? "60" : isEpic ? "48" : "38"}`,
                                boxShadow: isLeg
                                  ? `0 0 12px ${c}40, 0 0 24px ${c}18`
                                  : isEpic ? `0 0 8px ${c}28` : undefined,
                              }}
                            >{u.activeTitle.name}</span>
                          );
                        })()}
                        {u.isAdmin && <span className="lb-adm">ADM</span>}
                      </div>
                      <div className="lb-badge-row">
                        <span className="lb-lvl"><Flame size={9} /> Ур.{u.level}</span>
                        <span className="lb-eps-chip"><Zap size={9} />{u.episodes} эп</span>
                        <span className="lb-anime-chip"><Film size={9} />{u.animeCount} тайтл</span>
                      </div>
                    </div>

                    {/* ── Anilibria-style XP card (wrapper with orbit) ── */}
                    <div
                      className="lb-xp-wrap"
                      style={{ width: cardSize, height: cardSize }}
                    >
                      {/* 3 orbiting neon dots */}
                      {([0, -0.93, -1.87] as number[]).map((delay, i) => (
                        <div
                          key={i}
                          className="lb-xp-orb"
                          style={{
                            "--orb-r": `${cardSize / 2 + 10}px`,
                            animationDelay: `${delay}s`,
                          } as React.CSSProperties}
                        />
                      ))}

                      {/* Main card */}
                      <div className="lb-xp-card">
                        {/* Diagonal scanning light */}
                        <div className="lb-xp-scan" />

                        {/* Circuit board lines */}
                        <svg className="lb-xp-circuit" viewBox="0 0 100 100" fill="none">
                          <path d="M63 12 L78 12 L90 24" stroke="#39ff14" strokeWidth="1" strokeOpacity=".45"/>
                          <circle cx="78" cy="12" r="2.5" fill="#39ff14" fillOpacity=".4"/>
                          <circle cx="90" cy="24" r="1.5" fill="#39ff14" fillOpacity=".28"/>
                          <path d="M12 72 L20 72 L20 86" stroke="#39ff14" strokeWidth="1" strokeOpacity=".38"/>
                          <circle cx="20" cy="72" r="2" fill="#39ff14" fillOpacity=".35"/>
                          <circle cx="74" cy="68" r="1.4" fill="#39ff14" fillOpacity=".25"/>
                          <circle cx="26" cy="28" r="1"   fill="#39ff14" fillOpacity=".2"/>
                          <circle cx="82" cy="48" r="1"   fill="#39ff14" fillOpacity=".18"/>
                        </svg>

                        {/* Spinning SVG dashed border */}
                        <svg className="lb-xp-svg" viewBox="0 0 100 100">
                          <rect x="4" y="4" width="92" height="92" rx="18" ry="18"
                            fill="none" stroke="#39ff14" strokeWidth="2.2"
                            strokeDasharray="9 5" strokeOpacity=".68">
                            <animate attributeName="stroke-dashoffset"
                              from="0" to="-56" dur="1.4s" repeatCount="indefinite"/>
                          </rect>
                        </svg>

                        {/* Corner diamonds */}
                        <div
                          className="lb-xp-corner"
                          style={{
                            boxShadow: `${cornerOffset}px 0 0 #39ff14, 0 ${cornerOffset}px 0 #39ff14, ${cornerOffset}px ${cornerOffset}px 0 #39ff14`,
                          }}
                        />

                        {/* XP number */}
                        <div style={{ textAlign: "center" }}>
                          <div
                            className="lb-xp-label"
                            style={{ fontSize: isTop1 ? 20 : isTop3 ? 17 : 14 }}
                          >
                            {fmt(u.xp)}
                          </div>
                          <div className="lb-xp-sub2">
                            <Trophy size={8} style={{ color: "#39ff14" }} />
                            {u.hours > 0 ? `${u.hours}ч` : "—"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div
                      className="lb-bar"
                      style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${s.bar})` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Sticky bottom bar ── */}
      {myUser && (
        <div className="lb-mybar">
          <div className="lb-mybar-inner">
            <div className="lb-mybar-left">
              <Trophy size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 500, flexShrink: 0 }}>Твоё место</span>
              <span className="lb-mybar-rank">#{myUser.rank}</span>
              <ProfileFrame image={myUser.image} name={myUser.name} frame={myUser.profileFrame} size="sm" />
              <span style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {myUser.name}
              </span>
            </div>
            <div className="lb-mybar-right">
              {toTop > 0 && (
                <span style={{ fontSize: 12, color: "var(--text2)", whiteSpace: "nowrap" }}>
                  до топа ещё{" "}
                  <b style={{ color: "var(--accent)" }}>{fmt(toTop)} XP</b>
                </span>
              )}
              <a href="#lb-top" className="lb-up-btn">
                <ArrowUp size={12} /> Наверх
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
