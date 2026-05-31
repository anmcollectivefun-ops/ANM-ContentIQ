import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const PLATFORM_CONFIG: Record<string, {
  authUrl: string;
  clientIdEnv: string;
  scope: string;
  extraParams?: Record<string, string>;
}> = {
  instagram: {
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    clientIdEnv: "META_APP_ID",
    scope: "pages_read_engagement,pages_show_list",
  },
  facebook: {
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    clientIdEnv: "META_APP_ID",
    scope: "pages_read_engagement,pages_show_list",
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    scope: "openid profile email w_member_social",
  },
  tiktok: {
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    clientIdEnv: "TIKTOK_CLIENT_KEY",
    scope: "user.info.basic",
  },
  youtube: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    scope: "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly",
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const config = PLATFORM_CONFIG[platform];

  if (!config) {
    return new Response(`Nieznana platforma: ${platform}`, { status: 400 });
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

  if (!clientId) {
    return new Response(`Brak zmiennej ${config.clientIdEnv} dla ${platform}`, { status: 500 });
  }

  if (platform === "tiktok") {
    url.searchParams.set("client_key", clientId);
  } else {
    url.searchParams.set("client_id", clientId);
  }

  url.searchParams.set("redirect_uri", getRedirectUri(req, platform));
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  if (config.extraParams) {
    for (const [key, value] of Object.entries(config.extraParams)) {
      url.searchParams.set(key, value);
    }
  }

  return redirect(url.toString());
}
