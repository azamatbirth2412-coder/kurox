import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) return null;
  const adminEmail = process.env.ADMIN_EMAIL ?? "rtxaza@gmail.com";
  if (session.user.email !== adminEmail) return null;
  return session;
}

const SEED_TITLES = [
  // ── COMMON ─────────────────────────────────────────────────────────
  { key: "newcomer",        name: "Новобранец",          emoji: "🌱", color: "#64748b", rarity: "common",    description: "Первый шаг в мире аниме",                    totalEpisodes: 1,    animated: false },
  { key: "just_watching",   name: "Просто Смотрю",       emoji: "👀", color: "#64748b", rarity: "common",    description: "Не трогайте, я занят",                       totalEpisodes: 5,    animated: false },
  { key: "couch_expert",    name: "Диванный Эксперт",    emoji: "🛋️", color: "#64748b", rarity: "common",    description: "Профессиональный критик с дивана",            totalEpisodes: 20,   animated: false },
  { key: "screenshotter",   name: "Скриншот-Мастер",     emoji: "📸", color: "#64748b", rarity: "common",    description: "Папка скриншотов занимает 30 ГБ",             totalEpisodes: 15,   animated: false },
  { key: "op_skipper",      name: "Пропускатель Опенингов",emoji:"⏭️",color: "#64748b", rarity: "common",    description: "Пропускает все, кроме любимых",               totalEpisodes: 10,   animated: false },
  { key: "what_did_i_watch",name: "Что Я Смотрел",       emoji: "🤔", color: "#64748b", rarity: "common",    description: "Евангелион задаёт вопросы без ответов",       totalEpisodes: 8,    animated: false },
  { key: "tea_lover",       name: "Любитель Чайков",     emoji: "☕", color: "#64748b", rarity: "common",    description: "Смотрит с чаем и печеньками",                 totalEpisodes: 30,   animated: false },
  { key: "genre_student",   name: "Студент Жанра",       emoji: "📚", color: "#64748b", rarity: "common",    description: "Аниме — это не мультики, мам",                totalEpisodes: 50,   animated: false },

  // ── RARE ────────────────────────────────────────────────────────────
  { key: "night_watcher",   name: "Ночной Страж",        emoji: "🌙", color: "#3b82f6", rarity: "rare",      description: "Смотрю аниме вместо сна",                     totalEpisodes: 100,  animated: false },
  { key: "one_more_ep",     name: "Ещё Одна Серия",      emoji: "😴", color: "#3b82f6", rarity: "rare",      description: "Серьёзно, это последняя. Честно.",            totalEpisodes: 150,  animated: false },
  { key: "otaku_san",       name: "Отаку-Сан",           emoji: "🎌", color: "#3b82f6", rarity: "rare",      description: "Учит японский по субтитрам",                  totalEpisodes: 200,  animated: false },
  { key: "manga_better",    name: "Манга Лучше",         emoji: "😤", color: "#3b82f6", rarity: "rare",      description: "Говорит «манга лучше» каждые 5 минут",        totalEpisodes: 250,  animated: false },
  { key: "spoiler_victim",  name: "Жертва Спойлера",     emoji: "😱", color: "#3b82f6", rarity: "rare",      description: "Узнал конец раньше времени",                  totalEpisodes: 120,  animated: false },
  { key: "recommender",     name: "Советчик Всех",       emoji: "🗣️", color: "#3b82f6", rarity: "rare",      description: "Советует аниме даже бабушке",                 totalEpisodes: 180,  animated: false },
  { key: "weekly_victim",   name: "Жертва Еженедельного",emoji: "📅", color: "#3b82f6", rarity: "rare",      description: "Ждёт новую серию 7 дней в страданиях",        totalEpisodes: 90,   animated: false },
  { key: "ova_fanatic",     name: "Фанат OVA",           emoji: "🦅", color: "#3b82f6", rarity: "rare",      description: "OVA важнее основного сюжета",                 totalEpisodes: 160,  animated: false },

  // ── EPIC ────────────────────────────────────────────────────────────
  { key: "marathon_ninja",  name: "Ниндзя Марафона",     emoji: "⚡", color: "#8b5cf6", rarity: "epic",      description: "500 серий в абсолютной тишине",               totalEpisodes: 500,  animated: false },
  { key: "arc_conqueror",   name: "Покоритель Арок",     emoji: "🌊", color: "#8b5cf6", rarity: "epic",      description: "Пережил 20 арок без остановки",               totalEpisodes: 700,  animated: false },
  { key: "plot_prophet",    name: "Пророк Сюжета",       emoji: "🔮", color: "#8b5cf6", rarity: "epic",      description: "Угадывает поворот за 3 серии до него",        totalEpisodes: 600,  animated: false },
  { key: "cliffhanger",     name: "Жертва Клиффхэнгера", emoji: "🤯", color: "#8b5cf6", rarity: "epic",      description: "Потерял сон из-за концовки серии",            totalEpisodes: 400,  animated: false },
  { key: "rewatcher",       name: "Пересматриватель",    emoji: "🔄", color: "#8b5cf6", rarity: "epic",      description: "Смотрит любимое по третьему разу",            totalEpisodes: 450,  animated: false },
  { key: "tear_master",     name: "Мастер Слёз",         emoji: "😭", color: "#8b5cf6", rarity: "epic",      description: "Плакал. Но никому не скажет.",                totalEpisodes: 300,  animated: false },
  { key: "reaction_king",   name: "Король Реакций",      emoji: "🎭", color: "#8b5cf6", rarity: "epic",      description: "Его реакции — отдельное шоу",                 totalEpisodes: 350,  animated: false },
  { key: "isekai_lord",     name: "Лорд Исэкаев",        emoji: "🌍", color: "#8b5cf6", rarity: "epic",      description: "Знает все тропы попаданцев наизусть",         totalEpisodes: 550,  animated: true  },

  // ── SPECIAL (admin-assigned only) ──────────────────────────────────
  { key: "secret_agent", name: "ТАЙНЫЙ АГЕНТ", emoji: "👁", color: "#00b4d8", rarity: "legendary", description: "Знает всё. Никому не скажет.", totalEpisodes: 0, animated: true },

  // ── LEGENDARY ───────────────────────────────────────────────────────
  { key: "anime_god",       name: "Бог Аниме",           emoji: "👑", color: "#f59e0b", rarity: "legendary", description: "Живая энциклопедия аниме-культуры",            totalEpisodes: 1000, animated: true  },
  { key: "chosen_one",      name: "Избранный",           emoji: "✨", color: "#f59e0b", rarity: "legendary", description: "Судьба выбрала тебя. Или ты её.",             totalEpisodes: 1500, animated: true  },
  { key: "archon",          name: "Архонт Анимации",     emoji: "🌌", color: "#f59e0b", rarity: "legendary", description: "За пределами жанра. Между мирами.",           totalEpisodes: 2000, animated: true  },
  { key: "eternal_watcher", name: "Вечный Зритель",      emoji: "♾️", color: "#f59e0b", rarity: "legendary", description: "Всё видел. Ничего не забыл.",                  totalEpisodes: 3000, animated: true  },

  // ── MULTI-ANIME (animated) ──────────────────────────────────────────
  {
    key: "big_three",
    name: "Новое Поколение",
    emoji: "🔱",
    color: "#f59e0b",
    rarity: "legendary",
    description: "Три столпа современного сёнэна",
    animated: true,
    requiresAnime: JSON.stringify([
      { slug: "kimetsu-no-yaiba",      name: "Клинок, рассекающий демонов", episodes: 5 },
      { slug: "jujutsu-kaisen",        name: "Магическая Битва",             episodes: 5 },
      { slug: "boku-no-hero-academia", name: "Моя Геройская Академия",       episodes: 5 },
    ]),
  },
  {
    key: "isekai_trio",
    name: "Трио Попаданцев",
    emoji: "🌀",
    color: "#a855f7",
    rarity: "epic",
    description: "Мастер исэкаев разного калибра",
    animated: true,
    requiresAnime: JSON.stringify([
      { slug: "sword-art-online-i",  name: "Мастера Меча Онлайн", episodes: 5 },
      { slug: "log-horizon",         name: "Лог Горизонт",         episodes: 5 },
      { slug: "overlord-povelitel",  name: "Повелитель",           episodes: 5 },
    ]),
  },
  {
    key: "shonen_master",
    name: "Сёненист",
    emoji: "💥",
    color: "#f59e0b",
    rarity: "legendary",
    description: "Сёнэн — это образ жизни, а не жанр",
    animated: true,
    requiresAnime: JSON.stringify([
      { slug: "fullmetal-alchemist-brotherhood", name: "Стальной алхимик: Братство", episodes: 5 },
      { slug: "soul-eater",                      name: "Пожиратель Душ",             episodes: 5 },
      { slug: "black-clover",                    name: "Чёрный Клевер",              episodes: 5 },
    ]),
  },
  {
    key: "dark_fantasy",
    name: "Поглотитель Тьмы",
    emoji: "🩸",
    color: "#ef4444",
    rarity: "epic",
    description: "Любит тёмные и жестокие истории",
    animated: true,
    requiresAnime: JSON.stringify([
      { slug: "vinland-saga", name: "Сага о Винланде", episodes: 5 },
      { slug: "tokyo-ghoul",  name: "Токийский Гуль",  episodes: 5 },
      { slug: "berserk-2016", name: "Берсерк (2016)",  episodes: 5 },
    ]),
  },
];

export async function POST() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let created = 0, skipped = 0;
  for (const t of SEED_TITLES) {
    try {
      await prisma.title.upsert({
        where: { key: t.key },
        update: { requiresAnime: (t as any).requiresAnime ?? null },
        create: {
          key:           t.key,
          name:          t.name,
          emoji:         t.emoji,
          color:         t.color,
          rarity:        t.rarity,
          description:   t.description ?? null,
          animated:      t.animated,
          totalEpisodes: (t as any).totalEpisodes ?? 0,
          requiresAnime: (t as any).requiresAnime ?? null,
          minEpisodes:   1,
        },
      });
      created++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, created, skipped, total: SEED_TITLES.length });
}
