"use client";
import { useEffect, useRef, useState } from "react";
import { Users, MessageSquare, Tv, Zap } from "lucide-react";

type StatIcon = "anime" | "ongoing" | "users" | "comments";

const ICONS: Record<StatIcon, React.ElementType> = {
  anime: Tv,
  ongoing: Zap,
  users: Users,
  comments: MessageSquare,
};

interface Stat {
  label: string;
  value: number;
  icon: StatIcon;
  color: string;
  suffix?: string;
}

function CountUp({ to, duration = 1200 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (started.current) return;
    const observer = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      started.current = true;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        // ease-out-expo
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        setVal(Math.round(eased * to));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to, duration]);

  return <span ref={ref}>{val.toLocaleString("ru")}</span>;
}

export function StatsWidget({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => {
        const Icon = ICONS[s.icon];
        return (
        <div key={s.label}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-3 hover:border-[var(--accent)]/30 transition-colors group">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color} bg-current/10`}
            style={{ backgroundColor: `color-mix(in srgb, currentColor 10%, transparent)` }}>
            <Icon size={18} className={s.color} />
          </div>
          <div>
            <div className="text-xl font-black tabular-nums leading-none">
              <CountUp to={s.value} />
              {s.suffix && <span className="text-sm font-normal text-[var(--text3)] ml-0.5">{s.suffix}</span>}
            </div>
            <div className="text-xs text-[var(--text3)] mt-0.5">{s.label}</div>
          </div>
        </div>
        );
      })}
    </div>
  );
}

export type { Stat };
