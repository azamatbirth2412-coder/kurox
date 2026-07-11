import Link from "next/link";

const GENRES = [
  "Экшен", "Романтика", "Комедия", "Фэнтези", "Сёнен",
  "Триллер", "Ужасы", "Спорт", "Меха", "Повседневность",
];

export function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <span className="text-2xl font-black text-purple-500">KUROX</span>
            <p className="mt-3 text-sm text-gray-400">
              Лучший сайт для просмотра аниме онлайн бесплатно в хорошем качестве.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-gray-400">
              Навигация
            </h3>
            <ul className="space-y-2 text-sm">
              {[
                { href: "/anime", label: "Каталог" },
                { href: "/anime?sort=new", label: "Новинки" },
                { href: "/anime?sort=popular", label: "Популярное" },
                { href: "/news", label: "Новости" },
                { href: "/premium", label: "Premium" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-gray-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-gray-400">
              Жанры
            </h3>
            <ul className="space-y-2 text-sm">
              {GENRES.map((genre) => (
                <li key={genre}>
                  <Link
                    href={`/genre/${encodeURIComponent(genre.toLowerCase())}`}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {genre}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-gray-400">
              Информация
            </h3>
            <ul className="space-y-2 text-sm">
              {[
                { href: "/about", label: "О сайте" },
                { href: "/privacy-policy", label: "Политика конфиденциальности" },
                { href: "/dmca", label: "DMCA" },
                { href: "/rss.xml", label: "RSS-лента" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-gray-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Kurox. Все права защищены.</p>
          <p className="mt-1">
            Все аниме предоставлены третьими сторонами. Мы не храним медиафайлы на наших серверах.
          </p>
        </div>
      </div>
    </footer>
  );
}
