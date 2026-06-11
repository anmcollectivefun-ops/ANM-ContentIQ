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
    const externalCommentId = String(body.externalCommentId || "").trim();
    const text = String(body.text || "").trim();

    if (!workspaceId || !accountId || !postId || !externalCommentId || !text) {
      return NextResponse.json({ error: "Missing reply data" }, { status: 400 });
    }

    const { connection } = await requirePost(workspaceId, accountId, postId);
    const token = await getAccessToken(connection);

    if (connection.platform === "facebook" || connection.platform === "instagram") {
      const endpoint = new URL(
        `https://graph.facebook.com/v19.0/${externalCommentId}/replies`
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
        "https://www.googleapis.com/youtube/v3/comments?part=snippet",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            snippet: {
              parentId: externalCommentId,
              textOriginal: text,
            },
          }),
        }
      );
      if (!response.ok) throw new Error(await readPlatformError(response));
      const payload = await response.json();
      return NextResponse.json({ ok: true, externalCommentId: payload.id });
    }

    return NextResponse.json(
      { error: `Reply API is not enabled for ${connection.platform}.` },
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

