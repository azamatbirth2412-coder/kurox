import { NextRequest, NextResponse } from "next/server";
import { searchAnilibria, animePoster, animeSlug, animeTitle } from "@/lib/anilibria";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  const results = await searchAnilibria(q, 0, 12);

  const data = results.map(a => ({
    id: a.id,
    slug: animeSlug(a),
    title: animeTitle(a),
    titleEn: a.name?.english || null,
    poster: animePoster(a),
    type: a.type?.description || null,
    year: a.year || null,
    is_ongoing: a.is_ongoing,
  }));

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
  });
}
