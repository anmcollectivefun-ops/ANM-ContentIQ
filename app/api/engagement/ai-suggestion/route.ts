import { NextRequest, NextResponse } from "next/server";
import { requirePost } from "@/lib/engagement/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const workspaceId = String(body.workspaceId || "").trim();
    const accountId = String(body.accountId || "").trim();
    const postId = String(body.postId || "").trim();
    const action = String(body.action || "reply");
    const userPrompt = String(body.userPrompt || "").trim();
    const language = body.language === "en" ? "English" : "Polish";

    if (!workspaceId || !accountId || !postId) {
      return NextResponse.json(
        { error: "Missing workspaceId, accountId or postId" },
        { status: 400 }
      );
    }

    const { supabase, workspace, connection, post } = await requirePost(
      workspaceId,
      accountId,
      postId
    );

    const commentText = String(body.commentText || "").trim();
    const [{ data: brandProfile }, { data: offers }] = await Promise.all([
      supabase
        .schema("contentiq")
        .from("brand_profiles")
        .select("*")
        .eq("workspace_id", workspace.id)
        .maybeSingle(),
      supabase
        .schema("contentiq")
        .from("brand_offers")
        .select("name,short_description,benefits,cta_options,is_primary")
        .eq("workspace_id", workspace.id)
        .eq("status", "active")
        .limit(5),
    ]);

    const task =
      action === "reply"
        ? "Write a direct reply to the selected comment."
        : "Write a useful new comment under the brand's own post.";

    const prompt = `
You are the community manager for this brand. ${task}
Write only the final comment in ${language}, with no quotation marks, labels or explanation.
Never invent facts, promises, discounts or links. Keep the response natural and human.

Platform: ${connection.platform}
Post title: ${post.title || ""}
Post content: ${post.content || ""}
Selected user comment: ${commentText || "(none)"}
Additional instruction from the user: ${userPrompt || "(none)"}

Brand profile:
${JSON.stringify(brandProfile || {}, null, 2)}

Active offers:
${JSON.stringify(offers || [], null, 2)}
`.trim();

    const response = await fetch(new URL("/api/chat", request.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        mode: "chat",
        provider: body.provider === "gemini" ? "gemini" : "deepseek",
        prompt,
        platform: connection.platform,
      }),
      cache: "no-store",
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        { error: result?.error || result?.details || "AI suggestion failed" },
        { status: response.status }
      );
    }

    const draft = String(result?.answer || result?.data || "").trim();
    if (!draft) {
      return NextResponse.json(
        { error: "AI returned an empty suggestion." },
        { status: 502 }
      );
    }

    return NextResponse.json({ draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}

