import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

// Per-route rate limits: [prefix, max requests, window ms]
const ROUTE_LIMITS: [string, number, number][] = [
  ["/api/auth/register",        5,   60_000],
  ["/api/auth/forgot-password", 3,   60_000],
  ["/api/auth/reset-password",  5,   60_000],
  ["/api/comments",             15,  60_000],
  ["/api/auth/signin",          10,  60_000],
  // NextAuth v5 credentials login actually POSTs to /api/auth/callback/credentials —
  // without this entry password brute force was not rate limited at all
  ["/api/auth/callback",        10,  60_000],
];

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// In-memory brute-force protection for admin routes
const failedAttempts = new Map<string, { count: number; blockedUntil: number }>();

// True if a NextAuth session token is present. IMPORTANT: large JWTs are split
// into chunked cookies (`authjs.session-token.0`, `.1`, ...) with NO cookie under
// the exact base name — a plain get() misses them and falsely redirects logged-in
// users to /auth/login.
const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

function hasSessionCookie(req: NextRequest): boolean {
  return req.cookies
    .getAll()
    .some(({ name }) =>
      SESSION_COOKIE_NAMES.some((base) => name === base || name.startsWith(`${base}.`)),
    );
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getIp(req);
  const now = Date.now();

  // ── Auth routes: block empty/suspicious User-Agents ─────────────────────
  if (pathname.startsWith("/api/auth/")) {
    const ua = req.headers.get("user-agent") ?? "";
    if (!ua || ua.length < 10) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // ── Per-route strict rate limits ─────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    const match = ROUTE_LIMITS.find(([prefix]) => pathname.startsWith(prefix));
    if (match) {
      const [prefix, max, windowMs] = match;
      if (!rateLimit(`${ip}::${prefix}`, max, windowMs)) {
        return NextResponse.json(
          { error: "Слишком много запросов. Попробуйте позже." },
          {
            status: 429,
            headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) },
          },
        );
      }
    }
  }

  // ── Global API rate limit (120 req/min per IP) ───────────────────────────
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/proxy/")) {
    if (!rateLimit(`api:${ip}`, 120, 60_000)) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: { "Retry-After": "60", "Content-Type": "text/plain" },
      });
    }
  }

  // ── Protect /admin/* routes ──────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    const record = failedAttempts.get(ip);
    if (record && now < record.blockedUntil) {
      return new NextResponse("Доступ заблокирован. Попробуйте позже.", {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((record.blockedUntil - now) / 1000)) },
      });
    }

    if (!hasSessionCookie(req)) {
      const rec = failedAttempts.get(ip) ?? { count: 0, blockedUntil: 0 };
      rec.count++;
      if (rec.count >= 10) rec.blockedUntil = now + 15 * 60 * 1000;
      failedAttempts.set(ip, rec);

      const url = req.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }

    if (record) failedAttempts.delete(ip);
  }

  // ── Protect /profile/* routes ────────────────────────────────────────────
  if (pathname.startsWith("/profile")) {
    if (!hasSessionCookie(req)) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  const res = NextResponse.next();

  // ── Security & tracing headers ───────────────────────────────────────────
  res.headers.set("X-Request-ID", crypto.randomUUID());
  if (pathname.startsWith("/admin")) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return res;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/profile/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
