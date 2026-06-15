// Pobiera realne dane z platform i zapisuje do Supabase contentiq.posts
// Poprawiona wersja: zapisuje również profil konta, obserwujących, polubienia strony/profilu i miniaturki postów.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  calculatePerformanceScore,
  getMetricEngagement,
  getMetricReach,
} from "@/lib/performanceScore";

const SYNCABLE_PLATFORMS = new Set([
  "instagram",
  "facebook",
  "linkedin",
  "tiktok",
  "youtube",
  "blog",
  "spotify",
]);

type InsightMetric = {
  name?: string;
  values?: Array<{ value?: unknown }>;
};

type PlatformProfile = {
  profile_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  profile_image_url?: string | null;

  followers?: number | null;
  followers_count?: number | null;
  follower_count?: number | null;
  total_followers?: number | null;

  profile_likes?: number | null;
  likes_count?: number | null;
  total_likes?: number | null;
  heart_count?: number | null;

  fan_count?: number | null;
  page_likes?: number | null;
  page_fans?: number | null;
  subscriber_count?: number | null;

  total_posts?: number | null;
};

type FetchPlatformResult = {
  profile?: PlatformProfile;
  posts: Record<string, unknown>[];
};

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

function getInsightValue(insights: InsightMetric[], name: string) {
  return insights.find((item) => item.name === name)?.values?.[0]?.value || 0;
}

function ensureAccountId(platform: string, accountId: string | null) {
  if (!accountId || accountId === "unknown") {
    throw new Error(
      `Brakuje ID konta dla ${platform}. Połącz konto ponownie albo uzupełnij wymagane ID w ustawieniach.`
    );
  }
}

function estimateScore(post: Record<string, unknown>) {
  return calculatePerformanceScore(post);
}

function numberOrNull(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function getBestThumbnail(thumbnails: Record<string, any> | undefined) {
  return (
    thumbnails?.maxres?.url ||
    thumbnails?.standard?.url ||
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    null
  );
}

// ─── FETCHERS ────────────────────────────────────────────────────────────────

async function fetchInstagram(
  token: string,
  accountId: string
): Promise<FetchPlatformResult> {
  const profileRes = await fetch(
    `https://graph.facebook.com/v19.0/${accountId}?` +
      `fields=id,username,profile_picture_url,followers_count,media_count&` +
      `access_token=${token}`
  );

  const profile = await profileRes.json();
  if (profile.error) throw new Error(profile.error.message);

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${accountId}/media?` +
      `fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink,like_count,comments_count&` +
      `access_token=${token}&limit=25`
  );

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const posts = await Promise.all(
    (data.data || []).map(async (post: Record<string, unknown>) => {
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

      const mediaUrl = firstString(post.media_url);
      const thumbnailUrl = firstString(post.thumbnail_url, post.media_url);

      return {
        platform_post_id: post.id,
        content: post.caption || "",
        post_type: String(post.media_type || "").toLowerCase(),
        url: post.permalink,
        published_at: post.timestamp,

        thumbnail_url: thumbnailUrl,
        media_url: mediaUrl,
        image_url: mediaUrl,
        cover_url: thumbnailUrl,

        reach: getInsightValue(insights, "reach"),
        impressions:
          getInsightValue(insights, "impressions") ||
          getInsightValue(insights, "views"),
        likes: Number(post.like_count || 0),
        comments: Number(post.comments_count || 0),
        saves: getInsightValue(insights, "saved"),
        shares: getInsightValue(insights, "shares"),
      };
    })
  );

  const followers = numberOrNull(profile.followers_count);

  return {
    profile: {
      profile_name: profile.username || null,
      username: profile.username || null,
      avatar_url: profile.profile_picture_url || null,
      profile_image_url: profile.profile_picture_url || null,

      followers,
      followers_count: followers,
      follower_count: followers,
      total_followers: followers,

      total_posts: numberOrNull(profile.media_count),
    },
    posts,
  };
}

async function fetchFacebook(
  token: string,
  pageId: string
): Promise<FetchPlatformResult> {
  const profileRes = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}?` +
      `fields=id,name,fan_count,followers_count,picture.type(large)&` +
      `access_token=${token}`
  );

  const profile = await profileRes.json();
  if (profile.error) throw new Error(profile.error.message);

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}/posts?` +
      `fields=id,message,created_time,permalink_url,full_picture,picture,shares,reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0)&` +
      `access_token=${token}&limit=25`
  );

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const posts = await Promise.all(
    (data.data || []).map(async (post: Record<string, unknown>) => {
      let insights: InsightMetric[] = [];

      const metricSets = [
        "post_total_media_view,post_total_media_view_unique,post_clicks",
        "post_impressions,post_impressions_unique,post_engaged_users,post_clicks",
        "post_video_views,post_video_views_unique,post_clicks",
      ];

      for (const metrics of metricSets) {
        try {
          const insightRes = await fetch(
            `https://graph.facebook.com/v19.0/${post.id}/insights?` +
              `metric=${metrics}&access_token=${token}`
          );

          const insightData = await insightRes.json();

          if (!insightData.error) {
            insights = insightData.data || [];
            break;
          }

          console.warn("Facebook insights error:", {
            postId: post.id,
            metrics,
            error: insightData.error,
          });
        } catch (err) {
          console.warn("Facebook insights fetch failed:", {
            postId: post.id,
            metrics,
            error: err,
          });
        }
      }

      const sharesObj = post.shares as { count?: number } | undefined;

      const reactionsObj = post.reactions as
        | { summary?: { total_count?: number } }
        | undefined;

      const commentsObj = post.comments as
        | { summary?: { total_count?: number } }
        | undefined;

      let likes = Number(reactionsObj?.summary?.total_count || 0);
      let comments = Number(commentsObj?.summary?.total_count || 0);
      let shares = Number(sharesObj?.count || 0);

      if (!likes && !comments && !shares) {
        try {
          const engagementRes = await fetch(
            `https://graph.facebook.com/v19.0/${post.id}?` +
              `fields=shares,reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0)&` +
              `access_token=${token}`
          );

          const engagementData = await engagementRes.json();

          if (!engagementData.error) {
            likes = Number(engagementData.reactions?.summary?.total_count || 0);
            comments = Number(
              engagementData.comments?.summary?.total_count || 0
            );
            shares = Number(engagementData.shares?.count || 0);
          } else {
            console.warn("Facebook engagement error:", {
              postId: post.id,
              error: engagementData.error,
            });
          }
        } catch (err) {
          console.warn("Facebook engagement fetch failed:", {
            postId: post.id,
            error: err,
          });
        }
      }

      const reach =
        Number(getInsightValue(insights, "post_total_media_view_unique") || 0) ||
        Number(getInsightValue(insights, "post_impressions_unique") || 0) ||
        Number(getInsightValue(insights, "post_video_views_unique") || 0);

      const impressions =
        Number(getInsightValue(insights, "post_total_media_view") || 0) ||
        Number(getInsightValue(insights, "post_impressions") || 0) ||
        Number(getInsightValue(insights, "post_video_views") || 0);

      const clicks = Number(getInsightValue(insights, "post_clicks") || 0);

      const image = firstString(post.full_picture, post.picture);

      return {
        platform_post_id: post.id,
        content: post.message || "",
        post_type: "post",
        url: post.permalink_url,
        published_at: post.created_time,

        thumbnail_url: image,
        media_url: image,
        image_url: firstString(post.full_picture),
        cover_url: firstString(post.picture),

        reach,
        impressions,
        likes,
        comments,
        shares,
        clicks,
      };
    })
  );

  const followers = numberOrNull(profile.followers_count);
  const fans = numberOrNull(profile.fan_count);
  const avatar = profile.picture?.data?.url || null;

  return {
    profile: {
      profile_name: profile.name || null,
      username: profile.name || null,
      avatar_url: avatar,
      profile_image_url: avatar,

      followers: followers ?? fans,
      followers_count: followers ?? fans,
      follower_count: followers ?? fans,
      total_followers: followers ?? fans,

      fan_count: fans,
      page_likes: fans,
      page_fans: fans,
      profile_likes: fans,
      likes_count: fans,
      total_likes: fans,
    },
    posts,
  };
}
function getServerMetaToken(platform: "instagram" | "facebook") {
  if (platform === "facebook") {
    return (
      process.env.FACEBOOK_SYSTEM_USER_ACCESS_TOKEN?.trim() ||
      process.env.META_SYSTEM_USER_ACCESS_TOKEN?.trim() ||
      ""
    );
  }

  return "";
}

async function testFacebookPageToken(
  pageId: string,
  token: string
): Promise<boolean> {
  if (!pageId || !token) return false;

  const testRes = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}/posts?` +
      `fields=id&limit=1&access_token=${token}`
  );

  const testData = await testRes.json();

  return !testData.error;
}

async function resolveMetaResource(
  token: string,
  platform: "instagram" | "facebook",
  savedAccountId: string
) {
  const errors: string[] = [];

  /**
   * 1. Najpierw próbujemy token zapisany w Supabase.
   * U Ciebie Facebook zapisuje Page Access Token, więc to powinno zadziałać bez /me/accounts.
   */
  if (platform === "facebook" && savedAccountId && savedAccountId !== "unknown") {
    const storedTokenWorks = await testFacebookPageToken(savedAccountId, token);

    if (storedTokenWorks) {
      return {
        accountId: savedAccountId,
        token,
      };
    }

    errors.push("Zapisany token Facebooka nie ma dostępu do /pageId/posts.");
  }

  /**
   * 2. Jeśli Facebook nie działa z tokenem zapisanym w bazie,
   * próbujemy token systemowy z ENV.
   */
  if (platform === "facebook" && savedAccountId && savedAccountId !== "unknown") {
    const serverToken = getServerMetaToken("facebook");

    if (serverToken) {
      const serverTokenWorks = await testFacebookPageToken(savedAccountId, serverToken);

      if (serverTokenWorks) {
        return {
          accountId: savedAccountId,
          token: serverToken,
        };
      }

      errors.push("System-user token też nie ma dostępu do /pageId/posts.");
    } else {
      errors.push("Brak FACEBOOK_SYSTEM_USER_ACCESS_TOKEN / META_SYSTEM_USER_ACCESS_TOKEN.");
    }
  }

  /**
   * 3. Instagram zostawiamy ostrożnie, bo u Ciebie działa.
   */
  if (platform === "instagram" && savedAccountId && savedAccountId !== "unknown") {
    const igTestRes = await fetch(
      `https://graph.facebook.com/v19.0/${savedAccountId}?` +
        `fields=id,username&access_token=${token}`
    );

    const igTest = await igTestRes.json();

    if (!igTest.error && igTest.id) {
      return {
        accountId: savedAccountId,
        token,
      };
    }

    errors.push(
      `Instagram direct token error: ${
        igTest.error?.message || "Nie udało się sprawdzić IG tokena."
      }`
    );
  }

  /**
   * 4. Dopiero na końcu próbujemy /me/accounts.
   * To działa tylko dla user tokena, nie dla page tokena.
   */
  const pagesRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?` +
      `fields=id,name,access_token,instagram_business_account&` +
      `access_token=${token}`
  );

  const pages = await pagesRes.json();

  if (pages.error) {
    errors.push(`/me/accounts error: ${pages.error.message}`);
  } else {
    const pageList = (pages.data || []) as Array<{
      id?: string;
      name?: string;
      access_token?: string;
      instagram_business_account?: {
        id?: string;
      };
    }>;

    if (platform === "facebook") {
      const page =
        pageList.find((item) => item.id === savedAccountId) || pageList[0];

      if (page?.id && page.access_token) {
        return {
          accountId: page.id,
          token: page.access_token,
        };
      }

      errors.push("Nie znaleziono strony Facebook z access_token w /me/accounts.");
    }

    if (platform === "instagram") {
      for (const page of pageList) {
        if (!page.id || !page.access_token) continue;

        const igId = page.instagram_business_account?.id;

        if (igId && (igId === savedAccountId || savedAccountId === "unknown")) {
          return {
            accountId: igId,
            token: page.access_token,
          };
        }
      }

      errors.push("Nie znaleziono Instagram Business Account w /me/accounts.");
    }
  }

  throw new Error(
    platform === "facebook"
      ? `Nie udało się uzyskać dostępu do strony Facebook. Szczegóły: ${errors.join(" | ")}`
      : `Nie znaleziono Instagram Business Account podpiętego do strony Meta. Szczegóły: ${errors.join(" | ")}`
  );
}

async function fetchLinkedIn(token: string, authorId: string) {
  const authorUrn = authorId.startsWith("urn:li:")
    ? authorId
    : `urn:li:person:${authorId}`;
  const res = await fetch(
    `https://api.linkedin.com/rest/posts?q=author&author=${encodeURIComponent(
      authorUrn
    )}&count=20`,
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

async function fetchTikTok(token: string): Promise<FetchPlatformResult> {
  const profileRes = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,follower_count,following_count,likes_count,video_count",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const profileData = await profileRes.json();

  const res = await fetch(
    "https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,duration,share_url,create_time,cover_image_url,view_count,like_count,comment_count,share_count",
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

  const profile = profileData?.data?.user || {};

  const posts = (data.data?.videos || []).map((video: Record<string, unknown>) => {
    const cover = firstString(video.cover_image_url);

    return {
      platform_post_id: video.id,
      title: video.title || "",
      content: video.video_description || "",
      post_type: "video",
      url: video.share_url,
      published_at: video.create_time
        ? new Date(Number(video.create_time) * 1000).toISOString()
        : null,

      thumbnail_url: cover,
      media_url: cover,
      image_url: cover,
      cover_url: cover,

      reach: Number(video.view_count || 0),
      likes: Number(video.like_count || 0),
      comments: Number(video.comment_count || 0),
      shares: Number(video.share_count || 0),
    };
  });

  const followers = numberOrNull(profile.follower_count);
  const likes = numberOrNull(profile.likes_count);

  return {
    profile: {
      profile_name: profile.display_name || null,
      username: profile.display_name || null,
      avatar_url: profile.avatar_url || null,
      profile_image_url: profile.avatar_url || null,

      followers,
      followers_count: followers,
      follower_count: followers,
      total_followers: followers,

      profile_likes: likes,
      likes_count: likes,
      total_likes: likes,

      total_posts: numberOrNull(profile.video_count),
    },
    posts,
  };
}

async function fetchYouTube(token: string): Promise<FetchPlatformResult> {
  const channelRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&mine=true",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const channelData = await channelRes.json();
  if (channelData.error) throw new Error(channelData.error.message);

  const channel = channelData.items?.[0];
  const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads;

  const channelThumb =
    channel?.snippet?.thumbnails?.high?.url ||
    channel?.snippet?.thumbnails?.default?.url ||
    null;
  const subscribers = numberOrNull(channel?.statistics?.subscriberCount);

  const profile: PlatformProfile = {
    profile_name: channel?.snippet?.title || null,
    username: channel?.snippet?.customUrl || channel?.snippet?.title || null,
    avatar_url: channelThumb,
    profile_image_url: channelThumb,

    subscriber_count: subscribers,
    followers_count: subscribers,
    total_followers: subscribers,

    total_posts: numberOrNull(channel?.statistics?.videoCount),
  };

  if (!uploadsPlaylistId) {
    return { profile, posts: [] };
  }

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

  if (!videoIds) {
    return { profile, posts: [] };
  }

  const statsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const statsData = await statsRes.json();
  if (statsData.error) throw new Error(statsData.error.message);

  const posts = (statsData.items || []).map((video: Record<string, unknown>) => {
    const stats = (video.statistics as Record<string, unknown>) || {};
    const snippet = (video.snippet as Record<string, unknown>) || {};
    const thumbnails = snippet.thumbnails as Record<string, any> | undefined;
    const thumbnail = getBestThumbnail(thumbnails);

    return {
      platform_post_id: video.id,
      title: snippet.title,
      content: snippet.description,
      post_type: "video",
      published_at: snippet.publishedAt,

      thumbnail_url: thumbnail,
      media_url: thumbnail,
      image_url: thumbnail,
      cover_url: thumbnail,

      reach: parseInt(String(stats.viewCount || 0)),
      likes: parseInt(String(stats.likeCount || 0)),
      comments: parseInt(String(stats.commentCount || 0)),
    };
  });

  return { profile, posts };
}

async function fetchSpotify(token: string, showId: string): Promise<FetchPlatformResult> {
  const [showRes, episodesRes] = await Promise.all([
    fetch(`https://api.spotify.com/v1/shows/${showId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`https://api.spotify.com/v1/shows/${showId}/episodes?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);

  const show = await showRes.json();
  const data = await episodesRes.json();
  if (!showRes.ok || show.error) throw new Error(show.error?.message || `Spotify show error: ${showRes.status}`);
  if (!episodesRes.ok || data.error) throw new Error(data.error?.message || `Spotify episodes error: ${episodesRes.status}`);

  const showImages = (show.images as Array<{ url?: string }> | undefined) || [];
  const showImage = showImages[0]?.url || null;

  const posts = (data.items || []).map((ep: Record<string, unknown>) => {
    const images = (ep.images as Array<{ url?: string }> | undefined) || [];
    const externalUrls = ep.external_urls as { spotify?: string } | undefined;
    const image = images[0]?.url || showImage;

    return {
      platform_post_id: ep.id,
      title: ep.name,
      content: ep.description,
      post_type: "podcast",
      url: externalUrls?.spotify || null,
      published_at: ep.release_date
        ? new Date(ep.release_date as string).toISOString()
        : null,

      thumbnail_url: image,
      media_url: image,
      image_url: image,
      cover_url: image,

      reach: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    };
  });

  return {
    profile: {
      profile_name: show.name || null,
      username: show.publisher || show.name || null,
      avatar_url: showImage,
      profile_image_url: showImage,
      total_posts: numberOrNull(show.total_episodes) ?? posts.length,
    },
    posts,
  };
}

async function getSpotifyAppToken() {
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID?.trim() || ""}:${process.env.SPOTIFY_CLIENT_SECRET?.trim() || ""}`
  ).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
  const data = await response.json();

  if (!response.ok || data.error || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "Nie udało się połączyć ze Spotify API."
    );
  }

  return data.access_token as string;
}

async function fetchBlog(basicAuth: string, blogUrl: string) {
  const res = await fetch(`${blogUrl.replace(/\/$/, "")}/wp-json/wp/v2/posts?per_page=20&_embed`, {
    headers: basicAuth ? { Authorization: `Basic ${basicAuth}` } : {},
  });
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Blog API error");

  return data.map((post: Record<string, unknown>) => {
    const embedded = post._embedded as Record<string, any> | undefined;
    const featured = embedded?.["wp:featuredmedia"]?.[0];
    const image =
      featured?.source_url ||
      featured?.media_details?.sizes?.medium?.source_url ||
      featured?.media_details?.sizes?.thumbnail?.source_url ||
      null;

    return {
      platform_post_id: String(post.id),
      title: (post.title as Record<string, unknown>)?.rendered || "",
      content: (post.excerpt as Record<string, unknown>)?.rendered || "",
      post_type: "article",
      url: post.link,
      published_at: post.date,

      thumbnail_url: image,
      media_url: image,
      image_url: image,
      cover_url: image,
    };
  });
}

function isExpiringSoon(expiresAt?: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now() + 10 * 60 * 1000;
}

async function refreshAccessToken(supabase: SupabaseClient, connection: SyncConnection) {
  if (!connection.refresh_token || !isExpiringSoon(connection.token_expires_at)) {
    return connection.access_token || "";
  }

  let tokenUrl = "";
  let headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
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
    throw new Error(
      `Nie udało się odświeżyć tokenu ${connection.platform}: ${
        data.error_description || data.error || res.status
      }`
    );
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
  const totalEngagement = posts.reduce(
    (sum, post) => sum + getMetricEngagement(post),
    0
  );
  const scores = posts.map(estimateScore).filter((score) => score > 0);

  return {
    total_posts: posts.length,
    avg_reach: posts.length ? Math.round(totalReach / posts.length) : 0,
    avg_engagement:
      totalReach > 0
        ? Number(((totalEngagement / totalReach) * 100).toFixed(2))
        : 0,
    ai_score: scores.length
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0,
  };
}

async function fetchPlatformPosts(
  supabase: SupabaseClient,
  connection: SyncConnection
): Promise<FetchPlatformResult> {
  const token = await refreshAccessToken(supabase, connection);
  const accountId = connection.account_id || "";

  switch (connection.platform) {
    case "instagram": {
      const meta = await resolveMetaResource(token, "instagram", accountId);

      if (meta.accountId !== accountId) {
        await supabase
          .schema("contentiq")
          .from("platform_connections")
          .update({ account_id: meta.accountId })
          .eq("id", connection.id);

        connection.account_id = meta.accountId;
      }

      return fetchInstagram(meta.token, meta.accountId);
    }

case "facebook": {
  const meta = await resolveMetaResource(token, "facebook", accountId);
  return fetchFacebook(meta.token, meta.accountId);
}

    case "linkedin":
      ensureAccountId(connection.platform, accountId);
      return { posts: await fetchLinkedIn(token, accountId) };

    case "tiktok":
      return fetchTikTok(token);

    case "youtube":
      return fetchYouTube(token);

    case "spotify":
      ensureAccountId(connection.platform, accountId);
      if (accountId.includes("@") || accountId.length < 12) {
        throw new Error(
          "Spotify wymaga Show ID podcastu. Wklej URL podcastu w ustawieniach Spotify i zapisz."
        );
      }
      return fetchSpotify(await getSpotifyAppToken(), accountId);

    case "blog":
      ensureAccountId(connection.platform, accountId);
      return { posts: await fetchBlog(token, accountId) };

    default:
      return { posts: [] };
  }
}

async function syncConnection(supabase: SupabaseClient, connection: SyncConnection) {
  if (!SYNCABLE_PLATFORMS.has(connection.platform)) {
    throw new Error(`Unsupported platform: ${connection.platform}`);
  }

  const result = await fetchPlatformPosts(supabase, connection);
  const posts = result.posts || [];
  const profile = result.profile || {};

  const { error: deleteError } = await supabase
    .schema("contentiq")
    .from("posts")
    .delete()
    .eq("connection_id", connection.id);

  if (deleteError) throw new Error(deleteError.message);

  if (posts.length > 0) {
    const rows = posts.map((post) => ({
      ...post,
      connection_id: connection.id,
      ai_score: estimateScore(post),
      ai_summary:
        "Wynik liczony z miksu zasięgu, reakcji i współczynnika zaangażowania.",
      fetched_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .schema("contentiq")
      .from("posts")
      .insert(rows);

    if (insertError) throw new Error(insertError.message);
  }

  const stats = summarizeSyncedPosts(posts);

  const profileFollowers =
    profile.followers ??
    profile.followers_count ??
    profile.follower_count ??
    profile.total_followers ??
    profile.fan_count ??
    profile.subscriber_count ??
    null;

  const { error: statsError } = await supabase
    .schema("contentiq")
    .from("account_stats")
    .insert({
      connection_id: connection.id,
      followers: profileFollowers,
      following: null,
      total_posts: stats.total_posts,
      avg_reach: stats.avg_reach,
      avg_engagement: stats.avg_engagement,
      ai_score: stats.ai_score,
      recorded_at: new Date().toISOString(),
    });

  if (statsError) throw new Error(statsError.message);

  const { error: connectionUpdateError } = await supabase
    .schema("contentiq")
    .from("platform_connections")
    .update({
      profile_name: profile.profile_name ?? null,
      username: profile.username ?? null,
      avatar_url: profile.avatar_url ?? null,
      profile_image_url: profile.profile_image_url ?? null,

      followers:
        profile.followers ??
        profile.followers_count ??
        profile.follower_count ??
        profile.total_followers ??
        null,
      followers_count:
        profile.followers_count ??
        profile.followers ??
        profile.follower_count ??
        profile.total_followers ??
        null,
      follower_count:
        profile.follower_count ??
        profile.followers_count ??
        profile.followers ??
        profile.total_followers ??
        null,
      total_followers:
        profile.total_followers ??
        profile.followers_count ??
        profile.followers ??
        profile.follower_count ??
        null,

      profile_likes:
        profile.profile_likes ??
        profile.likes_count ??
        profile.total_likes ??
        profile.heart_count ??
        profile.page_likes ??
        profile.page_fans ??
        null,
      likes_count:
        profile.likes_count ??
        profile.profile_likes ??
        profile.total_likes ??
        null,
      total_likes:
        profile.total_likes ??
        profile.likes_count ??
        profile.profile_likes ??
        null,
      heart_count: profile.heart_count ?? null,

      fan_count: profile.fan_count ?? null,
      page_likes: profile.page_likes ?? null,
      page_fans: profile.page_fans ?? null,
      subscriber_count: profile.subscriber_count ?? null,

      last_synced_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  if (connectionUpdateError) throw new Error(connectionUpdateError.message);

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    connection_id?: string;
    platform?: string;
    workspace_id?: string;
    all?: boolean;
  };

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
      .select(
        "id, platform, account_id, access_token, refresh_token, token_expires_at, connected"
      )
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
    return NextResponse.json(
      { error: "Missing connection_id or platform" },
      { status: 400 }
    );
  }

  const { data: connection, error: fetchError } = await supabase
    .schema("contentiq")
    .from("platform_connections")
    .select(
      "id, platform, account_id, access_token, refresh_token, token_expires_at, connected"
    )
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

    return NextResponse.json(
      {
        error: `Fetch failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      },
      { status: 500 }
    );
  }
}
