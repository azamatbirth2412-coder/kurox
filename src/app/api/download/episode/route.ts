import { NextRequest, NextResponse } from "next/server";

const CDN = "https://anilibria.top";
const ALLOWED_HOSTS = ["anilibria.top", "libria.fun"];

const HEADERS = {
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
    const mRes = await fetch(target, { headers: HEADERS });
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

    // 3. Stream all segments to client (8 in parallel, output in order)
    const BATCH = 8;
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for (let i = 0; i < segments.length; i += BATCH) {
            const batch = segments.slice(i, i + BATCH);
            const buffers = await Promise.all(
              batch.map(async seg => {
                const r = await fetch(seg, { headers: HEADERS });
                if (!r.ok) return new Uint8Array(0);
                return new Uint8Array(await r.arrayBuffer());
              })
            );
            for (const buf of buffers) controller.enqueue(buf);
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });

    const safeName = name.replace(/[^\w\s\-.\[\]()]/g, "").trim() || "episode.ts";

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
