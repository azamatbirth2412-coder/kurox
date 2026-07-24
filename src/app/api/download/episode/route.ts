import { NextRequest, NextResponse } from "next/server";

// Edge Runtime: streaming responses are NOT subject to the 60s serverless timeout.
// CPU time limit is 25s, but network I/O (fetching segments) doesn't count against it.
export const runtime = "edge";
export const dynamic = "force-dynamic";

const CDN = "https://anilibria.top";
const ALLOWED_HOSTS = ["anilibria.top", "libria.fun"];

const FETCH_HEADERS = {
  "Referer": "https://anilibria.top/",
  "Origin": "https://anilibria.top",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

function isAllowed(url: string) {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith("." + h));
  } catch { return false; }
}

export async function GET(req: NextRequest) {
  const url  = req.nextUrl.searchParams.get("url");
  const name = req.nextUrl.searchParams.get("name") || "episode.ts";

  if (!url) return new NextResponse("no url", { status: 400 });

  const target = url.startsWith("http") ? url : CDN + url;
  if (!isAllowed(target)) return new NextResponse("forbidden", { status: 403 });

  try {
    // 1. Fetch m3u8 manifest
    const mRes = await fetch(target, { headers: FETCH_HEADERS });
    if (!mRes.ok) return new NextResponse("manifest error", { status: 502 });
    const manifest = await mRes.text();

    // 2. Parse segment URLs
    const base = target.substring(0, target.lastIndexOf("/") + 1);
    const segments = manifest
      .split("\n")
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("#"))
      .map(l => (l.startsWith("http") ? l : base + l));

    if (segments.length === 0) return new NextResponse("no segments", { status: 502 });

    // 3. True streaming with parallel prefetch:
    //    Fetch BATCH segments concurrently, write them in order, repeat.
    //    Faster than sequential; doesn't OOM like fetching all at once.
    const BATCH = 6;
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for (let i = 0; i < segments.length; i += BATCH) {
            const batch = segments.slice(i, i + BATCH);
            // Fetch batch in parallel
            const responses = await Promise.all(
              batch.map(seg => fetch(seg, { headers: FETCH_HEADERS }))
            );
            // Stream each response body in order
            for (const r of responses) {
              if (!r.ok || !r.body) continue;
              const reader = r.body.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }
            }
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });

    // Keep Cyrillic and common filename chars, strip control chars
    const safeName = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim() || "episode.ts";

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "video/mp2t",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error("Episode download error:", e);
    return new NextResponse("download failed", { status: 500 });
  }
}
