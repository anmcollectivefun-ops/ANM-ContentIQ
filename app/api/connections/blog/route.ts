import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as {
    workspace_id?: string;
    url?: string;
    username?: string;
    password?: string;
  } | null;

  if (!body?.workspace_id || !body.url) {
    return NextResponse.json(
      { error: "Brakuje workspace_id albo adresu bloga" },
      { status: 400 }
    );
  }

  let blogUrl: URL;
  try {
    blogUrl = new URL(body.url);
  } catch {
    return NextResponse.json({ error: "Niepoprawny adres bloga" }, { status: 400 });
  }

  const token = body.username && body.password
    ? Buffer.from(`${body.username}:${body.password.replace(/\s/g, "")}`).toString("base64")
    : null;

  const testUrl = new URL("/wp-json/wp/v2/posts", blogUrl.origin);
  testUrl.searchParams.set("per_page", "1");

  const testRes = await fetch(testUrl, {
    headers: token ? { Authorization: `Basic ${token}` } : {},
  });

  if (!testRes.ok) {
    return NextResponse.json(
      { error: `WordPress REST API zwróciło status ${testRes.status}` },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .schema("contentiq")
    .from("platform_connections")
    .upsert(
      {
        workspace_id: body.workspace_id,
        platform: "blog",
        account_name: blogUrl.hostname,
        account_id: blogUrl.origin,
        access_token: token,
        connected: true,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,platform,account_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
