// Pobiera realne dane z platform i zapisuje do Supabase contentiq.posts
 
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculatePerformanceScore, getMetricEngagement, getMetricReach } from "@/lib/performanceScore";
 
const SYNCABLE_PLATFORMS = new Set([
  "instagram", "facebook", "linkedin", "tiktok", "youtube", "blog", "spotify",
]);

type InsightMetric = {
  name?: string;
  values?: Array<{ value?: unknown }>;
};

function getInsightValue(insights: InsightMetric[], name: string) {
  return insights.find((item) => item.name === name)?.values?.[0]?.value || 0;
}

function ensureAccountId(platform: string, accountId: string | null) {
  if (!accountId || accountId === "unknown") {
    throw new Error(`Brakuje ID konta dla ${platform}. Połącz konto ponownie albo uzupełnij wymagane ID w ustawieniach.`);
  }
}

function estimateScore(post: Record<string, unknown>) {
  return calculatePerformanceScore(post);
}
 
// ─── FETCHERS ────────────────────────────────────────────────────────────────
 
async function fetchInstagram(token: string, accountId: string) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${accountId}/media?` +
    `fields=id,caption,media_type,timestamp,permalink,like_count,comments_count&` +
    `access_token=${token}&limit=25`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
 
  const posts = await Promise.all((data.data || []).map(async (post: Record<string, unknown>) => {
    let insights: InsightMetric[] = [];
    const insightMetricSets = [
      "reach,impressions,saved,shares",
      "reach,views,saved,shares",
    ];

    for (const metrics of insightMetricSets) {
      const insightRes = await fetch(
        `https://graph.facebook.com/v19.0/${post.id}/insights?` +
        `metric=${metrics}&access_token=${token}`
      );
      const insightData = await insightRes.json();

      if (!insightData.error) {
        insights = insightData.data || [];
        break;
      }
    }

    return {
      platform_post_id: post.id,
      content: post.caption || "",
      post_type: String(post.media_type || "").toLowerCase(),
      url: post.permalink,
      published_at: post.timestamp,
      reach: getInsightValue(insights, "reach"),
      impressions: getInsightValue(insights, "impressions") || getInsightValue(insights, "views"),
      likes: Number(post.like_count || 0),
      comments: Number(post.comments_count || 0),
      saves: getInsightValue(insights, "saved"),
      shares: getInsightValue(insights, "shares"),
    };
  }));

  return posts;
}
 
async function fetchFacebook(token: string, pageId: string) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}/posts?` +
    `fields=id,message,created_time,permalink_url,insights.metric(post_impressions,post_engaged_users,post_reactions_by_type_total)&` +
    `access_token=${token}&limit=25`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
 
  return (data.data || []).map((post: Record<string, unknown>) => {
    const insights = ((post.insights as { data?: InsightMetric[] } | undefined)?.data) || [];
    return {
      platform_post_id: post.id,
      content: post.message || "",
      post_type: "post",
      url: post.permalink_url,
      published_at: post.created_time,
      impressions: getInsightValue(insights, "post_impressions"),
      likes: getInsightValue(insights, "post_engaged_users"),
    };
  });
}

async function resolveMetaResource(token: string, platform: "instagram" | "facebook", savedAccountId: string) {
  if (savedAccountId && savedAccountId !== "unknown") {
    const directFields = platform === "instagram" ? "id,username" : "id,name";
    const directRes = await fetch(
      `https://graph.facebook.com/v19.0/${savedAccountId}?fields=${directFields}&access_token=${token}`
    );
    const directData = await directRes.json();

    if (!directData.error && directData.id) {
      return { accountId: savedAccountId, token };
    }
  }

  const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${token}`);
  const pages = await pagesRes.json();
  if (pages.error) throw new Error(pages.error.message);

  const pageList = (pages.data || []) as Array<{
    id?: string;
    name?: string;
    access_token?: string;
  }>;

  if (platform === "facebook") {
    const page = pageList.find((item) => item.id === savedAccountId) || pageList[0];
    if (!page?.id || !page.access_token) {
      throw new Error("Nie znaleziono strony Facebook albo tokenu strony. Połącz Meta ponownie.");
    }
    return { accountId: page.id, token: page.access_token };
  }

  for (const page of pageList) {
    if (!page.id || !page.access_token) continue;
    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
    );
    const igData = await igRes.json();
    const igId = igData.instagram_business_account?.id;
    if (igId && (igId === savedAccountId || savedAccountId === "unknown")) {
      return { accountId: igId as string, token: page.access_token };
    }
  }

  throw new Error("Nie znaleziono Instagram Business Account podpiętego do strony Meta. Sprawdź połączenie IG z Facebook Page.");
}
 
async function fetchLinkedIn(token: string, authorId: string) {
  const authorUrn = authorId.startsWith("urn:li:") ? authorId : `urn:li:person:${authorId}`;
  const res = await fetch(
    `https://api.linkedin.com/rest/posts?q=author&author=${encodeURIComponent(authorUrn)}&count=20`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "LinkedIn-Version": "202504",
        "X-Restli-Protocol-Version": "2.0.0",
      },
    }
  );
  const data = await res.json();
  if (data.message) throw new Error(data.message);

  return (data.elements || []).map((post: Record<string, unknown>) => {
    const commentary = (post.commentary as string) || "";
    return {
      platform_post_id: post.id,
      content: commentary,
      post_type: "post",
      published_at: new Date((post.publishedAt as number) || Date.now()).toISOString(),
    };
  });
}

async function fetchTikTok(token: string) {
  const res = await fetch(
    "https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,duration,share_url,create_time,view_count,like_count,comment_count,share_count",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ max_count: 20 }),
    }
  );
  const data = await res.json();
  if (data.error?.code && data.error.code !== "ok") {
    throw new Error(data.error.message || data.error.code);
  }

  return (data.data?.videos || []).map((video: Record<string, unknown>) => ({
    platform_post_id: video.id,
    title: video.title || "",
    content: video.video_description || "",
    post_type: "video",
    url: video.share_url,
    published_at: video.create_time
      ? new Date(Number(video.create_time) * 1000).toISOString()
      : null,
    reach: Number(video.view_count || 0),
    likes: Number(video.like_count || 0),
    comments: Number(video.comment_count || 0),
    shares: Number(video.share_count || 0),
  }));
}
 
async function fetchYouTube(token: string) {
  const channelRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&mine=true",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const channelData = await channelRes.json();
  if (channelData.error) throw new Error(channelData.error.message);

  const channel = channelData.items?.[0];
  const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) return [];

  const playlistRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=25`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const playlistData = await playlistRes.json();
  if (playlistData.error) throw new Error(playlistData.error.message);

  const videoIds = (playlistData.items || [])
    .map((item: Record<string, unknown>) => {
      const contentDetails = item.contentDetails as Record<string, unknown> | undefined;
      return contentDetails?.videoId;
    })
    .filter(Boolean)
    .join(",");
  if (!videoIds) return [];
 
  const statsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const statsData = await statsRes.json();
 
  return (statsData.items || []).map((video: Record<string, unknown>) => {
    const stats = video.statistics as Record<string, unknown> || {};
    const snippet = video.snippet as Record<string, unknown> || {};
    return {
      platform_post_id: video.id,
      title: snippet.title,
      content: snippet.description,
      post_type: "video",
      published_at: snippet.publishedAt,
      reach: parseInt(String(stats.viewCount || 0)),
      likes: parseInt(String(stats.likeCount || 0)),
      comments: parseInt(String(stats.commentCount || 0)),
    };
  });
}
 
async function fetchSpotify(token: string, showId: string) {
  const res = await fetch(
    `https://api.spotify.com/v1/shows/${showId}/episodes?limit=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
 
  return (data.items || []).map((ep: Record<string, unknown>) => ({
    platform_post_id: ep.id,
    title: ep.name,
    content: ep.description,
    post_type: "podcast",
    published_at: ep.release_date ? new Date(ep.release_date as string).toISOString() : null,
    reach: ep.duration_ms,
  }));
}
 
async function fetchBlog(basicAuth: string, blogUrl: string) {
  const res = await fetch(
    `${blogUrl.replace(/\/$/, "")}/wp-json/wp/v2/posts?per_page=20&_embed`,
    { headers: basicAuth ? { Authorization: `Basic ${basicAuth}` } : {} }
  );
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Blog API error");
 
  return data.map((post: Record<string, unknown>) => ({
    platform_post_id: String(post.id),
    title: (post.title as Record<string, unknown>)?.rendered || "",
    content: (post.excerpt as Record<string, unknown>)?.rendered || "",
    post_type: "article",
    url: post.link,
    published_at: post.date,
  }));
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type SyncConnection = {
  id: string;
  platform: string;
  account_id: string | null;
  access_token: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  connected: boolean;
};

function isExpiringSoon(expiresAt?: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now() + 10 * 60 * 1000;
}

async function refreshAccessToken(supabase: SupabaseClient, connection: SyncConnection) {
  if (!connection.refresh_token || !isExpiringSoon(connection.token_expires_at)) {
    return connection.access_token || "";
  }

  let tokenUrl = "";
  let headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  let body: URLSearchParams;

  if (connection.platform === "youtube") {
    tokenUrl = "https://oauth2.googleapis.com/token";
    body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID?.trim() || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET?.trim() || "",
    });
  } else if (connection.platform === "spotify") {
    tokenUrl = "https://accounts.spotify.com/api/token";
    const credentials = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID?.trim() || ""}:${process.env.SPOTIFY_CLIENT_SECRET?.trim() || ""}`
    ).toString("base64");
    headers.Authorization = `Basic ${credentials}`;
    body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
    });
  } else if (connection.platform === "tiktok") {
    tokenUrl = "https://open.tiktokapis.com/v2/oauth/token/";
    body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
      client_key: process.env.TIKTOK_CLIENT_KEY?.trim() || "",
      client_secret: process.env.TIKTOK_CLIENT_SECRET?.trim() || "",
    });
  } else if (connection.platform === "linkedin") {
    tokenUrl = "https://www.linkedin.com/oauth/v2/accessToken";
    body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
      client_id: process.env.LINKEDIN_CLIENT_ID?.trim() || "",
      client_secret: process.env.LINKEDIN_CLIENT_SECRET?.trim() || "",
    });
  } else {
    return connection.access_token || "";
  }

  const res = await fetch(tokenUrl, { method: "POST", headers, body });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Nie udało się odświeżyć tokenu ${connection.platform}: ${data.error_description || data.error || res.status}`);
  }

  const nextToken = data.access_token as string;
  const nextRefresh = (data.refresh_token as string | undefined) || connection.refresh_token;
  const expiresAt = data.expires_in
    ? new Date(Date.now() + Number(data.expires_in) * 1000).toISOString()
    : connection.token_expires_at || null;

  const { error } = await supabase
    .schema("contentiq")
    .from("platform_connections")
    .update({
      access_token: nextToken,
      refresh_token: nextRefresh,
      token_expires_at: expiresAt,
    })
    .eq("id", connection.id);

  if (error) throw new Error(error.message);

  connection.access_token = nextToken;
  connection.refresh_token = nextRefresh;
  connection.token_expires_at = expiresAt;
  return nextToken;
}

function summarizeSyncedPosts(posts: Record<string, unknown>[]) {
  const totalReach = posts.reduce((sum, post) => sum + getMetricReach(post), 0);
  const totalEngagement = posts.reduce((sum, post) => sum + getMetricEngagement(post), 0);
  const scores = posts.map(estimateScore).filter((score) => score > 0);

  return {
    total_posts: posts.length,
    avg_reach: posts.length ? Math.round(totalReach / posts.length) : 0,
    avg_engagement: totalReach > 0 ? Number(((totalEngagement / totalReach) * 100).toFixed(2)) : 0,
    ai_score: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
  };
}

async function fetchPlatformPosts(supabase: SupabaseClient, connection: SyncConnection): Promise<Record<string, unknown>[]> {
  const token = await refreshAccessToken(supabase, connection);
  const accountId = connection.account_id || "";

  switch (connection.platform) {
    case "instagram": {
      ensureAccountId(connection.platform, accountId);
      const meta = await resolveMetaResource(token, "instagram", accountId);
      return fetchInstagram(meta.token, meta.accountId);
    }
    case "facebook": {
      ensureAccountId(connection.platform, accountId);
      const meta = await resolveMetaResource(token, "facebook", accountId);
      return fetchFacebook(meta.token, meta.accountId);
    }
    case "linkedin":
      ensureAccountId(connection.platform, accountId);
      return fetchLinkedIn(token, accountId);
    case "tiktok":
      return fetchTikTok(token);
    case "youtube":
      return fetchYouTube(token);
    case "spotify":
      ensureAccountId(connection.platform, accountId);
      if (accountId.includes("@") || accountId.length < 12) {
        throw new Error("Spotify wymaga Show ID podcastu. Wklej URL podcastu w ustawieniach Spotify i zapisz.");
      }
      return fetchSpotify(token, accountId);
    case "blog":
      ensureAccountId(connection.platform, accountId);
      return fetchBlog(token, accountId);
    default:
      return [];
  }
}

async function syncConnection(supabase: SupabaseClient, connection: SyncConnection) {
  if (!SYNCABLE_PLATFORMS.has(connection.platform)) {
    throw new Error(`Unsupported platform: ${connection.platform}`);
  }

  const posts = await fetchPlatformPosts(supabase, connection);

  const { error: deleteError } = await supabase
    .schema("contentiq")
    .from("posts")
    .delete()
    .eq("connection_id", connection.id);

  if (deleteError) throw new Error(deleteError.message);

  if (posts.length > 0) {
    const rows = posts.map(post => ({
      ...post,
      connection_id: connection.id,
      ai_score: estimateScore(post),
      ai_summary: "Wynik liczony z miksu zasięgu, reakcji i współczynnika zaangażowania.",
      fetched_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .schema("contentiq")
      .from("posts")
      .insert(rows);

    if (insertError) throw new Error(insertError.message);
  }

  const stats = summarizeSyncedPosts(posts);
  const { error: statsError } = await supabase
    .schema("contentiq")
    .from("account_stats")
    .insert({
      connection_id: connection.id,
      followers: null,
      following: null,
      total_posts: stats.total_posts,
      avg_reach: stats.avg_reach,
      avg_engagement: stats.avg_engagement,
      ai_score: stats.ai_score,
      recorded_at: new Date().toISOString(),
    });

  if (statsError) throw new Error(statsError.message);

  await supabase
    .schema("contentiq")
    .from("platform_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);

  return {
    connection_id: connection.id,
    platform: connection.platform,
    synced: posts.length,
    message: posts.length
      ? `Pobrano ${posts.length} publikacji`
      : "API odpowiedziało poprawnie, ale nie zwróciło żadnych publikacji.",
  };
}
 
// ─── MAIN HANDLER ────────────────────────────────────────────────────────────
 
export async function POST(req: NextRequest) {
  const supabase = await createClient();
 
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 
  let body: { connection_id?: string; platform?: string; workspace_id?: string; all?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.all || body.workspace_id) {
    if (!body.workspace_id) {
      return NextResponse.json({ error: "Missing workspace_id" }, { status: 400 });
    }

    const { data: connections, error } = await supabase
      .schema("contentiq")
      .from("platform_connections")
      .select("id, platform, account_id, access_token, refresh_token, token_expires_at, connected")
      .eq("workspace_id", body.workspace_id)
      .eq("connected", true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results = [];
    for (const connection of (connections || []) as SyncConnection[]) {
      try {
        results.push(await syncConnection(supabase, connection));
      } catch (err) {
        results.push({
          connection_id: connection.id,
          platform: connection.platform,
          synced: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const total = results.reduce((sum, result) => sum + (result.synced || 0), 0);
    const failed = results.filter((result) => "error" in result).length;

    return NextResponse.json({
      ok: failed === 0,
      synced: total,
      failed,
      results,
      message: failed
        ? `Pobrano ${total} publikacji, błędy: ${failed}`
        : `Pobrano ${total} publikacji ze wszystkich połączeń`,
    });
  }

  if (!body.connection_id || !body.platform) {
    return NextResponse.json({ error: "Missing connection_id or platform" }, { status: 400 });
  }

  const { data: connection, error: fetchError } = await supabase
    .schema("contentiq")
    .from("platform_connections")
    .select("id, platform, account_id, access_token, refresh_token, token_expires_at, connected")
    .eq("id", body.connection_id)
    .eq("platform", body.platform)
    .eq("connected", true)
    .single();
 
  if (fetchError || !connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  try {
    const result = await syncConnection(supabase, connection as SyncConnection);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error(`Sync error [${body.platform}]:`, err);
    return NextResponse.json({ error: `Fetch failed: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
}
