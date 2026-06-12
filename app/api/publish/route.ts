import { NextRequest, NextResponse } from "next/server";
import { refreshTokenIfNeeded, type PlatformConnection } from "@/lib/connections";
import { requireWorkspace, readPlatformError } from "@/lib/engagement/server";

type PublishPlatform =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "blog"
  | "spotify";

type DraftMedia = {
  asset_type?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  public_url?: string | null;
  url?: string | null;
  mime_type?: string | null;
  file_name?: string | null;
};

type PublishMedia = DraftMedia & {
  resolved_url: string;
};

type PublishOutcome = {
  externalPostId: string;
  externalPostUrl?: string | null;
  warning?: string | null;
};

const META_VERSION = process.env.META_GRAPH_VERSION?.trim() || "v25.0";
const LINKEDIN_VERSION = process.env.LINKEDIN_VERSION?.trim() || "202601";

function asPlatform(value: unknown): PublishPlatform | null {
  const platform = String(value || "").toLowerCase();
  return ["facebook", "instagram", "linkedin", "tiktok", "youtube", "blog", "spotify"].includes(platform)
    ? (platform as PublishPlatform)
    : null;
}

function buildPostText(title: string, body: string) {
  const cleanTitle = title.trim();
  const cleanBody = body.trim();
  if (!cleanTitle) return cleanBody;
  if (!cleanBody) return cleanTitle;
  if (cleanBody.toLowerCase().startsWith(cleanTitle.toLowerCase())) return cleanBody;
  return `${cleanTitle}\n\n${cleanBody}`;
}

async function getMediaUrl(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  item: DraftMedia
) {
  const direct = item.public_url || item.url;
  if (direct) return direct;
  if (!item.storage_bucket || !item.storage_path) return null;

  const { data, error } = await supabase.storage
    .from(item.storage_bucket)
    .createSignedUrl(item.storage_path, 60 * 60);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || `Could not create a media URL for ${item.file_name || item.storage_path}.`);
  }

  return data.signedUrl;
}

async function readMediaBuffer(media: PublishMedia) {
  const response = await fetch(media.resolved_url);
  if (!response.ok) {
    throw new Error(`Could not download media (${response.status}).`);
  }
  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    mimeType: media.mime_type || response.headers.get("content-type") || "application/octet-stream",
  };
}

async function publishFacebook(
  connection: PlatformConnection,
  token: string,
  text: string,
  media: PublishMedia | null
): Promise<PublishOutcome> {
  const pageId = connection.account_id;

  if (media?.asset_type === "video" || media?.mime_type?.startsWith("video/")) {
    const endpoint = new URL(`https://graph.facebook.com/${META_VERSION}/${pageId}/videos`);
    endpoint.searchParams.set("file_url", media.resolved_url);
    endpoint.searchParams.set("description", text);
    endpoint.searchParams.set("access_token", token);
    const response = await fetch(endpoint, { method: "POST" });
    if (!response.ok) throw new Error(await readPlatformError(response));
    const payload = await response.json();
    return {
      externalPostId: String(payload.id),
      externalPostUrl: `https://www.facebook.com/${payload.id}`,
    };
  }

  if (media) {
    const endpoint = new URL(`https://graph.facebook.com/${META_VERSION}/${pageId}/photos`);
    endpoint.searchParams.set("url", media.resolved_url);
    endpoint.searchParams.set("caption", text);
    endpoint.searchParams.set("access_token", token);
    const response = await fetch(endpoint, { method: "POST" });
    if (!response.ok) throw new Error(await readPlatformError(response));
    const payload = await response.json();
    const id = String(payload.post_id || payload.id);
    return { externalPostId: id, externalPostUrl: `https://www.facebook.com/${id}` };
  }

  const endpoint = new URL(`https://graph.facebook.com/${META_VERSION}/${pageId}/feed`);
  endpoint.searchParams.set("message", text);
  endpoint.searchParams.set("access_token", token);
  const response = await fetch(endpoint, { method: "POST" });
  if (!response.ok) throw new Error(await readPlatformError(response));
  const payload = await response.json();
  return {
    externalPostId: String(payload.id),
    externalPostUrl: `https://www.facebook.com/${payload.id}`,
  };
}

async function waitForInstagramContainer(containerId: string, token: string) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const endpoint = new URL(`https://graph.facebook.com/${META_VERSION}/${containerId}`);
    endpoint.searchParams.set("fields", "status_code,status");
    endpoint.searchParams.set("access_token", token);
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(await readPlatformError(response));
    const payload = await response.json();
    if (payload.status_code === "FINISHED") return;
    if (payload.status_code === "ERROR" || payload.status_code === "EXPIRED") {
      throw new Error(payload.status || `Instagram container status: ${payload.status_code}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  throw new Error("Instagram media processing timed out.");
}

async function publishInstagram(
  connection: PlatformConnection,
  token: string,
  text: string,
  media: PublishMedia | null
): Promise<PublishOutcome> {
  if (!media) {
    throw new Error("Instagram requires an image or video.");
  }

  const createEndpoint = new URL(
    `https://graph.facebook.com/${META_VERSION}/${connection.account_id}/media`
  );
  const isVideo = media.asset_type === "video" || media.mime_type?.startsWith("video/");
  if (isVideo) {
    createEndpoint.searchParams.set("media_type", "REELS");
    createEndpoint.searchParams.set("video_url", media.resolved_url);
    createEndpoint.searchParams.set("share_to_feed", "true");
  } else {
    createEndpoint.searchParams.set("image_url", media.resolved_url);
  }
  createEndpoint.searchParams.set("caption", text);
  createEndpoint.searchParams.set("access_token", token);

  const createResponse = await fetch(createEndpoint, { method: "POST" });
  if (!createResponse.ok) throw new Error(await readPlatformError(createResponse));
  const created = await createResponse.json();
  const containerId = String(created.id || "");
  if (!containerId) throw new Error("Instagram did not return a media container ID.");

  if (isVideo) await waitForInstagramContainer(containerId, token);

  const publishEndpoint = new URL(
    `https://graph.facebook.com/${META_VERSION}/${connection.account_id}/media_publish`
  );
  publishEndpoint.searchParams.set("creation_id", containerId);
  publishEndpoint.searchParams.set("access_token", token);
  const publishResponse = await fetch(publishEndpoint, { method: "POST" });
  if (!publishResponse.ok) throw new Error(await readPlatformError(publishResponse));
  const published = await publishResponse.json();
  const id = String(published.id || "");
  return {
    externalPostId: id,
    externalPostUrl: id ? `https://www.instagram.com/p/${id}/` : null,
  };
}

async function uploadLinkedInImage(
  connection: PlatformConnection,
  token: string,
  media: PublishMedia
) {
  const author = connection.account_id.startsWith("urn:li:")
    ? connection.account_id
    : `urn:li:person:${connection.account_id}`;
  const initResponse = await fetch(
    "https://api.linkedin.com/rest/images?action=initializeUpload",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "LinkedIn-Version": LINKEDIN_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ initializeUploadRequest: { owner: author } }),
    }
  );
  if (!initResponse.ok) throw new Error(await readPlatformError(initResponse));
  const initialized = await initResponse.json();
  const uploadUrl = initialized?.value?.uploadUrl;
  const imageUrn = initialized?.value?.image;
  if (!uploadUrl || !imageUrn) throw new Error("LinkedIn did not initialize the image upload.");

  const { bytes, mimeType } = await readMediaBuffer(media);
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: bytes,
  });
  if (!uploadResponse.ok) throw new Error(await readPlatformError(uploadResponse));
  return imageUrn as string;
}

async function publishLinkedIn(
  connection: PlatformConnection,
  token: string,
  text: string,
  media: PublishMedia | null
): Promise<PublishOutcome> {
  const author = connection.account_id.startsWith("urn:li:")
    ? connection.account_id
    : `urn:li:person:${connection.account_id}`;

  let content: Record<string, unknown> | undefined;
  if (media) {
    const isVideo = media.asset_type === "video" || media.mime_type?.startsWith("video/");
    if (isVideo) {
      throw new Error("LinkedIn video upload requires the Videos API entitlement. Publish this item after enabling that product.");
    }
    const image = await uploadLinkedInImage(connection, token, media);
    content = { media: { id: image } };
  }

  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "LinkedIn-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      author,
      commentary: text,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
      ...(content ? { content } : {}),
    }),
  });
  if (!response.ok) throw new Error(await readPlatformError(response));
  const id = response.headers.get("x-restli-id") || response.headers.get("x-linkedin-id") || "";
  return { externalPostId: id || `linkedin-${Date.now()}` };
}

async function publishYouTube(
  token: string,
  title: string,
  text: string,
  media: PublishMedia | null
): Promise<PublishOutcome> {
  if (!media || !(media.asset_type === "video" || media.mime_type?.startsWith("video/"))) {
    throw new Error("YouTube publishing requires a video file.");
  }

  const { bytes, mimeType } = await readMediaBuffer(media);
  const boundary = `contentiq-${Date.now()}`;
  const metadata = JSON.stringify({
    snippet: {
      title: title.slice(0, 100) || "ContentIQ video",
      description: text.slice(0, 5000),
    },
    status: {
      privacyStatus: process.env.YOUTUBE_PUBLISH_PRIVACY_STATUS?.trim() || "public",
      selfDeclaredMadeForKids: false,
    },
  });
  const prefix = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const suffix = Buffer.from(`\r\n--${boundary}--`);
  const body = Buffer.concat([prefix, bytes, suffix]);

  const response = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(body.length),
      },
      body,
    }
  );
  if (!response.ok) throw new Error(await readPlatformError(response));
  const payload = await response.json();
  const id = String(payload.id || "");
  return { externalPostId: id, externalPostUrl: id ? `https://youtu.be/${id}` : null };
}

async function publishTikTok(
  token: string,
  title: string,
  media: PublishMedia | null
): Promise<PublishOutcome> {
  if (!media || !(media.asset_type === "video" || media.mime_type?.startsWith("video/"))) {
    throw new Error("TikTok Direct Post currently requires a video file.");
  }

  const { bytes, mimeType } = await readMediaBuffer(media);
  const initResponse = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title: title.slice(0, 2200),
        privacy_level: "PUBLIC_TO_EVERYONE",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: bytes.length,
        chunk_size: bytes.length,
        total_chunk_count: 1,
      },
    }),
  });
  if (!initResponse.ok) throw new Error(await readPlatformError(initResponse));
  const initialized = await initResponse.json();
  const uploadUrl = initialized?.data?.upload_url;
  const publishId = initialized?.data?.publish_id;
  if (!uploadUrl || !publishId) throw new Error(initialized?.error?.message || "TikTok did not initialize the upload.");

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(bytes.length),
      "Content-Range": `bytes 0-${bytes.length - 1}/${bytes.length}`,
    },
    body: bytes,
  });
  if (!uploadResponse.ok) throw new Error(await readPlatformError(uploadResponse));
  return { externalPostId: String(publishId) };
}

async function publishWordPress(
  connection: PlatformConnection,
  title: string,
  text: string
): Promise<PublishOutcome> {
  const baseUrl = connection.account_id.replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${connection.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, content: text, status: "publish" }),
  });
  if (!response.ok) throw new Error(await readPlatformError(response));
  const payload = await response.json();
  return {
    externalPostId: String(payload.id),
    externalPostUrl: payload.link || null,
  };
}

async function publishToPlatform(
  platform: PublishPlatform,
  connection: PlatformConnection,
  token: string,
  title: string,
  text: string,
  media: PublishMedia | null
) {
  if (platform === "facebook") return publishFacebook(connection, token, text, media);
  if (platform === "instagram") return publishInstagram(connection, token, text, media);
  if (platform === "linkedin") return publishLinkedIn(connection, token, text, media);
  if (platform === "youtube") return publishYouTube(token, title, text, media);
  if (platform === "tiktok") return publishTikTok(token, text, media);
  if (platform === "blog") return publishWordPress(connection, title, text);
  throw new Error(
    "Spotify Web API does not provide an endpoint for publishing podcast episodes or videos. Use your podcast host or Spotify for Creators."
  );
}

export async function POST(request: NextRequest) {
  let scheduledPostId = "";
  let supabase: Awaited<ReturnType<typeof requireWorkspace>>["supabase"] | null = null;

  try {
    const body = await request.json().catch(() => null);
    const workspaceId = String(body?.workspaceId || "").trim();
    scheduledPostId = String(body?.scheduledPostId || "").trim();
    if (!workspaceId || !scheduledPostId) {
      return NextResponse.json(
        { error: "workspaceId and scheduledPostId are required." },
        { status: 400 }
      );
    }

    const context = await requireWorkspace(workspaceId);
    supabase = context.supabase;

    const { data: scheduled, error: scheduledError } = await supabase
      .schema("contentiq")
      .from("scheduled_posts")
      .select("id,draft_id,connection_id,platform,status")
      .eq("id", scheduledPostId)
      .single();
    if (scheduledError || !scheduled) {
      throw new Error(scheduledError?.message || "Scheduled post not found.");
    }

    const platform = asPlatform(scheduled.platform);
    if (!platform) throw new Error(`Unsupported platform: ${scheduled.platform}`);

    const [{ data: draft, error: draftError }, { data: connection, error: connectionError }] =
      await Promise.all([
        supabase
          .schema("contentiq")
          .from("content_drafts")
          .select("id,title,body,media")
          .eq("id", scheduled.draft_id)
          .eq("workspace_id", context.workspace.id)
          .single(),
        supabase
          .schema("contentiq")
          .from("platform_connections")
          .select("*")
          .eq("id", scheduled.connection_id)
          .eq("workspace_id", context.workspace.id)
          .eq("connected", true)
          .single(),
      ]);

    if (draftError || !draft) throw new Error(draftError?.message || "Draft not found.");
    if (connectionError || !connection) {
      throw new Error(connectionError?.message || "Connected account not found.");
    }

    const rawMedia = Array.isArray(draft.media) ? (draft.media as DraftMedia[]) : [];
    const resolvedMedia = (
      await Promise.all(
        rawMedia.map(async (item) => {
          const resolvedUrl = await getMediaUrl(supabase!, item);
          return resolvedUrl ? ({ ...item, resolved_url: resolvedUrl } as PublishMedia) : null;
        })
      )
    ).filter(Boolean) as PublishMedia[];

    const title = String(draft.title || "").trim();
    const text = buildPostText(title, String(draft.body || ""));
    if (!text && resolvedMedia.length === 0) throw new Error("The post has no content or media.");

    const token = await refreshTokenIfNeeded(connection as PlatformConnection);
    if (!token && platform !== "blog") throw new Error("Missing access token.");

    const outcome = await publishToPlatform(
      platform,
      connection as PlatformConnection,
      token,
      title,
      text,
      resolvedMedia[0] || null
    );
    const publishedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .schema("contentiq")
      .from("scheduled_posts")
      .update({
        status: "published",
        published_at: publishedAt,
        platform_post_id: outcome.externalPostId,
      })
      .eq("id", scheduledPostId);
    if (updateError) throw new Error(updateError.message);

    await supabase
      .schema("contentiq")
      .from("media_assets")
      .update({
        status: "published",
        platform_post_id: outcome.externalPostId,
      })
      .eq("scheduled_post_id", scheduledPostId);

    return NextResponse.json({
      ok: true,
      platform,
      externalPostId: outcome.externalPostId,
      externalPostUrl: outcome.externalPostUrl || null,
      warning: outcome.warning || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (supabase && scheduledPostId) {
      await supabase
        .schema("contentiq")
        .from("scheduled_posts")
        .update({ status: "failed" })
        .eq("id", scheduledPostId);
    }
    return NextResponse.json(
      { ok: false, error: message },
      { status: message === "Unauthorized" ? 401 : 422 }
    );
  }
}
