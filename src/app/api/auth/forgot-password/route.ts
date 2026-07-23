import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync } from "@/lib/rate-limit";
import { sendPasswordResetCode, sendPasswordResetCodeEthereal } from "@/lib/email";

const smtpConfigured =
  process.env.SMTP_USER &&
  !process.env.SMTP_USER.includes("your_gmail") &&
  process.env.SMTP_PASS &&
  !process.env.SMTP_PASS.includes("your_app_password");

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string")
      return NextResponse.json({ error: "Email обязателен" }, { status: 400 });

    // Uniform response — never reveal whether email exists
    const ok = NextResponse.json({ ok: true });

    // Per-email limit: 3 reset emails per 10 minutes (shared across all cluster workers)
    if (!(await rateLimitAsync(`forgot:${email}`, 3, 10 * 60_000))) return ok;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return ok;

    // 6 numeric digits — matches the UI input boxes
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await prisma.passwordResetToken.deleteMany({ where: { email } });
    await prisma.passwordResetToken.create({ data: { email, token: code, expires } });

    if (smtpConfigured) {
      try {
        await sendPasswordResetCode(email, code);
        console.log("[forgot-password] Email sent to", email);
      } catch (e) {
        console.error("[forgot-password] SMTP error:", (e as Error).message);
      }
      return ok;
    }

    // Dev-only fallback: Ethereal preview (never in production)
    if (process.env.NODE_ENV !== "production") {
      try {
        const { previewUrl } = await sendPasswordResetCodeEthereal(email, code);
        // Return previewUrl so the UI can show a clickable link
        return NextResponse.json({ ok: true, previewUrl: previewUrl ?? null });
      } catch (e) {
        console.error("Ethereal failed:", (e as Error).message);
      }
    } else {
      // SMTP not configured — return code directly so user can reset without email
      return NextResponse.json({ ok: true, code });
    }

    return ok;
  } catch (e) {
    console.error("forgot-password error:", e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}
