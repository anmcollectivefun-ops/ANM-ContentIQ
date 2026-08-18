import { NextResponse } from "next/server";
import { sendNewContentIQAccountNotification } from "@/lib/auth-email";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNext(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const provider = String(user.app_metadata?.provider || "");
        const alreadyNotified = Boolean(
          user.user_metadata?.contentiq_registration_notified_at
        );
        const createdAt = Date.parse(user.created_at);
        const isRecent =
          Number.isFinite(createdAt) && Date.now() - createdAt < 15 * 60 * 1000;

        if (provider === "google" && isRecent && !alreadyNotified) {
          const notification = await sendNewContentIQAccountNotification({
            email: user.email || "brak adresu",
            provider: "Google",
          });

          if (notification.sent) {
            const admin = createAdminClient();
            await admin.auth.admin.updateUserById(user.id, {
              user_metadata: {
                ...user.user_metadata,
                contentiq_registration_notified_at: new Date().toISOString(),
              },
            });
          } else {
            console.error("ContentIQ Google registration alert error:", notification.error);
          }
        }
      }
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
