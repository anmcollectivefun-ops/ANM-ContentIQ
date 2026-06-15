import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SpotifyConnection = {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
};

type SpotifyShow = {
  id?: string;
  name?: string;
  publisher?: string;
  images?: Array<{ url?: string }>;
  external_urls?: { spotify?: string };
  total_episodes?: number;
};

function extractShowId(value: string) {
  const trimmed = value.trim();
  const urlMatch = trimmed.match(/open\.spotify\.com\/show\/([A-Za-z0-9]+)/i);
  const uriMatch = trimmed.match(/^spotify:show:([A-Za-z0-9]+)$/i);
  return urlMatch?.[1] || uriMatch?.[1] || trimmed;
}

function isExpiringSoon(expiresAt: string | null) {
  return Boolean(
    expiresAt &&
      new Date(expiresAt).getTime() < Date.now() + 10 * 60 * 1000
  );
}

async function getConnection(
  connectionId: string
): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  connection: SpotifyConnection;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .schema("contentiq")
    .from("platform_connections")
    .select("id,access_token,refresh_token,token_expires_at")
    .eq("id", connectionId)
    .eq("platform", "spotify")
    .eq("connected", true)
    .single();

  if (!data) return null;
  return { supabase, connection: data as SpotifyConnection };
}

async function getAccessToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  connection: SpotifyConnection
) {
  if (
    connection.access_token &&
    !isExpiringSoon(connection.token_expires_at)
  ) {
    return connection.access_token;
  }

  if (!connection.refresh_token) {
    throw new Error("Token Spotify wygasł. Połącz konto ponownie.");
  }

  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID?.trim() || ""}:${process.env.SPOTIFY_CLIENT_SECRET?.trim() || ""}`
  ).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
    }),
  });
  const data = await response.json();

  if (!response.ok || data.error || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "Nie udało się odświeżyć tokenu Spotify."
    );
  }

  const expiresAt = data.expires_in
    ? new Date(Date.now() + Number(data.expires_in) * 1000).toISOString()
    : connection.token_expires_at;

  await supabase
    .schema("contentiq")
    .from("platform_connections")
    .update({
      access_token: data.access_token,
      token_expires_at: expiresAt,
      ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
    })
    .eq("id", connection.id);

  return data.access_token as string;
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

export async function GET(request: NextRequest) {
  const connectionId = request.nextUrl.searchParams.get("connection_id") || "";
  const context = await getConnection(connectionId);

  if (!context) {
    return NextResponse.json({ error: "Połączenie Spotify nie istnieje." }, { status: 404 });
  }

  try {
    const token = await getAccessToken(context.supabase, context.connection);
    const response = await fetch("https://api.spotify.com/v1/me/shows?limit=50", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error?.message || `Spotify API: ${response.status}`);
    }

    return NextResponse.json({
      shows: (data.items || [])
        .map((item: { show?: SpotifyShow }) => item.show)
        .filter(Boolean)
        .map(normalizeShow),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    connection_id?: string;
    show?: string;
  } | null;
  const connectionId = body?.connection_id || "";
  const showId = extractShowId(body?.show || "");
  const context = await getConnection(connectionId);

  if (!context) {
    return NextResponse.json({ error: "Połączenie Spotify nie istnieje." }, { status: 404 });
  }

  if (!/^[A-Za-z0-9]+$/.test(showId)) {
    return NextResponse.json(
      { error: "Wklej poprawny link do podcastu Spotify albo jego Show ID." },
      { status: 400 }
    );
  }

  try {
    const token = await getAccessToken(context.supabase, context.connection);
    const response = await fetch(`https://api.spotify.com/v1/shows/${showId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const show = (await response.json()) as SpotifyShow & {
      error?: { message?: string };
    };

    if (!response.ok || show.error || !show.id) {
      throw new Error(show.error?.message || "Nie znaleziono podcastu Spotify.");
    }

    const { error } = await context.supabase
      .schema("contentiq")
      .from("platform_connections")
      .update({
        account_id: show.id,
        account_name: show.name || "Podcast Spotify",
      })
      .eq("id", connectionId);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, show: normalizeShow(show) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
