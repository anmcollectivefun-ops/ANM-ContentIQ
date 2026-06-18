"use client";

// app/[id]/settings/page.tsx
// ANM ContentIQ — Integracje / social media / linki ręczne

import { useEffect, useState, type CSSProperties } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getLang } from "@/lib/contentiq-app-copy";
import SupportWidget from "@/app/components/SupportWidget";
import {
  AlertCircle,
  ArrowLeft,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Globe,
  Link2,
  MessageCircle,
  Music,
  Plus,
  Radio,
  RefreshCw,
  Video,
  X,
} from "lucide-react";

type Platform =
  | "instagram"
  | "facebook"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "blog"
  | "spotify";

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

type ThemeVars = {
  bg: string;
  bgSoft: string;
  surface: string;
  surfaceSoft: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
  accentBorder: string;
  heading: string;
  aiBg: string;
  aiBgSoft: string;
  aiBorder: string;
  aiText: string;
  aiGlow: string;
  dangerBg: string;
  dangerBorder: string;
  dangerText: string;
  successBg: string;
  successBorder: string;
  successText: string;
  warningBg: string;
  warningBorder: string;
  warningText: string;
};

const css: ThemeVars = {
  bg: "#1A2233",
  bgSoft: "#121A2A",
  surface: "#050505",
  surfaceSoft: "#0B0B0D",
  text: "#FFFFFF",
  muted: "#C9CED8",
  border: "rgba(255,255,255,0.10)",
  accent: "#8E443D",
  accentSoft: "rgba(142, 68, 61, 0.18)",
  accentBorder: "rgba(142, 68, 61, 0.55)",
  heading: "#8E443D",
  aiBg: "rgba(109, 40, 217, 0.16)",
  aiBgSoft: "rgba(147, 51, 234, 0.12)",
  aiBorder: "rgba(192, 132, 252, 0.55)",
  aiText: "#D8B4FE",
  aiGlow: "0 0 28px rgba(168, 85, 247, 0.26)",
  dangerBg: "#ef444414",
  dangerBorder: "#ef444440",
  dangerText: "#ef4444",
  successBg: "#052e16",
  successBorder: "#166534",
  successText: "#22c55e",
  warningBg: "rgba(245,158,11,0.12)",
  warningBorder: "rgba(245,158,11,0.32)",
  warningText: "#f59e0b",
};

const PLATFORM_META = {
  instagram: {
    label: "Instagram",
    color: "#E1306C",
    gradient: "linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)",
    desc: "Reels, posty, karuzele — zasięgi, wyświetlenia, zapisy.",
    icon: Camera,
    type: "oauth" as const,
    accountPlaceholder: "https://instagram.com/twojekonto",
    postPlaceholder: "https://instagram.com/p/ABC123",
  },
  facebook: {
    label: "Facebook",
    color: "#1877F2",
    gradient: "linear-gradient(135deg,#1877F2,#0d5fd8)",
    desc: "Strony firmowe, posty, statystyki i zasięg organiczny.",
    icon: MessageCircle,
    type: "oauth" as const,
    accountPlaceholder: "https://facebook.com/twojastrona",
    postPlaceholder: "https://facebook.com/twojastrona/posts/123",
  },
  linkedin: {
    label: "LinkedIn",
    color: "#0A66C2",
    gradient: "linear-gradient(135deg,#0A66C2,#084fa0)",
    desc: "Profil i strony firmowe — posty eksperckie, B2B leady.",
    icon: BriefcaseBusiness,
    type: "oauth" as const,
    accountPlaceholder: "https://linkedin.com/company/twojafirma",
    postPlaceholder: "https://linkedin.com/posts/activity-123",
  },
  tiktok: {
    label: "TikTok",
    color: "#FFFFFF",
    gradient: "linear-gradient(135deg,#010101,#69C9D0,#EE1D52)",
    desc: "Filmy, statystyki wyświetleń, completion rate i wyniki.",
    icon: Radio,
    type: "oauth" as const,
    accountPlaceholder: "https://tiktok.com/@twojekonto",
    postPlaceholder: "https://tiktok.com/@konto/video/123",
  },
  youtube: {
    label: "YouTube",
    color: "#FF0033",
    gradient: "linear-gradient(135deg,#FF0033,#cc0000)",
    desc: "Kanał, filmy, Shorts — wyświetlenia, retencja, kliknięcia.",
    icon: Video,
    type: "oauth" as const,
    accountPlaceholder: "https://youtube.com/@twojkanal",
    postPlaceholder: "https://youtube.com/watch?v=ABC123",
  },
  spotify: {
    label: "Spotify",
    color: "#1DB954",
    gradient: "linear-gradient(135deg,#1DB954,#158a3e)",
    desc: "Podcasty i odcinki: tytuły, opisy, daty publikacji, linki i okładki.",
    icon: Music,
    type: "manual" as const,
    accountPlaceholder: "https://open.spotify.com/show/TWOJEID",
    postPlaceholder: "https://open.spotify.com/episode/ABC123",
  },
  blog: {
    label: "Blog / WordPress",
    color: "#22C55E",
    gradient: "linear-gradient(135deg,#22C55E,#16a34a)",
    desc: "Artykuły, SEO, czas na stronie i konwersje organiczne.",
    icon: Globe,
    type: "manual" as const,
    accountPlaceholder: "https://twojblog.pl",
    postPlaceholder: "https://twojblog.pl/artykul/tytul",
  },
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

function SectionLabel({
  children,
  color = css.accent,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      style={{
        color,
        fontFamily: "var(--font-label)",
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: ".12em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

function cardStyle(extra?: CSSProperties): CSSProperties {
  return {
    background: css.surface,
    border: `1px solid ${css.border}`,
    borderRadius: 22,
    boxShadow: "0 18px 44px rgba(0,0,0,0.22)",
    ...extra,
  };
}

function inputStyle(accent?: string): CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${accent ? `${accent}55` : css.border}`,
    background: css.surfaceSoft,
    color: css.text,
    fontSize: 12,
    fontFamily: "var(--font-body)",
    outline: "none",
  };
}

function actionButtonStyle({
  background,
  color,
  border,
  disabled,
}: {
  background: string;
  color: string;
  border?: string;
  disabled?: boolean;
}): CSSProperties {
  return {
    borderRadius: 13,
    background,
    color,
    border: border || "none",
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    fontFamily: "var(--font-body)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  };
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
    const { data, error: loadError } = await supabase
      .schema("contentiq")
      .from("manual_links")
      .select("*")
      .eq("connection_id", connection.id)
      .order("created_at");

    if (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }

    const all = (data || []) as ManualLink[];
    setLinks(all);

    const acc = all.find((link) => link.type === "account");
    setAccountUrl(acc?.url || "");
    setError("");
    setLoading(false);
  }

  useEffect(() => {
    void loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.id]);

  const postLinks = links.filter((link) => link.type === "post");
  const accountLink = links.find((link) => link.type === "account");

  async function saveAccountUrl() {
    if (!accountUrl.trim()) return;

    setSaving(true);
    setError("");

    let dbError;

    if (accountLink) {
      const { error } = await supabase
        .schema("contentiq")
        .from("manual_links")
        .update({ url: accountUrl.trim() })
        .eq("id", accountLink.id);

      dbError = error;
    } else {
      const { error } = await supabase
        .schema("contentiq")
        .from("manual_links")
        .insert({
          connection_id: connection.id,
          type: "account",
          url: accountUrl.trim(),
          title: meta.label,
        });

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

    const { error: dbError } = await supabase
      .schema("contentiq")
      .from("manual_links")
      .insert({
        connection_id: connection.id,
        type: "post",
        url: newPostUrl.trim(),
        title: null,
      });

    if (dbError) {
      setError(dbError.message);
      setSaving(false);
      return;
    }

    setNewPostUrl("");
    await loadLinks();
    setSaving(false);
  }

  async function deleteLink(link: ManualLink) {
    const confirmed = window.confirm(
      `Czy na pewno chcesz usunąć link „${link.title || link.url}”?`
    );
    if (!confirmed) return;

    setDeleting(link.id);
    setError("");

    const { error: dbError } = await supabase
      .schema("contentiq")
      .from("manual_links")
      .delete()
      .eq("id", link.id);

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
    <div
      style={{
        marginTop: 14,
        padding: 15,
        borderRadius: 18,
        background: css.surfaceSoft,
        border: `1px solid ${css.border}`,
      }}
    >
      <div
        style={{
          color: meta.color,
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 12,
        }}
      >
        <Link2 size={14} />
        <SectionLabel color={meta.color}>Linki do profilu i postów</SectionLabel>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 12,
            padding: 11,
            borderRadius: 12,
            background: css.dangerBg,
            border: `1px solid ${css.dangerBorder}`,
            color: css.dangerText,
            fontSize: 12,
            lineHeight: 1.55,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div style={{ marginBottom: 13 }}>
        <div style={{ fontSize: 11, color: css.muted, marginBottom: 7 }}>
          Link do konta / profilu
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={accountUrl}
            onChange={(event) => setAccountUrl(event.target.value)}
            placeholder={meta.accountPlaceholder}
            style={{ ...inputStyle(accountUrl ? meta.color : undefined), flex: 1 }}
          />

          <button
            type="button"
            onClick={saveAccountUrl}
            disabled={saving || !accountUrl.trim()}
            style={actionButtonStyle({
              background: meta.color,
              color: connection.platform === "tiktok" ? "#050505" : "#fff",
              disabled: saving || !accountUrl.trim(),
            })}
          >
            {accountLink ? "Aktualizuj" : "Zapisz"}
          </button>
        </div>
      </div>

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 7,
          }}
        >
          <div style={{ fontSize: 11, color: css.muted }}>
            Linki do postów jako kontekst AI
          </div>

          <div
            style={{
              fontSize: 10,
              color: postLinks.length >= 5 ? css.dangerText : css.muted,
              fontWeight: 900,
            }}
          >
            {postLinks.length}/5
          </div>
        </div>

        {postLinks.map((link) => (
          <div
            key={link.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 7,
              padding: "8px 10px",
              borderRadius: 12,
              background: css.surface,
              border: `1px solid ${css.border}`,
            }}
          >
            <div
              style={{
                flex: 1,
                fontSize: 11,
                color: css.muted,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {link.url}
            </div>

            <button
              type="button"
              onClick={() => deleteLink(link)}
              disabled={deleting === link.id}
              style={actionButtonStyle({
                background: "transparent",
                border: `1px solid ${css.dangerBorder}`,
                color: css.dangerText,
                disabled: deleting === link.id,
              })}
            >
              {deleting === link.id ? (
                <RefreshCw size={12} className="spin" />
              ) : (
                <X size={12} />
              )}
            </button>
          </div>
        ))}

        {postLinks.length < 5 && (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={newPostUrl}
              onChange={(event) => setNewPostUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void addPostLink();
              }}
              placeholder={meta.postPlaceholder}
              style={{ ...inputStyle(), flex: 1 }}
            />

            <button
              type="button"
              onClick={addPostLink}
              disabled={saving || !newPostUrl.trim()}
              style={actionButtonStyle({
                background: css.accentSoft,
                color: css.accent,
                border: `1px solid ${css.accentBorder}`,
                disabled: saving || !newPostUrl.trim(),
              })}
            >
              <Plus size={14} />
              Dodaj
            </button>
          </div>
        )}

        {postLinks.length >= 5 && (
          <div
            style={{
              fontSize: 11,
              color: css.warningText,
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <AlertCircle size={12} />
            Limit 5 linków osiągnięty. Usuń jeden, żeby dodać nowy.
          </div>
        )}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = getLang(searchParams.get("lang"));
  const text = (polish: string, english: string) => (lang === "pl" ? polish : english);
  const workspaceId = Array.isArray(params.id) ? params.id[0] : (params.id as string);
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
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error(text("Brak sesji", "No active session"));

    const { data: ownBySlug } = await supabase
      .schema("contentiq")
      .from("workspaces")
      .select("id, slug")
      .eq("slug", workspaceId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (ownBySlug?.id) return ownBySlug.id as string;

    const { data: ownWorkspace } = await supabase
      .schema("contentiq")
      .from("workspaces")
      .select("id, slug")
      .eq("user_id", auth.user.id)
      .limit(1)
      .maybeSingle();

    if (ownWorkspace?.id) {
      const ownSlug = (ownWorkspace.slug as string) || workspaceId;
      if (ownSlug !== workspaceId) {
        const query = searchParams.toString();
        router.replace(`/app/${ownSlug}/settings${query ? `?${query}` : ""}`);
      }
      return ownWorkspace.id as string;
    }

    const uniqueSlug =
      workspaceId === "anm-collective"
        ? `anm-collective-${auth.user.id.slice(0, 8)}`
        : workspaceId;

    const { data: cr, error } = await supabase
      .schema("contentiq")
      .from("workspaces")
      .insert({
        user_id: auth.user.id,
        name: workspaceId
          .split("-")
          .map((p: string) => p[0].toUpperCase() + p.slice(1))
          .join(" "),
        type: "Firma",
        slug: uniqueSlug,
      })
      .select("id, slug")
      .single();

    if (error || !cr?.id) throw new Error(error?.message || "Błąd workspace");
    if (uniqueSlug !== workspaceId) {
      const query = searchParams.toString();
      router.replace(`/app/${uniqueSlug}/settings${query ? `?${query}` : ""}`);
    }
    return cr.id as string;
  }

  async function load() {
    setLoading(true);

    try {
      const id = await getOrCreateWs();
      setWsDbId(id);

      const { data } = await supabase
        .schema("contentiq")
        .from("platform_connections")
        .select("*")
        .eq("workspace_id", id)
        .eq("connected", true);

      setConnections((data || []) as Connection[]);

      const spotify = (data || []).find(
        (connection: Connection) => connection.platform === "spotify"
      );

      if (/^[A-Za-z0-9]{22}$/.test(spotify?.account_id || "")) {
        setSpotifyShowId(spotify.account_id);
      } else {
        setSpotifyShowId("");
      }

    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), false);
    }

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
        .catch((err) =>
          showToast(err instanceof Error ? err.message : String(err), false)
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function syncOne(conn: Connection) {
    setSyncing(conn.id);

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: conn.id, platform: conn.platform }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Błąd sync");

      showToast(data?.message || `✓ Pobrano dane z ${PLATFORM_META[conn.platform]?.label}`);
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), false);
    }

    setSyncing(null);
  }

  async function syncAllNow() {
    if (!wsDbId) return;

    setSyncAll(true);

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: wsDbId, all: true }),
      });

      const data = await res.json();

      const errors = Array.isArray(data?.results)
        ? data.results
            .filter((result: { error?: string }) => result.error)
            .map(
              (result: { platform?: string; error?: string }) =>
                `${result.platform}: ${result.error}`
            )
        : [];

      showToast(
        errors.length
          ? `${data?.message || "Synchronizacja zakończona z błędami"}: ${errors.join(" | ")}`
          : data?.message || "✓ Synchronizacja zakończona",
        !data?.failed
      );

      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), false);
    }

    setSyncAll(false);
  }

  async function disconnect(conn: Connection) {
    setDisconnecting(conn.id);

    await supabase
      .schema("contentiq")
      .from("platform_connections")
      .update({ connected: false, access_token: null, refresh_token: null })
      .eq("id", conn.id);

    await load();
    setDisconnecting(null);
    showToast(`${PLATFORM_META[conn.platform]?.label} odłączono`);
  }

  async function saveBlog() {
    if (!blogUrl) {
      showToast("Wpisz adres bloga", false);
      return;
    }

    setBlogSaving(true);

    try {
      const res = await fetch("/api/connections/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: wsDbId,
          url: blogUrl,
          username: blogUser,
          password: blogPass,
        }),
      });

      if (!res.ok) throw new Error(`Status ${res.status}`);

      showToast("✓ Blog podłączony");
      setBlogUrl("");
      setBlogUser("");
      setBlogPass("");
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), false);
    }

    setBlogSaving(false);
  }

  async function saveSpotifyShowId(connId?: string) {
    if (!spotifyShowId) {
      showToast("Wpisz Show ID podcastu", false);
      return;
    }

    setSpotifySaving(true);

    try {
      const response = await fetch("/api/connections/spotify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          connection_id: connId || undefined,
          show: spotifyShowId,
        }),
      });
      const data = await response.json();

      if (!response.ok || data?.error) {
        throw new Error(data?.error || "Nie udało się zapisać podcastu Spotify.");
      }

      showToast(`✓ Wybrano podcast: ${data.show?.name || "Spotify"}`);
      if (data.connectionId) {
        const syncResponse = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connection_id: data.connectionId,
            platform: "spotify",
          }),
        });
        const syncData = await syncResponse.json();
        if (!syncResponse.ok || syncData?.error) {
          throw new Error(syncData?.error || "Podcast zapisano, ale import odcinków nie powiódł się.");
        }
      }
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), false);
    }

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

      showToast(
        `✓ Wybrano stronę dla ${metaPlatform === "instagram" ? "Instagram" : "Facebook"}`
      );

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
    return connections.find((connection) => connection.platform === platform);
  }

  function hasValidSpotifyShow(connection?: Connection) {
    return Boolean(
      connection &&
        connection.platform === "spotify" &&
        /^[A-Za-z0-9]{22}$/.test(connection.account_id || "")
    );
  }

  const connectedCount = connections.filter(
    (connection) =>
      connection.platform !== "spotify" || hasValidSpotifyShow(connection)
  ).length;
  const expiringCount = connections.filter((connection) =>
    isExpiring(connection.token_expires_at)
  ).length;
  const readyToSync = connections.length > 0 && !loading;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(circle at top left, ${css.accentSoft}, transparent 34%), ${css.bg}`,
        fontFamily: "var(--font-body), system-ui, sans-serif",
        color: css.text,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700;800;900&family=Playfair+Display:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .card {
          transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
        }

        .card:hover {
          transform: translateY(-2px);
          border-color: ${css.accentBorder} !important;
          box-shadow: 0 22px 54px rgba(0,0,0,.36);
        }

        .btn {
          transition: all .15s ease;
          cursor: pointer;
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }

        .btn:hover {
          filter: brightness(1.08);
          opacity: .95;
        }

        .btn:active {
          transform: scale(.98);
        }

        input {
          outline: none;
          font-family: inherit;
          transition: border-color .15s ease, box-shadow .15s ease;
        }

        input:focus {
          border-color: ${css.accentBorder} !important;
          box-shadow: 0 0 0 1px ${css.accentBorder};
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .fade {
          animation: fadeUp .4s cubic-bezier(.16,1,.3,1) forwards;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .spin {
          animation: spin .8s linear infinite;
          display: inline-block;
        }

        @media(max-width: 980px) {
          .integrations-grid,
          .integrations-stats {
            grid-template-columns: 1fr !important;
          }

          .integrations-topbar-inner {
            height: auto !important;
            padding-top: 14px !important;
            padding-bottom: 14px !important;
            align-items: flex-start !important;
            flex-direction: column !important;
          }

          .integrations-top-actions {
            width: 100%;
            flex-wrap: wrap;
          }

          .integrations-hero {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 200,
            padding: "14px 18px",
            borderRadius: 14,
            background: toast.ok ? css.successBg : css.dangerBg,
            color: toast.ok ? css.successText : css.dangerText,
            fontSize: 13,
            fontWeight: 800,
            border: `1px solid ${toast.ok ? css.successBorder : css.dangerBorder}`,
            boxShadow: "0 16px 46px rgba(0,0,0,.46)",
            maxWidth: 480,
            lineHeight: 1.45,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <div>{toast.msg}</div>
        </div>
      )}

      {metaPlatform && metaPages.length > 0 && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 190,
            background: "rgba(0,0,0,.76)",
            backdropFilter: "blur(9px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              width: "min(560px, 100%)",
              borderRadius: 24,
              background: css.surface,
              border: `1px solid ${css.aiBorder}`,
              boxShadow: css.aiGlow,
              padding: 24,
            }}
          >
            <SectionLabel color={css.aiText}>Konfiguracja Meta OAuth</SectionLabel>

            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 28,
                lineHeight: 1.05,
                fontWeight: 500,
                color: css.heading,
                margin: "8px 0 10px",
              }}
            >
              Wybierz powiązaną stronę Facebook
            </h2>

            <p
              style={{
                fontSize: 13,
                color: css.muted,
                lineHeight: 1.65,
                marginBottom: 18,
              }}
            >
              Wskaż konkretną stronę zwróconą przez /me/accounts. Dla Instagrama
              aplikacja automatycznie pobierze konto profesjonalne podpięte do tej
              strony.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                maxHeight: 320,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {metaPages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => selectMetaPage(page.id)}
                  disabled={!!metaSelecting}
                  className="btn"
                  style={{
                    textAlign: "left",
                    width: "100%",
                    padding: 14,
                    borderRadius: 15,
                    border: `1px solid ${css.border}`,
                    background: css.surfaceSoft,
                    color: css.text,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    opacity: metaSelecting && metaSelecting !== page.id ? 0.5 : 1,
                    flexDirection: "column",
                    alignItems: "stretch",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      width: "100%",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 900 }}>{page.name}</span>
                    {metaSelecting === page.id && (
                      <RefreshCw size={14} className="spin" style={{ color: css.aiText }} />
                    )}
                  </div>

                  <div style={{ fontSize: 11, color: css.muted }}>Page ID: {page.id}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          borderBottom: `1px solid ${css.border}`,
          background: "rgba(26,34,51,.88)",
          backdropFilter: "blur(16px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: "0 14px 38px rgba(0,0,0,.22)",
        }}
      >
        <div
          className="integrations-topbar-inner"
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "0 24px",
            height: 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <Link
              href={`/app/${workspaceId}?lang=${lang}`}
              className="btn"
              style={{
                padding: "10px 14px",
                borderRadius: 14,
                border: `1px solid ${css.border}`,
                background: css.surface,
                color: css.muted,
                fontSize: 12,
                textDecoration: "none",
                fontWeight: 900,
              }}
            >
              <ArrowLeft size={15} />
              {text("Panel główny", "Main dashboard")}
            </Link>

            <div style={{ width: 1, height: 26, background: css.border }} />

            <div>
              <div
                style={{
                  color: css.heading,
                  fontFamily: "var(--font-heading)",
                  fontSize: 22,
                  lineHeight: 1,
                  fontWeight: 500,
                }}
              >
                {text("Integracje", "Integrations")}
              </div>

              <div
                style={{
                  color: css.muted,
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: ".14em",
                  marginTop: 5,
                }}
              >
                {text("Social media · blog · podcasty", "Social media · blog · podcasts")}
              </div>
            </div>
          </div>

          <div className="integrations-top-actions" style={{ display: "flex", gap: 9 }}>
            <Link
              href={`/app/${workspaceId}?tab=accounts&lang=${lang}`}
              className="btn"
              style={{
                padding: "10px 14px",
                borderRadius: 14,
                border: `1px solid ${css.border}`,
                background: css.surface,
                color: css.text,
                fontSize: 12,
                textDecoration: "none",
                fontWeight: 900,
              }}
            >
              {text("Podsumowanie kont", "Account summary")}
            </Link>

            <button
              type="button"
              className="btn"
              onClick={syncAllNow}
              disabled={syncAll || loading || connections.length === 0}
              style={actionButtonStyle({
                background: "#FFFFFF",
                color: "#050505",
                disabled: syncAll || loading || connections.length === 0,
              })}
            >
              <RefreshCw size={14} className={syncAll ? "spin" : ""} />
              {syncAll ? text("Synchronizowanie...", "Synchronizing...") : text("Synchronizuj wszystko", "Sync all")}
            </button>
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "38px 24px 80px" }}>
        <section
          className="integrations-hero fade"
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr .8fr",
            gap: 18,
            marginBottom: 22,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              ...cardStyle({
                padding: 26,
                position: "relative",
                overflow: "hidden",
                minHeight: 250,
              }),
            }}
          >
            <div
              style={{
                position: "absolute",
                right: 22,
                top: -18,
                color: css.accent,
                opacity: 0.07,
                fontSize: 150,
                lineHeight: 1,
                fontFamily: "var(--font-heading)",
                pointerEvents: "none",
              }}
            >
              API
            </div>

            <div style={{ position: "relative", zIndex: 1 }}>
              <SectionLabel color={css.accent}>{text("Centrum połączeń", "Connections center")}</SectionLabel>

              <h1
                style={{
                  fontFamily: "var(--font-heading)",
                  color: css.heading,
                  fontSize: 44,
                  lineHeight: 1,
                  fontWeight: 500,
                  margin: "9px 0 13px",
                  maxWidth: 780,
                }}
              >
                {text(
                  "Połącz platformy, pobierz dane i daj AI realny kontekst",
                  "Connect platforms, import data and give AI real context"
                )}
              </h1>

              <p
                style={{
                  fontSize: 14,
                  color: css.muted,
                  lineHeight: 1.75,
                  maxWidth: 780,
                  marginBottom: 18,
                }}
              >
                {text(
                  "Tutaj podłączasz konta przez OAuth, synchronizujesz publikacje i dodajesz ręczne linki do profilu lub konkretnych postów. Dane trafiają potem do analityki, strategii, AI Partnera i Content Studio.",
                  "Connect accounts through OAuth, synchronize publications and add manual links to profiles or specific posts. The data then powers analytics, strategy, AI Partner and Content Studio."
                )}
              </p>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn"
                  onClick={syncAllNow}
                  disabled={syncAll || loading || connections.length === 0}
                  style={actionButtonStyle({
                    background: css.aiBg,
                    color: css.aiText,
                    border: `1px solid ${css.aiBorder}`,
                    disabled: syncAll || loading || connections.length === 0,
                  })}
                >
                  <RefreshCw size={14} className={syncAll ? "spin" : ""} />
                  {syncAll ? text("Synchronizuję...", "Synchronizing...") : text("Pobierz świeże dane", "Import fresh data")}
                </button>

                <Link
                  href={`/app/${workspaceId}?tab=compare&lang=${lang}`}
                  className="btn"
                  style={{
                    ...actionButtonStyle({
                      background: css.surfaceSoft,
                      color: css.text,
                      border: `1px solid ${css.border}`,
                    }),
                    textDecoration: "none",
                  }}
                >
                  {text("Zobacz porównanie contentu", "View content comparison")}
                </Link>
              </div>
            </div>
          </div>

          <div
            style={{
              ...cardStyle({
                padding: 22,
                border: `1px solid ${css.aiBorder}`,
                boxShadow: css.aiGlow,
                display: "grid",
                alignContent: "space-between",
                gap: 16,
              }),
            }}
          >
            <div>
              <SectionLabel color={css.aiText}>{text("Status połączeń", "Connection status")}</SectionLabel>

              <h2
                style={{
                  fontFamily: "var(--font-heading)",
                  color: css.heading,
                  fontSize: 32,
                  lineHeight: 1.05,
                  fontWeight: 500,
                  margin: "9px 0 9px",
                }}
              >
                {connectedCount
                  ? text(`${connectedCount} aktywnych integracji`, `${connectedCount} active integrations`)
                  : text("Brak aktywnych integracji", "No active integrations")}
              </h2>

              <p style={{ color: css.muted, fontSize: 13, lineHeight: 1.7 }}>
                {connectedCount
                  ? text(
                      "Możesz synchronizować dane pojedynczo lub zbiorczo. Linki ręczne są traktowane jako kontekst AI, a nie jako metryki.",
                      "You can synchronize data individually or in bulk. Manual links are treated as AI context, not as metrics."
                    )
                  : text(
                      "Podłącz pierwszą platformę, żeby zasilić aplikację prawdziwymi danymi.",
                      "Connect your first platform to power the application with real data."
                    )}
              </p>
            </div>

            <div
              className="integrations-stats"
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
            >
              <div
                style={{
                  background: css.surfaceSoft,
                  border: `1px solid ${css.border}`,
                  borderRadius: 16,
                  padding: 13,
                }}
              >
                <div style={{ color: css.successText, fontSize: 25, fontWeight: 900 }}>
                  {connectedCount}
                </div>
                <div style={{ color: css.muted, fontSize: 11, marginTop: 4 }}>
                  {text("aktywne konta", "active accounts")}
                </div>
              </div>

              <div
                style={{
                  background: css.surfaceSoft,
                  border: `1px solid ${expiringCount ? css.warningBorder : css.border}`,
                  borderRadius: 16,
                  padding: 13,
                }}
              >
                <div
                  style={{
                    color: expiringCount ? css.warningText : css.muted,
                    fontSize: 25,
                    fontWeight: 900,
                  }}
                >
                  {expiringCount}
                </div>
                <div style={{ color: css.muted, fontSize: 11, marginTop: 4 }}>
                  {text("tokeny do uwagi", "tokens needing attention")}
                </div>
              </div>
            </div>
          </div>
        </section>

        {loading && (
          <div
            style={{
              ...cardStyle({ padding: 20, marginBottom: 20 }),
              color: css.muted,
              fontSize: 13,
            }}
          >
            {text("Ładowanie połączeń...", "Loading connections...")}
          </div>
        )}

        <div
          className="integrations-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(430px, 1fr))",
            gap: 18,
          }}
        >
          {PLATFORMS.map((platform, idx) => {
            const meta = PLATFORM_META[platform];
            const connection = getConn(platform);
            const isConnected = Boolean(
              connection &&
                (platform !== "spotify" || hasValidSpotifyShow(connection))
            );
            const needsSpotifyShow =
              platform === "spotify" && Boolean(connection) && !isConnected;
            const isSyncing = syncing === connection?.id;
            const isDisconnecting = disconnecting === connection?.id;
            const isExpanded = expanded === platform;
            const PlatformIcon = meta.icon;
            const platformTextColor = platform === "tiktok" ? css.text : meta.color;

            return (
              <div
                key={platform}
                className="card fade"
                style={{
                  animationDelay: `${idx * 0.03}s`,
                  ...cardStyle({
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    border: `1px solid ${isConnected ? `${meta.color}55` : css.border}`,
                  }),
                }}
              >
                <div style={{ height: 5, background: isConnected ? meta.gradient : css.border }} />

                <div style={{ padding: 19, flex: 1, display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: 13,
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          background: isConnected ? `${meta.color}18` : css.surfaceSoft,
                          border: `1px solid ${isConnected ? `${meta.color}55` : css.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: isConnected ? platformTextColor : css.muted,
                          flexShrink: 0,
                        }}
                      >
                        <PlatformIcon size={21} />
                      </div>

                      <div>
                        <div
                          style={{
                            fontFamily: "var(--font-heading)",
                            fontSize: 25,
                            lineHeight: 1.05,
                            fontWeight: 500,
                            color: platformTextColor,
                          }}
                        >
                          {meta.label}
                        </div>

                        {isConnected && connection && (
                          <div
                            style={{
                              fontSize: 12,
                              color: css.muted,
                              marginTop: 4,
                              fontWeight: 700,
                            }}
                          >
                            {connection.account_name}
                          </div>
                        )}
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 900,
                        padding: "5px 9px",
                        borderRadius: 999,
                        background: isConnected ? "#22c55e18" : css.warningBg,
                        border: `1px solid ${isConnected ? "#22c55e40" : css.warningBorder}`,
                        color: isConnected ? css.successText : css.warningText,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        flexShrink: 0,
                      }}
                    >
                      {isConnected
                        ? text("Aktywne", "Active")
                        : needsSpotifyShow
                          ? text("Wymaga linku", "Podcast link required")
                          : text("Niepołączone", "Not connected")}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: 12,
                      color: css.muted,
                      lineHeight: 1.62,
                      marginBottom: 15,
                    }}
                  >
                    {meta.desc}
                  </p>

                  {isConnected && connection && (
                    <div
                      style={{
                        padding: "11px 12px",
                        borderRadius: 15,
                        background: css.surfaceSoft,
                        border: `1px solid ${css.border}`,
                        marginBottom: 14,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <SectionLabel color={css.muted}>{text("Ostatnia synchronizacja", "Last synchronization")}</SectionLabel>
                          <div
                            style={{
                              fontSize: 13,
                              color: css.text,
                              fontWeight: 900,
                              marginTop: 6,
                            }}
                          >
                            {formatSync(connection.last_synced_at)}
                          </div>
                        </div>

                        {isExpiring(connection.token_expires_at) && (
                          <span
                            style={{
                              alignSelf: "flex-start",
                              fontSize: 11,
                              color: css.warningText,
                              background: css.warningBg,
                              border: `1px solid ${css.warningBorder}`,
                              padding: "5px 8px",
                              borderRadius: 9,
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              fontWeight: 800,
                            }}
                          >
                            <AlertCircle size={12} />
                            {text("Token wygasa", "Token expires soon")}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {platform === "spotify" && (
                    <div
                      style={{
                        padding: 13,
                        borderRadius: 15,
                        background: css.surfaceSoft,
                        border: `1px solid ${css.border}`,
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ fontSize: 12, color: css.text, fontWeight: 900, marginBottom: 5 }}>
                        {text("Wybierz podcast do synchronizacji", "Choose a podcast to synchronize")}
                      </div>

                      <div style={{ fontSize: 10, color: css.muted, lineHeight: 1.55, marginBottom: 10 }}>
                        {text(
                          "Spotify udostępnia tytuły, opisy, daty, linki i okładki odcinków. Statystyki odsłuchań nie są dostępne przez Spotify Web API.",
                          "Spotify provides episode titles, descriptions, dates, links and cover art. Listening analytics are not available through Spotify Web API."
                        )}
                      </div>

                      {needsSpotifyShow && (
                        <div
                          style={{
                            color: css.warningText,
                            background: css.warningBg,
                            border: `1px solid ${css.warningBorder}`,
                            borderRadius: 10,
                            padding: "8px 10px",
                            fontSize: 10,
                            lineHeight: 1.5,
                            marginBottom: 9,
                          }}
                        >
                          {text(
                            "Poprzednie połączenie zapisało konto bez ID podcastu. Wklej link do swojego show, aby uzupełnić ten rekord.",
                            "The previous connection saved an account without a podcast ID. Paste your show link to complete this record."
                          )}
                        </div>
                      )}

                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          value={spotifyShowId}
                          onChange={(event) => setSpotifyShowId(event.target.value)}
                          placeholder={text("Link do podcastu Spotify lub Show ID", "Spotify podcast link or Show ID")}
                          style={{ ...inputStyle(), flex: 1 }}
                        />

                        <button
                          type="button"
                          className="btn"
                          onClick={() => saveSpotifyShowId(connection?.id)}
                          disabled={spotifySaving}
                          style={actionButtonStyle({
                            background: "#1DB954",
                            color: "#fff",
                            disabled: spotifySaving,
                          })}
                        >
                          {spotifySaving ? "..." : text("Zapisz i pobierz", "Save and import")}
                        </button>
                      </div>
                    </div>
                  )}

                  {!isConnected && platform === "blog" && (
                    <div
                      style={{
                        padding: 13,
                        borderRadius: 15,
                        background: css.surfaceSoft,
                        border: `1px solid ${css.border}`,
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ fontSize: 11, color: css.muted, marginBottom: 8 }}>
                        {text("Dane połączenia WordPress", "WordPress connection details")}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <input
                          value={blogUrl}
                          onChange={(event) => setBlogUrl(event.target.value)}
                          placeholder="https://twojblog.pl"
                          style={inputStyle()}
                        />

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <input
                            value={blogUser}
                            onChange={(event) => setBlogUser(event.target.value)}
                            placeholder={text("Login WP", "WordPress login")}
                            style={inputStyle()}
                          />

                          <input
                            type="password"
                            value={blogPass}
                            onChange={(event) => setBlogPass(event.target.value)}
                            placeholder="Application Password"
                            style={inputStyle()}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: "auto",
                      marginBottom: isConnected ? 12 : 0,
                    }}
                  >
                    {isConnected && connection ? (
                      <>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => syncOne(connection)}
                          disabled={isSyncing}
                          style={{
                            flex: 1,
                            ...actionButtonStyle({
                              background: `${meta.color}18`,
                              color: platformTextColor,
                              border: `1px solid ${meta.color}44`,
                              disabled: isSyncing,
                            }),
                          }}
                        >
                          <RefreshCw size={14} className={isSyncing ? "spin" : ""} />
                          {isSyncing ? text("Pobieranie...", "Importing...") : text("Synchronizuj", "Synchronize")}
                        </button>

                        {platform !== "spotify" && (
                          <button
                            type="button"
                            className="btn"
                            onClick={() =>
                              (window.location.href = `/api/oauth/${platform}?workspace_id=${workspaceId}`)
                            }
                            title={text("Zreautoryzuj profil", "Reauthorize profile")}
                            style={actionButtonStyle({
                              background: css.surfaceSoft,
                              color: css.muted,
                              border: `1px solid ${css.border}`,
                            })}
                          >
                            <ExternalLink size={14} />
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn"
                          onClick={() => disconnect(connection)}
                          disabled={isDisconnecting}
                          style={actionButtonStyle({
                            background: css.dangerBg,
                            color: css.dangerText,
                            border: `1px solid ${css.dangerBorder}`,
                            disabled: isDisconnecting,
                          })}
                        >
                          {isDisconnecting ? (
                            <RefreshCw size={14} className="spin" />
                          ) : (
                            <X size={14} />
                          )}
                        </button>
                      </>
                    ) : platform === "spotify" ? null : (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          if (meta.type === "oauth") {
                            window.location.href = `/api/oauth/${platform}?workspace_id=${workspaceId}`;
                          } else {
                            void saveBlog();
                          }
                        }}
                        disabled={
                          platform === "blog" && blogSaving
                        }
                        style={{
                          width: "100%",
                          ...actionButtonStyle({
                            background: meta.color,
                            color: platform === "tiktok" ? "#050505" : "#fff",
                            disabled:
                              platform === "blog" && blogSaving,
                          }),
                        }}
                      >
                        {platform === "blog" ? (
                          blogSaving ? (
                            "Łączę..."
                          ) : (
                            "Połącz blog"
                          )
                        ) : (
                          <>
                            <Plus size={14} />
                            Połącz z {meta.label}
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {isConnected && connection && (
                    <>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setExpanded(isExpanded ? null : platform)}
                        style={{
                          width: "100%",
                          padding: "9px",
                          borderRadius: 13,
                          border: `1px dashed ${isExpanded ? `${meta.color}70` : css.border}`,
                          background: isExpanded ? `${meta.color}10` : "transparent",
                          color: isExpanded ? platformTextColor : css.muted,
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isExpanded
                          ? "Ukryj linki"
                          : "Zarządzaj linkami profilu i postów"}
                      </button>

                      {isExpanded && <ManualLinksPanel connection={connection} />}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <footer
          style={{
            marginTop: 58,
            paddingTop: 24,
            borderTop: `1px solid ${css.border}`,
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 26,
          }}
        >
          {[
            ["Polityka prywatności", "https://contentiq.anmcollective.fun/privacy"],
            ["Regulamin", "https://contentiq.anmcollective.fun/terms"],
            ["Contact", "https://contentiq.anmcollective.fun/contact"],
            ["Delete Data", "https://contentiq.anmcollective.fun/delete-data"],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12,
                color: css.muted,
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              {label}
            </a>
          ))}
        </footer>
      </main>

      <SupportWidget
        lang={lang}
        workspaceId={workspaceId}
        source="Integrations settings"
      />
    </div>
  );
}
