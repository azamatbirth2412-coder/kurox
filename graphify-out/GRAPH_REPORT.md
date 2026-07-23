# Graph Report - c:/Users/ADMIN/Desktop/kurox/src  (2026-07-23)

## Corpus Check
- Large corpus: 1615 files · ~2,850,355 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 619 nodes · 1006 edges · 71 communities (57 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Anime Data Layer
- Auth & Session
- UI Components
- Admin Panel
- Profile & Titles
- Search & Filters
- Video Player
- SEO & Metadata
- API Routes
- Genre & Tags
- Module 10
- Module 11
- Module 12
- Module 13
- Module 14
- Module 15
- Module 16
- Module 17
- Module 18
- Module 19
- Module 20
- Module 21
- Module 22
- Module 23
- Module 24
- Module 25
- Module 26
- Module 27
- Module 28
- Module 29
- Module 30
- Module 31
- Module 33
- Module 34
- Module 35
- Module 36
- Module 37
- Module 38
- Module 39
- Module 40
- Module 41
- Module 42
- Module 43
- Module 44
- Module 45
- Module 47
- Module 48
- Module 49
- Module 52
- Module 53
- Module 54
- Module 55
- Module 56
- Module 57
- Module 70

## God Nodes (most connected - your core abstractions)
1. `animeSlug()` - 27 edges
2. `animePoster()` - 22 edges
3. `animeTitle()` - 22 edges
4. `animeYear()` - 18 edges
5. `toCard()` - 13 edges
6. `calcLevel()` - 12 edges
7. `AnimePage()` - 11 edges
8. `animeEpisodes()` - 11 edges
9. `getPopular()` - 11 edges
10. `AnimeCatalogPage()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `AdminAnimePage()` --calls--> `getTotalAnimeCount()`  [EXTRACTED]
  app/admin/anime/page.tsx → lib/anilibria.ts
- `AdminDashboard()` --calls--> `animePoster()`  [EXTRACTED]
  app/admin/page.tsx → lib/anilibria.ts
- `AdminDashboard()` --calls--> `animeSlug()`  [EXTRACTED]
  app/admin/page.tsx → lib/anilibria.ts
- `AdminDashboard()` --calls--> `animeTitle()`  [EXTRACTED]
  app/admin/page.tsx → lib/anilibria.ts
- `generateStaticParams()` --calls--> `animeSlug()`  [EXTRACTED]
  app/anime/[slug]/page.tsx → lib/anilibria.ts

## Import Cycles
- None detected.

## Communities (71 total, 14 thin omitted)

### Community 0 - "Anime Data Layer"
Cohesion: 0.05
Nodes (29): AdminTitle, EMPTY_FORM, RARITY_BADGE_CLASSES, RARITY_LABELS, TitleManagement(), Comment, CommentSection(), CommentUser (+21 more)

### Community 1 - "Auth & Session"
Cohesion: 0.11
Nodes (26): getIp(), POST(), POST(), POST(), schema, POST(), ALLOWED_HOSTS, fetchWithTimeout() (+18 more)

### Community 2 - "UI Components"
Cohesion: 0.11
Nodes (19): metadata, orgSchema, viewport, websiteSchema, Footer(), INFO_LINKS, NAV_LINKS, SHOW_GENRES (+11 more)

### Community 3 - "Admin Panel"
Cohesion: 0.11
Nodes (17): apiFetch(), currentSeason(), getByGenreShikimori(), getByKindShikimori(), getFilmsShikimori(), getList(), getPopularShikimori(), getSeasonalShikimori() (+9 more)

### Community 4 - "Profile & Titles"
Cohesion: 0.26
Nodes (18): AnimeRow(), toCard(), AnimePage(), buildSchema(), GET(), GenrePage(), PageProps, HeroBanner() (+10 more)

### Community 5 - "Search & Filters"
Cohesion: 0.15
Nodes (18): AdminDashboard(), GET(), ScheduleRow(), AnilibriaEpisode, apiFetch(), cache, CatalogResult, estimateNextEpisodeAt() (+10 more)

### Community 6 - "Video Player"
Cohesion: 0.15
Nodes (17): ClassicsRow(), dailyPick(), getTrendingCached(), metadata, NewReleasesRow(), OngoingRow(), PopularRow(), toCard() (+9 more)

### Community 7 - "SEO & Metadata"
Cohesion: 0.13
Nodes (15): generateMetadata(), PageProps, resolveAnime(), AnimeCard(), AnimeCardProps, SimilarAnime, SimilarRow(), ViewTracker() (+7 more)

### Community 8 - "API Routes"
Cohesion: 0.13
Nodes (17): Episode, EpisodePlayer(), fmt(), fmtXp(), masterUrl(), Props, Quality, QualityOpt (+9 more)

### Community 10 - "Module 10"
Cohesion: 0.18
Nodes (15): AdminAnimePage(), buildUrl(), metadata, PageProps, AnimeCatalogPage(), buildUrl(), metadata, PageProps (+7 more)

### Community 11 - "Module 11"
Cohesion: 0.22
Nodes (13): GET(), PATCH(), GET(), metadata, ProfilePage(), HistoryItem, WatchHistorySection(), calcLevel() (+5 more)

### Community 12 - "Module 12"
Cohesion: 0.11
Nodes (7): AniListAnime, CATALOG_GENRES, FORMAT_RU, GENRE_RU, PageResult, SEASON_RU, STATUS_RU

### Community 13 - "Module 13"
Cohesion: 0.16
Nodes (6): ALLOWED_TYPES, POST(), POST(), { handlers, auth, signIn, signOut }, isUserBanned(), loginSchema

### Community 14 - "Module 14"
Cohesion: 0.17
Nodes (12): AD_TEMPLATES, AdManagement(), AdSlotData, AdType, BannerItem, buildCode(), DimCheck(), DimCheckProps (+4 more)

### Community 15 - "Module 15"
Cohesion: 0.18
Nodes (6): GENRES, metadata, metadata, PageProps, BreadcrumbItem, Breadcrumbs()

### Community 16 - "Module 16"
Cohesion: 0.15
Nodes (7): AnimeReq, hexToRgb(), RARITY_META, ShowcaseTitle, TitleCard(), TitlesShowcase(), TitlesShowcaseProps

### Community 17 - "Module 17"
Cohesion: 0.27
Nodes (10): AnimeRow, cache, genreScore(), getPersonalRecommendations(), getSimilarAnime(), parseArr(), ratingScore(), similarity() (+2 more)

### Community 18 - "Module 18"
Cohesion: 0.29
Nodes (7): checkRateLimit(), containsBannedWords(), createSchema, POST(), rateLimitStore, sanitizeText(), COMMENT_CONFIG

### Community 19 - "Module 19"
Cohesion: 0.28
Nodes (7): generateStaticParams(), GET(), GENRE_NAMES, NOTE: /search is excluded — rendered with robots: { index: false }, sitemap(), AnilibriaAnime, getPopular()

### Community 20 - "Module 20"
Cohesion: 0.22
Nodes (7): EpSource, ExtEpisode, Props, SearchResult, SOURCE_COLORS, SOURCE_LABELS, VideoLink

### Community 21 - "Module 21"
Cohesion: 0.33
Nodes (7): getAnimeById(), getAnimeList(), getTranslations(), KodikAnime, kodikRequest(), KodikResponse, searchAnime()

### Community 23 - "Module 23"
Cohesion: 0.36
Nodes (7): fmt(), getLeaderboard(), LeaderboardPage(), metadata, PRIZES_DATA, rankStyle(), User

### Community 24 - "Module 24"
Cohesion: 0.32
Nodes (6): calcTime(), CountdownBadge(), UPCOMING, UpcomingAnime(), UpcomingItem, useCountdown()

### Community 25 - "Module 25"
Cohesion: 0.33
Nodes (5): DAYS, formatDate(), metadata, UPCOMING_2026, UpcomingCountdown()

### Community 27 - "Module 27"
Cohesion: 0.40
Nodes (3): dateFmt, User, UserManagement()

### Community 28 - "Module 28"
Cohesion: 0.33
Nodes (3): ICONS, Stat, StatIcon

### Community 31 - "Module 31"
Cohesion: 0.40
Nodes (3): DoneEvent, ProgressEvent, SyncMode

### Community 33 - "Module 33"
Cohesion: 0.50
Nodes (4): Anime365Series, Anime365Translation, GET(), PREFERRED

### Community 34 - "Module 34"
Cohesion: 0.70
Nodes (4): AUTH_COOKIE_PREFIXES, clearAuthCookies(), GET(), POST()

### Community 35 - "Module 35"
Cohesion: 0.50
Nodes (4): GET(), moodCache, MOODS, parseArr()

### Community 36 - "Module 36"
Cohesion: 0.60
Nodes (4): ALLOWED_HOSTS, GET(), isAllowed(), toProxied()

### Community 37 - "Module 37"
Cohesion: 0.50
Nodes (4): Countdown(), UpcomingAnimeAdmin(), UpcomingItem, useCountdown()

### Community 38 - "Module 38"
Cohesion: 0.40
Nodes (4): AnimeResult, MoodId, MoodPicker(), MOODS

### Community 39 - "Module 39"
Cohesion: 0.50
Nodes (3): AnimeRating(), StarRating(), StarRatingProps

### Community 40 - "Module 40"
Cohesion: 0.50
Nodes (3): motionConfig, motionTokens, springs

### Community 41 - "Module 41"
Cohesion: 0.83
Nodes (3): DELETE(), POST(), requireAdmin()

### Community 42 - "Module 42"
Cohesion: 0.83
Nodes (3): GET(), POST(), requireAdmin()

### Community 43 - "Module 43"
Cohesion: 0.67
Nodes (3): POST(), requireAdmin(), SEED_TITLES

### Community 44 - "Module 44"
Cohesion: 0.83
Nodes (3): DELETE(), PATCH(), requireAdmin()

### Community 45 - "Module 45"
Cohesion: 0.83
Nodes (3): GET(), getToken(), searchKodik()

### Community 47 - "Module 47"
Cohesion: 0.67
Nodes (3): calcDiff(), EpisodeTimer(), Props

## Knowledge Gaps
- **159 isolated node(s):** `metadata`, `metadata`, `PageProps`, `ProgressEvent`, `DoneEvent` (+154 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `animeSlug()` connect `Profile & Titles` to `Search & Filters`, `Video Player`, `SEO & Metadata`, `Module 10`, `Module 19`, `Module 25`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `animePoster()` connect `Profile & Titles` to `Search & Filters`, `Video Player`, `SEO & Metadata`, `Module 10`, `Module 25`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `animeTitle()` connect `Profile & Titles` to `Search & Filters`, `Video Player`, `SEO & Metadata`, `Module 10`, `Module 25`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `metadata`, `metadata`, `PageProps` to the rest of the system?**
  _159 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Anime Data Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.051418439716312055 - nodes in this community are weakly interconnected._
- **Should `Auth & Session` be split into smaller, more focused modules?**
  _Cohesion score 0.10695187165775401 - nodes in this community are weakly interconnected._
- **Should `UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._