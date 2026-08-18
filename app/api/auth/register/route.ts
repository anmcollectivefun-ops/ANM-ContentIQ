import { NextResponse } from "next/server";
import { authEmailHtml, sendContentIQEmail, sendNewContentIQAccountNotification } from "@/lib/auth-email";
import { allowAuthRequest, requestKey } from "@/lib/auth-rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const lang = body?.lang === "pl" ? "pl" : "en";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: lang === "pl" ? "Podaj poprawny adres email." : "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: lang === "pl" ? "Hasło musi mieć minimum 8 znaków." : "Password must have at least 8 characters." }, { status: 400 });
  }
  if (!allowAuthRequest(requestKey(request, "register", email))) {
    return NextResponse.json({ error: lang === "pl" ? "Za dużo prób. Spróbuj ponownie za 15 minut." : "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  try {
    const admin = createAdminClient();
    const origin = new URL(request.url).origin;
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || origin).replace(/\/$/, "");
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        data: { terms_accepted_at: new Date().toISOString(), privacy_accepted_at: new Date().toISOString() },
        redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(`/dashboard?lang=${lang}`)}`,
      },
    });

    const actionLink = data?.properties?.action_link;
    if (error || !actionLink) {
      console.warn("ContentIQ signup link error:", error?.message || "missing link");
      return accepted(lang);
    }

    const delivery = await sendContentIQEmail({
      to: email,
      subject: lang === "pl" ? "Potwierdź konto w ANM ContentIQ" : "Confirm your ANM ContentIQ account",
      html: authEmailHtml({
        title: lang === "pl" ? "Potwierdź konto" : "Confirm your account",
        description: lang === "pl" ? "Kliknij przycisk, aby aktywować konto i wejść do ANM ContentIQ." : "Click the button to activate your account and enter ANM ContentIQ.",
        buttonLabel: lang === "pl" ? "Aktywuj konto" : "Activate account",
        actionLink,
      }),
      text: `${lang === "pl" ? "Potwierdź konto" : "Confirm your account"}: ${actionLink}`,
    });

    if (!delivery.sent) {
      console.error("ContentIQ signup email error:", delivery.error);
      return NextResponse.json({ error: lang === "pl" ? "Konto zapisano, ale wiadomość nie została wysłana. Spróbuj ponownie za chwilę." : "The account was saved, but the email could not be sent. Try again shortly." }, { status: 503 });
    }

    const notification = await sendNewContentIQAccountNotification({ email, provider: "e-mail" });
    if (!notification.sent) console.error("ContentIQ registration alert error:", notification.error);

    return accepted(lang);
  } catch (error) {
    console.error("ContentIQ registration error:", error);
    return NextResponse.json({ error: lang === "pl" ? "Rejestracja jest chwilowo niedostępna." : "Registration is temporarily unavailable." }, { status: 503 });
  }
}

function accepted(lang: "pl" | "en") {
  return NextResponse.json({
    ok: true,
    message: lang === "pl" ? "Sprawdź skrzynkę i kliknij link aktywacyjny." : "Check your inbox and click the activation link.",
  });
}
