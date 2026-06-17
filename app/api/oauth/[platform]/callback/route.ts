import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
 
interface TokenResult {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  short_access_token?: string;
}
 
interface StateData {
  user_id: string;
  platform: string;
  workspace_id: string;
  nonce: string;
}

interface MetaPage {
  id: string;
  name: string;
}

type MetaPermission = {
  permission?: string;
  status?: string;
};

type MetaDiagnostics = {
  reason: string;
  user: unknown;
  permissions: unknown;
  tokenDebug: unknown;
  grantedScopes: string[];
  requiredScopes: string[];
  missingScopes: string[];
  pagesReturned: MetaPage[];
  pagesRaw: unknown;
};

const META_REQUIRED_SCOPES: Record<string, string[]> = {
  facebook: ["pages_show_list", "pages_read_engagement"],
  instagram: ["pages_show_list", "pages_read_engagement", "instagram_basic", "instagram_manage_insights"],
};

function env(name: string) {
  return process.env[name]?.trim() || "";
}

async function fetchMetaJson(url: string) {
  const res = await fetch(url);
  return res.json().catch(() => null);
}

function getMetaAppId(platform: string) {
  return env("META_APP_ID");
}

function getMetaAppSecret(platform: string) {
  return env("META_APP_SECRET");
}

function getUsedMetaLoginConfigId(platform: string) {
  if (platform === "facebook") {
    return (
      env("FACEBOOK_LOGIN_CONFIG_ID") ||
      env("FACEBOOK_LOGIN_ANALYTICS_CONFIG_ID") ||
      env("FACEBOOK_LOGIN_PUBLISHING_CONFIG_ID") ||
      env("META_LOGIN_CONFIG_ID") ||
      null
    );
  }

  if (platform === "instagram") {
    return (
      env("INSTAGRAM_LOGIN_CONFIG_ID") ||
      env("INSTAGRAM_LOGIN_ANALYTICS_CONFIG_ID") ||
      env("INSTAGRAM_LOGIN_PUBLISHING_CONFIG_ID") ||
      env("META_LOGIN_CONFIG_ID") ||
      null
    );
  }

  return null;
}

function getMetaTokenSource(platform: string) {
  if (platform === "facebook") {
    return "facebook_oauth_user_token_to_page_token";
  }

  if (platform === "instagram") {
    return "instagram_oauth_user_token_to_page_token";
  }

  return "oauth";
}
 
async function exchangeMeta(platform: string, code: string, redirectUri: string): Promise<TokenResult> {
  const clientId = getMetaAppId(platform);
  const clientSecret = getMetaAppSecret(platform);

  if (!clientId || !clientSecret) {
    throw new Error(`Brak danych OAuth dla ${platform}. Sprawdź APP_ID i APP_SECRET w env.`);
  }

  const shortRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?` +
    `client_id=${clientId}&` +
    `client_secret=${clientSecret}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `code=${code}`
  );
  const short = await shortRes.json();

  if (short.error) {
    throw new Error(`Meta token error: ${short.error.message}`);
  }

  const longRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?` +
    `grant_type=fb_exchange_token&` +
    `client_id=${clientId}&` +
    `client_secret=${clientSecret}&` +
    `fb_exchange_token=${short.access_token}`
  );
  const long = await longRes.json();

  if (long.error) {
    console.warn(`[Meta OAuth][${platform}] long token exchange failed, using short token:`, long.error);

    return {
      access_token: short.access_token,
      short_access_token: short.access_token,
      expires_in: short.expires_in,
      token_type: short.token_type,
    };
  }

  return {
    access_token: long.access_token,
    short_access_token: short.access_token,
    expires_in: long.expires_in,
    token_type: long.token_type,
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
  if (data.error) throw new Error(`TikTok token error: ${data.error_description || data.error}`);
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

async function exchangeSpotify(code: string, redirectUri: string): Promise<TokenResult> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: env("SPOTIFY_CLIENT_ID"),
      client_secret: env("SPOTIFY_CLIENT_SECRET"),
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Spotify token error: ${data.error_description || data.error}`);
  return data;
}
 
async function fetchAccountInfo(
  platform: string,
  token: string
): Promise<{ account_id: string; account_name: string; access_token?: string }> {
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
        return { account_id: igId, account_name: `@${igInfo.username || igInfo.name}`, access_token: page.access_token };
      }
    }
 
    if (platform === "facebook") {
      const res = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${token}`);
      const data = await res.json();
      const page = data.data?.[0];
      return { account_id: page?.id || "unknown", account_name: page?.name || "Facebook Page", access_token: page?.access_token };
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
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.error?.code && data.error.code !== "ok") {
        throw new Error(data.error.message || data.error.code);
      }
      return {
        account_id: data.data?.user?.open_id || "unknown",
        account_name: data.data?.user?.display_name || "TikTok",
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

    if (platform === "spotify") {
      const res = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return {
        account_id: data.id || data.email || "unknown",
        account_name: data.display_name || data.email || "Spotify",
      };
    }
  } catch (err) {
    console.error("fetchAccountInfo error:", err);
  }
 
  return { account_id: "unknown", account_name: platform };
}

async function fetchMetaPagesRaw(token: string) {
  return fetchMetaJson(
    `https://graph.facebook.com/v19.0/me/accounts?fields=id,name&access_token=${token}`
  );
}

function normalizeMetaPages(data: unknown): MetaPage[] {
  const pages = (data as { data?: Array<{ id?: string; name?: string }> } | null)?.data || [];
  return pages
    .filter((page) => page.id && page.name)
    .map((page) => ({ id: page.id as string, name: page.name as string }));
}

async function fetchMetaTokenDiagnostics(
  platform: string,
  token: string,
  pagesRaw: unknown,
  pagesReturned: MetaPage[],
  reason: string,
): Promise<MetaDiagnostics> {
  const requiredScopes = META_REQUIRED_SCOPES[platform] || [];
  const user = await fetchMetaJson(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${token}`);
  const permissions = await fetchMetaJson(`https://graph.facebook.com/v19.0/me/permissions?access_token=${token}`);
  const appId = getMetaAppId(platform);
  const appSecret = getMetaAppSecret(platform);
  const tokenDebug = appId && appSecret
    ? await fetchMetaJson(`https://graph.facebook.com/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`)
    : { error: "Missing META_APP_ID or META_APP_SECRET for debug_token" };
  const grantedFromPermissions = (((permissions as { data?: MetaPermission[] } | null)?.data || [])
    .filter((item) => item.status === "granted")
    .map((item) => item.permission)
    .filter(Boolean)) as string[];
  const grantedFromDebug = (((tokenDebug as { data?: { scopes?: string[] } } | null)?.data?.scopes || [])
    .filter(Boolean)) as string[];
  const grantedScopes = Array.from(new Set([...grantedFromPermissions, ...grantedFromDebug])).sort();
  const missingScopes = requiredScopes.filter((scope) => !grantedScopes.includes(scope));

  return {
    reason,
    user,
    permissions,
    tokenDebug,
    grantedScopes,
    requiredScopes,
    missingScopes,
    pagesReturned,
    pagesRaw,
  };
}

async function logMetaTokenDiagnostics(
  platform: string,
  token: string,
  pagesRaw: unknown,
  pagesReturned: MetaPage[],
  reason: string,
) {
  const diagnostics = await fetchMetaTokenDiagnostics(platform, token, pagesRaw, pagesReturned, reason);
  console.error(`[Meta OAuth diagnostics][${platform}]`, JSON.stringify(diagnostics, null, 2));
  return diagnostics;
}

async function fetchMetaPages(platform: string, token: string, logEmpty = true): Promise<MetaPage[]> {
  const data = await fetchMetaPagesRaw(token);

  if ((data as { error?: { message?: string } } | null)?.error) {
    await logMetaTokenDiagnostics(platform, token, data, [], "/me/accounts error");
    throw new Error(`Meta pages error: ${(data as { error: { message?: string } }).error.message}`);
  }

  const pages = normalizeMetaPages(data);
  const expectedPageId = env("FACEBOOK_PAGE_ID") || env("META_EXPECTED_FACEBOOK_PAGE_ID");
  const expectedPageName = env("FACEBOOK_PAGE_NAME") || "ANM Collective";
  const expectedPageMissing = platform === "facebook"
    && (
      (expectedPageId && !pages.some((page) => page.id === expectedPageId))
      || (!!expectedPageName && !pages.some((page) => page.name.toLowerCase() === expectedPageName.toLowerCase()))
    );

  if (logEmpty && (!pages.length || expectedPageMissing)) {
    await logMetaTokenDiagnostics(
      platform,
      token,
      data,
      pages,
      !pages.length
        ? "/me/accounts returned no pages"
        : `Expected page ${expectedPageId || expectedPageName} missing from /me/accounts`,
    );
  }

  return pages;
}


async function fetchMetaPagesWithFallback(
  platform: string,
  tokenData: TokenResult
) {
  const attempts = [
    {
      label: "long_access_token",
      token: tokenData.access_token,
    },
    {
      label: "short_access_token",
      token: tokenData.short_access_token,
    },
  ].filter((item) => item.token);

  const errors: string[] = [];

  for (const attempt of attempts) {
    try {
      const pages = await fetchMetaPages(platform, attempt.token as string, false);

      if (pages.length) {
        console.log(
          `[Meta OAuth][${platform}] pages found with ${attempt.label}:`,
          pages.map((page) => `${page.name}:${page.id}`).join(", ")
        );

        return {
          pages,
          token: attempt.token as string,
          tokenSource: attempt.label,
        };
      }

      const raw = await fetchMetaPagesRaw(attempt.token as string);
      await logMetaTokenDiagnostics(
        platform,
        attempt.token as string,
        raw,
        [],
        `${attempt.label}: /me/accounts returned no pages`
      );

      errors.push(`${attempt.label}: /me/accounts returned no pages`);
    } catch (err) {
      errors.push(
        `${attempt.label}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  throw new Error(
    `Meta nie zwróciła żadnych Facebook Pages w /me/accounts. Próby: ${errors.join(" | ")}`
  );
}

function encodeMetaPending(data: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}
 
function getRedirectUri(req: NextRequest, platform: string) {
  if (platform === "spotify" && env("SPOTIFY_REDIRECT_URI")) {
    return env("SPOTIFY_REDIRECT_URI");
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || req.nextUrl.origin;
  return new URL(`/api/oauth/${platform}/callback`, origin).toString();
}

async function getWorkspaceId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slug: string,
  userId: string
) {
  const { data } = await supabase
    .schema("contentiq")
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.id) {
    return data.id as string;
  }

  const { data: ownWorkspace } = await supabase
    .schema("contentiq")
    .from("workspaces")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (ownWorkspace?.id) {
    return ownWorkspace.id as string;
  }

  const safeSlug =
    slug === "anm-collective" ? `anm-collective-${userId.slice(0, 8)}` : slug;

  const { data: created, error: createError } = await supabase
    .schema("contentiq")
    .from("workspaces")
    .insert({
      user_id: userId,
      name: safeSlug
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
      type: "Firma",
      slug: safeSlug,
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
      tokenData = await exchangeMeta(platform, code, redirectUri);
    } else if (platform === "linkedin") {
      tokenData = await exchangeLinkedIn(code, redirectUri);
    } else if (platform === "tiktok") {
      tokenData = await exchangeTikTok(code, redirectUri);
    } else if (platform === "youtube") {
      tokenData = await exchangeGoogle(code, redirectUri);
    } else if (platform === "spotify") {
      tokenData = await exchangeSpotify(code, redirectUri);
    } else {
      throw new Error(`Nieobsługiwana platforma: ${platform}`);
    }
 
    const workspaceUuid = await getWorkspaceId(supabase, state.workspace_id, user.id);
 
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    if (platform === "instagram" || platform === "facebook") {
      const metaPagesResult = await fetchMetaPagesWithFallback(platform, tokenData);

      const redirectTo = state.workspace_id
        ? `/app/${state.workspace_id}/settings?select_meta_page=${platform}`
        : `/app/settings?select_meta_page=${platform}`;
      const response = NextResponse.redirect(new URL(redirectTo, req.url));

      response.cookies.set("ciq_meta_page_selection", encodeMetaPending({
        user_id: user.id,
        platform,
        workspace_slug: state.workspace_id,
        workspace_id: workspaceUuid,

        // Zapisujemy token, który realnie zwrócił strony w /me/accounts.
        access_token: metaPagesResult.token,

        token_expires_at: expiresAt,
        pages: metaPagesResult.pages,

        login_config_id: getUsedMetaLoginConfigId(platform),
        token_source: `${getMetaTokenSource(platform)}_${metaPagesResult.tokenSource}`,
        token_type: "user_access_token_before_page_selection",
      }), {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: 10 * 60,
      });

      return response;
    }

    const accountInfo = await fetchAccountInfo(platform, tokenData.access_token);
 
    // Sprawdź czy już istnieje połączenie dla tej platformy w tym workspace
    const { data: existing } = await supabase
      .schema("contentiq")
      .from("platform_connections")
      .select("id")
      .eq("workspace_id", workspaceUuid)
      .eq("platform", platform)
      .limit(1)
      .single();

    const connectionData = {
      workspace_id: workspaceUuid,
      platform,
      account_id: accountInfo.account_id,
      account_name: accountInfo.account_name,
      access_token: accountInfo.access_token || tokenData.access_token,
      ...(tokenData.refresh_token ? { refresh_token: tokenData.refresh_token } : {}),
      token_expires_at: expiresAt,
      connected: true,
      last_synced_at: new Date().toISOString(),
    };

    let dbError;
    if (existing?.id) {
      // Aktualizuj istniejący rekord — bez duplikatów
      ({ error: dbError } = await supabase
        .schema("contentiq")
        .from("platform_connections")
        .update(connectionData)
        .eq("id", existing.id));
    } else {
      ({ error: dbError } = await supabase
        .schema("contentiq")
        .from("platform_connections")
        .insert(connectionData));
    }

    if (dbError) {
      console.error("Supabase connection error:", dbError);
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
