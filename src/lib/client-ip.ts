// Resolving the caller's IP for rate limiting.
//
// `x-forwarded-for` is a CLIENT-SUPPLIED header. Taking `split(",")[0]` — the
// left-most entry — hands the attacker the bucket key: send a fresh random XFF
// per request and every limiter (login brute-force, register spam, the
// 5-attempts guard on the 6-digit reset code) resets to zero.
//
// This app is deployed on Vercel, whose edge OVERWRITES these two headers with
// the real peer address before the request reaches us, so they cannot be forged
// from outside:
//   • x-vercel-forwarded-for  — Vercel's own, most specific
//   • x-real-ip               — also set by the Vercel edge
//
// The XFF fallback takes the RIGHT-most entry (the hop appended by the closest
// trusted proxy) rather than the left-most, which is the part a client controls.
// Behind a self-hosted nginx, set `proxy_set_header X-Real-IP $remote_addr;`
// and this keeps working unchanged.
export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  const vercel = req.headers.get("x-vercel-forwarded-for")?.trim();
  if (vercel) return vercel;

  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;

  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff.split(",").map((h) => h.trim()).filter(Boolean);
    const last = hops[hops.length - 1];
    if (last) return last;
  }

  // No trustworthy source. Returning a single shared bucket is deliberate: it
  // fails CLOSED (everyone shares one limit) instead of open (unlimited).
  return "unknown";
}
