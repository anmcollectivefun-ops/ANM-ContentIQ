import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
 
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

function env(name: string) {
  return process.env[name]?.trim() || "";
}
 
async function exchangeMeta(code: string, redirectUri: string): Promise<TokenResult> {
  const shortRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?` +
    `client_id=${env("META_APP_ID")}&` +
    `client_secret=${env("META_APP_SECRET")}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `code=${code}`
  );
  const short = await shortRes.json();
  if (short.error) throw new Error(`Meta token error: ${short.error.message}`);
 
  const longRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?` +
    `grant_type=fb_exchange_token&` +
    `client_id=${env("META_APP_ID")}&` +
    `client_secret=${env("META_APP_SECRET")}&` +
    `fb_exchange_token=${short.access_token}`
  );
  const long = await longRes.json();
  if (long.error) throw new Error(`Meta long token error: ${long.error.message}`);
 
  return { access_token: long.access_token, expires_in: long.expires_in };
}
 
async function exchangeLinkedIn(code: string, redirectUri: string): Promise<TokenResult> {
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: env("LINKEDIN_CLIENT_ID"),
      client_secret: env("LINKEDIN_CLIENT_SECRET"),
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
      client_key: env("TIKTOK_CLIENT_KEY"),
      client_secret: env("TIKTOK_CLIENT_SECRET"),
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
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Google token error: ${data.error_description}`);
  return data;
}
 
async function fetchAccountInfo(
  platform: string,
  token: string
): Promise<{ account_id: string; account_name: string }> {
  try {
    if (platform === "instagram") {
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
      const res = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username",
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
 
function getRedirectUri(req: NextRequest, platform: string) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || req.nextUrl.origin;
  return new URL(`/api/oauth/${platform}/callback`, origin).toString();
}

async function getWorkspaceId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slug: string,
  userId: string
) {
  const { data, error } = await supabase
    .schema("contentiq")
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .single();

  if (data?.id) {
    return data.id as string;
  }

  const { data: created, error: createError } = await supabase
    .schema("contentiq")
    .from("workspaces")
    .insert({
      user_id: userId,
      name: slug
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
      type: "Firma",
      slug,
    })
    .select("id")
    .single();

  if (createError || !created?.id) {
    throw new Error(createError?.message || `Workspace not found: ${slug}`);
  }

  return created.id as string;
}
 
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const error = searchParams.get("error");
 
  if (error) {
    return NextResponse.redirect(
      new URL(`/app/settings?error=oauth_denied&platform=${platform}`, req.url)
    );
  }
 
  if (!code || !stateRaw) {
    return NextResponse.redirect(
      new URL(`/app/settings?error=missing_params&platform=${platform}`, req.url)
    );
  }
 
  let state: StateData;
  try {
    state = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
  } catch {
    return NextResponse.redirect(
      new URL(`/app/settings?error=invalid_state&platform=${platform}`, req.url)
    );
  }
 
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
 
  if (!user || user.id !== state.user_id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
 
  try {
    const redirectUri = getRedirectUri(req, platform);
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
 
    const accountInfo = await fetchAccountInfo(platform, tokenData.access_token);
    const workspaceUuid = await getWorkspaceId(supabase, state.workspace_id, user.id);
 
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;
 
    const { error: dbError } = await supabase
      .schema("contentiq")
      .from("platform_connections")
      .insert(
        {
          workspace_id: workspaceUuid,
          platform,
          account_id: accountInfo.account_id,
          account_name: accountInfo.account_name,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          token_expires_at: expiresAt,
          connected: true,
          last_synced_at: new Date().toISOString(),
        }
      );
 
    if (dbError) {
      console.error("Supabase upsert error:", dbError);
      throw new Error(dbError.message);
    }
 
    const redirectTo = state.workspace_id
      ? `/app/${state.workspace_id}/settings?connected=${platform}&account=${encodeURIComponent(accountInfo.account_name)}`
      : `/app/settings?connected=${platform}`;
 
    return NextResponse.redirect(new URL(redirectTo, req.url));
  } catch (err) {
    console.error(`OAuth callback error [${platform}]:`, err);
    const detail = encodeURIComponent(err instanceof Error ? err.message : String(err));
    const redirectTo = state.workspace_id
      ? `/app/${state.workspace_id}/settings?error=token_exchange&platform=${platform}&detail=${detail}`
      : `/app/settings?error=token_exchange&platform=${platform}&detail=${detail}`;
    return NextResponse.redirect(
      new URL(redirectTo, req.url)
    );
  }
}
