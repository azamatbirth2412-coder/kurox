import { NextRequest, NextResponse } from "next/server";

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
  var cookies = document.cookie.split(";");
  for (var i = 0; i < cookies.length; i++) {
    var name = cookies[i].trim().split("=")[0];
    if (!name) continue;
    var expires = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = name + "=;" + expires + ";path=/";
    document.cookie = name + "=;" + expires + ";path=/;domain=localhost";
    document.cookie = name + "=;" + expires + ";path=/;domain=" + location.hostname;
  }
  document.getElementById("m").textContent = "Готово! Переходим на вход…";
  setTimeout(function(){ window.location.replace("/auth/login"); }, 800);
</script>
</body>
</html>`;

  const res = new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

  const baseNames = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "authjs.csrf-token",
    "__Host-authjs.csrf-token",
    "authjs.callback-url",
    "__Secure-authjs.callback-url",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
  ];

  const cookieNames: string[] = [...baseNames];
  for (const name of ["authjs.session-token", "__Secure-authjs.session-token", "next-auth.session-token", "__Secure-next-auth.session-token"]) {
    for (let i = 0; i < 10; i++) cookieNames.push(`${name}.${i}`);
  }

  for (const name of cookieNames) {
    res.cookies.set(name, "", { maxAge: 0, path: "/" });
  }

  return res;
}
