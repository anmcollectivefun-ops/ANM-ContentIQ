import { NextRequest, NextResponse } from "next/server";
import {
  getAccessToken,
  readPlatformError,
  requirePost,
} from "@/lib/engagement/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const workspaceId = String(body.workspaceId || "").trim();
    const accountId = String(body.accountId || "").trim();
    const postId = String(body.postId || "").trim();
    const text = String(body.text || "").trim();

    if (!workspaceId || !accountId || !postId || !text) {
      return NextResponse.json({ error: "Missing comment data" }, { status: 400 });
    }

    const { connection, post } = await requirePost(
      workspaceId,
      accountId,
      postId
    );
    if (!post.platform_post_id) {
      return NextResponse.json(
        { error: "This post has no external platform ID." },
        { status: 422 }
      );
    }

    const token = await getAccessToken(connection);

    if (connection.platform === "facebook" || connection.platform === "instagram") {
      const endpoint = new URL(
        `https://graph.facebook.com/v19.0/${post.platform_post_id}/comments`
      );
      endpoint.searchParams.set("message", text);
      endpoint.searchParams.set("access_token", token);
      const response = await fetch(endpoint, { method: "POST" });
      if (!response.ok) throw new Error(await readPlatformError(response));
      const payload = await response.json();
      return NextResponse.json({ ok: true, externalCommentId: payload.id });
    }

    if (connection.platform === "youtube") {
      const response = await fetch(
        "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            snippet: {
              videoId: post.platform_post_id,
              topLevelComment: {
                snippet: { textOriginal: text },
              },
            },
          }),
        }
      );
      if (!response.ok) throw new Error(await readPlatformError(response));
      const payload = await response.json();
      return NextResponse.json({ ok: true, externalCommentId: payload.id });
    }

    return NextResponse.json(
      { error: `Comment API is not enabled for ${connection.platform}.` },
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

