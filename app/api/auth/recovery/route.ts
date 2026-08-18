import { NextResponse } from "next/server";
import { authEmailHtml, sendContentIQEmail } from "@/lib/auth-email";
import { allowAuthRequest, requestKey } from "@/lib/auth-rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const lang = body?.lang === "pl" ? "pl" : "en";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: lang === "pl" ? "Podaj poprawny adres email." : "Enter a valid email address." }, { status: 400 });
  }
  if (!allowAuthRequest(requestKey(request, "recovery", email))) {
    return NextResponse.json({ error: lang === "pl" ? "Za dużo prób. Spróbuj ponownie za 15 minut." : "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  try {
    const admin = createAdminClient();
    const origin = new URL(request.url).origin;
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || origin).replace(/\/$/, "");
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(`/reset-password?lang=${lang}`)}`,
      },
    });
    const actionLink = data?.properties?.action_link;

    if (!error && actionLink) {
      const delivery = await sendContentIQEmail({
        to: email,
        subject: lang === "pl" ? "Ustaw nowe hasło w ANM ContentIQ" : "Set a new ANM ContentIQ password",
        html: authEmailHtml({
          title: lang === "pl" ? "Ustaw nowe hasło" : "Set a new password",
          description: lang === "pl" ? "Kliknij przycisk, aby bezpiecznie ustawić nowe hasło." : "Click the button to securely set a new password.",
          buttonLabel: lang === "pl" ? "Ustaw nowe hasło" : "Set new password",
          actionLink,
        }),
        text: `${lang === "pl" ? "Ustaw nowe hasło" : "Set a new password"}: ${actionLink}`,
      });
      if (!delivery.sent) console.error("ContentIQ recovery email error:", delivery.error);
    }

    return NextResponse.json({
      ok: true,
      message: lang === "pl" ? "Jeśli konto istnieje, wysłaliśmy instrukcję zmiany hasła." : "If the account exists, password reset instructions have been sent.",
    });
  } catch (error) {
    console.error("ContentIQ recovery error:", error);
    return NextResponse.json({ error: lang === "pl" ? "Wysyłka jest chwilowo niedostępna." : "Email delivery is temporarily unavailable." }, { status: 503 });
  }
}
