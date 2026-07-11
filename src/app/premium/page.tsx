import type { Metadata } from "next";
import Link from "next/link";
import { Check, Star } from "lucide-react";

export const metadata: Metadata = {
  title: "Premium подписка — без рекламы на Kurox",
  description: "Подключите Premium на Kurox: смотрите аниме без рекламы, получайте уведомления о новых сериях.",
  alternates: { canonical: "/premium" },
};

const FEATURES = [
  "Просмотр без рекламы",
  "Push-уведомления о новых сериях",
  "Приоритетная поддержка",
  "Ранний доступ к новым функциям",
  "Расширенная история просмотров",
];

export default function PremiumPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-400 rounded-full px-4 py-1 text-sm font-semibold mb-6">
        <Star size={14} fill="currentColor" /> Premium
      </div>
      <h1 className="text-4xl font-black mb-4">Смотри аниме без рекламы</h1>
      <p className="text-gray-400 text-lg mb-12">Подключи Premium и наслаждайся любимым контентом без перерывов</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-12">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 text-left">
          <h2 className="text-lg font-bold mb-1">Месяц</h2>
          <div className="text-3xl font-black text-purple-400 mb-4">199 ₽</div>
          <ul className="space-y-2 text-sm text-gray-300">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2"><Check size={14} className="text-green-400 flex-shrink-0" /> {f}</li>
            ))}
          </ul>
          <button className="mt-6 w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-semibold transition-colors">
            Подключить за 199 ₽/мес
          </button>
        </div>
        <div className="bg-gradient-to-br from-purple-900 to-gray-900 border border-purple-700 rounded-2xl p-6 text-left relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full">ВЫГОДА 50%</div>
          <h2 className="text-lg font-bold mb-1">Год</h2>
          <div className="text-3xl font-black text-yellow-400 mb-1">990 ₽</div>
          <div className="text-sm text-gray-400 line-through mb-4">2388 ₽</div>
          <ul className="space-y-2 text-sm text-gray-300">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2"><Check size={14} className="text-green-400 flex-shrink-0" /> {f}</li>
            ))}
          </ul>
          <button className="mt-6 w-full bg-yellow-500 hover:bg-yellow-400 text-black py-3 rounded-xl font-bold transition-colors">
            Подключить за 990 ₽/год
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500">Оплата через безопасный платёжный шлюз. Отменить можно в любой момент.</p>
    </div>
  );
}
