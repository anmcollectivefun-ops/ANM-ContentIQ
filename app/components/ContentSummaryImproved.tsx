"use client";

import { useEffect, useMemo, useState } from "react";
import { Wand2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Platform =
  | "instagram"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "blog"
  | "spotify";

interface PlatformConnection {
  id: string;
  platform: Platform;
  account_name: string | null;
  last_synced_at: string | null;
  connected: boolean | null;
}

interface DbPost {
  id: string;
  connection_id: string;
  platform_post_id: string | null;
  title: string | null;
  content: string | null;
  post_type: string | null;
  url: string | null;
  published_at: string | null;

  thumbnail_url: string | null;
  media_url: string | null;
  image_url: string | null;
  cover_url: string | null;

  reach: number | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  clicks: number | null;
  ai_score: number | null;
  ai_summary: string | null;
  fetched_at: string | null;
}

interface UiPost {
  id: string;
  platform: Platform;
  title: string;
  description: string;
  type: string;
  url: string | null;
  published_at: string | null;
  thumbnail_url: string | null;
  reach: number;
  impressions: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  ai_score: number;
  ai_summary: string;
}

interface PlatformGroup {
  platform: Platform;
  label: string;
  color: string;
  icon: string;
  connected: boolean;
  accountName: string;
  handle: string;
  lastSync: string;
  posts: UiPost[];
}

const PLATFORMS: { id: Platform; label: string; color: string; icon: string }[] = [
  { id: "tiktok", label: "TikTok", color: "#7DD3FC", icon: "♪" },
  { id: "instagram", label: "Instagram", color: "#E1306C", icon: "◎" },
  { id: "youtube", label: "YouTube", color: "#FF0033", icon: "▶" },
  { id: "facebook", label: "Facebook", color: "#1877F2", icon: "f" },
  { id: "linkedin", label: "LinkedIn", color: "#0A66C2", icon: "in" },
  { id: "blog", label: "Blog", color: "#22C55E", icon: "✎" },
  { id: "spotify", label: "Spotify", color: "#1DB954", icon: "◉" },
];

function n(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pl-PL").format(Math.round(value || 0));
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.round(value || 0));
}

function formatDate(value: string | null) {
  if (!value) return "Brak daty";

  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatLastSync(value: string | null) {
  if (!value) return "Nie zsynchronizowano";

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMin = Math.max(0, Math.round(diffMs / 60000));

  if (diffMin < 1) return "teraz";
  if (diffMin < 60) return `${diffMin} min temu`;

  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours} godz. temu`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} dni temu`;
}

function getPostViews(post: DbPost) {
  return n(post.reach ?? post.impressions ?? 0);
}

function mapPost(post: DbPost, platform: Platform): UiPost {
  const description = post.content || post.ai_summary || "";

  return {
    id: post.id,
    platform,
    title:
      post.title ||
      description.slice(0, 82) ||
      post.platform_post_id ||
      "Publikacja bez tytułu",
    description,
    type: post.post_type || "Post",
    url: post.url,
    published_at: post.published_at || post.fetched_at,
    reach: n(post.reach),
    impressions: n(post.impressions),
    views: getPostViews(post),
    likes: n(post.likes),
    comments: n(post.comments),
    shares: n(post.shares),
    saves: n(post.saves),
    clicks: n(post.clicks),
    ai_score: n(post.ai_score),
    ai_summary:
      post.ai_summary ||
      "AI użyje tej publikacji jako kontekstu po pobraniu pełniejszych metryk.",
         thumbnail_url:
      post.thumbnail_url ||
      post.cover_url ||
      post.image_url ||
      post.media_url ||
      null,
  };
   
}

function getTotals(posts: UiPost[]) {
  const count = posts.length || 1;

  const totals = posts.reduce(
    (acc, post) => {
      acc.views += post.views;
      acc.reach += post.reach;
      acc.impressions += post.impressions;
      acc.likes += post.likes;
      acc.comments += post.comments;
      acc.shares += post.shares;
      acc.saves += post.saves;
      acc.clicks += post.clicks;
      return acc;
    },
    {
      views: 0,
      reach: 0,
      impressions: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      clicks: 0,
    }
  );

  const interactions = totals.likes + totals.comments + totals.shares + totals.saves;
  const engagementRate = totals.views > 0 ? (interactions / totals.views) * 100 : 0;

  return {
    ...totals,
    postsCount: posts.length,
    interactions,
    engagementRate,
    avgViews: totals.views / count,
    avgLikes: totals.likes / count,
    avgComments: totals.comments / count,
    avgShares: totals.shares / count,
  };
}

function platformMeta(platform: Platform) {
  return PLATFORMS.find((item) => item.id === platform) || PLATFORMS[0];
}

function metricLabel(platform: Platform) {
  if (platform === "tiktok" || platform === "youtube") return "Wyświetlenia filmu";
  if (platform === "instagram" || platform === "facebook") return "Zasięg / wyświetlenia";
  if (platform === "linkedin") return "Wyświetlenia posta";
  return "Wyświetlenia";
}

export default function ContentSummaryImproved({
  dark = true,
  workspaceId = "contentiq",
}: {
  dark?: boolean;
  workspaceId?: string;
  platform?: Platform;
}) {
  const supabase = createClient();

  const [groups, setGroups] = useState<PlatformGroup[]>([]);
  const [openPlatforms, setOpenPlatforms] = useState<Record<string, boolean>>({});
  const [rangeDays, setRangeDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const css = dark
    ? {
        bg: "#050505",
        surface: "#111111",
        surfaceSoft: "#0B0B0C",
        text: "#F5F5F5",
        muted: "#9CA3AF",
        border: "#27272A",
        aiBg: "rgba(109, 40, 217, 0.16)",
        aiBgSoft: "rgba(147, 51, 234, 0.12)",
        aiBorder: "rgba(192, 132, 252, 0.55)",
        aiText: "#D8B4FE",
        aiGlow: "0 0 28px rgba(168, 85, 247, 0.28)",
        aiIcon: "#F0ABFC",
      }
    : {
        bg: "#F6F6F6",
        surface: "#FFFFFF",
        surfaceSoft: "#FAFAFA",
        text: "#111111",
        muted: "#71717A",
        border: "#E4E4E7",
        aiBg: "rgba(124, 58, 237, 0.10)",
        aiBgSoft: "rgba(245, 243, 255, 0.95)",
        aiBorder: "rgba(124, 58, 237, 0.34)",
        aiText: "#6D28D9",
        aiGlow: "0 0 26px rgba(124, 58, 237, 0.18)",
        aiIcon: "#A855F7",
      };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const { data: ws, error: wsError } = await supabase
          .schema("contentiq")
          .from("workspaces")
          .select("id")
          .eq("slug", workspaceId)
          .maybeSingle();

        if (wsError) throw new Error(wsError.message);
        if (!ws?.id) throw new Error("Nie znaleziono workspace.");

        const { data: connectionsData, error: connectionsError } = await supabase
          .schema("contentiq")
          .from("platform_connections")
          .select("id, platform, account_name, last_synced_at, connected")
          .eq("workspace_id", ws.id)
          .eq("connected", true);

        if (connectionsError) throw new Error(connectionsError.message);

        const connections = (connectionsData || []) as PlatformConnection[];
        const connectionIds = connections.map((connection) => connection.id);

        let posts: DbPost[] = [];

        if (connectionIds.length) {
          const fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - rangeDays);

          const { data: postsData, error: postsError } = await supabase
            .schema("contentiq")
            .from("posts")
            .select(
              "id, connection_id, platform_post_id, title, content, post_type, url, published_at, reach, impressions, likes, comments, shares, saves, clicks, ai_score, ai_summary, fetched_at"
            )
            .in("connection_id", connectionIds)
            .gte("published_at", fromDate.toISOString())
            .order("published_at", { ascending: false });

          if (postsError) throw new Error(postsError.message);

          posts = (postsData || []) as DbPost[];
        }

        const connectionById = new Map(connections.map((connection) => [connection.id, connection]));
        const postsByPlatform = new Map<Platform, UiPost[]>();

        posts.forEach((post) => {
          const connection = connectionById.get(post.connection_id);
          if (!connection?.platform) return;

          const platform = connection.platform;
          const current = postsByPlatform.get(platform) || [];
          current.push(mapPost(post, platform));
          postsByPlatform.set(platform, current);
        });

        const nextGroups = PLATFORMS.map((meta) => {
          const platformConnections = connections.filter(
            (connection) => connection.platform === meta.id
          );
          const firstConnection = platformConnections[0];

          const accountName =
            firstConnection?.account_name ||
            (firstConnection ? meta.label : "Niepodłączone");

          return {
            platform: meta.id,
            label: meta.label,
            color: meta.color,
            icon: meta.icon,
            connected: Boolean(firstConnection),
            accountName,
            handle: firstConnection?.account_name ? firstConnection.account_name : "Brak konta",
            lastSync: formatLastSync(firstConnection?.last_synced_at || null),
            posts: postsByPlatform.get(meta.id) || [],
          };
        });

        if (!cancelled) {
          setGroups(nextGroups);

          setOpenPlatforms((current) => {
            if (Object.keys(current).length) return current;

            const firstWithPosts = nextGroups.find((group) => group.posts.length > 0);
            const firstConnected = nextGroups.find((group) => group.connected);

            return {
              [(firstWithPosts || firstConnected || nextGroups[0]).platform]: true,
            };
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setGroups([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [supabase, workspaceId, rangeDays]);

  const allTotals = useMemo(() => {
    return getTotals(groups.flatMap((group) => group.posts));
  }, [groups]);

  function togglePlatform(platform: Platform) {
    setOpenPlatforms((current) => ({
      ...current,
      [platform]: !current[platform],
    }));
  }

  return (
    <section style={{ fontFamily: "var(--font-body)", color: css.text }}>
      <style>{`
        .ciq-platform-summary-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
        }

        .ciq-post-row-grid {
          display: grid;
          grid-template-columns: minmax(280px, 1.6fr) 110px 90px 90px 90px 120px;
          gap: 12px;
          align-items: center;
        }

        .ciq-post-details-grid {
          display: grid;
          grid-template-columns: 1.1fr .9fr;
          gap: 12px;
        }

        @media(max-width: 1200px) {
          .ciq-platform-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .ciq-post-row-grid {
            grid-template-columns: 1fr;
            align-items: stretch;
          }

          .ciq-post-details-grid {
            grid-template-columns: 1fr;
          }
        }

        @media(max-width: 760px) {
          .ciq-platform-summary-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div
        style={{
          background: css.surface,
          border: `1px solid ${css.border}`,
          borderRadius: 20,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 16,
            borderBottom: `1px solid ${css.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: css.muted,
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: ".1em",
                textTransform: "uppercase",
              }}
            >
              Treści z platform
            </div>

            <h2
              style={{
                margin: "5px 0 0",
                color: css.text,
                fontSize: 26,
                fontFamily: "var(--font-heading)",
                fontWeight: 400,
              }}
            >
              Posty pobrane z social mediów
            </h2>
          </div>

          <select
            value={rangeDays}
            onChange={(event) => setRangeDays(Number(event.target.value))}
            style={{
              borderRadius: 12,
              border: `1px solid ${css.border}`,
              background: css.surfaceSoft,
              color: css.text,
              padding: "10px 12px",
              fontWeight: 800,
              fontFamily: "inherit",
            }}
          >
            <option value={7}>Ostatnich 7 dni</option>
            <option value={14}>Ostatnich 14 dni</option>
            <option value={30}>Ostatnich 30 dni</option>
            <option value={90}>Ostatnich 90 dni</option>
          </select>
        </div>

        {loading && (
          <div style={{ padding: 18, color: css.muted, fontSize: 13 }}>
            Ładowanie postów z platform...
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: 18, color: "#ef4444", fontSize: 13 }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <div style={{ padding: 16, display: "grid", gap: 12 }}>
            <div className="ciq-platform-summary-grid">
              {[
                ["Publikacje", formatNumber(allTotals.postsCount)],
                ["Wyświetlenia", formatNumber(allTotals.views)],
                ["Polubienia", formatNumber(allTotals.likes)],
                ["Komentarze", formatNumber(allTotals.comments)],
                ["Udostępnienia", formatNumber(allTotals.shares)],
                ["Engagement", `${allTotals.engagementRate.toFixed(2)}%`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    borderRadius: 15,
                    border: `1px solid ${css.border}`,
                    background: css.surfaceSoft,
                    padding: 13,
                  }}
                >
                  <div style={{ color: css.muted, fontSize: 11, fontWeight: 800 }}>
                    {label}
                  </div>
                  <div
                    style={{
                      color: css.aiText,
                      fontSize: 24,
                      fontFamily: "var(--font-heading)",
                      marginTop: 4,
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {groups.map((group) => {
              const totals = getTotals(group.posts);
              const isOpen = Boolean(openPlatforms[group.platform]);

              return (
                <div
                  key={group.platform}
                  style={{
                    borderRadius: 18,
                    border: `1px solid ${isOpen ? group.color : css.border}`,
                    background: css.surfaceSoft,
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => togglePlatform(group.platform)}
                    style={{
                      width: "100%",
                      border: "none",
                      background: "transparent",
                      padding: 15,
                      cursor: "pointer",
                      display: "grid",
                      gridTemplateColumns: "minmax(220px, 1fr) repeat(5, minmax(90px, .45fr)) 32px",
                      gap: 12,
                      alignItems: "center",
                      textAlign: "left",
                      fontFamily: "inherit",
                    }}
                  >
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 15,
                          display: "grid",
                          placeItems: "center",
                          color: group.color,
                          background: `${group.color}18`,
                          border: `1px solid ${group.color}44`,
                          fontWeight: 900,
                        }}
                      >
                        {group.icon}
                      </div>

                      <div>
                        <div style={{ color: css.text, fontSize: 15, fontWeight: 900 }}>
                          {group.label}
                        </div>

                        <div style={{ color: css.muted, fontSize: 12, marginTop: 3 }}>
                          {group.connected ? group.accountName : "Niepodłączone"} · sync {group.lastSync}
                        </div>
                      </div>
                    </div>

                    {[
                      ["Posty", formatNumber(totals.postsCount)],
                      [metricLabel(group.platform), formatCompact(totals.views)],
                      ["Polubienia", formatCompact(totals.likes)],
                      ["Komentarze", formatCompact(totals.comments)],
                      ["Udost.", formatCompact(totals.shares)],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div style={{ color: css.muted, fontSize: 10, fontWeight: 800 }}>
                          {label}
                        </div>
                        <div style={{ color: css.text, fontSize: 15, fontWeight: 900, marginTop: 3 }}>
                          {value}
                        </div>
                      </div>
                    ))}

                    <div style={{ color: group.color, fontSize: 20, textAlign: "right" }}>
                      {isOpen ? "⌃" : "⌄"}
                    </div>
                  </button>

                  {isOpen && (
                    <div
                      style={{
                        borderTop: `1px solid ${css.border}`,
                        padding: 15,
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <div className="ciq-platform-summary-grid">
                        {[
                          ["Śr. wyświetleń / post", formatNumber(totals.avgViews)],
                          ["Śr. polubień / post", formatNumber(totals.avgLikes)],
                          ["Śr. komentarzy / post", formatNumber(totals.avgComments)],
                          ["Śr. udostępnień / post", formatNumber(totals.avgShares)],
                          ["Zapisania", formatNumber(totals.saves)],
                          ["Kliknięcia", formatNumber(totals.clicks)],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            style={{
                              borderRadius: 14,
                              border: `1px solid ${css.border}`,
                              background: css.surface,
                              padding: 12,
                            }}
                          >
                            <div style={{ color: css.muted, fontSize: 10, fontWeight: 800 }}>
                              {label}
                            </div>
                            <div
                              style={{
                                color: group.color,
                                fontSize: 21,
                                fontFamily: "var(--font-heading)",
                                marginTop: 4,
                              }}
                            >
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>

                      {group.posts.length === 0 && (
                        <div
                          style={{
                            borderRadius: 14,
                            border: `1px dashed ${css.border}`,
                            padding: 16,
                            color: css.muted,
                            fontSize: 13,
                            background: css.surface,
                          }}
                        >
                          Brak pobranych postów dla tej platformy w wybranym okresie.
                          Jeżeli konto jest podłączone, uruchom synchronizację danych.
                        </div>
                      )}

                      {group.posts.length > 0 && (
                        <div style={{ display: "grid", gap: 9 }}>
                          <div
                            className="ciq-post-row-grid"
                            style={{
                              color: css.muted,
                              fontSize: 10,
                              fontWeight: 900,
                              textTransform: "uppercase",
                              letterSpacing: ".08em",
                              padding: "0 10px",
                            }}
                          >
                            <span>Post</span>
                            <span>Wyświetlenia</span>
                            <span>Polubienia</span>
                            <span>Komentarze</span>
                            <span>Udost.</span>
                            <span>Akcje</span>
                          </div>

                          {group.posts.map((post) => (
                            <details
                              key={post.id}
                              style={{
                                borderRadius: 15,
                                border: `1px solid ${css.border}`,
                                background: css.surface,
                                overflow: "hidden",
                              }}
                            >
                              <summary
                                className="ciq-post-row-grid"
                                style={{
                                  listStyle: "none",
                                  cursor: "pointer",
                                  padding: 12,
                                }}
                              >
                                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                  <div
                                    style={{
                                      width: 54,
                                      height: 54,
                                      borderRadius: 12,
                                      background: `${group.color}18`,
                                      border: `1px solid ${group.color}44`,
                                      display: "grid",
                                      placeItems: "center",
                                      color: group.color,
                                      fontWeight: 900,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {group.icon}
                                  </div>

                                  <div>
                                    <div
                                      style={{
                                        color: css.text,
                                        fontSize: 14,
                                        fontWeight: 900,
                                        lineHeight: 1.35,
                                      }}
                                    >
                                      {post.title}
                                    </div>

                                    <div style={{ color: css.muted, fontSize: 12, marginTop: 4 }}>
                                      {post.type} · {formatDate(post.published_at)}
                                    </div>
                                  </div>
                                </div>

                                <strong style={{ color: css.text }}>{formatNumber(post.views)}</strong>
                                <strong style={{ color: css.text }}>{formatNumber(post.likes)}</strong>
                                <strong style={{ color: css.text }}>{formatNumber(post.comments)}</strong>
                                <strong style={{ color: css.text }}>{formatNumber(post.shares)}</strong>

                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                  {post.url && (
                                    <a
                                      href={post.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(event) => event.stopPropagation()}
                                      style={{
                                        color: group.color,
                                        textDecoration: "none",
                                        fontSize: 11,
                                        fontWeight: 900,
                                      }}
                                    >
                                      Otwórz ↗
                                    </a>
                                  )}
                                  <span style={{ color: css.muted, fontSize: 11 }}>
                                    Szczegóły
                                  </span>
                                </div>
                              </summary>

                              <div
                                className="ciq-post-details-grid"
                                style={{
                                  padding: 12,
                                  borderTop: `1px solid ${css.border}`,
                                }}
                              >
                                <div
                                  style={{
                                    background: css.surfaceSoft,
                                    border: `1px solid ${css.border}`,
                                    borderRadius: 14,
                                    padding: 12,
                                  }}
                                >
                                  <div
                                    style={{
                                      color: css.aiText,
                                      fontSize: 10,
                                      fontWeight: 900,
                                      textTransform: "uppercase",
                                      letterSpacing: ".08em",
                                      marginBottom: 8,
                                    }}
                                  >
                                    Opis posta
                                  </div>

                                  <p
                                    style={{
                                      margin: 0,
                                      color: css.text,
                                      fontSize: 12,
                                      lineHeight: 1.7,
                                      whiteSpace: "pre-wrap",
                                    }}
                                  >
                                    {post.description || "Brak opisu posta w pobranych danych."}
                                  </p>

                                  <div
                                    style={{
                                      marginTop: 12,
                                      background: css.aiBg,
                                      border: `1px solid ${css.aiBorder}`,
                                      boxShadow: css.aiGlow,
                                      borderRadius: 18,
                                      padding: 14,
                                      color: css.text,
                                      fontSize: 12,
                                      lineHeight: 1.6,
                                      position: "relative",
                                      overflow: "hidden",
                                    }}
                                  >
                                    <strong
                                      style={{
                                        color: css.aiText,
                                        fontFamily: "var(--font-label)",
                                        fontWeight: 900,
                                        letterSpacing: ".08em",
                                        textTransform: "uppercase",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 7,
                                        marginRight: 6,
                                      }}
                                    >
                                      <Wand2 size={15} color={css.aiIcon} />
                                      AI analiza
                                    </strong>
                                    {post.ai_summary}
                                  </div>
                                </div>

                                <div
                                  style={{
                                    background: css.surfaceSoft,
                                    border: `1px solid ${css.border}`,
                                    borderRadius: 14,
                                    padding: 12,
                                  }}
                                >
                                  <div
                                    style={{
                                      color: css.aiText,
                                      fontSize: 10,
                                      fontWeight: 900,
                                      textTransform: "uppercase",
                                      letterSpacing: ".08em",
                                      marginBottom: 8,
                                    }}
                                  >
                                    Statystyki posta
                                  </div>

                                  {[
                                    ["Wyświetlenia / zasięg", formatNumber(post.views)],
                                    ["Impressions", formatNumber(post.impressions)],
                                    ["Reach", formatNumber(post.reach)],
                                    ["Polubienia", formatNumber(post.likes)],
                                    ["Komentarze", formatNumber(post.comments)],
                                    ["Udostępnienia", formatNumber(post.shares)],
                                    ["Zapisania", formatNumber(post.saves)],
                                    ["Kliknięcia", formatNumber(post.clicks)],
                                    ["AI score", post.ai_score ? `${post.ai_score}/100` : "—"],
                                  ].map(([label, value]) => (
                                    <div
                                      key={label}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: 12,
                                        padding: "8px 0",
                                        borderBottom: `1px solid ${css.border}`,
                                        fontSize: 12,
                                      }}
                                    >
                                      <span style={{ color: css.muted }}>{label}</span>
                                      <strong style={{ color: css.text }}>{value}</strong>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </details>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
