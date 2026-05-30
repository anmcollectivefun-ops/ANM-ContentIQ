import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveWorkspaceId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspace: string,
  userId: string
) {
  if (UUID_RE.test(workspace)) return workspace;

  const { data, error } = await supabase
    .schema("contentiq")
    .from("workspaces")
    .select("id")
    .eq("slug", workspace)
    .single();

  if (data?.id) {
    return data.id as string;
  }

  const { data: created, error: createError } = await supabase
    .schema("contentiq")
    .from("workspaces")
    .insert({
      user_id: userId,
      name: workspace
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
      type: "Firma",
      slug: workspace,
    })
    .select("id")
    .single();

  if (createError || !created?.id) {
    throw new Error(createError?.message || `Workspace not found: ${workspace}`);
  }

  return created.id as string;
}

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

  let workspaceId: string;
  try {
    workspaceId = await resolveWorkspaceId(supabase, body.workspace_id, user.id);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Workspace not found" },
      { status: 404 }
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
    .insert(
      {
        workspace_id: workspaceId,
        platform: "blog",
        account_name: blogUrl.hostname,
        account_id: blogUrl.origin,
        access_token: token,
        connected: true,
        last_synced_at: new Date().toISOString(),
      }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
