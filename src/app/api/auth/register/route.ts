import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  name: z.string().max(60).optional(),
  email: z.string().email().max(255),
  password: z.string().min(8, "Минимум 8 символов").max(128, "Максимум 128 символов"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!(await rateLimitAsync(`register:${ip}`, 5, 60_000))) {
      return NextResponse.json({ error: "Слишком много попыток. Попробуйте через минуту." }, { status: 429 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }
    const { name, email, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email уже используется" }, { status: 409 });
    }
    const hashed = await bcrypt.hash(password, 12);
    const role = email === process.env.ADMIN_EMAIL ? "ADMIN" : "USER";
    await prisma.user.create({ data: { name, email, password: hashed, role } });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}
