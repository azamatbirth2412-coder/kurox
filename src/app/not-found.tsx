import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-20 text-center">
      <div className="text-8xl font-black text-[var(--accent)] mb-4">404</div>
      <h1 className="text-2xl font-bold mb-3">Страница не найдена</h1>
      <p className="text-[var(--text2)] mb-8">Похоже, это аниме ещё не добавили или страница была удалена.</p>
      <div className="flex gap-3 justify-center">
        <Link href="/" className="bg-[var(--accent)] hover:bg-violet-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
          На главную
        </Link>
        <Link href="/anime" className="bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/50 text-[var(--text)] px-6 py-3 rounded-xl font-semibold transition-colors">
          Каталог
        </Link>
      </div>
    </div>
  );
}
