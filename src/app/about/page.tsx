import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "О сайте Kurox",
  description: "Kurox — современный сайт для просмотра аниме онлайн. Узнайте о нашей платформе.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">О сайте Kurox</h1>
      <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
        <p><strong className="text-white">Kurox</strong> — это современная платформа для просмотра аниме онлайн на русском языке. Наша цель — предоставить пользователям удобный, быстрый и бесплатный доступ к огромной библиотеке японской анимации.</p>
        <p>Мы используем передовые технологии для обеспечения быстрой загрузки страниц, высококачественного видео и персонализированного опыта просмотра. Сайт оптимизирован для всех устройств и работает без сбоев 24/7.</p>
        <p>Все видеоматериалы предоставляются третьими сторонами и размещены на их серверах. Kurox является агрегатором контента и не хранит медиафайлы.</p>
        <p>По всем вопросам: <a href="mailto:rtxaza@gmail.com" className="text-purple-400 hover:underline">rtxaza@gmail.com</a></p>
        <p>Сотрудничество и реклама: <a href="mailto:rtxaza@gmail.com" className="text-purple-400 hover:underline">rtxaza@gmail.com</a></p>
      </div>
    </div>
  );
}
