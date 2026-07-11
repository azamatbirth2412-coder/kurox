import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
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
    await prisma.user.create({ data: { name, email, password: hashed } });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}
