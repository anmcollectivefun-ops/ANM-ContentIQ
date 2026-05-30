"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";
import ContentStudio from "@/app/components/ContentStudio";

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
}

interface PlatformConnection {
  id: string;
  platform: Platform;
  account_name: string;
  last_synced_at: string | null;
  connected: boolean;
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
  source: "import" | "created_in_app" | "scheduled_in_app";
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
  icon: string;
}

// ─── DATA STARTOWE / PÓŹNIEJ SUPABASE ────────────────────────────────────────

const ACCOUNTS: Account[] = [
  {
    id: "instagram",
    name: "Instagram",
    handle: "@anm_collective",
    score: 84,
    trend: 11,
    posts: 38,
    engRate: "4.2%",
    reach: "12.4k",
    bestFormat: "Reels edukacyjne",
    aiTag:
      "Reels edukacyjne mają 2× wyższy zasięg niż karuzele. Warto zwiększyć liczbę krótkich materiałów video.",
    color: "#E1306C",
    connected: true,
    lastSync: "12 min temu",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    handle: "ANM Collective",
    score: 91,
    trend: 18,
    posts: 22,
    engRate: "6.8%",
    reach: "28.1k",
    bestFormat: "Case studies",
    aiTag:
      "Najlepszy kanał na leady B2B i content ekspercki. Tematy z LinkedIna warto rozwijać później na blogu.",
    color: "#0A66C2",
    connected: true,
    lastSync: "8 min temu",
  },
  {
    id: "tiktok",
    name: "TikTok",
    handle: "@anm_collective",
    score: 63,
    trend: -4,
    posts: 15,
    engRate: "2.1%",
    reach: "6.8k",
    bestFormat: "Krótkie listy błędów",
    aiTag:
      "Długie opisy nie działają. TikTok wymaga krótszego hooka i mocniejszego wejścia w pierwszych sekundach.",
    color: "#FFFFFF",
    connected: true,
    lastSync: "28 min temu",
  },
  {
    id: "youtube",
    name: "YouTube",
    handle: "ANM Collective",
    score: 77,
    trend: 6,
    posts: 9,
    engRate: "54% ret.",
    reach: "3.2k",
    bestFormat: "Shorts + tutoriale",
    aiTag:
      "Shorts mają wyższy CTR niż długie filmy. Warto zwiększyć częstotliwość krótkich formatów edukacyjnych.",
    color: "#FF0033",
    connected: true,
    lastSync: "1 godz. temu",
  },
  {
    id: "facebook",
    name: "Facebook",
    handle: "ANM Collective",
    score: 58,
    trend: -2,
    posts: 18,
    engRate: "1.4%",
    reach: "5.1k",
    bestFormat: "Video + grupy",
    aiTag:
      "Organiczny zasięg spada. Facebook warto traktować jako kanał społecznościowy i dystrybucję do grup.",
    color: "#1877F2",
    connected: false,
    lastSync: "Niepodłączone",
  },
  {
    id: "blog",
    name: "Blog",
    handle: "anmcollective.pl",
    score: 79,
    trend: 22,
    posts: 11,
    engRate: "3:42 avg",
    reach: "8.9k",
    bestFormat: "Poradniki SEO",
    aiTag:
      "Artykuły poradnikowe mają najwyższy czas na stronie. Blog powinien być bazą do recyklingu treści na social media.",
    color: "#22C55E",
    connected: true,
    lastSync: "2 godz. temu",
  },
  {
    id: "spotify",
    name: "Spotify",
    handle: "ANM Podcast",
    score: 72,
    trend: 9,
    posts: 7,
    engRate: "41% completion",
    reach: "2.7k",
    bestFormat: "Odcinki poradnikowe",
    aiTag:
      "Najlepiej działają krótkie odcinki z konkretną obietnicą w tytule. Warto tworzyć podcasty z tematów blogowych.",
    color: "#1DB954",
    connected: false,
    lastSync: "Niepodłączone",
  },
];

const POSTS: Record<Platform, Post[]> = {
  instagram: [
    {
      id: "ig-1",
      title: "5 narzędzi AI do tworzenia contentu",
      date: "24 maja",
      type: "Reels",
      score: 94,
      reach: "31.2k",
      likes: 1840,
      comments: 94,
      saves: 420,
      shares: 122,
      status: "opublikowany",
      source: "scheduled_in_app",
      ai: "Najlepszy wynik miesiąca. Kontynuuj format „narzędzia + demo” w Reels.",
    },
    {
      id: "ig-2",
      title: "Jak planować content na miesiąc",
      date: "19 maja",
      type: "Karuzela",
      score: 71,
      reach: "12.8k",
      likes: 540,
      comments: 38,
      saves: 210,
      shares: 41,
      status: "opublikowany",
      source: "created_in_app",
      ai: "Dobre zapisy, ale niższy zasięg. Popraw okładkę i skróć pierwszy slajd.",
    },
    {
      id: "ig-3",
      title: "Cytat o content marketingu",
      date: "15 maja",
      type: "Obraz",
      score: 42,
      reach: "4.1k",
      likes: 180,
      comments: 6,
      saves: 22,
      status: "opublikowany",
      source: "import",
      ai: "Słaby wynik. Cytaty bez kontekstu nie angażują. Zastąp konkretną radą.",
    },
  ],
  linkedin: [
    {
      id: "li-1",
      title: "Case study: +340% zasięgu dla klienta",
      date: "23 maja",
      type: "Post",
      score: 96,
      reach: "48.3k",
      likes: 2140,
      comments: 187,
      shares: 89,
      status: "opublikowany",
      source: "scheduled_in_app",
      ai: "Najlepszy post kwartału. Kontynuuj case studies z liczbami w tytule.",
    },
    {
      id: "li-2",
      title: "AI nie zastąpi strategii contentowej",
      date: "18 maja",
      type: "Post",
      score: 89,
      reach: "33.1k",
      likes: 1640,
      comments: 142,
      shares: 61,
      status: "opublikowany",
      source: "created_in_app",
      ai: "Wysoki engagement. Posty kontrariańskie działają dobrze na B2B.",
    },
    {
      id: "li-3",
      title: "Jak tworzysz content? Ankieta",
      date: "13 maja",
      type: "Ankieta",
      score: 74,
      reach: "18.9k",
      likes: 890,
      comments: 98,
      status: "opublikowany",
      source: "import",
      ai: "Ankiety zbierają komentarze, ale mają mniejszy zasięg. Używaj jako uzupełnienie.",
    },
  ],
  tiktok: [
    {
      id: "tt-1",
      title: "3 błędy twórców content marketingu",
      date: "22 maja",
      type: "Video",
      score: 81,
      reach: "18.4k",
      likes: 1240,
      comments: 87,
      saves: 340,
      shares: 102,
      status: "opublikowany",
      source: "scheduled_in_app",
      ai: "Format „3 błędy” + dynamiczny montaż działa. Dubluj ten schemat.",
    },
    {
      id: "tt-2",
      title: "Jak działają algorytmy TikToka",
      date: "17 maja",
      type: "Video",
      score: 44,
      reach: "3.2k",
      likes: 210,
      comments: 12,
      saves: 44,
      status: "opublikowany",
      source: "created_in_app",
      ai: "Zbyt długi wstęp — 8 sekund bez hooka. Przebuduj pierwsze 2 sekundy.",
    },
    {
      id: "tt-3",
      title: "Mega lista narzędzi AI do marketingu",
      date: "11 maja",
      type: "Video",
      score: 38,
      reach: "2.8k",
      likes: 180,
      comments: 8,
      saves: 62,
      status: "opublikowany",
      source: "import",
      ai: "Ten temat lepiej działa jako karuzela na Instagramie albo post LinkedIn.",
    },
  ],
  youtube: [
    {
      id: "yt-1",
      title: "AI do planowania contentu — tutorial",
      date: "20 maja",
      type: "Film",
      score: 83,
      reach: "4.1k",
      likes: 312,
      comments: 54,
      shares: 19,
      status: "opublikowany",
      source: "created_in_app",
      ai: "Dobra retencja. Dodaj rozdziały — użytkownicy pomijają intro.",
    },
    {
      id: "yt-2",
      title: "Content strategy 2025 — co działa?",
      date: "12 maja",
      type: "Shorts",
      score: 91,
      reach: "11.2k",
      likes: 840,
      comments: 73,
      shares: 44,
      status: "opublikowany",
      source: "scheduled_in_app",
      ai: "Shorts ma wyższy CTR niż długie filmy. Zwiększ liczbę Shorts tygodniowo.",
    },
  ],
  facebook: [
    {
      id: "fb-1",
      title: "5 trendów content marketingu 2025",
      date: "21 maja",
      type: "Post",
      score: 52,
      reach: "6.8k",
      likes: 210,
      comments: 18,
      shares: 12,
      status: "opublikowany",
      source: "import",
      ai: "Zasięg organiczny spada. Rozważ grupy tematyczne lub promocję.",
    },
    {
      id: "fb-2",
      title: "Prezentacja nowych usług ANM",
      date: "14 maja",
      type: "Video",
      score: 61,
      reach: "9.2k",
      likes: 380,
      comments: 27,
      shares: 18,
      status: "opublikowany",
      source: "created_in_app",
      ai: "Video działa lepiej niż posty statyczne. Zwiększ udział video.",
    },
  ],
  blog: [
    {
      id: "bl-1",
      title: "Jak mierzyć skuteczność content marketingu?",
      date: "23 maja",
      type: "Artykuł",
      score: 88,
      reach: "12.3k",
      likes: 0,
      comments: 34,
      shares: 22,
      status: "opublikowany",
      source: "created_in_app",
      ai: "Najwyższy czas na stronie. Format z checklistą warto replikować.",
    },
    {
      id: "bl-2",
      title: "AI w marketingu treści: przegląd narzędzi",
      date: "16 maja",
      type: "Artykuł",
      score: 79,
      reach: "8.1k",
      likes: 0,
      comments: 18,
      shares: 14,
      status: "opublikowany",
      source: "scheduled_in_app",
      ai: "Dobre SEO. Aktualizuj sekcję o narzędziach co kwartał.",
    },
    {
      id: "bl-3",
      title: "Dlaczego twój content nie działa? 7 powodów",
      date: "9 maja",
      type: "Artykuł",
      score: 92,
      reach: "18.7k",
      likes: 0,
      comments: 61,
      shares: 47,
      status: "opublikowany",
      source: "created_in_app",
      ai: "Format „N powodów” + liczba w tytule daje świetne SEO.",
    },
  ],
  spotify: [
    {
      id: "sp-1",
      title: "Jak AI zmieni pracę content managera?",
      date: "25 maja",
      type: "Podcast",
      score: 78,
      reach: "3.4k",
      likes: 260,
      comments: 21,
      shares: 17,
      status: "opublikowany",
      source: "created_in_app",
      ai: "Dobry completion rate. Tytuł z pytaniem działa lepiej niż tytuły opisowe.",
    },
    {
      id: "sp-2",
      title: "Strategia contentu bez chaosu",
      date: "18 maja",
      type: "Podcast",
      score: 69,
      reach: "2.1k",
      likes: 180,
      comments: 12,
      shares: 9,
      status: "opublikowany",
      source: "import",
      ai: "Temat dobry, ale opis za ogólny. Dodaj listę konkretnych punktów odcinka.",
    },
  ],
};

const PLANNED_CONTENT: PlannedContent[] = [
  {
    id: "plan-1",
    title: "Jak AI analizuje skuteczność contentu?",
    platform: "linkedin",
    date: "Jutro, 09:00",
    status: "Zaplanowane",
    originalIdea: "Post ekspercki B2B",
    aiPrediction: "Wysoki potencjał komentarzy. Użyj liczby w pierwszym zdaniu.",
  },
  {
    id: "plan-2",
    title: "3 błędy w tworzeniu TikToków firmowych",
    platform: "tiktok",
    date: "Piątek, 18:30",
    status: "Do akceptacji",
    originalIdea: "Krótki format video",
    aiPrediction: "Dobry format dla TikToka. Hook musi wejść w pierwszej sekundzie.",
  },
  {
    id: "plan-3",
    title: "Dlaczego content bez analityki nie działa?",
    platform: "blog",
    date: "Poniedziałek, 08:00",
    status: "Szkic",
    originalIdea: "Artykuł SEO",
    aiPrediction: "Warto przerobić później na LinkedIn i newsletter.",
  },
];

const NAV_TABS: NavTab[] = [
  { id: "accounts", label: "Podsumowanie kont", icon: "◈" },
  { id: "content", label: "Podsumowanie contentu", icon: "▤" },
  { id: "compare", label: "Porównanie contentu", icon: "⊞" },
  { id: "calendar", label: "Harmonogram", icon: "◷" },
  { id: "studio", label: "Content Studio", icon: "✦" },
  { id: "integrations", label: "Integracje", icon: "⊕" },
  { id: "settings", label: "Ustawienia", icon: "◎" },
];

const INSIGHTS: Insight[] = [
  {
    type: "up",
    text: "Temat „AI w marketingu” zebrał 48k na LinkedIn, ale tylko 2.1k na TikToku. Rozwijaj go jako post ekspercki, a na TikToka przebuduj jako „3 błędy”.",
  },
  {
    type: "warn",
    text: "Styl z długim wstępem działa źle na TikToku i Instagramie. Skróć hook do 1–2 zdań.",
  },
  {
    type: "up",
    text: "Content edukacyjny ma 2× wyższe zaangażowanie niż sprzedażowy na większości kanałów.",
  },
];

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

function mergeConnections(accounts: Account[], connections: PlatformConnection[]) {
  return accounts.map((account) => {
    const connection = connections.find((item) => item.platform === account.id);

    if (!connection) {
      return {
        ...account,
        connected: false,
        handle: "Niepodłączone",
        lastSync: "Niepodłączone",
      };
    }

    return {
      ...account,
      connected: true,
      handle: connection.account_name,
      lastSync: formatLastSync(connection.last_synced_at),
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
  const [accounts, setAccounts] = useState<Account[]>(ACCOUNTS);

  const css = dark ? darkVars : lightVars;

  const bestAccount = useMemo(() => [...accounts].sort((a, b) => b.score - a.score)[0], [accounts]);
  const weakestAccount = useMemo(() => [...accounts].sort((a, b) => a.score - b.score)[0], [accounts]);

  const latestContentGroups = useMemo(() => {
    return accounts.map((account) => ({
      account,
      posts: (POSTS[account.id] ?? []).slice(0, 3),
    }));
  }, [accounts]);

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);

      const saved = localStorage.getItem("ciq-theme");
      if (saved) {
        setDark(saved === "dark");
      }
    });

    supabase
      .schema("contentiq")
      .from("workspaces")
      .select("id")
      .eq("slug", workspaceId)
      .single()
      .then(({ data: workspace, error: workspaceError }) => {
        if (workspaceError || !workspace?.id) {
          console.error("Workspace load error:", workspaceError?.message || workspaceId);
          return;
        }

        supabase
          .schema("contentiq")
          .from("platform_connections")
          .select("id, platform, account_name, last_synced_at, connected")
          .eq("workspace_id", workspace.id)
          .eq("connected", true)
          .then(({ data, error }) => {
            if (error) {
              console.error("Connections load error:", error.message);
              return;
            }

            setAccounts(mergeConnections(ACCOUNTS, (data || []) as PlatformConnection[]));
          });
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
    setActiveTab(tab);
    setActiveAccount(null);
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

      <div className="ciq-shell" style={st.shell}>
        {/* ───────────────── SIDEBAR ───────────────── */}
        <aside
          className="ciq-sidebar"
          style={{
            ...st.sidebar,
            background: css.sidebar,
            borderRight: `1px solid ${css.border}`,
          }}
        >
          <Link href="/app/contentiq" style={st.sidebarLogo}>
            <div
              style={{
                ...st.logoMark,
                background: css.logoBg,
                color: css.logoText,
              }}
            >
              IQ
            </div>

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
                Centrum contentu
              </div>
            </div>
          </Link>

          <nav className="ciq-nav" style={st.nav}>
            {NAV_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => openTab(tab.id)}
                className="ciq-nav-tab"
                style={{
                  ...st.navTab,
                  background: activeTab === tab.id ? css.activeBg : "transparent",
                  color: activeTab === tab.id ? css.text : css.muted,
                  borderLeft:
                    activeTab === tab.id
                      ? `3px solid ${css.accent}`
                      : "3px solid transparent",
                }}
              >
                <span style={st.navIcon}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <div style={st.sidebarBottom}>
            <button
              onClick={toggleTheme}
              style={{
                ...st.themeToggle,
                background: css.surface,
                border: `1px solid ${css.border}`,
                color: css.muted,
              }}
            >
              {dark ? "☀ Jasny tryb" : "☾ Ciemny tryb"}
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
              {signingOut ? "Wylogowywanie..." : "Wyloguj"}
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
                    {INSIGHTS.map((insight, index) => (
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
                          color: account.trend > 0 ? "#22c55e" : "#ef4444",
                        }}
                      >
                        {account.trend > 0 ? "↑" : "↓"}{" "}
                        {Math.abs(account.trend)}% miesiąc do miesiąca
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ================= SZCZEGÓŁY KONTA ================= */}
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
                  Ostatnie publikacje — {POSTS[activeAccount.id]?.length ?? 0}
                </div>

                <div style={st.postsList}>
                  {(POSTS[activeAccount.id] ?? []).map((post) => {
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
                    Content ekspercki i case studies mają najwyższy potencjał na
                    LinkedIn i Blogu. TikTok i Instagram wymagają skrócenia
                    przekazu oraz dużo mocniejszego hooka na wejściu.
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
              <div
                style={{
                  ...st.panel,
                  background: css.surface,
                  border: `1px solid ${css.border}`,
                }}
              >
                <p style={{ ...st.smallLabel, color: css.accent }}>
                  Harmonogram contentu
                </p>

                <h2
                  style={{
                    ...st.sectionTitle,
                    color: css.text,
                    fontFamily: "'DM Serif Display', serif",
                  }}
                >
                  Zaplanowane treści połączone z późniejszym wynikiem
                </h2>

                <div style={st.postsList}>
                  {PLANNED_CONTENT.map((item) => (
                    <div
                      key={item.id}
                      className="ciq-calendar-row ciq-post-row"
                      style={{
                        ...st.calendarRow,
                        background: css.liveSoft,
                        border: `1px solid ${css.border}`,
                      }}
                    >
                      <div>
                        <p style={{ ...st.postTitle, color: css.text }}>
                          {item.title}
                        </p>

                        <p style={{ ...st.sectionText, color: css.muted }}>
                          {item.originalIdea}
                        </p>
                      </div>

                      <div>
                        <span
                          style={{
                            ...st.badge,
                            background: `${getPlatformColor(item.platform)}18`,
                            color: getPlatformColor(item.platform),
                          }}
                        >
                          {getPlatformName(item.platform)}
                        </span>
                      </div>

                      <div style={{ color: css.muted, fontSize: 12 }}>
                        {item.date}
                      </div>

                      <div>
                        <span
                          style={{
                            ...st.badge,
                            background: css.activeBg,
                            color: css.muted,
                          }}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div
                        style={{
                          ...st.scheduleAI,
                          background: css.aiBgSoft,
                          border: `1px solid ${css.aiBorder}`,
                        }}
                      >
                        <span style={{ ...st.aiBoxLabel, color: css.aiText }}>
                          ✦ AI przewidywanie
                        </span>

                        <p style={{ ...st.aiSmall, color: css.text }}>
                          {item.aiPrediction}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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

                <ContentStudio dark={dark} />
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
  bg: "#050505",
  sidebar: "#080808",
  surface: "#111111",
  text: "#F5F5F5",
  muted: "#9CA3AF",
  border: "#27272A",
  accent: "#E5E7EB",
  activeBg: "#18181B",
  hoverBg: "#1F1F22",
  accentBorder: "#52525B",
  aiBg: "#0C1117",
  aiBgSoft: "#101820",
  aiBorder: "#1E3A4C",
  aiText: "#7DD3FC",
  liveSoft: "#0B0B0C",
  logoBg: "#F5F5F5",
  logoText: "#050505",
};

const lightVars = {
  bg: "#F6F6F6",
  sidebar: "#FFFFFF",
  surface: "#FFFFFF",
  text: "#111111",
  muted: "#71717A",
  border: "#E4E4E7",
  accent: "#111111",
  activeBg: "#F4F4F5",
  hoverBg: "#F4F4F5",
  accentBorder: "#A1A1AA",
  aiBg: "#F0F9FF",
  aiBgSoft: "#F8FCFF",
  aiBorder: "#BAE6FD",
  aiText: "#0284C7",
  liveSoft: "#FAFAFA",
  logoBg: "#111111",
  logoText: "#FFFFFF",
};

// ─── STATIC STYLES ────────────────────────────────────────────────────────────

const st: Record<string, CSSProperties> = {
  root: {
    transition: "background 0.3s",
    minHeight: "100vh",
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
  },
  shell: {
    display: "grid",
    gridTemplateColumns: "270px 1fr",
    minHeight: "100vh",
  },
  sidebar: {
    display: "flex",
    flexDirection: "column",
    padding: "0",
    position: "sticky",
    top: 0,
    height: "100vh",
    transition: "background 0.3s",
  },
  sidebarLogo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "22px 18px",
    textDecoration: "none",
  },
  logoMark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 900,
    flexShrink: 0,
  },
  logoName: {
    fontSize: 18,
    letterSpacing: "-0.02em",
  },
  logoSub: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginTop: 2,
  },
  nav: {
    flex: 1,
    padding: "8px 0",
  },
  navTab: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "11px 18px",
    fontSize: 13,
    border: "none",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    textAlign: "left",
  },
  navIcon: {
    fontSize: 12,
    width: 16,
    textAlign: "center",
  },
  sidebarBottom: {
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  themeToggle: {
    padding: "9px 12px",
    borderRadius: 12,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  signoutBtn: {
    padding: "9px 12px",
    borderRadius: 12,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
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
