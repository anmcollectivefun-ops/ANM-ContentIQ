import { NextRequest, NextResponse } from "next/server";
import { requireConnection } from "@/lib/engagement/server";

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId")?.trim();
    const accountId = request.nextUrl.searchParams.get("accountId")?.trim();
    if (!workspaceId || !accountId) {
      return NextResponse.json(
        { error: "Missing workspaceId or accountId" },
        { status: 400 }
      );
    }

    const { supabase, connection } = await requireConnection(workspaceId, accountId);
    const { data, error } = await supabase
      .schema("contentiq")
      .from("posts")
      .select("*")
      .eq("connection_id", connection.id)
      .order("published_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    const posts = (data || []).map((post) => {
      const reach = Number(post.reach || 0);
      const impressions = Number(post.impressions || 0);
      const likes = Number(post.likes || 0);
      const comments = Number(post.comments || 0);
      const shares = Number(post.shares || 0);
      const denominator = reach || impressions;

      return {
        id: post.id,
        platform: connection.platform,
        accountId: connection.id,
        externalPostId: post.platform_post_id || "",
        title: post.title || null,
        content: post.content || post.title || "",
        mediaUrl:
          post.thumbnail_url ||
          post.cover_url ||
          post.image_url ||
          post.media_url ||
          null,
        permalink: post.url || null,
        publishedAt: post.published_at || post.fetched_at || null,
        metrics: {
          reach,
          impressions,
          likes,
          comments,
          shares,
          engagementRate:
            denominator > 0
              ? Number((((likes + comments + shares) / denominator) * 100).toFixed(2))
              : null,
        },
      };
    });

    return NextResponse.json({ posts });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}

