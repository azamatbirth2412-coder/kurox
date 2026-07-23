import { NextRequest, NextResponse } from "next/server";

const CDN = "https://anilibria.top";
const ALLOWED_HOSTS = ["anilibria.top", "libria.fun"];

function isAllowed(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith("." + h));
  } catch { return false; }
}

function toProxied(raw: string | null): string | null {
  if (!raw) return null;
  const abs = raw.startsWith("http") ? raw : CDN + raw;
  if (!isAllowed(abs)) return null;
  return `/api/proxy/hls?url=${encodeURIComponent(abs)}`;
}

// Generates an HLS master playlist that lists all available quality variants.
// HLS.js uses this to do true Adaptive Bitrate (ABR) — automatically switching
// quality based on measured download speed.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const p480  = toProxied(p.get("hls_480"));
  const p720  = toProxied(p.get("hls_720"));
  const p1080 = toProxied(p.get("hls_1080"));

  if (!p480 && !p720 && !p1080) {
    return NextResponse.json({ error: "no valid streams" }, { status: 400 });
  }

  const lines: string[] = ["#EXTM3U", "#EXT-X-VERSION:3", ""];

  // Order: highest bitrate first (HLS.js starts from best and drops if needed)
  if (p1080) {
    lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=8000000,RESOLUTION=1920x1080,NAME="1080"`);
    lines.push(p1080);
  }
  if (p720) {
    lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720,NAME="720"`);
    lines.push(p720);
  }
  if (p480) {
    lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=854x480,NAME="480"`);
    lines.push(p480);
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "application/vnd.apple.mpegurl",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
    },
  });
}
