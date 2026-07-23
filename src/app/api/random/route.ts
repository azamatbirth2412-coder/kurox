import { NextResponse } from "next/server";
import { getPopular, animeSlug } from "@/lib/anilibria";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Pick a random page (catalog has ~1850 releases → ~90 pages of 20).
    // Keep within bounds — pages past the end return an empty list.
    const offset = Math.floor(Math.random() * 80);
    const anime = await getPopular(offset, 20);

    if (!anime.length) {
      return NextResponse.redirect(new URL("/anime", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
    }

    const pick = anime[Math.floor(Math.random() * anime.length)];
    const slug = animeSlug(pick);
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return NextResponse.redirect(new URL(`/anime/${slug}`, base), { status: 302 });
  } catch {
    return NextResponse.redirect(new URL("/anime", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  }
}
