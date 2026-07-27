import { NextRequest, NextResponse } from "next/server";
import { clientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";

const CDN = "https://anilibria.top";

const ALLOWED_HOSTS = ["anilibria.top", "libria.fun"];

function isAllowedHost(urlStr: string): boolean {
  try {
    const { hostname } = new URL(urlStr);
    return ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith("." + h));
  } catch { return false; }
}

// m3u8 manifest cache: url → { body, expires }
const m3u8Cache = new Map<string, { body: string; expires: number; vod: boolean }>();

const UPSTREAM_HEADERS = {
  "Referer": "https://anilibria.top/",
  "Origin": "https://anilibria.top",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

function getIp(req: NextRequest): string {
  return clientIp(req);
}

/**
 * fetch() with a timeout that validates EVERY hop of a redirect chain against
 * the host allow-list. With the default `redirect: "follow"` only the first URL
 * is ever checked, so an open redirect anywhere on anilibria.top would let a
 * caller steer this server-side fetch at an arbitrary host.
 */
async function fetchChecked(
  url: string,
  extraHeaders: Record<string, string> = {},
  ms = 10_000,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    let target = url;
    for (let hop = 0; hop < 4; hop++) {
      if (!isAllowedHost(target)) throw new Error("blocked host in redirect chain");
      const res = await fetch(target, {
        headers: { ...UPSTREAM_HEADERS, ...extraHeaders },
        redirect: "manual",
        signal: ctrl.signal,
      });
      if (res.status < 300 || res.status >= 400) return res;
      const location = res.headers.get("location");
      if (!location) return res;
      res.body?.cancel().catch(() => {});
      target = new URL(location, target).toString();
    }
    throw new Error("too many redirects");
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  const ip = getIp(req);

  // Rate limit: 400 requests / 5 min per IP.
  // Only manifests normally reach this route — segment URIs are left pointing
  // straight at the CDN (see below) — so this ceiling is generous.
  if (!rateLimit(`hls:${ip}`, 400, 5 * 60 * 1000)) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "no url" }, { status: 400 });

  const target = url.startsWith("http") ? url : CDN + url;

  if (!isAllowedHost(target)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // ── Media segments ────────────────────────────────────────────────────────
  // Fallback path only (playlists hand segment URIs to the browser directly).
  // Streams the upstream body through instead of buffering the whole segment
  // into memory first: a 1080p segment is ~7 MB, and buffering it added a full
  // segment-download of latency before the client saw a single byte, which also
  // halved hls.js's throughput measurement and dragged ABR down a rung.
  if (!target.includes(".m3u8")) {
    try {
      const range = req.headers.get("range");
      const seg = await fetchChecked(target, range ? { Range: range } : {}, 15_000);
      if (!seg.ok || !seg.body) return new NextResponse("segment error", { status: 502 });

      const headers = new Headers({
        "Content-Type": "video/mp2t",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
        "Accept-Ranges": "bytes",
      });
      for (const h of ["content-length", "content-range"]) {
        const v = seg.headers.get(h);
        if (v) headers.set(h, v);
      }
      return new NextResponse(seg.body, { status: seg.status, headers });
    } catch {
      return new NextResponse("segment timeout", { status: 504 });
    }
  }

  // Serve from cache if fresh
  const cached = m3u8Cache.get(target);
  if (cached && Date.now() < cached.expires) {
    return new NextResponse(cached.body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": cached.vod ? "private, max-age=600" : "no-cache",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    const upstream = await fetchChecked(target);

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "upstream error", status: upstream.status },
        { status: 502 }
      );
    }

    const text = await upstream.text();
    const base = new URL(target);
    // Anilibria signs playlist URLs with ?countryIso=…&isAuthorized=… — a
    // relative segment URI has to inherit that query or the CDN may reject it.
    const inheritedQuery = base.search;

    const rewritten = text
      .split("\n")
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return line;

        let absolute: string;
        if (trimmed.startsWith("http")) {
          absolute = trimmed;
        } else if (trimmed.startsWith("/")) {
          absolute = CDN + trimmed;
        } else {
          absolute =
            base.origin +
            base.pathname.split("/").slice(0, -1).join("/") +
            "/" + trimmed +
            (trimmed.includes("?") ? "" : inheritedQuery);
        }

        // Nested playlists keep going through the proxy (they need rewriting
        // too). Segments are handed to the browser as direct CDN URLs on
        // purpose: the CDN echoes Origin in Access-Control-Allow-Origin, so
        // cross-origin fetches succeed, and going direct gives full CDN
        // throughput. Routing every segment through this server instead would
        // add a hop to each one and make hls.js under-estimate bandwidth,
        // i.e. silently downgrade the picture.
        if (absolute.includes(".m3u8")) {
          return `/api/proxy/hls?url=${encodeURIComponent(absolute)}`;
        }
        return absolute;
      })
      .join("\n");

    // VOD playlists are immutable — cache them hard so a quality switch or a
    // replay never waits on the upstream manifest again.
    const vod = text.includes("#EXT-X-ENDLIST") || text.includes("PLAYLIST-TYPE:VOD");
    m3u8Cache.set(target, {
      body: rewritten,
      expires: Date.now() + (vod ? 600_000 : 15_000),
      vod,
    });
    // Prevent unbounded growth
    if (m3u8Cache.size > 500) {
      const oldest = m3u8Cache.keys().next().value;
      if (oldest) m3u8Cache.delete(oldest);
    }

    return new NextResponse(rewritten, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": vod ? "private, max-age=600" : "no-cache",
        "X-Cache": "MISS",
      },
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") {
      return NextResponse.json({ error: "upstream timeout" }, { status: 504 });
    }
    console.error("HLS proxy error:", e);
    return NextResponse.json({ error: "proxy failed" }, { status: 500 });
  }
}
