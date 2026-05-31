// Pobiera realne dane z platform i zapisuje do Supabase contentiq.posts
 
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
 
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
 
// ─── FETCHERS ────────────────────────────────────────────────────────────────
 
async function fetchInstagram(token: string, accountId: string) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${accountId}/media?` +
    `fields=id,caption,media_type,timestamp,permalink,` +
    `insights.metric(reach,impressions,likes_count,comments_count,saved,shares)&` +
    `access_token=${token}&limit=25`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
 
  return (data.data || []).map((post: Record<string, unknown>) => {
    const insights = ((post.insights as { data?: InsightMetric[] } | undefined)?.data) || [];
    return {
      platform_post_id: post.id,
      content: post.caption || "",
      post_type: String(post.media_type || "").toLowerCase(),
      url: post.permalink,
      published_at: post.timestamp,
      reach: getInsightValue(insights, "reach"),
      impressions: getInsightValue(insights, "impressions"),
      likes: getInsightValue(insights, "likes_count"),
      comments: getInsightValue(insights, "comments_count"),
      saves: getInsightValue(insights, "saved"),
      shares: getInsightValue(insights, "shares"),
    };
  });
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
 
async function fetchLinkedIn(token: string, authorId: string) {
  const res = await fetch(
    `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(${encodeURIComponent(authorId)})&count=20`,
    { headers: { Authorization: `Bearer ${token}`, "X-Restli-Protocol-Version": "2.0.0" } }
  );
  const data = await res.json();
  if (data.message) throw new Error(data.message);
 
  return (data.elements || []).map((post: Record<string, unknown>) => {
    const content = post.specificContent as {
      "com.linkedin.ugc.ShareContent"?: {
        shareCommentary?: { text?: string };
      };
    } | undefined;

    return {
      platform_post_id: post.id,
      content: content?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text || "",
      post_type: "post",
      published_at: new Date((post.firstPublishedAt as number) || Date.now()).toISOString(),
    };
  });
}
 
async function fetchYouTube(token: string) {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=25&order=date`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
 
  const videoIds = (data.items || []).map((v: Record<string, unknown>) => (v.id as Record<string, unknown>).videoId).join(",");
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
 
// ─── MAIN HANDLER ────────────────────────────────────────────────────────────
 
export async function POST(req: NextRequest) {
  const supabase = await createClient();
 
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 
  let body: { connection_id?: string; platform?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
 
  if (!body.connection_id || !body.platform) {
    return NextResponse.json({ error: "Missing connection_id or platform" }, { status: 400 });
  }
 
  if (!SYNCABLE_PLATFORMS.has(body.platform)) {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  }
 
  // Pobierz connection z tokenem
  const { data: connection, error: fetchError } = await supabase
    .schema("contentiq")
    .from("platform_connections")
    .select("id, platform, account_id, access_token, connected")
    .eq("id", body.connection_id)
    .eq("platform", body.platform)
    .eq("connected", true)
    .single();
 
  if (fetchError || !connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }
 
  const token = connection.access_token;
  const accountId = connection.account_id;
  let posts: Record<string, unknown>[] = [];
 
  try {
    switch (body.platform) {
      case "instagram":
        posts = await fetchInstagram(token, accountId);
        break;
      case "facebook":
        posts = await fetchFacebook(token, accountId);
        break;
      case "linkedin":
        posts = await fetchLinkedIn(token, accountId);
        break;
      case "youtube":
        posts = await fetchYouTube(token);
        break;
      case "spotify":
        posts = await fetchSpotify(token, accountId);
        break;
      case "blog":
        // account_id to URL bloga, access_token to Basic auth
        posts = await fetchBlog(token, accountId);
        break;
      default:
        posts = [];
    }
  } catch (err) {
    console.error(`Sync error [${body.platform}]:`, err);
    return NextResponse.json({ error: `Fetch failed: ${err}` }, { status: 500 });
  }
 
  // Zapisz posty do Supabase
  if (posts.length > 0) {
    const rows = posts.map(post => ({
      ...post,
      connection_id: connection.id,
      fetched_at: new Date().toISOString(),
    }));
 
    const { error: deleteError } = await supabase
      .schema("contentiq")
      .from("posts")
      .delete()
      .eq("connection_id", connection.id);

    if (deleteError) {
      console.error("Delete old posts error:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const { error: insertError } = await supabase
      .schema("contentiq")
      .from("posts")
      .insert(rows);
 
    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }
 
  // Zaktualizuj last_synced_at
  await supabase
    .schema("contentiq")
    .from("platform_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);
 
  return NextResponse.json({ ok: true, synced: posts.length });
}
