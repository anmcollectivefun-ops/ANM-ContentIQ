import { NextRequest, NextResponse } from "next/server";
import {
  getCapabilities,
  requireWorkspace,
  type EngagementConnection,
  type EngagementPlatform,
} from "@/lib/engagement/server";

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId")?.trim();
    if (!workspaceId) {
      return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
    }

    const { supabase, workspace } = await requireWorkspace(workspaceId);
    const { data, error } = await supabase
      .schema("contentiq")
      .from("platform_connections")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("connected", true)
      .order("platform");

    if (error) throw new Error(error.message);

    const accounts = ((data || []) as EngagementConnection[]).map((connection) => ({
      id: connection.id,
      platform: connection.platform as EngagementPlatform,
      name:
        connection.profile_name ||
        connection.account_name ||
        connection.username ||
        connection.platform,
      username: connection.username || connection.account_name || null,
      avatarUrl: connection.avatar_url || connection.profile_image_url || null,
      externalAccountId: connection.account_id || null,
      connected: Boolean(connection.connected),
      lastSyncAt: connection.last_synced_at || null,
      capabilities: getCapabilities(connection.platform as EngagementPlatform),
    }));

    return NextResponse.json({ accounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}

