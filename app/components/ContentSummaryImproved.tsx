"use client";

import { useEffect, useMemo, useState } from "react";
import { Wand2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useContentIQLanguage } from "@/lib/contentiq-language";

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

function formatNumber(value: number, locale = "pl-PL") {
  return new Intl.NumberFormat(locale).format(Math.round(value || 0));
}

function formatCompact(value: number, locale = "pl-PL") {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.round(value || 0));
}

function formatDate(value: string | null, locale = "pl-PL", emptyLabel = "Brak daty") {
  if (!value) return emptyLabel;

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatLastSync(value: string | null, lang: "pl" | "en") {
  if (!value) return lang === "pl" ? "Nie zsynchronizowano" : "Not synced";

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMin = Math.max(0, Math.round(diffMs / 60000));

  if (diffMin < 1) return lang === "pl" ? "teraz" : "now";
  if (diffMin < 60) return lang === "pl" ? `${diffMin} min temu` : `${diffMin} min ago`;

  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return lang === "pl" ? `${diffHours} godz. temu` : `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return lang === "pl" ? `${diffDays} dni temu` : `${diffDays}d ago`;
}

function getPostViews(post: DbPost) {
  return n(post.reach ?? post.impressions ?? 0);
}

function mapPost(post: DbPost, platform: Platform): UiPost {
  const description = post.content || post.ai_summary || "";
  const thumbnail =
    post.thumbnail_url || post.cover_url || post.image_url || post.media_url || null;

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
    thumbnail_url: thumbnail,
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

function metricLabel(platform: Platform, lang: "pl" | "en") {
  if (platform === "tiktok" || platform === "youtube") return lang === "pl" ? "Wyświetlenia filmu" : "Video views";
  if (platform === "instagram" || platform === "facebook") return lang === "pl" ? "Zasięg / wyświetlenia" : "Reach / views";
  if (platform === "linkedin") return lang === "pl" ? "Wyświetlenia posta" : "Post views";
  return lang === "pl" ? "Wyświetlenia" : "Views";
}

export default function ContentSummaryImproved({
  dark = true,
  workspaceId = "contentiq",
}: {
  dark?: boolean;
  workspaceId?: string;
  platform?: Platform;
}) {
  const { lang, locale, text } = useContentIQLanguage();
  const supabase = createClient();

  const [groups, setGroups] = useState<PlatformGroup[]>([]);
  const [openPlatforms, setOpenPlatforms] = useState<Record<string, boolean>>({});
  const [rangeDays, setRangeDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const css = dark
    ? {
        bg: "#1A2233",
        surface: "#050505",
        surfaceSoft: "#0B0B0D",
        text: "#FFFFFF",
        muted: "#C9CED8",
        border: "rgba(255,255,255,0.10)",
        heading: "#8E443D",
        accent: "#8E443D",
        aiBg: "rgba(109, 40, 217, 0.16)",
        aiBgSoft: "rgba(147, 51, 234, 0.12)",
        aiBorder: "rgba(192, 132, 252, 0.55)",
        aiText: "#D8B4FE",
        aiGlow: "0 0 28px rgba(168, 85, 247, 0.28)",
        aiIcon: "#F0ABFC",
      }
    : {
        bg: "#FFFFFF",
        surface: "#B5937A",
        surfaceSoft: "#F7F2EF",
        text: "#2B2B2B",
        muted: "#5F5A57",
        border: "rgba(35,31,32,0.14)",
        heading: "#231F20",
        accent: "#231F20",
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
          let postsQuery = supabase
            .schema("contentiq")
            .from("posts")
            .select("*")
            .in("connection_id", connectionIds)
            .order("published_at", { ascending: false });

          if (rangeDays > 0) {
            const fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - rangeDays);
            postsQuery = postsQuery.gte("published_at", fromDate.toISOString());
          }

          const { data: postsData, error: postsError } = await postsQuery;

          if (postsError) throw new Error(postsError.message);

          posts = (postsData || []) as DbPost[];
        }

        const connectionById = new Map(
          connections.map((connection) => [connection.id, connection])
        );

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
            lastSync: formatLastSync(firstConnection?.last_synced_at || null, lang),
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
          grid-template-columns: minmax(320px, 1.6fr) 105px 88px 88px 88px 124px;
          gap: 12px;
          align-items: center;
        }

        .ciq-post-details-grid {
          display: grid;
          grid-template-columns: 1.1fr .9fr;
          gap: 12px;
        }

        .ciq-summary-marker::-webkit-details-marker {
          display: none;
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
          borderRadius: 22,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 18,
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
                color: css.accent,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                fontFamily: "var(--font-label)",
              }}
            >
              {text("Treści z platform", "Platform content")}
            </div>

            <h2
              style={{
                margin: "6px 0 0",
                color: css.heading,
                fontSize: 28,
                fontFamily: "var(--font-heading)",
                fontWeight: 500,
                lineHeight: 1.05,
              }}
            >
              {text("Posty pobrane z social mediów", "Posts imported from social media")}
            </h2>

            <p
              style={{
                margin: "8px 0 0",
                color: css.muted,
                fontSize: 13,
                lineHeight: 1.6,
                maxWidth: 740,
              }}
            >
              {text(
                "Tu analizujesz konkretne publikacje, a nie całe konta. Rozwijaj platformy, sprawdzaj miniatury, wyniki pojedynczych postów i treści, które warto przerobić na kolejny format.",
                "Analyze individual publications rather than whole accounts. Explore platforms, thumbnails, post-level results and content worth repurposing."
              )}
            </p>
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
              fontFamily: "var(--font-body)",
            }}
          >
            <option value={0}>{text("Cały okres", "All time")}</option>
            <option value={7}>{text("Ostatnich 7 dni", "Last 7 days")}</option>
            <option value={14}>{text("Ostatnich 14 dni", "Last 14 days")}</option>
            <option value={30}>{text("Ostatnich 30 dni", "Last 30 days")}</option>
            <option value={90}>{text("Ostatnich 90 dni", "Last 90 days")}</option>
          </select>
        </div>

        {loading && (
          <div style={{ padding: 18, color: css.muted, fontSize: 13 }}>
            {text("Ładowanie postów z platform...", "Loading platform posts...")}
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
                [text("Publikacje", "Publications"), formatNumber(allTotals.postsCount, locale)],
                [text("Wyświetlenia", "Views"), formatNumber(allTotals.views, locale)],
                [text("Polubienia", "Likes"), formatNumber(allTotals.likes, locale)],
                [text("Komentarze", "Comments"), formatNumber(allTotals.comments, locale)],
                [text("Udostępnienia", "Shares"), formatNumber(allTotals.shares, locale)],
                ["Engagement", `${allTotals.engagementRate.toFixed(2)}%`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    borderRadius: 16,
                    border: `1px solid ${css.border}`,
                    background: css.surfaceSoft,
                    padding: 13,
                  }}
                >
                  <div
                    style={{
                      color: css.muted,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: ".06em",
                      textTransform: "uppercase",
                      fontFamily: "var(--font-label)",
                    }}
                  >
                    {label}
                  </div>

                  <div
                    style={{
                      color: css.heading,
                      fontSize: 24,
                      fontFamily: "var(--font-heading)",
                      marginTop: 4,
                      lineHeight: 1,
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
                      gridTemplateColumns:
                        "minmax(220px, 1fr) repeat(5, minmax(90px, .45fr)) 32px",
                      gap: 12,
                      alignItems: "center",
                      textAlign: "left",
                      fontFamily: "var(--font-body)",
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
                        <div
                          style={{
                            color: css.text,
                            fontSize: 15,
                            fontWeight: 900,
                          }}
                        >
                          {group.label}
                        </div>

                        <div style={{ color: css.muted, fontSize: 12, marginTop: 3 }}>
                          {group.connected ? group.accountName : text("Niepołączone", "Not connected")} · sync{" "}
                          {group.lastSync}
                        </div>
                      </div>
                    </div>

                    {[
                      [text("Posty", "Posts"), formatNumber(totals.postsCount, locale)],
                      [metricLabel(group.platform, lang), formatCompact(totals.views, locale)],
                      [text("Polubienia", "Likes"), formatCompact(totals.likes, locale)],
                      [text("Komentarze", "Comments"), formatCompact(totals.comments, locale)],
                      [text("Udost.", "Shares"), formatCompact(totals.shares, locale)],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div
                          style={{
                            color: css.muted,
                            fontSize: 10,
                            fontWeight: 800,
                            letterSpacing: ".04em",
                            textTransform: "uppercase",
                            fontFamily: "var(--font-label)",
                          }}
                        >
                          {label}
                        </div>

                        <div
                          style={{
                            color: css.text,
                            fontSize: 15,
                            fontWeight: 900,
                            marginTop: 3,
                          }}
                        >
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
                          [text("Śr. wyświetleń / post", "Avg. views / post"), formatNumber(totals.avgViews, locale)],
                          [text("Śr. polubień / post", "Avg. likes / post"), formatNumber(totals.avgLikes, locale)],
                          [text("Śr. komentarzy / post", "Avg. comments / post"), formatNumber(totals.avgComments, locale)],
                          [text("Śr. udostępnień / post", "Avg. shares / post"), formatNumber(totals.avgShares, locale)],
                          [text("Zapisania", "Saves"), formatNumber(totals.saves, locale)],
                          [text("Kliknięcia", "Clicks"), formatNumber(totals.clicks, locale)],
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
                            <div
                              style={{
                                color: css.muted,
                                fontSize: 10,
                                fontWeight: 800,
                                letterSpacing: ".04em",
                                textTransform: "uppercase",
                                fontFamily: "var(--font-label)",
                              }}
                            >
                              {label}
                            </div>

                            <div
                              style={{
                                color: group.color,
                                fontSize: 21,
                                fontFamily: "var(--font-heading)",
                                marginTop: 4,
                                lineHeight: 1,
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
                          {text(
                            "Brak pobranych postów dla tej platformy w wybranym okresie. Jeżeli konto jest podłączone, uruchom synchronizację danych.",
                            "No posts were imported for this platform in the selected period. If the account is connected, run data synchronization."
                          )}
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
                              fontFamily: "var(--font-label)",
                            }}
                          >
                            <span>{text("Post", "Post")}</span>
                            <span>{text("Wyświetlenia", "Views")}</span>
                            <span>{text("Polubienia", "Likes")}</span>
                            <span>{text("Komentarze", "Comments")}</span>
                            <span>{text("Udost.", "Shares")}</span>
                            <span>{text("Akcje", "Actions")}</span>
                          </div>

                          {group.posts.map((post) => (
                            <details
                              key={post.id}
                              style={{
                                borderRadius: 16,
                                border: `1px solid ${css.border}`,
                                background: css.surface,
                                overflow: "hidden",
                              }}
                            >
                              <summary
                                className="ciq-post-row-grid ciq-summary-marker"
                                style={{
                                  listStyle: "none",
                                  cursor: "pointer",
                                  padding: 12,
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 12,
                                    alignItems: "center",
                                    minWidth: 0,
                                  }}
                                >
                                  {post.thumbnail_url ? (
                                    <img
                                      src={post.thumbnail_url}
                                      alt=""
                                      style={{
                                        width: 62,
                                        height: 62,
                                        borderRadius: 14,
                                        objectFit: "cover",
                                        border: `1px solid ${css.border}`,
                                        background: css.surfaceSoft,
                                        flexShrink: 0,
                                      }}
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        width: 62,
                                        height: 62,
                                        borderRadius: 14,
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
                                  )}

                                  <div style={{ minWidth: 0 }}>
                                    <div
                                      style={{
                                        color: css.text,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        lineHeight: 1.45,
                                        maxWidth: 560,
                                        overflow: "hidden",
                                        display: "-webkit-box",
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: "vertical",
                                      }}
                                    >
                                      {post.title}
                                    </div>

                                    <div
                                      style={{
                                        color: css.muted,
                                        fontSize: 11,
                                        marginTop: 4,
                                      }}
                                    >
                                      {post.type} · {formatDate(post.published_at, locale, text("Brak daty", "No date"))}
                                    </div>
                                  </div>
                                </div>

                                <strong style={{ color: css.text, fontSize: 13 }}>
                                  {formatNumber(post.views, locale)}
                                </strong>
                                <strong style={{ color: css.text, fontSize: 13 }}>
                                  {formatNumber(post.likes, locale)}
                                </strong>
                                <strong style={{ color: css.text, fontSize: 13 }}>
                                  {formatNumber(post.comments, locale)}
                                </strong>
                                <strong style={{ color: css.text, fontSize: 13 }}>
                                  {formatNumber(post.shares, locale)}
                                </strong>

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
                                      {text("Otwórz ↗", "Open ↗")}
                                    </a>
                                  )}

                                  <span style={{ color: css.muted, fontSize: 11 }}>
                                    {text("Szczegóły", "Details")}
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
                                      color: css.accent,
                                      fontSize: 10,
                                      fontWeight: 900,
                                      textTransform: "uppercase",
                                      letterSpacing: ".08em",
                                      marginBottom: 8,
                                      fontFamily: "var(--font-label)",
                                    }}
                                  >
                                    {text("Opis posta", "Post description")}
                                  </div>

                                  <p
                                    style={{
                                      margin: 0,
                                      color: css.text,
                                      fontSize: 12,
                                      lineHeight: 1.7,
                                      whiteSpace: "pre-wrap",
                                      fontWeight: 400,
                                    }}
                                  >
                                    {post.description || text("Brak opisu posta w pobranych danych.", "No post description was included in the imported data.")}
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
                                      {text("AI analiza", "AI analysis")}
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
                                      color: css.accent,
                                      fontSize: 10,
                                      fontWeight: 900,
                                      textTransform: "uppercase",
                                      letterSpacing: ".08em",
                                      marginBottom: 8,
                                      fontFamily: "var(--font-label)",
                                    }}
                                  >
                                    {text("Statystyki posta", "Post statistics")}
                                  </div>

                                  {[
                                    [text("Wyświetlenia / zasięg", "Views / reach"), formatNumber(post.views, locale)],
                                    [text("Wyświetlenia", "Impressions"), formatNumber(post.impressions, locale)],
                                    [text("Zasięg", "Reach"), formatNumber(post.reach, locale)],
                                    [text("Polubienia", "Likes"), formatNumber(post.likes, locale)],
                                    [text("Komentarze", "Comments"), formatNumber(post.comments, locale)],
                                    [text("Udostępnienia", "Shares"), formatNumber(post.shares, locale)],
                                    [text("Zapisania", "Saves"), formatNumber(post.saves, locale)],
                                    [text("Kliknięcia", "Clicks"), formatNumber(post.clicks, locale)],
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
