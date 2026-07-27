import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

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

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ── Declared bitrates ───────────────────────────────────────────────────────
// MEASURED from live Anilibria renditions (14 segments sampled across a full
// 24-min episode, ~10 s segments):
//     1080p  peak 5.75 Mbps · avg 2.84 Mbps
//      720p  peak 2.91 Mbps · avg 1.41 Mbps
//      480p  peak 1.34 Mbps · avg 0.73 Mbps
//
// These numbers are load-bearing, not decoration. hls.js picks a level with
// `adjustedBw >= level.maxBitrate` (BANDWIDTH) while the buffer is short and
// `>= level.averageBitrate` (AVERAGE-BANDWIDTH) once it is healthy. The old
// playlist declared 1080p at 8 Mbps with no AVERAGE-BANDWIDTH, so ABR needed
// ~11.4 Mbps of measured throughput before it would ever choose 1080p — a
// stream that actually averages 2.84 Mbps. Everyone below a very fast line was
// pinned to 720p or 480p forever. Keep BANDWIDTH ≈ measured peak and
// AVERAGE-BANDWIDTH ≈ measured average; do not "round up for safety".
const VARIANTS = [
  { key: "hls_1080", bandwidth: 6_000_000, average: 3_000_000, res: "1920x1080", name: "1080" },
  { key: "hls_720",  bandwidth: 3_000_000, average: 1_500_000, res: "1280x720",  name: "720"  },
  { key: "hls_480",  bandwidth: 1_400_000, average:   800_000, res: "854x480",   name: "480"  },
] as const;

// Generates an HLS master playlist listing every available quality variant so
// hls.js can do true Adaptive Bitrate switching, and so a manual quality pick
// is a level switch on the *same* stream (no reload, no lost buffer, no seek).
export async function GET(req: NextRequest) {
  if (!rateLimit(`master:${getIp(req)}`, 120, 5 * 60 * 1000)) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  const p = req.nextUrl.searchParams;
  const lines: string[] = ["#EXTM3U", "#EXT-X-VERSION:6", ""];
  let count = 0;

  // Highest first: hls.js sorts levels by height internally, but the first
  // entry in the manifest becomes `hls.firstLevel` — the fallback used when ABR
  // cannot pick. Falling back to the best rendition beats falling back to 480p.
  for (const v of VARIANTS) {
    const url = toProxied(p.get(v.key));
    if (!url) continue;
    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${v.bandwidth},AVERAGE-BANDWIDTH=${v.average},RESOLUTION=${v.res},NAME="${v.name}"`,
    );
    lines.push(url);
    count++;
  }

  if (count === 0) {
    return NextResponse.json({ error: "no valid streams" }, { status: 400 });
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "application/vnd.apple.mpegurl",
      "Access-Control-Allow-Origin": "*",
      // Deterministic function of the query string, and the query carries
      // per-viewer tokens — cache in the browser only.
      "Cache-Control": "private, max-age=300",
    },
  });
}
