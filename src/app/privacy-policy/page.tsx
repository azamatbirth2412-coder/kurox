import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Политика конфиденциальности — Kurox",
  description: "Политика конфиденциальности сайта Kurox.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Политика конфиденциальности</h1>
      <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
        <p className="text-gray-400">Последнее обновление: {new Date().toLocaleDateString("ru")}</p>
        <h2 className="text-lg font-semibold text-white mt-6">1. Сбор данных</h2>
        <p>При регистрации мы собираем адрес электронной почты и имя пользователя. Пароли хранятся в зашифрованном виде (bcrypt).</p>
        <h2 className="text-lg font-semibold text-white mt-6">2. Использование данных</h2>
        <p>Данные используются для авторизации, истории просмотров, избранного и рекомендаций. Мы не продаём данные третьим лицам.</p>
        <h2 className="text-lg font-semibold text-white mt-6">3. Cookies</h2>
        <p>Мы используем технические cookies для работы сайта (сессия, авторизация).</p>
        <h2 className="text-lg font-semibold text-white mt-6">4. Реклама</h2>
        <p>На сайте может отображаться реклама третьих сторон. Premium-пользователи не видят рекламу.</p>
        <h2 className="text-lg font-semibold text-white mt-6">5. Ваши права</h2>
        <p>Вы можете запросить удаление аккаунта: <a href="mailto:admin@kurox.ru" className="text-purple-400 hover:underline">admin@kurox.ru</a></p>
      </div>
    </div>
  );
}
