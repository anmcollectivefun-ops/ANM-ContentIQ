"use client";

// app/dashboard/page.tsx
// ANM ContentIQ — dashboard startowy / wejście do aplikacji

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  calculatePerformanceScore,
  getMetricEngagement,
  getMetricReach,
} from "@/lib/performanceScore";

type Platform =
  | "instagram"
  | "facebook"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "blog"
  | "spotify";

interface AccountData {
  id: Platform;
  name: string;
  handle: string;
  color: string;
  gradient: string;
  score: number;
  trend: number;
  posts: number;
  engRate: string;
  reach: string;
  followers: string;
  bestFormat: string;
  aiTag: string;
  connected: boolean;
  sparkline: number[];
  weeklyReach: number[];
}

interface PlatformConnection {
  id: string;
  platform: Platform;
  account_name: string;
  last_synced_at: string | null;
  connected: boolean;
}

interface DbPost {
  connection_id: string;
  post_type: string | null;
  published_at: string | null;
  fetched_at: string | null;
  reach: number | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  clicks: number | null;
  ai_score: number | null;
}

const WORKSPACE_SLUG = "anm-collective";

const ACCOUNTS: AccountData[] = [
  {
    id: "instagram",
    name: "Instagram",
    handle: "Niepodłączone",
    color: "#E1306C",
    gradient: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)",
    score: 0,
    trend: 0,
    posts: 0,
    engRate: "0%",
    reach: "0",
    followers: "0",
    bestFormat: "Brak danych",
    aiTag: "Połącz konto, a po synchronizacji dashboard pokaże prawdziwe dane.",
    connected: false,
    sparkline: Array(12).fill(0),
    weeklyReach: Array(7).fill(0),
  },
  {
    id: "facebook",
    name: "Facebook",
    handle: "Niepodłączone",
    color: "#1877F2",
    gradient: "linear-gradient(135deg, #1877F2, #0d5fd8)",
    score: 0,
    trend: 0,
    posts: 0,
    engRate: "0%",
    reach: "0",
    followers: "0",
    bestFormat: "Brak danych",
    aiTag: "Połącz konto, a po synchronizacji dashboard pokaże prawdziwe dane.",
    connected: false,
    sparkline: Array(12).fill(0),
    weeklyReach: Array(7).fill(0),
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    handle: "Niepodłączone",
    color: "#0A66C2",
    gradient: "linear-gradient(135deg, #0A66C2, #084fa0)",
    score: 0,
    trend: 0,
    posts: 0,
    engRate: "0%",
    reach: "0",
    followers: "0",
    bestFormat: "Brak danych",
    aiTag: "Połącz konto, a po synchronizacji dashboard pokaże prawdziwe dane.",
    connected: false,
    sparkline: Array(12).fill(0),
    weeklyReach: Array(7).fill(0),
  },
  {
    id: "tiktok",
    name: "TikTok",
    handle: "Niepodłączone",
    color: "#FFFFFF",
    gradient: "linear-gradient(135deg, #010101, #69C9D0, #EE1D52)",
    score: 0,
    trend: 0,
    posts: 0,
    engRate: "0%",
    reach: "0",
    followers: "0",
    bestFormat: "Brak danych",
    aiTag: "Połącz konto, a po synchronizacji dashboard pokaże prawdziwe dane.",
    connected: false,
    sparkline: Array(12).fill(0),
    weeklyReach: Array(7).fill(0),
  },
  {
    id: "youtube",
    name: "YouTube",
    handle: "Niepodłączone",
    color: "#FF0033",
    gradient: "linear-gradient(135deg, #FF0033, #cc0000)",
    score: 0,
    trend: 0,
    posts: 0,
    engRate: "0%",
    reach: "0",
    followers: "0",
    bestFormat: "Brak danych",
    aiTag: "Połącz konto, a po synchronizacji dashboard pokaże prawdziwe dane.",
    connected: false,
    sparkline: Array(12).fill(0),
    weeklyReach: Array(7).fill(0),
  },
  {
    id: "blog",
    name: "Blog",
    handle: "Niepodłączone",
    color: "#22C55E",
    gradient: "linear-gradient(135deg, #22C55E, #16a34a)",
    score: 0,
    trend: 0,
    posts: 0,
    engRate: "0%",
    reach: "0",
    followers: "0",
    bestFormat: "Brak danych",
    aiTag: "Połącz blog lub dodawaj wpisy ręcznie, żeby AI widziało bazę artykułów.",
    connected: false,
    sparkline: Array(12).fill(0),
    weeklyReach: Array(7).fill(0),
  },
  {
    id: "spotify",
    name: "Spotify",
    handle: "Niepodłączone",
    color: "#1DB954",
    gradient: "linear-gradient(135deg, #1DB954, #158a3e)",
    score: 0,
    trend: 0,
    posts: 0,
    engRate: "0%",
    reach: "0",
    followers: "0",
    bestFormat: "Brak danych",
    aiTag: "Połącz podcast lub dodawaj odcinki jako inspiracje do contentu.",
    connected: false,
    sparkline: Array(12).fill(0),
    weeklyReach: Array(7).fill(0),
  },
];
type DashboardNavItem = {
  label: string;
  tab?: string;
  href?: string;
};

type DashboardNavGroup = {
  id: string;
  label: string;
  items: DashboardNavItem[];
};

const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    id: "analysis",
    label: "Analiza",
    items: [
      { label: "Podsumowanie kont", tab: "accounts" },
      { label: "Podsumowanie contentu", tab: "content" },
      { label: "Porównanie contentu", tab: "compare" },
    ],
  },
  {
    id: "creation",
    label: "Tworzenie",
    items: [
      { label: "Content Studio", tab: "studio" },
      { label: "Blog Studio", tab: "blogStudio" },
      { label: "Biblioteka bloga", tab: "blogLibrary" },
      { label: "Video Studio", tab: "video" },
      { label: "Short Studio", tab: "shorts" },
      { label: "Creative Studio", tab: "creative" },
      { label: "Harmonogram", tab: "calendar" },
    ],
  },
  {
    id: "ai",
    label: "AI",
    items: [
      { label: "AI Chat", tab: "chat" },
      { label: "Brand Voice", tab: "brand" },
      { label: "Oferta i linki", tab: "offers" },
      { label: "AI Partner", tab: "partner" },
      { label: "AI Strateg", tab: "strategist" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { label: "Integracje", href: `/app/${WORKSPACE_SLUG}/settings?tab=integrations` },
      { label: "Ustawienia", href: `/app/${WORKSPACE_SLUG}/settings` },
    ],
  },
];
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function getPostReach(post: DbPost) {
  return getMetricReach(post);
}

function getPostEngagement(post: DbPost) {
  return getMetricEngagement(post);
}

function scorePost(post: DbPost) {
  return calculatePerformanceScore(post);
}

function zeroAccount(
  account: AccountData,
  connected: boolean,
  handle: string,
  lastSyncTag?: string
): AccountData {
  return {
    ...account,
    connected,
    handle,
    score: 0,
    trend: 0,
    posts: 0,
    engRate: "0%",
    reach: "0",
    followers: "0",
    bestFormat: "Brak danych",
    aiTag: connected
      ? `Konto jest podłączone${lastSyncTag ? ` (${lastSyncTag})` : ""}, ale nie ma jeszcze pobranych publikacji.`
      : account.aiTag,
    sparkline: Array(12).fill(0),
    weeklyReach: Array(7).fill(0),
  };
}

function buildWeeklyReach(posts: DbPost[]) {
  const buckets = Array(7).fill(0);
  const today = new Date();

  posts.forEach((post) => {
    const date = new Date(post.published_at || post.fetched_at || Date.now());
    const diffDays = Math.floor((today.getTime() - date.getTime()) / 86400000);
    if (diffDays >= 0 && diffDays < 7) buckets[6 - diffDays] += getPostReach(post);
  });

  if (buckets.every((value) => value === 0)) {
    buckets[6] = posts.reduce((sum, post) => sum + getPostReach(post), 0);
  }

  return buckets;
}

function buildSparkline(posts: DbPost[]) {
  const sorted = [...posts]
    .sort(
      (a, b) =>
        new Date(a.published_at || a.fetched_at || 0).getTime() -
        new Date(b.published_at || b.fetched_at || 0).getTime()
    )
    .slice(-12)
    .map(getPostReach);

  return [...Array(Math.max(0, 12 - sorted.length)).fill(0), ...sorted];
}

function summarizeDbPosts(account: AccountData, posts: DbPost[], lastSync: string) {
  if (!posts.length) return zeroAccount(account, true, account.handle, lastSync);

  const reachTotal = posts.reduce((sum, post) => sum + getPostReach(post), 0);
  const engagementTotal = posts.reduce((sum, post) => sum + getPostEngagement(post), 0);
  const scores = posts.map(scorePost).filter((score) => score > 0);
  const typeCounts = posts.reduce<Record<string, number>>((acc, post) => {
    const type = post.post_type || "Post";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  const bestFormat =
    Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Brak danych";

  return {
    ...account,
    score: scores.length
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0,
    trend: 0,
    posts: posts.length,
    engRate: reachTotal > 0 ? `${((engagementTotal / reachTotal) * 100).toFixed(1)}%` : "0%",
    reach: formatNumber(reachTotal),
    followers: "0",
    bestFormat,
    aiTag: `Zaimportowano ${posts.length} publikacji. Dane pochodzą z ostatniej synchronizacji API.`,
    sparkline: buildSparkline(posts),
    weeklyReach: buildWeeklyReach(posts),
  };
}

function mergeConnections(
  accounts: AccountData[],
  connections: PlatformConnection[],
  postsByConnection: Map<string, DbPost[]>
) {
  return accounts.map((account) => {
    const connection = connections.find((item) => item.platform === account.id);
    if (!connection) return zeroAccount(account, false, "Niepodłączone");

    const connectedAccount = {
      ...account,
      connected: true,
      handle: connection.account_name || account.name,
    };

    return summarizeDbPosts(
      connectedAccount,
      postsByConnection.get(connection.id) || [],
      formatLastSync(connection.last_synced_at)
    );
  });
}

function Sparkline({
  data,
  color,
  width = 120,
  height = 40,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });
  const pathD = `M ${points.join(" L ")}`;
  const areaD = `M ${points[0]} L ${points.join(" L ")} L ${width},${height} L 0,${height} Z`;
  const gradientId = `sg-${color.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.26" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].split(",")[0]} cy={points[points.length - 1].split(",")[1]} r="3" fill={color} />
    </svg>
  );
}

function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const days = ["P", "W", "Ś", "C", "P", "S", "N"];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 42 }}>
      {data.map((v, i) => (
        <div key={`${v}-${i}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flex: 1 }}>
          <div
            style={{
              width: "100%",
              height: Math.max(4, (v / max) * 32),
              background: i === data.length - 1 ? color : `${color}55`,
              borderRadius: 4,
              transition: "height 0.6s ease",
            }}
          />
          <span style={{ fontSize: 8, color: "rgba(255,255,255,.42)" }}>{days[i]}</span>
        </div>
      ))}
    </div>
  );
}

function ScoreRing({ score, color, size = 54 }: { score: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (Math.max(0, Math.min(100, score)) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5} strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [expandedInsights, setExpandedInsights] = useState(true);
  const [accounts, setAccounts] = useState<AccountData[]>(() => mergeConnections(ACCOUNTS, [], new Map()));
const [openMenu, setOpenMenu] = useState<string | null>(null);
  async function getOrCreateWorkspace(slug: string) {
    const { data: existing } = await supabase
      .schema("contentiq")
      .from("workspaces")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing?.id) return existing.id as string;

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Brak aktywnej sesji");

    const { data: created, error } = await supabase
      .schema("contentiq")
      .from("workspaces")
      .insert({ user_id: auth.user.id, name: "ANM Collective", type: "Firma", slug })
      .select("id")
      .single();

    if (error || !created?.id) throw new Error(error?.message || "Nie można utworzyć workspace");
    return created.id as string;
  }

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
      const saved = localStorage.getItem("ciq-theme");
      if (saved) setDark(saved === "dark");
    });

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/login");
      else setUserEmail(data.user.email || "");
    });

    getOrCreateWorkspace(WORKSPACE_SLUG)
      .then((resolvedWorkspaceId) => {
        supabase
          .schema("contentiq")
          .from("platform_connections")
          .select("id, platform, account_name, last_synced_at, connected")
          .eq("workspace_id", resolvedWorkspaceId)
          .eq("connected", true)
          .then(({ data, error }) => {
            if (error) {
              console.error("Connections load error:", error.message);
              return;
            }

            const connections = (data || []) as PlatformConnection[];
            const connectionIds = connections.map((connection) => connection.id);

            if (!connectionIds.length) {
              setAccounts(mergeConnections(ACCOUNTS, [], new Map()));
              return;
            }

            supabase
              .schema("contentiq")
              .from("posts")
              .select("connection_id, post_type, published_at, fetched_at, reach, impressions, likes, comments, shares, saves, clicks, ai_score")
              .in("connection_id", connectionIds)
              .then(({ data: postRows, error: postsError }) => {
                if (postsError) console.error("Dashboard posts load error:", postsError.message);
                const postsByConnection = new Map<string, DbPost[]>();
                ((postRows || []) as DbPost[]).forEach((post) => {
                  const current = postsByConnection.get(post.connection_id) || [];
                  current.push(post);
                  postsByConnection.set(post.connection_id, current);
                });
                setAccounts(mergeConnections(ACCOUNTS, connections, postsByConnection));
              });
          });
      })
      .catch((error) => {
        console.error("Workspace load error:", error instanceof Error ? error.message : error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("ciq-theme", next ? "dark" : "light");
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!mounted) return null;

  const d = dark;
  const css = d
    ? {
        bg: "#1A2233",
        surface: "#050505",
        surfaceSoft: "#0B0B0D",
        text: "#FFFFFF",
        muted: "#C9CED8",
        border: "rgba(255,255,255,0.10)",
        accent: "#8E443D",
        accentSoft: "rgba(142, 68, 61, 0.20)",
        accentBorder: "rgba(142,68,61,.52)",
        heading: "#8E443D",
        aiText: "#D8B4FE",
        aiBg: "rgba(109, 40, 217, 0.16)",
        aiBorder: "rgba(192, 132, 252, 0.55)",
        aiGlow: "0 0 32px rgba(168, 85, 247, 0.18)",
      }
    : {
        bg: "#FFFFFF",
        surface: "#B5937A",
        surfaceSoft: "#F7F2EF",
        text: "#231F20",
        muted: "#5F5A57",
        border: "rgba(35,31,32,0.14)",
        accent: "#231F20",
        accentSoft: "rgba(181,147,122,.28)",
        accentBorder: "rgba(35,31,32,.22)",
        heading: "#231F20",
        aiText: "#6D28D9",
        aiBg: "rgba(124,58,237,.10)",
        aiBorder: "rgba(124,58,237,.34)",
        aiGlow: "0 0 28px rgba(124,58,237,.14)",
      };

  const connectedCount = accounts.filter((a) => a.connected).length;
  const activeAccounts = accounts.filter((a) => a.posts > 0);
  const avgScore = activeAccounts.length
    ? Math.round(activeAccounts.reduce((s, a) => s + a.score, 0) / activeAccounts.length)
    : 0;
  const totalPosts = accounts.reduce((s, a) => s + a.posts, 0);
  const bestPlatform = [...accounts].filter((a) => a.posts > 0).sort((a, b) => b.score - a.score)[0] || null;

  const globalInsights =
    totalPosts === 0
      ? [
          {
            col: css.aiText,
            text: connectedCount
              ? "Konta są podłączone, ale nie ma jeszcze pobranych publikacji. Uruchom synchronizację w aplikacji."
              : "Podłącz pierwszą platformę i wejdź do aplikacji, żeby rozpocząć synchronizację danych.",
          },
          {
            col: css.accent,
            text: "To jest strona startowa dashboardu. Główna praca: Content Studio, Blog Studio, AI Partner, Strateg i integracje — znajduje się w pełnej aplikacji.",
          },
        ]
      : [
          {
            col: "#22c55e",
            text: `Pobrane publikacje: ${totalPosts}. Średni wynik AI z realnych danych: ${avgScore}/100.`,
          },
          {
            col: css.aiText,
            text: `Aktywne połączenia: ${connectedCount}/${accounts.length}. Wyniki liczone są z tabeli contentiq.posts, bez atrap.`,
          },
        ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(circle at top left, ${css.accentSoft}, transparent 34%), ${css.bg}`,
        color: css.text,
        fontFamily: "var(--font-body)",
      }}
    >
      <style>{`
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .dash-card {
    transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
  }

  .dash-card:hover {
    transform: translateY(-3px);
    border-color: ${css.accentBorder};
  }

  .dash-btn {
    transition: transform .16s ease, opacity .16s ease, filter .16s ease;
  }

  .dash-btn:hover {
    transform: translateY(-1px);
    opacity: .88;
  }

  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(12px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .fade-up {
    animation: fadeUp .42s ease forwards;
  }

  @media(max-width: 980px) {
    .dashboard-top-nav {
      display: none !important;
    }

    .dash-stats,
    .dash-tiles,
    .dash-links,
    .dash-insights {
      grid-template-columns: 1fr !important;
    }

    .dash-hero {
      grid-template-columns: 1fr !important;
    }
  }
`}</style>

      <header
        style={{
          borderBottom: `1px solid ${css.border}`,
          background: d ? "rgba(26,34,51,.88)" : "rgba(255,255,255,.88)",
          backdropFilter: "blur(16px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 1380,
            margin: "0 auto",
            padding: "0 28px",
            minHeight: 68,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
         <Link
  href={`/app/${WORKSPACE_SLUG}`}
  style={{
    display: "flex",
    alignItems: "center",
    gap: 12,
    textDecoration: "none",
    flexShrink: 0,
  }}
>
  <img
    src="/ANM_ContentIQ_.JPG"
    alt="ANM ContentIQ"
    style={{
      width: 42,
      height: 42,
      borderRadius: 14,
      objectFit: "cover",
      border: `1px solid ${css.border}`,
    }}
  />

  <div>
    <div
      style={{
        color: css.heading,
        fontFamily: "var(--font-heading)",
        fontSize: 21,
        lineHeight: 1,
        fontWeight: 500,
      }}
    >
      ANM ContentIQ
    </div>

    <div
      style={{
        color: css.muted,
        fontSize: 10,
        letterSpacing: ".15em",
        textTransform: "uppercase",
        marginTop: 4,
      }}
    >
      Start dashboard
    </div>
  </div>
</Link>

<nav
  className="dashboard-top-nav"
  style={{
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
    marginRight: 8,
  }}
>
  {DASHBOARD_NAV_GROUPS.map((group) => {
    const isOpen = openMenu === group.id;

    return (
      <div
        key={group.id}
        style={{ position: "relative" }}
        onMouseLeave={() => setOpenMenu(null)}
      >
        <button
          type="button"
          onClick={() => setOpenMenu(isOpen ? null : group.id)}
          onMouseEnter={() => setOpenMenu(group.id)}
          style={{
            border: `1px solid ${isOpen ? css.accentBorder : "transparent"}`,
            background: isOpen ? css.accentSoft : "transparent",
            color: isOpen ? css.accent : css.muted,
            borderRadius: 13,
            padding: "9px 12px",
            fontSize: 12,
            fontWeight: 900,
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {group.label}
          <span style={{ fontSize: 10, opacity: 0.75 }}>
            {isOpen ? "▲" : "▼"}
          </span>
        </button>

        {isOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              minWidth: 235,
              background: css.surface,
              border: `1px solid ${css.border}`,
              borderRadius: 18,
              padding: 8,
              boxShadow: "0 22px 60px rgba(0,0,0,0.34)",
              zIndex: 90,
            }}
          >
            {group.items.map((item) => {
              const href =
                item.href || `/app/${WORKSPACE_SLUG}?tab=${item.tab}`;

              return (
                <Link
                  key={`${group.id}-${item.label}`}
                  href={href}
                  onClick={() => setOpenMenu(null)}
                  style={{
                    display: "block",
                    padding: "10px 11px",
                    borderRadius: 12,
                    color: css.text,
                    textDecoration: "none",
                    fontSize: 12,
                    fontWeight: 800,
                    lineHeight: 1.35,
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = css.surfaceSoft;
                    event.currentTarget.style.color = css.accent;
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = "transparent";
                    event.currentTarget.style.color = css.text;
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  })}
</nav>



          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: css.muted }}>{userEmail}</span>
            <Link href={`/app/${WORKSPACE_SLUG}`} className="dash-btn" style={{ padding: "10px 16px", borderRadius: 14, background: d ? "#FFFFFF" : "#111111", color: d ? "#050505" : "#FFFFFF", fontSize: 12, fontWeight: 900, textDecoration: "none" }}>
              Wejdź do aplikacji →
            </Link>
            <Link href={`/app/${WORKSPACE_SLUG}/settings?tab=integrations`} className="dash-btn" style={{ padding: "10px 14px", borderRadius: 14, border: `1px solid ${css.border}`, background: css.surface, color: css.text, fontSize: 12, fontWeight: 800, textDecoration: "none" }}>
              Integracje
            </Link>
            <button onClick={toggleTheme} className="dash-btn" style={{ padding: "10px 13px", borderRadius: 14, border: `1px solid ${css.border}`, background: css.surface, color: css.text, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              {d ? "☀" : "☾"}
            </button>
            <button onClick={handleSignOut} disabled={signingOut} className="dash-btn" style={{ padding: "10px 13px", borderRadius: 14, background: "#ef444414", border: "1px solid #ef444440", color: "#ef4444", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              {signingOut ? "..." : "Wyloguj"}
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1380, margin: "0 auto", padding: "34px 28px 80px" }}>
        <section className="dash-hero fade-up" style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 18, alignItems: "stretch", marginBottom: 22 }}>
          <div style={{ background: css.surface, border: `1px solid ${css.border}`, borderRadius: 28, padding: 28, position: "relative", overflow: "hidden", minHeight: 260 }}>
            <div style={{ position: "absolute", right: 22, top: -14, color: css.accent, opacity: d ? 0.09 : 0.08, fontSize: 150, lineHeight: 1, fontFamily: "var(--font-heading)", pointerEvents: "none" }}>IQ</div>
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ color: css.accent, fontFamily: "var(--font-label)", fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".13em", marginBottom: 12 }}>Centrum startowe</div>
              <h1 style={{ color: css.heading, fontFamily: "var(--font-heading)", fontSize: 48, lineHeight: 0.98, fontWeight: 500, maxWidth: 740, marginBottom: 14 }}>
                Jedna strona startowa. Cała aplikacja pod jednym przyciskiem.
              </h1>
              <p style={{ color: css.muted, fontSize: 14, lineHeight: 1.75, maxWidth: 690, marginBottom: 22 }}>
                Ten ekran jest dashboardem wejściowym: pokazuje szybki obraz kont i prowadzi do pełnej aplikacji, gdzie są Content Studio, Blog Studio, Brand Voice, Oferta, AI Partner, Strateg i Integracje.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href={`/app/${WORKSPACE_SLUG}`} className="dash-btn" style={{ borderRadius: 16, background: d ? "#FFFFFF" : "#111111", color: d ? "#050505" : "#FFFFFF", padding: "13px 18px", fontSize: 13, fontWeight: 950, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  Wejdź do całej aplikacji →
                </Link>
                <Link href={`/app/${WORKSPACE_SLUG}?tab=studio`} className="dash-btn" style={{ borderRadius: 16, border: `1px solid ${css.aiBorder}`, background: css.aiBg, color: css.aiText, boxShadow: css.aiGlow, padding: "13px 18px", fontSize: 13, fontWeight: 900, textDecoration: "none" }}>
                  Otwórz Content Studio
                </Link>
              </div>
            </div>
          </div>

          <div style={{ background: css.surface, border: `1px solid ${css.aiBorder}`, boxShadow: css.aiGlow, borderRadius: 28, padding: 24, display: "grid", alignContent: "space-between", gap: 18 }}>
            <div>
              <div style={{ color: css.aiText, fontFamily: "var(--font-label)", fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".13em", marginBottom: 10 }}>AI overview</div>
              <h2 style={{ color: css.heading, fontFamily: "var(--font-heading)", fontSize: 32, lineHeight: 1.05, fontWeight: 500, marginBottom: 10 }}>
                {bestPlatform ? `Najmocniej działa ${bestPlatform.name}` : "Czeka na dane z synchronizacji"}
              </h2>
              <p style={{ color: css.muted, fontSize: 13, lineHeight: 1.7 }}>
                {bestPlatform ? `Najwyższy wynik ma ${bestPlatform.name}: ${bestPlatform.score}/100 przy ${bestPlatform.posts} publikacjach.` : "Połącz konta i zsynchronizuj dane, a tutaj pojawi się szybki wniosek AI."}
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Link href={`/app/${WORKSPACE_SLUG}?tab=strategist`} className="dash-btn" style={{ borderRadius: 15, background: css.surfaceSoft, border: `1px solid ${css.border}`, color: css.text, padding: 13, textDecoration: "none", fontSize: 12, fontWeight: 900 }}>AI Strateg</Link>
              <Link href={`/app/${WORKSPACE_SLUG}?tab=partner`} className="dash-btn" style={{ borderRadius: 15, background: css.surfaceSoft, border: `1px solid ${css.border}`, color: css.text, padding: 13, textDecoration: "none", fontSize: 12, fontWeight: 900 }}>AI Partner</Link>
            </div>
          </div>
        </section>

        <div className="dash-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 22 }}>
          {[
            { label: "Podłączone konta", value: `${connectedCount}/${accounts.length}`, sub: "platform aktywnych", color: "#22c55e" },
            { label: "Avg AI Score", value: String(avgScore), sub: "średnia z kont z danymi", color: css.aiText },
            { label: "Publikacje", value: String(totalPosts), sub: "pobrane z platform", color: "#f59e0b" },
            { label: "Najlepsza platforma", value: bestPlatform?.name || "Brak danych", sub: bestPlatform ? `score ${bestPlatform.score} · ${bestPlatform.posts} publikacji` : "czeka na synchronizację", color: bestPlatform?.color || css.muted },
          ].map((stat) => (
            <div key={stat.label} className="dash-card fade-up" style={{ background: css.surface, border: `1px solid ${css.border}`, borderRadius: 20, padding: "17px 18px" }}>
              <div style={{ fontSize: 11, color: css.muted, marginBottom: 7, fontWeight: 800 }}>{stat.label}</div>
              <div style={{ fontSize: 30, fontWeight: 600, fontFamily: "var(--font-heading)", color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: css.muted, marginTop: 6 }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        <section style={{ background: css.surface, border: `1px solid ${css.aiBorder}`, boxShadow: css.aiGlow, borderRadius: 22, padding: "17px 20px", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: expandedInsights ? 14 : 0 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: css.aiText, fontFamily: "var(--font-label)", textTransform: "uppercase", letterSpacing: ".12em" }}>✦ AI cross-platform insights</div>
            <button onClick={() => setExpandedInsights(!expandedInsights)} style={{ background: "none", border: "none", color: css.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              {expandedInsights ? "Zwiń ▲" : "Rozwiń ▼"}
            </button>
          </div>
          {expandedInsights && (
            <div className="dash-insights" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {globalInsights.map((ins, i) => (
                <div key={i} style={{ borderLeft: `4px solid ${ins.col}`, padding: "10px 12px", background: css.surfaceSoft, borderRadius: 14, fontSize: 12, color: css.text, lineHeight: 1.65 }}>
                  {ins.text}
                </div>
              ))}
            </div>
          )}
        </section>

        <div style={{ color: css.accent, fontFamily: "var(--font-label)", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 14 }}>
          Konta i szybki podgląd danych
        </div>

        <div className="dash-tiles" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {accounts.map((acc, idx) => (
            <div key={acc.id} className="dash-card fade-up" style={{ animationDelay: `${idx * 0.04}s`, background: css.surface, border: `1px solid ${acc.connected ? `${acc.color}55` : css.border}`, borderRadius: 24, overflow: "hidden", cursor: "pointer", minHeight: 360 }} onClick={() => router.push(`/app/${WORKSPACE_SLUG}?tab=accounts&platform=${acc.id}`)}>
              <div style={{ height: 5, background: acc.gradient }} />
              <div style={{ padding: "18px 18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 25, color: acc.id === "tiktok" ? css.text : acc.color, fontFamily: "var(--font-heading)", lineHeight: 1.05, fontWeight: 500 }}>{acc.name}</div>
                    <div style={{ fontSize: 11, color: css.muted, marginTop: 4 }}>{acc.handle}</div>
                  </div>
                  {acc.connected ? (
                    <span style={{ fontSize: 10, fontWeight: 900, padding: "5px 9px", borderRadius: 999, background: "#22c55e18", color: "#22c55e", textTransform: "uppercase", letterSpacing: ".06em" }}>● aktywne</span>
                  ) : (
                    <Link href={`/app/${WORKSPACE_SLUG}/settings?tab=integrations`} onClick={(e) => e.stopPropagation()} className="dash-btn" style={{ fontSize: 10, fontWeight: 900, padding: "5px 9px", borderRadius: 999, background: `${acc.color}20`, color: acc.id === "tiktok" ? css.text : acc.color, textTransform: "uppercase", letterSpacing: ".06em", textDecoration: "none" }}>
                      + połącz
                    </Link>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <div style={{ position: "relative", width: 54, height: 54 }}>
                      <ScoreRing score={acc.score} color={acc.id === "tiktok" ? css.aiText : acc.color} />
                      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: acc.id === "tiktok" ? css.aiText : acc.color, fontSize: 15, fontWeight: 900 }}>{acc.score}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: css.muted }}>AI Score</div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: acc.trend === 0 ? css.muted : acc.trend > 0 ? "#22c55e" : "#ef4444", marginTop: 2 }}>
                        {acc.trend === 0 ? "0%" : `${acc.trend > 0 ? "↑" : "↓"} ${Math.abs(acc.trend)}%`}
                      </div>
                    </div>
                  </div>
                  <Sparkline data={acc.sparkline} color={acc.id === "tiktok" ? css.aiText : acc.color} width={116} height={40} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: "11px 0", borderTop: `1px solid ${css.border}`, borderBottom: `1px solid ${css.border}`, marginBottom: 14 }}>
                  {[
                    { label: "Posty", val: acc.posts },
                    { label: "Zasięg", val: acc.reach },
                    { label: "Eng.", val: acc.engRate },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: css.text }}>{val}</div>
                      <div style={{ fontSize: 10, color: css.muted, marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: css.muted, marginBottom: 7 }}>Zasięg — ostatnie 7 dni</div>
                  <MiniBarChart data={acc.weeklyReach} color={acc.id === "tiktok" ? css.aiText : acc.color} />
                </div>

                <div style={{ display: "inline-flex", padding: "5px 10px", borderRadius: 999, background: `${acc.id === "tiktok" ? css.aiText : acc.color}18`, color: acc.id === "tiktok" ? css.aiText : acc.color, fontSize: 11, fontWeight: 900, marginBottom: 11 }}>
                  {acc.bestFormat}
                </div>

                <div style={{ background: css.surfaceSoft, border: `1px solid ${css.aiBorder}`, borderRadius: 16, padding: "10px 11px", marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: css.aiText, fontFamily: "var(--font-label)", textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 4 }}>✦ AI</div>
                  <div style={{ fontSize: 11, color: css.text, lineHeight: 1.58 }}>{acc.aiTag}</div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <Link href={`/app/${WORKSPACE_SLUG}?tab=accounts&platform=${acc.id}`} onClick={(e) => e.stopPropagation()} className="dash-btn" style={{ flex: 1, textAlign: "center", padding: "9px", borderRadius: 13, background: acc.id === "tiktok" ? css.aiText : acc.color, color: acc.id === "tiktok" ? "#050505" : "#fff", fontSize: 11, fontWeight: 900, textDecoration: "none" }}>
                    Szczegóły →
                  </Link>
                  <Link href={`/app/${WORKSPACE_SLUG}/settings?tab=integrations`} onClick={(e) => e.stopPropagation()} className="dash-btn" style={{ padding: "9px 12px", borderRadius: 13, border: `1px solid ${css.border}`, background: css.surfaceSoft, color: css.text, fontSize: 11, fontWeight: 800, textDecoration: "none" }}>
                    API
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <section className="dash-links" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 26 }}>
          {[
            { label: "Pełna aplikacja", desc: "Przejdź do głównego panelu ContentIQ.", href: `/app/${WORKSPACE_SLUG}`, icon: "→", color: css.accent },
            { label: "Content Studio", desc: "Generuj, analizuj i adaptuj treści.", href: `/app/${WORKSPACE_SLUG}?tab=studio`, icon: "✦", color: css.aiText },
            { label: "Blog Studio", desc: "Twórz artykuły, szkice i content z bloga.", href: `/app/${WORKSPACE_SLUG}?tab=blogStudio`, icon: "✍", color: "#22c55e" },
            { label: "Oferta i linki", desc: "Dodaj produkty, aplikacje i CTA dla AI.", href: `/app/${WORKSPACE_SLUG}?tab=offers`, icon: "□", color: "#f59e0b" },
          ].map((link) => (
            <Link key={link.label} href={link.href} className="dash-card" style={{ display: "block", background: css.surface, border: `1px solid ${css.border}`, borderRadius: 20, padding: "17px 18px", textDecoration: "none" }}>
              <div style={{ fontSize: 21, marginBottom: 9, color: link.color }}>{link.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: css.text, marginBottom: 5 }}>{link.label}</div>
              <div style={{ fontSize: 12, color: css.muted, lineHeight: 1.6 }}>{link.desc}</div>
            </Link>
          ))}
        </section>

        <footer style={{ marginTop: 32, paddingTop: 18, borderTop: `1px solid ${css.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, color: css.muted, fontSize: 12, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <img src="/ANM_ContentIQ_.JPG" alt="ANM ContentIQ" style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover" }} />
            Stworzone z zamiłowaniem do ułatwień przez ANM Collective
          </span>
          <span style={{ display: "inline-flex", gap: 16, flexWrap: "wrap" }}>
            <Link href="/privacy" style={{ color: css.muted, textDecoration: "none" }}>Polityka prywatności</Link>
            <Link href="/terms" style={{ color: css.muted, textDecoration: "none" }}>Regulamin</Link>
          </span>
        </footer>
      </main>
    </div>
  );
}
