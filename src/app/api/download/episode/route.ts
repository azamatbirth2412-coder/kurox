import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

// Vercel Pro: up to 300s. Free tier: 60s — large episodes may be cut off on free.
export const maxDuration = 300;

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

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function GET(req: NextRequest) {
  // Rate limit: 5 downloads per IP per 10 minutes
  const ip = getIp(req);
  if (!rateLimit(`dl:${ip}`, 5, 10 * 60 * 1000)) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": "600" },
    });
  }

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

    // 3. True streaming — pipe each segment's body directly to the client
    // No arrayBuffer() buffering — bytes flow as they arrive from CDN
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for (const seg of segments) {
            const r = await fetch(seg, { headers: HEADERS });
            if (!r.ok || !r.body) continue;
            const reader = r.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });

    // Sanitize filename (keep Cyrillic, latin, digits, spaces, dots, brackets, dashes)
    const safeName = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim() || "episode.ts";

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "video/mp2t",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (e) {
    console.error("Episode download error:", e);
    return new NextResponse("download failed", { status: 500 });
  }
}
