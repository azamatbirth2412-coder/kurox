import nodemailer from "nodemailer";

const CODE_HTML = (code: string) => `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Сброс пароля — Kurox</title></head>
<body style="margin:0;padding:0;background:#09080f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09080f;padding:40px 16px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:32px">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:linear-gradient(135deg,#7c3aed,#5b21b6);border-radius:14px;width:48px;height:48px;text-align:center;vertical-align:middle">
                <span style="font-size:24px;font-weight:900;color:#ffffff;line-height:48px;display:block">K</span>
              </td>
              <td style="padding-left:12px;vertical-align:middle">
                <span style="font-size:26px;font-weight:900;color:#c4b5fd;letter-spacing:-0.5px">KUROX</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#110f1a;border:1px solid #2d2540;border-radius:20px;overflow:hidden">

          <!-- Purple top bar -->
          <div style="height:4px;background:linear-gradient(90deg,#7c3aed,#a855f7,#7c3aed)"></div>

          <table width="100%" cellpadding="0" cellspacing="0" style="padding:36px 40px 32px">

            <!-- Heading -->
            <tr><td align="center" style="padding-bottom:8px">
              <span style="font-size:22px;font-weight:700;color:#f1f0f5;letter-spacing:-0.3px">Сброс пароля</span>
            </td></tr>

            <!-- Sub -->
            <tr><td align="center" style="padding-bottom:32px">
              <span style="font-size:14px;color:#9189a8;line-height:1.6">
                Введите этот код на странице восстановления.<br>
                Код действует <strong style="color:#c4b5fd">15 минут</strong>.
              </span>
            </td></tr>

            <!-- Code box -->
            <tr><td align="center" style="padding-bottom:32px">
              <div style="display:inline-block;background:#1a1626;border:2px solid #7c3aed;border-radius:16px;padding:20px 48px">
                <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#c4b5fd;font-variant-numeric:tabular-nums">${code}</span>
              </div>
            </td></tr>

            <!-- Divider -->
            <tr><td style="border-top:1px solid #2d2540;padding-top:24px">
              <p style="margin:0;font-size:12px;color:#5c5570;text-align:center;line-height:1.6">
                Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.<br>
                Ваш пароль останется неизменным.
              </p>
            </td></tr>

          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding-top:24px">
          <span style="font-size:12px;color:#3d3650">© 2026 Kurox · Смотри аниме бесплатно</span>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

export async function sendPasswordResetCode(email: string, code: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"Kurox" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `${code} — ваш код восстановления Kurox`,
    html: CODE_HTML(code),
  });
}

export async function sendPasswordResetCodeEthereal(
  email: string,
  code: string
): Promise<{ previewUrl?: string }> {
  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });

  const info = await transporter.sendMail({
    from: '"Kurox" <noreply@kurox.ru>',
    to: email,
    subject: `${code} — ваш код восстановления Kurox`,
    html: CODE_HTML(code),
  });

  const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
  if (previewUrl) console.log("[DEV] Email preview:", previewUrl);
  return { previewUrl: previewUrl || undefined };
}
