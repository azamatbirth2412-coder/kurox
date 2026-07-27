import { NextRequest, NextResponse } from "next/server";
import { clientIp } from "@/lib/client-ip";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimitAsync } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    // Brute-force guard for the 6-digit code: 5 attempts / 10 min per IP
    if (!(await rateLimitAsync(`reset-pw:${ip}`, 5, 10 * 60_000))) {
      return NextResponse.json(
        { error: "Слишком много попыток. Попробуйте позже." },
        { status: 429 }
      );
    }

    const { email, code, password, token } = await req.json();
    const lookupCode = code ?? token;

    if (!lookupCode || typeof lookupCode !== "string" || !password)
      return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
    if (typeof password !== "string" || password.length < 8)
      return NextResponse.json({ error: "Пароль минимум 8 символов" }, { status: 400 });

    // SECURITY: the reset "token" is only a 6-digit number (see forgot-password).
    // The previous `where: email ? {email, token} : {token}` fallback meant a request
    // that simply omitted `email` was matched against EVERY outstanding token in the
    // table — so one lucky guess out of 10^6 took over whichever account happened to
    // hold that code, with no need to know or target any specific user. Requiring the
    // email binds each guess to one account. The real UI flow
    // (src/app/auth/forgot-password/page.tsx) always posts { email, code, password },
    // so this does not change any reachable user journey.
    if (!email || typeof email !== "string")
      return NextResponse.json({ error: "Неверный код" }, { status: 400 });

    const record = await prisma.passwordResetToken.findFirst({
      where: { email, token: lookupCode },
    });

    if (!record)
      return NextResponse.json({ error: "Неверный код" }, { status: 400 });
    if (record.expires < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: record.id } });
      return NextResponse.json({ error: "Код устарел. Запросите новый." }, { status: 400 });
    }

    // Always use the email stored with the token — the request may omit it
    // (previously `where: { email: undefined }` crashed with a 500)
    await prisma.user.update({
      where: { email: record.email },
      data: { password: await bcrypt.hash(password, 12) },
    });

    await prisma.passwordResetToken.delete({ where: { id: record.id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("reset-password error:", e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}
