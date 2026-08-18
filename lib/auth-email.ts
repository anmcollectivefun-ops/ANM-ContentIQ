type MailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function env(name: string) {
  return process.env[name]?.trim() || "";
}

export async function sendContentIQEmail({ to, subject, html, text }: MailInput) {
  const apiKey = env("CONTENTIQ_RESEND_API_KEY") || env("RESEND_API_KEY");
  const from =
    env("CONTENTIQ_EMAIL_FROM") ||
    env("SUPPORT_EMAIL_FROM") ||
    "ANM ContentIQ <contentiq@anmcollective.fun>";

  if (!apiKey) return { sent: false, error: "Missing RESEND_API_KEY." };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!response.ok) {
    return { sent: false, error: `${response.status}: ${await response.text()}` };
  }

  return { sent: true };
}

export function authEmailHtml({
  title,
  description,
  buttonLabel,
  actionLink,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  actionLink: string;
}) {
  return `
    <div style="background:#070816;padding:36px 16px;font-family:Arial,sans-serif;color:#fff">
      <div style="max-width:560px;margin:auto;border:1px solid #26304a;border-radius:24px;padding:32px;background:#11152a">
        <p style="margin:0 0 12px;color:#67e8f9;font-size:12px;font-weight:700;letter-spacing:2px">ANM CONTENTIQ</p>
        <h1 style="margin:0 0 14px;font-size:28px">${escapeHtml(title)}</h1>
        <p style="margin:0 0 24px;color:#cbd5e1;font-size:16px;line-height:1.6">${escapeHtml(description)}</p>
        <a href="${escapeHtml(actionLink)}" style="display:inline-block;border-radius:14px;background:#22d3ee;color:#070816;padding:14px 20px;font-weight:800;text-decoration:none">${escapeHtml(buttonLabel)}</a>
        <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.5">Jeżeli przycisk nie działa, skopiuj link:<br><span style="word-break:break-all">${escapeHtml(actionLink)}</span></p>
      </div>
    </div>
  `;
}

export async function sendNewContentIQAccountNotification({
  email,
  provider,
}: {
  email: string;
  provider: string;
}) {
  const recipient =
    env("CONTENTIQ_REGISTRATION_NOTIFICATION_EMAIL") ||
    "contentiq@anmcollective.fun";

  return sendContentIQEmail({
    to: recipient,
    subject: `Nowa rejestracja ANM ContentIQ — ${email}`,
    html: `<h1>Nowe konto w ANM ContentIQ</h1><p><strong>E-mail:</strong> ${escapeHtml(email)}</p><p><strong>Sposób rejestracji:</strong> ${escapeHtml(provider)}</p>`,
    text: `Nowe konto w ANM ContentIQ\nE-mail: ${email}\nSposób rejestracji: ${provider}`,
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
