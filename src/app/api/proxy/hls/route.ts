import { NextRequest, NextResponse } from "next/server";
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
const m3u8Cache = new Map<string, { body: string; expires: number }>();

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

async function fetchWithTimeout(url: string, options: RequestInit, ms = 10_000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  const ip = getIp(req);

  // Rate limit: 400 requests / 5 min per IP
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

  // Non-m3u8 segments (.ts) → proxy through server (redirect causes CORS errors on fetch)
  if (!target.includes(".m3u8")) {
    try {
      const seg = await fetchWithTimeout(target, {
        headers: {
          "Referer": "https://anilibria.top/",
          "Origin": "https://anilibria.top",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      }, 15_000);
      if (!seg.ok) return new NextResponse("segment error", { status: 502 });
      const buf = await seg.arrayBuffer();
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": "video/mp2t",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch {
      return new NextResponse("segment timeout", { status: 504 });
    }
  }

  // Serve from cache if fresh (30 s)
  const cached = m3u8Cache.get(target);
  if (cached && Date.now() < cached.expires) {
    return new NextResponse(cached.body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    const upstream = await fetchWithTimeout(target, {
      headers: {
        "Referer": "https://anilibria.top/",
        "Origin": "https://anilibria.top",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "upstream error", status: upstream.status },
        { status: 502 }
      );
    }

    const text = await upstream.text();
    const base = new URL(target);

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
          absolute = base.origin + base.pathname.split("/").slice(0, -1).join("/") + "/" + trimmed;
        }

        if (absolute.includes(".m3u8")) {
          return `/api/proxy/hls?url=${encodeURIComponent(absolute)}`;
        }
        return absolute;
      })
      .join("\n");

    // Cache for 30 seconds
    m3u8Cache.set(target, { body: rewritten, expires: Date.now() + 30_000 });
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
        "Cache-Control": "no-cache",
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
