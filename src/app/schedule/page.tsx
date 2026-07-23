import type { Metadata } from "next";
import { getScheduleWithDates, animePoster, animeTitle, animeSlug, animeYear } from "@/lib/anilibria";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import { UpcomingCountdown } from "@/components/anime/UpcomingCountdown";
import { EpisodeTimer } from "@/components/anime/EpisodeTimer";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Расписание аниме 2026 — Kurox",
  description: "Расписание выхода новых серий и анонсы аниме 2026 года на Kurox",
  alternates: { canonical: "/schedule" },
};

const DAYS = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

// Upcoming 2026 anime with known release dates
const UPCOMING_2026 = [
  {
    title: "Клинок, рассекающий демонов: Замок Бесконечности",
    titleEn: "Demon Slayer: Infinity Castle Arc",
    poster: "https://anilibria.top/storage/releases/posters/10144/2pbOQKX5ALrArnF5icp0oZ66MXTHOntY.webp",
    releaseDate: "2026-09-12",
    studio: "ufotable",
    genre: "Экшен / Фэнтези",
    description: "Финальная дуга манги о слаере демонов Тандзиро Камадо — битва в Замке Бесконечности.",
  },
  {
    title: "Магическая битва 3 сезон",
    titleEn: "Jujutsu Kaisen Season 3",
    poster: "https://anilibria.top/storage/releases/posters/9470/7eU0f4bdWzlf2CCM3nDxRQW4qtdgI3m5.webp",
    releaseDate: "2026-10-03",
    studio: "MAPPA",
    genre: "Экшен / Сверхъестественное",
    description: "Продолжение культового аниме про магических бойцов.",
  },
  {
    title: "Блич: Тысячелетняя кровавая война — Финал",
    titleEn: "Bleach: Thousand-Year Blood War Final",
    poster: "https://anilibria.top/storage/releases/posters/10229/1EvYQx7lRoYZwt9wGnEHwNbEtLXdsNl1.webp",
    releaseDate: "2026-10-15",
    studio: "Pierrot",
    genre: "Экшен / Сёнен",
    description: "Финальный сезон легендарного аниме. Ичиго против Юхбаха.",
  },
  {
    title: "Наруто: Новое поколение",
    titleEn: "Boruto: Two Blue Vortex",
    poster: "https://anilibria.top/storage/releases/posters/3996/ZJHHMeMP0624ZTpWmc0j52brIzIY3wFE.webp",
    releaseDate: "2026-07-19",
    studio: "Pierrot",
    genre: "Сёнен / Экшен",
    description: "Боруто и Кавака продолжают сражение в мире ниндзя будущего.",
  },
  {
    title: "Ванпанчмен 3 сезон",
    titleEn: "One Punch Man Season 3",
    poster: "https://anilibria.top/storage/releases/posters/1210/am1xWeY7j7yaFsF5wju1oep7Kj9y8qfd.webp",
    releaseDate: "2026-08-10",
    studio: "J.C.Staff",
    genre: "Экшен / Комедия",
    description: "Сайтама снова встречает новых монстров — и бьёт их с одного удара.",
  },
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" });
}

export default async function SchedulePage() {
  const scheduleRaw = await getScheduleWithDates();

  // Group by day of week. Prefer the API's publish_day (1=Пн … 7=Вс),
  // fall back to parsing next_episode_at / fresh_at.
  const byDay = new Map<number, typeof scheduleRaw>();
  scheduleRaw.forEach(s => {
    let day: number | null = null;
    const pd = s.release.publish_day?.value;
    if (pd && pd >= 1 && pd <= 7) {
      day = pd % 7; // API: 7=Вс → JS getDay(): 0=Вс
    } else {
      const dateStr = s.next_episode_at ?? s.release.fresh_at;
      if (!dateStr) return;
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) return;
      day = parsed.getDay();
    }
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(s);
  });

  const today = new Date().getDay();

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8 pb-16 space-y-14">

      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black">Расписание аниме</h1>
        <p className="text-[var(--text2)]">Новые серии и анонсы 2026 года</p>
      </div>

      {/* ── This week schedule ── */}
      <section>
        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
          <Calendar size={20} className="text-[var(--accent)]" /> Выходит на этой неделе
        </h2>
        <div className="space-y-6">
          {[1, 2, 3, 4, 5, 6, 0].map(day => {
            const items = byDay.get(day) ?? [];
            if (!items.length) return null;
            const isToday = day === today;
            return (
              <div key={day}>
                <div className={`flex items-center gap-2 mb-3 ${isToday ? "text-[var(--accent)]" : "text-[var(--text2)]"}`}>
                  <span className="text-sm font-bold uppercase tracking-wide">{DAYS[day]}</span>
                  {isToday && <span className="bg-[var(--accent)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">СЕГОДНЯ</span>}
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {items.map(({ release: a, next_episode_at, next_episode_ordinal }) => (
                    <Link key={a.id} href={`/anime/${animeSlug(a)}`}
                      className="group bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--accent)]/40 transition-[border-color] duration-200 flex flex-col h-full">
                      <div className="relative aspect-[2/3] overflow-hidden flex-shrink-0">
                        {animePoster(a) ? (
                          <Image src={animePoster(a)} alt={animeTitle(a)} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full bg-[var(--surface2)]" />
                        )}
                        {a.is_ongoing && (
                          <div className="absolute top-1.5 left-1.5 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">ОНГОИНГ</div>
                        )}
                      </div>
                      <div className="p-2 flex flex-col flex-1">
                        <p className="text-xs font-semibold line-clamp-2 leading-snug group-hover:text-[var(--accent)] transition-colors">
                          {animeTitle(a)}
                        </p>
                        <div className="mt-auto">
                          {next_episode_at ? (
                            <EpisodeTimer episodeAt={next_episode_at} episodeNum={next_episode_ordinal} />
                          ) : animeYear(a) ? (
                            <p className="text-[10px] text-[var(--text3)] mt-1">{animeYear(a)}</p>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
          {byDay.size === 0 && (
            <p className="text-[var(--text2)] text-center py-8">Расписание временно недоступно</p>
          )}
        </div>
      </section>

      {/* ── Upcoming 2026 with countdown ── */}
      <section>
        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
          <Clock size={20} className="text-violet-400" /> Анонсы и скоро выйдут — 2026
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {UPCOMING_2026.map(item => (
            <div key={item.titleEn}
              className="flex gap-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 hover:border-[var(--accent)]/40 transition-[border-color] duration-200">
              {/* Poster */}
              <div className="relative w-[80px] h-[112px] flex-shrink-0 rounded-xl overflow-hidden">
                <Image
                  src={item.poster}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <p className="font-bold text-sm leading-snug">{item.title}</p>
                  <p className="text-[11px] text-[var(--text3)]">{item.titleEn}</p>
                </div>
                <p className="text-xs text-[var(--text2)] line-clamp-2">{item.description}</p>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <span className="bg-[var(--surface2)] text-[var(--text2)] px-2 py-0.5 rounded-full">{item.studio}</span>
                  <span className="bg-violet-900/30 text-violet-300 px-2 py-0.5 rounded-full">{item.genre}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text3)]">{formatDate(item.releaseDate)}</span>
                  <UpcomingCountdown date={item.releaseDate} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
