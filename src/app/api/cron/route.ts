import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getTrending, getSchedule, animeSlug, type AnilibriaAnime } from "@/lib/anilibria";

// Protect cron with secret key from .env
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  // Auth check
  const secret = req.nextUrl.searchParams.get("secret");
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];
  const errors: string[] = [];

  try {
    // 1. Revalidate homepage
    revalidatePath("/");
    results.push("/ — ok");

    // 2. Revalidate anime catalog
    revalidatePath("/anime");
    results.push("/anime — ok");

    // 3. Revalidate schedule
    revalidatePath("/schedule");
    results.push("/schedule — ok");

    // 4. Fetch trending + schedule to find ongoing anime, revalidate their pages
    const [trending, schedule] = await Promise.allSettled([
      getTrending(0, 20),
      getSchedule(),
    ]);

    const animeToRefresh: AnilibriaAnime[] = [
      ...(trending.status === "fulfilled" ? trending.value : []),
      ...(schedule.status === "fulfilled" ? schedule.value : []),
    ];

    // Deduplicate by id
    const seen = new Set<number>();
    const unique = animeToRefresh.filter(a => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });

    // Revalidate ongoing anime pages (most likely to have new episodes)
    const ongoing = unique.filter(a => a.is_ongoing);
    for (const a of ongoing) {
      try {
        const slug = animeSlug(a);
        revalidatePath(`/anime/${slug}`);
        results.push(`/anime/${slug} — ok`);
      } catch (e) {
        errors.push(`anime ${a.id}: ${(e as Error).message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      revalidated: results.length,
      timestamp: new Date().toISOString(),
      pages: results,
      errors: errors.length ? errors : undefined,
    });

  } catch (e) {
    console.error("Cron error:", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
