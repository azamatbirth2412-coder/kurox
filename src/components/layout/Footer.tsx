import Link from "next/link";
import { GENRES } from "@/lib/anilibria";

const NAV_LINKS = [
  { href: "/anime",               label: "Каталог" },
  { href: "/anime?sort=trending", label: "Свежие серии" },
  { href: "/anime?sort=schedule", label: "Расписание" },
  { href: "/anime?sort=popular",  label: "Топ аниме" },
  { href: "/search",              label: "Поиск" },
];

const INFO_LINKS = [
  { href: "/about",           label: "О сайте" },
  { href: "/privacy-policy",  label: "Конфиденциальность" },
  { href: "/dmca",            label: "DMCA" },
  { href: "/rss.xml",         label: "RSS-лента" },
];

const SHOW_GENRES = GENRES.slice(0, 8);

export function Footer() {
  return (
    <footer className="mt-20 border-t border-[var(--border)] bg-[var(--bg2)]">
      <div className="max-w-[1400px] mx-auto px-4 pt-12 pb-6">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 group w-fit">
              <img src="/logo.png" alt="Kurox" width={36} height={36} className="rounded-xl shadow-lg shadow-violet-900/40 group-hover:shadow-violet-500/50 transition-shadow" />
              <span className="text-xl font-black text-[#c4b5fd]">KUROX</span>
            </Link>
            <p className="text-sm text-[var(--text3)] leading-relaxed max-w-[220px]">
              Смотри аниме онлайн бесплатно. Тысячи тайтлов с русской озвучкой и субтитрами.
            </p>
            <div className="mt-5">
              <a
                href="https://t.me/KuroXanime"
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl overflow-hidden border border-[var(--border)] hover:border-violet-500/50 transition-[border-color,box-shadow] duration-200 hover:shadow-lg hover:shadow-violet-900/20 w-full max-w-[220px]"
              >
                <img
                  src="/uploads/tg-banner-final.png"
                  alt="Наш Telegram — KuroXanime"
                  className="w-full h-auto block"
                />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text3)] mb-4">Разделы</h3>
            <ul className="space-y-2.5">
              {NAV_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-[var(--text2)] hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Genres */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text3)] mb-4">Жанры</h3>
            <ul className="space-y-2.5">
              {SHOW_GENRES.map(g => (
                <li key={g}>
                  <Link href={`/anime?genre=${encodeURIComponent(g)}`} className="text-sm text-[var(--text2)] hover:text-white transition-colors">
                    {g}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text3)] mb-4">Информация</h3>
            <ul className="space-y-2.5">
              {INFO_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-[var(--text2)] hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Cooperation */}
            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--text3)] mb-2">Сотрудничество</p>
              <a href="mailto:rtxaza@gmail.com" className="text-sm text-violet-400 hover:text-violet-300 transition-colors break-all">
                rtxaza@gmail.com
              </a>
            </div>

            {/* SEO badge */}
            <div className="mt-6 px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[11px] text-[var(--text3)] leading-relaxed">
              Медиафайлы не хранятся на наших серверах. Мы не несём ответственности за контент сторонних источников.
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-5 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--text3)]">
          <p>© {new Date().getFullYear()} Kurox. Все права защищены.</p>
          <p className="text-center sm:text-right">
            Данные предоставлены{" "}
            <span className="text-[var(--text2)]">Anilibria</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
