"use client";

// Thumb-reach navigation for phones — the reference the user sent (AnimeGO)
// puts five destinations in a fixed bar instead of relying on a hamburger for
// everything. The existing header hamburger still covers genres/catalog
// sub-links; this bar is for the handful of things reached constantly.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, Tv, Shuffle, Search, User } from "lucide-react";
import { ProfileFrame } from "@/components/profile/ProfileFrame";

interface Item {
  href: string;
  label: string;
  icon: typeof Home;
  match: (path: string) => boolean;
}

const ITEMS: Item[] = [
  { href: "/", label: "Главная", icon: Home, match: (p) => p === "/" },
  { href: "/anime", label: "Аниме", icon: Tv, match: (p) => p.startsWith("/anime") || p.startsWith("/genre") },
  { href: "/api/random", label: "Случайное", icon: Shuffle, match: () => false },
  { href: "/search", label: "Поиск", icon: Search, match: (p) => p.startsWith("/search") },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const profileHref = session ? "/profile" : "/auth/login";
  const profileActive = pathname.startsWith("/profile") || pathname.startsWith("/auth");
  const avatarImage = session?.user?.image || (session ? "/api/user/avatar" : null);

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-[var(--border)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Основная навигация"
    >
      <div className="grid grid-cols-5 h-[58px]">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          // /api/random redirects server-side — a real navigation, not a fetch,
          // so a plain Link (not client JS) is what actually works here.
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 min-w-0"
              aria-current={active ? "page" : undefined}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.4 : 1.9}
                className={active ? "text-[var(--accent)]" : "text-[var(--text3)]"}
              />
              <span className={`text-[10px] font-medium leading-none truncate max-w-full px-1 ${
                active ? "text-[var(--accent)]" : "text-[var(--text3)]"
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => router.push(profileHref)}
          className="flex flex-col items-center justify-center gap-1 min-w-0"
          aria-current={profileActive ? "page" : undefined}
        >
          {session ? (
            <span className={`rounded-full ${profileActive ? "ring-2 ring-[var(--accent)]" : ""}`}>
              <ProfileFrame image={avatarImage} name={session.user?.name || "?"} size="sm" />
            </span>
          ) : (
            <User size={20} strokeWidth={profileActive ? 2.4 : 1.9}
              className={profileActive ? "text-[var(--accent)]" : "text-[var(--text3)]"} />
          )}
          <span className={`text-[10px] font-medium leading-none ${
            profileActive ? "text-[var(--accent)]" : "text-[var(--text3)]"
          }`}>
            {session ? "Профиль" : "Войти"}
          </span>
        </button>
      </div>
    </nav>
  );
}
