"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, Search, X, RotateCcw, ChevronDown, Star } from "lucide-react";
import { RELEASE_TYPES, CATALOG_STATUSES, GENRES, AGE_RATINGS, SEASONS } from "@/lib/anilibria";

export interface CatalogFilterState {
  status?: string;      // ongoing | finished | announce
  types: string[];      // TV | MOVIE | OVA | ONA | SPECIAL
  genres: string[];     // Russian genre names
  ageRatings: string[]; // R0_PLUS … R18_PLUS
  seasons: string[];    // winter | spring | summer | autumn
  year?: string;        // "2026" … or "older"
  rating?: string;      // "7" | "8" | "9"
  sort: string;         // "fresh" | "rating"
  q?: string;
}

const RATINGS = ["7", "8", "9"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => String(CURRENT_YEAR - i));

function chipClass(active: boolean): string {
  return [
    "px-3 py-1.5 rounded-full text-sm font-medium border select-none cursor-pointer",
    "transition-colors duration-200",
    active
      ? "bg-[var(--accent-dim)] border-[var(--accent)] text-[var(--accent)]"
      : "bg-[var(--surface2)] border-[var(--border)] text-[var(--text2)] hover:border-[var(--accent)]/40 hover:text-[var(--text)]",
  ].join(" ");
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text3)] mb-2.5">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function CatalogFilters({ initial }: { initial: CatalogFilterState }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);        // mobile panel expanded
  const [q, setQ] = useState(initial.q ?? "");

  const activeCount = useMemo(() => {
    let n = 0;
    if (initial.status) n++;
    n += initial.types.length;
    n += initial.genres.length;
    n += initial.ageRatings.length;
    n += initial.seasons.length;
    if (initial.year) n++;
    if (initial.rating) n++;
    if (initial.q) n++;
    return n;
  }, [initial]);

  const push = useCallback((next: Partial<CatalogFilterState>) => {
    const m: CatalogFilterState = { ...initial, ...next };
    const sp = new URLSearchParams();
    if (m.q) sp.set("q", m.q);
    if (m.status) sp.set("status", m.status);
    if (m.types.length) sp.set("type", m.types.join(","));
    if (m.genres.length) sp.set("genre", m.genres.join(","));
    if (m.ageRatings.length) sp.set("age", m.ageRatings.join(","));
    if (m.seasons.length) sp.set("season", m.seasons.join(","));
    if (m.year) sp.set("year", m.year);
    if (m.rating) sp.set("rating", m.rating);
    if (m.sort && m.sort !== "fresh") sp.set("sort", m.sort);
    const qs = sp.toString();
    router.push(qs ? `/anime?${qs}` : "/anime", { scroll: false });
  }, [initial, router]);

  const toggleInList = (list: string[], v: string) =>
    list.includes(v) ? list.filter(x => x !== v) : [...list, v];

  const reset = () => { setQ(""); router.push("/anime", { scroll: false }); };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] mb-5 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
        <SlidersHorizontal size={15} className="text-[var(--accent)] shrink-0" />
        <span className="text-sm font-bold">Фильтры</span>
        {activeCount > 0 && (
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--accent)] text-white leading-none tabular-nums">
            {activeCount}
          </span>
        )}

        {/* Sort — always visible */}
        <div className="ml-auto flex items-center gap-1 bg-[var(--surface2)] border border-[var(--border)] rounded-full p-0.5">
          {[
            { v: "fresh", label: "Свежее" },
            { v: "rating", label: "По рейтингу" },
          ].map(s => (
            <button
              key={s.v}
              type="button"
              onClick={() => push({ sort: s.v })}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                initial.sort === s.v ? "bg-[var(--accent)] text-white" : "text-[var(--text2)] hover:text-[var(--text)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Mobile expand toggle */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="lg:hidden flex items-center gap-1 text-xs text-[var(--text2)] hover:text-[var(--text)] transition-colors"
          aria-expanded={open}
        >
          {open ? "Скрыть" : "Показать"}
          <ChevronDown size={14} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Body — collapsible on mobile, always open on desktop */}
      <div className={`${open ? "block" : "hidden"} lg:block`}>
        <div className="p-4 space-y-5">
          {/* Search */}
          <form
            onSubmit={(e) => { e.preventDefault(); push({ q: q.trim() || undefined }); }}
            className="relative max-w-md"
          >
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)] pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по названию…"
              className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-full pl-9 pr-9 py-2 text-sm outline-none focus:border-[var(--accent)] transition-colors"
            />
            {q && (
              <button
                type="button"
                onClick={() => { setQ(""); if (initial.q) push({ q: undefined }); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-[var(--text)] transition-colors"
                aria-label="Очистить поиск"
              >
                <X size={15} />
              </button>
            )}
          </form>

          <Section title="Статус">
            {CATALOG_STATUSES.map(s => (
              <button key={s.value} type="button"
                onClick={() => push({ status: initial.status === s.value ? undefined : s.value })}
                className={chipClass(initial.status === s.value)}>
                {s.label}
              </button>
            ))}
          </Section>

          <Section title="Тип">
            {RELEASE_TYPES.map(t => (
              <button key={t.value} type="button"
                onClick={() => push({ types: toggleInList(initial.types, t.value) })}
                className={chipClass(initial.types.includes(t.value))}>
                {t.label}
              </button>
            ))}
          </Section>

          <Section title="Сезон">
            {SEASONS.map(s => (
              <button key={s.value} type="button"
                onClick={() => push({ seasons: toggleInList(initial.seasons, s.value) })}
                className={chipClass(initial.seasons.includes(s.value))}>
                {s.label}
              </button>
            ))}
          </Section>

          <Section title="Возраст">
            {AGE_RATINGS.map(a => (
              <button key={a.value} type="button"
                onClick={() => push({ ageRatings: toggleInList(initial.ageRatings, a.value) })}
                className={chipClass(initial.ageRatings.includes(a.value))}>
                {a.label}
              </button>
            ))}
          </Section>

          <Section title="Год">
            {YEARS.map(y => (
              <button key={y} type="button"
                onClick={() => push({ year: initial.year === y ? undefined : y })}
                className={chipClass(initial.year === y)}>
                {y}
              </button>
            ))}
            <button type="button"
              onClick={() => push({ year: initial.year === "older" ? undefined : "older" })}
              className={chipClass(initial.year === "older")}>
              Раньше
            </button>
          </Section>

          <Section title="Рейтинг">
            {RATINGS.map(r => (
              <button key={r} type="button"
                onClick={() => push({ rating: initial.rating === r ? undefined : r })}
                className={`${chipClass(initial.rating === r)} flex items-center gap-1`}>
                <Star size={11} fill="currentColor" className={initial.rating === r ? "" : "opacity-50"} />
                {r}+
              </button>
            ))}
          </Section>

          <Section title="Жанр">
            {GENRES.map(g => (
              <button key={g} type="button"
                onClick={() => push({ genres: toggleInList(initial.genres, g) })}
                className={chipClass(initial.genres.includes(g))}>
                {g}
              </button>
            ))}
          </Section>

          {activeCount > 0 && (
            <div className="pt-1">
              <button type="button" onClick={reset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-[var(--red-dim)] border border-[var(--red)]/30 text-[#fca5a5] hover:bg-[var(--red)]/20 transition-colors">
                <RotateCcw size={13} /> Сбросить фильтры
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
