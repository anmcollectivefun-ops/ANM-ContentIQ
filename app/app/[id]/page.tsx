"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  BarChart3,
  Bot,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clapperboard,
  FileText,
  GitCompareArrows,
  Home,
  ImagePlus,
  Layers3,
  Library,
  LogOut,
  MessageCircle,
  Moon,
  PenLine,
  PlugZap,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Video,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ContentStudio from "@/app/components/ContentStudio";
import Schedule from "@/app/components/Schedule";
import BrandVoice from "@/app/components/BrandVoice";
import AIChat from "@/app/components/AIChat";
import Templates from "@/app/components/Templates";
import AIPartner from "@/app/components/AIPartner";
import VideoStudio from "@/app/components/VideoStudio";
import ShortStudio from "@/app/components/ShortStudio";
import CreativeStudio from "@/app/components/CreativeStudio";
import { calculatePerformanceScore } from "@/lib/performanceScore";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type Platform =
  | "instagram"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "blog"
  | "spotify";

type TabId =
  | "accounts"
  | "content"
  | "compare"
  | "calendar"
  | "studio"
  | "video"
  | "shorts"
  | "creative"
  | "templates"
  | "templatesContent"
  | "templatesVideo"
  | "templatesShort"
  | "templatesCreative"
  | "partner"
  | "brand"
  | "chat"
  | "integrations"
  | "settings";

interface Account {
  id: Platform;
  name: string;
  handle: string;
  score: number;
  trend: number;
  posts: number;
  engRate: string;
  reach: string;
  bestFormat: string;
  aiTag: string;
  color: string;
  connected: boolean;
  lastSync: string;
  manualAccountUrl?: string;
}

interface PlatformConnection {
  id: string;
  platform: Platform;
  account_name: string;
  last_synced_at: string | null;
  connected: boolean;
}

interface ManualLink {
  id: string;
  connection_id: string;
  type: "account" | "post";
  url: string;
  title: string | null;
  created_at: string | null;
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

interface Post {
  id: string;
  title: string;
  date: string;
  type: string;
  score: number;
  reach: string;
  likes: number;
  comments: number;
  shares?: number;
  saves?: number;
  status: "opublikowany" | "zaplanowany" | "analiza";
  source: "import" | "manual_link" | "created_in_app" | "scheduled_in_app";
  url?: string;
  ai: string;
}

interface PlannedContent {
  id: string;
  title: string;
  platform: Platform;
  date: string;
  status: "Szkic" | "Do akceptacji" | "Zaplanowane" | "Opublikowane";
  originalIdea: string;
  aiPrediction: string;
}

interface Insight {
  type: "up" | "warn" | "info";
  text: string;
}

interface NavTab {
  id: TabId;
  label: string;
  icon: NavIconName;
}

interface NavGroup {
  id: "stats" | "creation" | "templateLibrary" | "ai" | "settings";
  title: string;
  icon: NavIconName;
  tabs: NavTab[];
}

// ─── DATA STARTOWE / PÓŹNIEJ SUPABASE ────────────────────────────────────────

const ACCOUNTS: Account[] = [
  { id: "instagram", name: "Instagram", handle: "Niepodłączone", score: 0, trend: 0, posts: 0, engRate: "0%", reach: "0", bestFormat: "Brak danych", aiTag: "Połącz konto, a po synchronizacji pojawią się tutaj prawdziwe dane.", color: "#E1306C", connected: false, lastSync: "Niepodłączone" },
  { id: "linkedin", name: "LinkedIn", handle: "Niepodłączone", score: 0, trend: 0, posts: 0, engRate: "0%", reach: "0", bestFormat: "Brak danych", aiTag: "Połącz konto, a po synchronizacji pojawią się tutaj prawdziwe dane.", color: "#0A66C2", connected: false, lastSync: "Niepodłączone" },
  { id: "tiktok", name: "TikTok", handle: "Niepodłączone", score: 0, trend: 0, posts: 0, engRate: "0%", reach: "0", bestFormat: "Brak danych", aiTag: "Połącz konto, a po synchronizacji pojawią się tutaj prawdziwe dane.", color: "#FFFFFF", connected: false, lastSync: "Niepodłączone" },
  { id: "youtube", name: "YouTube", handle: "Niepodłączone", score: 0, trend: 0, posts: 0, engRate: "0%", reach: "0", bestFormat: "Brak danych", aiTag: "Połącz konto, a po synchronizacji pojawią się tutaj prawdziwe dane.", color: "#FF0033", connected: false, lastSync: "Niepodłączone" },
  { id: "facebook", name: "Facebook", handle: "Niepodłączone", score: 0, trend: 0, posts: 0, engRate: "0%", reach: "0", bestFormat: "Brak danych", aiTag: "Połącz konto, a po synchronizacji pojawią się tutaj prawdziwe dane.", color: "#1877F2", connected: false, lastSync: "Niepodłączone" },
  { id: "blog", name: "Blog", handle: "Niepodłączone", score: 0, trend: 0, posts: 0, engRate: "0%", reach: "0", bestFormat: "Brak danych", aiTag: "Połącz konto, a po synchronizacji pojawią się tutaj prawdziwe dane.", color: "#22C55E", connected: false, lastSync: "Niepodłączone" },
  { id: "spotify", name: "Spotify", handle: "Niepodłączone", score: 0, trend: 0, posts: 0, engRate: "0%", reach: "0", bestFormat: "Brak danych", aiTag: "Połącz konto, a po synchronizacji pojawią się tutaj prawdziwe dane.", color: "#1DB954", connected: false, lastSync: "Niepodłączone" },
];

const PLANNED_CONTENT: PlannedContent[] = [];

const NAV_GROUPS: NavGroup[] = [
  {
    id: "stats",
    title: "Analiza",
    icon: "groupStats",
    tabs: [
      { id: "accounts", label: "Podsumowanie kont", icon: "accounts" },
      { id: "content", label: "Podsumowanie contentu", icon: "content" },
      { id: "compare", label: "Porównanie contentu", icon: "compare" },
    ],
  },
  {
    id: "creation",
    title: "Tworzenie",
    icon: "groupCreation",
    tabs: [
      { id: "studio", label: "Content Studio", icon: "studio" },
      { id: "video", label: "Video Studio", icon: "video" },
      { id: "shorts", label: "Short Studio", icon: "shorts" },
      { id: "creative", label: "Creative Studio", icon: "creative" },
      { id: "calendar", label: "Harmonogram", icon: "calendar" },
    ],
  },
  {
    id: "templateLibrary",
    title: "Szablony",
    icon: "groupTemplates",
    tabs: [
      { id: "templatesContent", label: "Szablony contentu", icon: "templatesContent" },
      { id: "templatesVideo", label: "Szablony video", icon: "templatesVideo" },
      { id: "templatesShort", label: "Szablony short", icon: "templatesShort" },
      { id: "templatesCreative", label: "Szablony creative", icon: "templatesCreative" },
    ],
  },
  {
    id: "ai",
    title: "AI",
    icon: "groupAi",
    tabs: [
      { id: "chat", label: "AI Chat", icon: "chat" },
      { id: "brand", label: "Brand Voice", icon: "brand" },
      { id: "partner", label: "AI Partner", icon: "partner" },
    ],
  },
  {
    id: "settings",
    title: "System",
    icon: "groupSettings",
    tabs: [
      { id: "integrations", label: "Integracje", icon: "integrations" },
      { id: "settings", label: "Ustawienia", icon: "settings" },
    ],
  },
];

const NAV_TABS: NavTab[] = NAV_GROUPS.flatMap((group) => group.tabs);

const TEMPLATE_VIEWS = {
  templates: {
    kind: "content",
    label: "Szablony contentu",
    title: "Gotowe szablony pod social media",
    description: "Tutaj trzymasz treści zapisane jako szablon w Content Studio.",
    targetTab: "studio",
  },
  templatesContent: {
    kind: "content",
    label: "Szablony contentu",
    title: "Szablony z Content Studio",
    description: "Treści tekstowe, posty, karuzele i warianty przygotowane w Content Studio.",
    targetTab: "studio",
  },
  templatesVideo: {
    kind: "video",
    label: "Szablony video",
    title: "Szablony z Video Studio",
    description: "Briefy video, scenariusze, ujęcia, miniatury i checklisty zapisane z Video Studio.",
    targetTab: "video",
  },
  templatesShort: {
    kind: "short",
    label: "Szablony short",
    title: "Szablony z Short Studio",
    description: "Krótkie formaty i warianty pod TikTok, Reels, Shorts i LinkedIn Video.",
    targetTab: "shorts",
  },
  templatesCreative: {
    kind: "creative",
    label: "Szablony creative",
    title: "Szablony z Creative Studio",
    description: "Prompty, formaty i briefy grafik przygotowane w Creative Studio.",
    targetTab: "creative",
  },
} as const satisfies Record<
  Extract<TabId, "templates" | "templatesContent" | "templatesVideo" | "templatesShort" | "templatesCreative">,
  { kind: "content" | "video" | "short" | "creative"; label: string; title: string; description: string; targetTab: TabId }
>;

const INTEGRATIONS = [
  {
    name: "Instagram / Facebook",
    status: "Do podłączenia",
    description: "Meta Graph API: posty, Reels, zasięgi, komentarze, publikacja.",
  },
  {
    name: "YouTube",
    status: "Priorytet",
    description: "Filmy, Shorts, opisy, miniatury, retencja i wyniki kanału.",
  },
  {
    name: "LinkedIn",
    status: "Planowane",
    description: "Strony firmowe, posty B2B, komentarze i statystyki publikacji.",
  },
  {
    name: "TikTok",
    status: "Później",
    description: "Video, wyniki, publikacja i dopasowanie formatu do platformy.",
  },
  {
    name: "Blog / WordPress",
    status: "Planowane",
    description: "Artykuły, SEO score, blog → social, social → blog.",
  },
  {
    name: "Spotify",
    status: "Planowane",
    description: "Podcasty, odcinki, słuchalność, completion rate i opisy.",
  },
  {
    name: "Google Analytics",
    status: "Planowane",
    description: "Ruch, źródła, konwersje, blog i kampanie contentowe.",
  },
];

const SOCIAL_ICONS: Record<Platform, string> = {
  instagram: "◎",
  linkedin: "in",
  tiktok: "♪",
  youtube: "▶",
  facebook: "f",
  blog: "✎",
  spotify: "◉",
};
const NAV_ICONS = {
  accounts: Layers3,
  content: FileText,
  compare: GitCompareArrows,
  calendar: CalendarDays,
  studio: PenLine,
  video: Video,
  shorts: Clapperboard,
  creative: ImagePlus,
  templates: Library,
  templatesContent: FileText,
  templatesVideo: Video,
  templatesShort: Clapperboard,
  templatesCreative: ImagePlus,
  partner: Bot,
  brand: WandSparkles,
  chat: MessageCircle,
  integrations: PlugZap,
  settings: Settings,

  groupStats: BarChart3,
  groupCreation: PenLine,
  groupTemplates: Library,
  groupAi: Sparkles,
  groupSettings: Settings,
} satisfies Record<string, LucideIcon>;

type NavIconName = keyof typeof NAV_ICONS;

function IconView({
  name,
  size = 17,
  strokeWidth = 2.1,
}: {
  name: NavIconName;
  size?: number;
  strokeWidth?: number;
}) {
  const Icon = NAV_ICONS[name];
  return <Icon size={size} strokeWidth={strokeWidth} />;
}
// ─── HELPERS ─────────────────────────────────────────────────────────────────

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
  return new Intl.NumberFormat("pl-PL", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatDbDate(value: string | null) {
  if (!value) return "Brak daty";
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short" }).format(new Date(value));
}

function emptyPostsByPlatform(): Record<Platform, Post[]> {
  return {
    instagram: [],
    linkedin: [],
    tiktok: [],
    youtube: [],
    facebook: [],
    blog: [],
    spotify: [],
  };
}

function summarizePosts(account: Account, posts: Post[]) {
  const apiPosts = posts.filter((post) => post.source === "import");
  const manualPosts = posts.filter((post) => post.source === "manual_link");

  if (!apiPosts.length) {
    return {
      score: 0,
      trend: 0,
      posts: 0,
      engRate: "0%",
      reach: "0",
      bestFormat: manualPosts.length ? "Linki ręczne" : "Brak danych",
      aiTag: account.connected
        ? manualPosts.length
          ? `Masz ${manualPosts.length} ręcznych linków jako kontekst, ale Instagram API nie zapisało jeszcze żadnej publikacji. Uruchom synchronizację i sprawdź komunikat błędu.`
          : "Konto jest podłączone, ale synchronizacja nie zapisała jeszcze żadnych postów. Uruchom pobieranie danych."
        : "Połącz konto, a po synchronizacji pojawią się tutaj prawdziwe dane.",
    };
  }

  const reachTotal = apiPosts.reduce((sum, post) => sum + Number(post.reach || 0), 0);
  const engagementTotal = apiPosts.reduce((sum, post) => sum + post.likes + post.comments + (post.shares || 0) + (post.saves || 0), 0);
  const scored = apiPosts.filter((post) => post.score > 0);
  const avgScore = scored.length ? Math.round(scored.reduce((sum, post) => sum + post.score, 0) / scored.length) : 0;
  const typeCounts = apiPosts.reduce<Record<string, number>>((acc, post) => {
    acc[post.type] = (acc[post.type] || 0) + 1;
    return acc;
  }, {});
  const bestFormat = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Brak danych";

  return {
    score: avgScore,
    trend: 0,
    posts: apiPosts.length,
    engRate: reachTotal > 0 ? `${((engagementTotal / reachTotal) * 100).toFixed(1)}%` : "0%",
    reach: formatNumber(reachTotal),
    bestFormat,
    aiTag: `Dane pochodzą z ostatniej synchronizacji API. Zaimportowano ${apiPosts.length} publikacji dla ${account.name}.`,
  };
}

function mapDbPost(post: DbPost): Post {
  const reachValue = post.reach ?? post.impressions ?? 0;
  return {
    id: post.id,
    title: post.title || post.content?.slice(0, 80) || "Publikacja bez tytułu",
    date: formatDbDate(post.published_at || post.fetched_at),
    type: post.post_type || "Post",
    score: calculatePerformanceScore(post),
    reach: String(reachValue),
    likes: post.likes ?? 0,
    comments: post.comments ?? 0,
    shares: post.shares ?? 0,
    saves: post.saves ?? 0,
    url: post.url || undefined,
    status: "opublikowany",
    source: "import",
    ai: post.ai_summary || "Prawdziwy rekord pobrany z API. Analiza AI pojawi się po przeliczeniu wyników.",
  };
}

function titleFromManualUrl(url: string, platform: Platform) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\/|\/$/g, "");
    const lastPart = path.split("/").filter(Boolean).pop();
    if (lastPart) return `${getPlatformName(platform)}: ${decodeURIComponent(lastPart).slice(0, 70)}`;
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 80);
  }
}

function mapManualLink(link: ManualLink, platform: Platform): Post {
  return {
    id: `manual-${link.id}`,
    title: link.title || titleFromManualUrl(link.url, platform),
    date: formatDbDate(link.created_at),
    type: "Link ręczny",
    score: 0,
    reach: "0",
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    url: link.url,
    status: "analiza",
    source: "manual_link",
    ai: "Link dodany ręcznie. AI może użyć go jako kontekstu, ale metryki pozostają 0 do czasu pobrania danych z API.",
  };
}

function buildPostsByPlatform(connections: PlatformConnection[], dbPosts: DbPost[], manualLinks: ManualLink[] = []) {
  const byPlatform = emptyPostsByPlatform();
  const connectionPlatform = new Map(connections.map((connection) => [connection.id, connection.platform]));

  dbPosts.forEach((dbPost) => {
    const platform = connectionPlatform.get(dbPost.connection_id);
    if (!platform) return;
    byPlatform[platform].push(mapDbPost(dbPost));
  });

  manualLinks
    .filter((link) => link.type === "post")
    .forEach((link) => {
      const platform = connectionPlatform.get(link.connection_id);
      if (!platform) return;
      byPlatform[platform].push(mapManualLink(link, platform));
    });

  return byPlatform;
}

function mergeConnections(
  accounts: Account[],
  connections: PlatformConnection[],
  postsByPlatform: Record<Platform, Post[]>,
  manualLinks: ManualLink[] = []
) {
  return accounts.map((account) => {
    const connection = connections.find((item) => item.platform === account.id);
    const accountLink = connection
      ? manualLinks.find((link) => link.connection_id === connection.id && link.type === "account")
      : null;

    if (!connection) {
      return {
        ...account,
        connected: false,
        handle: "Niepodłączone",
        lastSync: "Niepodłączone",
        score: 0,
        trend: 0,
        posts: 0,
        engRate: "0%",
        reach: "0",
        bestFormat: "Brak danych",
        aiTag: "Połącz konto, a po synchronizacji pojawią się tutaj prawdziwe dane.",
        manualAccountUrl: undefined,
      };
    }

    const base = {
      ...account,
      connected: true,
      handle: connection.account_name || account.name,
      lastSync: formatLastSync(connection.last_synced_at),
      manualAccountUrl: accountLink?.url,
    };

    return {
      ...base,
      ...summarizePosts(base, postsByPlatform[account.id] || []),
    };
  });
}

function getPlatformName(platform: Platform) {
  return ACCOUNTS.find((account) => account.id === platform)?.name ?? platform;
}

function getPlatformColor(platform: Platform) {
  return ACCOUNTS.find((account) => account.id === platform)?.color ?? "#ffffff";
}

function getScoreColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

function getBestAccount() {
  return [...ACCOUNTS].sort((a, b) => b.score - a.score)[0];
}

function getWeakestAccount() {
  return [...ACCOUNTS].sort((a, b) => a.score - b.score)[0];
}

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = getScoreColor(score);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={st.scoreTrack}>
        <div
          style={{
            width: `${score}%`,
            height: "100%",
            borderRadius: 999,
            background: color,
            transition: "width 0.6s ease",
          }}
        />
      </div>

      <span
        style={{
          fontSize: 13,
          fontWeight: 800,
          color,
          minWidth: 32,
          textAlign: "right",
        }}
      >
        {score}
      </span>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function AppWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const workspaceId = Array.isArray(params.id) ? params.id[0] : params.id as string;

  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("accounts");
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openNavGroups, setOpenNavGroups] = useState<Record<NavGroup["id"], boolean>>({
    stats: true,
    creation: true,
    templateLibrary: true,
    ai: true,
    settings: true,
  });
  const [accounts, setAccounts] = useState<Account[]>(() => mergeConnections(ACCOUNTS, [], emptyPostsByPlatform()));
  const [postsByPlatform, setPostsByPlatform] = useState<Record<Platform, Post[]>>(emptyPostsByPlatform);

  const css = dark ? darkVars : lightVars;

  const bestAccount = useMemo(() => [...accounts].sort((a, b) => b.score - a.score)[0], [accounts]);
  const weakestAccount = useMemo(() => [...accounts].sort((a, b) => a.score - b.score)[0], [accounts]);

  const latestContentGroups = useMemo(() => {
    return accounts.map((account) => ({
      account,
      posts: (postsByPlatform[account.id] ?? []).slice(0, 3),
    }));
  }, [accounts, postsByPlatform]);

  const realInsights = useMemo<Insight[]>(() => {
    const totalPosts = accounts.reduce((sum, account) => sum + account.posts, 0);
    const connected = accounts.filter((account) => account.connected);

    if (!totalPosts) {
      return [
        {
          type: "info",
          text: connected.length
            ? "Konta są podłączone, ale w bazie nie ma jeszcze pobranych publikacji. Po uruchomieniu synchronizacji analiza zostanie policzona z realnych danych."
            : "Nie ma jeszcze podłączonych kont. Po połączeniu platform i synchronizacji zobaczysz tutaj realną analizę cross-platform.",
        },
      ];
    }

    const strongest = [...accounts].filter((account) => account.posts > 0).sort((a, b) => b.score - a.score)[0];
    const weakest = [...accounts].filter((account) => account.posts > 0).sort((a, b) => a.score - b.score)[0];

    return [
      {
        type: "up",
        text: `Najmocniejszy kanał z realnych danych: ${strongest.name}. Wynik AI: ${strongest.score}/100, publikacje: ${strongest.posts}.`,
      },
      {
        type: "warn",
        text: `Do obserwacji: ${weakest.name}. Jeśli wynik jest niski albo zerowy, sprawdź zakresy API i jakość pobranych metryk.`,
      },
      {
        type: "info",
        text: `Łącznie w bazie jest ${totalPosts} pobranych publikacji z podłączonych platform.`,
      },
    ];
  }, [accounts]);

  async function getOrCreateWorkspace() {
    const { data: existing } = await supabase
      .schema("contentiq")
      .from("workspaces")
      .select("id")
      .eq("slug", workspaceId)
      .single();

    if (existing?.id) return existing.id as string;

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Brak aktywnej sesji");

    const { data: created, error } = await supabase
      .schema("contentiq")
      .from("workspaces")
      .insert({
        user_id: auth.user.id,
        name: workspaceId
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        type: "Firma",
        slug: workspaceId,
      })
      .select("id")
      .single();

    if (error || !created?.id) {
      throw new Error(error?.message || "Nie można utworzyć workspace");
    }

    return created.id as string;
  }

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);

      const saved = localStorage.getItem("ciq-theme");
      if (saved) {
        setDark(saved === "dark");
      }
    });

    getOrCreateWorkspace()
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
              const emptyPosts = emptyPostsByPlatform();
              setPostsByPlatform(emptyPosts);
              setAccounts(mergeConnections(ACCOUNTS, [], emptyPosts));
              return;
            }

            Promise.all([
              supabase
                .schema("contentiq")
                .from("posts")
                .select("id, connection_id, platform_post_id, title, content, post_type, url, published_at, reach, impressions, likes, comments, shares, saves, clicks, ai_score, ai_summary, fetched_at")
                .in("connection_id", connectionIds)
                .order("published_at", { ascending: false }),
              supabase
                .schema("contentiq")
                .from("manual_links")
                .select("id, connection_id, type, url, title, created_at")
                .in("connection_id", connectionIds)
                .order("created_at", { ascending: false }),
            ]).then(([postsResult, linksResult]) => {
              if (postsResult.error) {
                console.error("Posts load error:", postsResult.error.message);
              }
              if (linksResult.error) {
                console.error("Manual links load error:", linksResult.error.message);
              }

              const manualLinks = (linksResult.data || []) as ManualLink[];
              const nextPosts = buildPostsByPlatform(
                connections,
                (postsResult.data || []) as DbPost[],
                manualLinks
              );
              setPostsByPlatform(nextPosts);
              setAccounts(mergeConnections(ACCOUNTS, connections, nextPosts, manualLinks));
            });
          });
      })
      .catch((error) => {
        console.error("Workspace load error:", error instanceof Error ? error.message : error);
      });
  }, [workspaceId]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("ciq-theme", next ? "dark" : "light");
  }

  async function handleSignOut() {
    setSigningOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign out error:", error.message);
      setSigningOut(false);
      return;
    }

    router.push("/login");
    router.refresh();
  }

 function openTab(tab: TabId) {
  if (tab === "integrations") {
    router.push(`/app/${workspaceId}/settings`);
    return;
  }
  setActiveTab(tab);
  setActiveAccount(null);
}

  function toggleNavGroup(groupId: NavGroup["id"]) {
    setOpenNavGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  }

  if (!mounted) {
    return null;
  }

  return (
    <div style={{ ...st.root, background: css.bg, color: css.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,300&family=DM+Serif+Display:ital@0;1&display=swap');

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: ${css.bg};
        }

        .ciq-nav-tab,
        .ciq-account-tile,
        .ciq-post-row,
        .ciq-mini-card {
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
        }

        .ciq-nav-tab:hover {
          background: ${css.hoverBg} !important;
        }

        .ciq-account-tile:hover,
        .ciq-post-row:hover,
        .ciq-mini-card:hover {
          transform: translateY(-2px);
          border-color: ${css.accentBorder} !important;
          box-shadow: ${
            dark
              ? "0 18px 44px rgba(0,0,0,0.34)"
              : "0 14px 34px rgba(15,23,42,0.08)"
          };
        }

        .ciq-input::placeholder {
          color: ${css.muted};
        }

        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: ${css.border};
          border-radius: 999px;
        }

        @media (max-width: 1080px) {
          .ciq-shell {
            grid-template-columns: 1fr !important;
          }

          .ciq-sidebar {
            position: relative !important;
            height: auto !important;
            border-right: none !important;
            border-bottom: 1px solid ${css.border} !important;
          }

          .ciq-nav {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            padding: 10px 16px 0 16px !important;
          }

          .ciq-topbar {
            position: relative !important;
            flex-direction: column;
            align-items: flex-start !important;
            gap: 14px;
          }

          .ciq-top-actions {
            width: 100%;
            flex-wrap: wrap;
          }

          .ciq-summary-grid,
          .ciq-tiles-grid,
          .ciq-content-grid,
          .ciq-compare-grid,
          .ciq-integrations-grid,
          .ciq-settings-grid {
            grid-template-columns: 1fr !important;
          }

          .ciq-account-summary-row {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .ciq-account-metrics {
            flex-wrap: wrap;
            gap: 18px !important;
          }

          .ciq-calendar-row,
          .ciq-compare-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div
        className="ciq-shell"
        style={{
          ...st.shell,
          gridTemplateColumns: sidebarCollapsed ? "86px 1fr" : "270px 1fr",
        }}
      >
        {/* ───────────────── SIDEBAR ───────────────── */}
        <aside
  className="ciq-sidebar"
  style={{
    ...st.sidebar,
    background: css.sidebar,
    borderRight: `1px solid ${css.border}`,
    boxShadow: css.sidebarShadow,
  }}
>
  <Link
    href="/app/contentiq"
    style={{
      ...st.sidebarLogo,
      borderBottom: `1px solid ${css.border}`,
    }}
    aria-label="ANM ContentIQ"
  >
    <img
      src="/ANM_ContentIQ_.JPG"
      alt="ANM ContentIQ app icon"
      style={{
        ...st.logoMark,
        background: css.surface,
        border: `1px solid ${css.border}`,
        boxShadow: css.logoShadow,
      }}
    />

    {!sidebarCollapsed && (
      <div>
        <div
          style={{
            ...st.logoName,
            fontFamily: "'DM Serif Display', serif",
            color: css.text,
          }}
        >
          ANM ContentIQ
        </div>

        <div style={{ ...st.logoSub, color: css.muted }}>
          Centrum contentu i AI
        </div>
      </div>
    )}
  </Link>

  <div style={{ padding: sidebarCollapsed ? "14px 12px 10px" : "14px 16px 10px" }}>
    <button
      onClick={() => setSidebarCollapsed((current) => !current)}
      style={{
        ...st.collapseButton,
        background: css.sidebarButton,
        border: `1px solid ${css.border}`,
        color: css.muted,
        justifyContent: sidebarCollapsed ? "center" : "space-between",
      }}
      title={sidebarCollapsed ? "Rozwiń menu" : "Zwiń menu"}
    >
      {sidebarCollapsed ? (
        <ChevronsRight size={17} />
      ) : (
        <>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <ChevronsLeft size={16} />
            Zwiń menu
          </span>
          <span style={{ fontSize: 10, opacity: 0.65 }}>⌘</span>
        </>
      )}
    </button>
  </div>
<nav
  className="ciq-nav"
  style={{
    ...st.nav,
    padding: sidebarCollapsed ? "6px 10px" : "8px 12px 12px",
  }}
>
  {sidebarCollapsed ? (
    <div style={st.collapsedNavGrid}>
      {NAV_GROUPS.flatMap((group) => group.tabs).map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => openTab(tab.id)}
            className="ciq-nav-tab"
            title={tab.label}
            style={{
              ...st.collapsedNavButton,
              background: isActive ? css.activeBg : css.sidebarButton,
              color: isActive ? css.activeText : css.muted,
              border: `1px solid ${isActive ? css.accentBorder : css.border}`,
              boxShadow: isActive ? css.activeShadow : "none",
            }}
          >
            <IconView name={tab.icon} size={19} />
          </button>
        );
      })}
    </div>
  ) : (
    NAV_GROUPS.map((group) => {
      const isOpen = openNavGroups[group.id];
      const groupHasActiveTab = group.tabs.some((tab) => tab.id === activeTab);

      return (
        <div key={group.id} style={st.navGroup}>
          <button
            onClick={() => toggleNavGroup(group.id)}
            style={{
              ...st.navGroupHeader,
              background: groupHasActiveTab ? css.groupIconBg : "transparent",
              color: groupHasActiveTab ? css.sectionTitle : css.groupText,
              border: `1px solid ${
                groupHasActiveTab ? css.accentBorder : "transparent"
              }`,
            }}
          >
            <span
              style={{
                ...st.navGroupIcon,
                background: groupHasActiveTab ? css.logoBg : css.groupIconBg,
                color: groupHasActiveTab ? css.logoText : css.groupIconText,
                border: `1px solid ${
                  groupHasActiveTab ? css.accentBorder : css.border
                }`,
              }}
            >
              <IconView name={group.icon} size={16} />
            </span>

            <span style={st.navGroupTitle}>{group.title}</span>

            <span
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                opacity: 0.8,
              }}
            >
              {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </span>
          </button>

          {isOpen && (
            <div
              style={{
                ...st.navSubMenu,
                borderLeft: `1px solid ${css.border}`,
              }}
            >
              {group.tabs.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => openTab(tab.id)}
                    className="ciq-nav-tab"
                    style={{
                      ...st.navTab,
                      background: isActive ? css.subItemActive : "transparent",
                      color: isActive ? css.activeText : css.subItemText,
                      fontWeight: isActive ? 750 : 500,
                      border: `1px solid ${
                        isActive ? css.subItemActiveBorder : "transparent"
                      }`,
                      boxShadow: isActive ? css.activeShadow : "none",
                    }}
                  >
                    <span
                      style={{
                        ...st.navIcon,
                        background: isActive ? css.logoBg : css.sidebarButton,
                        color: isActive ? css.logoText : css.subItemMuted,
                        border: `1px solid ${
                          isActive ? css.subItemActiveBorder : css.border
                        }`,
                      }}
                    >
                      <IconView name={tab.icon} size={16} />
                    </span>

                    <span style={st.navTabLabel}>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    })
  )}
</nav>

  <div style={{ ...st.sidebarBottom, padding: sidebarCollapsed ? 10 : 16 }}>
    <div
      style={{
        ...st.legalLinks,
        borderTop: `1px solid ${css.border}`,
        paddingTop: sidebarCollapsed ? 8 : 10,
      }}
    >
      {sidebarCollapsed ? (
        <>
          <Link
            href="/privacy"
            title="Polityka prywatności"
            style={{
              ...st.legalIconLink,
              color: css.muted,
              border: `1px solid ${css.border}`,
              background: css.sidebarButton,
            }}
          >
            <Shield size={15} />
          </Link>

          <Link
            href="/terms"
            title="Regulamin"
            style={{
              ...st.legalIconLink,
              color: css.muted,
              border: `1px solid ${css.border}`,
              background: css.sidebarButton,
            }}
          >
            <ScrollText size={15} />
          </Link>
        </>
      ) : (
        <>
          <Link href="/privacy" style={{ ...st.legalTextLink, color: css.muted }}>
            <Shield size={14} />
            Polityka prywatności
          </Link>

          <Link href="/terms" style={{ ...st.legalTextLink, color: css.muted }}>
            <ScrollText size={14} />
            Regulamin
          </Link>
        </>
      )}
    </div>

    <button
      onClick={toggleTheme}
      style={{
        ...st.themeToggle,
        background: css.sidebarButton,
        border: `1px solid ${css.border}`,
        color: css.muted,
      }}
    >
      {sidebarCollapsed ? (
        dark ? <Sun size={16} /> : <Moon size={16} />
      ) : (
        <>
          {dark ? <Sun size={16} /> : <Moon size={16} />}
          {dark ? "Jaśniejszy tryb" : "Ciemniejszy tryb"}
        </>
      )}
    </button>

    <button
      onClick={handleSignOut}
      disabled={signingOut}
      style={{
        ...st.signoutBtn,
        color: "#ef4444",
        background: "#ef444414",
        border: "1px solid #ef444440",
      }}
    >
      {sidebarCollapsed ? (
        <LogOut size={16} />
      ) : (
        <>
          <LogOut size={16} />
          {signingOut ? "Wylogowywanie..." : "Wyloguj"}
        </>
      )}
    </button>
  </div>
</aside>

        {/* ───────────────── MAIN ───────────────── */}
 <div style={{ ...st.mainArea, background: css.bg }}>
          <header
            className="ciq-topbar"
            style={{
              ...st.topbar,
              borderBottom: `1px solid ${css.border}`,
              background: css.bg,
            }}
          >
            <div>
              <div style={{ ...st.tabLabel, color: css.accent }}>
                {NAV_TABS.find((tab) => tab.id === activeTab)?.label}
              </div>

              <h1
                style={{
                  ...st.pageTitle,
                  fontFamily: "'DM Serif Display', serif",
                  color: css.text,
                }}
              >
                {activeAccount
                  ? activeAccount.name
                  : "Centrum analityki contentu"}
              </h1>

              <p style={{ ...st.pageSubtitle, color: css.muted }}>
                Wszystkie konta, wyniki live i rekomendacje AI w jednym miejscu.
              </p>
            </div>

            <div className="ciq-top-actions" style={st.topActions}>
              <Link
                href="/"
                style={{
                  ...st.topBtn,
                  background: css.surface,
                  border: `1px solid ${css.border}`,
                  color: css.muted,
                  textDecoration: "none",
                }}
              >
                Strona główna
              </Link>

              <button
                onClick={() => openTab("studio")}
                style={{
                  ...st.topBtn,
                  background: css.accent,
                  color: "#050505",
                  border: "none",
                }}
              >
                + Nowy content
              </button>
            </div>
          </header>

          <div style={st.content}>
 {/* ================= PODSUMOWANIE KONT ================= */}
 {activeTab === "accounts" && !activeAccount && (
              <div>
                <div className="ciq-summary-grid" style={st.summaryGrid}>
                  <div
                    className="ciq-mini-card"
                    style={{
                      ...st.summaryCard,
                      background: css.surface,
                      border: `1px solid ${css.border}`,
                    }}
                  >
                    <p style={{ ...st.smallLabel, color: css.muted }}>
                      Analiza live
                    </p>

                    <h3 style={{ ...st.summaryValue, color: css.text }}>
                      7 kanałów w jednym widoku
                    </h3>

                    <p style={{ ...st.summaryNote, color: css.muted }}>
                      Instagram, Facebook, LinkedIn, TikTok, YouTube, Spotify i
                      Blog zebrane w jednym centrum analitycznym.
                    </p>
                  </div>

                  <div
                    className="ciq-mini-card"
                    style={{
                      ...st.summaryCard,
                      background: css.aiBg,
                      border: `1px solid ${css.aiBorder}`,
                    }}
                  >
                    <p style={{ ...st.smallLabel, color: css.aiText }}>
                      ✦ AI rekomendacja
                    </p>

                    <h3 style={{ ...st.summaryValue, color: css.text }}>
                      Najmocniejszy kanał: {bestAccount.name}
                    </h3>

                    <p style={{ ...st.summaryNote, color: css.muted }}>
                      {bestAccount.aiTag}
                    </p>
                  </div>

                  <div
                    className="ciq-mini-card"
                    style={{
                      ...st.summaryCard,
                      background: css.aiBgSoft,
                      border: `1px solid ${css.aiBorder}`,
                    }}
                  >
                    <p style={{ ...st.smallLabel, color: css.aiText }}>
                      ✦ AI alert
                    </p>

                    <h3 style={{ ...st.summaryValue, color: css.text }}>
                      Do poprawy: {weakestAccount.name}
                    </h3>

                    <p style={{ ...st.summaryNote, color: css.muted }}>
                      {weakestAccount.aiTag}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    ...st.panel,
                    background: css.aiBg,
                    border: `1px solid ${css.aiBorder}`,
                    marginBottom: 22,
                  }}
                >
                  <p style={{ ...st.smallLabel, color: css.aiText }}>
                    ✦ AI analiza cross-platform
                  </p>

                  <div style={st.aiStack}>
                    {realInsights.map((insight, index) => (
                      <div
                        key={index}
                        style={{
                          ...st.aiInsightRow,
                          borderLeft: `3px solid ${
                            insight.type === "up"
                              ? "#22c55e"
                              : insight.type === "warn"
                                ? "#f59e0b"
                                : css.aiText
                          }`,
                        }}
                      >
                        <p style={{ ...st.insightText, color: css.text }}>
                          {insight.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ ...st.tilesLabel, color: css.muted }}>
                  Podsumowanie kont — kliknij kafelek, aby zobaczyć szczegóły i
                  publikacje
                </div>

                <div className="ciq-tiles-grid" style={st.tilesGrid}>
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      className="ciq-account-tile"
                      onClick={() => setActiveAccount(account)}
                      style={{
                        ...st.tile,
                        background: css.surface,
                        border: `1px solid ${css.border}`,
                      }}
                    >
                      <span
                        style={{
                          ...st.socialWatermark,
                          color: account.color,
                        }}
                      >
                        {SOCIAL_ICONS[account.id]}
                      </span>

                      <div
                        style={{
                          ...st.tileTopLine,
                          background: account.color,
                        }}
                      />

                      <div style={st.tileTop}>
                        <div>
                          <div style={{ ...st.tileName, color: css.text }}>
                            {account.name}
                          </div>

                          <div style={{ ...st.tileHandle, color: css.muted }}>
                            {account.handle}
                          </div>
                        </div>

                        <span style={{ ...st.tileArrow, color: css.muted }}>
                          →
                        </span>
                      </div>

                      <div style={st.connectionRow}>
                        <span
                          style={{
                            ...st.connectionPill,
                            background: account.connected
                              ? "#22c55e18"
                              : "#f59e0b18",
                            color: account.connected ? "#22c55e" : "#f59e0b",
                          }}
                        >
                          {account.connected ? "API podłączone" : "Do podłączenia"}
                        </span>

                        <span style={{ color: css.muted, fontSize: 11 }}>
                          Sync: {account.lastSync}
                        </span>
                      </div>

                      <div style={{ ...st.liveLabel, color: css.muted }}>
                        Analiza live
                      </div>

                      <ScoreBar score={account.score} />

                      <div
                        style={{
                          ...st.tileStats,
                          borderTop: `1px solid ${css.border}`,
                        }}
                      >
                        <div>
                          <div style={{ ...st.tileStatValue, color: css.text }}>
                            {account.posts}
                          </div>
                          <div style={{ ...st.tileStatLabel, color: css.muted }}>
                            posty
                          </div>
                        </div>

                        <div>
                          <div style={{ ...st.tileStatValue, color: css.text }}>
                            {account.engRate}
                          </div>
                          <div style={{ ...st.tileStatLabel, color: css.muted }}>
                            engagement
                          </div>
                        </div>

                        <div>
                          <div style={{ ...st.tileStatValue, color: css.text }}>
                            {account.reach}
                          </div>
                          <div style={{ ...st.tileStatLabel, color: css.muted }}>
                            średni zasięg
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          ...st.tileBestFormat,
                          background: css.liveSoft,
                          border: `1px solid ${css.border}`,
                        }}
                      >
                        <span style={{ ...st.smallMiniLabel, color: css.muted }}>
                          Najlepszy format
                        </span>
                        <span style={{ color: css.text, fontWeight: 700 }}>
                          {account.bestFormat}
                        </span>
                      </div>

                      <div
                        style={{
                          ...st.tileAI,
                          background: css.aiBgSoft,
                          border: `1px solid ${css.aiBorder}`,
                          color: css.text,
                        }}
                      >
                        <div style={{ ...st.aiBoxLabel, color: css.aiText }}>
                          ✦ AI wniosek
                        </div>

                        <span style={{ fontSize: 11, lineHeight: 1.55 }}>
                          {account.aiTag}
                        </span>
                      </div>

                      <div
                        style={{
                          ...st.tileTrend,
                          color: account.trend === 0 ? css.muted : account.trend > 0 ? "#22c55e" : "#ef4444",
                        }}
                      >
                        {account.trend === 0
                          ? "0% miesiąc do miesiąca"
                          : `${account.trend > 0 ? "↑" : "↓"} ${Math.abs(account.trend)}% miesiąc do miesiąca`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

 {/* ================= SZCZEGÓŁY KONTA ================= */}
 {activeTab === "brand" && (
              <BrandVoice dark={dark} workspaceId={workspaceId} />
            )}

 {activeTab === "chat" && (
              <AIChat dark={dark} workspaceId={workspaceId} />
            )}

 {activeTab === "accounts" && activeAccount && (
              <div>
                <button
                  onClick={() => setActiveAccount(null)}
                  style={{
                    ...st.backBtn,
                    color: css.muted,
                    background: css.surface,
                    border: `1px solid ${css.border}`,
                  }}
                >
                  ← Wszystkie konta
                </button>

                <div
                  style={{
                    ...st.accountSummary,
                    background: css.surface,
                    border: `1px solid ${css.border}`,
                  }}
                >
                  <span
                    style={{
                      ...st.accountWatermark,
                      color: activeAccount.color,
                    }}
                  >
                    {SOCIAL_ICONS[activeAccount.id]}
                  </span>

                  <div
                    style={{
                      height: 4,
                      background: activeAccount.color,
                      borderRadius: "14px 14px 0 0",
                      margin: "-20px -20px 16px",
                    }}
                  />

                  <div
                    className="ciq-account-summary-row"
                    style={st.accountSummaryRow}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 32,
                          fontFamily: "'DM Serif Display', serif",
                          color: css.text,
                        }}
                      >
                        {activeAccount.name}
                      </div>

                      <div style={{ fontSize: 13, color: css.muted }}>
                        {activeAccount.handle}
                      </div>

                      {activeAccount.manualAccountUrl && (
                        <a
                          href={activeAccount.manualAccountUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex",
                            marginTop: 8,
                            color: activeAccount.color,
                            fontSize: 12,
                            fontWeight: 900,
                            textDecoration: "none",
                          }}
                        >
                          Otwórz profil ↗
                        </a>
                      )}
                    </div>

                    <div className="ciq-account-metrics" style={st.accountMetrics}>
                      {[
                        ["AI Score", `${activeAccount.score}/100`],
                        ["Posty", String(activeAccount.posts)],
                        ["Engagement", activeAccount.engRate],
                        ["Średni zasięg", activeAccount.reach],
                        ["Najlepszy format", activeAccount.bestFormat],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <div style={{ ...st.metricValue, color: css.text }}>
                            {value}
                          </div>

                          <div style={{ ...st.metricLabel, color: css.muted }}>
                            {label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      ...st.tileAI,
                      background: css.aiBg,
                      border: `1px solid ${css.aiBorder}`,
                      color: css.text,
                      marginTop: 16,
                    }}
                  >
                    <div style={{ ...st.aiBoxLabel, color: css.aiText }}>
                      ✦ AI analiza tej platformy
                    </div>

                    <span>{activeAccount.aiTag}</span>
                  </div>
                </div>

                <div style={{ ...st.postsLabel, color: css.muted }}>
                  Ostatnie publikacje — {postsByPlatform[activeAccount.id]?.length ?? 0}
                </div>

                <div style={st.postsList}>
                  {(postsByPlatform[activeAccount.id] ?? []).map((post) => {
                    const scoreColor = getScoreColor(post.score);

                    const metrics = [
                      ["Zasięg", post.reach],
                      [
                        "Polubienia",
                        post.likes > 0 ? post.likes.toLocaleString() : "—",
                      ],
                      ["Komentarze", String(post.comments)],
                      ["Udostępnienia", post.shares ? String(post.shares) : "—"],
                      ["Zapisy", post.saves ? String(post.saves) : "—"],
                      ["Data", post.date],
                      ["Typ", post.type],
                    ];

                    return (
                      <div
                        key={post.id}
                        className="ciq-post-row"
                        style={{
                          ...st.postRow,
                          background: css.surface,
                          border: `1px solid ${css.border}`,
                        }}
                      >
                        <div style={st.postLeft}>
                          <div style={{ ...st.postTitle, color: css.text }}>
                            {post.title}
                          </div>

                          {post.url && (
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                marginTop: 7,
                                color: activeAccount.color,
                                fontSize: 11,
                                fontWeight: 800,
                                textDecoration: "none",
                              }}
                            >
                              Otwórz link ↗
                            </a>
                          )}

                          <div style={st.postMeta}>
                            {metrics.map(([label, value]) => (
                              <span
                                key={`${post.id}-${label}`}
                                style={{ ...st.metaItem, color: css.muted }}
                              >
                                {label}: {value}
                              </span>
                            ))}
                          </div>

                          <div style={st.postBadges}>
                            <span
                              style={{
                                ...st.badge,
                                background: `${activeAccount.color}18`,
                                color: activeAccount.color,
                              }}
                            >
                              {post.source === "scheduled_in_app"
                                ? "Zaplanowany w aplikacji"
                                : post.source === "created_in_app"
                                  ? "Utworzony w aplikacji"
                                  : post.source === "manual_link"
                                    ? "Link ręczny"
                                    : "Import / API"}
                            </span>

                            <span
                              style={{
                                ...st.badge,
                                background: css.activeBg,
                                color: css.muted,
                              }}
                            >
                              {post.status}
                            </span>
                          </div>

                          <div
                            style={{
                              ...st.postAI,
                              background: css.aiBgSoft,
                              border: `1px solid ${css.aiBorder}`,
                              color: css.text,
                            }}
                          >
                            <span style={{ color: css.aiText, fontWeight: 800 }}>
                              ✦ AI
                            </span>
                            <span>{post.ai}</span>
                          </div>
                        </div>

                        <div style={st.postScoreBox}>
                          <div
                            style={{
                              fontSize: 30,
                              fontWeight: 700,
                              color: scoreColor,
                              fontFamily: "'DM Serif Display', serif",
                            }}
                          >
                            {post.score}
                          </div>

                          <div style={{ fontSize: 10, color: css.muted }}>
                            AI Score
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

 {/* ================= PODSUMOWANIE CONTENTU ================= */}
   {activeTab === "content" && (
              <div>
                <div
                  style={{
                    ...st.panel,
                    background: css.aiBg,
                    border: `1px solid ${css.aiBorder}`,
                    marginBottom: 18,
                  }}
                >
                  <p style={{ ...st.smallLabel, color: css.aiText }}>
                    ✦ AI podsumowanie contentu
                  </p>

                  <h2
                    style={{
                      ...st.sectionTitle,
                      color: css.text,
                      fontFamily: "'DM Serif Display', serif",
                    }}
                  >
                    Ostatnie treści ze wszystkich kanałów
                  </h2>

                  <p style={{ ...st.sectionText, color: css.muted }}>
                    Tutaj widzisz najnowszy content ze wszystkich platform bez
                    skakania między kanałami. AI od razu pokazuje, co zadziałało
                    najlepiej i gdzie warto przerabiać treść na inny format.
                  </p>
                </div>

                <div className="ciq-content-grid" style={st.contentGrid}>
                  {latestContentGroups.map(({ account, posts }) => (
                    <div
                      key={account.id}
                      className="ciq-mini-card"
                      style={{
                        ...st.contentCard,
                        background: css.surface,
                        border: `1px solid ${css.border}`,
                      }}
                    >
                      <span
                        style={{
                          ...st.contentWatermark,
                          color: account.color,
                        }}
                      >
                        {SOCIAL_ICONS[account.id]}
                      </span>

                      <div style={st.contentCardHeader}>
                        <div>
                          <div style={{ ...st.tileName, color: css.text }}>
                            {account.name}
                          </div>
                          <div style={{ ...st.tileHandle, color: css.muted }}>
                            {account.handle}
                          </div>
                        </div>

                        <span
                          style={{
                            ...st.platformDot,
                            background: account.color,
                          }}
                        />
                      </div>

                      <div style={st.miniPostsStack}>
                        {posts.map((post) => (
                          <div
                            key={post.id}
                            style={{
                              ...st.miniPost,
                              border: `1px solid ${css.border}`,
                              background: css.liveSoft,
                            }}
                          >
                            <div
                              style={{ ...st.miniPostTitle, color: css.text }}
                            >
                              {post.title}
                            </div>

                            {post.url && (
                              <a
                                href={post.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "inline-flex",
                                  marginTop: 6,
                                  color: account.color,
                                  fontSize: 11,
                                  fontWeight: 800,
                                  textDecoration: "none",
                                }}
                              >
                                Otwórz link ↗
                              </a>
                            )}

                            <div
                              style={{ ...st.miniPostMeta, color: css.muted }}
                            >
                              {post.type} • {post.date} • zasięg {post.reach}
                            </div>

                            <div
                              style={{
                                ...st.miniAI,
                                background: css.aiBgSoft,
                                border: `1px solid ${css.aiBorder}`,
                              }}
                            >
                              <span
                                style={{ ...st.aiBoxLabel, color: css.aiText }}
                              >
                                ✦ AI
                              </span>

                              <span
                                style={{
                                  color: css.text,
                                  fontSize: 11,
                                  lineHeight: 1.5,
                                }}
                              >
                                {post.ai}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

 {/* ================= PORÓWNANIE CONTENTU ================= */}
 {activeTab === "compare" && (
              <div>
                <div
                  style={{
                    ...st.panel,
                    background: css.surface,
                    border: `1px solid ${css.border}`,
                    marginBottom: 18,
                  }}
                >
                  <p style={{ ...st.smallLabel, color: css.accent }}>
                    Porównanie platform
                  </p>

                  <h2
                    style={{
                      ...st.sectionTitle,
                      color: css.text,
                      fontFamily: "'DM Serif Display', serif",
                    }}
                  >
                    Gdzie jaki content ma przewagę?
                  </h2>

                  <p style={{ ...st.sectionText, color: css.muted }}>
                    Porównuj platformy obok siebie i sprawdzaj, gdzie dany styl,
                    format albo temat działa najlepiej.
                  </p>
                </div>

                <div
                  style={{
                    ...st.panel,
                    background: css.aiBg,
                    border: `1px solid ${css.aiBorder}`,
                    marginBottom: 18,
                  }}
                >
                  <p style={{ ...st.smallLabel, color: css.aiText }}>
                    ✦ AI wniosek globalny
                  </p>

                  <p style={{ ...st.sectionText, color: css.text }}>
                    {realInsights[0]?.text || "Brak pobranych danych do porównania platform. Po synchronizacji aplikacja pokaże tutaj realny wniosek."}
                  </p>
                </div>

                <div style={st.compareTable}>
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="ciq-compare-row ciq-post-row"
                      style={{
                        ...st.compareRow,
                        background: css.surface,
                        border: `1px solid ${css.border}`,
                      }}
                    >
                      <div>
                        <strong style={{ color: css.text }}>
                          {account.name}
                        </strong>

                        <p
                          style={{
                            fontSize: 12,
                            color: css.muted,
                            margin: "4px 0 0",
                          }}
                        >
                          {account.handle}
                        </p>
                      </div>

                      <div>
                        <div
                          style={{
                            ...st.smallMiniLabel,
                            color: css.muted,
                            marginBottom: 6,
                          }}
                        >
                          AI Score
                        </div>

                        <ScoreBar score={account.score} />
                      </div>

                      <div style={{ fontSize: 12, color: css.muted }}>
                        <span style={{ color: css.text, fontWeight: 700 }}>
                          Najlepszy format:
                        </span>
                        <br />
                        <span style={{ color: account.color }}>
                          {account.bestFormat}
                        </span>
                      </div>

                      <div
                        style={{
                          ...st.compareAIBox,
                          background: css.aiBgSoft,
                          border: `1px solid ${css.aiBorder}`,
                        }}
                      >
                        <span style={{ ...st.aiBoxLabel, color: css.aiText }}>
                          ✦ AI
                        </span>

                        <span
                          style={{
                            color: css.text,
                            fontSize: 11,
                            lineHeight: 1.5,
                          }}
                        >
                          {account.aiTag}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

 {/* ================= HARMONOGRAM ================= */}
   {activeTab === "calendar" && (
  <Schedule dark={dark} workspaceId={workspaceId} />
)}

 {/* ================= CONTENT STUDIO ================= */}
 {activeTab === "studio" && (
              <div>
                <div
                  style={{
                    ...st.panel,
                    background: css.surface,
                    border: `1px solid ${css.border}`,
                    marginBottom: 18,
                  }}
                >
                  <p style={{ ...st.smallLabel, color: css.accent }}>
                    Content Studio AI
                  </p>

                  <h2
                    style={{
                      ...st.sectionTitle,
                      color: css.text,
                      fontFamily: "'DM Serif Display', serif",
                    }}
                  >
                    Twórz, analizuj, adaptuj i testuj hooki
                  </h2>

                  <p style={{ ...st.sectionText, color: css.muted }}>
                    Ten moduł zna treść przed publikacją. Dzięki temu po
                    opublikowaniu system porównuje treść z realnym wynikiem i
                    uczy AI, jaki styl działa najlepiej na danej platformie.
                  </p>
                </div>

                <ContentStudio dark={dark} workspaceId={workspaceId} />
              </div>
            )}
{/* ================= VIDEO STUDIO ================= */}
{activeTab === "video" && (
  <div>
    <div
      style={{
        ...st.panel,
        background: css.surface,
        border: `1px solid ${css.border}`,
        marginBottom: 18,
      }}
    >
      <p style={{ ...st.smallLabel, color: css.accent }}>
        Video Studio
      </p>

      <h2
        style={{
          ...st.sectionTitle,
          color: css.text,
          fontFamily: "'DM Serif Display', serif",
        }}
      >
        TikTok, Reels i Shorts od pomysłu do scenariusza
      </h2>

      <p style={{ ...st.sectionText, color: css.muted }}>
        Ten moduł tworzy pełny brief video: hook, scenariusz, ujęcia,
        teksty na ekranie, opis posta, miniaturę i wskazówki retencyjne.
      </p>
    </div>

    <VideoStudio dark={dark} workspaceId={workspaceId} />
  </div>
)}

{/* ================= SHORT STUDIO ================= */}
{activeTab === "shorts" && (
  <div>
    <div
      style={{
        ...st.panel,
        background: css.surface,
        border: `1px solid ${css.border}`,
        marginBottom: 18,
      }}
    >
      <p style={{ ...st.smallLabel, color: css.accent }}>
        Short Studio
      </p>

      <h2
        style={{
          ...st.sectionTitle,
          color: css.text,
          fontFamily: "'DM Serif Display', serif",
        }}
      >
        Jedna idea, wiele krótkich video
      </h2>

      <p style={{ ...st.sectionText, color: css.muted }}>
        Przygotuj jeden temat, a AI stworzy osobne wersje pod TikTok,
        Instagram Reels, Facebook Reels, YouTube Shorts i LinkedIn Video.
      </p>
    </div>

    <ShortStudio dark={dark} workspaceId={workspaceId} />
  </div>
)}
{/* ================= CREATIVE STUDIO ================= */}
{activeTab === "creative" && (
  <div>
    <div
      style={{
        ...st.panel,
        background: css.surface,
        border: `1px solid ${css.border}`,
        marginBottom: 18,
      }}
    >
      <p style={{ ...st.smallLabel, color: css.accent }}>
        Creative Studio
      </p>

      <h2
        style={{
          ...st.sectionTitle,
          color: css.text,
          fontFamily: "'DM Serif Display', serif",
        }}
      >
        Generowanie grafik AI do contentu
      </h2>

      <p style={{ ...st.sectionText, color: css.muted }}>
        Twórz grafiki do postów, okładki, miniatury i materiały contentowe.
        Teraz przygotowujemy komponent i strukturę, a w następnym kroku
        podepniemy generowanie obrazów przez API.
      </p>
    </div>

    <CreativeStudio dark={dark} workspaceId={workspaceId} />
  </div>
)}
 {/* ================= SZABLONY ================= */}
 {activeTab in TEMPLATE_VIEWS && (
              <div>
                <div
                  style={{
                    ...st.panel,
                    background: css.surface,
                    border: `1px solid ${css.border}`,
                    marginBottom: 18,
                  }}
                >
                  <p style={{ ...st.smallLabel, color: css.accent }}>
                    {TEMPLATE_VIEWS[activeTab as keyof typeof TEMPLATE_VIEWS].label}
                  </p>

                  <h2
                    style={{
                      ...st.sectionTitle,
                      color: css.text,
                      fontFamily: "'DM Serif Display', serif",
                    }}
                  >
                    {TEMPLATE_VIEWS[activeTab as keyof typeof TEMPLATE_VIEWS].title}
                  </h2>

                  <p style={{ ...st.sectionText, color: css.muted }}>
                    Tutaj trzymasz treści zapisane jako szablon. Media dodajesz
                    dopiero w Content Studio przed zapisem, planowaniem albo
                    publikacją.
                  </p>
                </div>

                <Templates
                  dark={dark}
                  workspaceId={workspaceId}
                  kind={TEMPLATE_VIEWS[activeTab as keyof typeof TEMPLATE_VIEWS].kind}
                  onOpenStudio={() => setActiveTab(TEMPLATE_VIEWS[activeTab as keyof typeof TEMPLATE_VIEWS].targetTab)}
                />
              </div>
  )}

 {/* ================= AI PARTNER ================= */}
 {activeTab === "partner" && (
              <div>
                <div
                  style={{
                    ...st.panel,
                    background: css.surface,
                    border: `1px solid ${css.border}`,
                    marginBottom: 18,
                  }}
                >
                  <p style={{ ...st.smallLabel, color: css.accent }}>
                    AI Partner
                  </p>

                  <h2
                    style={{
                      ...st.sectionTitle,
                      color: css.text,
                      fontFamily: "'DM Serif Display', serif",
                    }}
                  >
                    Samouczący się partner contentowy
                  </h2>

                  <p style={{ ...st.sectionText, color: css.muted }}>
                    Ten moduł łączy Brand Voice, wybrane szablony, szkice i realne
                    wyniki z social mediów. AI ma uczyć się stylu twórcy oraz
                    podpowiadać, co rozwijać, co testować i jak dopasować treść
                    do platformy.
                  </p>
                </div>

                <AIPartner dark={dark} workspaceId={workspaceId} />
              </div>
    )}

 {/* ================= INTEGRACJE ================= */}
 {activeTab === "integrations" && (
              <div className="ciq-integrations-grid" style={st.integrationsGrid}>
                {INTEGRATIONS.map((integration) => (
                  <div
                    key={integration.name}
                    className="ciq-mini-card"
                    style={{
                      ...st.panel,
                      background: css.surface,
                      border: `1px solid ${css.border}`,
                    }}
                  >
                    <p style={{ ...st.smallLabel, color: css.accent }}>
                      {integration.status}
                    </p>

                    <h2
                      style={{
                        ...st.integrationTitle,
                        color: css.text,
                        fontFamily: "'DM Serif Display', serif",
                      }}
                    >
                      {integration.name}
                    </h2>

                    <p style={{ ...st.sectionText, color: css.muted }}>
                      {integration.description}
                    </p>

                    <button
                      style={{
                        ...st.secondaryButton,
                        border: `1px solid ${css.border}`,
                        color: css.muted,
                        background: css.liveSoft,
                      }}
                    >
                      Skonfiguruj
                    </button>
                  </div>
                ))}
              </div>
            )}

 {/* ================= USTAWIENIA ================= */}
   {activeTab === "settings" && (
              <div className="ciq-settings-grid" style={st.settingsGrid}>
                <div
                  style={{
                    ...st.panel,
                    background: css.surface,
                    border: `1px solid ${css.border}`,
                  }}
                >
                  <p style={{ ...st.smallLabel, color: css.accent }}>
                    Brand Voice
                  </p>

                  <h2
                    style={{
                      ...st.sectionTitle,
                      color: css.text,
                      fontFamily: "'DM Serif Display', serif",
                    }}
                  >
                    Styl marki i zasady pisania
                  </h2>

                  <p style={{ ...st.sectionText, color: css.muted }}>
                    Ton komunikacji, słowa preferowane, CTA, przykłady
                    najlepszych postów, persony i styl publikacji.
                  </p>
                </div>

                <div
                  style={{
                    ...st.panel,
                    background: css.surface,
                    border: `1px solid ${css.border}`,
                  }}
                >
                  <p style={{ ...st.smallLabel, color: css.accent }}>
                    Ustawienia aplikacji
                  </p>

                  <h2
                    style={{
                      ...st.sectionTitle,
                      color: css.text,
                      fontFamily: "'DM Serif Display', serif",
                    }}
                  >
                    Konta, integracje i preferencje
                  </h2>

                  <p style={{ ...st.sectionText, color: css.muted }}>
                    Tutaj później podepniemy ustawienia zespołu, połączonych
                    kont, API, domyślne platformy i logikę publikacji.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── THEME VARS ───────────────────────────────────────────────────────────────

const darkVars = {
  bg: "#111318",
  sidebar: "#171A21",
  surface: "#1E222B",
  text: "#F4F5F7",
  muted: "#A7ADB8",
  border: "#2C313D",

  accent: "#8FB7FF",
  activeBg: "#253044",
  hoverBg: "#242A35",
  accentBorder: "#456EA8",
  activeText: "#FFFFFF",

  groupText: "#BFD3FF",
  groupIconBg: "#222834",
  groupIconText: "#BFD3FF",

  sidebarButton: "#202631",
  sidebarShadow: "8px 0 30px rgba(0,0,0,0.18)",
  activeShadow: "0 10px 26px rgba(63, 103, 160, 0.20)",
  logoShadow: "0 10px 28px rgba(0,0,0,0.20)",

  aiBg: "#172337",
  aiBgSoft: "#1C2A3D",
  aiBorder: "#315E8E",
  aiText: "#8FD7FF",

  liveSoft: "#1A1D25",
  logoBg: "#EAF2FF",
  logoText: "#101827",

  sectionTitle: "#8FB7FF",
  subItemText: "#C7CED9",
  subItemMuted: "#98A2B3",
  subItemHover: "#242A35",
  subItemActive: "#253044",
  subItemActiveBorder: "#456EA8",
};

const lightVars = {
  bg: "#EEF1F5",
  sidebar: "#F8FAFC",
  surface: "#FFFFFF",
  text: "#1B1F27",
  muted: "#667085",
  border: "#D9DEE7",

  accent: "#315E8E",
  activeBg: "#E8F1FF",
  hoverBg: "#EEF4FC",
  accentBorder: "#AFC8E8",
  activeText: "#152033",

  groupText: "#315E8E",
  groupIconBg: "#EEF3FA",
  groupIconText: "#315E8E",

  sidebarButton: "#F0F4F8",
  sidebarShadow: "8px 0 28px rgba(15,23,42,0.06)",
  activeShadow: "0 10px 24px rgba(49, 94, 142, 0.12)",
  logoShadow: "0 10px 20px rgba(15,23,42,0.08)",

  aiBg: "#EAF6FF",
  aiBgSoft: "#F3FAFF",
  aiBorder: "#B9DCF5",
  aiText: "#156B9D",

  liveSoft: "#F6F8FB",
  logoBg: "#1B1F27",
  logoText: "#FFFFFF",

  sectionTitle: "#315E8E",
  subItemText: "#374151",
  subItemMuted: "#6B7280",
  subItemHover: "#EEF4FC",
  subItemActive: "#E6F0FF",
  subItemActiveBorder: "#7EA6E8",
};

// ─── STATIC STYLES ────────────────────────────────────────────────────────────

const st: Record<string, CSSProperties> = {
  root: {
    transition: "background 0.3s",
    minHeight: "100vh",
    fontFamily: "'Plus Jakarta Sans', 'DM Sans', 'Helvetica Neue', sans-serif",
  },

  shell: {
    display: "grid",
    gridTemplateColumns: "270px 1fr",
    minHeight: "100vh",
    transition: "grid-template-columns 0.22s ease",
  },

  sidebar: {
    display: "flex",
    flexDirection: "column",
    padding: "0",
    position: "sticky",
    top: 0,
    height: "100vh",
    transition: "background 0.3s, box-shadow 0.3s",
    overflow: "hidden",
  },

  sidebarLogo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "20px 18px",
    textDecoration: "none",
    minHeight: 84,
  },

  collapseButton: {
    width: "100%",
    minHeight: 42,
    borderRadius: 16,
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
    transition: "all 0.18s ease",
  },

  logoMark: {
    width: 46,
    height: 46,
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    objectFit: "cover",
    fontSize: 12,
    fontWeight: 900,
    flexShrink: 0,
  },

  logoName: {
    fontSize: 19,
    letterSpacing: "-0.03em",
    lineHeight: 1,
  },

  logoSub: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.11em",
    marginTop: 5,
  },

  nav: {
    flex: 1,
    padding: "8px 0",
    overflowY: "auto",
  },

  navGroup: {
    marginBottom: 14,
  },

  navGroupHeader: {
    width: "100%",
    minHeight: 42,
    borderRadius: 16,
    padding: "8px 10px",
    display: "flex",
    alignItems: "center",
    gap: 11,
    fontSize: 11,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.13em",
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
    transition: "all 0.18s ease",
  },

  navGroupTitle: {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    lineHeight: 1.2,
  },

  navGroupIcon: {
    width: 34,
    minWidth: 34,
    height: 34,
    borderRadius: 12,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  navSubMenu: {
    marginLeft: 17,
    marginTop: 8,
    paddingLeft: 14,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  collapsedNavGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 9,
  },

  collapsedNavButton: {
    width: "100%",
    aspectRatio: "1 / 1",
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
    transition: "all 0.18s ease",
  },

  navTab: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    width: "100%",
    padding: "9px 10px",
    borderRadius: 14,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
    textAlign: "left",
    transition: "all 0.18s ease",
  },

  navTabLabel: {
    lineHeight: 1.35,
  },

  navIcon: {
    width: 32,
    minWidth: 32,
    height: 32,
    borderRadius: 11,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  sidebarBottom: {
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  themeToggle: {
    padding: "10px 12px",
    borderRadius: 14,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontWeight: 800,
    transition: "all 0.18s ease",
  },

  signoutBtn: {
    padding: "10px 12px",
    borderRadius: 14,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontWeight: 800,
    transition: "all 0.18s ease",
  },

  legalLinks: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  legalTextLink: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    textDecoration: "none",
    padding: "7px 2px",
    fontWeight: 700,
  },

  legalIconLink: {
    width: 34,
    height: 34,
    borderRadius: 12,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
  },

  mainArea: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    transition: "background 0.3s",
  },

  topbar: {
    padding: "18px 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },

  tabLabel: {
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    marginBottom: 4,
  },

  pageTitle: {
    fontSize: 32,
    fontWeight: 400,
    letterSpacing: "-0.03em",
    margin: 0,
  },

  pageSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },

  topActions: {
    display: "flex",
    gap: 10,
  },

  topBtn: {
    padding: "10px 16px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "inherit",
  },

  content: {
    padding: "24px 28px 34px",
    flex: 1,
    overflowY: "auto",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 14,
    marginBottom: 18,
  },

  summaryCard: {
    borderRadius: 20,
    padding: 20,
  },

  summaryValue: {
    fontSize: 24,
    fontWeight: 400,
    margin: "8px 0",
    lineHeight: 1.15,
  },

  summaryNote: {
    fontSize: 12,
    lineHeight: 1.65,
    margin: 0,
  },

  panel: {
    borderRadius: 20,
    padding: 22,
  },

  aiStack: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginTop: 14,
  },

  aiInsightRow: {
    paddingLeft: 12,
  },

  insightText: {
    fontSize: 13,
    lineHeight: 1.7,
    margin: 0,
  },

  smallLabel: {
    fontSize: 10,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    margin: 0,
  },

  smallMiniLabel: {
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  tilesLabel: {
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 14,
  },

  tilesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 14,
  },

  tile: {
    borderRadius: 22,
    padding: 18,
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
    position: "relative",
    overflow: "hidden",
  },

  socialWatermark: {
    position: "absolute",
    right: 16,
    top: 8,
    fontSize: 88,
    fontWeight: 900,
    opacity: 0.07,
    lineHeight: 1,
    pointerEvents: "none",
  },

  accountWatermark: {
    position: "absolute",
    right: 24,
    top: 14,
    fontSize: 110,
    fontWeight: 900,
    opacity: 0.06,
    lineHeight: 1,
    pointerEvents: "none",
  },

  contentWatermark: {
    position: "absolute",
    right: 16,
    top: 8,
    fontSize: 76,
    fontWeight: 900,
    opacity: 0.06,
    lineHeight: 1,
    pointerEvents: "none",
  },

  tileTopLine: {
    height: 4,
    borderRadius: "14px 14px 0 0",
    margin: "-18px -18px 14px",
  },

  tileTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    position: "relative",
    zIndex: 1,
  },

  tileName: {
    fontSize: 16,
    fontWeight: 900,
  },

  tileHandle: {
    fontSize: 11,
    marginTop: 2,
  },

  tileArrow: {
    fontSize: 12,
    marginTop: 2,
  },

  connectionRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
    position: "relative",
    zIndex: 1,
  },

  connectionPill: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "5px 8px",
    fontSize: 10,
    fontWeight: 800,
  },

  liveLabel: {
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 8,
    position: "relative",
    zIndex: 1,
  },

  scoreTrack: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    background: "#71717A33",
  },

  tileStats: {
    display: "flex",
    gap: 20,
    paddingTop: 12,
    marginTop: 12,
    position: "relative",
    zIndex: 1,
  },

  tileStatValue: {
    fontSize: 13,
    fontWeight: 900,
  },

  tileStatLabel: {
    fontSize: 10,
  },

  tileBestFormat: {
    marginTop: 12,
    borderRadius: 14,
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    position: "relative",
    zIndex: 1,
  },

  tileAI: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    alignItems: "flex-start",
    padding: "10px 12px",
    borderRadius: 14,
    marginTop: 12,
    fontSize: 11,
    lineHeight: 1.5,
    position: "relative",
    zIndex: 1,
  },

  aiBoxLabel: {
    fontSize: 10,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  tileTrend: {
    fontSize: 11,
    marginTop: 9,
    fontWeight: 800,
    position: "relative",
    zIndex: 1,
  },

  backBtn: {
    padding: "8px 14px",
    borderRadius: 12,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    marginBottom: 18,
  },

  accountSummary: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
    position: "relative",
    overflow: "hidden",
  },

  accountSummaryRow: {
    display: "flex",
    gap: 34,
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    zIndex: 1,
  },

  accountMetrics: {
    display: "flex",
    gap: 28,
  },

  metricValue: {
    fontSize: 18,
    fontWeight: 900,
  },

  metricLabel: {
    fontSize: 11,
    marginTop: 2,
  },

  postsLabel: {
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 12,
  },

  postsList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  postRow: {
    borderRadius: 18,
    padding: "16px 16px",
    display: "flex",
    gap: 16,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  postLeft: {
    flex: 1,
  },

  postTitle: {
    fontSize: 15,
    fontWeight: 900,
    lineHeight: 1.45,
    margin: 0,
  },

  postMeta: {
    display: "flex",
    gap: 14,
    marginTop: 8,
    flexWrap: "wrap",
  },

  metaItem: {
    fontSize: 11,
  },

  postBadges: {
    display: "flex",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },

  badge: {
    display: "inline-flex",
    padding: "5px 9px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
  },

  postAI: {
    display: "inline-flex",
    gap: 8,
    alignItems: "center",
    padding: "7px 10px",
    borderRadius: 12,
    marginTop: 10,
    fontSize: 11,
    lineHeight: 1.45,
  },

  postScoreBox: {
    textAlign: "center",
    flexShrink: 0,
    minWidth: 54,
  },

  sectionTitle: {
    fontSize: 28,
    lineHeight: 1.1,
    fontWeight: 400,
    margin: "10px 0",
  },

  sectionText: {
    fontSize: 13,
    lineHeight: 1.7,
    margin: 0,
  },

  contentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 16,
  },

  contentCard: {
    borderRadius: 22,
    padding: 18,
    position: "relative",
    overflow: "hidden",
  },

  contentCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    position: "relative",
    zIndex: 1,
  },

  platformDot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
  },

  miniPostsStack: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    position: "relative",
    zIndex: 1,
  },

  miniPost: {
    borderRadius: 16,
    padding: 12,
  },

  miniPostTitle: {
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1.45,
  },

  miniPostMeta: {
    fontSize: 11,
    marginTop: 6,
  },

  miniAI: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginTop: 10,
    borderRadius: 12,
    padding: "9px 10px",
  },

  compareTable: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  compareRow: {
    borderRadius: 18,
    padding: 15,
    display: "grid",
    gridTemplateColumns: "180px 180px 1fr 1.3fr",
    gap: 16,
    alignItems: "center",
  },

  compareAIBox: {
    borderRadius: 14,
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  calendarRow: {
    borderRadius: 18,
    padding: 15,
    display: "grid",
    gridTemplateColumns: "1.2fr 120px 120px 130px 1fr",
    gap: 12,
    alignItems: "center",
  },

  scheduleAI: {
    borderRadius: 14,
    padding: "10px 12px",
  },

  aiSmall: {
    fontSize: 12,
    lineHeight: 1.55,
    margin: "6px 0 0",
  },

  integrationsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
  },

  settingsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 16,
  },

  integrationTitle: {
    fontSize: 25,
    fontWeight: 400,
    margin: "10px 0",
  },

  secondaryButton: {
    marginTop: 18,
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "inherit",
  },
};
