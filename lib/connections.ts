import { createClient } from "@/lib/supabase/server";
 
export type Platform = "instagram" | "facebook" | "linkedin" | "tiktok" | "youtube" | "blog";
 
export interface PlatformConnection {
  id: string;
  workspace_id: string;
  platform: Platform;
  account_id: string;
  account_name: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  connected: boolean;
  last_synced_at: string | null;
}
 
// ─── Pobierz token użytkownika dla danej platformy ───────────────────────────
 
export async function getConnection(
  workspaceId: string,
  platform: Platform
): Promise<PlatformConnection | null> {
  const supabase = await createClient();
 
  const { data, error } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("platform", platform)
    .eq("connected", true)
    .order("last_synced_at", { ascending: false })
    .limit(1)
    .single();
 
  if (error || !data) return null;
  return data as PlatformConnection;
}
 
// ─── Pobierz wszystkie połączenia workspace'u ────────────────────────────────
 
export async function getAllConnections(workspaceId: string): Promise<PlatformConnection[]> {
  const supabase = await createClient();
 
  const { data } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("connected", true)
    .order("platform");
 
  return (data || []) as PlatformConnection[];
}
 
// ─── Sprawdź czy token jest ważny ────────────────────────────────────────────
 
export function isTokenValid(connection: PlatformConnection): boolean {
  if (!connection.token_expires_at) return true; // brak exp = nie wygasa
  return new Date(connection.token_expires_at) > new Date(Date.now() + 60 * 60 * 1000); // ważny > 1h
}
 
// ─── Odśwież token jeśli wygasł ──────────────────────────────────────────────
 
export async function refreshTokenIfNeeded(connection: PlatformConnection): Promise<string> {
  if (isTokenValid(connection)) return connection.access_token;
 
  // Odśwież w zależności od platformy
  let newToken = connection.access_token;
  let expiresAt: string | null = null;
 
  try {
    if (connection.platform === "youtube" && connection.refresh_token) {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          refresh_token: connection.refresh_token,
          grant_type: "refresh_token",
        }),
      });
      const data = await res.json();
      newToken = data.access_token;
      expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
    }
 
    if (connection.platform === "linkedin" && connection.refresh_token) {
      const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: connection.refresh_token,
          client_id: process.env.LINKEDIN_CLIENT_ID || "",
          client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
        }),
      });
      const data = await res.json();
      newToken = data.access_token;
      expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
    }
 
    if (connection.platform === "tiktok" && connection.refresh_token) {
      const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: process.env.TIKTOK_CLIENT_KEY || "",
          client_secret: process.env.TIKTOK_CLIENT_SECRET || "",
          grant_type: "refresh_token",
          refresh_token: connection.refresh_token,
        }),
      });
      const data = await res.json();
      newToken = data.access_token;
      expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
    }
 
    // Zapisz nowy token do bazy
    if (newToken !== connection.access_token) {
      const supabase = await createClient();
      await supabase
        .from("platform_connections")
        .update({ access_token: newToken, token_expires_at: expiresAt })
        .eq("id", connection.id);
    }
  } catch (err) {
    console.error(`Token refresh error [${connection.platform}]:`, err);
  }
 
  return newToken;
}
 
// ─── PRZYKŁADY UŻYCIA ────────────────────────────────────────────────────────
// Te funkcje używają tokenu konkretnego użytkownika — każdy ma swój własny.
 
export async function fetchInstagramPosts(workspaceId: string) {
  const conn = await getConnection(workspaceId, "instagram");
  if (!conn) throw new Error("Instagram nie podłączony");
 
  const token = await refreshTokenIfNeeded(conn);
 
  // Pobierz media account
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${conn.account_id}/media?` +
    `fields=id,caption,media_type,timestamp,permalink,` +
    `insights.metric(reach,impressions,likes,comments,saved,shares)&` +
    `access_token=${token}&limit=25`
  );
  return res.json();
}
 
export async function fetchLinkedInPosts(workspaceId: string) {
  const conn = await getConnection(workspaceId, "linkedin");
  if (!conn) throw new Error("LinkedIn nie podłączony");
 
  const token = await refreshTokenIfNeeded(conn);
 
  const res = await fetch(
    `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(${encodeURIComponent(conn.account_id)})&count=20`,
    { headers: { Authorization: `Bearer ${token}`, "X-Restli-Protocol-Version": "2.0.0" } }
  );
  return res.json();
}
 
export async function fetchYouTubeVideos(workspaceId: string) {
  const conn = await getConnection(workspaceId, "youtube");
  if (!conn) throw new Error("YouTube nie podłączony");
 
  const token = await refreshTokenIfNeeded(conn);
 
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?` +
    `part=snippet&forMine=true&type=video&maxResults=25&order=date`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.json();
}
 
export async function fetchWordPressPosts(workspaceId: string) {
  const conn = await getConnection(workspaceId, "blog");
  if (!conn) throw new Error("Blog nie podłączony");
 
  // account_id to URL bloga dla WordPressa
  const blogUrl = conn.account_id;
  const headers: Record<string, string> = {};
  if (conn.access_token) {
    headers["Authorization"] = `Basic ${conn.access_token}`;
  }
 
  const res = await fetch(
    `${blogUrl.replace(/\/$/, "")}/wp-json/wp/v2/posts?per_page=20&_embed`,
    { headers }
  );
  return res.json();
}
