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

// Self-contained limiter — @/lib/rate-limit registers a module-scope
// setInterval, which does not belong in an Edge isolate.
const hits = new Map<string, { count: number; resetAt: number }>();
function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    if (hits.size > 1000) for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

/** fetch() that re-validates the host on every redirect hop, not just the first. */
async function fetchChecked(url: string): Promise<Response> {
  let target = url;
  for (let hop = 0; hop < 4; hop++) {
    if (!isAllowed(target)) throw new Error("blocked host");
    const res = await fetch(target, { headers: FETCH_HEADERS, redirect: "manual" });
    if (res.status < 300 || res.status >= 400) return res;
    const location = res.headers.get("location");
    if (!location) return res;
    res.body?.cancel().catch(() => {});
    target = new URL(location, target).toString();
  }
  throw new Error("too many redirects");
}

export async function GET(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  // Each request streams a whole episode with BATCH parallel upstream fetches,
  // so the amplification factor per request is large. Keep the ceiling low.
  if (!allow(`dl:${ip}`, 5, 60_000)) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  const url  = req.nextUrl.searchParams.get("url");
  const name = req.nextUrl.searchParams.get("name") || "episode.ts";

  if (!url) return new NextResponse("no url", { status: 400 });

  const target = url.startsWith("http") ? url : CDN + url;
  if (!isAllowed(target)) return new NextResponse("forbidden", { status: 403 });

  try {
    // 1. Fetch m3u8 manifest
    const mRes = await fetchChecked(target);
    if (!mRes.ok) return new NextResponse("manifest error", { status: 502 });
    const manifest = await mRes.text();

    // 2. Parse segment URLs.
    //    Every segment is re-checked against the allow-list: the manifest body
    //    is remote input, and an absolute URI inside it would otherwise become
    //    a server-side fetch to any host the manifest names.
    const base = target.substring(0, target.lastIndexOf("/") + 1);
    const segments = manifest
      .split("\n")
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("#"))
      .map(l => (l.startsWith("http") ? l : base + l))
      .filter(isAllowed);

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
            const responses = await Promise.all(batch.map(seg => fetchChecked(seg)));
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
