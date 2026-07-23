export const revalidate = 600; // 10 минут — новые серии у онгоингов
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  getByCode, getById, getByGenre, getPopular, getTrending, animePoster, animeSlug, animeTitle, animeYear, animeEpisodes,
  type AnilibriaAnime,
} from "@/lib/anilibria";

// Pre-render top 100 popular anime at build time for fastest Googlebot crawl
export async function generateStaticParams() {
  try {
    // getPopular's first argument is a PAGE INDEX (0-based), not an offset
    const [page0, page1] = await Promise.allSettled([
      getPopular(0, 50),
      getPopular(1, 50),
    ]);
    const list = [
      ...(page0.status === "fulfilled" ? page0.value : []),
      ...(page1.status === "fulfilled" ? page1.value : []),
    ];
    return list.map(a => ({ slug: animeSlug(a) }));
  } catch {
    return [];
  }
}
import { AnimeCard } from "@/components/anime/AnimeCard";
import { PlayerSources } from "@/components/anime/PlayerSources";
import { SimilarRow } from "@/components/anime/SimilarRow";
import { AnimeRating } from "@/components/ui/AnimeRating";
import { CommentSection } from "@/components/anime/CommentSection";
import { ViewTracker } from "@/components/anime/ViewTracker";
import { AdBanner } from "@/components/ui/AdBanner";
import { Heart, Tv, Clock, Calendar, Star } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";

interface PageProps { params: Promise<{ slug: string }> }

async function resolveAnime(slug: string): Promise<AnilibriaAnime | null> {
  const byAlias = await getByCode(slug);
  if (byAlias) return byAlias;
  const parts = slug.split("-");
  const id = parseInt(parts[parts.length - 1], 10);
  if (!isNaN(id)) return getById(id);
  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const anime = await resolveAnime(slug);
  if (!anime) return { title: "Аниме не найдено | Kurox" };

  const title  = animeTitle(anime);
  const year   = animeYear(anime);
  const poster = animePoster(anime);
  const epCount = anime.episodes_total ?? anime.episodes?.length;
  const genres  = (anime.genres ?? []).slice(0, 3).map(g => g.name);
  const genreStr = genres.join(", ");
  const typeStr  = anime.type?.description ?? "";
  const status   = anime.is_ongoing ? "онгоинг" : "завершено";

  // SEO title — 55-60 chars: "Название (год) смотреть онлайн"
  const seoTitle = [title, year ? `(${year})` : "", "смотреть онлайн"]
    .filter(Boolean).join(" ").slice(0, 60);

  // SEO description — 150-160 chars: rich, keyword-saturated
  const rawDesc = anime.description?.slice(0, 90)?.replace(/\n/g, " ")?.trim() ?? "";
  const suffix = [
    epCount ? `${epCount} эп.` : null,
    typeStr || null,
    genreStr || null,
    year ? `${year} г.` : null,
    `Смотреть «${title}» онлайн бесплатно с русской озвучкой в HD на Kurox`,
  ].filter(Boolean).join(" · ");
  const metaDesc = rawDesc
    ? `${rawDesc}… ${suffix}`.slice(0, 160)
    : suffix.slice(0, 160);

  return {
    title: seoTitle,
    description: metaDesc,
    keywords: [
      title,
      anime.name?.english ?? null,
      `${title} смотреть онлайн`,
      `${title} ${year ?? ""}`.trim(),
      `${title} аниме`,
      `${title} озвучка`,
      "смотреть аниме онлайн бесплатно",
      status,
      ...genres,
    ].filter((k): k is string => !!k),
    alternates: { canonical: `/anime/${slug}` },
    openGraph: {
      title: seoTitle,
      description: metaDesc,
      type: "video.tv_show",
      locale: "ru_RU",
      siteName: "Kurox",
      url: `/anime/${slug}`,
      images: poster
        ? [{ url: poster, width: 800, height: 1200, alt: `${title} постер` }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: metaDesc,
      images: poster ? [poster] : [],
    },
  };
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kurox.ru";

function buildSchema(anime: AnilibriaAnime, slug: string) {
  const title   = animeTitle(anime);
  const poster  = animePoster(anime);
  const year    = animeYear(anime);
  const epCount = anime.episodes_total ?? anime.episodes?.length ?? undefined;
  const genres  = (anime.genres ?? []).map(g => g.name);
  const isMovie = anime.type?.description?.toLowerCase().includes("фильм");
  const pageUrl = `${APP_URL}/anime/${slug}`;

  const mainEntity = {
    "@context": "https://schema.org",
    "@type": isMovie ? "Movie" : "TVSeries",
    "@id": pageUrl,
    name: title,
    alternateName: [anime.name?.english, anime.name?.alternative].filter(Boolean),
    description: anime.description ?? undefined,
    image: poster ? {
      "@type": "ImageObject",
      url: poster,
      width: 800,
      height: 1200,
    } : undefined,
    url: pageUrl,
    inLanguage: ["ru", "ja"],
    ...(year ? { startDate: String(year) } : {}),
    ...(genres.length ? { genre: genres } : {}),
    ...(epCount ? { numberOfEpisodes: epCount } : {}),
    ...(anime.is_ongoing
      ? { creativeWorkStatus: "Published" }
      : { endDate: String(year), creativeWorkStatus: "Completed" }),
    countryOfOrigin: { "@type": "Country", name: "Japan" },
    contentRating: "14+",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "RUB",
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "Kurox" },
    },
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: APP_URL },
      { "@type": "ListItem", position: 2, name: "Каталог", item: `${APP_URL}/anime` },
      { "@type": "ListItem", position: 3, name: title, item: pageUrl },
    ],
  };

  // VideoObject schema — enables "Watch Now" button in Google rich results
  const videoObject = poster ? {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: `${title} — смотреть онлайн`,
    description: `Смотреть аниме «${title}»${year ? ` (${year})` : ""} с русской озвучкой бесплатно онлайн на Kurox`,
    thumbnailUrl: poster,
    uploadDate: year ? `${year}-01-01` : "2024-01-01",
    inLanguage: "ru",
    contentUrl: pageUrl,
    embedUrl: pageUrl,
    potentialAction: {
      "@type": "WatchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: pageUrl,
        inLanguage: "ru",
        actionAccessibilityRequirement: {
          "@type": "ActionAccessSpecification",
          category: "nologinrequired",
          availabilityStarts: `${year ?? 2024}-01-01`,
          eligibleRegion: [
            { "@type": "Country", name: "RU" },
            { "@type": "Country", name: "UA" },
            { "@type": "Country", name: "KZ" },
          ],
        },
      },
    },
  } : null;

  return [mainEntity, breadcrumb, ...(videoObject ? [videoObject] : [])];
}

export default async function AnimePage({ params }: PageProps) {
  const { slug } = await params;

  // Fetch anime + similar in parallel
  const anime = await resolveAnime(slug);
  if (!anime) notFound();

  const title   = animeTitle(anime);
  const titleEn = anime.name?.english || null;
  const poster  = animePoster(anime);
  const year    = animeYear(anime);
  const genres  = anime.genres ?? [];
  const desc    = anime.description ?? null;
  const epList  = anime.episodes
    ? [...anime.episodes].sort((a, b) => a.sort_order - b.sort_order)
    : [];

  // Multi-factor similar: genre overlap + year proximity + popularity + type
  const genreNames = genres.slice(0, 4).map(g => g.name);
  const genreSet = new Set(genreNames);
  const baseYear = animeYear(anime) ?? 0;

  // Fetch candidates: genres + popular as fallback pool
  const [genreResults, popularPool, trendingPool] = await Promise.all([
    Promise.allSettled(genreNames.map(g => getByGenre(g, 0, 35))),
    getPopular(0, 50),
    getTrending(0, 28),
  ]);

  const seen = new Set<number>([anime.id]);
  const genreCandidates = genreResults
    .flatMap(r => r.status === "fulfilled" ? r.value : [])
    .filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });

  // Always include popular + trending as fallback so new anime with no genres still get results
  const fallbackPool = [...popularPool, ...trendingPool]
    .filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });

  const allCandidates = [...genreCandidates, ...fallbackPool];
  const maxFav = Math.max(...allCandidates.map(a => a.added_in_users_favorites ?? 0), 1);

  const similar: AnilibriaAnime[] = allCandidates
    .map(a => {
      const aGenres = new Set((a.genres ?? []).map(g => g.name));
      // Genre overlap (0–1): how many of the source's genres match
      const overlap = genreNames.length > 0
        ? [...genreSet].filter(g => aGenres.has(g)).length / genreNames.length
        : 0;
      // Year proximity (0–1): within 5 years → max score
      const yr = animeYear(a) ?? 0;
      const yearProx = baseYear && yr ? Math.max(0, 1 - Math.abs(baseYear - yr) / 5) : 0.3;
      // Popularity (0–1)
      const pop = (a.added_in_users_favorites ?? 0) / maxFav;
      // Same type bonus (TV / Movie / OVA / etc.)
      const typeMatch = anime.type?.value && a.type?.value === anime.type.value ? 0.15 : 0;
      // Ongoing bonus — prefer currently airing
      const ongoingBonus = a.is_ongoing ? 0.05 : 0;
      const score = overlap * 0.45 + yearProx * 0.2 + pop * 0.2 + typeMatch + ongoingBonus;
      return { a, score };
    })
    .sort((x, y) => y.score - x.score)
    .slice(0, 16)
    .map(x => x.a);

  const schema = buildSchema(anime, slug);

  return (
    <div className="min-h-screen pb-16 relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <ViewTracker animeId={String(anime.id)} />

      {/* Hero blur background — absolute, не занимает место в потоке */}
      {poster && (
        <div className="absolute inset-x-0 top-0 h-80 overflow-hidden pointer-events-none z-0">
          <Image src={poster} alt={title} fill priority className="object-cover object-top scale-110 blur-2xl opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--bg)]/60 to-[var(--bg)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg)]/40 to-transparent" />
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 relative z-10">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-[var(--text3)] py-3">
          <BackButton />
          <span className="opacity-30">|</span>
          <Link href="/" className="hover:text-[var(--accent)] transition-colors">Главная</Link>
          <span>/</span>
          <Link href="/anime" className="hover:text-[var(--accent)] transition-colors">Каталог</Link>
          <span>/</span>
          <span className="text-[var(--text2)] line-clamp-1">{title}</span>
        </nav>

        {/* ── MOBILE (< lg) ── */}
        <div className="lg:hidden">

          {/* Poster + Title */}
          <div className="flex gap-3 mb-5">
            {poster && (
              <div className="relative w-28 sm:w-36 flex-shrink-0 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <Image src={poster} alt={title} fill className="object-cover" priority />
              </div>
            )}
            <div className="flex-1 min-w-0 flex flex-col justify-end pb-1">
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  anime.is_ongoing ? "bg-green-500/20 text-green-400" : "bg-[var(--surface2)] text-[var(--text3)]"
                }`}>
                  {anime.is_ongoing ? "● Онгоинг" : "Завершён"}
                </span>
                {anime.type?.description && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface2)] text-[var(--text3)]">
                    {anime.type.description}
                  </span>
                )}
                {year && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface2)] text-[var(--text3)]">
                    {year}
                  </span>
                )}
              </div>
              <h1 className="text-lg sm:text-xl font-black leading-tight">{title}</h1>
              {titleEn && <p className="text-xs text-[var(--text3)] mt-1 line-clamp-1">{titleEn}</p>}
              <div className="flex flex-wrap gap-1 mt-2">
                {genres.slice(0, 4).map(g => (
                  <Link key={g.id} href={`/anime?genre=${encodeURIComponent(g.name)}`}
                    className="text-[10px] px-2 py-0.5 bg-violet-900/30 text-violet-300 rounded-full hover:bg-violet-800/40 transition-colors">
                    {g.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          {desc && (
            <div className="bg-[var(--surface)]/50 rounded-xl px-3 py-2.5 border border-[var(--border)] mb-4">
              <p className="text-xs text-[var(--text2)] leading-relaxed line-clamp-4">{desc}</p>
            </div>
          )}

          {/* Stats chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
            {anime.added_in_users_favorites > 0 && (
              <div className="flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 flex-shrink-0">
                <Heart size={12} className="text-pink-400" fill="currentColor" />
                <span className="text-xs font-semibold">{anime.added_in_users_favorites.toLocaleString("ru")}</span>
              </div>
            )}
            {animeEpisodes(anime) && (
              <div className="flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 flex-shrink-0">
                <Clock size={12} className="text-violet-400" />
                <span className="text-xs font-semibold">{animeEpisodes(anime)} серий</span>
              </div>
            )}
            {anime.average_duration_of_episode && Math.round(anime.average_duration_of_episode / 60) > 2 && (
              <div className="flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 flex-shrink-0">
                <Tv size={12} className="text-blue-400" />
                <span className="text-xs font-semibold">~{Math.round(anime.average_duration_of_episode / 60)} мин.</span>
              </div>
            )}
          </div>

          {/* Player */}
          <PlayerSources animeId={anime.id} episodes={epList} title={title} titleEn={titleEn ?? undefined} poster={poster ?? undefined} slug={slug} />

          {/* Ad below player — managed from admin panel */}
          <AdBanner slot="in-player" className="mt-3" />

          {/* Rating */}
          <div className="mt-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Star size={14} className="text-amber-400" fill="currentColor" /> Ваша оценка
            </h2>
            <AnimeRating animeId={String(anime.id)} />
          </div>

          <div className="mt-4"><CommentSection animeId={String(anime.id)} /></div>

          {similar.length > 0 && (
            <div className="mt-6">
              <h2 className="text-base font-bold mb-3">Похожие аниме</h2>
              <SimilarRow items={similar.map(a => ({
                id: a.id, slug: animeSlug(a), title: animeTitle(a),
                poster: animePoster(a), year: animeYear(a),
                genres: a.genres?.slice(0,2).map(g => g.name) ?? [],
                isOngoing: !!a.is_ongoing, episodes: a.episodes_total ?? null,
              }))} />
            </div>
          )}
        </div>

        {/* ── DESKTOP (lg+) ── */}
        <div className="hidden lg:grid lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-8 mt-2">

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
              {poster
                ? <Image src={poster} alt={title} fill className="object-cover" priority />
                : <div className="w-full h-full bg-[var(--surface2)] flex items-center justify-center text-[var(--text3)]">Нет постера</div>
              }
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 space-y-2.5 text-sm">
              {anime.added_in_users_favorites > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text2)]">В избранном</span>
                  <span className="flex items-center gap-1 text-pink-400 font-semibold">
                    <Heart size={12} fill="currentColor" /> {anime.added_in_users_favorites.toLocaleString("ru")}
                  </span>
                </div>
              )}
              {anime.type?.description && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text2)]">Тип</span>
                  <span className="flex items-center gap-1"><Tv size={12} className="text-[var(--text3)]"/> {anime.type.description}</span>
                </div>
              )}
              {animeEpisodes(anime) && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text2)]">Эпизоды</span>
                  <span className="flex items-center gap-1"><Clock size={12} className="text-[var(--text3)]"/> {animeEpisodes(anime)}</span>
                </div>
              )}
              {year && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text2)]">Год</span>
                  <span className="flex items-center gap-1"><Calendar size={12} className="text-[var(--text3)]"/> {year}</span>
                </div>
              )}
              {anime.season?.description && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text2)]">Сезон</span>
                  <span>{anime.season.description}</span>
                </div>
              )}
              {anime.average_duration_of_episode && Math.round(anime.average_duration_of_episode / 60) > 2 && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text2)]">Длительность</span>
                  <span>~{Math.round(anime.average_duration_of_episode / 60)} мин.</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[var(--text2)]">Статус</span>
                <span className={anime.is_ongoing ? "text-green-400 font-semibold" : "text-[var(--text2)]"}>
                  {anime.is_ongoing ? "● Онгоинг" : "Завершён"}
                </span>
              </div>
              {titleEn && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <p className="text-[var(--text3)] text-xs mb-1">Английское название</p>
                  <p className="text-xs text-[var(--text2)]">{titleEn}</p>
                </div>
              )}
            </div>

            {genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {genres.map(g => (
                  <Link key={g.id} href={`/anime?genre=${encodeURIComponent(g.name)}`}
                    className="px-2.5 py-1 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)] rounded-lg text-xs transition-all">
                    {g.name}
                  </Link>
                ))}
              </div>
            )}

            <AdBanner slot="sidebar" />
          </div>

          {/* Main */}
          <div className="space-y-5 min-w-0">
            {/* Title */}
            <div className="space-y-1">
              <h1 className="text-2xl xl:text-3xl font-black leading-tight tracking-tight">{title}</h1>
              {titleEn && <p className="text-[var(--text3)] text-sm">{titleEn}</p>}
            </div>

            {/* Description */}
            {desc && (
              <div className="bg-[var(--surface)]/50 rounded-xl p-3 border border-[var(--border)]">
                <p className="text-[var(--text2)] leading-relaxed text-sm">{desc}</p>
              </div>
            )}

            {/* Player */}
            <PlayerSources animeId={anime.id} episodes={epList} title={title} titleEn={titleEn ?? undefined} poster={poster ?? undefined} slug={slug} />

            {/* Ad below player — managed from admin panel */}
            <AdBanner slot="in-player" />

            {/* Rating */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
              <h2 className="text-sm font-bold mb-3 flex items-center gap-2 text-[var(--text2)] uppercase tracking-wide">
                <Star size={14} className="text-amber-400" fill="currentColor" /> Ваша оценка
              </h2>
              <AnimeRating animeId={String(anime.id)} />
            </div>

            {/* Comments */}
            <CommentSection animeId={String(anime.id)} />

            {/* Similar */}
            {similar.length > 0 && (
              <div>
                <h2 className="text-base font-bold mb-4 section-line pl-3">Похожие аниме</h2>
                <SimilarRow items={similar.map(a => ({
                  id: a.id, slug: animeSlug(a), title: animeTitle(a),
                  poster: animePoster(a), year: animeYear(a),
                  genres: a.genres?.slice(0,2).map(g => g.name) ?? [],
                  isOngoing: !!a.is_ongoing, episodes: a.episodes_total ?? null,
                }))} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
