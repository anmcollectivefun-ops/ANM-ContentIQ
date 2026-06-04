import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type MetaPending = {
  user_id: string;
  platform: "facebook" | "instagram";
  workspace_id: string;
  access_token: string;
  token_expires_at: string | null;
  pages: Array<{ id: string; name: string }>;
};

type MetaPermission = {
  permission?: string;
  status?: string;
};

const META_REQUIRED_SCOPES: Record<string, string[]> = {
  facebook: ["pages_show_list", "pages_read_engagement"],
  instagram: ["pages_show_list", "pages_read_engagement", "instagram_basic", "instagram_manage_insights"],
};

function env(name: string) {
  return process.env[name]?.trim() || "";
}

async function fetchMetaJson(url: string) {
  const res = await fetch(url);
  return res.json().catch(() => null);
}

async function logMetaSelectionDiagnostics(
  platform: string,
  userToken: string,
  pagesRaw: unknown,
  reason: string,
) {
  const appId = env("META_APP_ID");
  const appSecret = env("META_APP_SECRET");
  const user = await fetchMetaJson(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${userToken}`);
  const permissions = await fetchMetaJson(`https://graph.facebook.com/v19.0/me/permissions?access_token=${userToken}`);
  const tokenDebug = appId && appSecret
    ? await fetchMetaJson(`https://graph.facebook.com/debug_token?input_token=${userToken}&access_token=${appId}|${appSecret}`)
    : { error: "Missing META_APP_ID or META_APP_SECRET for debug_token" };
  const grantedFromPermissions = (((permissions as { data?: MetaPermission[] } | null)?.data || [])
    .filter((item) => item.status === "granted")
    .map((item) => item.permission)
    .filter(Boolean)) as string[];
  const grantedFromDebug = (((tokenDebug as { data?: { scopes?: string[] } } | null)?.data?.scopes || [])
    .filter(Boolean)) as string[];
  const grantedScopes = Array.from(new Set([...grantedFromPermissions, ...grantedFromDebug])).sort();
  const requiredScopes = META_REQUIRED_SCOPES[platform] || [];
  const missingScopes = requiredScopes.filter((scope) => !grantedScopes.includes(scope));

  console.error(`[Meta page selection diagnostics][${platform}]`, JSON.stringify({
    reason,
    user,
    permissions,
    tokenDebug,
    grantedScopes,
    requiredScopes,
    missingScopes,
    pagesRaw,
  }, null, 2));
}

function decodePending(value: string): MetaPending | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as MetaPending;
  } catch {
    return null;
  }
}

function getPending(req: NextRequest) {
  const value = req.cookies.get("ciq_meta_page_selection")?.value;
  return value ? decodePending(value) : null;
}

async function fetchPageAccessToken(platform: string, userToken: string, pageId: string) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${userToken}`
  );
  const data = await res.json();

  if (data.error) {
    await logMetaSelectionDiagnostics(platform, userToken, data, "/me/accounts with access_token field error");
    throw new Error(data.error.message);
  }

  const page = (data.data || []).find((item: { id?: string }) => item.id === pageId);

  if (!page?.access_token) {
    await logMetaSelectionDiagnostics(platform, userToken, data, `Selected page ${pageId} missing page access token`);
    throw new Error("Nie znaleziono tokenu wybranej strony. Sprawdź dostęp do tej strony i pages_show_list.");
  }

  return {
    id: page.id as string,
    name: (page.name as string) || "Facebook Page",
    accessToken: page.access_token as string,
  };
}

async function fetchInstagramFromPage(pageId: string, pageToken: string) {
  const pageRes = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}?fields=name,instagram_business_account&access_token=${pageToken}`
  );
  const pageData = await pageRes.json();

  if (pageData.error) throw new Error(pageData.error.message);

  const igId = pageData.instagram_business_account?.id;
  if (!igId) throw new Error("Wybrana Facebook Page nie ma podpiętego Instagram Business Account.");

  const igRes = await fetch(
    `https://graph.facebook.com/v19.0/${igId}?fields=name,username&access_token=${pageToken}`
  );
  const igData = await igRes.json();

  if (igData.error) throw new Error(igData.error.message);

  return {
    id: igId as string,
    name: `@${igData.username || igData.name || pageData.name || "Instagram"}`,
  };
}

async function upsertConnection(
  pending: MetaPending,
  account: { id: string; name: string; accessToken: string },
) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .schema("contentiq")
    .from("platform_connections")
    .select("id")
    .eq("workspace_id", pending.workspace_id)
    .eq("platform", pending.platform)
    .limit(1)
    .single();

  const connectionData = {
    workspace_id: pending.workspace_id,
    platform: pending.platform,
    account_id: account.id,
    account_name: account.name,
    access_token: account.accessToken,
    token_expires_at: pending.token_expires_at,
    connected: true,
    last_synced_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await supabase
      .schema("contentiq")
      .from("platform_connections")
      .update(connectionData)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase
    .schema("contentiq")
    .from("platform_connections")
    .insert(connectionData);
  if (error) throw new Error(error.message);
}

export async function GET(req: NextRequest) {
  const pending = getPending(req);
  if (!pending) return NextResponse.json({ error: "Brak oczekującego wyboru strony Meta." }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== pending.user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ platform: pending.platform, pages: pending.pages });
}

export async function POST(req: NextRequest) {
  const pending = getPending(req);
  if (!pending) return NextResponse.json({ error: "Brak oczekującego wyboru strony Meta." }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== pending.user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const pageId = typeof body?.page_id === "string" ? body.page_id : "";
  if (!pageId || !pending.pages.some((page) => page.id === pageId)) {
    return NextResponse.json({ error: "Nieprawidłowa strona Meta." }, { status: 400 });
  }

  try {
    const page = await fetchPageAccessToken(pending.platform, pending.access_token, pageId);

    if (pending.platform === "facebook") {
      await upsertConnection(pending, { id: page.id, name: page.name, accessToken: page.accessToken });
    } else {
      const instagram = await fetchInstagramFromPage(page.id, page.accessToken);
      await upsertConnection(pending, { id: instagram.id, name: instagram.name, accessToken: page.accessToken });
    }

    const response = NextResponse.json({ ok: true, platform: pending.platform });
    response.cookies.set("ciq_meta_page_selection", "", { path: "/", maxAge: 0 });
    return response;
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
