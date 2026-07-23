import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "rtxaza@gmail.com";
const BASE = "https://anilibria.top/api/v1";
const SORT_FRESH  = "f%5Bsorting%5D=FRESH_AT_DESC";
const SORT_RATING = "f%5Bsorting%5D=RATING_DESC";

function sse(event: string, data: object): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function posterUrl(a: { poster?: { optimized?: { src?: string } | null; src?: string } | null }): string | null {
  const raw = a.poster?.optimized?.src || a.poster?.src || "";
  if (!raw) return null;
  return raw.startsWith("http") ? raw : `https://anilibria.top${raw}`;
}

function title(a: { name?: { main?: string; english?: string | null } | null; alias: string }): string {
  return a.name?.main || a.name?.english || a.alias;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) {
    return new Response("Forbidden", { status: 403 });
  }

  const mode = req.nextUrl.searchParams.get("mode") ?? "new";
  const sort     = mode === "all" ? SORT_RATING : SORT_FRESH;
  const maxPages = mode === "all" ? 40 : 2;

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (event: string, data: object) =>
        ctrl.enqueue(enc.encode(sse(event, data)));

      try {
        send("progress", { message: "Загружаем список существующих записей…", page: 0, maxPages });

        // Pre-load existing Anilibria IDs (stored in kodikId)
        const existingSet = new Set(
          (await prisma.anime.findMany({ select: { kodikId: true } })).map(r => r.kodikId)
        );

        let added = 0, updated = 0, errors = 0;
        const newTitles: string[] = [];

        for (let page = 1; page <= maxPages; page++) {
          const res = await fetch(
            `${BASE}/anime/catalog/releases?limit=50&page=${page}&${sort}`,
            { headers: { Accept: "application/json" } }
          );

          if (!res.ok) {
            send("progress", { message: `Страница ${page}: ошибка ${res.status}`, page, maxPages, added, updated, errors });
            break;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const json: any = await res.json();
          const items: any[] = json?.data ?? [];
          if (!items.length) break;

          send("progress", { message: `Страница ${page}/${maxPages} — ${items.length} аниме…`, page, maxPages, added, updated, errors });

          for (const a of items) {
            const animeId = String(a.id);
            const t = title(a);
            const p = posterUrl(a);
            const genres = JSON.stringify((a.genres ?? []).map((g: { name: string }) => g.name));

            try {
              await prisma.anime.upsert({
                where:  { kodikId: animeId },
                update: {
                  title: t,
                  titleEn: a.name?.english ?? null,
                  description: a.description ?? null,
                  poster: p,
                  year: a.year ?? null,
                  status: a.is_ongoing ? "ONGOING" : "FINISHED",
                  type: a.type?.value || "TV",
                  genres,
                  episodesTotal: a.episodes_total ?? null,
                },
                create: {
                  kodikId: animeId,
                  slug: a.alias,
                  title: t,
                  titleEn: a.name?.english ?? null,
                  description: a.description ?? null,
                  poster: p,
                  year: a.year ?? null,
                  status: a.is_ongoing ? "ONGOING" : "FINISHED",
                  type: a.type?.value || "TV",
                  genres,
                  episodesTotal: a.episodes_total ?? null,
                },
              });

              if (!existingSet.has(animeId)) {
                added++;
                newTitles.push(t);
                existingSet.add(animeId);
              } else {
                updated++;
              }
            } catch {
              errors++;
            }
          }

          if (page < maxPages) await new Promise(r => setTimeout(r, 150));
        }

        send("done", { added, updated, errors, newTitles: newTitles.slice(0, 50) });
      } catch (e) {
        send("failure", { message: String(e) });
      } finally {
        ctrl.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "Connection": "keep-alive",
    },
  });
}
