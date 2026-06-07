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
  ImagePlus,
  Layers3,
  Library,
  LogOut,
  MessageCircle,
  Moon,
  PenLine,
  PlugZap,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Video,
  WandSparkles,
  Wand2,
  BrainCircuit, 
  Package,
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
import Inspirations from "@/app/components/Inspirations";
import AIStrategist from "@/app/components/AIStrategist";
import ContentSummaryImproved from "@/app/components/ContentSummaryImproved";
import BlogStudio from "@/app/components/BlogStudio";
import BrandOffers from "@/app/components/BrandOffers";
import BlogLibrary from "@/app/components/BlogLibrary";
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
  | "blogStudio"
  | "blogLibrary"
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
  | "settings"
  | "inspirationsContent"
  | "inspirationsVideo"
  | "inspirationsShort"
  | "inspirationsCreative"
  | "strategist"
  | "offers";

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
  connection_id?: string | null;
  manualAccountUrl?: string;
}

interface PlatformConnection {
  id: string;
  platform: Platform;
  account_name: string;
  last_synced_at: string | null;
  connected: boolean;

  username?: string | null;
  avatar_url?: string | null;
  profile_image_url?: string | null;
  profile_name?: string | null;
  profile_likes?: number | null;
  likes_count?: number | null;
  total_likes?: number | null;
  heart_count?: number | null;
  followers?: number | null;
followers_count?: number | null;
follower_count?: number | null;
total_followers?: number | null;
fan_count?: number | null;
page_likes?: number | null;
page_fans?: number | null;
subscriber_count?: number | null;
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

  thumbnail_url?: string | null;
  media_url?: string | null;
  image_url?: string | null;
  cover_url?: string | null;

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
  id:
    | "stats"
    | "creation"
    | "templateLibrary"
    | "inspirationLibrary"
    | "ai"
    | "settings";
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
      { id: "blogStudio", label: "Blog Studio", icon: "fileText" },
      
      { id: "video", label: "Video Studio", icon: "video" },
      { id: "shorts", label: "Short Studio", icon: "shorts" },
      { id: "creative", label: "Creative Studio", icon: "creative" },
      { id: "calendar", label: "Harmonogram", icon: "calendar" },
    ],
  },
    {
  id: "inspirationLibrary",
  title: "Inspiracje",
  icon: "groupInspirations",
  tabs: [
    {
      id: "inspirationsContent",
      label: "Inspiracje contentu",
      icon: "inspirationsContent",
    },
    {
      id: "inspirationsVideo",
      label: "Inspiracje video",
      icon: "inspirationsVideo",
    },
    {
      id: "inspirationsShort",
      label: "Inspiracje short",
      icon: "inspirationsShort",
    },
    {
      id: "inspirationsCreative",
      label: "Inspiracje creative",
      icon: "inspirationsCreative",
    },
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
      { id: "blogLibrary", label: "Biblioteka bloga", icon: "fileText" },
    ],
  },
  {
    id: "ai",
    title: "AI",
    icon: "groupAi",
    tabs: [
      { id: "offers", label: "Oferta i linki", icon: "package" },
      { id: "brand", label: "Brand Voice", icon: "brand" },
      { id: "partner", label: "AI Partner", icon: "partner" },
      { id: "strategist", label: "AI Strateg", icon: "strategist" },
      { id: "chat", label: "AI Chat", icon: "chat" },
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
const INSPIRATION_VIEWS = {
  inspirationsContent: {
    kind: "content",
    label: "Inspiracje contentu",
    title: "Inspiracje z Content Studio",
    description:
      "Pomysły, propozycje postów, warianty hooków i treści robocze, które możesz edytować i zamienić w szablon.",
    targetTab: "studio",
  },
  inspirationsVideo: {
    kind: "video",
    label: "Inspiracje video",
    title: "Inspiracje z Video Studio",
    description:
      "Propozycje scenariuszy, ujęć, miniatur i opisów video do dalszej edycji.",
    targetTab: "video",
  },
  inspirationsShort: {
    kind: "short",
    label: "Inspiracje short",
    title: "Inspiracje z Short Studio",
    description:
      "Pomysły na krótkie formaty, hooki, opisy i warianty pod TikTok, Reels, Shorts oraz LinkedIn Video.",
    targetTab: "shorts",
  },
  inspirationsCreative: {
    kind: "creative",
    label: "Inspiracje creative",
    title: "Inspiracje z Creative Studio",
    description:
      "Pomysły na grafiki, miniatury, okładki, prompty i kreacje do social media.",
    targetTab: "creative",
  },
} as const satisfies Record<
  Extract<
    TabId,
    | "inspirationsContent"
    | "inspirationsVideo"
    | "inspirationsShort"
    | "inspirationsCreative"
  >,
  {
    kind: "content" | "video" | "short" | "creative";
    label: string;
    title: string;
    description: string;
    targetTab: TabId;
  }
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
  fileText: FileText,
  package: Package,

  templates: Library,
  templatesContent: FileText,
  templatesVideo: Video,
  templatesShort: Clapperboard,
  templatesCreative: ImagePlus,

  inspirationsContent: Sparkles,
  inspirationsVideo: Video,
  inspirationsShort: Clapperboard,
  inspirationsCreative: ImagePlus,

  partner: Bot,
  brand: WandSparkles,
  chat: MessageCircle,
  integrations: PlugZap,
  settings: Settings,

  groupStats: BarChart3,
  groupCreation: PenLine,
  groupTemplates: Library,
  groupInspirations: Sparkles,
  groupAi: Sparkles,
  groupSettings: Settings,
  strategist: BrainCircuit,
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
function compactMetric(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
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

    thumbnail_url: post.thumbnail_url,
    media_url: post.media_url,
    image_url: post.image_url,
    cover_url: post.cover_url,

    status: "opublikowany",
    source: "import",
    ai:
      post.ai_summary ||
      "Prawdziwy rekord pobrany z API. Analiza AI pojawi się po przeliczeniu wyników.",
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
      ? manualLinks.find(
          (link) => link.connection_id === connection.id && link.type === "account"
        )
      : null;

    if (!connection) {
      return {
        ...account,
        connected: false,
        connection_id: null,
        handle: "Niepodłączone",
        lastSync: "Niepodłączone",
        score: 0,
        trend: 0,
        posts: 0,
        engRate: "0%",
        reach: "0",
        bestFormat: "Brak danych",
        aiTag:
          "Połącz konto, a po synchronizacji pojawią się tutaj prawdziwe dane.",
        manualAccountUrl: undefined,
      };
    }

    const base = {
      ...account,
      connected: true,
      connection_id: connection.id,
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
  const [syncingAccount, setSyncingAccount] = useState<string | null>(null);
  const [selectedPostDetails, setSelectedPostDetails] = useState<any | null>(null);
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
  inspirationLibrary: true,
  ai: true,
  settings: true,
});
  const [accounts, setAccounts] = useState<Account[]>(() => mergeConnections(ACCOUNTS, [], emptyPostsByPlatform()));
  const [postsByPlatform, setPostsByPlatform] = useState<Record<Platform, Post[]>>(emptyPostsByPlatform);
  const css = dark ? darkVars : lightVars;

  const bestAccount = useMemo(() => [...accounts].sort((a, b) => b.score - a.score)[0], [accounts]);
  const weakestAccount = useMemo(() => [...accounts].sort((a, b) => a.score - b.score)[0], [accounts]);


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

  const comparisonRows = useMemo(() => {
    const platformMeta: Record<
      string,
      { name: string; color: string; icon: string }
    > = {
      tiktok: { name: "TikTok", color: "#7DD3FC", icon: "♪" },
      instagram: { name: "Instagram", color: "#E1306C", icon: "◎" },
      facebook: { name: "Facebook", color: "#1877F2", icon: "f" },
      youtube: { name: "YouTube", color: "#FF0033", icon: "▶" },
      linkedin: { name: "LinkedIn", color: "#0A66C2", icon: "in" },
      spotify: { name: "Spotify", color: "#1DB954", icon: "◉" },
      blog: { name: "Blog", color: "#22C55E", icon: "✎" },
    };

    return Object.entries(postsByPlatform || {}).map(([platformId, posts]) => {
      const safePosts = Array.isArray(posts) ? posts : [];

      const totals = safePosts.reduce(
        (acc, post) => {
          const reach = Number(String(post.reach || "0").replace(/[^\d.-]/g, ""));
          const likes = Number(post.likes || 0);
          const comments = Number(post.comments || 0);
          const shares = Number(post.shares || 0);
          const score = Number(post.score || 0);

          acc.reach += reach;
          acc.likes += likes;
          acc.comments += comments;
          acc.shares += shares;
          acc.engagement += likes + comments + shares;
          acc.score += score;
          return acc;
        },
        {
          reach: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          engagement: 0,
          score: 0,
        }
      );

      const count = safePosts.length || 1;
      const avgReach = Math.round(totals.reach / count);
      const avgEngagement = Math.round(totals.engagement / count);
      const avgScore = Math.round(totals.score / count);

      const bestPost = [...safePosts].sort((a, b) => {
        const aPower =
          Number(a.score || 0) * 2 +
          Number(String(a.reach || "0").replace(/[^\d.-]/g, "")) +
          Number(a.likes || 0) * 4 +
          Number(a.comments || 0) * 8 +
          Number(a.shares || 0) * 10;

        const bPower =
          Number(b.score || 0) * 2 +
          Number(String(b.reach || "0").replace(/[^\d.-]/g, "")) +
          Number(b.likes || 0) * 4 +
          Number(b.comments || 0) * 8 +
          Number(b.shares || 0) * 10;

        return bPower - aPower;
      })[0];

      const meta = platformMeta[platformId] || {
        name: platformId,
        color: css.accent,
        icon: "•",
      };

      return {
        id: platformId,
        name: meta.name,
        color: meta.color,
        icon: meta.icon,
        posts: safePosts,
        postsCount: safePosts.length,
        reach: totals.reach,
        avgReach,
        engagement: totals.engagement,
        avgEngagement,
        likes: totals.likes,
        comments: totals.comments,
        shares: totals.shares,
        avgScore,
        bestPost,
      };
    });
  }, [postsByPlatform, css.accent]);

  const comparisonInsights = useMemo(() => {
    const rowsWithPosts = comparisonRows.filter((row) => row.postsCount > 0);

    const leader = [...rowsWithPosts].sort((a, b) => {
      const aPower = a.avgScore * 3 + a.avgEngagement * 2 + a.avgReach;
      const bPower = b.avgScore * 3 + b.avgEngagement * 2 + b.avgReach;
      return bPower - aPower;
    })[0];

    const needsBoost = [...rowsWithPosts].sort((a, b) => {
      const aWeakness = a.avgScore * 2 + a.avgEngagement + a.avgReach * 0.2;
      const bWeakness = b.avgScore * 2 + b.avgEngagement + b.avgReach * 0.2;
      return aWeakness - bWeakness;
    })[0];

    const allPosts = rowsWithPosts.flatMap((row) =>
      row.posts.map((post) => ({
        ...post,
        platformId: row.id,
        platformName: row.name,
        platformColor: row.color,
      }))
    );

    const formatMap = allPosts.reduce((acc, post) => {
      const type = post.type || "post";

      if (!acc[type]) {
        acc[type] = {
          type,
          count: 0,
          reach: 0,
          engagement: 0,
          score: 0,
        };
      }

      acc[type].count += 1;
      acc[type].reach += Number(String(post.reach || "0").replace(/[^\d.-]/g, ""));
      acc[type].engagement +=
        Number(post.likes || 0) +
        Number(post.comments || 0) +
        Number(post.shares || 0);
      acc[type].score += Number(post.score || 0);

      return acc;
    }, {} as Record<string, { type: string; count: number; reach: number; engagement: number; score: number }>);

    const bestFormat = Object.values(formatMap).sort((a, b) => {
      const aPower = a.score / a.count + a.engagement / a.count + a.reach / a.count;
      const bPower = b.score / b.count + b.engagement / b.count + b.reach / b.count;
      return bPower - aPower;
    })[0];

    return {
      leader,
      needsBoost,
      bestFormat,
      allPosts,
    };
  }, [comparisonRows]);

  async function syncAccountFromTile(account: Account) {
  if (!account.connection_id) {
    alert(
      "Brak connection_id dla tego konta. Wejdź w Integracje, podłącz konto ponownie albo odśwież stronę."
    );
    return;
  }

  setSyncingAccount(account.id);

  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        connection_id: account.connection_id,
        platform: account.id,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || data?.error) {
      throw new Error(data?.error || "Błąd synchronizacji.");
    }

    window.location.reload();
  } catch (err) {
    alert(err instanceof Error ? err.message : String(err));
  } finally {
    setSyncingAccount(null);
  }
}

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
          .select("id, platform, account_name, username, avatar_url, profile_image_url, profile_name, profile_likes, likes_count, total_likes, heart_count, followers, followers_count, follower_count, total_followers, fan_count, page_likes, page_fans, subscriber_count, last_synced_at, connected")
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
    .select(
      "id, connection_id, platform_post_id, title, content, post_type, url, published_at, thumbnail_url, media_url, image_url, cover_url, reach, impressions, likes, comments, shares, saves, clicks, ai_score, ai_summary, fetched_at"
    )
    .in("connection_id", connectionIds)
    .order("published_at", { ascending: false }),

  supabase
    .schema("contentiq")
    .from("manual_links")
    .select("id, connection_id, type, url, title, created_at")
    .in("connection_id", connectionIds)
    .order("created_at", { ascending: false }),
])
.then(([postsResult, linksResult]) => {
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
const getAccountField = (account: any, keys: string[], fallback = "") => {
  for (const key of keys) {
    if (account?.[key] !== undefined && account?.[key] !== null && account?.[key] !== "") {
      return account[key];
    }
  }

  return fallback;
};

const getPostThumb = (post: any) => {
  return (
    post?.thumbnail_url ||
    post?.thumbnailUrl ||
    post?.cover_url ||
    post?.coverUrl ||
    post?.image_url ||
    post?.imageUrl ||
    post?.media_url ||
    post?.mediaUrl ||
    null
  );
};

const formatProfileNumber = (value: any) => {
  const parsed = Number(value || 0);

  if (!Number.isFinite(parsed) || parsed <= 0) return "—";

  return new Intl.NumberFormat("pl-PL", {
    notation: parsed >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(parsed);
};

  return (
    <div
      style={{
        ...st.root,
        background: dark
          ? `radial-gradient(circle at top left, ${css.accentSoft}, transparent 34%), ${css.bg}`
          : `radial-gradient(circle at top left, rgba(181,147,122,0.22), transparent 34%), ${css.bg}`,
        color: css.text,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,300&family=DM+Serif+Display:ital@0;1&display=swap');

        * {
          box-sizing: border-box;
        }

        .ciq-top-actions summary::-webkit-details-marker {
          display: none;
        }

        .ciq-top-actions summary::marker {
          content: "";
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

        @keyframes ciq-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .ciq-spin {
          animation: ciq-spin 0.8s linear infinite;
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


        .ciq-top-actions details[open] summary {
          border-color: ${css.aiBorder} !important;
        }

        .ciq-panel-hero {
          position: relative;
          overflow: hidden;
        }

        .ciq-panel-hero::after {
          content: "";
          position: absolute;
          left: 24px;
          right: 24px;
          bottom: -26px;
          height: 52px;
          background: rgba(168, 85, 247, 0.12);
          filter: blur(26px);
          pointer-events: none;
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

          .ciq-footer {
            align-items: flex-start !important;
            flex-direction: column !important;
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
      minHeight: sidebarCollapsed ? 72 : 86,
      padding: sidebarCollapsed ? "14px 10px" : "16px 18px",
      borderBottom: `1px solid ${css.border}`,
      gap: 10,
    }}
    aria-label="ANM ContentIQ"
  >
    <img
      src="/ANM_ContentIQ_.JPG"
      alt="ANM ContentIQ app icon"
      style={{
        ...st.logoMark,
        width: sidebarCollapsed ? 42 : 48,
        height: sidebarCollapsed ? 42 : 48,
        borderRadius: 14,
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
            fontFamily: "var(--font-heading)",
            color: css.text,
            fontSize: 19,
            lineHeight: 1.05,
            fontWeight: 500,
          }}
        >
          ANM ContentIQ
        </div>

        <div
          style={{
            ...st.logoSub,
            color: css.muted,
            fontSize: 10,
            letterSpacing: ".14em",
            marginTop: 5,
          }}
        >
          Centrum contentu i AI
        </div>
      </div>
    )}
  </Link>

  <div
    style={{
      padding: sidebarCollapsed ? "12px 10px 8px" : "12px 14px 8px",
    }}
  >
    <button
      onClick={() => setSidebarCollapsed((current) => !current)}
      style={{
        ...st.collapseButton,
        minHeight: 42,
        padding: sidebarCollapsed ? "0" : "9px 12px",
        background: css.sidebarButton,
        border: `1px solid ${css.border}`,
        color: css.muted,
        justifyContent: sidebarCollapsed ? "center" : "space-between",
        borderRadius: 16,
        fontSize: 12,
        fontWeight: 800,
      }}
      title={sidebarCollapsed ? "Rozwiń menu" : "Zwiń menu"}
    >
      {sidebarCollapsed ? (
        <ChevronsRight size={15} />
      ) : (
        <>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <ChevronsLeft size={14} />
            Zwiń menu
          </span>
          <span style={{ fontSize: 9, opacity: 0.55 }}>⌘</span>
        </>
      )}
    </button>
  </div>

  <nav
    className="ciq-nav"
    style={{
      ...st.nav,
      padding: sidebarCollapsed ? "5px 9px" : "6px 10px 10px",
      gap: 10,
    }}
  >
    {sidebarCollapsed ? (
      <div
        style={{
          ...st.collapsedNavGrid,
          gap: 8,
        }}
      >
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
                width: 38,
                height: 38,
                borderRadius: 13,
                background: isActive ? css.activeBg : "transparent",
                color: isActive ? css.activeText : css.muted,
                border: `1px solid ${isActive ? css.accentBorder : "transparent"}`,
                boxShadow: isActive ? css.activeShadow : "none",
              }}
            >
              <IconView name={tab.icon} size={16} />
            </button>
          );
        })}
      </div>
    ) : (
      NAV_GROUPS.map((group) => {
        const isOpen = openNavGroups[group.id];
        const groupHasActiveTab = group.tabs.some((tab) => tab.id === activeTab);

        return (
          <div
            key={group.id}
            style={{
              ...st.navGroup,
              marginBottom: 6,
            }}
          >
            <button
              onClick={() => toggleNavGroup(group.id)}
              style={{
                ...st.navGroupHeader,
                minHeight: 44,
                padding: "8px 10px",
                borderRadius: 16,
                background: groupHasActiveTab ? css.activeBg : "transparent",
                color: groupHasActiveTab ? css.accent : css.groupText,
                border: `1px solid ${
                  groupHasActiveTab ? css.accentBorder : "transparent"
                }`,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 26,
                  height: 26,
                  borderRadius: 9,
                  background: groupHasActiveTab ? css.logoBg : "transparent",
                  color: groupHasActiveTab ? css.logoText : css.groupIconText,
                  border: "none",
                  flexShrink: 0,
                }}
              >
                <IconView name={group.icon} size={14} />
              </span>

              <span
                style={{
                  ...st.navGroupTitle,
                  fontSize: 11,
                  lineHeight: 1,
                  letterSpacing: ".16em",
                  fontFamily: "var(--font-label)",
                  fontWeight: 900,
                  textTransform: "uppercase",
                }}
              >
                {group.title}
              </span>

              <span
                style={{
                  marginLeft: "auto",
                  display: "inline-flex",
                  opacity: 0.7,
                }}
              >
                {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </span>
            </button>

            {isOpen && (
              <div
                style={{
                  ...st.navSubMenu,
                  borderLeft: `1px solid ${css.border}`,
                  marginLeft: 22,
                  paddingLeft: 12,
                  marginTop: 6,
                  display: "grid",
                  gap: 4,
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
                        minHeight: 38,
                        padding: "7px 9px",
                        borderRadius: 13,
                        background: isActive ? css.subItemActive : "transparent",
                        color: isActive ? css.activeText : css.subItemText,
                        fontWeight: isActive ? 800 : 500,
                        border: `1px solid ${
                          isActive ? css.subItemActiveBorder : "transparent"
                        }`,
                        boxShadow: isActive ? css.activeShadow : "none",
                        gap: 9,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 22,
                          height: 22,
                          borderRadius: 8,
                          background: "transparent",
                          color: isActive ? css.accent : css.subItemMuted,
                          border: "none",
                          flexShrink: 0,
                        }}
                      >
                        <IconView name={tab.icon} size={14} />
                      </span>

                      <span
                        style={{
                          ...st.navTabLabel,
                          fontSize: 12,
                          lineHeight: 1.2,
                          letterSpacing: ".01em",
                        }}
                      >
                        {tab.label}
                      </span>
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

  <div
    style={{
      ...st.sidebarBottom,
      padding: sidebarCollapsed ? 9 : 14,
    }}
  >
    <button
      onClick={handleSignOut}
      disabled={signingOut}
      style={{
        ...st.signoutBtn,
        minHeight: 38,
        borderRadius: 13,
        color: "#ef4444",
        background: "#ef444414",
        border: "1px solid #ef444440",
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {sidebarCollapsed ? (
        <LogOut size={15} />
      ) : (
        <>
          <LogOut size={14} />
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
              background: dark
                ? "linear-gradient(135deg, rgba(26,34,51,0.96), rgba(5,5,5,0.96))"
                : "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(247,242,239,0.96))",
              backdropFilter: "blur(18px)",
              boxShadow: dark
                ? "0 14px 38px rgba(0,0,0,0.22)"
                : "0 14px 34px rgba(35,31,32,0.08)",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  flexWrap: "wrap",
                  marginBottom: 7,
                }}
              >
                <span
                  style={{
                    ...st.tabLabel,
                    color: css.accent,
                    fontFamily: "var(--font-label)",
                    letterSpacing: ".14em",
                    marginBottom: 0,
                  }}
                >
                  {NAV_TABS.find((tab) => tab.id === activeTab)?.label}
                </span>

                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 99,
                    background: css.accent,
                    opacity: 0.65,
                  }}
                />

                <span
                  style={{
                    color: css.muted,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  Workspace: {workspaceId}
                </span>
              </div>

              <h1
                style={{
                  ...st.pageTitle,
                  fontFamily: "var(--font-heading)",
                  color: css.heading,
                  fontSize: 34,
                  lineHeight: 1.02,
                  fontWeight: 500,
                  margin: 0,
                }}
              >
                {activeAccount ? activeAccount.name : "Centrum analityki contentu"}
              </h1>

              <p
                style={{
                  ...st.pageSubtitle,
                  color: css.muted,
                  marginTop: 8,
                  maxWidth: 760,
                  lineHeight: 1.65,
                }}
              >
                Wszystkie konta, wyniki live, treści, blog, oferta i rekomendacje AI w
                jednym miejscu.
              </p>
            </div>

            <div className="ciq-top-actions" style={st.topActions}>
              <button
                type="button"
                onClick={toggleTheme}
                title={dark ? "Włącz jasny tryb" : "Włącz ciemny tryb"}
                aria-label={dark ? "Włącz jasny tryb" : "Włącz ciemny tryb"}
                style={{
                  ...st.themeTopButton,
                  background: css.surface,
                  border: `1px solid ${css.border}`,
                  color: css.muted,
                  boxShadow: dark ? "0 12px 28px rgba(0,0,0,0.18)" : "none",
                }}
              >
                {dark ? <Sun size={17} /> : <Moon size={17} />}
              </button>

              <Link
                href="/dashboard"
                style={{
                  ...st.topBtn,
                  background: css.surface,
                  border: `1px solid ${css.border}`,
                  color: css.muted,
                  textDecoration: "none",
                }}
              >
                Dashboard
              </Link>

              <button
                type="button"
                onClick={() => openTab("calendar")}
                style={{
                  ...st.topBtn,
                  background: css.surface,
                  color: css.text,
                  border: `1px solid ${css.border}`,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <CalendarDays size={15} />
                Harmonogram
              </button>

              <button
                type="button"
                onClick={() => openTab("studio")}
                style={{
                  ...st.topBtn,
                  background: dark ? "#FFFFFF" : "#111111",
                  color: dark ? "#050505" : "#FFFFFF",
                  border: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  fontWeight: 900,
                }}
              >
                <Sparkles size={15} />
                Twórz content
              </button>

              <details style={{ position: "relative" }}>
                <summary
                  style={{
                    ...st.topBtn,
                    listStyle: "none",
                    background: css.aiBg,
                    color: css.aiText,
                    border: `1px solid ${css.aiBorder}`,
                    boxShadow: css.aiGlow,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    userSelect: "none",
                    fontWeight: 900,
                  }}
                >
                  <SlidersHorizontal size={15} />
                  Personalizuj
                  <ChevronDown size={14} />
                </summary>

                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 9px)",
                    right: 0,
                    zIndex: 80,
                    width: 270,
                    padding: 8,
                    borderRadius: 18,
                    background: css.surface,
                    border: `1px solid ${css.border}`,
                    boxShadow: "0 18px 48px rgba(0,0,0,.32)",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  {[
                    { id: "integrations" as TabId, label: "Integracje", icon: PlugZap },
                    { id: "offers" as TabId, label: "Oferta i linki", icon: Package },
                    { id: "brand" as TabId, label: "Brand Voice", icon: WandSparkles },
                    { id: "blogLibrary" as TabId, label: "Biblioteka bloga", icon: FileText },
                    { id: "strategist" as TabId, label: "AI Strateg", icon: BrainCircuit },
                    { id: "settings" as TabId, label: "Ustawienia", icon: Settings },
                  ].map((item) => {
                    const MenuIcon = item.icon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={(event) => {
                          openTab(item.id);
                          event.currentTarget.closest("details")?.removeAttribute("open");
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 11px",
                          borderRadius: 12,
                          border: "none",
                          background: activeTab === item.id ? css.activeBg : "transparent",
                          color: activeTab === item.id ? css.activeText : css.text,
                          fontFamily: "var(--font-body)",
                          fontSize: 12,
                          fontWeight: 800,
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        <MenuIcon
                          size={15}
                          color={activeTab === item.id ? css.accent : css.muted}
                        />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </details>
            </div>
          </header>

          <div style={st.content}>

{/* ================= PODSUMOWANIE KONT ================= */}
{activeTab === "accounts" && !activeAccount && (
  <div style={{ display: "grid", gap: 22 }}>
    <div className="ciq-summary-grid" style={st.summaryGrid}>
      <div
        className="ciq-mini-card"
        style={{
          ...st.summaryCard,
          background: css.surface,
          border: `1px solid ${css.border}`,
          boxShadow: "0 14px 34px rgba(0,0,0,0.18)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: 18,
            top: 8,
            color: css.accent,
            opacity: 0.08,
            fontSize: 70,
            lineHeight: 1,
            fontFamily: "var(--font-heading)",
          }}
        >
          7
        </div>

        <p
          style={{
            ...st.smallLabel,
            color: css.accent,
            fontFamily: "var(--font-label)",
            letterSpacing: ".12em",
          }}
        >
          Analiza live
        </p>

        <h3
          style={{
            ...st.summaryValue,
            color: css.heading,
            fontFamily: "var(--font-heading)",
          }}
        >
          7 kanałów w jednym widoku
        </h3>

        <p style={{ ...st.summaryNote, color: css.muted }}>
          Instagram, Facebook, LinkedIn, TikTok, YouTube, Spotify i Blog
          zebrane w jednym centrum analitycznym.
        </p>
      </div>

      <div
        className="ciq-mini-card"
        style={{
          ...st.summaryCard,
          background: css.surface,
          border: `1px solid ${css.aiBorder}`,
          boxShadow:
            "0 16px 40px rgba(0,0,0,0.24), 0 18px 42px rgba(168,85,247,0.14)",
          color: css.text,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 18,
            right: 18,
            bottom: -18,
            height: 38,
            background: "rgba(168,85,247,0.18)",
            filter: "blur(22px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <p
            style={{
              ...st.smallLabel,
              color: css.aiText,
              fontFamily: "var(--font-label)",
              letterSpacing: ".12em",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <Wand2 size={15} color={css.aiIcon} />
            AI rekomendacja
          </p>

          <h3
            style={{
              ...st.summaryValue,
              color: css.heading,
              fontFamily: "var(--font-heading)",
            }}
          >
            Najmocniejszy kanał: {bestAccount.name}
          </h3>

          <p style={{ ...st.summaryNote, color: css.muted }}>
            {bestAccount.aiTag}
          </p>
        </div>
      </div>

      <div
        className="ciq-mini-card"
        style={{
          ...st.summaryCard,
          background: css.surface,
          border: `1px solid ${css.aiBorder}`,
          boxShadow:
            "0 16px 40px rgba(0,0,0,0.24), 0 18px 42px rgba(168,85,247,0.14)",
          color: css.text,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 18,
            right: 18,
            bottom: -18,
            height: 38,
            background: "rgba(168,85,247,0.18)",
            filter: "blur(22px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <p
            style={{
              ...st.smallLabel,
              color: css.aiText,
              fontFamily: "var(--font-label)",
              letterSpacing: ".12em",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <Wand2 size={15} color={css.aiIcon} />
            AI alert
          </p>

          <h3
            style={{
              ...st.summaryValue,
              color: css.heading,
              fontFamily: "var(--font-heading)",
            }}
          >
            Do poprawy: {weakestAccount.name}
          </h3>

          <p style={{ ...st.summaryNote, color: css.muted }}>
            {weakestAccount.aiTag}
          </p>
        </div>
      </div>
    </div>

    <div
      style={{
        ...st.panel,
        background: css.surface,
        border: `1px solid ${css.aiBorder}`,
        boxShadow:
          "0 20px 50px rgba(0,0,0,0.22), 0 20px 46px rgba(168,85,247,0.13)",
        color: css.text,
        position: "relative",
        overflow: "hidden",
        marginBottom: 6,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 22,
          right: 22,
          bottom: -24,
          height: 48,
          background: "rgba(168,85,247,0.17)",
          filter: "blur(24px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <p
          style={{
            ...st.smallLabel,
            color: css.aiText,
            fontFamily: "var(--font-label)",
            letterSpacing: ".12em",
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <Wand2 size={15} color={css.aiIcon} />
          AI analiza cross-platform
        </p>

        <h2
          style={{
            margin: "4px 0 14px",
            color: css.heading,
            fontFamily: "var(--font-heading)",
            fontSize: 30,
            lineHeight: 1.05,
            fontWeight: 500,
          }}
        >
          Co działa najlepiej i gdzie warto podkręcić wynik?
        </h2>

        <div style={{ display: "grid", gap: 10 }}>
          {realInsights.map((insight, index) => {
            const color =
              insight.type === "up"
                ? "#22c55e"
                : insight.type === "warn"
                  ? "#f59e0b"
                  : css.aiText;

            return (
              <div
                key={index}
                style={{
                  background: css.liveSoft,
                  border: `1px solid ${css.border}`,
                  borderLeft: `4px solid ${color}`,
                  borderRadius: 15,
                  padding: "11px 13px",
                }}
              >
                <p
                  style={{
                    ...st.insightText,
                    color: css.text,
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.55,
                  }}
                >
                  {insight.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        alignItems: "flex-end",
        flexWrap: "wrap",
      }}
    >
      <div>
        <div
          style={{
            ...st.tilesLabel,
            color: css.accent,
            fontFamily: "var(--font-label)",
            letterSpacing: ".12em",
            marginBottom: 6,
          }}
        >
          Podsumowanie kont
        </div>

        <h2
          style={{
            margin: 0,
            color: css.heading,
            fontFamily: "var(--font-heading)",
            fontSize: 30,
            lineHeight: 1.05,
            fontWeight: 500,
          }}
        >
          Kliknij konto, żeby zobaczyć szczegóły i publikacje
        </h2>
      </div>

      <div
        style={{
          color: css.muted,
          fontSize: 12,
          lineHeight: 1.5,
          maxWidth: 430,
        }}
      >
        Każdy kafelek pokazuje wynik live, świeżość danych i krótki wniosek AI.
        Możesz od razu wejść w szczegóły albo zsynchronizować konto.
      </div>
    </div>

    <div className="ciq-tiles-grid" style={st.tilesGrid}>
      {accounts.map((account) => {
        const score = Math.max(0, Math.min(100, Number(account.score || 0)));
        const trend = Number(account.trend || 0);
        const trendColor =
          trend === 0 ? css.muted : trend > 0 ? "#22c55e" : "#ef4444";

        return (
          <div
            key={account.id}
            className="ciq-account-tile"
            role="button"
            tabIndex={0}
            onClick={() => setActiveAccount(account)}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key === "Enter" || event.key === " ") {
                setActiveAccount(account);
              }
            }}
            style={{
              ...st.tile,
              background: css.surface,
              border: `1px solid ${css.border}`,
              boxShadow: "0 16px 38px rgba(0,0,0,0.20)",
              position: "relative",
              overflow: "hidden",
              cursor: "pointer",
              textAlign: "left",
              minHeight: 360,
            }}
          >
            <span
              style={{
                ...st.socialWatermark,
                color: account.color,
                opacity: 0.08,
                fontSize: 110,
                right: 18,
                top: 8,
              }}
            >
              {SOCIAL_ICONS[account.id]}
            </span>

            <div
              style={{
                ...st.tileTopLine,
                background: account.color,
                height: 5,
                borderRadius: "18px 18px 0 0",
              }}
            />

            <div
              style={{
                ...st.tileTop,
                position: "relative",
                zIndex: 2,
                alignItems: "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    ...st.tileName,
                    color: account.color,
                    fontFamily: "var(--font-heading)",
                    fontSize: 25,
                    lineHeight: 1.05,
                    fontWeight: 500,
                  }}
                >
                  {account.name}
                </div>

                <div style={{ ...st.tileHandle, color: css.muted }}>
                  {account.handle}
                </div>
              </div>

              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  background: css.liveSoft,
                  border: `1px solid ${css.border}`,
                  color: account.color,
                  fontWeight: 900,
                  fontSize: 17,
                }}
              >
                →
              </span>
            </div>

            <div
              style={{
                ...st.connectionRow,
                position: "relative",
                zIndex: 2,
                marginTop: 12,
              }}
            >
              <span
                style={{
                  ...st.connectionPill,
                  background: account.connected ? "#22c55e18" : "#f59e0b18",
                  color: account.connected ? "#22c55e" : "#f59e0b",
                }}
              >
                {account.connected ? "API podłączone" : "Do podłączenia"}
              </span>

              <span style={{ color: css.muted, fontSize: 11 }}>
                Sync: {account.lastSync}
              </span>
            </div>

            <div
              style={{
                marginTop: 18,
                position: "relative",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    color: css.accent,
                    fontFamily: "var(--font-label)",
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                  }}
                >
                  Wynik konta
                </div>

                <div
                  style={{
                    color: getScoreColor(score),
                    fontFamily: "var(--font-heading)",
                    fontSize: 28,
                    lineHeight: 1,
                  }}
                >
                  {score}
                </div>
              </div>

              <div
                style={{
                  height: 9,
                  borderRadius: 999,
                  background: css.liveSoft,
                  border: `1px solid ${css.border}`,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${score}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: getScoreColor(score),
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 8,
                marginTop: 16,
                position: "relative",
                zIndex: 2,
              }}
            >
              {[
                ["Posty", account.posts],
                ["Eng.", account.engRate],
                ["Śr. zasięg", account.reach],
              ].map(([label, value]) => (
                <div
                  key={`${account.id}-${label}`}
                  style={{
                    background: css.liveSoft,
                    border: `1px solid ${css.border}`,
                    borderRadius: 15,
                    padding: "11px 9px",
                    minHeight: 72,
                  }}
                >
                  <div
                    style={{
                      color: css.text,
                      fontFamily: "var(--font-heading)",
                      fontSize: 20,
                      lineHeight: 1,
                    }}
                  >
                    {value}
                  </div>

                  <div
                    style={{
                      marginTop: 7,
                      color: css.muted,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: ".04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginTop: 12,
                position: "relative",
                zIndex: 2,
              }}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveAccount(account);
                }}
                style={{
                  borderRadius: 14,
                  border: `1px solid ${account.color}55`,
                  background: `${account.color}18`,
                  color: account.color,
                  padding: "10px 11px",
                  fontSize: 11,
                  fontWeight: 900,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  textAlign: "center",
                }}
              >
                Zobacz szczegóły
              </button>

              <button
                type="button"
                className="ciq-sync-button"
                onClick={(event) => {
                  event.stopPropagation();
                  void syncAccountFromTile(account);
                }}
                disabled={
                  !account.connected ||
                  !account.connection_id ||
                  syncingAccount === account.id
                }
                title={
                  !account.connected
                    ? "Najpierw połącz konto w Integracjach"
                    : !account.connection_id
                      ? "Brak identyfikatora połączenia. Odśwież stronę lub połącz konto ponownie."
                      : `Pobierz najnowsze dane z ${account.name}`
                }
                style={{
                  borderRadius: 14,
                  border: `1px solid ${css.border}`,
                  background: css.liveSoft,
                  color: account.connected && account.connection_id ? css.text : css.muted,
                  padding: "10px 11px",
                  fontSize: 11,
                  fontWeight: 900,
                  cursor:
                    account.connected &&
                    account.connection_id &&
                    syncingAccount !== account.id
                      ? "pointer"
                      : "not-allowed",
                  opacity:
                    account.connected &&
                    account.connection_id &&
                    syncingAccount !== account.id
                      ? 1
                      : 0.55,
                  fontFamily: "var(--font-body)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                }}
              >
                <RefreshCw
                  size={14}
                  className={syncingAccount === account.id ? "ciq-spin" : undefined}
                />
                {syncingAccount === account.id ? "Pobieranie..." : "Synchronizuj"}
              </button>
            </div>

            <div
              style={{
                background: css.surface,
                border: `1px solid ${css.aiBorder}`,
                boxShadow:
                  "0 12px 30px rgba(0,0,0,0.20), 0 16px 32px rgba(168,85,247,0.12)",
                color: css.text,
                borderRadius: 18,
                padding: 13,
                marginTop: 12,
                position: "relative",
                zIndex: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 14,
                  right: 14,
                  bottom: -14,
                  height: 28,
                  background: "rgba(168,85,247,0.16)",
                  filter: "blur(18px)",
                  pointerEvents: "none",
                }}
              />

              <div style={{ position: "relative", zIndex: 1 }}>
                <div
                  style={{
                    ...st.aiBoxLabel,
                    color: css.aiText,
                    fontFamily: "var(--font-label)",
                    letterSpacing: ".09em",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                  }}
                >
                  <Wand2 size={15} color={css.aiIcon} />
                  AI wniosek
                </div>

                <span
                  style={{
                    fontSize: 11,
                    lineHeight: 1.55,
                    color: css.text,
                  }}
                >
                  {account.aiTag}
                </span>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                color: trendColor,
                fontSize: 11,
                fontWeight: 800,
                position: "relative",
                zIndex: 2,
              }}
            >
              {trend === 0
                ? "0% miesiąc do miesiąca"
                : `${trend > 0 ? "↑" : "↓"} ${Math.abs(
                    trend
                  )}% miesiąc do miesiąca`}
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
        background: css.surface,
        border: `1px solid ${css.border}`,
        color: css.text,
        position: "relative",
        overflow: "hidden",
        marginBottom: 18,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "auto 18px 18px auto",
          fontSize: 120,
          opacity: 0.04,
          color: css.accent,
          fontFamily: "var(--font-heading)",
          pointerEvents: "none",
        }}
      >
        #
      </div>

      <p
        style={{
          ...st.smallLabel,
          color: css.accent,
          fontFamily: "var(--font-label)",
          letterSpacing: ".12em",
          textTransform: "uppercase",
        }}
      >
        Przegląd publikacji
      </p>

      <h2
        style={{
          ...st.sectionTitle,
          color: css.heading,
          fontFamily: "var(--font-heading)",
        }}
      >
        Podsumowanie contentu
      </h2>

      <p style={{ ...st.sectionText, color: css.muted }}>
        Tutaj analizujesz konkretne publikacje, a nie całe konta. Rozwijaj
        platformy, sprawdzaj miniatury, wyniki pojedynczych postów i wybieraj
        treści, które warto przerobić na kolejny format.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 10,
          marginTop: 18,
        }}
      >
        {[
          ["Publikacje", "lista postów z platform"],
          ["Miniatury", "szybki podgląd treści"],
          ["Wyniki", "zasięg, reakcje, komentarze"],
          ["AI", "później: naprawa i recykling"],
        ].map(([title, text]) => (
          <div
            key={title}
            style={{
              background: css.liveSoft,
              border: `1px solid ${css.border}`,
              borderRadius: 16,
              padding: 13,
            }}
          >
            <div
              style={{
                color: css.heading,
                fontFamily: "var(--font-heading)",
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              {title}
            </div>

            <div
              style={{
                color: css.muted,
                fontSize: 11,
                lineHeight: 1.45,
                marginTop: 7,
              }}
            >
              {text}
            </div>
          </div>
        ))}
      </div>
    </div>

    <ContentSummaryImproved
      dark={dark}
      workspaceId={workspaceId}
      platform="tiktok"
    />
  </div>
)}
{/* ================= SZCZEGÓŁY KONTA po wejsciu ================= */}

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
        position: "relative",
        overflow: "hidden",
        background: css.surface,
        border: `1px solid ${css.border}`,
      }}
    >
      <span
        style={{
          ...st.accountWatermark,
          color: activeAccount.color,
          opacity: 0.08,
          fontSize: 170,
          right: 24,
          top: 10,
        }}
      >
        {SOCIAL_ICONS[activeAccount.id]}
      </span>

      <div
        style={{
          height: 4,
          background: activeAccount.color,
          borderRadius: "14px 14px 0 0",
          margin: "-20px -20px 18px",
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(260px, 0.9fr) minmax(420px, 1.1fr)",
          gap: 20,
          alignItems: "center",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {getAccountField(activeAccount, [
            "avatar_url",
            "avatarUrl",
            "profile_image_url",
            "profileImageUrl",
            "picture",
            "photo",
          ]) ? (
            <img
              src={getAccountField(activeAccount, [
                "avatar_url",
                "avatarUrl",
                "profile_image_url",
                "profileImageUrl",
                "picture",
                "photo",
              ])}
              alt=""
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                objectFit: "cover",
                border: `1px solid ${css.border}`,
                background: css.liveSoft,
              }}
            />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                display: "grid",
                placeItems: "center",
                background: `${activeAccount.color}18`,
                border: `1px solid ${activeAccount.color}44`,
                color: activeAccount.color,
                fontSize: 26,
                fontWeight: 900,
              }}
            >
              {SOCIAL_ICONS[activeAccount.id]}
            </div>
          )}

          <div>
            <div
              style={{
                fontSize: 30,
                lineHeight: 1.05,
                fontFamily: "var(--font-heading)",
                color: css.heading,
              }}
            >
              {getAccountField(
                activeAccount,
                [
                  "profileName",
                  "profile_name",
                  "accountName",
                  "account_name",
                  "username",
                  "name",
                ],
                activeAccount.name
              )}
            </div>

            <div style={{ fontSize: 13, color: css.muted, marginTop: 6 }}>
              {activeAccount.handle}
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 10,
              }}
            >
              <span
                style={{
                  ...st.connectionPill,
                  background: activeAccount.connected ? "#22c55e18" : "#f59e0b18",
                  color: activeAccount.connected ? "#22c55e" : "#f59e0b",
                }}
              >
                {activeAccount.connected ? "API podłączone" : "Do podłączenia"}
              </span>

              <span
                style={{
                  ...st.connectionPill,
                  background: css.activeBg,
                  color: css.muted,
                }}
              >
                Sync: {activeAccount.lastSync}
              </span>
            </div>

            {activeAccount.manualAccountUrl && (
              <a
                href={activeAccount.manualAccountUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  marginTop: 10,
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
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {[
            {
              label:
                activeAccount.id === "facebook"
                  ? "Obserwujący / polubienia"
                  : activeAccount.id === "youtube"
                    ? "Subskrybenci"
                    : "Obserwujący",
              value: formatProfileNumber(
                getAccountField(activeAccount, [
                  "followers",
                  "followers_count",
                  "follower_count",
                  "total_followers",
                  "fan_count",
                  "subscriber_count",
                  "profileLikes",
                  "profile_likes",
                  "likesCount",
                  "likes_count",
                  "totalLikes",
                  "total_likes",
                  "heart_count",
                  "page_likes",
                  "page_fans",
                ])
              ),
              highlight: true,
            },
            {
              label: "Publikacje",
              value: String(activeAccount.posts),
            },
            {
              label: "Engagement",
              value: activeAccount.engRate,
            },
            {
              label: "Śr. zasięg",
              value: activeAccount.reach,
            },
            {
              label: "Najlepszy format",
              value: activeAccount.bestFormat,
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: item.highlight ? `${activeAccount.color}14` : css.liveSoft,
                border: `1px solid ${
                  item.highlight ? `${activeAccount.color}44` : css.border
                }`,
                borderRadius: 15,
                padding: "12px 10px",
                minHeight: 86,
              }}
            >
              <div
                style={{
                  color: item.highlight ? activeAccount.color : css.text,
                  fontSize: item.highlight ? 23 : 21,
                  lineHeight: 1.05,
                  fontFamily: "var(--font-heading)",
                }}
              >
                {item.value}
              </div>

              <div
                style={{
                  marginTop: 7,
                  color: css.muted,
                  fontSize: 10,
                  lineHeight: 1.35,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: ".05em",
                  fontFamily: "var(--font-label)",
                }}
              >
                {item.label}
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
          boxShadow: css.aiGlow,
          color: css.text,
          marginTop: 18,
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ ...st.aiBoxLabel, color: css.aiText }}>
          <Wand2 size={15} color={css.aiIcon} />
          AI analiza tej platformy
        </div>

        <span>{activeAccount.aiTag}</span>
      </div>
    </div>

    <div
      style={{
        ...st.postsLabel,
        color: css.muted,
        marginTop: 28,
      }}
    >
      Ostatnie publikacje — {postsByPlatform[activeAccount.id]?.length ?? 0}
    </div>

    <div
      style={{
        display: "grid",
        gap: 10,
      }}
    >
      {(postsByPlatform[activeAccount.id] ?? []).map((post) => {
        const scoreColor = getScoreColor(post.score);
        const thumbnail = getPostThumb(post);

        return (
          <div
            key={post.id}
            className="ciq-post-row"
            style={{
              background: css.surface,
              border: `1px solid ${css.border}`,
              borderRadius: 18,
              padding: 14,
              display: "grid",
              gridTemplateColumns:
                "minmax(280px, 1fr) repeat(4, minmax(90px, 0.22fr)) 86px",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
              {thumbnail ? (
                <img
                  src={thumbnail}
                  alt=""
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 13,
                    objectFit: "cover",
                    border: `1px solid ${css.border}`,
                    background: css.liveSoft,
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 13,
                    background: `${activeAccount.color}18`,
                    border: `1px solid ${activeAccount.color}44`,
                    color: activeAccount.color,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 18,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {SOCIAL_ICONS[activeAccount.id]}
                </div>
              )}

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: css.text,
                    fontSize: 13,
                    fontWeight: 800,
                    lineHeight: 1.45,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {post.title}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginTop: 7,
                    color: css.muted,
                    fontSize: 11,
                  }}
                >
                  <span>{post.date}</span>
                  <span>•</span>
                  <span>{post.type}</span>

                  {post.url && (
                    <>
                      <span>•</span>
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: activeAccount.color,
                          fontSize: 11,
                          fontWeight: 800,
                          textDecoration: "none",
                        }}
                      >
                        Otwórz ↗
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>

            {[
              ["Zasięg", post.reach],
              ["Polubienia", post.likes > 0 ? post.likes.toLocaleString() : "—"],
              ["Komentarze", String(post.comments)],
              ["Udost.", post.shares ? String(post.shares) : "—"],
            ].map(([label, value]) => (
              <div key={`${post.id}-${label}`}>
                <div
                  style={{
                    color: css.text,
                    fontSize: 14,
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  {value}
                </div>

                <div
                  style={{
                    color: css.muted,
                    fontSize: 10,
                    marginTop: 5,
                    fontWeight: 700,
                  }}
                >
                  {label}
                </div>
              </div>
            ))}

            <div
              style={{
                justifySelf: "end",
                display: "grid",
                justifyItems: "center",
                gap: 5,
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: scoreColor,
                  fontFamily: "var(--font-heading)",
                  lineHeight: 1,
                }}
              >
                {post.score}
              </div>

              <div style={{ fontSize: 10, color: css.muted }}>AI Score</div>

              <button
                type="button"
                onClick={() =>
                  setSelectedPostDetails({
                    ...post,
                    platformName: activeAccount.name,
                    platformColor: activeAccount.color,
                    platformIcon: SOCIAL_ICONS[activeAccount.id],
                    thumbnail,
                  })
                }
                style={{
                  marginTop: 4,
                  border: `1px solid ${css.border}`,
                  background: css.liveSoft,
                  color: css.muted,
                  borderRadius: 999,
                  padding: "5px 8px",
                  fontSize: 10,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Szczegóły
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}

{/* ================= PORÓWNANIE CONTENTU ================= */}
{activeTab === "compare" && (
  <div style={{ display: "grid", gap: 18 }}>
    <div
      style={{
        ...st.panel,
        background: css.surface,
        border: `1px solid ${css.border}`,
        color: css.text,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: 24,
          top: 12,
          fontSize: 120,
          lineHeight: 1,
          color: css.accent,
          opacity: 0.05,
          fontFamily: "var(--font-heading)",
          pointerEvents: "none",
        }}
      >
        ≠
      </div>

      <p
        style={{
          ...st.smallLabel,
          color: css.accent,
          fontFamily: "var(--font-label)",
          letterSpacing: ".12em",
          textTransform: "uppercase",
        }}
      >
        Porównanie contentu
      </p>

      <h2
        style={{
          ...st.sectionTitle,
          color: css.heading,
          fontFamily: "var(--font-heading)",
        }}
      >
        Które konto ciągnie wynik, a które trzeba podkręcić?
      </h2>

      <p style={{ ...st.sectionText, color: css.muted, maxWidth: 860 }}>
        Ten widok nie pokazuje tylko liczb. Porównuje platformy jak system:
        gdzie content działa najlepiej, gdzie warto przenieść format, które konto
        wymaga poprawy i na którym profilu warto się wzorować.
      </p>
    </div>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 12,
      }}
    >
      {[
        {
          label: "Wzoruj się na",
          value: comparisonInsights.leader?.name || "Brak danych",
          text: comparisonInsights.leader
            ? `To konto ma najlepszy miks jakości, zaangażowania i średniego wyniku AI. Przenieś z niego formaty i styl hooków na słabsze platformy.`
            : "Podłącz i zsynchronizuj konta, żeby AI mogło wskazać lidera.",
          color: comparisonInsights.leader?.color || css.accent,
          ai: true,
        },
        {
          label: "Podkręć najpierw",
          value: comparisonInsights.needsBoost?.name || "Brak danych",
          text: comparisonInsights.needsBoost
            ? `Tu wynik jest najniższy względem reszty. Zacznij od mocniejszych hooków, krótszych opisów i recyklingu najlepszego formatu z konta lidera.`
            : "Brak platformy do poprawy.",
          color: comparisonInsights.needsBoost?.color || css.accent,
          ai: true,
        },
        {
          label: "Najlepszy format",
          value: comparisonInsights.bestFormat?.type || "Brak danych",
          text: comparisonInsights.bestFormat
            ? `Ten typ treści ma najlepszą średnią skuteczność. Warto przygotować jego wariant na inne platformy.`
            : "Po pobraniu większej liczby postów AI wskaże najmocniejszy format.",
          color: css.accent,
          ai: false,
        },
        {
          label: "Akcja na 7 dni",
          value: "Test cross-platform",
          text:
            "Wybierz najlepszy post z konta lidera i przerób go na 2–3 warianty: short, carousel/opis oraz post edukacyjny.",
          color: css.aiText,
          ai: true,
        },
      ].map((item) => (
        <div
          key={item.label}
          style={{
            background: css.surface,
            border: `1px solid ${item.ai ? css.aiBorder : css.border}`,
            boxShadow: item.ai
              ? "0 18px 42px rgba(168,85,247,0.14)"
              : "none",
            borderRadius: 20,
            padding: 16,
            position: "relative",
            overflow: "hidden",
            minHeight: 168,
          }}
        >
          {item.ai && (
            <div
              style={{
                position: "absolute",
                left: 18,
                right: 18,
                bottom: -18,
                height: 36,
                background: "rgba(168,85,247,0.18)",
                filter: "blur(20px)",
                pointerEvents: "none",
              }}
            />
          )}

          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                color: item.ai ? css.aiText : css.accent,
                fontFamily: "var(--font-label)",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              {item.ai && <Wand2 size={15} color={css.aiIcon} />}
              {item.label}
            </div>

            <div
              style={{
                marginTop: 10,
                color: item.color,
                fontFamily: "var(--font-heading)",
                fontSize: 28,
                lineHeight: 1.05,
              }}
            >
              {item.value}
            </div>

            <p
              style={{
                margin: "10px 0 0",
                color: css.muted,
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              {item.text}
            </p>
          </div>
        </div>
      ))}
    </div>

    <div
      style={{
        background: css.surface,
        border: `1px solid ${css.border}`,
        borderRadius: 24,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: 18,
          borderBottom: `1px solid ${css.border}`,
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              color: css.accent,
              fontFamily: "var(--font-label)",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: ".1em",
              textTransform: "uppercase",
            }}
          >
            Mapa wyników
          </div>

          <h3
            style={{
              margin: "6px 0 0",
              color: css.heading,
              fontFamily: "var(--font-heading)",
              fontSize: 30,
              lineHeight: 1.05,
            }}
          >
            Platformy obok siebie
          </h3>
        </div>

        <div style={{ color: css.muted, fontSize: 12 }}>
          Porównanie liczone z ostatnio pobranych publikacji.
        </div>
      </div>

      <div style={{ padding: 14, display: "grid", gap: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(180px, 1.2fr) repeat(5, minmax(90px, .7fr)) minmax(220px, 1.4fr)",
            gap: 10,
            color: css.muted,
            fontFamily: "var(--font-label)",
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            padding: "0 10px",
          }}
        >
          <span>Platforma</span>
          <span>Posty</span>
          <span>Śr. zasięg</span>
          <span>Eng.</span>
          <span>AI Score</span>
          <span>Status</span>
          <span>AI wniosek</span>
        </div>

        {comparisonRows.map((row) => {
          const isLeader = comparisonInsights.leader?.id === row.id;
          const isWeak = comparisonInsights.needsBoost?.id === row.id;

          return (
            <div
              key={row.id}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(180px, 1.2fr) repeat(5, minmax(90px, .7fr)) minmax(220px, 1.4fr)",
                gap: 10,
                alignItems: "center",
                background: css.surfaceSoft,
                border: `1px solid ${
                  isLeader ? row.color : isWeak ? css.aiBorder : css.border
                }`,
                borderRadius: 18,
                padding: 12,
                boxShadow: isWeak ? "0 14px 34px rgba(168,85,247,0.10)" : "none",
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    display: "grid",
                    placeItems: "center",
                    background: `${row.color}18`,
                    border: `1px solid ${row.color}44`,
                    color: row.color,
                    fontWeight: 900,
                  }}
                >
                  {row.icon}
                </div>

                <div>
                  <div
                    style={{
                      color: css.text,
                      fontWeight: 900,
                      fontSize: 14,
                    }}
                  >
                    {row.name}
                  </div>

                  <div style={{ color: css.muted, fontSize: 11, marginTop: 3 }}>
                    {isLeader
                      ? "konto wzorcowe"
                      : isWeak
                        ? "do poprawy"
                        : "stabilne"}
                  </div>
                </div>
              </div>

              <strong style={{ color: css.text }}>{row.postsCount}</strong>
              <strong style={{ color: css.text }}>{compactMetric(row.avgReach)}</strong>
              <strong style={{ color: css.text }}>
                {compactMetric(row.avgEngagement)}
              </strong>

              <strong
                style={{
                  color: getScoreColor(row.avgScore),
                  fontFamily: "var(--font-heading)",
                  fontSize: 23,
                }}
              >
                {row.avgScore || "—"}
              </strong>

              <div>
                <span
                  style={{
                    display: "inline-flex",
                    borderRadius: 999,
                    padding: "5px 8px",
                    background: isLeader
                      ? `${row.color}18`
                      : isWeak
                        ? css.aiBgSoft
                        : css.liveSoft,
                    color: isLeader ? row.color : isWeak ? css.aiText : css.muted,
                    border: `1px solid ${
                      isLeader ? `${row.color}44` : isWeak ? css.aiBorder : css.border
                    }`,
                    fontSize: 10,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                  }}
                >
                  {isLeader ? "wzór" : isWeak ? "podkręcić" : "ok"}
                </span>
              </div>

              <div
                style={{
                  color: css.muted,
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                {isLeader
                  ? "Z tego konta kopiuj strukturę tematów, rytm publikacji i typ hooków."
                  : isWeak
                    ? "Tu warto przetestować format z konta lidera i mocniejsze CTA."
                    : "Utrzymuj regularność i szukaj jednego formatu do skalowania."}
              </div>
            </div>
          );
        })}
      </div>
    </div>

    <div
      style={{
        background: css.surface,
        border: `1px solid ${css.aiBorder}`,
        boxShadow: "0 20px 50px rgba(168,85,247,0.13)",
        borderRadius: 24,
        padding: 18,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 22,
          right: 22,
          bottom: -22,
          height: 46,
          background: "rgba(168,85,247,0.18)",
          filter: "blur(24px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            color: css.aiText,
            fontFamily: "var(--font-label)",
            fontWeight: 900,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <Wand2 size={15} color={css.aiIcon} />
          AI playbook na następny tydzień
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12,
            marginTop: 14,
          }}
        >
          {[
            {
              title: "1. Przenieś zwycięski schemat",
              text: comparisonInsights.leader
                ? `Weź najlepszy post z ${comparisonInsights.leader.name} i przygotuj wariant na ${comparisonInsights.needsBoost?.name || "słabszą platformę"}. Nie kopiuj 1:1 — zmień hook i CTA pod kontekst platformy.`
                : "Najpierw zsynchronizuj platformy, żeby znaleźć zwycięski schemat.",
            },
            {
              title: "2. Popraw słabsze konto",
              text: comparisonInsights.needsBoost
                ? `${comparisonInsights.needsBoost.name} wymaga najmocniejszej interwencji. Zacznij od 3 testów: krótszy hook, mocniejsze pytanie na końcu i format edukacyjny.`
                : "Po pobraniu danych AI wskaże konto do poprawy.",
            },
            {
              title: "3. Testuj format, nie tylko temat",
              text: comparisonInsights.bestFormat
                ? `Najlepiej wypada format ${comparisonInsights.bestFormat.type}. Przygotuj 3 warianty tego formatu z innymi tematami.`
                : "Zbierz więcej postów, żeby AI mogło wybrać najmocniejszy format.",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: css.surfaceSoft,
                border: `1px solid ${css.aiBorder}`,
                borderRadius: 18,
                padding: 15,
              }}
            >
              <div
                style={{
                  color: css.aiText,
                  fontSize: 13,
                  fontWeight: 900,
                  marginBottom: 7,
                }}
              >
                {item.title}
              </div>

              <div
                style={{
                  color: css.text,
                  fontSize: 12,
                  lineHeight: 1.65,
                }}
              >
                {item.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)}
{selectedPostDetails && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      background: "rgba(0,0,0,0.72)",
      backdropFilter: "blur(10px)",
      display: "grid",
      placeItems: "center",
      padding: 22,
    }}
    onClick={() => setSelectedPostDetails(null)}
  >
    <div
      onClick={(event) => event.stopPropagation()}
      style={{
        width: "min(980px, 96vw)",
        maxHeight: "90vh",
        overflow: "auto",
        background: css.surface,
        border: `1px solid ${css.border}`,
        borderRadius: 28,
        boxShadow: "0 28px 90px rgba(0,0,0,0.45)",
        color: css.text,
      }}
    >
      <div
        style={{
          height: 5,
          background: selectedPostDetails.platformColor || css.accent,
          borderRadius: "28px 28px 0 0",
        }}
      />

      <div style={{ padding: 24, display: "grid", gap: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                color: css.accent,
                fontFamily: "var(--font-label)",
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: ".12em",
                textTransform: "uppercase",
              }}
            >
              Szczegóły publikacji
            </div>

            <h2
              style={{
                margin: "8px 0 0",
                color: css.heading,
                fontFamily: "var(--font-heading)",
                fontSize: 34,
                lineHeight: 1.05,
              }}
            >
              {selectedPostDetails.platformName}
            </h2>

            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                color: css.muted,
                fontSize: 12,
              }}
            >
              <span>{selectedPostDetails.date}</span>
              <span>•</span>
              <span>{selectedPostDetails.type}</span>

              {selectedPostDetails.url && (
                <>
                  <span>•</span>
                  <a
                    href={selectedPostDetails.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: selectedPostDetails.platformColor || css.accent,
                      fontWeight: 900,
                      textDecoration: "none",
                    }}
                  >
                    Otwórz post ↗
                  </a>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedPostDetails(null)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              border: `1px solid ${css.border}`,
              background: css.liveSoft,
              color: css.text,
              cursor: "pointer",
              fontSize: 18,
              fontWeight: 900,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "220px 1fr",
            gap: 20,
            alignItems: "start",
          }}
        >
          <div>
            {selectedPostDetails.thumbnail ? (
              <img
                src={selectedPostDetails.thumbnail}
                alt=""
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  objectFit: "cover",
                  borderRadius: 22,
                  border: `1px solid ${css.border}`,
                  background: css.liveSoft,
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  borderRadius: 22,
                  border: `1px solid ${css.border}`,
                  background: css.liveSoft,
                  display: "grid",
                  placeItems: "center",
                  color: selectedPostDetails.platformColor || css.accent,
                  fontSize: 42,
                  fontWeight: 900,
                }}
              >
                {selectedPostDetails.platformIcon}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div
                style={{
                  color: css.muted,
                  fontFamily: "var(--font-label)",
                  fontSize: 13,
                  fontWeight: 900,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Tytuł / hook
              </div>

              <div
                style={{
                  color: css.text,
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                {selectedPostDetails.title || "Publikacja bez tytułu"}
              </div>
            </div>

            <div>
              <div
                style={{
                  color: css.muted,
                  fontFamily: "var(--font-label)",
                  fontSize: 13,
                  fontWeight: 900,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Pełny opis
              </div>

              <div
                style={{
                  background: css.liveSoft,
                  border: `1px solid ${css.border}`,
                  borderRadius: 18,
                  padding: 14,
                  color: css.text,
                  fontSize: 13,
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                }}
              >
                {selectedPostDetails.description ||
                  selectedPostDetails.content ||
                  selectedPostDetails.title ||
                  "Brak pełnego opisu dla tej publikacji."}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {[
            ["Zasięg", selectedPostDetails.reach],
            ["Wyświetlenia", selectedPostDetails.impressions ?? "—"],
            [
              "Polubienia",
              selectedPostDetails.likes > 0
                ? selectedPostDetails.likes.toLocaleString()
                : "—",
            ],
            ["Komentarze", String(selectedPostDetails.comments ?? 0)],
            [
              "Udost.",
              selectedPostDetails.shares ? String(selectedPostDetails.shares) : "—",
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                background: css.liveSoft,
                border: `1px solid ${css.border}`,
                borderRadius: 18,
                padding: 14,
                minHeight: 82,
              }}
            >
              <div
                style={{
                  color: css.text,
                  fontFamily: "var(--font-heading)",
                  fontSize: 24,
                  lineHeight: 1,
                }}
              >
                {value}
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: css.muted,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: css.aiBg,
            border: `1px solid ${css.aiBorder}`,
            boxShadow: css.aiGlow,
            color: css.text,
            borderRadius: 22,
            padding: 18,
            display: "grid",
            gap: 12,
          }}
        >
          <div
            style={{
              color: css.aiText,
              fontFamily: "var(--font-label)",
              fontWeight: 900,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <Wand2 size={15} color={css.aiIcon} />
            AI Score i miejsce na analizę
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "grid",
                placeItems: "center",
                width: 96,
                height: 96,
                borderRadius: 26,
                background: css.aiBgSoft,
                border: `1px solid ${css.aiBorder}`,
                color: getScoreColor(selectedPostDetails.score),
                fontFamily: "var(--font-heading)",
                fontSize: 34,
                fontWeight: 900,
              }}
            >
              {selectedPostDetails.score}
            </div>

            <div
              style={{
                color: css.text,
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              Na tym etapie AI Score jest punktacją techniczną. W kolejnym kroku
              podłączymy tutaj pełne wyjaśnienie: dlaczego publikacja dostała
              taki wynik, co poprawić i jaki następny krok wykonać.
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {[
              {
                title: "Dlaczego taki wynik?",
                text: "Tu pojawi się wyjaśnienie AI na podstawie zasięgu, interakcji, formatu i historii konta.",
              },
              {
                title: "Co poprawić?",
                text: "Tu pojawią się konkretne wskazówki naprawy: hook, format, CTA, miniatura, opis.",
              },
              {
                title: "Co zrobić dalej?",
                text: "Tu pojawi się rekomendacja: przerób na short, dodaj do harmonogramu albo opublikuj wariant.",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  background: css.aiBgSoft,
                  border: `1px solid ${css.aiBorder}`,
                  borderRadius: 18,
                  padding: 13,
                }}
              >
                <div
                  style={{
                    color: css.aiText,
                    fontSize: 12,
                    fontWeight: 900,
                    marginBottom: 6,
                  }}
                >
                  {item.title}
                </div>

                <div
                  style={{
                    color: css.text,
                    fontSize: 12,
                    lineHeight: 1.55,
                  }}
                >
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
)}

{/* ================= BRAND VOICE ================= */}
{activeTab === "brand" && (
  <div style={{ display: "grid", gap: 18 }}>
    <div
      style={{
        ...st.panel,
        background: css.surface,
        border: `1px solid ${css.border}`,
        marginBottom: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: 22,
          top: 12,
          fontSize: 110,
          lineHeight: 1,
          color: css.accent,
          opacity: 0.05,
          fontFamily: "var(--font-heading)",
          pointerEvents: "none",
        }}
      >
        B
      </div>

      <p
        style={{
          ...st.smallLabel,
          color: css.accent,
          fontFamily: "var(--font-label)",
          letterSpacing: ".12em",
          textTransform: "uppercase",
        }}
      >
        Brand Voice
      </p>

      <h2
        style={{
          ...st.sectionTitle,
          color: css.heading,
          fontFamily: "var(--font-heading)",
          fontWeight: 500,
          maxWidth: 860,
        }}
      >
        Naucz AI stylu Twojej marki
      </h2>

      <p
        style={{
          ...st.sectionText,
          color: css.muted,
          maxWidth: 940,
          lineHeight: 1.75,
        }}
      >
        To miejsce definiuje, jak AI ma pisać, mówić i doradzać. Zapisz ton
        marki, słowa, których używasz, tematy, których unikasz, przykłady
        dobrych treści i zasady komunikacji. Dzięki temu Content Studio, Short
        Studio, Video Studio i AI Partner będą generować treści bardziej spójne
        z Twoją marką.
      </p>
    </div>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 12,
      }}
    >
      {[
        {
          label: "01 / Ton marki",
          title: "Jak mówimy?",
          text:
            "Profesjonalnie, lekko, ekspercko, sprzedażowo, edukacyjnie albo bardziej po ludzku — tutaj określasz styl.",
          ai: false,
        },
        {
          label: "02 / Słowa i frazy",
          title: "Czego używamy?",
          text:
            "Dodaj zwroty, hasła, słowa-klucze i określenia, które mają często pojawiać się w treściach.",
          ai: false,
        },
        {
          label: "03 / Zakazy",
          title: "Czego unikamy?",
          text:
            "Zapisz słowa, obietnice, styl albo tematy, których AI nie powinno używać w komunikacji marki.",
          ai: true,
        },
        {
          label: "04 / Przykłady",
          title: "Na czym się wzorować?",
          text:
            "Dodaj najlepsze posty, opisy i teksty, żeby AI rozumiało, jaki styl już działa i co ma powielać.",
          ai: true,
        },
      ].map((item) => (
        <div
          key={item.title}
          style={{
            background: css.surface,
            border: `1px solid ${item.ai ? css.aiBorder : css.border}`,
            boxShadow: item.ai
              ? "0 16px 38px rgba(168,85,247,0.13)"
              : "0 12px 28px rgba(0,0,0,0.16)",
            borderRadius: 20,
            padding: 16,
            position: "relative",
            overflow: "hidden",
            minHeight: 172,
          }}
        >
          {item.ai && (
            <div
              style={{
                position: "absolute",
                left: 18,
                right: 18,
                bottom: -18,
                height: 36,
                background: "rgba(168,85,247,0.17)",
                filter: "blur(20px)",
                pointerEvents: "none",
              }}
            />
          )}

          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                color: item.ai ? css.aiText : css.accent,
                fontFamily: "var(--font-label)",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              {item.ai && <Wand2 size={15} color={css.aiIcon} />}
              {item.label}
            </div>

            <div
              style={{
                marginTop: 10,
                color: css.heading,
                fontFamily: "var(--font-heading)",
                fontSize: 24,
                lineHeight: 1.05,
                fontWeight: 500,
              }}
            >
              {item.title}
            </div>

            <p
              style={{
                margin: "10px 0 0",
                color: css.muted,
                fontSize: 12,
                lineHeight: 1.65,
              }}
            >
              {item.text}
            </p>
          </div>
        </div>
      ))}
    </div>

    <div
      style={{
        background: css.surface,
        border: `1px solid ${css.aiBorder}`,
        boxShadow:
          "0 20px 50px rgba(0,0,0,0.24), 0 20px 46px rgba(168,85,247,0.13)",
        borderRadius: 24,
        padding: 18,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 22,
          right: 22,
          bottom: -22,
          height: 46,
          background: "rgba(168,85,247,0.18)",
          filter: "blur(24px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            color: css.aiText,
            fontFamily: "var(--font-label)",
            fontWeight: 900,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <Wand2 size={15} color={css.aiIcon} />
          Jak Brand Voice wpływa na AI?
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
            marginTop: 14,
          }}
        >
          {[
            {
              title: "Content Studio",
              text:
                "AI tworzy posty w Twoim tonie, z Twoimi zwrotami i bez przypadkowego stylu z internetu.",
            },
            {
              title: "Short / Video Studio",
              text:
                "Hooki, scenariusze i opisy są dopasowane do marki, a nie tylko do trendów.",
            },
            {
              title: "AI Partner",
              text:
                "Partner contentowy lepiej rozumie, co rozwijać, czego unikać i jaki kierunek jest spójny z marką.",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: css.surfaceSoft,
                border: `1px solid ${css.aiBorder}`,
                borderRadius: 18,
                padding: 15,
              }}
            >
              <div
                style={{
                  color: css.aiText,
                  fontSize: 13,
                  fontWeight: 900,
                  marginBottom: 7,
                }}
              >
                {item.title}
              </div>

              <div
                style={{
                  color: css.text,
                  fontSize: 12,
                  lineHeight: 1.65,
                }}
              >
                {item.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <BrandVoice dark={dark} workspaceId={workspaceId} />
  </div>
)}
 {/* ================= CZAT AI ================= */}
 {activeTab === "chat" && (
              <AIChat dark={dark} workspaceId={workspaceId} />
            )}
 {/* ================= BLOG LIBRARY ================= */}
{activeTab === "blogLibrary" && (
  <div>
    <BlogLibrary dark={dark} workspaceId={workspaceId} />
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
      <p
        style={{
          ...st.smallLabel,
          color: css.accent,
          fontFamily: "var(--font-label)",
          letterSpacing: ".12em",
          textTransform: "uppercase",
        }}
      >
        Content Studio AI
      </p>

      <h2
        style={{
          ...st.sectionTitle,
          color: css.heading,
          fontFamily: "var(--font-heading)",
          fontWeight: 500,
        }}
      >
        Twórz, analizuj, adaptuj i testuj hooki
      </h2>

      <p style={{ ...st.sectionText, color: css.muted }}>
        Ten moduł zna treść przed publikacją. Dzięki temu po opublikowaniu
        system porównuje treść z realnym wynikiem i uczy AI, jaki styl działa
        najlepiej na danej platformie.
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
      <p
        style={{
          ...st.smallLabel,
          color: css.accent,
          fontFamily: "var(--font-label)",
          letterSpacing: ".12em",
          textTransform: "uppercase",
        }}
      >
        Video Studio
      </p>

      <h2
        style={{
          ...st.sectionTitle,
          color: css.heading,
          fontFamily: "var(--font-heading)",
          fontWeight: 500,
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
{/* ================= OFERTA I LINKI ================= */}
{activeTab === "offers" && (
  <div>
    <BrandOffers dark={dark} workspaceId={workspaceId} />
  </div>
)}
{/* ================= BLOG STUDIO ================= */}
{activeTab === "blogStudio" && (
  <div>
    <div
      style={{
        ...st.panel,
        background: css.surface,
        border: `1px solid ${css.border}`,
        marginBottom: 18,
      }}
    >
      <p
        style={{
          ...st.smallLabel,
          color: css.accent,
          fontFamily: "var(--font-label)",
          letterSpacing: ".12em",
          textTransform: "uppercase",
        }}
      >
        Blog Studio
      </p>

      <h2
        style={{
          ...st.sectionTitle,
          color: css.heading,
          fontFamily: "var(--font-heading)",
          fontWeight: 500,
        }}
      >
        Notatnik pisarza z AI do tworzenia wpisów blogowych
      </h2>

      <p style={{ ...st.sectionText, color: css.muted }}>
        Twórz szkice, rozwijaj artykuły, zapisuj tematy i używaj bloga jako
        źródła contentu na social media. AI pomaga wtedy, kiedy brakuje pomysłu,
        słów albo kolejnego akapitu.
      </p>
    </div>

    <BlogStudio dark={dark} workspaceId={workspaceId} />
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
      <p
        style={{
          ...st.smallLabel,
          color: css.accent,
          fontFamily: "var(--font-label)",
          letterSpacing: ".12em",
          textTransform: "uppercase",
        }}
      >
        Short Studio
      </p>

      <h2
        style={{
          ...st.sectionTitle,
          color: css.heading,
          fontFamily: "var(--font-heading)",
          fontWeight: 500,
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
      <p
        style={{
          ...st.smallLabel,
          color: css.accent,
          fontFamily: "var(--font-label)",
          letterSpacing: ".12em",
          textTransform: "uppercase",
        }}
      >
        Creative Studio
      </p>

      <h2
        style={{
          ...st.sectionTitle,
          color: css.heading,
          fontFamily: "var(--font-heading)",
          fontWeight: 500,
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
                      fontFamily: "var(--font-heading)",
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
{/* ================= INSPIRACJE ================= */}
{activeTab in INSPIRATION_VIEWS && (
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
        {INSPIRATION_VIEWS[activeTab as keyof typeof INSPIRATION_VIEWS].label}
      </p>

      <h2
        style={{
          ...st.sectionTitle,
          color: css.text,
          fontFamily: "var(--font-heading)",
        }}
      >
        {INSPIRATION_VIEWS[activeTab as keyof typeof INSPIRATION_VIEWS].title}
      </h2>

      <p style={{ ...st.sectionText, color: css.muted }}>
        {INSPIRATION_VIEWS[activeTab as keyof typeof INSPIRATION_VIEWS].description}
      </p>
    </div>

    <Inspirations
      dark={dark}
      workspaceId={workspaceId}
      kind={INSPIRATION_VIEWS[activeTab as keyof typeof INSPIRATION_VIEWS].kind}
      onOpenStudio={() =>
        setActiveTab(
          INSPIRATION_VIEWS[activeTab as keyof typeof INSPIRATION_VIEWS].targetTab
        )
      }
    />
  </div>
)}
{/* ================= AI PARTNER ================= */}
{activeTab === "partner" && (
  <div style={{ display: "grid", gap: 18 }}>
    <div
      style={{
        ...st.panel,
        background: css.surface,
        border: `1px solid ${css.border}`,
        marginBottom: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: 22,
          top: 12,
          fontSize: 118,
          lineHeight: 1,
          color: css.accent,
          opacity: 0.05,
          fontFamily: "var(--font-heading)",
          pointerEvents: "none",
        }}
      >
        AI
      </div>

      <p
        style={{
          ...st.smallLabel,
          color: css.accent,
          fontFamily: "var(--font-label)",
          letterSpacing: ".12em",
          textTransform: "uppercase",
        }}
      >
        AI Partner
      </p>

      <h2
        style={{
          ...st.sectionTitle,
          color: css.heading,
          fontFamily: "var(--font-heading)",
          fontWeight: 500,
          maxWidth: 820,
        }}
      >
        Twój samouczący się partner contentowy
      </h2>

      <p
        style={{
          ...st.sectionText,
          color: css.muted,
          maxWidth: 920,
          lineHeight: 1.75,
        }}
      >
        Ten moduł ma działać jak strateg, redaktor i analityk w jednym. Łączy
        Brand Voice, szkice, szablony i realne wyniki z platform, a potem
        podpowiada: co rozwijać, co poprawić, które formaty skalować i jak
        dopasować komunikację do TikToka, Instagrama, Facebooka, YouTube,
        LinkedIna oraz bloga.
      </p>
    </div>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 12,
      }}
    >
      {[
        {
          label: "01 / Uczy się stylu",
          title: "Brand Voice",
          text:
            "Zbiera ton marki, słowa-klucze, zakazy, styl komunikacji i przykłady najlepszych treści.",
          ai: false,
        },
        {
          label: "02 / Czyta wyniki",
          title: "Realne dane",
          text:
            "Patrzy na zasięg, reakcje, komentarze, udostępnienia i AI Score z opublikowanych postów.",
          ai: false,
        },
        {
          label: "03 / Myśli strategicznie",
          title: "AI wskazówki",
          text:
            "Podpowiada, które tematy rozwijać, które platformy poprawić i co przerobić na inny format.",
          ai: true,
        },
        {
          label: "04 / Planuje dalej",
          title: "Następny krok",
          text:
            "Pomaga zamienić wnioski w konkret: hook, format, harmonogram, szablon albo inspirację.",
          ai: true,
        },
      ].map((item) => (
        <div
          key={item.title}
          style={{
            background: css.surface,
            border: `1px solid ${item.ai ? css.aiBorder : css.border}`,
            boxShadow: item.ai
              ? "0 16px 38px rgba(168,85,247,0.13)"
              : "0 12px 28px rgba(0,0,0,0.16)",
            borderRadius: 20,
            padding: 16,
            position: "relative",
            overflow: "hidden",
            minHeight: 176,
          }}
        >
          {item.ai && (
            <div
              style={{
                position: "absolute",
                left: 18,
                right: 18,
                bottom: -18,
                height: 36,
                background: "rgba(168,85,247,0.17)",
                filter: "blur(20px)",
                pointerEvents: "none",
              }}
            />
          )}

          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                color: item.ai ? css.aiText : css.accent,
                fontFamily: "var(--font-label)",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              {item.ai && <Wand2 size={15} color={css.aiIcon} />}
              {item.label}
            </div>

            <div
              style={{
                marginTop: 10,
                color: css.heading,
                fontFamily: "var(--font-heading)",
                fontSize: 25,
                lineHeight: 1.05,
                fontWeight: 500,
              }}
            >
              {item.title}
            </div>

            <p
              style={{
                margin: "10px 0 0",
                color: css.muted,
                fontSize: 12,
                lineHeight: 1.65,
              }}
            >
              {item.text}
            </p>
          </div>
        </div>
      ))}
    </div>

    <div
      style={{
        background: css.surface,
        border: `1px solid ${css.aiBorder}`,
        boxShadow:
          "0 20px 50px rgba(0,0,0,0.24), 0 20px 46px rgba(168,85,247,0.13)",
        borderRadius: 24,
        padding: 18,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 22,
          right: 22,
          bottom: -22,
          height: 46,
          background: "rgba(168,85,247,0.18)",
          filter: "blur(24px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            color: css.aiText,
            fontFamily: "var(--font-label)",
            fontWeight: 900,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <Wand2 size={15} color={css.aiIcon} />
          Jak korzystać z AI Partnera?
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr .9fr",
            gap: 16,
            marginTop: 14,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              background: css.liveSoft,
              border: `1px solid ${css.border}`,
              borderRadius: 18,
              padding: 16,
            }}
          >
            <h3
              style={{
                margin: "0 0 10px",
                color: css.heading,
                fontFamily: "var(--font-heading)",
                fontSize: 25,
                lineHeight: 1.08,
                fontWeight: 500,
              }}
            >
              Nie pytaj tylko „co opublikować?” — pytaj „co rozwijać dalej?”
            </h3>

            <p
              style={{
                margin: 0,
                color: css.text,
                fontSize: 13,
                lineHeight: 1.75,
              }}
            >
              AI Partner powinien pomagać podejmować decyzje. Ma wskazać, które
              konto jest wzorem, które wymaga poprawy, jaki format warto
              powtórzyć, gdzie zmienić hook i co można przerobić na short,
              karuzelę, post ekspercki albo wpis blogowy.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            {[
              "Zapisz Brand Voice i zasady marki.",
              "Wybierz najlepsze szablony oraz szkice.",
              "Porównaj je z realnymi wynikami z social mediów.",
              "Poproś AI o plan: co powtórzyć, co naprawić, co przetestować.",
            ].map((item, index) => (
              <div
                key={item}
                style={{
                  background: css.surface,
                  border: `1px solid ${css.aiBorder}`,
                  borderRadius: 16,
                  padding: 12,
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    background: css.aiBgSoft,
                    color: css.aiText,
                    border: `1px solid ${css.aiBorder}`,
                    fontSize: 11,
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </div>

                <div
                  style={{
                    color: css.text,
                    fontSize: 12,
                    lineHeight: 1.55,
                  }}
                >
                  {item}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    <AIPartner dark={dark} workspaceId={workspaceId} />
  </div>
)}
    {/* ================= AI strateg ================= */}
{activeTab === "strategist" && (
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
        AI Strateg
      </p>

      <h2
        style={{
          ...st.sectionTitle,
          color: css.text,
          fontFamily: "var(--font-heading)",
        }}
      >
        Strategia contentu na najbliższy okres
      </h2>

      <p style={{ ...st.sectionText, color: css.muted }}>
        AI analizuje Twoje materiały, szablony, inspiracje, harmonogram i połączone platformy, a następnie układa realny miesięczny plan publikacji.
      </p>
    </div>

    <AIStrategist
      dark={dark}
      workspaceId={workspaceId}
    />
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
                        fontFamily: "var(--font-heading)",
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
                      fontFamily: "var(--font-heading)",
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
                      fontFamily: "var(--font-heading)",
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

          <footer
            className="ciq-footer"
            style={{
              ...st.footer,
              borderTop: `1px solid ${css.border}`,
              color: css.muted,
              background: css.bg,
            }}
          >
            <div style={st.footerLegal}>
              <Link href="/privacy" style={{ ...st.footerLink, color: css.muted }}>
                Polityka prywatności
              </Link>
              <span style={{ opacity: 0.4 }}>·</span>
              <Link href="/terms" style={{ ...st.footerLink, color: css.muted }}>
                Regulamin
              </Link>
            </div>

            <div style={st.footerSignature}>
              Stworzone z pasji do danych, contentu i mądrzejszej pracy przez{" "}
              <a
                href="https://anmcollective.pl"
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...st.footerCompanyLink, color: css.accent }}
              >
                ANM Collective
              </a>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

// ─── THEME VARS ───────────────────────────────────────────────────────────────

const darkVars = {
  bg: "#1A2233",
  sidebar: "#111827",
  surface: "#050505",
  surfaceSoft: "#0B0B0D",
  text: "#FFFFFF",
  muted: "#C9CED8",
  border: "rgba(255,255,255,0.10)",

  accent: "#8E443D",
  accentSoft: "rgba(142, 68, 61, 0.18)",
  accentBorder: "rgba(142, 68, 61, 0.55)",
  activeBg: "rgba(142, 68, 61, 0.20)",
  activeText: "#FFFFFF",
  activeShadow: "0 16px 36px rgba(142, 68, 61, 0.22)",
  hoverBg: "rgba(255,255,255,0.06)",

  heading: "#8E443D",
  card: "#050505",
  cardAlt: "#0B0B0D",
  sidebarButton: "rgba(255,255,255,0.035)",
  sidebarShadow: "18px 0 44px rgba(0,0,0,0.28)",
  groupIconBg: "rgba(255,255,255,0.06)",
  groupIconText: "#F7D2CC",
  groupText: "#DDE3EE",
  sectionTitle: "#F7D2CC",
  subItemText: "#EEF2FF",
  subItemMuted: "#AEB7C7",
  subItemActive: "rgba(142, 68, 61, 0.18)",
  subItemActiveBorder: "rgba(142, 68, 61, 0.62)",

  aiBg: "rgba(109, 40, 217, 0.16)",
  aiBgSoft: "rgba(147, 51, 234, 0.12)",
  aiBorder: "rgba(192, 132, 252, 0.55)",
  aiText: "#D8B4FE",
  aiGlow: "0 0 28px rgba(168, 85, 247, 0.28)",
  aiIcon: "#F0ABFC",

  liveSoft: "rgba(255,255,255,0.045)",

  logoBg: "#8E443D",
  logoText: "#FFFFFF",
  logoShadow: "0 12px 28px rgba(142, 68, 61, 0.28)",
};

const lightVars = {
  bg: "#FFFFFF",
  sidebar: "#F7F2EF",
  surface: "#B5937A",
  surfaceSoft: "#F7F2EF",
  text: "#2B2B2B",
  muted: "#5F5A57",
  border: "rgba(35,31,32,0.14)",

  accent: "#231F20",
  accentSoft: "rgba(181, 147, 122, 0.22)",
  accentBorder: "rgba(35,31,32,0.24)",
  activeBg: "rgba(181, 147, 122, 0.28)",
  activeText: "#231F20",
  activeShadow: "0 16px 36px rgba(35,31,32,0.10)",
  hoverBg: "rgba(35,31,32,0.06)",

  heading: "#231F20",
  card: "#B5937A",
  cardAlt: "#F7F2EF",
  sidebarButton: "rgba(255,255,255,0.72)",
  sidebarShadow: "18px 0 44px rgba(35,31,32,0.08)",
  groupIconBg: "rgba(35,31,32,0.08)",
  groupIconText: "#231F20",
  groupText: "#4E4642",
  sectionTitle: "#231F20",
  subItemText: "#2B2B2B",
  subItemMuted: "#6E655F",
  subItemActive: "rgba(181, 147, 122, 0.32)",
  subItemActiveBorder: "rgba(35,31,32,0.22)",

  aiBg: "rgba(124, 58, 237, 0.10)",
  aiBgSoft: "rgba(245, 243, 255, 0.95)",
  aiBorder: "rgba(124, 58, 237, 0.34)",
  aiText: "#6D28D9",
  aiGlow: "0 0 26px rgba(124, 58, 237, 0.18)",
  aiIcon: "#A855F7",

  liveSoft: "rgba(255,255,255,0.55)",

  logoBg: "#231F20",
  logoText: "#FFFFFF",
  logoShadow: "0 12px 28px rgba(35,31,32,0.14)",
};

// ─── STATIC STYLES ────────────────────────────────────────────────────────────

const st: Record<string, CSSProperties> = {
  root: {
    transition: "background 0.3s",
    minHeight: "100vh",
    fontFamily: "var(--font-body)",
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
    fontFamily: "var(--font-body)",
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
    fontFamily: "var(--font-body)",
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
    fontFamily: "var(--font-body)",
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
    fontFamily: "var(--font-body)",
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
    padding: "18px 30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 10,
    gap: 18,
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
    fontWeight: 500,
    letterSpacing: "-0.03em",
    margin: 0,
  },

  pageSubtitle: {
    fontSize: 13,
    marginTop: 6,
  },

  topActions: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },

  themeTopButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    transition: "all 0.18s ease",
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
    padding: "28px 30px 76px",
    flex: 1,
    overflowY: "auto",
  },

  footer: {
    minHeight: 48,
    padding: "12px 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
    flexWrap: "wrap",
    fontSize: 11,
    lineHeight: 1.5,
  },

  footerLegal: {
    display: "inline-flex",
    alignItems: "center",
    gap: 9,
  },

  footerLink: {
    textDecoration: "none",
    fontWeight: 700,
  },

  footerSignature: {
    textAlign: "right",
  },

  footerCompanyLink: {
    textDecoration: "none",
    fontWeight: 900,
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
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.035)",
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
    letterSpacing: ".08em",
    margin: 0,
    fontFamily: "var(--font-label)",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
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
    gap: 8,
    alignItems: "flex-start",
    padding: "14px 16px",
    borderRadius: 18,
    marginTop: 12,
    fontSize: 11,
    lineHeight: 1.5,
    position: "relative",
    overflow: "hidden",
    zIndex: 1,
  },

  aiBoxLabel: {
    fontSize: 10,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: ".08em",
    fontFamily: "var(--font-label)",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
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
    padding: "14px 16px",
    borderRadius: 18,
    marginTop: 10,
    fontSize: 11,
    lineHeight: 1.45,
    position: "relative",
    overflow: "hidden",
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
    gap: 8,
    marginTop: 10,
    borderRadius: 18,
    padding: "14px 16px",
    position: "relative",
    overflow: "hidden",
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
