import { NextRequest, NextResponse } from "next/server";

// Cookie name prefixes used by NextAuth v4/v5 (plain + secure variants).
const AUTH_COOKIE_PREFIXES = [
  "authjs.",
  "next-auth.",
  "__Secure-authjs.",
  "__Host-authjs.",
  "__Secure-next-auth.",
  "__Host-next-auth.",
];

// Deletes every auth-related cookie that the browser actually sent, including
// every chunk of a chunked session token (name.0, name.1, ... any index).
function clearAuthCookies(req: NextRequest, res: NextResponse) {
  const expired = "Thu, 01 Jan 1970 00:00:00 GMT";
  for (const cookie of req.cookies.getAll()) {
    const isAuthCookie = AUTH_COOKIE_PREFIXES.some((p) => cookie.name.startsWith(p));
    if (!isAuthCookie) continue;
    // Append Set-Cookie headers directly — res.cookies.set() would apply
    // default attributes that may not match how the cookie was originally set.
    res.headers.append(
      "Set-Cookie",
      `${cookie.name}=; Path=/; Expires=${expired}; Max-Age=0`
    );
    if (cookie.name.startsWith("__Secure-") || cookie.name.startsWith("__Host-")) {
      res.headers.append(
        "Set-Cookie",
        `${cookie.name}=; Path=/; Expires=${expired}; Max-Age=0; Secure`
      );
    }
  }
  return res;
}

// Programmatic clearing (used by the login page before sign-in).
export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  return clearAuthCookies(req, res);
}

// Manual clearing: visit /api/clear-auth in the browser.
export async function GET(req: NextRequest) {
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Очистка сессии</title>
<style>
  body{margin:0;background:#0d0d0f;color:#fff;font-family:sans-serif;
       display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;}
  .s{width:40px;height:40px;border:3px solid #333;border-top-color:#a855f7;border-radius:50%;animation:sp 0.8s linear infinite;}
  @keyframes sp{to{transform:rotate(360deg);}}
  p{color:#aaa;font-size:14px;}
</style>
</head>
<body>
<div class="s"></div>
<p id="m">Удаляем сессию…</p>
<script>
  // Belt and braces: also clear non-httpOnly cookies client-side
  var cookies = document.cookie.split(";");
  for (var i = 0; i < cookies.length; i++) {
    var name = cookies[i].trim().split("=")[0];
    if (!name) continue;
    var exp = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = name + "=;" + exp + ";path=/";
    document.cookie = name + "=;" + exp + ";path=/;domain=" + location.hostname;
  }
  document.getElementById("m").textContent = "Готово! Переходим…";
  setTimeout(function(){ window.location.replace("/auth/login"); }, 800);
</script>
</body>
</html>`;

  const res = new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
  return clearAuthCookies(req, res);
}
