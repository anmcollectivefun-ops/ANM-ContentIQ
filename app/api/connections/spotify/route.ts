import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SpotifyShow = {
  id?: string;
  name?: string;
  publisher?: string;
  images?: Array<{ url?: string }>;
  external_urls?: { spotify?: string };
  total_episodes?: number;
  error?: { message?: string };
};

function extractShowId(value: string) {
  const trimmed = value.trim();
  const urlMatch = trimmed.match(/open\.spotify\.com\/show\/([A-Za-z0-9]+)/i);
  const uriMatch = trimmed.match(/^spotify:show:([A-Za-z0-9]+)$/i);
  return urlMatch?.[1] || uriMatch?.[1] || trimmed;
}

async function resolveWorkspaceId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspace: string,
  userId: string
) {
  const query = supabase
    .schema("contentiq")
    .from("workspaces")
    .select("id")
    .eq("user_id", userId);

  const { data } = UUID_RE.test(workspace)
    ? await query.eq("id", workspace).single()
    : await query.eq("slug", workspace).single();

  if (!data?.id) throw new Error("Nie znaleziono przestrzeni aplikacji.");
  return data.id as string;
}

async function getSpotifyAppToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim() || "";

  if (!clientId || !clientSecret) {
    throw new Error("Brakuje SPOTIFY_CLIENT_ID lub SPOTIFY_CLIENT_SECRET.");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
  const data = await response.json();

  if (!response.ok || data.error || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "Nie udało się połączyć ze Spotify API."
    );
  }

  return {
    accessToken: data.access_token as string,
    expiresAt: data.expires_in
      ? new Date(Date.now() + Number(data.expires_in) * 1000).toISOString()
      : null,
  };
}

function normalizeShow(show: SpotifyShow) {
  return {
    id: show.id || "",
    name: show.name || "Podcast Spotify",
    publisher: show.publisher || "",
    image: show.images?.[0]?.url || "",
    url: show.external_urls?.spotify || "",
    totalEpisodes: Number(show.total_episodes || 0),
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    workspace_id?: string;
    connection_id?: string;
    show?: string;
  } | null;
  const showId = extractShowId(body?.show || "");

  if (!body?.workspace_id || !/^[A-Za-z0-9]{22}$/.test(showId)) {
    return NextResponse.json(
      { error: "Wklej poprawny link do podcastu Spotify." },
      { status: 400 }
    );
  }

  try {
    const workspaceId = await resolveWorkspaceId(
      supabase,
      body.workspace_id,
      user.id
    );
    const token = await getSpotifyAppToken();
    const response = await fetch(`https://api.spotify.com/v1/shows/${showId}`, {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });
    const show = (await response.json()) as SpotifyShow;

    if (!response.ok || show.error || !show.id) {
      throw new Error(show.error?.message || "Nie znaleziono podcastu Spotify.");
    }

    const connectionData = {
      workspace_id: workspaceId,
      platform: "spotify",
      account_id: show.id,
      account_name: show.name || "Podcast Spotify",
      access_token: token.accessToken,
      refresh_token: null,
      token_expires_at: token.expiresAt,
      connected: true,
      last_synced_at: null,
    };

    const { data: existing } = await supabase
      .schema("contentiq")
      .from("platform_connections")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("platform", "spotify")
      .limit(1)
      .maybeSingle();

    const connectionId = body.connection_id || existing?.id;
    const result = connectionId
      ? await supabase
          .schema("contentiq")
          .from("platform_connections")
          .update(connectionData)
          .eq("id", connectionId)
          .select("id")
          .single()
      : await supabase
          .schema("contentiq")
          .from("platform_connections")
          .insert(connectionData)
          .select("id")
          .single();

    if (result.error || !result.data?.id) {
      throw new Error(result.error?.message || "Nie udało się zapisać Spotify.");
    }

    return NextResponse.json({
      ok: true,
      connectionId: result.data.id,
      show: normalizeShow(show),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
