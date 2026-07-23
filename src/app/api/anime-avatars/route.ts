import { NextResponse } from "next/server";

// Top anime characters from Jikan (MyAnimeList API) — cached 1 hour
export const revalidate = 3600;

export async function GET() {
  try {
    const res = await fetch("https://api.jikan.moe/v4/top/characters?limit=24", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("jikan error");
    const data = await res.json() as { data: { mal_id: number; name: string; images: { jpg: { image_url: string } } }[] };
    const avatars = data.data.map(c => ({
      id: c.mal_id,
      name: c.name,
      url: c.images.jpg.image_url,
    }));
    return NextResponse.json(avatars);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
