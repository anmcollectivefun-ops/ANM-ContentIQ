"use client";

// app/app/[id]/settings/integrations/page.tsx
// Strona Integracje — użytkownik sam podpina swoje konta.
// Ty jako właściciel testujesz dokładnie tak samo jak każdy inny użytkownik.

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── TYPY ────────────────────────────────────────────────────────────────────

type Platform = "instagram" | "facebook" | "linkedin" | "tiktok" | "youtube" | "blog";

interface Connection {
  id: string;
  platform: Platform;
  account_name: string;
  account_id: string;
  connected: boolean;
  last_synced_at: string | null;
  token_expires_at: string | null;
}

interface PlatformInfo {
  id: Platform;
  label: string;
  color: string;
  icon: string;
  description: string;
  type: "oauth" | "manual"; // oauth = przycisk Połącz, manual = formularz z polami
}

const PLATFORMS: PlatformInfo[] = [
  {
    id: "instagram",
    label: "Instagram",
    color: "#E1306C",
    icon: "ti-brand-instagram",
    description: "Reels, posty, karuzele — wyniki i publikowanie",
    type: "oauth",
  },
  {
    id: "facebook",
    label: "Facebook",
    color: "#1877F2",
    icon: "ti-brand-facebook",
    description: "Strony firmowe, posty, statystyki",
    type: "oauth",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    color: "#0A66C2",
    icon: "ti-brand-linkedin",
    description: "Profil i strony firmowe — posty eksperckie",
    type: "oauth",
  },
  {
    id: "tiktok",
    label: "TikTok",
    color: "#000000",
    icon: "ti-brand-tiktok",
    description: "Filmy, statystyki, wyniki",
    type: "oauth",
  },
  {
    id: "youtube",
    label: "YouTube",
    color: "#FF0000",
    icon: "ti-brand-youtube",
    description: "Kanał, filmy, Shorts, Analytics",
    type: "oauth",
  },
  {
    id: "blog",
    label: "Blog / WordPress",
    color: "#22C55E",
    icon: "ti-world",
    description: "Artykuły, statystyki, publikowanie",
    type: "manual",
  },
];

// ─── BLOG MANUAL FORM ────────────────────────────────────────────────────────

function BlogForm({
  workspaceId,
  onSaved,
  css,
}: {
  workspaceId: string;
  onSaved: () => void;
  css: Record<string, string>;
}) {
  const [url, setUrl] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!url) { setError("Wpisz adres bloga"); return; }
    setSaving(true);
    setError("");

    // Test połączenia — sprawdź czy REST API odpowiada
    try {
      const testRes = await fetch("/api/connections/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          url,
          username: user,
          password: pass,
        }),
      });
      if (!testRes.ok) throw new Error(`Status ${testRes.status}`);
    } catch (e) {
      setError(`Nie można połączyć się z blogiem: ${e}`);
      setSaving(false);
      return;
    }

    onSaved();
    setSaving(false);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 8,
    border: `1px solid ${css.border}`,
    background: css.bg,
    color: css.text,
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    marginTop: 4,
  };

  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <div>
        <label style={{ fontSize: 11, color: css.muted }}>URL bloga *</label>
        <input style={inputStyle} placeholder="https://twojblog.pl" value={url} onChange={e => setUrl(e.target.value)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, color: css.muted }}>Login WordPress (opcjonalnie)</label>
          <input style={inputStyle} placeholder="admin" value={user} onChange={e => setUser(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: css.muted }}>Application Password (opcjonalnie)</label>
          <input style={inputStyle} type="password" placeholder="xxxx xxxx xxxx xxxx" value={pass} onChange={e => setPass(e.target.value)} />
        </div>
      </div>
      {error && <p style={{ fontSize: 11, color: "#ef4444" }}>{error}</p>}
      <button onClick={save} disabled={saving} style={{ padding: "8px 18px", borderRadius: 8, background: "#22C55E", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "inherit", alignSelf: "flex-start" }}>
        {saving ? "Łączenie..." : "Połącz blog"}
      </button>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const workspaceId = Array.isArray(params.id) ? params.id[0] : params.id as string;

  const supabase = createClient();

  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Platform | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const dark = true; // podłącz do globalnego stanu motywu jeśli masz
  const css = dark
    ? { bg: "#080c14", surface: "#0f1520", text: "#eef2ff", muted: "#3d4966", border: "#151e30" }
    : { bg: "#f8f7f4", surface: "#ffffff", text: "#0f172a", muted: "#94a3b8", border: "#e8e8e4" };

  // Powiadomienie po powrocie z OAuth
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    const account = searchParams.get("account");

    if (connected) {
      showToast(`✓ ${account || connected} podłączono pomyślnie`, "ok");
    }
    if (error) {
      const msgs: Record<string, string> = {
        oauth_denied: "Autoryzacja odrzucona",
        token_exchange: "Błąd wymiany tokenu — spróbuj ponownie",
        invalid_state: "Błąd bezpieczeństwa — spróbuj ponownie",
      };
      showToast(msgs[error] || `Błąd: ${error}`, "err");
    }
  }, [searchParams]);

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  // Pobierz podłączone konta z Supabase
  async function loadConnections() {
    setLoading(true);
    const { data } = await supabase
      .from("platform_connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("connected", true);
    setConnections(data || []);
    setLoading(false);
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadConnections();
    });
  }, [workspaceId]);

  // Usuń połączenie
  async function disconnect(connection: Connection) {
    setDisconnecting(connection.id);
    await supabase
      .from("platform_connections")
      .update({ connected: false, access_token: null, refresh_token: null })
      .eq("id", connection.id);
    await loadConnections();
    setDisconnecting(null);
    showToast(`${connection.account_name} odłączono`, "ok");
  }

  // Ręczna synchronizacja (trigger do Supabase Edge Function lub API route)
  async function syncNow(connection: Connection) {
    setSyncing(connection.id);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: connection.id, platform: connection.platform }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Błąd synchronizacji");
      }
      showToast(`Synchronizacja ${connection.platform} zakończona`, "ok");
      await loadConnections();
    } catch (err) {
      showToast("Błąd synchronizacji", "err");
    } finally {
      setSyncing(null);
    }
  }

  // Sprawdź czy token wygasa wkrótce
  function isExpiringSoon(expiresAt: string | null): boolean {
    if (!expiresAt) return false;
    const daysLeft = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft < 7;
  }

  // Połączenia per platforma
  function getConnections(platformId: Platform): Connection[] {
    return connections.filter(c => c.platform === platformId);
  }

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", color: css.text, maxWidth: 760, padding: "0 0 80px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
        * { box-sizing: border-box; }
        .pcard { transition: border-color 0.15s; }
        .pcard:hover { border-color: ${dark ? "#2d3a52" : "#c8c8c0"} !important; }
        .conn-btn { transition: opacity 0.15s; }
        .conn-btn:hover { opacity: 0.8; }
        input:focus { border-color: #818cf8 !important; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 100, padding: "10px 18px", borderRadius: 10, background: toast.type === "ok" ? "#052e16" : "#450a0a", color: toast.type === "ok" ? "#22c55e" : "#ef4444", fontSize: 13, border: `1px solid ${toast.type === "ok" ? "#166534" : "#991b1b"}`, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
          {toast.msg}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 500, color: css.text, marginBottom: 6 }}>Podłączone platformy</h2>
        <p style={{ fontSize: 13, color: css.muted, lineHeight: 1.6 }}>
          Połącz swoje konta — aplikacja zacznie automatycznie pobierać wyniki i analizować content.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {PLATFORMS.map((platform) => {
          const platformConnections = getConnections(platform.id);
          const isConnected = platformConnections.length > 0;
          const isOpen = expanded === platform.id;

          return (
            <div key={platform.id} className="pcard" style={{ borderRadius: 14, border: `1px solid ${isConnected ? platform.color + "40" : css.border}`, background: css.surface, overflow: "hidden" }}>

              {/* Header */}
              <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                onClick={() => setExpanded(isOpen ? null : platform.id)}>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Kolorowy pasek po lewej */}
                  <div style={{ width: 3, height: 36, borderRadius: 2, background: isConnected ? platform.color : css.border, flexShrink: 0 }} />

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: css.text }}>{platform.label}</span>
                      {isConnected && (
                        <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: platform.color + "20", color: platform.color }}>
                          {platformConnections.length} konto{platformConnections.length > 1 ? "a" : ""}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: css.muted, marginTop: 2 }}>{platform.description}</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {isConnected ? (
                    <span style={{ fontSize: 11, color: css.muted }}>
                      {platformConnections[0]?.account_name}
                    </span>
                  ) : (
                    // Przycisk Połącz — od razu startuje OAuth lub otwiera formularz
                    <button className="conn-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (platform.type === "oauth") {
                          // Przekieruj do OAuth — z workspace_id w state
                          window.location.href = `/api/oauth/${platform.id}?workspace_id=${workspaceId}`;
                        } else {
                          setExpanded(platform.id);
                        }
                      }}
                      style={{ padding: "7px 16px", borderRadius: 8, background: platform.color, color: "#fff", border: "none", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                      + Połącz
                    </button>
                  )}
                  <span style={{ fontSize: 12, color: css.muted, userSelect: "none" }}>
                    {isOpen ? "▲" : "▼"}
                  </span>
                </div>
              </div>

              {/* Expanded panel */}
              {isOpen && (
                <div style={{ borderTop: `1px solid ${css.border}`, padding: "14px 18px" }}>

                  {/* Podłączone konta */}
                  {platformConnections.length > 0 && (
                    <div style={{ marginBottom: platform.type === "oauth" ? 12 : 0 }}>
                      {platformConnections.map((conn) => (
                        <div key={conn.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: css.bg, border: `1px solid ${css.border}`, marginBottom: 6 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: css.text }}>{conn.account_name}</div>
                            <div style={{ fontSize: 11, color: css.muted, marginTop: 2 }}>
                              {conn.last_synced_at
                                ? `Ostatnia sync: ${new Date(conn.last_synced_at).toLocaleString("pl")}`
                                : "Nie zsynchronizowano"}
                              {isExpiringSoon(conn.token_expires_at) && (
                                <span style={{ color: "#f59e0b", marginLeft: 8 }}>⚠ Token wygasa wkrótce</span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="conn-btn"
                              onClick={() => syncNow(conn)}
                              disabled={syncing === conn.id}
                              style={{ padding: "5px 12px", borderRadius: 7, background: "transparent", border: `1px solid ${css.border}`, color: css.muted, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                              {syncing === conn.id ? "Sync..." : "Sync teraz"}
                            </button>
                            <button className="conn-btn"
                              onClick={() => disconnect(conn)}
                              disabled={disconnecting === conn.id}
                              style={{ padding: "5px 12px", borderRadius: 7, background: "transparent", border: "1px solid #ef444440", color: "#ef4444", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                              {disconnecting === conn.id ? "..." : "Odłącz"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dodaj kolejne konto OAuth */}
                  {platform.type === "oauth" && (
                    <button className="conn-btn"
                      onClick={() => { window.location.href = `/api/oauth/${platform.id}?workspace_id=${workspaceId}`; }}
                      style={{ padding: "7px 16px", borderRadius: 8, background: "transparent", border: `1.5px dashed ${platform.color}60`, color: platform.color, fontSize: 12, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
                      + Dodaj {isConnected ? "kolejne" : ""} konto {platform.label}
                    </button>
                  )}

                  {/* Manual form dla bloga */}
                  {platform.type === "manual" && (
                    <BlogForm
                      workspaceId={workspaceId}
                      onSaved={() => { loadConnections(); showToast("Blog podłączony", "ok"); }}
                      css={css}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* .env reminder (tylko dla właściciela / dev) */}
      {process.env.NODE_ENV === "development" && (
        <div style={{ marginTop: 32, padding: "14px 16px", borderRadius: 12, border: `1px dashed ${css.border}`, background: css.surface }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: css.muted, marginBottom: 8 }}>DEV — wymagane zmienne .env.local</p>
          {[
            "META_APP_ID", "META_APP_SECRET", "META_REDIRECT_URI",
            "LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET", "LINKEDIN_REDIRECT_URI",
            "TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_REDIRECT_URI",
            "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI",
          ].map(key => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: `1px solid ${css.border}` }}>
              <code style={{ fontSize: 11, color: css.text }}>{key}</code>
              <span style={{ fontSize: 11, color: process.env[key] ? "#22c55e" : "#ef4444" }}>
                {process.env[key] ? "✓ ustawiony" : "✗ brak"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
