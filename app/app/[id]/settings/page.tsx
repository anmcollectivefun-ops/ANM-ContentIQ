"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Platform = "instagram" | "facebook" | "linkedin" | "tiktok" | "youtube" | "blog" | "spotify";

interface Connection {
  id: string;
  platform: Platform;
  account_name: string;
  account_id: string;
  connected: boolean;
  last_synced_at: string | null;
  token_expires_at: string | null;
}

const PLATFORM_META = {
  instagram: { label: "Instagram", color: "#E1306C", gradient: "linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)", desc: "Reels, posty, karuzele — zasięgi, wyświetlenia, zapisy", icon: "IG", type: "oauth" as const },
  facebook:  { label: "Facebook",  color: "#1877F2", gradient: "linear-gradient(135deg,#1877F2,#0d5fd8)", desc: "Strony firmowe, posty, statystyki i zasięg organiczny", icon: "FB", type: "oauth" as const },
  linkedin:  { label: "LinkedIn",  color: "#0A66C2", gradient: "linear-gradient(135deg,#0A66C2,#084fa0)", desc: "Profil i strony firmowe — posty eksperckie, B2B leady", icon: "LI", type: "oauth" as const },
  tiktok:    { label: "TikTok",    color: "#00C4CC", gradient: "linear-gradient(135deg,#010101,#69C9D0)", desc: "Filmy, statystyki wyświetleń, completion rate i wyniki", icon: "TT", type: "oauth" as const },
  youtube:   { label: "YouTube",   color: "#FF0000", gradient: "linear-gradient(135deg,#FF0000,#cc0000)", desc: "Kanał, filmy, Shorts — wyświetlenia, retencja, kliknięcia", icon: "YT", type: "oauth" as const },
  spotify:   { label: "Spotify",   color: "#1DB954", gradient: "linear-gradient(135deg,#1DB954,#158a3e)", desc: "Podcasty, odcinki, słuchalność i completion rate", icon: "SP", type: "oauth" as const },
  blog:      { label: "Blog / WordPress", color: "#22C55E", gradient: "linear-gradient(135deg,#22C55E,#16a34a)", desc: "Artykuły, SEO, czas na stronie i konwersje organiczne", icon: "BL", type: "manual" as const },
};

const PLATFORMS = Object.keys(PLATFORM_META) as Platform[];

function formatSync(val: string | null) {
  if (!val) return "Nie zsynchronizowano";
  const diff = Date.now() - new Date(val).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "przed chwilą";
  if (m < 60) return `${m} min temu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} godz. temu`;
  return `${Math.round(h / 24)} dni temu`;
}

function isExpiring(val: string | null) {
  if (!val) return false;
  return (new Date(val).getTime() - Date.now()) / 86400000 < 7;
}

export default function IntegrationsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const workspaceId = Array.isArray(params.id) ? params.id[0] : params.id as string;
  const supabase = createClient();

  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsDbId, setWsDbId] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [syncAll, setSyncAll] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [blogUrl, setBlogUrl] = useState("");
  const [blogUser, setBlogUser] = useState("");
  const [blogPass, setBlogPass] = useState("");
  const [blogSaving, setBlogSaving] = useState(false);
  const [spotifyShowId, setSpotifyShowId] = useState("");
  const [spotifySaving, setSpotifySaving] = useState(false);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  async function getOrCreateWs() {
    const { data: ex } = await supabase.schema("contentiq").from("workspaces").select("id").eq("slug", workspaceId).single();
    if (ex?.id) return ex.id as string;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Brak sesji");
    const { data: cr, error } = await supabase.schema("contentiq").from("workspaces").insert({
      user_id: auth.user.id,
      name: workspaceId.split("-").map(p => p[0].toUpperCase() + p.slice(1)).join(" "),
      type: "Firma", slug: workspaceId,
    }).select("id").single();
    if (error || !cr?.id) throw new Error(error?.message || "Błąd workspace");
    return cr.id as string;
  }

  async function load() {
    setLoading(true);
    try {
      const id = await getOrCreateWs();
      setWsDbId(id);
      const { data } = await supabase.schema("contentiq").from("platform_connections").select("*").eq("workspace_id", id).eq("connected", true);
      setConnections((data || []) as Connection[]);
      const spotify = (data || []).find((c: Connection) => c.platform === "spotify");
      if (spotify?.account_id && spotify.account_id !== "unknown") setSpotifyShowId(spotify.account_id);
    } catch (e) {
      showToast(String(e), false);
    }
    setLoading(false);
  }

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    const account = searchParams.get("account");
    const detail = searchParams.get("detail");
    if (connected) showToast(`✓ ${account || connected} podłączono pomyślnie`);
    if (error) showToast(detail || "Błąd autoryzacji — spróbuj ponownie", false);
  }, [searchParams]);

  useEffect(() => { load(); }, [workspaceId]);

  async function syncOne(conn: Connection) {
    setSyncing(conn.id);
    try {
      const res = await fetch("/api/sync", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: conn.id, platform: conn.platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Błąd sync");
      showToast(data?.message || `✓ Pobrano dane z ${PLATFORM_META[conn.platform as Platform]?.label || conn.platform}`);
      await load();
    } catch (e) { showToast(String(e), false); }
    setSyncing(null);
  }

  async function syncAllNow() {
    if (!wsDbId) return;
    setSyncAll(true);
    try {
      const res = await fetch("/api/sync", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: wsDbId, all: true }),
      });
      const data = await res.json();
      showToast(data?.message || "✓ Synchronizacja zakończona", !data?.failed);
      await load();
    } catch (e) { showToast(String(e), false); }
    setSyncAll(false);
  }

  async function disconnect(conn: Connection) {
    setDisconnecting(conn.id);
    await supabase.schema("contentiq").from("platform_connections")
      .update({ connected: false, access_token: null, refresh_token: null }).eq("id", conn.id);
    await load();
    setDisconnecting(null);
    showToast(`${PLATFORM_META[conn.platform as Platform]?.label || conn.platform} odłączono`);
  }

  async function saveBlog() {
    if (!blogUrl) { showToast("Wpisz adres bloga", false); return; }
    setBlogSaving(true);
    try {
      const res = await fetch("/api/connections/blog", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: wsDbId, url: blogUrl, username: blogUser, password: blogPass }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      showToast("✓ Blog podłączony");
      setBlogUrl(""); setBlogUser(""); setBlogPass("");
      await load();
    } catch (e) { showToast(String(e), false); }
    setBlogSaving(false);
  }

  async function saveSpotifyShowId(connId: string) {
    if (!spotifyShowId) { showToast("Wpisz Show ID podcastu", false); return; }
    setSpotifySaving(true);
    const extracted = spotifyShowId.includes("spotify.com/show/")
      ? spotifyShowId.split("/show/")[1].split("?")[0].split("/")[0]
      : spotifyShowId.trim();
    const { error } = await supabase.schema("contentiq").from("platform_connections")
      .update({ account_id: extracted }).eq("id", connId);
    if (error) { showToast(error.message, false); }
    else { showToast("✓ Show ID zapisane"); await load(); }
    setSpotifySaving(false);
  }

  function conn(platform: Platform) {
    return connections.find(c => c.platform === platform);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1a", fontFamily: "'DM Sans','Helvetica Neue',sans-serif", color: "#e8f0ff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Serif+Display&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .card{transition:transform .2s cubic-bezier(.22,.68,0,1.2),box-shadow .2s}
        .card:hover{transform:translateY(-2px);box-shadow:0 20px 50px rgba(0,0,0,.4)}
        .btn{transition:opacity .15s,transform .15s;cursor:pointer;font-family:inherit}
        .btn:hover{opacity:.85}
        .btn:active{transform:scale(.97)}
        input{outline:none;font-family:inherit}
        input:focus{border-color:#818cf8!important}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .fade{animation:fadeUp .35s ease forwards}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spin{animation:spin .7s linear infinite;display:inline-block}
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 200, padding: "12px 20px", borderRadius: 12, background: toast.ok ? "#052e16" : "#450a0a", color: toast.ok ? "#22c55e" : "#ef4444", fontSize: 13, border: `1px solid ${toast.ok ? "#166534" : "#991b1b"}`, boxShadow: "0 8px 32px rgba(0,0,0,.5)", maxWidth: 380, lineHeight: 1.5 }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1a2740", background: "rgba(10,15,26,0.95)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link href={`/app/${workspaceId}`} className="btn"
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 9, border: "1px solid #1e3250", background: "#0f1d2e", color: "#6b8aaa", fontSize: 12, textDecoration: "none", fontWeight: 500 }}>
              ← Wróć do dashboardu
            </Link>
            <div style={{ width: 1, height: 20, background: "#1a2740" }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: "#e8f0ff" }}>Integracje API</div>
          </div>
          <button className="btn"
            onClick={syncAllNow}
            disabled={syncAll || loading || connections.length === 0}
            style={{ padding: "8px 18px", borderRadius: 9, background: "#4E8FD4", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, opacity: syncAll || connections.length === 0 ? 0.5 : 1 }}>
            {syncAll ? <><span className="spin">↻</span> Synchronizuję...</> : "↻ Odśwież wszystkie"}
          </button>
        </div>
      </div>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* Hero */}
        <div style={{ marginBottom: 36 }} className="fade">
          <div style={{ fontSize: 10, fontWeight: 700, color: "#4E8FD4", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 10 }}>⊕ Centrum połączeń</div>
          <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 34, fontWeight: 400, letterSpacing: "-0.02em", color: "#e8f0ff", marginBottom: 10 }}>Podłączone platformy</h1>
          <p style={{ fontSize: 13, color: "#4a6480", lineHeight: 1.7, maxWidth: 560 }}>
            Połącz swoje konta — aplikacja automatycznie pobierze wyniki, zasięgi i statystyki. Każde konto możesz zsynchronizować osobno lub odłączyć w dowolnym momencie.
          </p>
        </div>

        {/* Platform cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {PLATFORMS.map((platform, idx) => {
            const meta = PLATFORM_META[platform];
            const connection = conn(platform);
            const isConnected = !!connection;
            const isSyncing = syncing === connection?.id;
            const isDisconnecting = disconnecting === connection?.id;

            return (
              <div key={platform} className="card fade" style={{ animationDelay: `${idx * 0.04}s`, background: "#0d1829", border: `1px solid ${isConnected ? meta.color + "40" : "#1a2740"}`, borderRadius: 16, overflow: "hidden" }}>
                {/* Top strip */}
                <div style={{ height: 3, background: isConnected ? meta.gradient : "#1a2740" }} />

                <div style={{ padding: "18px 20px" }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: meta.color + "20", border: `1px solid ${meta.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: meta.color, flexShrink: 0 }}>
                        {meta.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#e8f0ff" }}>{meta.label}</div>
                        {isConnected && (
                          <div style={{ fontSize: 11, color: "#4a6480", marginTop: 1 }}>{connection.account_name}</div>
                        )}
                      </div>
                    </div>
                    {isConnected ? (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: "#22c55e18", color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>
                        ● Aktywne
                      </span>
                    ) : (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: "#f59e0b15", color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>
                        Niepołączone
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: 11, color: "#3d5473", lineHeight: 1.6, marginBottom: 14 }}>{meta.desc}</p>

                  {/* Sync info */}
                  {isConnected && (
                    <div style={{ padding: "8px 10px", borderRadius: 8, background: "#0a1220", border: "1px solid #1a2740", marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 10, color: "#3d5473", marginBottom: 2 }}>Ostatnia synchronizacja</div>
                          <div style={{ fontSize: 12, color: "#6b8aaa", fontWeight: 500 }}>{formatSync(connection.last_synced_at)}</div>
                        </div>
                        {isExpiring(connection.token_expires_at) && (
                          <span style={{ fontSize: 10, color: "#f59e0b", background: "#f59e0b15", padding: "3px 8px", borderRadius: 6 }}>⚠ Token wygasa</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Spotify Show ID */}
                  {isConnected && platform === "spotify" && (
                    <div style={{ padding: "10px 12px", borderRadius: 10, background: "#0a1220", border: "1px solid #1a2740", marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: "#4a6480", marginBottom: 6 }}>Show ID podcastu</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input value={spotifyShowId} onChange={e => setSpotifyShowId(e.target.value)}
                          placeholder="https://open.spotify.com/show/... lub samo ID"
                          style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: "1px solid #1a2740", background: "#080e1a", color: "#e8f0ff", fontSize: 11, fontFamily: "monospace" }} />
                        <button className="btn" onClick={() => saveSpotifyShowId(connection.id)} disabled={spotifySaving}
                          style={{ padding: "7px 12px", borderRadius: 7, background: "#1DB954", color: "#fff", border: "none", fontSize: 11, fontWeight: 600, opacity: spotifySaving ? 0.6 : 1 }}>
                          {spotifySaving ? "..." : "Zapisz"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Blog form */}
                  {!isConnected && platform === "blog" && (
                    <div style={{ padding: "12px", borderRadius: 10, background: "#0a1220", border: "1px solid #1a2740", marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: "#4a6480", marginBottom: 8 }}>Dane połączenia</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <input value={blogUrl} onChange={e => setBlogUrl(e.target.value)} placeholder="https://twojblog.pl"
                          style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #1a2740", background: "#080e1a", color: "#e8f0ff", fontSize: 12 }} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                          <input value={blogUser} onChange={e => setBlogUser(e.target.value)} placeholder="Login WP (opcjonalnie)"
                            style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #1a2740", background: "#080e1a", color: "#e8f0ff", fontSize: 11 }} />
                          <input type="password" value={blogPass} onChange={e => setBlogPass(e.target.value)} placeholder="Application Password"
                            style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #1a2740", background: "#080e1a", color: "#e8f0ff", fontSize: 11 }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    {isConnected ? (
                      <>
                        <button className="btn" onClick={() => syncOne(connection)} disabled={isSyncing}
                          style={{ flex: 1, padding: "9px", borderRadius: 9, background: meta.color + "18", border: `1px solid ${meta.color}40`, color: meta.color, fontSize: 12, fontWeight: 600, opacity: isSyncing ? 0.6 : 1 }}>
                          {isSyncing ? <><span className="spin">↻</span> Sync...</> : "↻ Sync teraz"}
                        </button>
                        <button className="btn" onClick={() => window.location.href = `/api/oauth/${platform}?workspace_id=${workspaceId}`}
                          style={{ padding: "9px 12px", borderRadius: 9, border: "1px solid #1a2740", background: "transparent", color: "#4a6480", fontSize: 11, fontWeight: 500 }}>
                          ↑ Nowe
                        </button>
                        <button className="btn" onClick={() => disconnect(connection)} disabled={isDisconnecting}
                          style={{ padding: "9px 12px", borderRadius: 9, border: "1px solid #ef444430", background: "#ef444410", color: "#ef4444", fontSize: 11, fontWeight: 600, opacity: isDisconnecting ? 0.6 : 1 }}>
                          {isDisconnecting ? "..." : "✕"}
                        </button>
                      </>
                    ) : (
                      <button className="btn"
                        onClick={() => {
                          if (meta.type === "oauth") window.location.href = `/api/oauth/${platform}?workspace_id=${workspaceId}`;
                          else saveBlog();
                        }}
                        disabled={platform === "blog" && blogSaving}
                        style={{ flex: 1, padding: "10px", borderRadius: 9, background: meta.color, color: "#fff", border: "none", fontSize: 12, fontWeight: 700, opacity: blogSaving ? 0.6 : 1 }}>
                        {platform === "blog" ? (blogSaving ? "Łączę..." : "Połącz blog") : `+ Połącz ${meta.label}`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer links */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #1a2740", display: "flex", justifyContent: "center", gap: 24 }}>
          <a href="https://contentiq.anmcollective.fun/privacy" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: "#3d5473", textDecoration: "none" }}>
            Polityka prywatności
          </a>
          <a href="https://contentiq.anmcollective.fun/terms" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: "#3d5473", textDecoration: "none" }}>
            Regulamin
          </a>
        </div>
      </main>
    </div>
  );
}
