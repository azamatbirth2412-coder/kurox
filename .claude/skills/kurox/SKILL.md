---
name: kurox
description: Hard-won facts about this specific codebase — the local DB is empty, the catalog is live Anilibria, and several "obvious" changes silently break things. Read before touching data fetching, the dev server, auth, rate limiting, JSON-LD, or the cosmetics system.
metadata:
  type: project
---

# Kurox — project landmines

Things that cost real debugging time here. Each one is a trap you cannot see
from the code alone.

## Data: the local database is empty

**`prisma.anime` has 0 rows.** The catalog, search, mood picker and similar-anime
rows all read the **live Anilibria API** via `src/lib/anilibria.ts`. The local
Postgres holds only *user* data (accounts, watch history, favourites, ratings,
comments, titles).

If a feature returns nothing, check this first — it is the single most common
cause. A query against `prisma.anime` for catalog content will always look
correct and always return `[]`.

- Catalog data → `getCatalogPage()`, `getByGenre()`, `getTrending()` etc.
- User data → Prisma.

## Anilibria API quirks

- **Multiple `f[genres][]` are ANDed, not ORed.** `Спорт + Музыка` → 0 results.
  To get a union, fetch each genre in parallel and merge/dedupe by id.
- **Only the names in `GENRE_IDS` resolve.** The API has 35 genres; a name that
  isn't in the map is dropped by `genreId()`. `getCatalogPage` now fails closed
  (unresolvable genres → empty result) — do not "fix" that back into a silent
  unfiltered query, which is what made `/anime?genre=Гарем` show the whole
  catalog while the filter chip stayed lit.
- Genre id 5 is spelled **"Сейнен"** upstream; both spellings are mapped.
- **There is no numeric score.** `animeRating()` derives one from collection
  counts (watched/watching/abandoned) and returns `null` below ~60 signals.
  `animeVotes()` is that same population. Never present these as an official rating.

## Dev server

- Runs on **port 3001** — 3000 is held by a pm2 daemon.
- **Never `rm -rf .next` while the dev server is running.** It strips the
  compiled CSS out from under the running process and the site renders as
  unstyled HTML. If you must clear stale types, delete just the offending file
  (`.next/dev/types/app/<route>`), or stop the server first, clear, restart.
- Only one `next dev` may run at a time; a second exits with "Another next dev
  server is already running".
- App-router folders starting with `_` are **private** and produce a 404 — name
  temporary preview routes without the underscore, and delete them after use.

## Security invariants — do not regress these

Each of these replaced a verified, exploitable bug. Keep the helper; don't inline
the old pattern back.

| Use | Never |
|---|---|
| `jsonLdHtml()` from `src/lib/jsonld.ts` in any `<script type="application/ld+json">` | bare `JSON.stringify` — it doesn't escape `</script>`, which was a live XSS via `/genre/<payload>` |
| `clientIp()` from `src/lib/client-ip.ts` for every rate-limit key | `x-forwarded-for.split(",")[0]` — client-supplied, so a random value per request resets any limiter |
| `requireAdminUser()` from `src/lib/auth.ts` on admin writes | trusting `session.user.role` — the JWT caches it for a year, so a demoted admin keeps `ADMIN` |
| `randomInt` from `node:crypto` for codes/tokens | `Math.random()` |

Also: `forgot-password` must **fail closed** when SMTP is unconfigured. It used
to return the reset code in the HTTP response, which was full account takeover.

Note: `import crypto from "crypto"` does not expose `randomInt` under this
bundler — use the `node:crypto` named import.

## Auth / session

`jwtSafeImage()` in `src/lib/auth.ts` strips `data:` URIs and anything over 512
chars out of the token. The JWT lives in a ~4KB cookie; base64 avatars blow it
up and break requests. Avatars are therefore stored as short paths
(`/avatars/avatar_07a.gif`) in `User.image`.

Anything read from the session is only as fresh as the last token refresh.
Server components should read from the DB when correctness matters.

## Cosmetics system

Frames, avatars, sticker packs and title backdrops are **code constants gated by
level**, not DB tables — only `Title` is a real model (it's admin-editable).

- `FRAME_UNLOCKS` (`src/lib/level.ts`) maps frame → unlock level, and the level
  *is* the rarity tier via `frameRarity()` in `src/lib/rarity.ts`.
- A new frame needs 4 edits in `ProfileFrame.tsx` (`FRAMES`, a decoration
  component, `DECORATIONS`, `GLOW`) plus one in `FRAME_UNLOCKS`.
- Title backdrops: hand-drawn art in `TITLE_BG` (`TitleBackgrounds.tsx`), and
  everything else falls back to a motif derived from the title `key` — so every
  title, including ones added later via the admin panel, looks distinct.
- The final title (`MYTHIC_TITLE_KEY = "anilibria"`) gets a one-off holographic
  treatment. Tier animations read the title's own colour from `--tc-soft` /
  `--tc-strong`, set inline by `TitleBadge`.

## Player

`EpisodePlayer.tsx` records watch history from a `timeupdate` handler, which
fires ~4×/second. A `persistedRef` guard makes the POST happen **once per
episode per mount**. Removing it reintroduces hundreds of DB writes per episode.

## Repo hygiene

`set-admin.mjs` and `push-neon.mjs` contain a hardcoded production Neon
password. They are gitignored — **never `git add -A`**. Stage explicitly
(`git add src/ prisma/schema.prisma ...`) and grep the staged diff for
credentials before committing. The repo root also holds ~25 stray junk files
from earlier tooling.

## House style

Per `AGENTS.md` this is a **modified Next.js** — read the relevant guide under
`node_modules/next/dist/docs/` before writing route-handler or server code.

Dark theme only. Directional shadows, never all-around neon bloom. `tabular-nums`
on every number. Scoped transitions — never `transition-all`. `:focus-visible`
on interactive elements. `prefers-reduced-motion` guards on animations. ≥40px hit
areas. Mobile must be clean at 320/375/414/768 with no horizontal scroll.

Verify visual work with real screenshots (Playwright is installed) — do not claim
an improvement you haven't looked at.
