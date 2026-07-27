import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "node:crypto";
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

    // Per-email limit: 8 reset emails per 10 minutes (shared across all cluster workers)
    if (!(await rateLimitAsync(`forgot:${email}`, 8, 10 * 60_000))) {
      return ok;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Deliberately silent: logging "no user found for <email>" turns the log file
      // into an account-enumeration oracle for anyone who can read logs.
      return ok;
    }

    // 6 numeric digits — matches the UI input boxes.
    // SECURITY: must be crypto.randomInt, not Math.random(). V8's Math.random is an
    // xorshift128+ PRNG whose internal state can be recovered from a handful of
    // observed outputs — an attacker able to pull codes for accounts they control
    // could then predict the code minted for a victim. randomInt is CSPRNG-backed.
    const code = String(randomInt(100000, 1000000));
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await prisma.passwordResetToken.deleteMany({ where: { email } });
    await prisma.passwordResetToken.create({ data: { email, token: code, expires } });

    if (smtpConfigured) {
      try {
        await sendPasswordResetCode(email, code);
        // No email address in the log line — see the enumeration note above.
        console.log("[forgot-password] reset code delivered");
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
      // SECURITY: this branch previously did `return NextResponse.json({ ok: true, code })`.
      // In production that hands the 6-digit reset code to *whoever submitted the
      // email address*, so anyone could take over any account by POSTing a victim's
      // email here and replaying the code to /api/auth/reset-password. The only thing
      // standing between that and a full account-takeover was the SMTP_* env vars
      // being set correctly — a rotated/expired SMTP password would silently turn it on.
      // Fail closed instead: the user gets the same uniform response as always and
      // the operator finds out from the logs.
      console.error(
        "[forgot-password] SMTP is not configured — reset code could not be delivered. " +
        "Set SMTP_USER/SMTP_PASS. Refusing to return the code in the HTTP response."
      );
    }

    return ok;
  } catch (e) {
    console.error("forgot-password error:", e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}
