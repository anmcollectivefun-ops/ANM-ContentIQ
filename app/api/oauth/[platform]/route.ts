import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const PLATFORM_CONFIG: Record<string, {
  authUrl: string;
  clientIdEnv: string;
  scope: string;
  analyticsScope?: string;
  extraParams?: Record<string, string>;
}> = {
  instagram: {
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    clientIdEnv: "META_APP_ID",
    scope: "instagram_basic,instagram_manage_insights,instagram_content_publish,pages_read_engagement,pages_show_list,pages_manage_posts",
    analyticsScope: "instagram_basic,instagram_manage_insights,pages_read_engagement,pages_show_list",
  },
  facebook: {
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    clientIdEnv: "META_APP_ID",
    scope: "pages_read_engagement,pages_show_list",
    analyticsScope: "pages_read_engagement,pages_show_list",
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    scope: "openid profile email r_member_social w_member_social r_organization_social w_organization_social",
  },
 tiktok: {
  authUrl: "https://www.tiktok.com/v2/auth/authorize/",
  clientIdEnv: "TIKTOK_CLIENT_KEY",
  scope: "user.info.basic,user.info.profile,user.info.stats",
  analyticsScope:
    "user.info.basic,user.info.profile,user.info.stats,video.list",
},
  youtube: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    scope: "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly https://www.googleapis.com/auth/youtube.upload",
    extraParams: { access_type: "offline", prompt: "consent" },
  },
  spotify: {
    authUrl: "https://accounts.spotify.com/authorize",
    clientIdEnv: "SPOTIFY_CLIENT_ID",
    scope: "user-read-email user-read-private",
  },
};

function getRedirectUri(req: NextRequest, platform: string) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || req.nextUrl.origin;
  return new URL(`/api/oauth/${platform}/callback`, origin).toString();
}

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function getClientId(platform: string, envName: string) {
  if (platform === "tiktok") {
    return env("TIKTOK_CLIENT_KEY") || env("TIKTOK_CLIENT_ID");
  }

  return env(envName);
}

function maskValue(value: string) {
  if (!value) return "BRAK";
  if (value.length <= 8) return `${value.slice(0, 2)}...${value.slice(-2)} (${value.length})`;
  return `${value.slice(0, 4)}...${value.slice(-4)} (${value.length})`;
}

function isMetaPlatform(platform: string) {
  return platform === "facebook" || platform === "instagram";
}

function getMetaConnectMode(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode") || req.nextUrl.searchParams.get("connect_mode");
  return mode === "analytics" ? "analytics" : "publishing";
}

function getMetaConfigId(platform: string, mode: string) {
  if (platform === "instagram" && mode === "analytics") {
    return env("INSTAGRAM_LOGIN_ANALYTICS_CONFIG_ID") || env("META_LOGIN_ANALYTICS_CONFIG_ID");
  }

  if (platform === "instagram") {
    return env("INSTAGRAM_LOGIN_PUBLISHING_CONFIG_ID")
      || env("INSTAGRAM_LOGIN_CONFIG_ID")
      || env("META_LOGIN_PUBLISHING_CONFIG_ID")
      || env("META_LOGIN_CONFIG_ID");
  }

  if (platform === "facebook" && env("FACEBOOK_USE_LOGIN_CONFIG") !== "1") {
    return "";
  }

  if (mode === "analytics") {
    return env("FACEBOOK_LOGIN_ANALYTICS_CONFIG_ID");
  }

  return env("FACEBOOK_LOGIN_PUBLISHING_CONFIG_ID")
    || env("FACEBOOK_LOGIN_CONFIG_ID");
}

function getOAuthScope(
  platform: string,
  config: { scope: string; analyticsScope?: string },
  mode: string
) {
  if (platform === "tiktok") {
    const scopes = new Set([
      "user.info.basic",
      "user.info.profile",
      "user.info.stats",
    ]);

    if (env("TIKTOK_ENABLE_VIDEO_LIST") === "1" || mode === "analytics") {
      scopes.add("video.list");
    }

    if (
      env("TIKTOK_ENABLE_UPLOAD") === "1" ||
      env("TIKTOK_ENABLE_PUBLISHING") === "1"
    ) {
      scopes.add("video.upload");
    }

    if (
      env("TIKTOK_ENABLE_DIRECT_PUBLISH") === "1" ||
      env("TIKTOK_ENABLE_PUBLISHING") === "1"
    ) {
      scopes.add("video.publish");
    }

    return Array.from(scopes).join(",");
  }

  if (isMetaPlatform(platform) && mode === "analytics") {
    return config.analyticsScope || config.scope;
  }

  if (platform === "facebook" && mode === "publishing") {
    const wantsPublishing = env("FACEBOOK_ENABLE_PUBLISHING") === "1";
    return wantsPublishing
      ? "pages_read_engagement,pages_show_list,pages_manage_posts"
      : config.scope;
  }

  return config.scope;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const config = PLATFORM_CONFIG[platform];

  if (!config) {
    return new Response(`Nieznana platforma: ${platform}`, { status: 400 });
  }

  if (req.nextUrl.searchParams.get("debug") === "1") {
    const clientId = getClientId(platform, config.clientIdEnv);
    const metaMode = isMetaPlatform(platform) ? getMetaConnectMode(req) : null;
    const metaConfigId = metaMode ? getMetaConfigId(platform, metaMode) : "";
    return Response.json({
      platform,
      clientParam: platform === "tiktok" ? "client_key" : "client_id",
      clientKeyPresent: Boolean(clientId),
      clientKeyMasked: maskValue(clientId),
      redirectUri: getRedirectUri(req, platform),
      scope: getOAuthScope(platform, config, metaMode || "publishing"),
      metaMode,
      metaConfigIdPresent: Boolean(metaConfigId),
      metaConfigIdMasked: maskValue(metaConfigId),
      metaUsesConfigIdInUrl: Boolean(metaConfigId),
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || req.nextUrl.origin,
    });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const workspaceId = req.nextUrl.searchParams.get("workspace_id") || "";
  const state = Buffer.from(JSON.stringify({
    user_id: user.id,
    platform,
    workspace_id: workspaceId,
    nonce: crypto.randomUUID(),
  })).toString("base64url");

  const url = new URL(config.authUrl);
  const clientId = getClientId(platform, config.clientIdEnv);
  const metaMode = isMetaPlatform(platform) ? getMetaConnectMode(req) : "publishing";
  const scope = getOAuthScope(platform, config, metaMode);
  const metaConfigId = isMetaPlatform(platform) ? getMetaConfigId(platform, metaMode) : "";

  if (!clientId) {
    return new Response(`Brak zmiennej ${config.clientIdEnv} dla ${platform}`, { status: 500 });
  }

  if (platform === "tiktok") {
    url.searchParams.set("client_key", clientId);
  } else {
    url.searchParams.set("client_id", clientId);
  }

  url.searchParams.set("redirect_uri", getRedirectUri(req, platform));
  if (metaConfigId) {
    // Facebook Login for Business bierze uprawnienia z konfiguracji Meta.
    // Scope zostaje powyżej jako fallback, gdy config_id nie jest ustawiony w env.
    url.searchParams.set("config_id", metaConfigId);
  } else {
    url.searchParams.set("scope", scope);
  }
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  if (config.extraParams) {
    for (const [key, value] of Object.entries(config.extraParams)) {
      url.searchParams.set(key, value);
    }
  }

  return redirect(url.toString());
}
