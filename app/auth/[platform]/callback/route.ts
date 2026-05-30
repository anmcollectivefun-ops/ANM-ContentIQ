import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
 
// ─── Typy ────────────────────────────────────────────────────────────────────
interface TokenResult {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}
 
interface StateData {
  user_id: string;
  platform: string;
  workspace_id: string;
  nonce: string;
}
 
// ─── Wymiana code → token dla każdej platformy ───────────────────────────────
 
async function exchangeMeta(code: string, redirectUri: string): Promise<TokenResult> {
  // Krok 1: short-lived token
  const shortRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?` +
    `client_id=${process.env.META_APP_ID}&` +
    `client_secret=${process.env.META_APP_SECRET}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `code=${code}`
  );
  const short = await shortRes.json();
 
  if (short.error) throw new Error(`Meta token error: ${short.error.message}`);
 
  // Krok 2: zamień na long-lived token (60 dni)
  const longRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?` +
    `grant_type=fb_exchange_token&` +
    `client_id=${process.env.META_APP_ID}&` +
    `client_secret=${process.env.META_APP_SECRET}&` +
    `fb_exchange_token=${short.access_token}`
  );
  const long = await longRes.json();
 
  if (long.error) throw new Error(`Meta long token error: ${long.error.message}`);
 
  return {
    access_token: long.access_token,
    expires_in: long.expires_in, // ~5184000 sekund = 60 dni
  };
}
 
async function exchangeLinkedIn(code: string, redirectUri: string): Promise<TokenResult> {
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.LINKEDIN_CLIENT_ID || "",
      client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`LinkedIn token error: ${data.error_description}`);
  return data;
}
 
async function exchangeTikTok(code: string, redirectUri: string): Promise<TokenResult> {
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY || "",
      client_secret: process.env.TIKTOK_CLIENT_SECRET || "",
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`TikTok token error: ${data.error}`);
  return data;
}
 
async function exchangeGoogle(code: string, redirectUri: string): Promise<TokenResult> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Google token error: ${data.error_description}`);
  return data;
}
 
// ─── Pobierz info o koncie po uzyskaniu tokenu ────────────────────────────────
 
async function fetchAccountInfo(platform: string, token: string): Promise<{ account_id: string; account_name: string }> {
  try {
    if (platform === "instagram") {
      // Pobierz Page → potem konto Instagram Business powiązane z Page
      const pagesRes = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?access_token=${token}`
      );
      const pages = await pagesRes.json();
      const page = pages.data?.[0];
      if (!page) return { account_id: "unknown", account_name: "Instagram" };
 
      const igRes = await fetch(
        `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${token}`
      );
      const igData = await igRes.json();
      const igId = igData.instagram_business_account?.id;
 
      if (igId) {
        const igInfoRes = await fetch(
          `https://graph.facebook.com/v19.0/${igId}?fields=name,username&access_token=${token}`
        );
        const igInfo = await igInfoRes.json();
        return { account_id: igId, account_name: `@${igInfo.username || igInfo.name}` };
      }
    }
 
    if (platform === "facebook") {
      const res = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${token}`);
      const data = await res.json();
      const page = data.data?.[0];
      return { account_id: page?.id || "unknown", account_name: page?.name || "Facebook Page" };
    }
 
    if (platform === "linkedin") {
      const res = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return { account_id: data.sub, account_name: data.name || "LinkedIn" };
    }
 
    if (platform === "tiktok") {
      const res = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return {
        account_id: data.data?.user?.open_id || "unknown",
        account_name: `@${data.data?.user?.username || data.data?.user?.display_name || "TikTok"}`,
      };
    }
 
    if (platform === "youtube") {
      const res = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      const channel = data.items?.[0];
      return {
        account_id: channel?.id || "unknown",
        account_name: channel?.snippet?.title || "YouTube Channel",
      };
    }
  } catch (err) {
    console.error("fetchAccountInfo error:", err);
  }
 
  return { account_id: "unknown", account_name: platform };
}
 
// ─── REDIRECT_URI per platforma ───────────────────────────────────────────────
const REDIRECT_URIS: Record<string, string> = {
  instagram: process.env.META_REDIRECT_URI || "",
  facebook: process.env.META_REDIRECT_URI || "",
  linkedin: process.env.LINKEDIN_REDIRECT_URI || "",
  tiktok: process.env.TIKTOK_REDIRECT_URI || "",
  youtube: process.env.GOOGLE_REDIRECT_URI || "",
};
 
// ─── MAIN CALLBACK ────────────────────────────────────────────────────────────
 
export async function GET(
  req: NextRequest,
  { params }: { params: { platform: string } }
) {
  const platform = params.platform;
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const error = searchParams.get("error");
 
  // Błąd autoryzacji od platformy (np. user odrzucił)
  if (error) {
    console.error(`OAuth error from ${platform}:`, error);
    return NextResponse.redirect(
      new URL(`/app/settings?error=oauth_denied&platform=${platform}`, req.url)
    );
  }
 
  if (!code || !stateRaw) {
    return NextResponse.redirect(
      new URL(`/app/settings?error=missing_params&platform=${platform}`, req.url)
    );
  }
 
  // Odkoduj state
  let state: StateData;
  try {
    state = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
  } catch {
    return NextResponse.redirect(
      new URL(`/app/settings?error=invalid_state&platform=${platform}`, req.url)
    );
  }
 
  // Sprawdź czy zalogowany user zgadza się ze state
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
 
  if (!user || user.id !== state.user_id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
 
  try {
    // ── 1. Wymień code na token ──────────────────────────────────────────────
    const redirectUri = REDIRECT_URIS[platform];
    let tokenData: TokenResult;
 
    if (platform === "instagram" || platform === "facebook") {
      tokenData = await exchangeMeta(code, redirectUri);
    } else if (platform === "linkedin") {
      tokenData = await exchangeLinkedIn(code, redirectUri);
    } else if (platform === "tiktok") {
      tokenData = await exchangeTikTok(code, redirectUri);
    } else if (platform === "youtube") {
      tokenData = await exchangeGoogle(code, redirectUri);
    } else {
      throw new Error(`Nieobsługiwana platforma: ${platform}`);
    }
 
    // ── 2. Pobierz info o koncie ─────────────────────────────────────────────
    const accountInfo = await fetchAccountInfo(platform, tokenData.access_token);
 
    // ── 3. Oblicz datę wygaśnięcia tokenu ───────────────────────────────────
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;
 
    // ── 4. Zapisz token do Supabase — przypisany do user_id i workspace ──────
    // Używamy upsert żeby nadpisać jeśli to konto było już wcześniej podpięte
    const { error: dbError } = await supabase
      .from("platform_connections")
      .upsert(
        {
          workspace_id: state.workspace_id || null,
          platform,
          account_id: accountInfo.account_id,
          account_name: accountInfo.account_name,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          token_expires_at: expiresAt,
          connected: true,
          last_synced_at: new Date().toISOString(),
        },
        {
          // Upsert po workspace + platform + account_id
          // Jeden user może mieć kilka kont na tej samej platformie
          onConflict: "workspace_id,platform,account_id",
        }
      );
 
    if (dbError) {
      console.error("Supabase upsert error:", dbError);
      throw new Error(dbError.message);
    }
 
    // ── 5. Przekieruj z powrotem do ustawień ─────────────────────────────────
    const redirectTo = state.workspace_id
      ? `/app/${state.workspace_id}/settings?connected=${platform}&account=${encodeURIComponent(accountInfo.account_name)}`
      : `/app/settings?connected=${platform}`;
 
    return NextResponse.redirect(new URL(redirectTo, req.url));
 
  } catch (err) {
    console.error(`OAuth callback error [${platform}]:`, err);
    return NextResponse.redirect(
      new URL(`/app/settings?error=token_exchange&platform=${platform}`, req.url)
    );
  }
}
