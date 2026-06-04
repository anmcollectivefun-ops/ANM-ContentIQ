"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { 
  ArrowLeft, 
  RefreshCw, 
  Plus, 
  X, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertCircle, 
  Link2, 
  Globe, 
  Instagram, 
  Facebook, 
  Linkedin, 
  Youtube, 
  Radio, 
  ExternalLink 
} from "lucide-react";

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

interface ManualLink {
  id: string;
  connection_id: string;
  type: "account" | "post";
  url: string;
  title: string | null;
}

interface MetaSelectablePage {
  id: string;
  name: string;
}

const PLATFORM_META = {
  instagram: { label: "Instagram", color: "#E1306C", gradient: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)", desc: "Reels, posty, karuzele — zasięgi, wyświetlenia, zapisy", icon: Instagram, type: "oauth" as const, accountPlaceholder: "https://instagram.com/twojekonto", postPlaceholder: "https://instagram.com/p/ABC123" },
  facebook:  { label: "Facebook",  color: "#1877F2", gradient: "linear-gradient(135deg, #1877F2, #0d5fd8)", desc: "Strony firmowe, posty, statystyki i zasięg organiczny", icon: Facebook, type: "oauth" as const, accountPlaceholder: "https://facebook.com/twojastrona", postPlaceholder: "https://facebook.com/posts/123" },
  linkedin:  { label: "LinkedIn",  color: "#0A66C2", gradient: "linear-gradient(135deg, #0A66C2, #084fa0)", desc: "Profil i strony firmowe — posty eksperckie, B2B leady", icon: Linkedin, type: "oauth" as const, accountPlaceholder: "https://linkedin.com/company/twojafirma", postPlaceholder: "https://linkedin.com/posts/123" },
  tiktok:    { label: "TikTok",    color: "#00C4CC", gradient: "linear-gradient(135deg, #010101, #69C9D0)", desc: "Filmy, statystyki wyświetleń, completion rate i wyniki", icon: Radio, type: "oauth" as const, accountPlaceholder: "https://tiktok.com/@twojekonto", postPlaceholder: "https://tiktok.com/@konto/video/123" },
  youtube:   { label: "YouTube",   color: "#FF0000", gradient: "linear-gradient(135deg, #FF0000, #cc0000)", desc: "Kanał, filmy, Shorts — wyświetlenia, retencja, kliknięcia", icon: Youtube, type: "oauth" as const, accountPlaceholder: "https://youtube.com/@twojkanal", postPlaceholder: "https://youtube.com/watch?v=ABC123" },
  spotify:   { label: "Spotify",   color: "#1DB954", gradient: "linear-gradient(135deg, #1DB954, #158a3e)", desc: "Podcasty, odcinki, słuchalność i completion rate", icon: Radio, type: "oauth" as const, accountPlaceholder: "spotify:show:...", postPlaceholder: "spotify:episode:..." },
  blog:      { label: "Blog / WordPress", color: "#22C55E", gradient: "linear-gradient(135deg, #22C55E, #16a34a)", desc: "Artykuły, SEO, czas na stronie i konwersje organiczne", icon: Globe, type: "manual" as const, accountPlaceholder: "https://twojblog.pl", postPlaceholder: "https://twojblog.pl/artykul" },
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

function ManualLinksPanel({ connection }: { connection: Connection }) {
  const supabase = createClient();
  const meta = PLATFORM_META[connection.platform];
  const [links, setLinks] = useState<ManualLink[]>([]);
  const [accountUrl, setAccountUrl] = useState("");
  const [newPostUrl, setNewPostUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadLinks() {
    const { data, error: loadError } = await supabase.schema("contentiq").from("manual_links")
      .select("*").eq("connection_id", connection.id).order("created_at");
    if (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }
    const all = (data || []) as ManualLink[];
    setLinks(all);
    const acc = all.find(l => l.type === "account");
    if (acc) setAccountUrl(acc.url);
    else setAccountUrl("");
    setError("");
    setLoading(false);
  }

  useEffect(() => { loadLinks(); }, [connection.id]);

  const postLinks = links.filter(l => l.type === "post");
  const accountLink = links.find(l => l.type === "account");

  async function saveAccountUrl() {
    if (!accountUrl.trim()) return;
    setSaving(true);
    setError("");
    let dbError;
    if (accountLink) {
      const { error } = await supabase.schema("contentiq").from("manual_links")
        .update({ url: accountUrl.trim() }).eq("id", accountLink.id);
      dbError = error;
    } else {
      const { error } = await supabase.schema("contentiq").from("manual_links")
        .insert({ connection_id: connection.id, type: "account", url: accountUrl.trim(), title: meta.label });
      dbError = error;
    }
    if (dbError) {
      setError(dbError.message);
      setSaving(false);
      return;
    }
    await loadLinks();
    setSaving(false);
  }

  async function addPostLink() {
    if (!newPostUrl.trim() || postLinks.length >= 5) return;
    setSaving(true);
    setError("");
    const { error: dbError } = await supabase.schema("contentiq").from("manual_links")
      .insert({ connection_id: connection.id, type: "post", url: newPostUrl.trim(), title: null });
    if (dbError) {
      setError(dbError.message);
      setSaving(false);
      return;
    }
    setNewPostUrl("");
    await loadLinks();
    setSaving(false);
  }

  async function deleteLink(id: string) {
    setDeleting(id);
    setError("");
    const { error: dbError } = await supabase.schema("contentiq").from("manual_links").delete().eq("id", id);
    if (dbError) {
      setError(dbError.message);
      setDeleting(null);
      return;
    }
    await loadLinks();
    setDeleting(null);
  }

  if (loading) return null;

  return (
    <div style={{ marginTop: 16, padding: "16px", borderRadius: 12, background: "#0b1324", border: "1px solid #1e2e4d" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
        <Link2 size={14} /> Własne odnośniki strukturalne
      </div>
      
      {error && (
        <div style={{ marginBottom: 12, padding: "10px", borderRadius: 8, background: "#450a0a", border: "1px solid #991b1b", color: "#fca5a5", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>Główny URL profilu</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={accountUrl} onChange={e => setAccountUrl(e.target.value)}
            placeholder={meta.accountPlaceholder}
            style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${accountUrl ? meta.color + "60" : "#1e293b"}`, background: "#030712", color: "#f8fafc", fontSize: 12, outline: "none" }} />
          <button onClick={saveAccountUrl} disabled={saving || !accountUrl.trim()} className="btn"
            style={{ padding: "8px 14px", borderRadius: 8, background: meta.color, color: "#fff", border: "none", fontSize: 12, fontWeight: 600, opacity: saving || !accountUrl.trim() ? 0.5 : 1 }}>
            {accountLink ? "Aktualizuj" : "Zapisz"}
          </button>
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>Monitorowane posty (maks. 5)</label>
          <span style={{ fontSize: 11, fontWeight: 600, color: postLinks.length >= 5 ? "#ef4444" : "#64748b" }}>{postLinks.length}/5</span>
        </div>

        {postLinks.map(link => (
          <div key={link.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "8px 12px", borderRadius: 8, background: "#030712", border: "1px solid #1e293b" }}>
            <div style={{ flex: 1, fontSize: 12, color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {link.url}
            </div>
            <button onClick={() => deleteLink(link.id)} disabled={deleting === link.id} className="btn"
              style={{ padding: "4px 8px", borderRadius: 6, background: "transparent", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {deleting === link.id ? <RefreshCw size={12} className="spin" /> : <X size={12} />}
            </button>
          </div>
        ))}

        {postLinks.length < 5 && (
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newPostUrl} onChange={e => setNewPostUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addPostLink()}
              placeholder={meta.postPlaceholder}
              style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #1e293b", background: "#030712", color: "#f8fafc", fontSize: 12, outline: "none" }} />
            <button onClick={addPostLink} disabled={saving || !newPostUrl.trim()} className="btn"
              style={{ padding: "8px 14px", borderRadius: 8, background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, opacity: saving || !newPostUrl.trim() ? 0.5 : 1 }}>
              <Plus size={14} /> Dodaj
            </button>
          </div>
        )}

        {postLinks.length >= 5 && (
          <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
            <AlertCircle size={12} /> Limit 5 linków osiągnięty. Usuń jeden, aby dodać nowy.
          </div>
        )}
      </div>
    </div>
  );
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
  const [expanded, setExpanded] = useState<Platform | null>(null);
  const [blogUrl, setBlogUrl] = useState("");
  const [blogUser, setBlogUser] = useState("");
  const [blogPass, setBlogPass] = useState("");
  const [blogSaving, setBlogSaving] = useState(false);
  const [spotifyShowId, setSpotifyShowId] = useState("");
  const [spotifySaving, setSpotifySaving] = useState(false);
  const [metaPages, setMetaPages] = useState<MetaSelectablePage[]>([]);
  const [metaPlatform, setMetaPlatform] = useState<Platform | null>(null);
  const [metaSelecting, setMetaSelecting] = useState("");

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
      name: workspaceId.split("-").map((p: string) => p[0].toUpperCase() + p.slice(1)).join(" "),
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
      const { data } = await supabase.schema("contentiq").from("platform_connections")
        .select("*").eq("workspace_id", id).eq("connected", true);
      setConnections((data || []) as Connection[]);
      const spotify = (data || []).find((c: Connection) => c.platform === "spotify");
      if (spotify?.account_id && spotify.account_id !== "unknown") setSpotifyShowId(spotify.account_id);
    } catch (e) { showToast(String(e), false); }
    setLoading(false);
  }

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    const account = searchParams.get("account");
    const detail = searchParams.get("detail");
    const selectMetaPage = searchParams.get("select_meta_page") as Platform | null;
    if (connected) showToast(`✓ ${account || connected} podłączono pomyślnie`);
    if (error) showToast(detail || "Błąd autoryzacji — spróbuj ponownie", false);
    if (selectMetaPage === "facebook" || selectMetaPage === "instagram") {
      setMetaPlatform(selectMetaPage);
      fetch("/api/oauth/meta-page")
        .then((res) => res.json())
        .then((data) => {
          if (data?.error) throw new Error(data.error);
          setMetaPages(data.pages || []);
        })
        .catch((err) => showToast(err instanceof Error ? err.message : String(err), false));
    }
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
      showToast(data?.message || `✓ Pobrano dane z ${PLATFORM_META[conn.platform]?.label}`);
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
      const errors = Array.isArray(data?.results)
        ? data.results
            .filter((result: { error?: string }) => result.error)
            .map((result: { platform?: string; error?: string }) => `${result.platform}: ${result.error}`)
        : [];
      showToast(
        errors.length
          ? `${data?.message || "Synchronizacja zakończona z błędami"}: ${errors.join(" | ")}`
          : data?.message || "✓ Synchronizacja zakończona",
        !data?.failed
      );
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
    showToast(`${PLATFORM_META[conn.platform]?.label} odłączono`);
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
    const extracted = spotifyShowId.includes("/show/")
      ? spotifyShowId.split("/show/")[1].split("?")[0].split("/")[0]
      : spotifyShowId.trim();
    const { error } = await supabase.schema("contentiq").from("platform_connections")
      .update({ account_id: extracted }).eq("id", connId);
    if (error) { showToast(error.message, false); }
    else { showToast("✓ Show ID zapisane"); await load(); }
    setSpotifySaving(false);
  }

  async function selectMetaPage(pageId: string) {
    setMetaSelecting(pageId);
    try {
      const res = await fetch("/api/oauth/meta-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: pageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Nie udało się zapisać strony Meta");
      showToast(`✓ Wybrano stronę dla ${metaPlatform === "instagram" ? "Instagram" : "Facebook"}`);
      setMetaPages([]);
      setMetaPlatform(null);
      await load();
      window.history.replaceState(null, "", `/app/${workspaceId}/settings`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), false);
    }
    setMetaSelecting("");
  }

  function getConn(platform: Platform) {
    return connections.find(c => c.platform === platform);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#090d16", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#f8fafc" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .card{transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;}
        .card:hover{transform:translateY(-2px); border-color: rgba(255,255,255,0.15) !important; box-shadow:0 12px 30px rgba(0,0,0,0.5)}
        .btn{transition: all 0.15s ease; cursor:pointer; font-family:inherit; display: inline-flex; align-items: center; justify-content: center; gap: 6px;}
        .btn:hover{filter: brightness(1.15); opacity: 0.95;}
        .btn:active{transform:scale(.98)}
        input{outline:none; transition: border-color 0.15s ease;}
        input:focus{border-color:#3b82f6 !important; box-shadow: 0 0 0 1px #3b82f6;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fade{animation:fadeUp .4s cubic-bezier(0.16, 1, 0.3, 1) forwards}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spin{animation:spin .8s linear infinite;}
      `}</style>

      {toast && (
        <div style={{ position: "fixed", top: 24, right: 24, zIndex: 200, padding: "14px 20px", borderRadius: 12, background: toast.ok ? "#062f17" : "#450a0a", color: toast.ok ? "#4ade80" : "#fca5a5", fontSize: 13, fontWeight: 500, border: `1px solid ${toast.ok ? "#14532d" : "#7f1d1d"}`, boxShadow: "0 10px 40px rgba(0,0,0,0.6)", maxWidth: 400, display: "flex", alignItems: "center", gap: 10, cubicBezier: "linear" }}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <div style={{ lineHeight: 1.4 }}>{toast.msg}</div>
        </div>
      )}

      {metaPlatform && metaPages.length > 0 && (
        <div style={{ position: "fixed", inset: 0, zIndex: 190, background: "rgba(3,7,18,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "min(540px, 100%)", borderRadius: 16, background: "#0f172a", border: "1px solid #334155", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)", padding: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 }}>
              Konfiguracja Meta OAuth
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 10 }}>
              Wybierz powiązaną stronę Facebook
            </h2>
            <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5, marginBottom: 20 }}>
              Wskaż bezpośrednią stronę z konta. Dla profilu Instagram aplikacja automatycznie zintegruje powiązane z nią konto profesjonalne (Business Account).
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 300, overflowY: "auto", paddingRight: 4 }}>
              {metaPages.map((page) => (
                <button key={page.id} onClick={() => selectMetaPage(page.id)} disabled={!!metaSelecting} className="btn"
                  style={{ textAlign: "left", width: "100%", padding: "14px", borderRadius: 10, border: "1px solid #1e293b", background: "#070a13", color: "#f8fafc", flexDirection: "column", alignParagraph: "flex-start", gap: 2 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{page.name}</span>
                    {metaSelecting === page.id && <RefreshCw size={14} className="spin" style={{ color: "#3b82f6" }} />}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>ID: {page.id}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Górny pasek nawigacyjny - Czytelne rozróżnienie sekcji menu */}
      <div style={{ borderBottom: "1px solid #1e293b", background: "rgba(9,13,22,0.85)", backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href={`/app/${workspaceId}`} className="btn"
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #1e293b", background: "#131926", color: "#94a3b8", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>
              <ArrowLeft size={15} /> Panel główny
            </Link>
            <div style={{ width: 1, height: 24, background: "#1e293b" }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc", letterSpacing: "0.02em" }}>Ustawienia połączeń</div>
          </div>
          <button className="btn" onClick={syncAllNow} disabled={syncAll || loading || connections.length === 0}
            style={{ padding: "8px 16px", borderRadius: 8, background: "#3b82f6", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, opacity: syncAll || connections.length === 0 ? 0.5 : 1 }}>
            <RefreshCw size={14} className={syncAll ? "spin" : ""} />
            {syncAll ? "Synchronizowanie..." : "Odśwież wszystko"}
          </button>
        </div>
      </div>

      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* Nagłówek główny strony */}
        <div style={{ marginBottom: 40 }} className="fade">
          <div style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
            Zarządzanie mediami
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", color: "#f8fafc", marginBottom: 10 }}>
            Integracje z platformami
          </h1>
          <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6, maxWidth: 640 }}>
            Autoryzuj konta bezpośrednio za pomocą bezpiecznego protokołu OAuth. Możesz również manualnie wdrożyć adresy URL profili oraz do 5 dedykowanych publikacji dla precyzyjnej analityki.
          </p>
        </div>

        {/* Siatka integracji */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(450px, 1fr))", gap: 20 }}>
          {PLATFORMS.map((platform, idx) => {
            const meta = PLATFORM_META[platform];
            const connection = getConn(platform);
            const isConnected = !!connection;
            const isSyncing = syncing === connection?.id;
            const isDisconnecting = disconnecting === connection?.id;
            const isExpanded = expanded === platform;
            const PlatformIcon = meta.icon;

            return (
              <div key={platform} className="card fade" style={{ animationDelay: `${idx * 0.03}s`, background: "#111827", border: `1px solid ${isConnected ? "rgba(59,130,246,0.2)" : "#1f2937"}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ height: 4, background: isConnected ? meta.gradient : "#1f2937" }} />

                <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
                  
                  {/* Górny rząd karty: Nagłówek sekcji wewnętrznej */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: isConnected ? meta.color + "15" : "#1f2937", border: `1px solid ${isConnected ? meta.color + "30" : "#374151"}`, display: "flex", alignItems: "center", justifyContent: "center", color: isConnected ? meta.color : "#94a3b8" }}>
                        <PlatformIcon size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc" }}>{meta.label}</div>
                        {isConnected && (
                          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500, marginTop: 1, display: "flex", alignItems: "center", gap: 4 }}>
                            {connection.account_name}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Status badge */}
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: isConnected ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.08)", color: isConnected ? "#4ade80" : "#fbbf24", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {isConnected ? "Aktywne" : "Niepołączone"}
                    </span>
                  </div>

                  <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, marginBottom: 16 }}>{meta.desc}</p>

                  {/* Szczegóły synchronizacji danych */}
                  {isConnected && (
                    <div style={{ padding: "10px 12px", borderRadius: 10, background: "#070a13", border: "1px solid #1e293b", marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.02em" }}>Ostatnia synchronizacja</div>
                          <div style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 600, marginTop: 2 }}>{formatSync(connection.last_synced_at)}</div>
                        </div>
                        {isExpiring(connection.token_expires_at) && (
                          <span style={{ fontSize: 11, fontWeight: 500, color: "#fbbf24", background: "rgba(245,158,11,0.1)", padding: "4px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}>
                            <AlertCircle size={12} /> Autoryzacja wygasa
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Pola dodatkowe (Spotify/Blog) */}
                  {isConnected && platform === "spotify" && (
                    <div style={{ padding: "12px", borderRadius: 10, background: "#070a13", border: "1px solid #1e293b", marginBottom: 16 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>Identyfikator (Show ID) podcastu</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input value={spotifyShowId} onChange={e => setSpotifyShowId(e.target.value)}
                          placeholder="Wklej identyfikator Spotify Show ID"
                          style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #1e293b", background: "#030712", color: "#f8fafc", fontSize: 12 }} />
                        <button className="btn" onClick={() => saveSpotifyShowId(connection.id)} disabled={spotifySaving}
                          style={{ padding: "8px 14px", borderRadius: 8, background: "#1DB954", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, opacity: spotifySaving ? 0.6 : 1 }}>
                          {spotifySaving ? <RefreshCw size={14} className="spin" /> : "Zapisz"}
                        </button>
                      </div>
                    </div>
                  )}

                  {!isConnected && platform === "blog" && (
                    <div style={{ padding: "14px", borderRadius: 10, background: "#070a13", border: "1px solid #1e293b", marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#22C55E", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Uwierzytelnienie WordPress</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <input value={blogUrl} onChange={e => setBlogUrl(e.target.value)} placeholder="Adres główny (np. https://twojblog.pl)"
                          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #1e293b", background: "#030712", color: "#f8fafc", fontSize: 12 }} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <input value={blogUser} onChange={e => setBlogUser(e.target.value)} placeholder="Nazwa użytkownika"
                            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #1e293b", background: "#030712", color: "#f8fafc", fontSize: 12 }} />
                          <input type="password" value={blogPass} onChange={e => setBlogPass(e.target.value)} placeholder="Hasło aplikacji"
                            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #1e293b", background: "#030712", color: "#f8fafc", fontSize: 12 }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Przyciski operacyjne dolne */}
                  <div style={{ display: "flex", gap: 8, marginTop: "auto", marginBottom: isConnected ? 12 : 0 }}>
                    {isConnected ? (
                      <>
                        <button className="btn" onClick={() => syncOne(connection)} disabled={isSyncing}
                          style={{ flex: 1, padding: "10px", borderRadius: 8, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", color: "#3b82f6", fontSize: 13, fontWeight: 600, opacity: isSyncing ? 0.6 : 1 }}>
                          <RefreshCw size={14} className={isSyncing ? "spin" : ""} /> {isSyncing ? "Pobieranie..." : "Synchronizuj"}
                        </button>
                        <button className="btn" onClick={() => window.location.href = `/api/oauth/${platform}?workspace_id=${workspaceId}`} title="Zreautoryzuj profil"
                          style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #1e293b", background: "transparent", color: "#64748b" }}>
                          <ExternalLink size={14} />
                        </button>
                        <button className="btn" onClick={() => disconnect(connection)} disabled={isDisconnecting}
                          style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)", color: "#ef4444" }}>
                          {isDisconnecting ? <RefreshCw size={14} className="spin" /> : <X size={14} />}
                        </button>
                      </>
                    ) : (
                      <button className="btn"
                        onClick={() => { if (meta.type === "oauth") window.location.href = `/api/oauth/${platform}?workspace_id=${workspaceId}`; else saveBlog(); }}
                        disabled={platform === "blog" && blogSaving}
                        style={{ width: "100%", padding: "10px", borderRadius: 8, background: meta.color, color: "#fff", border: "none", fontSize: 13, fontWeight: 700, opacity: blogSaving ? 0.6 : 1 }}>
                        {platform === "blog" ? (blogSaving ? "Nawiązywanie połączenia..." : "Zintegruj ręcznie blog") : `Połącz z ${meta.label}`}
                      </button>
                    )}
                  </div>

                  {/* Rozwijany kontener linków ręcznych */}
                  {isConnected && (
                    <div style={{ marginTop: 4 }}>
                      <button className="btn" onClick={() => setExpanded(isExpanded ? null : platform)}
                        style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px dashed #1e293b", background: isExpanded ? "rgba(255,255,255,0.02)" : "transparent", color: "#64748b", fontSize: 12, fontWeight: 500, justifyContent: "center" }}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isExpanded ? "Ukryj panel odnośników" : "Zarządzaj wpisami i linkami profilu"}
                      </button>
                      {isExpanded && <ManualLinksPanel connection={connection} />}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Stopka */}
        <div style={{ marginTop: 64, paddingTop: 24, borderTop: "1px solid #1e293b", display: "flex", justifyContent: "center", gap: 32 }}>
          <a href="https://contentiq.anmcollective.fun/privacy" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#475569", textDecoration: "none", transition: "color 0.15s" }}>Polityka prywatności</a>
          <a href="https://contentiq.anmcollective.fun/terms" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#475569", textDecoration: "none", transition: "color 0.15s" }}>Regulamin systemu</a>
        </div>
      </main>
    </div>
  );
}