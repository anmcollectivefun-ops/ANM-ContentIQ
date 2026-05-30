import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const PLATFORM_CONFIG: Record<string, {
  authUrl: string;
  clientIdEnv: string;
  redirectUriEnv: string;
  scope: string;
  extraParams?: Record<string, string>;
}> = {
  instagram: {
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    clientIdEnv: "META_APP_ID",
    redirectUriEnv: "META_REDIRECT_URI",
    scope: "instagram_basic,instagram_content_publish,instagram_manage_insights,pages_read_engagement,pages_show_list,read_insights",
  },
  facebook: {
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    clientIdEnv: "META_APP_ID",
    redirectUriEnv: "META_REDIRECT_URI",
    scope: "pages_read_engagement,pages_show_list,read_insights,pages_manage_posts",
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    redirectUriEnv: "LINKEDIN_REDIRECT_URI",
    scope: "openid profile email w_member_social r_organization_social",
  },
  tiktok: {
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    clientIdEnv: "TIKTOK_CLIENT_KEY",
    redirectUriEnv: "TIKTOK_REDIRECT_URI",
    scope: "user.info.basic,video.list,video.insights",
  },
  youtube: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    redirectUriEnv: "GOOGLE_REDIRECT_URI",
    scope: "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly",
    extraParams: { access_type: "offline", prompt: "consent" },
  },
};

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

  if (platform === "tiktok") {
    url.searchParams.set("client_key", process.env[config.clientIdEnv] || "");
  } else {
    url.searchParams.set("client_id", process.env[config.clientIdEnv] || "");
  }

  url.searchParams.set("redirect_uri", process.env[config.redirectUriEnv] || "");
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