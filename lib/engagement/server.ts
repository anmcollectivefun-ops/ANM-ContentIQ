import { createClient } from "@/lib/supabase/server";
import { refreshTokenIfNeeded, type PlatformConnection } from "@/lib/connections";

export type EngagementPlatform =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "blog"
  | "spotify";

export type EngagementCapabilities = {
  canReadPosts: boolean;
  canReadComments: boolean;
  canReplyToComments: boolean;
  canCreateComment: boolean;
  canModerateComments: boolean;
  canUseAiSuggestions: boolean;
};

export type EngagementConnection = PlatformConnection & {
  account_name: string | null;
  username?: string | null;
  avatar_url?: string | null;
  profile_image_url?: string | null;
  profile_name?: string | null;
};

export type EngagementPost = {
  id: string;
  connection_id: string;
  platform_post_id: string | null;
  title: string | null;
  content: string | null;
  media_url?: string | null;
  thumbnail_url?: string | null;
  image_url?: string | null;
  cover_url?: string | null;
  url: string | null;
  published_at: string | null;
  reach?: number | null;
  impressions?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getCapabilities(platform: EngagementPlatform): EngagementCapabilities {
  const meta = platform === "facebook" || platform === "instagram";
  const youtube = platform === "youtube";

  return {
    canReadPosts: true,
    canReadComments: meta || youtube,
    canReplyToComments: meta || youtube,
    canCreateComment: meta || youtube,
    canModerateComments: meta || youtube,
    canUseAiSuggestions: true,
  };
}

export async function requireWorkspace(workspaceIdOrSlug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  let query = supabase
    .schema("contentiq")
    .from("workspaces")
    .select("id, slug, user_id")
    .eq("user_id", user.id);

  query = UUID_RE.test(workspaceIdOrSlug)
    ? query.eq("id", workspaceIdOrSlug)
    : query.eq("slug", workspaceIdOrSlug);

  const { data, error } = await query.single();
  if (error || !data?.id) throw new Error("Workspace not found");

  return { supabase, user, workspace: data };
}

export async function requireConnection(
  workspaceIdOrSlug: string,
  connectionId: string
) {
  const context = await requireWorkspace(workspaceIdOrSlug);
  const { data, error } = await context.supabase
    .schema("contentiq")
    .from("platform_connections")
    .select("*")
    .eq("id", connectionId)
    .eq("workspace_id", context.workspace.id)
    .eq("connected", true)
    .single();

  if (error || !data) throw new Error("Connected account not found");

  return {
    ...context,
    connection: data as EngagementConnection,
  };
}

export async function requirePost(
  workspaceIdOrSlug: string,
  connectionId: string,
  postId: string
) {
  const context = await requireConnection(workspaceIdOrSlug, connectionId);
  const { data, error } = await context.supabase
    .schema("contentiq")
    .from("posts")
    .select("*")
    .eq("id", postId)
    .eq("connection_id", connectionId)
    .single();

  if (error || !data) throw new Error("Post not found");

  return {
    ...context,
    post: data as EngagementPost,
  };
}

export async function getAccessToken(connection: EngagementConnection) {
  const token = await refreshTokenIfNeeded(connection);
  if (!token) throw new Error("Missing access token");
  return token;
}

export async function readPlatformError(response: Response) {
  const raw = await response.text();
  if (!raw) return `Platform API error (${response.status})`;

  try {
    const parsed = JSON.parse(raw);
    return (
      parsed?.error?.message ||
      parsed?.error_description ||
      parsed?.message ||
      raw
    );
  } catch {
    return raw;
  }
}

export function classifySentiment(text: string) {
  const normalized = text.toLowerCase();
  if (normalized.includes("?")) return "question";
  if (/(dzięk|super|świetn|uwielb|brawo|gratul|love|great|amazing|thanks)/i.test(normalized)) {
    return "positive";
  }
  if (/(źle|problem|błąd|nie działa|słab|fatal|hate|bad|broken|issue)/i.test(normalized)) {
    return "negative";
  }
  return "neutral";
}

