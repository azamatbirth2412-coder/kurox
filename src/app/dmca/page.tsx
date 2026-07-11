import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DMCA — Kurox",
  description: "Уведомление об авторских правах. Процедура DMCA для сайта Kurox.",
  alternates: { canonical: "/dmca" },
};

export default function DmcaPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">DMCA / Авторские права</h1>
      <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
        <p>Kurox уважает права интеллектуальной собственности и просит пользователей делать то же самое.</p>
        <h2 className="text-lg font-semibold text-white mt-6">Уведомление о нарушении</h2>
        <p>Если вы считаете, что ваши авторские права нарушены, отправьте уведомление: <a href="mailto:dmca@kurox.ru" className="text-purple-400 hover:underline">dmca@kurox.ru</a></p>
        <p>Уведомление должно содержать:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Описание защищённого произведения</li>
          <li>URL страницы с нарушающим контентом</li>
          <li>Ваши контактные данные</li>
          <li>Подтверждение добросовестности обращения</li>
        </ul>
        <p>Мы рассматриваем обращения в течение 72 часов. Kurox является агрегатором контента и не хранит медиафайлы.</p>
      </div>
    </div>
  );
}
