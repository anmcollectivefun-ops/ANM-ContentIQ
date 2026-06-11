import { NextRequest, NextResponse } from "next/server";
import { requireConnection } from "@/lib/engagement/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const workspaceId = String(body.workspaceId || "").trim();
    const accountId = String(body.accountId || "").trim();
    if (!workspaceId || !accountId) {
      return NextResponse.json(
        { error: "Missing workspaceId or accountId" },
        { status: 400 }
      );
    }

    const { connection } = await requireConnection(workspaceId, accountId);
    const response = await fetch(new URL("/api/sync", request.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        connection_id: connection.id,
        platform: connection.platform,
      }),
      cache: "no-store",
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        { error: result?.error || "Synchronization failed" },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}

