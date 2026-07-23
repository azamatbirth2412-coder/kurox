import { NextRequest, NextResponse } from "next/server";

let cachedToken: string | null = null;
let tokenTtl = 0;

async function getToken(): Promise<string | null> {
  if (process.env.KODIK_TOKEN) return process.env.KODIK_TOKEN;
  if (cachedToken && Date.now() < tokenTtl) return cachedToken;

  // Try to auto-discover public token from Kodik's player scripts
  const sources = [
    "https://kodik.info/",
    "https://kodik.cc/",
  ];

  for (const url of sources) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(5000),
      });
      const html = await res.text();

      // Look for token patterns in page source / scripts
      const patterns = [
        /["']token["']\s*:\s*["']([a-zA-Z0-9]{8,64})["']/,
        /[?&]token=([a-zA-Z0-9]{8,64})/,
        /token%3D([a-zA-Z0-9]{8,64})/,
        /apiToken\s*=\s*["']([a-zA-Z0-9]{8,64})["']/,
      ];

      for (const p of patterns) {
        const m = html.match(p);
        if (m?.[1]) {
          cachedToken = m[1];
          tokenTtl = Date.now() + 6 * 60 * 60 * 1000; // 6h cache
          return cachedToken;
        }
      }
    } catch { /* try next */ }
  }

  return null;
}

async function searchKodik(token: string, title: string, titleEn?: string) {
  const queries = [title, titleEn].filter(Boolean) as string[];

  for (const q of queries) {
    try {
      const params = new URLSearchParams({
        token,
        title: q,
        types: "anime,anime-serial",
        with_material_data: "true",
        limit: "5",
      });
      const res = await fetch(`https://kodikapi.com/search?${params}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const results = data.results ?? [];
      if (results.length > 0) return results[0];
    } catch { /* try next query */ }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const title   = req.nextUrl.searchParams.get("title") ?? "";
  const titleEn = req.nextUrl.searchParams.get("titleEn") ?? "";

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: "no_token", message: "Kodik токен не настроен" }, { status: 503 });
  }

  const result = await searchKodik(token, title, titleEn || undefined);
  if (!result) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Kodik returns a `link` field — the iframe embed URL
  const link: string = result.link ?? "";
  const iframeUrl = link.startsWith("//") ? `https:${link}` : link;

  return NextResponse.json({
    id: result.id,
    title: result.title,
    iframeUrl,
    type: result.type,
    quality: result.quality,
    translations: result.translations ?? [],
  });
}
