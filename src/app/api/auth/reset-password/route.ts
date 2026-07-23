import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimitAsync } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
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

    const record = await prisma.passwordResetToken.findFirst({
      where: email ? { email, token: lookupCode } : { token: lookupCode },
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
