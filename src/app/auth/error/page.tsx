import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Ошибка аутентификации</h1>
        <p className="text-gray-400 mb-6">Не удалось выполнить вход. Попробуйте снова.</p>
        <Link href="/auth/login" className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl transition-colors">
          Вернуться к входу
        </Link>
      </div>
    </div>
  );
}
