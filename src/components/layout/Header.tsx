"use client";
import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Search, Menu, X, User, LogOut, Settings, Star } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useRouter } from "next/navigation";

const NAV_LINKS = [
  { href: "/anime", label: "Каталог" },
  { href: "/anime?sort=new", label: "Новинки" },
  { href: "/anime?sort=popular", label: "Топ" },
  { href: "/genres", label: "Жанры" },
  { href: "/news", label: "Новости" },
];

export function Header() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-2xl font-black text-purple-500">KUROX</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 ml-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-gray-300 hover:text-white text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        {searchOpen && (
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <input
              name="q"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              placeholder="Поиск аниме..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500"
            />
          </form>
        )}

        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="p-2 hover:text-purple-400 transition-colors"
          aria-label="Поиск"
        >
          <Search size={20} />
        </button>

        <ThemeToggle />

        {session ? (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-800"
            >
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold">
                {session.user?.name?.[0]?.toUpperCase() || "U"}
              </div>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-xl py-1 z-50">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-700 text-sm"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <User size={16} /> Профиль
                </Link>
                {(session.user as any)?.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-700 text-sm"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings size={16} /> Админ-панель
                  </Link>
                )}
                <Link
                  href="/premium"
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-700 text-sm text-yellow-400"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Star size={16} /> Premium
                </Link>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-700 text-sm w-full text-left text-red-400"
                >
                  <LogOut size={16} /> Выйти
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/auth/login"
              className="text-sm text-gray-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Войти
            </Link>
            <Link
              href="/auth/register"
              className="text-sm bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              Регистрация
            </Link>
          </div>
        )}

        <button
          className="md:hidden p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Меню"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-gray-900 border-t border-gray-800 px-4 py-3 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block py-2 text-gray-300 hover:text-white"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {!session && (
            <>
              <Link href="/auth/login" className="block py-2 text-gray-300 hover:text-white" onClick={() => setMenuOpen(false)}>
                Войти
              </Link>
              <Link href="/auth/register" className="block py-2 text-purple-400 font-medium" onClick={() => setMenuOpen(false)}>
                Регистрация
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
