"use client";

// app/dashboard/page.tsx
// ANM ContentIQ — start dashboard / application entry

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  calculatePerformanceScore,
  getMetricEngagement,
  getMetricReach,
} from "@/lib/performanceScore";

type Lang = "pl" | "en";

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

interface WorkspaceRow {
  id: string;
  name: string | null;
  type: string | null;
  slug: string;
  created_at?: string | null;
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

const WORKSPACE_SLUG = "anm-collective";

function slugifyProjectName(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return normalized || "projekt";
}

const copy = {
  en: {
    otherFlag: "🇵🇱",
    otherHref: "/dashboard?lang=pl",
    switchLabel: "Switch to Polish",

    notConnected: "Not connected",
    noData: "No data",
    noSync: "Not synchronized",
    now: "now",
    minAgo: "min ago",
    hoursAgo: "h ago",
    daysAgo: "days ago",

    startDashboard: "Start dashboard",
    enterApp: "Enter app →",
    integrations: "Integrations",
    settings: "Settings",
    signOut: "Sign out",
    projectsTitle: "Projects",
    projectsText:
      "Each project has separate integrations, content, calendar, AI context and analytics.",
    activeProject: "Active project",
    createProject: "Create project",
    projectNamePlaceholder: "Client or project name",
    creatingProject: "Creating...",
    openProject: "Open",
    projectCreateError: "Could not create project.",

    nav: {
      analysis: "Analytics",
      creation: "Creation",
      ai: "AI",
      system: "System",
      accounts: "Account summary",
      content: "Content summary",
      compare: "Content comparison",
      studio: "Content Studio",
      blogStudio: "Blog Studio",
      blogLibrary: "Blog library",
      video: "Video Studio",
      shorts: "Short Studio",
      creative: "Creative Studio",
      calendar: "Schedule",
      chat: "AI Chat",
      brand: "Brand Voice",
      offers: "Offers and links",
      partner: "AI Partner",
      strategist: "AI Strategist",
    },

    accountAiDefault:
      "Connect the account and after synchronization the dashboard will show real data.",
    blogAiDefault:
      "Connect a blog or add articles manually so AI can see your article base.",
    spotifyAiDefault:
      "Connect a podcast or add episodes as inspirations for content.",
    connectedNoPosts:
      "The account is connected, but no publications have been retrieved yet.",
    importedPosts:
      "Imported {count} publications. Data comes from the last API synchronization.",

    heroEyebrow: "Start center",
    heroTitle: "One start page. The full application under one button.",
    heroText:
      "This screen is the entry dashboard: it shows a quick overview of accounts and leads to the full application, where you can find Content Studio, Blog Studio, Brand Voice, Offers, AI Partner, Strategist and Integrations.",
    heroPrimary: "Enter the full application →",
    heroSecondary: "Open Content Studio",

    aiOverview: "AI overview",
    aiWaitingTitle: "Waiting for synchronization data",
    aiWaitingText:
      "Connect accounts and synchronize data, and a quick AI conclusion will appear here.",
    strongestWorks: "{platform} performs best",
    strongestText:
      "{platform} has the highest score: {score}/100 across {posts} publications.",

    statsConnected: "Connected accounts",
    statsConnectedSub: "active platforms",
    statsAvgScore: "Avg AI Score",
    statsAvgScoreSub: "average from accounts with data",
    statsPosts: "Publications",
    statsPostsSub: "retrieved from platforms",
    statsBest: "Best platform",
    statsBestSubNoData: "waiting for synchronization",
    statsBestSub: "score {score} · {posts} publications",

    insightsTitle: "✦ AI cross-platform insights",
    collapse: "Collapse ▲",
    expand: "Expand ▼",
    insightNoPostsConnected:
      "Accounts are connected, but no publications have been retrieved yet. Run synchronization in the application.",
    insightNoPosts:
      "Connect the first platform and enter the application to start data synchronization.",
    insightStartPage:
      "This is the start dashboard. Main work — Content Studio, Blog Studio, AI Partner, Strategist and integrations — is available in the full application.",
    insightWithPosts:
      "Retrieved publications: {posts}. Average AI score from real data: {score}/100.",
    insightConnections:
      "Active connections: {connected}/{total}. Results are calculated from the contentiq.posts table, without mock data.",

    accountsTitle: "Accounts and quick data preview",
    active: "● active",
    connect: "+ connect",
    posts: "Posts",
    reach: "Reach",
    engagement: "Eng.",
    weeklyReach: "Reach — last 7 days",
    aiLabel: "✦ AI",
    details: "Details →",
    api: "API",

    quickLinks: {
      fullApp: "Full application",
      fullAppDesc: "Go to the main ContentIQ panel.",
      studio: "Content Studio",
      studioDesc: "Generate, analyze and adapt content.",
      blog: "Blog Studio",
      blogDesc: "Create articles, drafts and blog-based content.",
      offers: "Offers and links",
      offersDesc: "Add products, applications and CTAs for AI.",
    },

    footerMadeBy: "Created with care for easier workflows by ANM Collective",
    privacy: "Privacy Policy",
    terms: "Terms of Service",

    days: ["M", "T", "W", "T", "F", "S", "S"],
    locale: "en-US",
  },

  pl: {
    otherFlag: "🇬🇧",
    otherHref: "/dashboard?lang=en",
    switchLabel: "Switch to English",

    notConnected: "Niepodłączone",
    noData: "Brak danych",
    noSync: "Nie zsynchronizowano",
    now: "teraz",
    minAgo: "min temu",
    hoursAgo: "godz. temu",
    daysAgo: "dni temu",

    startDashboard: "Start dashboard",
    enterApp: "Wejdź do aplikacji →",
    integrations: "Integracje",
    settings: "Ustawienia",
    signOut: "Wyloguj",
    projectsTitle: "Projekty",
    projectsText:
      "Każdy projekt ma osobne integracje, content, harmonogram, kontekst AI i analitykę.",
    activeProject: "Aktywny projekt",
    createProject: "Dodaj projekt",
    projectNamePlaceholder: "Nazwa klienta lub projektu",
    creatingProject: "Tworzenie...",
    openProject: "Otwórz",
    projectCreateError: "Nie udało się utworzyć projektu.",

    nav: {
      analysis: "Analiza",
      creation: "Tworzenie",
      ai: "AI",
      system: "System",
      accounts: "Podsumowanie kont",
      content: "Podsumowanie contentu",
      compare: "Porównanie contentu",
      studio: "Content Studio",
      blogStudio: "Blog Studio",
      blogLibrary: "Biblioteka bloga",
      video: "Video Studio",
      shorts: "Short Studio",
      creative: "Creative Studio",
      calendar: "Harmonogram",
      chat: "AI Chat",
      brand: "Brand Voice",
      offers: "Oferta i linki",
      partner: "AI Partner",
      strategist: "AI Strateg",
    },

    accountAiDefault:
      "Połącz konto, a po synchronizacji dashboard pokaże prawdziwe dane.",
    blogAiDefault:
      "Połącz blog lub dodawaj wpisy ręcznie, żeby AI widziało bazę artykułów.",
    spotifyAiDefault:
      "Połącz podcast lub dodawaj odcinki jako inspiracje do contentu.",
    connectedNoPosts:
      "Konto jest podłączone, ale nie ma jeszcze pobranych publikacji.",
    importedPosts:
      "Zaimportowano {count} publikacji. Dane pochodzą z ostatniej synchronizacji API.",

    heroEyebrow: "Centrum startowe",
    heroTitle: "Jedna strona startowa. Cała aplikacja pod jednym przyciskiem.",
    heroText:
      "Ten ekran jest dashboardem wejściowym: pokazuje szybki obraz kont i prowadzi do pełnej aplikacji, gdzie są Content Studio, Blog Studio, Brand Voice, Oferta, AI Partner, Strateg i Integracje.",
    heroPrimary: "Wejdź do całej aplikacji →",
    heroSecondary: "Otwórz Content Studio",

    aiOverview: "AI overview",
    aiWaitingTitle: "Czeka na dane z synchronizacji",
    aiWaitingText:
      "Połącz konta i zsynchronizuj dane, a tutaj pojawi się szybki wniosek AI.",
    strongestWorks: "Najmocniej działa {platform}",
    strongestText:
      "Najwyższy wynik ma {platform}: {score}/100 przy {posts} publikacjach.",

    statsConnected: "Podłączone konta",
    statsConnectedSub: "platform aktywnych",
    statsAvgScore: "Avg AI Score",
    statsAvgScoreSub: "średnia z kont z danymi",
    statsPosts: "Publikacje",
    statsPostsSub: "pobrane z platform",
    statsBest: "Najlepsza platforma",
    statsBestSubNoData: "czeka na synchronizację",
    statsBestSub: "score {score} · {posts} publikacji",

    insightsTitle: "✦ AI cross-platform insights",
    collapse: "Zwiń ▲",
    expand: "Rozwiń ▼",
    insightNoPostsConnected:
      "Konta są podłączone, ale nie ma jeszcze pobranych publikacji. Uruchom synchronizację w aplikacji.",
    insightNoPosts:
      "Podłącz pierwszą platformę i wejdź do aplikacji, żeby rozpocząć synchronizację danych.",
    insightStartPage:
      "To jest strona startowa dashboardu. Główna praca: Content Studio, Blog Studio, AI Partner, Strateg i integracje — znajduje się w pełnej aplikacji.",
    insightWithPosts:
      "Pobrane publikacje: {posts}. Średni wynik AI z realnych danych: {score}/100.",
    insightConnections:
      "Aktywne połączenia: {connected}/{total}. Wyniki liczone są z tabeli contentiq.posts, bez atrap.",

    accountsTitle: "Konta i szybki podgląd danych",
    active: "● aktywne",
    connect: "+ połącz",
    posts: "Posty",
    reach: "Zasięg",
    engagement: "Eng.",
    weeklyReach: "Zasięg — ostatnie 7 dni",
    aiLabel: "✦ AI",
    details: "Szczegóły →",
    api: "API",

    quickLinks: {
      fullApp: "Pełna aplikacja",
      fullAppDesc: "Przejdź do głównego panelu ContentIQ.",
      studio: "Content Studio",
      studioDesc: "Generuj, analizuj i adaptuj treści.",
      blog: "Blog Studio",
      blogDesc: "Twórz artykuły, szkice i content z bloga.",
      offers: "Oferta i linki",
      offersDesc: "Dodaj produkty, aplikacje i CTA dla AI.",
    },

    footerMadeBy: "Stworzone z zamiłowaniem do ułatwień przez ANM Collective",
    privacy: "Polityka prywatności",
    terms: "Regulamin",

    days: ["P", "W", "Ś", "C", "P", "S", "N"],
    locale: "pl-PL",
  },
};

function makeAccounts(lang: Lang): AccountData[] {
  const t = copy[lang];

  return [
    {
      id: "instagram",
      name: "Instagram",
      handle: t.notConnected,
      color: "#E1306C",
      gradient: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)",
      score: 0,
      trend: 0,
      posts: 0,
      engRate: "0%",
      reach: "0",
      followers: "0",
      bestFormat: t.noData,
      aiTag: t.accountAiDefault,
      connected: false,
      sparkline: Array(12).fill(0),
      weeklyReach: Array(7).fill(0),
    },
    {
      id: "facebook",
      name: "Facebook",
      handle: t.notConnected,
      color: "#1877F2",
      gradient: "linear-gradient(135deg, #1877F2, #0d5fd8)",
      score: 0,
      trend: 0,
      posts: 0,
      engRate: "0%",
      reach: "0",
      followers: "0",
      bestFormat: t.noData,
      aiTag: t.accountAiDefault,
      connected: false,
      sparkline: Array(12).fill(0),
      weeklyReach: Array(7).fill(0),
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      handle: t.notConnected,
      color: "#0A66C2",
      gradient: "linear-gradient(135deg, #0A66C2, #084fa0)",
      score: 0,
      trend: 0,
      posts: 0,
      engRate: "0%",
      reach: "0",
      followers: "0",
      bestFormat: t.noData,
      aiTag: t.accountAiDefault,
      connected: false,
      sparkline: Array(12).fill(0),
      weeklyReach: Array(7).fill(0),
    },
    {
      id: "tiktok",
      name: "TikTok",
      handle: t.notConnected,
      color: "#FFFFFF",
      gradient: "linear-gradient(135deg, #010101, #69C9D0, #EE1D52)",
      score: 0,
      trend: 0,
      posts: 0,
      engRate: "0%",
      reach: "0",
      followers: "0",
      bestFormat: t.noData,
      aiTag: t.accountAiDefault,
      connected: false,
      sparkline: Array(12).fill(0),
      weeklyReach: Array(7).fill(0),
    },
    {
      id: "youtube",
      name: "YouTube",
      handle: t.notConnected,
      color: "#FF0033",
      gradient: "linear-gradient(135deg, #FF0033, #cc0000)",
      score: 0,
      trend: 0,
      posts: 0,
      engRate: "0%",
      reach: "0",
      followers: "0",
      bestFormat: t.noData,
      aiTag: t.accountAiDefault,
      connected: false,
      sparkline: Array(12).fill(0),
      weeklyReach: Array(7).fill(0),
    },
    {
      id: "blog",
      name: "Blog",
      handle: t.notConnected,
      color: "#22C55E",
      gradient: "linear-gradient(135deg, #22C55E, #16a34a)",
      score: 0,
      trend: 0,
      posts: 0,
      engRate: "0%",
      reach: "0",
      followers: "0",
      bestFormat: t.noData,
      aiTag: t.blogAiDefault,
      connected: false,
      sparkline: Array(12).fill(0),
      weeklyReach: Array(7).fill(0),
    },
    {
      id: "spotify",
      name: "Spotify",
      handle: t.notConnected,
      color: "#1DB954",
      gradient: "linear-gradient(135deg, #1DB954, #158a3e)",
      score: 0,
      trend: 0,
      posts: 0,
      engRate: "0%",
      reach: "0",
      followers: "0",
      bestFormat: t.noData,
      aiTag: t.spotifyAiDefault,
      connected: false,
      sparkline: Array(12).fill(0),
      weeklyReach: Array(7).fill(0),
    },
  ];
}

function makeDashboardNavGroups(lang: Lang): DashboardNavGroup[] {
  const t = copy[lang];

  return [
    {
      id: "analysis",
      label: t.nav.analysis,
      items: [
        { label: t.nav.accounts, tab: "accounts" },
        { label: t.nav.content, tab: "content" },
        { label: t.nav.compare, tab: "compare" },
      ],
    },
    {
      id: "creation",
      label: t.nav.creation,
      items: [
        { label: t.nav.studio, tab: "studio" },
        { label: t.nav.blogStudio, tab: "blogStudio" },
        { label: t.nav.blogLibrary, tab: "blogLibrary" },
        { label: t.nav.video, tab: "video" },
        { label: t.nav.shorts, tab: "shorts" },
        { label: t.nav.creative, tab: "creative" },
        { label: t.nav.calendar, tab: "calendar" },
      ],
    },
    {
      id: "ai",
      label: t.nav.ai,
      items: [
        { label: t.nav.chat, tab: "chat" },
        { label: t.nav.brand, tab: "brand" },
        { label: t.nav.offers, tab: "offers" },
        { label: t.nav.partner, tab: "partner" },
        { label: t.nav.strategist, tab: "strategist" },
      ],
    },
    {
      id: "system",
      label: t.nav.system,
      items: [
        {
          label: t.integrations,
          href: `/app/${WORKSPACE_SLUG}/settings?tab=integrations`,
        },
        { label: t.settings, href: `/app/${WORKSPACE_SLUG}/settings` },
      ],
    },
  ];
}

function formatLastSync(value: string | null, lang: Lang) {
  const t = copy[lang];

  if (!value) return t.noSync;

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMin = Math.max(0, Math.round(diffMs / 60000));

  if (diffMin < 1) return t.now;
  if (diffMin < 60) return `${diffMin} ${t.minAgo}`;

  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours} ${t.hoursAgo}`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} ${t.daysAgo}`;
}

function formatNumber(value: number, lang: Lang) {
  return new Intl.NumberFormat(copy[lang].locale, {
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
  lang: Lang,
  lastSyncTag?: string
): AccountData {
  const t = copy[lang];

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
    bestFormat: t.noData,
    aiTag: connected
      ? `${t.connectedNoPosts}${lastSyncTag ? ` (${lastSyncTag})` : ""}`
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
    if (diffDays >= 0 && diffDays < 7) {
      buckets[6 - diffDays] += getPostReach(post);
    }
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

function summarizeDbPosts(
  account: AccountData,
  posts: DbPost[],
  lastSync: string,
  lang: Lang
) {
  const t = copy[lang];

  if (!posts.length) {
    return zeroAccount(account, true, account.handle, lang, lastSync);
  }

  const reachTotal = posts.reduce((sum, post) => sum + getPostReach(post), 0);
  const engagementTotal = posts.reduce(
    (sum, post) => sum + getPostEngagement(post),
    0
  );
  const scores = posts.map(scorePost).filter((score) => score > 0);

  const typeCounts = posts.reduce<Record<string, number>>((acc, post) => {
    const type = post.post_type || "Post";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const bestFormat =
    Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    t.noData;

  return {
    ...account,
    score: scores.length
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0,
    trend: 0,
    posts: posts.length,
    engRate:
      reachTotal > 0
        ? `${((engagementTotal / reachTotal) * 100).toFixed(1)}%`
        : "0%",
    reach: formatNumber(reachTotal, lang),
    followers: "0",
    bestFormat,
    aiTag: t.importedPosts.replace("{count}", String(posts.length)),
    sparkline: buildSparkline(posts),
    weeklyReach: buildWeeklyReach(posts),
  };
}

function mergeConnections(
  accounts: AccountData[],
  connections: PlatformConnection[],
  postsByConnection: Map<string, DbPost[]>,
  lang: Lang
) {
  return accounts.map((account) => {
    const connection = connections.find((item) => item.platform === account.id);

    if (!connection) {
      return zeroAccount(account, false, copy[lang].notConnected, lang);
    }

    const connectedAccount = {
      ...account,
      connected: true,
      handle: connection.account_name || account.name,
    };

    return summarizeDbPosts(
      connectedAccount,
      postsByConnection.get(connection.id) || [],
      formatLastSync(connection.last_synced_at, lang),
      lang
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
  const areaD = `M ${points[0]} L ${points.join(
    " L "
  )} L ${width},${height} L 0,${height} Z`;
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
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={points[points.length - 1].split(",")[0]}
        cy={points[points.length - 1].split(",")[1]}
        r="3"
        fill={color}
      />
    </svg>
  );
}

function MiniBarChart({
  data,
  color,
  lang,
}: {
  data: number[];
  color: string;
  lang: Lang;
}) {
  const max = Math.max(...data, 1);
  const days = copy[lang].days;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 42 }}>
      {data.map((v, i) => (
        <div
          key={`${v}-${i}`}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            flex: 1,
          }}
        >
          <div
            style={{
              width: "100%",
              height: Math.max(4, (v / max) * 32),
              background: i === data.length - 1 ? color : `${color}55`,
              borderRadius: 4,
              transition: "height 0.6s ease",
            }}
          />
          <span style={{ fontSize: 8, color: "rgba(255,255,255,.42)" }}>
            {days[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

function ScoreRing({
  score,
  color,
  size = 54,
}: {
  score: number;
  color: string;
  size?: number;
}) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (Math.max(0, Math.min(100, score)) / 100) * circ;

  return (
    <svg
      width={size}
      height={size}
      style={{ transform: "rotate(-90deg)", flexShrink: 0 }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,.12)"
        strokeWidth={5}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

function DashboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang: Lang = searchParams.get("lang") === "pl" ? "pl" : "en";
  const t = copy[lang];

  const supabase = createClient();

  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState(WORKSPACE_SLUG);
  const [projects, setProjects] = useState<WorkspaceRow[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectError, setProjectError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [expandedInsights, setExpandedInsights] = useState(true);
  const [accounts, setAccounts] = useState<AccountData[]>(() =>
    mergeConnections(makeAccounts(lang), [], new Map(), lang)
  );
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const dashboardNavGroups = makeDashboardNavGroups(lang);
  const selectedProjectSlug = searchParams.get("project") || WORKSPACE_SLUG;
  const activeWorkspaceSlug = workspaceSlug || WORKSPACE_SLUG;
  const activeProject = projects.find((project) => project.slug === activeWorkspaceSlug);
  const privacyHref = `/privacy?lang=${lang}`;
  const termsHref = `/terms?lang=${lang}`;

  async function loadWorkspaceData(resolvedWorkspaceId: string) {
    const { data, error } = await supabase
      .schema("contentiq")
      .from("platform_connections")
      .select("id, platform, account_name, last_synced_at, connected")
      .eq("workspace_id", resolvedWorkspaceId)
      .eq("connected", true);

    if (error) {
      console.error("Connections load error:", error.message);
      return;
    }

    const connections = (data || []) as PlatformConnection[];
    const connectionIds = connections.map((connection) => connection.id);

    if (!connectionIds.length) {
      setAccounts(mergeConnections(makeAccounts(lang), [], new Map(), lang));
      return;
    }

    const { data: postRows, error: postsError } = await supabase
      .schema("contentiq")
      .from("posts")
      .select(
        "connection_id, post_type, published_at, fetched_at, reach, impressions, likes, comments, shares, saves, clicks, ai_score"
      )
      .in("connection_id", connectionIds);

    if (postsError) {
      console.error("Dashboard posts load error:", postsError.message);
    }

    const postsByConnection = new Map<string, DbPost[]>();

    ((postRows || []) as DbPost[]).forEach((post) => {
      const current = postsByConnection.get(post.connection_id) || [];
      current.push(post);
      postsByConnection.set(post.connection_id, current);
    });

    setAccounts(mergeConnections(makeAccounts(lang), connections, postsByConnection, lang));
  }

  async function loadProjectsAndCurrentWorkspace(slug: string) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("No active session");

    const { data: existingProjects, error: projectsError } = await supabase
      .schema("contentiq")
      .from("workspaces")
      .select("id, name, type, slug")
      .eq("user_id", auth.user.id)
      .order("name", { ascending: true });

    if (projectsError) throw new Error(projectsError.message);

    const ownedProjects = (existingProjects || []) as WorkspaceRow[];
    const requestedProject = ownedProjects.find((project) => project.slug === slug);
    const fallbackProject = requestedProject || ownedProjects[0];

    if (fallbackProject?.id) {
      setProjects(ownedProjects);
      setWorkspaceSlug(fallbackProject.slug || slug);
      return fallbackProject.id as string;
    }

    const userSlug = `${slug}-${auth.user.id.slice(0, 8)}`;
    const { data: created, error } = await supabase
      .schema("contentiq")
      .from("workspaces")
      .insert({
        user_id: auth.user.id,
        name: "ANM Collective",
        type: "Firma",
        slug: userSlug,
      })
      .select("id, name, type, slug")
      .single();

    if (error || !created?.id) {
      throw new Error(error?.message || "Could not create workspace");
    }

    const createdProject = created as WorkspaceRow;
    setProjects([createdProject]);
    setWorkspaceSlug(createdProject.slug || userSlug);
    return created.id as string;
  }

  async function createProject() {
    const name = newProjectName.trim();
    if (!name || creatingProject) return;

    setCreatingProject(true);
    setProjectError("");

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("No active session");

      const slug = `${slugifyProjectName(name)}-${crypto.randomUUID().slice(0, 8)}`;

      const { data: created, error } = await supabase
        .schema("contentiq")
        .from("workspaces")
        .insert({
          user_id: auth.user.id,
          name,
          type: "Projekt",
          slug,
        })
        .select("id, name, type, slug")
        .single();

      if (error || !created?.id) {
        throw new Error(error?.message || t.projectCreateError);
      }

      const nextProject = created as WorkspaceRow;
      setProjects((current) => [...current, nextProject]);
      setWorkspaceSlug(nextProject.slug);
      setNewProjectName("");
      setAccounts(mergeConnections(makeAccounts(lang), [], new Map(), lang));
      router.push(`/dashboard?lang=${lang}&project=${nextProject.slug}`);
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : t.projectCreateError);
    } finally {
      setCreatingProject(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);

      const saved = localStorage.getItem("ciq-theme");
      if (saved) setDark(saved === "dark");
    });

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push(`/login?lang=${lang}`);
      else setUserEmail(data.user.email || "");
    });

    loadProjectsAndCurrentWorkspace(selectedProjectSlug)
      .then((resolvedWorkspaceId) => loadWorkspaceData(resolvedWorkspaceId))
      .catch((error) => {
        console.error(
          "Workspace load error:",
          error instanceof Error ? error.message : error
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, selectedProjectSlug]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("ciq-theme", next ? "dark" : "light");
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push(`/login?lang=${lang}`);
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
    ? Math.round(
        activeAccounts.reduce((s, a) => s + a.score, 0) / activeAccounts.length
      )
    : 0;
  const totalPosts = accounts.reduce((s, a) => s + a.posts, 0);
  const bestPlatform =
    [...accounts].filter((a) => a.posts > 0).sort((a, b) => b.score - a.score)[0] ||
    null;

  const globalInsights =
    totalPosts === 0
      ? [
          {
            col: css.aiText,
            text: connectedCount
              ? t.insightNoPostsConnected
              : t.insightNoPosts,
          },
          {
            col: css.accent,
            text: t.insightStartPage,
          },
        ]
      : [
          {
            col: "#22c55e",
            text: t.insightWithPosts
              .replace("{posts}", String(totalPosts))
              .replace("{score}", String(avgScore)),
          },
          {
            col: css.aiText,
            text: t.insightConnections
              .replace("{connected}", String(connectedCount))
              .replace("{total}", String(accounts.length)),
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

        .dash-lang-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 42px;
          min-height: 38px;
          font-size: 20px;
          line-height: 1;
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
            href={`/app/${activeWorkspaceSlug}`}
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
                {t.startDashboard}
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
            {dashboardNavGroups.map((group) => {
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
                      border: `1px solid ${
                        isOpen ? css.accentBorder : "transparent"
                      }`,
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
                          (item.href || `/app/${activeWorkspaceSlug}?tab=${item.tab}`).replace(
                            `/app/${WORKSPACE_SLUG}`,
                            `/app/${activeWorkspaceSlug}`
                          );

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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 12, color: css.muted }}>{userEmail}</span>

            <Link
              href={t.otherHref}
              aria-label={t.switchLabel}
              className="dash-btn dash-lang-button"
              style={{
                padding: "8px 12px",
                borderRadius: 14,
                border: `1px solid ${css.border}`,
                background: css.surface,
                color: css.text,
                textDecoration: "none",
              }}
            >
              {t.otherFlag}
            </Link>

            <Link
              href={`/app/${activeWorkspaceSlug}`}
              className="dash-btn"
              style={{
                padding: "10px 16px",
                borderRadius: 14,
                background: d ? "#FFFFFF" : "#111111",
                color: d ? "#050505" : "#FFFFFF",
                fontSize: 12,
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              {t.enterApp}
            </Link>

            <Link
              href={`/app/${activeWorkspaceSlug}/settings?tab=integrations`}
              className="dash-btn"
              style={{
                padding: "10px 14px",
                borderRadius: 14,
                border: `1px solid ${css.border}`,
                background: css.surface,
                color: css.text,
                fontSize: 12,
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              {t.integrations}
            </Link>

            <button
              onClick={toggleTheme}
              className="dash-btn"
              style={{
                padding: "10px 13px",
                borderRadius: 14,
                border: `1px solid ${css.border}`,
                background: css.surface,
                color: css.text,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {d ? "☀" : "☾"}
            </button>

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="dash-btn"
              style={{
                padding: "10px 13px",
                borderRadius: 14,
                background: "#ef444414",
                border: "1px solid #ef444440",
                color: "#ef4444",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {signingOut ? "..." : t.signOut}
            </button>
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1380,
          margin: "0 auto",
          padding: "34px 28px 80px",
        }}
      >
        <section
          className="fade-up"
          style={{
            background: css.surface,
            border: `1px solid ${css.border}`,
            borderRadius: 24,
            padding: 18,
            marginBottom: 18,
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 16,
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                color: css.accent,
                fontFamily: "var(--font-label)",
                fontSize: 12,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: ".13em",
                marginBottom: 8,
              }}
            >
              {t.projectsTitle}
            </div>

            <h2
              style={{
                color: css.heading,
                fontFamily: "var(--font-heading)",
                fontSize: 30,
                lineHeight: 1,
                fontWeight: 500,
                marginBottom: 8,
              }}
            >
              {activeProject?.name || activeWorkspaceSlug}
            </h2>

            <p style={{ color: css.muted, fontSize: 13, lineHeight: 1.6 }}>
              {t.projectsText}
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              minWidth: 360,
              maxWidth: 520,
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {projects.map((project) => {
                const active = project.slug === activeWorkspaceSlug;

                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => {
                      setWorkspaceSlug(project.slug);
                      router.push(`/dashboard?lang=${lang}&project=${project.slug}`);
                    }}
                    style={{
                      border: `1px solid ${active ? css.accentBorder : css.border}`,
                      background: active ? css.accentSoft : css.surfaceSoft,
                      color: active ? css.accent : css.text,
                      borderRadius: 999,
                      padding: "9px 12px",
                      fontSize: 12,
                      fontWeight: 900,
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {active ? `${t.activeProject}: ` : ""}
                    {project.name || project.slug}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8 }}>
              <input
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void createProject();
                }}
                placeholder={t.projectNamePlaceholder}
                style={{
                  border: `1px solid ${css.border}`,
                  background: css.surfaceSoft,
                  color: css.text,
                  borderRadius: 14,
                  padding: "11px 12px",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "var(--font-body)",
                }}
              />

              <button
                type="button"
                onClick={() => void createProject()}
                disabled={!newProjectName.trim() || creatingProject}
                className="dash-btn"
                style={{
                  border: `1px solid ${css.aiBorder}`,
                  background: css.aiBg,
                  color: css.aiText,
                  boxShadow: css.aiGlow,
                  borderRadius: 14,
                  padding: "11px 14px",
                  fontSize: 12,
                  fontWeight: 950,
                  cursor: !newProjectName.trim() || creatingProject ? "not-allowed" : "pointer",
                  opacity: !newProjectName.trim() || creatingProject ? 0.55 : 1,
                  fontFamily: "var(--font-body)",
                  whiteSpace: "nowrap",
                }}
              >
                {creatingProject ? t.creatingProject : t.createProject}
              </button>

              <Link
                href={`/app/${activeWorkspaceSlug}`}
                className="dash-btn"
                style={{
                  borderRadius: 14,
                  background: d ? "#FFFFFF" : "#111111",
                  color: d ? "#050505" : "#FFFFFF",
                  padding: "11px 14px",
                  fontSize: 12,
                  fontWeight: 950,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {t.openProject}
              </Link>
            </div>

            {projectError && (
              <div
                style={{
                  color: "#ef4444",
                  background: "#ef444414",
                  border: "1px solid #ef444440",
                  borderRadius: 12,
                  padding: "9px 10px",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {projectError}
              </div>
            )}
          </div>
        </section>

        <section
          className="dash-hero fade-up"
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr .85fr",
            gap: 18,
            alignItems: "stretch",
            marginBottom: 22,
          }}
        >
          <div
            style={{
              background: css.surface,
              border: `1px solid ${css.border}`,
              borderRadius: 28,
              padding: 28,
              position: "relative",
              overflow: "hidden",
              minHeight: 260,
            }}
          >
            <div
              style={{
                position: "absolute",
                right: 22,
                top: -14,
                color: css.accent,
                opacity: d ? 0.09 : 0.08,
                fontSize: 150,
                lineHeight: 1,
                fontFamily: "var(--font-heading)",
                pointerEvents: "none",
              }}
            >
              IQ
            </div>

            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  color: css.accent,
                  fontFamily: "var(--font-label)",
                  fontSize: 13,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: ".13em",
                  marginBottom: 12,
                }}
              >
                {t.heroEyebrow}
              </div>

              <h1
                style={{
                  color: css.heading,
                  fontFamily: "var(--font-heading)",
                  fontSize: 48,
                  lineHeight: 0.98,
                  fontWeight: 500,
                  maxWidth: 740,
                  marginBottom: 14,
                }}
              >
                {t.heroTitle}
              </h1>

              <p
                style={{
                  color: css.muted,
                  fontSize: 14,
                  lineHeight: 1.75,
                  maxWidth: 690,
                  marginBottom: 22,
                }}
              >
                {t.heroText}
              </p>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link
                  href={`/app/${activeWorkspaceSlug}`}
                  className="dash-btn"
                  style={{
                    borderRadius: 16,
                    background: d ? "#FFFFFF" : "#111111",
                    color: d ? "#050505" : "#FFFFFF",
                    padding: "13px 18px",
                    fontSize: 13,
                    fontWeight: 950,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {t.heroPrimary}
                </Link>

                <Link
                  href={`/app/${activeWorkspaceSlug}?tab=studio`}
                  className="dash-btn"
                  style={{
                    borderRadius: 16,
                    border: `1px solid ${css.aiBorder}`,
                    background: css.aiBg,
                    color: css.aiText,
                    boxShadow: css.aiGlow,
                    padding: "13px 18px",
                    fontSize: 13,
                    fontWeight: 900,
                    textDecoration: "none",
                  }}
                >
                  {t.heroSecondary}
                </Link>
              </div>
            </div>
          </div>

          <div
            style={{
              background: css.surface,
              border: `1px solid ${css.aiBorder}`,
              boxShadow: css.aiGlow,
              borderRadius: 28,
              padding: 24,
              display: "grid",
              alignContent: "space-between",
              gap: 18,
            }}
          >
            <div>
              <div
                style={{
                  color: css.aiText,
                  fontFamily: "var(--font-label)",
                  fontSize: 13,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: ".13em",
                  marginBottom: 10,
                }}
              >
                {t.aiOverview}
              </div>

              <h2
                style={{
                  color: css.heading,
                  fontFamily: "var(--font-heading)",
                  fontSize: 32,
                  lineHeight: 1.05,
                  fontWeight: 500,
                  marginBottom: 10,
                }}
              >
                {bestPlatform
                  ? t.strongestWorks.replace("{platform}", bestPlatform.name)
                  : t.aiWaitingTitle}
              </h2>

              <p style={{ color: css.muted, fontSize: 13, lineHeight: 1.7 }}>
                {bestPlatform
                  ? t.strongestText
                      .replace("{platform}", bestPlatform.name)
                      .replace("{score}", String(bestPlatform.score))
                      .replace("{posts}", String(bestPlatform.posts))
                  : t.aiWaitingText}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Link
                href={`/app/${activeWorkspaceSlug}?tab=strategist`}
                className="dash-btn"
                style={{
                  borderRadius: 15,
                  background: css.surfaceSoft,
                  border: `1px solid ${css.border}`,
                  color: css.text,
                  padding: 13,
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                {t.nav.strategist}
              </Link>

              <Link
                href={`/app/${activeWorkspaceSlug}?tab=partner`}
                className="dash-btn"
                style={{
                  borderRadius: 15,
                  background: css.surfaceSoft,
                  border: `1px solid ${css.border}`,
                  color: css.text,
                  padding: 13,
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                {t.nav.partner}
              </Link>
            </div>
          </div>
        </section>

        <div
          className="dash-stats"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 22,
          }}
        >
          {[
            {
              label: t.statsConnected,
              value: `${connectedCount}/${accounts.length}`,
              sub: t.statsConnectedSub,
              color: "#22c55e",
            },
            {
              label: t.statsAvgScore,
              value: String(avgScore),
              sub: t.statsAvgScoreSub,
              color: css.aiText,
            },
            {
              label: t.statsPosts,
              value: String(totalPosts),
              sub: t.statsPostsSub,
              color: "#f59e0b",
            },
            {
              label: t.statsBest,
              value: bestPlatform?.name || t.noData,
              sub: bestPlatform
                ? t.statsBestSub
                    .replace("{score}", String(bestPlatform.score))
                    .replace("{posts}", String(bestPlatform.posts))
                : t.statsBestSubNoData,
              color: bestPlatform?.color || css.muted,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="dash-card fade-up"
              style={{
                background: css.surface,
                border: `1px solid ${css.border}`,
                borderRadius: 20,
                padding: "17px 18px",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: css.muted,
                  marginBottom: 7,
                  fontWeight: 800,
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 600,
                  fontFamily: "var(--font-heading)",
                  color: stat.color,
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: 11, color: css.muted, marginTop: 6 }}>
                {stat.sub}
              </div>
            </div>
          ))}
        </div>

        <section
          style={{
            background: css.surface,
            border: `1px solid ${css.aiBorder}`,
            boxShadow: css.aiGlow,
            borderRadius: 22,
            padding: "17px 20px",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: expandedInsights ? 14 : 0,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                color: css.aiText,
                fontFamily: "var(--font-label)",
                textTransform: "uppercase",
                letterSpacing: ".12em",
              }}
            >
              {t.insightsTitle}
            </div>

            <button
              onClick={() => setExpandedInsights(!expandedInsights)}
              style={{
                background: "none",
                border: "none",
                color: css.muted,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {expandedInsights ? t.collapse : t.expand}
            </button>
          </div>

          {expandedInsights && (
            <div
              className="dash-insights"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 12,
              }}
            >
              {globalInsights.map((ins, i) => (
                <div
                  key={i}
                  style={{
                    borderLeft: `4px solid ${ins.col}`,
                    padding: "10px 12px",
                    background: css.surfaceSoft,
                    borderRadius: 14,
                    fontSize: 12,
                    color: css.text,
                    lineHeight: 1.65,
                  }}
                >
                  {ins.text}
                </div>
              ))}
            </div>
          )}
        </section>

        <div
          style={{
            color: css.accent,
            fontFamily: "var(--font-label)",
            fontSize: 12,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: ".12em",
            marginBottom: 14,
          }}
        >
          {t.accountsTitle}
        </div>

        <div
          className="dash-tiles"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {accounts.map((acc, idx) => (
            <div
              key={acc.id}
              className="dash-card fade-up"
              style={{
                animationDelay: `${idx * 0.04}s`,
                background: css.surface,
                border: `1px solid ${acc.connected ? `${acc.color}55` : css.border}`,
                borderRadius: 24,
                overflow: "hidden",
                cursor: "pointer",
                minHeight: 360,
              }}
              onClick={() =>
                router.push(`/app/${activeWorkspaceSlug}?tab=accounts&platform=${acc.id}`)
              }
            >
              <div style={{ height: 5, background: acc.gradient }} />

              <div style={{ padding: "18px 18px 20px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 14,
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 25,
                        color: acc.id === "tiktok" ? css.text : acc.color,
                        fontFamily: "var(--font-heading)",
                        lineHeight: 1.05,
                        fontWeight: 500,
                      }}
                    >
                      {acc.name}
                    </div>
                    <div style={{ fontSize: 11, color: css.muted, marginTop: 4 }}>
                      {acc.handle}
                    </div>
                  </div>

                  {acc.connected ? (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 900,
                        padding: "5px 9px",
                        borderRadius: 999,
                        background: "#22c55e18",
                        color: "#22c55e",
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                      }}
                    >
                      {t.active}
                    </span>
                  ) : (
                    <Link
                      href={`/app/${activeWorkspaceSlug}/settings?tab=integrations`}
                      onClick={(e) => e.stopPropagation()}
                      className="dash-btn"
                      style={{
                        fontSize: 10,
                        fontWeight: 900,
                        padding: "5px 9px",
                        borderRadius: 999,
                        background: `${acc.color}20`,
                        color: acc.id === "tiktok" ? css.text : acc.color,
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                        textDecoration: "none",
                      }}
                    >
                      {t.connect}
                    </Link>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 14,
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <div style={{ position: "relative", width: 54, height: 54 }}>
                      <ScoreRing
                        score={acc.score}
                        color={acc.id === "tiktok" ? css.aiText : acc.color}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "grid",
                          placeItems: "center",
                          color: acc.id === "tiktok" ? css.aiText : acc.color,
                          fontSize: 15,
                          fontWeight: 900,
                        }}
                      >
                        {acc.score}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 10, color: css.muted }}>AI Score</div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color:
                            acc.trend === 0
                              ? css.muted
                              : acc.trend > 0
                                ? "#22c55e"
                                : "#ef4444",
                          marginTop: 2,
                        }}
                      >
                        {acc.trend === 0
                          ? "0%"
                          : `${acc.trend > 0 ? "↑" : "↓"} ${Math.abs(acc.trend)}%`}
                      </div>
                    </div>
                  </div>

                  <Sparkline
                    data={acc.sparkline}
                    color={acc.id === "tiktok" ? css.aiText : acc.color}
                    width={116}
                    height={40}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 8,
                    padding: "11px 0",
                    borderTop: `1px solid ${css.border}`,
                    borderBottom: `1px solid ${css.border}`,
                    marginBottom: 14,
                  }}
                >
                  {[
                    { label: t.posts, val: acc.posts },
                    { label: t.reach, val: acc.reach },
                    { label: t.engagement, val: acc.engRate },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: css.text }}>
                        {val}
                      </div>
                      <div style={{ fontSize: 10, color: css.muted, marginTop: 2 }}>
                        {label}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: css.muted, marginBottom: 7 }}>
                    {t.weeklyReach}
                  </div>
                  <MiniBarChart
                    data={acc.weeklyReach}
                    color={acc.id === "tiktok" ? css.aiText : acc.color}
                    lang={lang}
                  />
                </div>

                <div
                  style={{
                    display: "inline-flex",
                    padding: "5px 10px",
                    borderRadius: 999,
                    background: `${acc.id === "tiktok" ? css.aiText : acc.color}18`,
                    color: acc.id === "tiktok" ? css.aiText : acc.color,
                    fontSize: 11,
                    fontWeight: 900,
                    marginBottom: 11,
                  }}
                >
                  {acc.bestFormat}
                </div>

                <div
                  style={{
                    background: css.surfaceSoft,
                    border: `1px solid ${css.aiBorder}`,
                    borderRadius: 16,
                    padding: "10px 11px",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 900,
                      color: css.aiText,
                      fontFamily: "var(--font-label)",
                      textTransform: "uppercase",
                      letterSpacing: ".09em",
                      marginBottom: 4,
                    }}
                  >
                    {t.aiLabel}
                  </div>
                  <div style={{ fontSize: 11, color: css.text, lineHeight: 1.58 }}>
                    {acc.aiTag}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <Link
                    href={`/app/${activeWorkspaceSlug}?tab=accounts&platform=${acc.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="dash-btn"
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: "9px",
                      borderRadius: 13,
                      background: acc.id === "tiktok" ? css.aiText : acc.color,
                      color: acc.id === "tiktok" ? "#050505" : "#fff",
                      fontSize: 11,
                      fontWeight: 900,
                      textDecoration: "none",
                    }}
                  >
                    {t.details}
                  </Link>

                  <Link
                    href={`/app/${activeWorkspaceSlug}/settings?tab=integrations`}
                    onClick={(e) => e.stopPropagation()}
                    className="dash-btn"
                    style={{
                      padding: "9px 12px",
                      borderRadius: 13,
                      border: `1px solid ${css.border}`,
                      background: css.surfaceSoft,
                      color: css.text,
                      fontSize: 11,
                      fontWeight: 800,
                      textDecoration: "none",
                    }}
                  >
                    {t.api}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <section
          className="dash-links"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginTop: 26,
          }}
        >
          {[
            {
              label: t.quickLinks.fullApp,
              desc: t.quickLinks.fullAppDesc,
              href: `/app/${activeWorkspaceSlug}`,
              icon: "→",
              color: css.accent,
            },
            {
              label: t.quickLinks.studio,
              desc: t.quickLinks.studioDesc,
              href: `/app/${activeWorkspaceSlug}?tab=studio`,
              icon: "✦",
              color: css.aiText,
            },
            {
              label: t.quickLinks.blog,
              desc: t.quickLinks.blogDesc,
              href: `/app/${activeWorkspaceSlug}?tab=blogStudio`,
              icon: "✍",
              color: "#22c55e",
            },
            {
              label: t.quickLinks.offers,
              desc: t.quickLinks.offersDesc,
              href: `/app/${activeWorkspaceSlug}?tab=offers`,
              icon: "□",
              color: "#f59e0b",
            },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="dash-card"
              style={{
                display: "block",
                background: css.surface,
                border: `1px solid ${css.border}`,
                borderRadius: 20,
                padding: "17px 18px",
                textDecoration: "none",
              }}
            >
              <div style={{ fontSize: 21, marginBottom: 9, color: link.color }}>
                {link.icon}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 900,
                  color: css.text,
                  marginBottom: 5,
                }}
              >
                {link.label}
              </div>
              <div style={{ fontSize: 12, color: css.muted, lineHeight: 1.6 }}>
                {link.desc}
              </div>
            </Link>
          ))}
        </section>

        <footer
          style={{
            marginTop: 32,
            paddingTop: 18,
            borderTop: `1px solid ${css.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            color: css.muted,
            fontSize: 12,
            flexWrap: "wrap",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <img
              src="/ANM_ContentIQ_.JPG"
              alt="ANM ContentIQ"
              style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover" }}
            />
            {t.footerMadeBy}
          </span>

          <span style={{ display: "inline-flex", gap: 16, flexWrap: "wrap" }}>
            <Link href={privacyHref} style={{ color: css.muted, textDecoration: "none" }}>
              {t.privacy}
            </Link>
            <Link href={termsHref} style={{ color: css.muted, textDecoration: "none" }}>
              {t.terms}
            </Link>
          </span>
        </footer>
      </main>
    </div>
  );
}
export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardPageInner />
    </Suspense>
  );
}
