"use client";

import { useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

export const FRAMES = {
  default:   { name: "Стандарт",       colors: null,                                                                    speed: 0  },
  eclipse:   { name: "Затмение",        colors: ["#050005","#6b0000","#dc143c","#ff69b4","#c71585","#8b0000","#050005"], speed: 5  },
  arrows:    { name: "Стрелы",          colors: ["#111","#555","#ccc","#fff","#aaa","#444","#111"],                      speed: 60 },
  soul:      { name: "Душа",            colors: ["#080808","#151515","#2a2a2a","#0f0f0f","#1a1a1a","#0a0a0a","#080808"], speed: 12 },
  thorns:    { name: "Шипы",            colors: ["#0a0a0a","#111","#1a1a1a","#0a0a0a","#101010","#080808","#0f0f0f"],    speed: 60 },
  firering:  { name: "Огненное кольцо", colors: ["#b34000","#ff6b00","#ffd700","#ff8c00","#ffcc00","#ff4500","#b34000"], speed: 2  },
  starlight: { name: "Корона",           colors: ["#7a5c00","#c9920a","#ffd700","#f5c518","#c9920a","#8a6500","#7a5c00"], speed: 8  },
  vortex:    { name: "Вихрь",           colors: ["#0d0d0d","#222","#444","#1a1a1a","#333","#111","#0d0d0d"],             speed: 4  },
  nebula:    { name: "Туманность",      colors: ["#1a0030","#6a0dad","#a855f7","#7c3aed","#9b59b6","#6a0dad","#1a0030"], speed: 7  },
  smoke:     { name: "Дым",             colors: ["#111","#333","#777","#bbb","#666","#2a2a2a","#111"],                   speed: 10 },
} as const;

export type FrameId = keyof typeof FRAMES;

interface ProfileFrameProps {
  image?: string | null;
  name: string;
  frame?: string;
  size?: "sm" | "md" | "lg";
}

const C = 80;
const SIZES = {
  sm: { avatarPx: 36, borderWidth: 6, gapWidth: 2 },
  md: { avatarPx: 52, borderWidth: 7, gapWidth: 2 },
  lg: { avatarPx: 86, borderWidth: 8, gapWidth: 2 },
};

// ─── ECLIPSE ─────────────────────────────────────────────────────────────────
function EclipseDecoration() {
  // Flares: angle from 12-o'clock, how far they shoot outward
  const flares = [
    { deg: 32,  reach: 32, w: 6,   op: 0.95, delay: 0   },
    { deg: 212, reach: 34, w: 6,   op: 0.95, delay: 0.5 },
    { deg: 52,  reach: 22, w: 3.5, op: 0.75, delay: 0.2 },
    { deg: 232, reach: 20, w: 3.5, op: 0.75, delay: 0.7 },
    { deg: 14,  reach: 14, w: 2,   op: 0.5,  delay: 0.9 },
    { deg: 194, reach: 16, w: 2,   op: 0.5,  delay: 1.1 },
    { deg: 68,  reach: 10, w: 1.5, op: 0.4,  delay: 1.4 },
    { deg: 248, reach: 12, w: 1.5, op: 0.4,  delay: 0.3 },
  ];
  return (
    <>
      <defs>
        <filter id="ec-bloom" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="9" result="b1" />
          <feGaussianBlur stdDeviation="3" result="b2" in="SourceGraphic" />
          <feMerge>
            <feMergeNode in="b1" /><feMergeNode in="b1" />
            <feMergeNode in="b2" /><feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="ec-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Wide outer haze */}
      <circle cx={C} cy={C} r={54} fill="none" stroke="#cc0055" strokeWidth={32} opacity={0.09} filter="url(#ec-bloom)" />

      {/* Main glowing ring */}
      <circle cx={C} cy={C} r={52} fill="none" stroke="#ff1080" strokeWidth={4} filter="url(#ec-bloom)">
        <animate attributeName="stroke-width" values="2.5;6;2.5" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;1;0.8" dur="2.4s" repeatCount="indefinite" />
      </circle>

      {/* Sharp highlight edge */}
      <circle cx={C} cy={C} r={52} fill="none" stroke="#ffb0d0" strokeWidth={0.8}>
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2.4s" repeatCount="indefinite" />
      </circle>

      {/* Radial light flares — shoot outward from ring surface */}
      {flares.map((f, i) => {
        const a = (f.deg - 90) * Math.PI / 180;
        const rx = C + 52 * Math.cos(a), ry = C + 52 * Math.sin(a);
        const ex = rx + f.reach * Math.cos(a), ey = ry + f.reach * Math.sin(a);
        return (
          <g key={i} style={{ animation: `svgFade ${2.4 + f.delay * 0.25}s ease-in-out infinite`, animationDelay: `${f.delay}s` }}>
            <line x1={rx} y1={ry} x2={ex} y2={ey}
              stroke="#ff1080" strokeWidth={f.w * 3.5} strokeLinecap="round"
              opacity={f.op * 0.3} filter="url(#ec-soft)" />
            <line x1={rx} y1={ry} x2={ex} y2={ey}
              stroke="#ffb0d0" strokeWidth={f.w * 0.45} strokeLinecap="round"
              opacity={f.op} />
          </g>
        );
      })}

      {/* Sparkle dots around outer ring */}
      {[0, 72, 144, 216, 288].map((deg, i) => {
        const a = (deg - 90) * Math.PI / 180;
        return (
          <circle key={i} cx={C + 68 * Math.cos(a)} cy={C + 68 * Math.sin(a)} r={1.6}
            fill="#ff69b4" opacity={0.65}
            style={{ animation: `svgFade ${1.4 + i * 0.4}s ease-in-out infinite`, animationDelay: `${i * 0.38}s` }} />
        );
      })}
    </>
  );
}

// ─── ARROWS ──────────────────────────────────────────────────────────────────
function ArrowsDecoration() {
  function Arrow({ deg }: { deg: number }) {
    const a = (deg - 90) * Math.PI / 180;
    const t = a + Math.PI / 2;
    const r = 57;
    const bx = C + r * Math.cos(a), by = C + r * Math.sin(a);
    const hl = 11, fl = 0.44;
    const tx = bx + Math.cos(t) * hl, ty = by + Math.sin(t) * hl;
    const bx2 = bx - Math.cos(t) * hl, by2 = by - Math.sin(t) * hl;
    return (
      <g stroke="#fff" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1={bx2} y1={by2} x2={tx} y2={ty} strokeWidth={2.5} />
        <line x1={tx - 9*Math.cos(t-fl)} y1={ty - 9*Math.sin(t-fl)} x2={tx} y2={ty} strokeWidth={2.5} />
        <line x1={tx - 9*Math.cos(t+fl)} y1={ty - 9*Math.sin(t+fl)} x2={tx} y2={ty} strokeWidth={2.5} />
        <line x1={bx2} y1={by2} x2={bx2 + 7*Math.cos(t-fl)} y2={by2 + 7*Math.sin(t-fl)} strokeWidth={1.5} opacity={0.6} />
        <line x1={bx2} y1={by2} x2={bx2 + 7*Math.cos(t+fl)} y2={by2 + 7*Math.sin(t+fl)} strokeWidth={1.5} opacity={0.6} />
      </g>
    );
  }

  const ticks = Array.from({length: 60}, (_, i) => {
    const a = (i * 6 - 90) * Math.PI / 180;
    const near = [0, 15, 30, 45].some(p => Math.abs(i - p) <= 2 || Math.abs(i - p - 60) <= 2);
    if (near) return null;
    const major = i % 5 === 0;
    return { a, r1: 52, r2: 52 + (major ? 9 : 4.5), w: major ? 1.5 : 0.7, op: major ? 0.9 : 0.38 };
  }).filter(Boolean);

  return (
    <g>
      <animateTransform attributeName="transform" type="rotate"
        from={`0 ${C} ${C}`} to={`360 ${C} ${C}`} dur="22s" repeatCount="indefinite" />
      {ticks.map((t, i) => (
        <line key={i}
          x1={C + t!.r1 * Math.cos(t!.a)} y1={C + t!.r1 * Math.sin(t!.a)}
          x2={C + t!.r2 * Math.cos(t!.a)} y2={C + t!.r2 * Math.sin(t!.a)}
          stroke="#fff" strokeWidth={t!.w} opacity={t!.op} strokeLinecap="round" />
      ))}
      {[0, 90, 180, 270].map(d => <Arrow key={d} deg={d} />)}
      {[45, 135, 225, 315].map(deg => {
        const a = (deg - 90) * Math.PI / 180;
        const x = C + 62 * Math.cos(a), y = C + 62 * Math.sin(a);
        return (
          <g key={deg}>
            <line x1={x-5} y1={y} x2={x+5} y2={y} stroke="#fff" strokeWidth={1.5} opacity={0.7} />
            <line x1={x} y1={y-5} x2={x} y2={y+5} stroke="#fff" strokeWidth={1.5} opacity={0.7} />
          </g>
        );
      })}
    </g>
  );
}

// ─── SOUL ────────────────────────────────────────────────────────────────────
function SoulDecoration() {
  // 4-pointed star helper
  function Sparkle({ x, y, r, op = 1 }: { x: number; y: number; r: number; op?: number }) {
    const s = r * 0.18;
    return <path d={`M${x},${y-r}L${x+s},${y-s}L${x+r},${y}L${x+s},${y+s}L${x},${y+r}L${x-s},${y+s}L${x-r},${y}L${x-s},${y-s}Z`} fill="#e8e8e8" opacity={op} />;
  }
  // Bezier bead positions along garland M(C-40,C-32) Q(C,C-12) (C+40,C-32)
  const beads = Array.from({length: 9}, (_, i) => {
    const t = (i + 1) / 10;
    return {
      x: (1-t)*(1-t)*(C-40) + 2*t*(1-t)*C + t*t*(C+40),
      y: (1-t)*(1-t)*(C-32) + 2*t*(1-t)*(C-12) + t*t*(C-32),
    };
  });
  const dots = [
    {x:C-60,y:C-18},{x:C+62,y:C-12},{x:C-48,y:C+42},{x:C+52,y:C+44},
    {x:C-68,y:C+8},{x:C+70,y:C+20},{x:C+12,y:C-66},{x:C-16,y:C+67},
    {x:C+42,y:C-56},{x:C-44,y:C-54},{x:C+64,y:C-34},{x:C-66,y:C-30},
  ];
  return (
    <>
      <defs>
        <filter id="soul-glow" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Beaded border ring */}
      <circle cx={C} cy={C} r={52} fill="none" stroke="#888" strokeWidth={2.5}
        strokeDasharray="2 9" strokeLinecap="round" opacity={0.85} />
      {/* Diamond accent dots on ring */}
      {Array.from({length: 24}, (_, i) => {
        const a = (i * 15 - 90) * Math.PI / 180;
        if (i % 3 !== 0) return null;
        const x = C + 52 * Math.cos(a), y = C + 52 * Math.sin(a);
        return <rect key={i} x={x-2.8} y={y-2.8} width={5.6} height={5.6}
          fill="#bbb" transform={`rotate(45,${x},${y})`} opacity={0.9} />;
      })}

      {/* Garland arc at top */}
      <path d={`M${C-40},${C-32} Q${C},${C-12} ${C+40},${C-32}`}
        fill="none" stroke="#777" strokeWidth={1.2} opacity={0.8} />
      {beads.map((b, i) => (
        <circle key={i} cx={b.x} cy={b.y} r={1.8} fill="#aaa" opacity={0.9} />
      ))}

      {/* Three hanging pendants */}
      {[{x:C-18,y:C-24,len:16},{x:C,y:C-16,len:22},{x:C+18,y:C-24,len:16}].map((p,i) => (
        <g key={i}>
          <line x1={p.x} y1={p.y} x2={p.x} y2={p.y+p.len}
            stroke="#666" strokeWidth={0.9} strokeDasharray="2 3" opacity={0.75} />
          <circle cx={p.x} cy={p.y+p.len} r={i===1 ? 3.5 : 2.8} fill="#bbb" opacity={0.95} />
        </g>
      ))}

      {/* Large sparkles */}
      <g filter="url(#soul-glow)">
        <Sparkle x={C-54} y={C-36} r={10} />
        <Sparkle x={C+54} y={C+40} r={8} />
        <Sparkle x={C+32} y={C-60} r={5} op={0.85} />
      </g>

      {/* Crescent moon at top */}
      <path d={`M${C-7},${C-54}A9,9 0 1,1 ${C+7},${C-54}A6,6 0 1,0 ${C-7},${C-54}Z`}
        fill="#ccc" opacity={0.85} />

      {/* Scattered stars */}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={1.3} fill="#aaa" opacity={0.55}
          style={{ animation: `svgFade ${2+i*0.3}s ease-in-out infinite`, animationDelay: `${i*0.4}s` }} />
      ))}
    </>
  );
}

// ─── THORNS ──────────────────────────────────────────────────────────────────
function ThornsDecoration() {
  const R = 52;
  const spikes = Array.from({length: 18}, (_, i) => {
    const a = (i * 20 - 90) * Math.PI / 180;
    const big = i % 3 === 0;
    const med = i % 3 === 1;
    return { a, outerR: R + (big ? 20 : med ? 11 : 6), col: big ? "#e0e0e0" : med ? "#aaa" : "#666", w: big ? 2.2 : med ? 1.4 : 0.9, op: big ? 0.9 : med ? 0.6 : 0.35 };
  });
  return (
    <>
      <defs>
        <filter id="th-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Inner ring */}
      <circle cx={C} cy={C} r={R-2} fill="none" stroke="#444" strokeWidth={1.5} opacity={0.5} />

      {/* Thorn spikes — slowly rotating */}
      <g>
        <animateTransform attributeName="transform" type="rotate"
          from={`0 ${C} ${C}`} to={`360 ${C} ${C}`} dur="80s" repeatCount="indefinite" />
        {spikes.map((s, i) => (
          <line key={i} x1={C+R*Math.cos(s.a)} y1={C+R*Math.sin(s.a)}
            x2={C+s.outerR*Math.cos(s.a)} y2={C+s.outerR*Math.sin(s.a)}
            stroke={s.col} strokeWidth={s.w} strokeLinecap="round"
            opacity={s.op} filter={i%3===0 ? "url(#th-glow)" : undefined} />
        ))}
      </g>

      {/* Left vine scroll */}
      <path d={`M${C-52},${C} C${C-70},${C-18} ${C-64},${C-42} ${C-46},${C-48}`}
        fill="none" stroke="#ccc" strokeWidth={1.8} strokeLinecap="round" opacity={0.65} filter="url(#th-glow)" />
      <path d={`M${C-58},${C-8} C${C-74},${C-4} ${C-74},${C+12} ${C-62},${C+18}`}
        fill="none" stroke="#999" strokeWidth={1.1} strokeLinecap="round" opacity={0.45} />
      {/* Right vine scroll */}
      <path d={`M${C+52},${C} C${C+70},${C-18} ${C+64},${C-42} ${C+46},${C-48}`}
        fill="none" stroke="#ccc" strokeWidth={1.8} strokeLinecap="round" opacity={0.65} filter="url(#th-glow)" />
      <path d={`M${C+58},${C-8} C${C+74},${C-4} ${C+74},${C+12} ${C+62},${C+18}`}
        fill="none" stroke="#999" strokeWidth={1.1} strokeLinecap="round" opacity={0.45} />

      {/* Skull at top */}
      <g transform={`translate(${C},${C-61})`} filter="url(#th-glow)">
        <ellipse cx={0} cy={0} rx={9.5} ry={8.5} fill="#ddd" />
        <ellipse cx={-3.5} cy={-0.5} rx={3} ry={3} fill="#111" />
        <ellipse cx={3.5} cy={-0.5} rx={3} ry={3} fill="#111" />
        <ellipse cx={0} cy={3.2} rx={1.3} ry={1.1} fill="#111" opacity={0.8} />
        <rect x={-6.5} y={6.5} width={13} height={5.5} rx={2} fill="#ddd" />
        <line x1={-2.8} y1={6.5} x2={-2.8} y2={12} stroke="#333" strokeWidth={1.1} />
        <line x1={0} y1={6.5} x2={0} y2={12} stroke="#333" strokeWidth={1.1} />
        <line x1={2.8} y1={6.5} x2={2.8} y2={12} stroke="#333" strokeWidth={1.1} />
      </g>

      {/* Bottom ornament */}
      <path d={`M${C-22},${C+54} C${C-32},${C+70} ${C-10},${C+76} ${C},${C+72} C${C+10},${C+76} ${C+32},${C+70} ${C+22},${C+54}`}
        fill="none" stroke="#bbb" strokeWidth={1.3} strokeLinecap="round" opacity={0.55} />

      {/* Cross ornaments bottom sides */}
      {[{x:C-40,y:C+40},{x:C+40,y:C+40}].map((p,i)=>(
        <g key={i} opacity={0.5}>
          <line x1={p.x-5} y1={p.y} x2={p.x+5} y2={p.y} stroke="#ccc" strokeWidth={1.3} />
          <line x1={p.x} y1={p.y-5} x2={p.x} y2={p.y+5} stroke="#ccc" strokeWidth={1.3} />
        </g>
      ))}
    </>
  );
}

// ─── FIRE RING ───────────────────────────────────────────────────────────────
function FireRingDecoration() {
  // Flame tendrils forming a full ring — like the reference
  const outerN = 24, innerN = 16;
  return (
    <>
      <defs>
        <filter id="fr-bloom" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="6" result="b1" />
          <feGaussianBlur stdDeviation="2" result="b2" in="SourceGraphic" />
          <feMerge>
            <feMergeNode in="b1" /><feMergeNode in="b1" />
            <feMergeNode in="b2" /><feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="fr-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Core glow ring */}
      <circle cx={C} cy={C} r={51} fill="none" stroke="#ff7000" strokeWidth={10}
        opacity={0.25} filter="url(#fr-bloom)">
        <animate attributeName="opacity" values="0.18;0.35;0.18" dur="1.8s" repeatCount="indefinite" />
      </circle>

      {/* Outer flame tendrils — rotating forward */}
      <g>
        <animateTransform attributeName="transform" type="rotate"
          from={`0 ${C} ${C}`} to={`360 ${C} ${C}`} dur="10s" repeatCount="indefinite" />
        {Array.from({length: outerN}, (_, i) => {
          const a = (i * (360/outerN) - 90) * Math.PI / 180;
          const n0 = Math.cos(a), n1 = Math.sin(a);
          const t0 = -Math.sin(a), t1 = Math.cos(a);
          const bR = 49, sway = (i%2===0?1:-1)*4;
          const tipR = 67 + (i%4)*4;
          const bx = C+bR*n0, by = C+bR*n1;
          const lx = bx+5*t0, ly = by+5*t1;
          const rx = bx-5*t0, ry = by-5*t1;
          const tx = C+tipR*n0+sway*t0, ty = C+tipR*n1+sway*t1;
          const cols = ["#ff4500","#ff6b00","#ffa500","#ffd700","#fff0a0"];
          const col = cols[i%5];
          const delay = ((i*0.14)%2).toFixed(2);
          const dur = (1.0+(i%5)*0.25).toFixed(2);
          return (
            <path key={i}
              d={`M${lx},${ly} C${C+(bR+12)*n0+9*t0},${C+(bR+12)*n1+9*t1} ${C+(tipR-10)*n0+sway*t0},${C+(tipR-10)*n1+sway*t1} ${tx},${ty} C${C+(tipR-10)*n0-sway*t0},${C+(tipR-10)*n1-sway*t1} ${C+(bR+12)*n0-9*t0},${C+(bR+12)*n1-9*t1} ${rx},${ry}Z`}
              fill={col} opacity={i%4===0 ? 1 : 0.8}
              style={{ animation: `svgFade ${dur}s ease-in-out infinite alternate`, animationDelay: `${delay}s` }}
            />
          );
        })}
      </g>

      {/* Inner flame ring — counter-rotating */}
      <g>
        <animateTransform attributeName="transform" type="rotate"
          from={`0 ${C} ${C}`} to={`-360 ${C} ${C}`} dur="14s" repeatCount="indefinite" />
        {Array.from({length: innerN}, (_, i) => {
          const a = (i*(360/innerN)-90)*Math.PI/180;
          const n0=Math.cos(a),n1=Math.sin(a),t0=-Math.sin(a),t1=Math.cos(a);
          const bR=48,sway=(i%2===0?-1:1)*3,tipR=62+(i%3)*3;
          const bx=C+bR*n0,by=C+bR*n1;
          const lx=bx+3*t0,ly=by+3*t1,rx=bx-3*t0,ry=by-3*t1;
          const tx=C+tipR*n0+sway*t0,ty=C+tipR*n1+sway*t1;
          const delay=((i*0.18)%2).toFixed(2);
          return (
            <path key={i}
              d={`M${lx},${ly} C${C+(bR+8)*n0+5*t0},${C+(bR+8)*n1+5*t1} ${tx},${ty} ${tx},${ty} C${tx},${ty} ${C+(bR+8)*n0-5*t0},${C+(bR+8)*n1-5*t1} ${rx},${ry}Z`}
              fill="#ffd700" opacity={0.65}
              style={{ animation: `svgFade ${0.9+(i%4)*0.2}s ease-in-out infinite alternate`, animationDelay: `${delay}s` }}
            />
          );
        })}
      </g>

      {/* Hot sparkle points */}
      {[0,60,120,180,240,300].map((deg,i) => {
        const a=(deg-90)*Math.PI/180;
        return <circle key={i} cx={C+52*Math.cos(a)} cy={C+52*Math.sin(a)} r={2.8}
          fill="#fff" opacity={0.95} filter="url(#fr-soft)"
          style={{ animation: `svgFade ${0.7+i*0.25}s ease-in-out infinite`, animationDelay: `${i*0.35}s` }} />;
      })}
    </>
  );
}

// ─── STARLIGHT / CROWN ───────────────────────────────────────────────────────
function StarlightDecoration() {
  // Wing feathers relative to attachment at (C±52, C)
  const feathers = [
    { dx: -7,  dy: -14, rx: 16, ry: 4.5, rot: -55 },
    { dx: -14, dy: -5,  rx: 19, ry: 5,   rot: -30 },
    { dx: -18, dy: 5,   rx: 18, ry: 4.5, rot: -5  },
    { dx: -14, dy: 14,  rx: 15, ry: 4,   rot: 22  },
    { dx: -7,  dy: 20,  rx: 12, ry: 3.5, rot: 44  },
  ];
  // Crown prong data: [xOffset, height, jewel?]
  const prongs: [number, number, boolean][] = [[-20,13,false],[-10,18,true],[0,24,true],[10,18,true],[20,13,false]];
  const crownBaseY = C - 51;
  return (
    <>
      <defs>
        <filter id="cr-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="cr-gold-v" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fffde7" />
          <stop offset="35%" stopColor="#ffd700" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
        <linearGradient id="cr-gold-h" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9a6a00" />
          <stop offset="30%" stopColor="#ffd700" />
          <stop offset="55%" stopColor="#fffde7" />
          <stop offset="80%" stopColor="#ffd700" />
          <stop offset="100%" stopColor="#9a6a00" />
        </linearGradient>
      </defs>

      {/* LEFT wing */}
      <g transform={`translate(${C-52},${C})`} filter="url(#cr-glow)">
        {feathers.map((f,i)=>(
          <ellipse key={i} cx={f.dx} cy={f.dy} rx={f.rx} ry={f.ry}
            fill="url(#cr-gold-h)" opacity={0.88-i*0.04}
            transform={`rotate(${f.rot},${f.dx},${f.dy})`} />
        ))}
      </g>
      {/* RIGHT wing — mirrored */}
      <g transform={`translate(${C+52},${C}) scale(-1,1)`} filter="url(#cr-glow)">
        {feathers.map((f,i)=>(
          <ellipse key={i} cx={f.dx} cy={f.dy} rx={f.rx} ry={f.ry}
            fill="url(#cr-gold-h)" opacity={0.88-i*0.04}
            transform={`rotate(${f.rot},${f.dx},${f.dy})`} />
        ))}
      </g>

      {/* Crown base bar */}
      <rect x={C-22} y={crownBaseY} width={44} height={9} rx={3}
        fill="url(#cr-gold-h)" filter="url(#cr-glow)" />

      {/* Crown prongs */}
      {prongs.map(([dx, h, jewel], i) => (
        <g key={i} filter="url(#cr-glow)">
          <rect x={C+dx-4} y={crownBaseY-h} width={8} height={h}
            rx={4} fill="url(#cr-gold-v)" />
          {jewel && (
            <circle cx={C+dx} cy={crownBaseY-h} r={dx===0?4.5:3.5}
              fill={dx===0?"#fffde7":"#fff8b0"} opacity={0.98} />
          )}
        </g>
      ))}

      {/* Shimmer pulse */}
      <rect x={C-22} y={crownBaseY-26} width={44} height={35} rx={4}
        fill="#fff9c4" opacity={0} filter="url(#cr-glow)">
        <animate attributeName="opacity" values="0;0.3;0" dur="3.5s" repeatCount="indefinite" />
      </rect>
    </>
  );
}

// ─── VORTEX ──────────────────────────────────────────────────────────────────
function VortexDecoration() {
  const rings = [
    { r: 52, dur: 5,  rev: false, dash: "4 5 9 2 6 3",  w: 3,   op: 0.85, col: "#888" },
    { r: 59, dur: 8,  rev: true,  dash: "8 3 2 6 5 7",  w: 2.5, op: 0.65, col: "#777" },
    { r: 65, dur: 11, rev: false, dash: "5 7 3 2 8 4",  w: 2,   op: 0.45, col: "#666" },
    { r: 70, dur: 15, rev: true,  dash: "2 9 7 3 4 2",  w: 1.5, op: 0.28, col: "#555" },
    { r: 46, dur: 7,  rev: true,  dash: "6 3 8 2 3 6",  w: 3.5, op: 0.6,  col: "#999" },
  ];
  return (
    <>
      {rings.map((r, i) => (
        <circle key={i} cx={C} cy={C} r={r.r}
          fill="none" stroke={r.col} strokeWidth={r.w}
          strokeDasharray={r.dash} opacity={r.op} strokeLinecap="round"
          style={{ animation: `profileFrameSpin ${r.dur}s linear infinite${r.rev ? " reverse" : ""}` }} />
      ))}
      {[20, 75, 135, 190, 250, 305].map((deg, i) => {
        const a = (deg - 90) * Math.PI / 180;
        const aOff = a + 0.42;
        return (
          <line key={i}
            x1={C + 47 * Math.cos(a)}    y1={C + 47 * Math.sin(a)}
            x2={C + 66 * Math.cos(aOff)} y2={C + 66 * Math.sin(aOff)}
            stroke="#aaa" strokeWidth={1.5} opacity={0.5} strokeLinecap="round" />
        );
      })}
    </>
  );
}

// ─── NEBULA ──────────────────────────────────────────────────────────────────
function NebulaDecoration() {
  return (
    <>
      <defs>
        <filter id="neb-h" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="neb-m" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
        <filter id="neb-ring" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="1.8" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Heavy cloud rings */}
      {[
        { r: 50, col: "#9b59b6", w: 18, dur: 9,  op: 0.55 },
        { r: 58, col: "#6a0dad", w: 22, dur: 14, op: 0.42 },
        { r: 65, col: "#800080", w: 24, dur: 20, op: 0.28 },
        { r: 45, col: "#c084fc", w: 14, dur: 7,  op: 0.48 },
      ].map((ring, i) => (
        <circle key={i} cx={C} cy={C} r={ring.r}
          fill="none" stroke={ring.col} strokeWidth={ring.w}
          filter="url(#neb-h)" opacity={ring.op}
          style={{ animation: `profileFrameSpin ${ring.dur}s linear infinite${i % 2 ? " reverse" : ""}` }} />
      ))}

      {/* Medium glow ring */}
      <circle cx={C} cy={C} r={50} fill="none" stroke="#d8b4fe" strokeWidth={2}
        filter="url(#neb-ring)">
        <animate attributeName="opacity" values="0.4;0.95;0.4" dur="3.5s" repeatCount="indefinite" />
        <animate attributeName="stroke-width" values="1;4;1" dur="3.5s" repeatCount="indefinite" />
      </circle>

      {/* Star particles */}
      {Array.from({length: 20}, (_, i) => {
        const a = (i * 18 - 90) * Math.PI / 180;
        const r = 52 + (i % 5) * 5;
        const cols = ["#c084fc","#a855f7","#e9d5ff","#7c3aed","#ddd6fe"];
        const sz = i % 4 === 0 ? 2.5 : i % 3 === 0 ? 1.8 : 1.1;
        return (
          <circle key={i} cx={C + r * Math.cos(a)} cy={C + r * Math.sin(a)}
            r={sz} fill={cols[i % 5]}
            style={{ animation: `svgFade ${1.5 + i * 0.22}s ease-in-out infinite`, animationDelay: `${i * 0.16}s` }} />
        );
      })}
    </>
  );
}

// ─── SMOKE ───────────────────────────────────────────────────────────────────
function SmokeDecoration() {
  const wisps = Array.from({length: 10}, (_, i) => {
    const a = (i * 36 - 90) * Math.PI / 180;
    const perp = a + Math.PI / 2;
    const len = 16 + (i % 4) * 8;
    const sway = (i % 2 === 0 ? 1 : -1) * 10;
    const sx = C + 50 * Math.cos(a), sy = C + 50 * Math.sin(a);
    const cx1 = sx + Math.cos(a) * len * 0.45 + Math.cos(perp) * sway;
    const cy1 = sy + Math.sin(a) * len * 0.45 + Math.sin(perp) * sway;
    const ex = C + (50 + len) * Math.cos(a), ey = C + (50 + len) * Math.sin(a);
    return {
      d: `M${sx},${sy} Q${cx1},${cy1} ${ex},${ey}`,
      delay: (i * 0.2).toFixed(2),
      dur: (2.2 + (i % 4) * 0.6).toFixed(2),
      col: i % 3 === 0 ? "#fff" : i % 2 === 0 ? "#ddd" : "#aaa",
      w: i % 2 === 0 ? 3.5 : 2,
      op: 0.5 + (i % 3) * 0.12,
      blur: i % 2 === 0,
    };
  });
  return (
    <>
      <defs>
        <filter id="sm-blur" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>

      <circle cx={C} cy={C} r={50} fill="none" stroke="#fff" strokeWidth={1.5}
        strokeDasharray="6 8" strokeLinecap="round" opacity={0.28}>
        <animateTransform attributeName="transform" type="rotate"
          from={`0 ${C} ${C}`} to={`360 ${C} ${C}`} dur="20s" repeatCount="indefinite" />
      </circle>

      {/* Soft diffuse glow */}
      <circle cx={C} cy={C} r={53} fill="none" stroke="#fff" strokeWidth={12}
        filter="url(#sm-blur)" opacity={0.1}>
        <animate attributeName="opacity" values="0.05;0.18;0.05" dur="5s" repeatCount="indefinite" />
      </circle>

      {wisps.map((w, i) => (
        <path key={i} d={w.d} fill="none" stroke={w.col} strokeWidth={w.w}
          strokeLinecap="round" opacity={w.op}
          filter={w.blur ? "url(#sm-blur)" : undefined}
          style={{ animation: `svgFade ${w.dur}s ease-in-out infinite`, animationDelay: `${w.delay}s` }} />
      ))}

      <circle cx={C} cy={C} r={50} fill="none" stroke="#fff" strokeWidth={1} opacity={0.35}>
        <animate attributeName="opacity" values="0.12;0.5;0.12" dur="4.5s" repeatCount="indefinite" />
      </circle>
    </>
  );
}

// ─── Registry ─────────────────────────────────────────────────────────────────
const DECORATIONS: Partial<Record<FrameId, () => React.ReactNode>> = {
  eclipse:   () => <EclipseDecoration />,
  arrows:    () => <ArrowsDecoration />,
  soul:      () => <SoulDecoration />,
  thorns:    () => <ThornsDecoration />,
  firering:  () => <FireRingDecoration />,
  starlight: () => <StarlightDecoration />,
  vortex:    () => <VortexDecoration />,
  nebula:    () => <NebulaDecoration />,
  smoke:     () => <SmokeDecoration />,
};

const GLOW: Partial<Record<FrameId, string>> = {
  eclipse:   "#dc143c",
  arrows:    "#ffffff",
  soul:      "#ffffff",
  thorns:    "#444444",
  firering:  "#ff8c00",
  starlight: "#ffd700",
  vortex:    "#888888",
  nebula:    "#9b59b6",
  smoke:     "#cccccc",
};

// ─── Main Component ───────────────────────────────────────────────────────────
export function ProfileFrame({ image, name, frame = "default", size = "sm" }: ProfileFrameProps) {
  // Spring-physics tilt (motion library — butter-smooth, no jitter)
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const tiltX = useSpring(useTransform(mouseY, [0, 1], [10, -10]), { stiffness: 480, damping: 28 });
  const tiltY = useSpring(useTransform(mouseX, [0, 1], [-10, 10]), { stiffness: 480, damping: 28 });
  const frameScale = useSpring(1, { stiffness: 380, damping: 24 });

  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
  const shadowX     = useTransform(tiltY, [-10, 10], [-8, 8]);
  const shadowScale = useTransform(frameScale, [1, 1.06], [1, 1.18]);

  const s = SIZES[size];
  const frameId: FrameId = frame in FRAMES ? (frame as FrameId) : "default";
  const def = FRAMES[frameId];
  const hasFrame = def.colors !== null;
  const isLg = size === "lg";
  const bw = s.borderWidth, gw = s.gapWidth, inset = bw + gw;
  const totalPx = hasFrame ? s.avatarPx + inset * 2 : s.avatarPx;
  const glowColor = hasFrame ? (GLOW[frameId] ?? def.colors![0]) : null;
  const initial = (name.trim()[0] || "?").toUpperCase();
  const gradient = hasFrame ? `conic-gradient(from 0deg, ${def.colors!.join(", ")})` : undefined;
  const SVG_SIZE = 160;
  const svgSize = isLg ? 160 : 78;

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isLg) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    mouseX.set(nx);
    mouseY.set(ny);
    frameScale.set(1.06);
    setGlowPos({ x: nx * 100, y: ny * 100 });
  }

  function onLeave() {
    if (!isLg) return;
    mouseX.set(0.5);
    mouseY.set(0.5);
    frameScale.set(1);
    setGlowPos({ x: 50, y: 50 });
  }

  return (
    <motion.div
      className="relative shrink-0 select-none"
      style={{
        width: totalPx, height: totalPx,
        rotateX: isLg ? tiltX : 0,
        rotateY: isLg ? tiltY : 0,
        scale: isLg ? frameScale : 1,
        transformPerspective: 440,
      }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {/* Ambient glow */}
      {hasFrame && (
        <div aria-hidden style={{
          position: "absolute",
          inset: isLg ? -30 : -10,
          borderRadius: "50%",
          background: isLg
            ? `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, ${glowColor}95 0%, ${glowColor}45 38%, transparent 65%)`
            : `radial-gradient(circle, ${glowColor}85 0%, ${glowColor}30 45%, transparent 70%)`,
          filter: `blur(${isLg ? 20 : 8}px)`,
          pointerEvents: "none",
        }} />
      )}

      {/* Spinning conic ring */}
      {hasFrame && (
        <div aria-hidden style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          padding: `${bw}px`, background: gradient,
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude" as React.CSSProperties["maskComposite"],
          animation: def.speed > 0 ? `profileFrameSpin ${def.speed}s linear infinite` : undefined,
        }} />
      )}

      {/* SVG decoration overlay */}
      {hasFrame && DECORATIONS[frameId] && (
        <svg
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          style={{
            position: "absolute",
            left: (totalPx - svgSize) / 2, top: (totalPx - svgSize) / 2,
            width: svgSize, height: svgSize,
            pointerEvents: "none", zIndex: 10, overflow: "visible",
          }}
        >
          {DECORATIONS[frameId]!()}
        </svg>
      )}

      {/* 3D ground shadow */}
      {isLg && (
        <motion.div aria-hidden style={{
          position: "absolute", left: "12%", right: "12%",
          bottom: "-18%", height: "22%", borderRadius: "50%",
          background: "rgba(0,0,0,0.6)", filter: "blur(22px)",
          x: shadowX,
          scaleX: shadowScale,
          pointerEvents: "none",
        }} />
      )}

      {/* Avatar */}
      <div style={{
        position: "absolute",
        inset: hasFrame ? inset : 0,
        borderRadius: "50%",
        overflow: "hidden",
        boxShadow: hasFrame ? `0 0 0 ${gw}px #0c0a12` : undefined,
        zIndex: 2,
      }}>
        {image ? (
          <img src={image} alt={name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div className="bg-[var(--accent2)] text-white"
            style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: isLg ? 30 : 14 }}>
            {initial}
          </div>
        )}
        {isLg && (
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%", pointerEvents: "none",
            background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, rgba(255,255,255,0.32), rgba(255,255,255,0.06) 45%, transparent 68%)`,
            transition: "background 0.06s linear",
          }} />
        )}
      </div>
    </motion.div>
  );
}
