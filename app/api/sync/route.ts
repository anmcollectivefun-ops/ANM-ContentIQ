import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SYNCABLE_PLATFORMS = new Set([
  "instagram",
  "facebook",
  "linkedin",
  "tiktok",
  "youtube",
  "blog",
]);

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { connection_id?: string; platform?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.connection_id || !body.platform) {
    return NextResponse.json(
      { error: "Missing connection_id or platform" },
      { status: 400 }
    );
  }

  if (!SYNCABLE_PLATFORMS.has(body.platform)) {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  }

  const { data: connection, error: fetchError } = await supabase
    .from("platform_connections")
    .select("id, platform, connected")
    .eq("id", body.connection_id)
    .eq("platform", body.platform)
    .eq("connected", true)
    .single();

  if (fetchError || !connection) {
    return NextResponse.json(
      { error: "Connection not found" },
      { status: 404 }
    );
  }

  const { error: updateError } = await supabase
    .from("platform_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
