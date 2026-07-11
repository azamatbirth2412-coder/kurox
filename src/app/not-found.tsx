import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="text-8xl font-black text-purple-500 mb-4">404</div>
      <h1 className="text-2xl font-bold mb-3">Страница не найдена</h1>
      <p className="text-gray-400 mb-8">Похоже, это аниме ещё не добавили или страница была удалена.</p>
      <Link href="/" className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
        На главную
      </Link>
    </div>
  );
}
