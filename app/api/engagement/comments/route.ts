import { NextRequest, NextResponse } from "next/server";
import {
  classifySentiment,
  getAccessToken,
  readPlatformError,
  requirePost,
} from "@/lib/engagement/server";

type MetaComment = {
  id: string;
  message?: string;
  text?: string;
  created_time?: string;
  timestamp?: string;
  username?: string;
  from?: { id?: string; name?: string };
  parent?: { id?: string };
  like_count?: number;
  hidden?: boolean;
};

type YouTubeCommentThread = {
  id: string;
  snippet?: {
    topLevelComment?: {
      id?: string;
      snippet?: {
        authorDisplayName?: string;
        authorProfileImageUrl?: string;
        authorChannelUrl?: string;
        textDisplay?: string;
        textOriginal?: string;
        publishedAt?: string;
      };
    };
  };
};

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId")?.trim();
    const accountId = request.nextUrl.searchParams.get("accountId")?.trim();
    const postId = request.nextUrl.searchParams.get("postId")?.trim();
    if (!workspaceId || !accountId || !postId) {
      return NextResponse.json(
        { error: "Missing workspaceId, accountId or postId" },
        { status: 400 }
      );
    }

    const { connection, post } = await requirePost(workspaceId, accountId, postId);
    if (!post.platform_post_id) {
      return NextResponse.json(
        {
          error:
            "Post nie ma platform_post_id. Uruchom ponownie synchronizację konta.",
        },
        { status: 422 }
      );
    }

    const token = await getAccessToken(connection);

    if (connection.platform === "facebook") {
      const endpoint = new URL(
        `https://graph.facebook.com/v19.0/${post.platform_post_id}/comments`
      );
      endpoint.searchParams.set("fields", "id,message,created_time,from,parent");
      endpoint.searchParams.set("order", "reverse_chronological");
      endpoint.searchParams.set("limit", "100");
      endpoint.searchParams.set("access_token", token);

      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) throw new Error(await readPlatformError(response));
      const payload = (await response.json()) as { data?: MetaComment[] };

      const comments = (payload.data || []).map((comment) => ({
        id: `facebook:${comment.id}`,
        platform: "facebook",
        accountId: connection.id,
        postId: post.id,
        externalCommentId: comment.id,
        authorName: comment.from?.name || "Facebook user",
        authorUsername: null,
        authorAvatarUrl: null,
        text: comment.message || "",
        createdAt: comment.created_time || null,
        parentCommentId: comment.parent?.id || null,
        status: "new",
        sentiment: classifySentiment(comment.message || ""),
      }));

      return NextResponse.json({ comments });
    }

    if (connection.platform === "instagram") {
      const endpoint = new URL(
        `https://graph.facebook.com/v19.0/${post.platform_post_id}/comments`
      );
      endpoint.searchParams.set(
        "fields",
        "id,text,timestamp,username,like_count,hidden"
      );
      endpoint.searchParams.set("order", "reverse_chronological");
      endpoint.searchParams.set("limit", "100");
      endpoint.searchParams.set("access_token", token);

      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) throw new Error(await readPlatformError(response));
      const payload = (await response.json()) as { data?: MetaComment[] };

      const comments = (payload.data || []).map((comment) => ({
        id: `instagram:${comment.id}`,
        platform: "instagram",
        accountId: connection.id,
        postId: post.id,
        externalCommentId: comment.id,
        authorName: comment.username || "Instagram user",
        authorUsername: comment.username || null,
        authorAvatarUrl: null,
        text: comment.text || "",
        createdAt: comment.timestamp || null,
        parentCommentId: null,
        status: comment.hidden ? "hidden" : "new",
        sentiment: classifySentiment(comment.text || ""),
        likes: Number(comment.like_count || 0),
      }));

      return NextResponse.json({ comments });
    }

    if (connection.platform === "youtube") {
      const endpoint = new URL(
        "https://www.googleapis.com/youtube/v3/commentThreads"
      );
      endpoint.searchParams.set("part", "snippet");
      endpoint.searchParams.set("videoId", post.platform_post_id);
      endpoint.searchParams.set("maxResults", "100");
      endpoint.searchParams.set("order", "time");

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(await readPlatformError(response));
      const payload = (await response.json()) as {
        items?: YouTubeCommentThread[];
      };

      const comments = (payload.items || []).map((thread) => {
        const top = thread.snippet?.topLevelComment;
        const snippet = top?.snippet;
        const text = snippet?.textOriginal || snippet?.textDisplay || "";

        return {
          id: `youtube:${top?.id || thread.id}`,
          platform: "youtube",
          accountId: connection.id,
          postId: post.id,
          externalCommentId: top?.id || thread.id,
          authorName: snippet?.authorDisplayName || "YouTube user",
          authorUsername: snippet?.authorChannelUrl || null,
          authorAvatarUrl: snippet?.authorProfileImageUrl || null,
          text,
          createdAt: snippet?.publishedAt || null,
          parentCommentId: null,
          status: "new",
          sentiment: classifySentiment(text),
        };
      });

      return NextResponse.json({ comments });
    }

    return NextResponse.json(
      {
        error: `Comment API is not enabled for ${connection.platform}.`,
      },
      { status: 422 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}
