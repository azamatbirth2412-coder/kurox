"use client";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Search, Menu, X, User, LogOut, Settings,
  ChevronDown, Shuffle, Tv, Film, Sparkles, Loader2, Zap, TrendingUp, Calendar, Trophy, Play,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { GENRES } from "@/lib/anilibria";
import { ProfileFrame } from "@/components/profile/ProfileFrame";

interface SearchResult {
  id: number;
  slug: string;
  title: string;
  titleEn: string | null;
  poster: string;
  type: string | null;
  year: number | null;
  is_ongoing: boolean;
}

const CATALOG_LINKS = [
  { label: "Свежие серии",  href: "/anime?sort=trending",  icon: Zap,         desc: "Новые серии сегодня" },
  { label: "Онгоинги",      href: "/anime?sort=ongoing",   icon: Tv,          desc: "Выходят прямо сейчас" },
  { label: "Топ аниме",     href: "/anime?sort=popular",   icon: TrendingUp,  desc: "Лучшие всех времён" },
  { label: "Расписание",    href: "/schedule",             icon: Calendar,    desc: "Когда выйдет новая серия" },
];

export function Header() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Initialise from session immediately — session is pre-populated server-side via Providers
  const [headerFrame, setHeaderFrame] = useState<string>(
    () => (session?.user as any)?.profileFrame ?? "default"
  );
  useEffect(() => {
    const f = (session?.user as any)?.profileFrame as string | undefined;
    if (f) setHeaderFrame(f);
  }, [session]);
  useEffect(() => {
    const handler = (e: Event) => setHeaderFrame((e as CustomEvent<string>).detail);
    window.addEventListener("profileFrameChange", handler);
    return () => window.removeEventListener("profileFrameChange", handler);
  }, []);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  interface UserStats {
    level: number; levelTitle: string; levelEmoji: string; xp: number;
    progress: { currentXp: number; neededXp: number; percent: number };
    stats: { episodes: number; anime: number; hours: number; titles: number };
  }
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const statsFetched = useRef(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [searchOpen]);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setActiveDropdown(null);
    setUserMenu(false);
  }, [pathname]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
        setUserMenu(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const liveSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim() || q.trim().length < 2) { setResults([]); setShowDrop(false); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        const data: SearchResult[] = await res.json();
        setResults(data);
        setShowDrop(true);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
  }, []);

  function handleQueryChange(val: string) {
    setQuery(val);
    liveSearch(val);
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
    setResults([]);
    setShowDrop(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) { router.push(`/search?q=${encodeURIComponent(q)}`); closeSearch(); }
  }

  function goToAnime(slug: string) {
    router.push(`/anime/${slug}`);
    closeSearch();
  }

  function randomAnime() {
    router.push("/api/random");
  }

  function openUserMenu() {
    setUserMenu(v => !v);
    if (!statsFetched.current && session) {
      statsFetched.current = true;
      fetch("/api/user/stats").then(r => r.json()).then(setUserStats).catch(() => {});
    }
  }

  const avatarLetter = session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || "U";
  // Base64 avatars are not stored in the session cookie (too large) — fetch them
  // from /api/user/avatar instead. Falls back to the initial letter on 404.
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarImage = avatarFailed ? null : (session?.user?.image || (session ? "/api/user/avatar" : null));

  return (
    <>
      <header
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,border-color,box-shadow] duration-300 ease-out ${
          scrolled || activeDropdown || mobileOpen
            ? "glass border-b border-[var(--border)] shadow-[0_4px_30px_rgba(0,0,0,.4)]"
            : "bg-transparent"
        }`}
      >
        {/* Main bar */}
        <div className="max-w-[1400px] mx-auto px-4 h-[62px] flex items-center gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 mr-4 group">
            <Image
              src="/logo.png"
              alt="Kurox"
              width={36}
              height={36}
              className="rounded-xl shadow-lg shadow-violet-900/40 group-hover:shadow-violet-600/50 transition-shadow"
              priority
            />
            <span className="text-xl font-black tracking-tight text-[#c4b5fd]">KUROX</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {/* Каталог dropdown */}
            <div className="relative">
              <button
                onMouseEnter={() => setActiveDropdown("catalog")}
                onMouseLeave={() => setActiveDropdown(null)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeDropdown === "catalog" || pathname.startsWith("/anime")
                    ? "text-white bg-white/8"
                    : "text-[var(--text2)] hover:text-white hover:bg-white/5"
                }`}
              >
                <Tv size={14} /> Каталог <ChevronDown size={12} className={`transition-transform ${activeDropdown === "catalog" ? "rotate-180" : ""}`} />
              </button>
              {activeDropdown === "catalog" && (
                <div
                  onMouseEnter={() => setActiveDropdown("catalog")}
                  onMouseLeave={() => setActiveDropdown(null)}
                  className="absolute left-0 top-full pt-2 z-50 w-[260px]"
                >
                  <div className="dropdown-menu p-3 space-y-1 w-[280px]">
                    {CATALOG_LINKS.map(s => (
                      <Link key={s.href} href={s.href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--text2)] hover:text-white hover:bg-white/5 transition-colors group">
                        <div className="w-8 h-8 rounded-lg bg-[var(--surface2)] flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--accent)]/20 transition-colors">
                          <s.icon size={14} className="group-hover:text-[var(--accent)] transition-colors" />
                        </div>
                        <div>
                          <div className="font-medium leading-none">{s.label}</div>
                          <div className="text-[11px] text-[var(--text3)] mt-0.5">{s.desc}</div>
                        </div>
                      </Link>
                    ))}
                    <div className="border-t border-[var(--border)] pt-2 mt-2">
                      <Link href="/anime" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[var(--text2)] hover:text-white hover:bg-white/5 transition-colors">
                        <Film size={13} /> Весь каталог аниме
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Жанры dropdown */}
            <div className="relative">
              <button
                onMouseEnter={() => setActiveDropdown("genres")}
                onMouseLeave={() => setActiveDropdown(null)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeDropdown === "genres" ? "text-white bg-white/8" : "text-[var(--text2)] hover:text-white hover:bg-white/5"
                }`}
              >
                Жанры <ChevronDown size={12} className={`transition-transform ${activeDropdown === "genres" ? "rotate-180" : ""}`} />
              </button>
              {activeDropdown === "genres" && (
                <div
                  onMouseEnter={() => setActiveDropdown("genres")}
                  onMouseLeave={() => setActiveDropdown(null)}
                  className="absolute left-0 top-full pt-2 z-50 w-[420px]"
                >
                  <div className="dropdown-menu p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text3)] mb-3">Все жанры</p>
                    <div className="grid grid-cols-3 gap-x-4 gap-y-0.5">
                      {GENRES.map(g => (
                        <Link key={g} href={`/anime?genre=${encodeURIComponent(g)}`}
                          className="py-1.5 text-sm text-[var(--text2)] hover:text-[#c4b5fd] transition-colors truncate">
                          {g}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Link href="/leaderboard"
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-[var(--text2)] hover:text-white hover:bg-white/5 transition-colors">
              <Trophy size={14} /> Лидерборд
            </Link>

            <Link href="/schedule"
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-[var(--text2)] hover:text-white hover:bg-white/5 transition-colors">
              <Sparkles size={14} /> Расписание
            </Link>
          </nav>

          <div className="flex-1" />

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Search — always visible on sm+ */}
            <form onSubmit={handleSearch} className="hidden sm:block relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text3)] pointer-events-none z-10" />
              {searching && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--accent)] animate-spin z-10" />}
              {query && !searching && (
                <button type="button" onClick={() => { setQuery(""); setResults([]); setShowDrop(false); searchRef.current?.focus(); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 text-[var(--text3)] hover:text-white transition-colors">
                  <X size={13} />
                </button>
              )}
              <input
                ref={searchRef}
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                onKeyDown={e => e.key === "Escape" && (setQuery(""), setResults([]), setShowDrop(false))}
                placeholder="Поиск аниме..."
                autoComplete="off"
                className="bg-[#1a1a1c] rounded-full pl-9 pr-8 py-2 text-sm w-64 outline-none text-[var(--text1)] placeholder:text-[var(--text3)] focus:w-80 transition-[width,box-shadow] duration-200"
                style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", border: "none" }}
                onFocus={e => e.currentTarget.style.boxShadow = "inset 0 0 0 1px rgba(139,92,246,0.5), 0 0 0 3px rgba(139,92,246,0.1)"}
                onBlur={e => { e.currentTarget.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,0.08)"; if (!query) { setShowDrop(false); } }}
              />
              {/* Mobile search icon fallback */}
              {showDrop && results.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-full min-w-[360px] dropdown-menu py-2 z-[100] max-h-[480px] overflow-y-auto shadow-2xl">
                  {results.map(r => (
                    <button key={r.id} type="button" onClick={() => goToAnime(r.slug)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left group">
                      <div className="relative w-10 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-[var(--surface2)]">
                        {r.poster && <Image src={r.poster} alt={r.title} fill className="object-cover" sizes="40px" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-snug line-clamp-1 group-hover:text-[var(--accent)] transition-colors">{r.title}</p>
                        {r.titleEn && <p className="text-[11px] text-[var(--text3)] line-clamp-1 mt-0.5">{r.titleEn}</p>}
                        <div className="flex items-center gap-1.5 mt-1">
                          {r.type && <span className="text-[10px] bg-[var(--surface2)] text-[var(--text2)] px-1.5 py-0.5 rounded">{r.type}</span>}
                          {r.year && <span className="text-[10px] text-[var(--text3)]">{r.year}</span>}
                          {r.is_ongoing && <span className="text-[10px] text-green-400 font-semibold">● Онгоинг</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                  <div className="border-t border-[var(--border)] mt-1 pt-1">
                    <button type="submit" className="w-full px-3 py-2 text-sm text-[var(--accent)] hover:bg-white/5 transition-colors text-left flex items-center gap-2">
                      <Search size={13} /> Показать все результаты по "{query}"
                    </button>
                  </div>
                </div>
              )}
            </form>

            {/* Mobile search icon (xs only) */}
            <button onClick={() => router.push("/search")}
              className="sm:hidden p-2.5 rounded-lg text-[var(--text2)] hover:text-white hover:bg-white/5 transition-colors" aria-label="Поиск">
              <Search size={18} />
            </button>

            {/* Random anime */}
            <button onClick={randomAnime}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-[var(--text2)] hover:text-white hover:bg-white/5 transition-colors text-sm font-medium" title="Случайное аниме">
              <Shuffle size={15} />
              <span>Рандом</span>
            </button>

            {/* Auth */}
            {session ? (
              <div className="relative">
                <button
                  onClick={openUserMenu}
                  className="flex items-center gap-2 hover:scale-105 transition-transform"
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                >
                  {(() => {
                    const t = (session.user as any)?.activeTitle as { name: string; emoji: string; color: string; rarity: string } | null;
                    if (!t) return null;
                    const isLeg = t.rarity === "legendary";
                    const isEpic = t.rarity === "epic";
                    return (
                      <span style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: "0.02em",
                        color: t.color,
                        background: isLeg ? `linear-gradient(90deg, ${t.color}40, ${t.color}22)` : `${t.color}22`,
                        border: `1px solid ${t.color}${isLeg ? "60" : isEpic ? "48" : "38"}`,
                        boxShadow: isLeg ? `0 0 10px ${t.color}38` : undefined,
                        padding: "2px 7px", borderRadius: 6, whiteSpace: "nowrap",
                      }}>{t.emoji} {t.name}</span>
                    );
                  })()}
                  <ProfileFrame
                    image={avatarImage ?? null}
                    name={session.user?.name || session.user?.email || "?"}
                    frame={headerFrame}
                    size="sm"
                  />
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full bg-white/8 border border-white/10 text-[var(--text3)] transition-transform duration-200 ${userMenu ? "rotate-180" : ""}`}>
                    <ChevronDown size={11} strokeWidth={2.5} />
                  </span>
                </button>
                {userMenu && (
                  <div className="absolute right-0 top-full mt-2 w-72 dropdown-menu z-50 overflow-hidden">
                    {/* Header: avatar + name + badge */}
                    <div className="px-4 pt-4 pb-3 border-b border-[var(--border)]">
                      <div className="flex items-center gap-3">
                        <ProfileFrame
                          image={avatarImage ?? null}
                          name={session.user?.name || session.user?.email || "?"}
                          frame={headerFrame}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold truncate">{session.user?.name || "Пользователь"}</p>
                            {(() => {
                              const t = (session.user as any)?.activeTitle as { name: string; emoji: string; color: string; rarity: string } | null;
                              if (!t) return null;
                              return (
                                <span style={{
                                  fontSize: 10, fontWeight: 700, color: t.color,
                                  background: `${t.color}22`, border: `1px solid ${t.color}40`,
                                  padding: "1px 5px", borderRadius: 4, whiteSpace: "nowrap",
                                }}>{t.emoji} {t.name}</span>
                              );
                            })()}
                          </div>
                          <p className="text-[11px] text-[var(--text3)] truncate mt-0.5">{session.user?.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Level + XP bar */}
                    <div className="px-4 py-3 border-b border-[var(--border)]">
                      {userStats ? (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/25 px-2 py-0.5 rounded-md">
                                Ур. {userStats.level}
                              </span>
                              <span className="text-xs text-[var(--text2)] font-medium">{userStats.levelEmoji} {userStats.levelTitle}</span>
                            </div>
                            <span className="text-[11px] text-[var(--text3)]">{Math.round(userStats.progress.percent)}%</span>
                          </div>
                          <div className="h-1.5 bg-[var(--surface2)] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-violet-400"
                              style={{ width: `${userStats.progress.percent}%`, transition: "width 0.6s ease-out" }}
                            />
                          </div>
                          <p className="text-[10px] text-[var(--text3)] mt-1.5">
                            {userStats.progress.currentXp} / {userStats.progress.neededXp} XP до ур. {userStats.level + 1}
                          </p>

                          {/* Stats row */}
                          <div className="grid grid-cols-3 gap-2 mt-3">
                            {[
                              { label: "Серий", value: userStats.stats.episodes },
                              { label: "Аниме", value: userStats.stats.anime },
                              { label: "Часов", value: userStats.stats.hours },
                            ].map(s => (
                              <div key={s.label} className="bg-[var(--surface2)] rounded-lg py-2 text-center">
                                <p className="text-sm font-bold">{s.value}</p>
                                <p className="text-[10px] text-[var(--text3)] mt-0.5">{s.label}</p>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="space-y-2 animate-pulse">
                          <div className="h-3 bg-[var(--surface2)] rounded w-3/4" />
                          <div className="h-1.5 bg-[var(--surface2)] rounded-full" />
                          <div className="grid grid-cols-3 gap-2 mt-3">
                            {[1,2,3].map(i => <div key={i} className="h-12 bg-[var(--surface2)] rounded-lg" />)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Links */}
                    <div className="py-1.5">
                      <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text2)] hover:text-white hover:bg-white/5 transition-colors" onClick={() => setUserMenu(false)}>
                        <User size={14} /> Профиль
                      </Link>
                      <Link href="/profile#history" className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text2)] hover:text-white hover:bg-white/5 transition-colors" onClick={() => setUserMenu(false)}>
                        <Play size={14} /> История просмотров
                      </Link>
                      <Link href="/profile#titles" className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text2)] hover:text-white hover:bg-white/5 transition-colors" onClick={() => setUserMenu(false)}>
                        <Trophy size={14} /> Достижения
                        {userStats && userStats.stats.titles > 0 && (
                          <span className="ml-auto text-[10px] bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded-full font-semibold">{userStats.stats.titles}</span>
                        )}
                      </Link>
                      {(session.user as { role?: string })?.role === "ADMIN" && (
                        <Link href="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm text-violet-400 hover:bg-violet-400/5 transition-colors" onClick={() => setUserMenu(false)}>
                          <Settings size={14} /> Администратор
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-[var(--border)] py-1.5">
                      <button onClick={() => signOut()} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors w-full">
                        <LogOut size={14} /> Выйти
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2 ml-1">
                <Link href="/auth/login" className="px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--text2)] hover:text-white hover:bg-white/5 transition-colors">
                  Войти
                </Link>
                <Link href="/auth/register" className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-[var(--accent)] hover:bg-[var(--accent2)] text-white shadow-lg shadow-purple-900/30 transition-colors">
                  Регистрация
                </Link>
              </div>
            )}

            {/* Mobile toggle */}
            <button className="lg:hidden p-2.5 rounded-lg text-[var(--text2)] hover:text-white hover:bg-white/5 transition-colors ml-1" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden glass border-t border-[var(--border)] px-4 py-4 space-y-1 max-h-[80vh] overflow-y-auto">
            <Link href="/anime" className="flex items-center gap-2 py-2.5 text-sm font-medium text-[var(--text2)] hover:text-white transition-colors">
              <Tv size={15} /> Каталог
            </Link>
            <Link href="/anime?sort=trending" className="flex items-center gap-2 py-2.5 text-sm font-medium text-[var(--text2)] hover:text-white transition-colors">
              Тренды
            </Link>
            <Link href="/schedule" className="flex items-center gap-2 py-2.5 text-sm font-medium text-[var(--text2)] hover:text-white transition-colors">
              <Sparkles size={15} /> Расписание
            </Link>
            <div className="py-2 border-t border-[var(--border)]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text3)] mb-2">Жанры</p>
              <div className="grid grid-cols-2 gap-1">
                {GENRES.slice(0, 10).map(g => (
                  <Link key={g} href={`/anime?genre=${encodeURIComponent(g)}`}
                    className="py-1.5 text-sm text-[var(--text2)] hover:text-white transition-colors">
                    {g}
                  </Link>
                ))}
              </div>
            </div>
            {!session && (
              <div className="flex gap-2 pt-3 border-t border-[var(--border)]">
                <Link href="/auth/login" className="flex-1 text-center py-2.5 text-sm font-medium bg-[var(--surface2)] rounded-xl">Войти</Link>
                <Link href="/auth/register" className="flex-1 text-center py-2.5 text-sm font-semibold bg-violet-600 rounded-xl text-white">Регистрация</Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Spacer */}
      <div className="h-[62px]" />
    </>
  );
}
