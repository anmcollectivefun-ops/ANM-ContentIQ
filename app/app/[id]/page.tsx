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
  | "dashboard"
  | "studio"
  | "calendar"
  | "analytics"
  | "compare"
  | "publishing"
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

// ─── CONSTS / START DATA ─────────────────────────────────────────────────────

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
    aiTag: "Reels edukacyjne mają 2× wyższy zasięg niż karuzele.",
    color: "#E1306C",
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
    aiTag: "Najlepszy kanał na leady B2B i content ekspercki.",
    color: "#0A66C2",
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
    aiTag: "Długie opisy nie działają. Potrzebujesz mocniejszego hooka.",
    color: "#111827",
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
    aiTag: "Shorts mają 3× wyższy CTR. Zwiększ ich częstotliwość.",
    color: "#FF0000",
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
    aiTag: "Organiczny zasięg spada. Rekomendacja: skupić się na grupach.",
    color: "#1877F2",
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
    aiTag: "Artykuły poradnikowe mają najwyższy czas na stronie.",
    color: "#22C55E",
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
    aiTag: "Najlepiej działają krótkie odcinki z konkretną obietnicą w tytule.",
    color: "#1DB954",
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
      ai: "Dobre zapisy, ale niski zasięg. Popraw okładkę i skróć pierwszy slajd.",
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
      ai: "Shorts ma 3× wyższy CTR niż długie filmy. Zwiększ do 3 Shorts tygodniowo.",
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
  { id: "dashboard", label: "Dashboard", icon: "◈" },
  { id: "studio", label: "Content Studio", icon: "✦" },
  { id: "calendar", label: "Kalendarz", icon: "◻" },
  { id: "analytics", label: "AI Analiza", icon: "◉" },
  { id: "compare", label: "Porównanie", icon: "⊞" },
  { id: "publishing", label: "Publikacja", icon: "▣" },
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

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getPlatformName(platform: Platform) {
  return ACCOUNTS.find((account) => account.id === platform)?.name ?? platform;
}

function getPlatformColor(platform: Platform) {
  return ACCOUNTS.find((account) => account.id === platform)?.color ?? "#818cf8";
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

// ─── SCORE BAR ───────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = getScoreColor(score);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={st.scoreTrack}>
        <div
          style={{
            width: `${score}%`,
            height: "100%",
            borderRadius: 2,
            background: color,
            transition: "width 0.6s ease",
          }}
        />
      </div>

      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color,
          minWidth: 30,
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
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const workspaceId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const css = dark ? darkVars : lightVars;

  const bestAccount = useMemo(() => getBestAccount(), []);
  const weakestAccount = useMemo(() => getWeakestAccount(), []);

  useEffect(() => {
    setMounted(true);

    const saved = localStorage.getItem("ciq-theme");
    if (saved) {
      setDark(saved === "dark");
    }
  }, []);

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
        }

        .ciq-nav-tab {
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }

        .ciq-nav-tab:hover {
          background: ${css.hoverBg} !important;
        }

        .ciq-account-tile {
          transition: transform 0.2s cubic-bezier(.22,.68,0,1.2), border-color 0.2s, background 0.2s;
        }

        .ciq-account-tile:hover {
          transform: translateY(-3px);
          border-color: ${css.accentBorder} !important;
        }

        .ciq-post-row {
          transition: background 0.15s, border-color 0.15s;
        }

        .ciq-post-row:hover {
          background: ${css.hoverBg} !important;
          border-color: ${css.accentBorder} !important;
        }

        .ciq-input::placeholder {
          color: ${css.muted};
        }

        ::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: ${css.border};
          border-radius: 4px;
        }

        @media (max-width: 980px) {
          .ciq-shell {
            grid-template-columns: 1fr !important;
          }

          .ciq-sidebar {
            position: relative !important;
            height: auto !important;
            border-right: none !important;
          }

          .ciq-nav {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }

          .ciq-topbar {
            position: relative !important;
            flex-direction: column;
            align-items: flex-start !important;
          }

          .ciq-top-actions {
            width: 100%;
            flex-wrap: wrap;
          }

          .ciq-tiles-grid,
          .ciq-insights-grid,
          .ciq-compare-grid,
          .ciq-studio-grid,
          .ciq-integrations-grid {
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
          {/* ================= LOGO ================= */}
          <Link href="/dashboard" style={st.sidebarLogo}>
            <div
              style={{
                ...st.logoMark,
                background: dark ? "#fff" : "#0f172a",
                color: dark ? "#0f172a" : "#fff",
              }}
            >
              IQ
            </div>

            <div>
              <div
                style={{
                  ...st.logoText,
                  fontFamily: "'DM Serif Display', serif",
                  color: css.text,
                }}
              >
                ANM ContentIQ
              </div>

              <div style={{ ...st.logoWs, color: css.muted }}>
                {String(workspaceId).replaceAll("-", " ")}
              </div>
            </div>
          </Link>

          {/* ================= NAVIGATION ================= */}
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
                      ? `2px solid ${css.accent}`
                      : "2px solid transparent",
                }}
              >
                <span style={st.navIcon}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* ================= SIDEBAR BOTTOM ================= */}
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
                background: "#ef444410",
                border: "1px solid #ef444430",
              }}
            >
              {signingOut ? "Wylogowywanie..." : "Wyloguj"}
            </button>
          </div>
        </aside>

        {/* ───────────────── MAIN ───────────────── */}
        <div style={{ ...st.mainArea, background: css.bg }}>
          {/* ================= TOP BAR ================= */}
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
                {activeAccount ? activeAccount.name : "Wszystkie konta"}
              </h1>

              <p style={{ ...st.pageSubtitle, color: css.muted }}>
                Analiza kont, treści, publikacji i wyników w jednym dashboardzie.
              </p>
            </div>

            <div className="ciq-top-actions" style={st.topActions}>
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
                ← Dashboard
              </Link>

              <button
                onClick={() => openTab("studio")}
                style={{
                  ...st.topBtn,
                  background: dark ? "#fff" : "#0f172a",
                  color: dark ? "#0f172a" : "#fff",
                  border: "none",
                }}
              >
                + Nowy content
              </button>
            </div>
          </header>

          {/* ================= CONTENT AREA ================= */}
          <div style={st.content}>
            {/* ================= DASHBOARD TAB ================= */}
            {activeTab === "dashboard" && !activeAccount && (
              <div>
                {/* ===== AI INSIGHTS STRIP ===== */}
                <div
                  style={{
                    ...st.insightStrip,
                    background: css.surface,
                    border: `1px solid ${css.border}`,
                  }}
                >
                  <div style={{ ...st.insightTitle, color: css.accent }}>
                    ✦ AI Cross-Platform Insights
                  </div>

                  <div className="ciq-insights-grid" style={st.insightsGrid}>
                    {INSIGHTS.map((insight, index) => (
                      <div
                        key={index}
                        style={{
                          ...st.insightItem,
                          borderLeft: `2px solid ${
                            insight.type === "up"
                              ? "#22c55e"
                              : insight.type === "warn"
                                ? "#f59e0b"
                                : css.accent
                          }`,
                        }}
                      >
                        <p style={{ ...st.insightText, color: css.muted }}>
                          {insight.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ===== GLOBAL SUMMARY ===== */}
                <div className="ciq-compare-grid" style={st.summaryGrid}>
                  <div
                    style={{
                      ...st.summaryCard,
                      background: css.surface,
                      border: `1px solid ${css.border}`,
                    }}
                  >
                    <p style={{ ...st.smallLabel, color: css.muted }}>
                      Najmocniejsza platforma
                    </p>
                    <h3 style={{ ...st.summaryValue, color: css.text }}>
                      {bestAccount.name}
                    </h3>
                    <p style={{ ...st.summaryNote, color: css.muted }}>
                      {bestAccount.aiTag}
                    </p>
                  </div>

                  <div
                    style={{
                      ...st.summaryCard,
                      background: css.surface,
                      border: `1px solid ${css.border}`,
                    }}
                  >
                    <p style={{ ...st.smallLabel, color: css.muted }}>
                      Do poprawy
                    </p>
                    <h3 style={{ ...st.summaryValue, color: css.text }}>
                      {weakestAccount.name}
                    </h3>
                    <p style={{ ...st.summaryNote, color: css.muted }}>
                      {weakestAccount.aiTag}
                    </p>
                  </div>

                  <div
                    style={{
                      ...st.summaryCard,
                      background: css.surface,
                      border: `1px solid ${css.border}`,
                    }}
                  >
                    <p style={{ ...st.smallLabel, color: css.muted }}>
                      Mechanizm AI
                    </p>
                    <h3 style={{ ...st.summaryValue, color: css.text }}>
                      Content → wynik → rekomendacja
                    </h3>
                    <p style={{ ...st.summaryNote, color: css.muted }}>
                      AI zna treść przed publikacją i porównuje ją z wynikiem po
                      publikacji.
                    </p>
                  </div>
                </div>

                {/* ===== ACCOUNT TILES ===== */}
                <div style={{ ...st.tilesLabel, color: css.muted }}>
                  Podłączone konta — kliknij kafelek, aby zobaczyć posty
                </div>

                <div className="ciq-tiles-grid" style={st.tilesGrid}>
                  {ACCOUNTS.map((account) => (
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
                      <div
                        style={{
                          height: 3,
                          background: account.color,
                          borderRadius: "12px 12px 0 0",
                          margin: "-18px -18px 14px",
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
                            eng. rate
                          </div>
                        </div>

                        <div>
                          <div style={{ ...st.tileStatValue, color: css.text }}>
                            {account.reach}
                          </div>
                          <div style={{ ...st.tileStatLabel, color: css.muted }}>
                            zasięg avg
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          ...st.tileAI,
                          background: `${account.color}15`,
                          color: account.color,
                        }}
                      >
                        <span style={{ fontSize: 10 }}>✦</span>
                        <span style={{ fontSize: 11, lineHeight: 1.45 }}>
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

            {/* ================= ACCOUNT DETAIL ================= */}
            {activeTab === "dashboard" && activeAccount && (
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
                  <div
                    style={{
                      height: 4,
                      background: activeAccount.color,
                      borderRadius: "14px 14px 0 0",
                      margin: "-20px -20px 16px",
                    }}
                  />

                  <div className="ciq-account-summary-row" style={st.accountSummaryRow}>
                    <div>
                      <div
                        style={{
                          fontSize: 30,
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
                        ["Eng. Rate", activeAccount.engRate],
                        ["Zasięg avg", activeAccount.reach],
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
                      background: `${activeAccount.color}15`,
                      color: activeAccount.color,
                      marginTop: 16,
                    }}
                  >
                    <span>✦</span>
                    <span>{activeAccount.aiTag}</span>
                  </div>
                </div>

                <div style={{ ...st.postsLabel, color: css.muted }}>
                  Posty i publikacje — {POSTS[activeAccount.id]?.length ?? 0}
                </div>

                <div style={st.postsList}>
                  {(POSTS[activeAccount.id] ?? []).map((post) => {
                    const scoreColor = getScoreColor(post.score);

                    const metrics = [
                      ["Zasięg", post.reach],
                      ["Polubienia", post.likes > 0 ? post.likes.toLocaleString() : "—"],
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
                                background: `${activeAccount.color}15`,
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
                              background: `${activeAccount.color}12`,
                              color: activeAccount.color,
                            }}
                          >
                            ✦ {post.ai}
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
        Twórz, analizuj i adaptuj content na platformy
      </h2>

      <p style={{ ...st.sectionText, color: css.muted }}>
        Ten moduł zna treść przed publikacją. Dzięki temu po opublikowaniu
        posta system będzie mógł połączyć treść z realnymi wynikami i uczyć AI,
        jaki styl działa na konkretnej platformie.
      </p>
    </div>

    <ContentStudio dark={dark} />
  </div>
)}

            {/* ================= CALENDAR ================= */}
            {activeTab === "calendar" && (
              <div
                style={{
                  ...st.panel,
                  background: css.surface,
                  border: `1px solid ${css.border}`,
                }}
              >
                <p style={{ ...st.smallLabel, color: css.accent }}>
                  Kalendarz i plan publikacji
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
                      style={{
                        ...st.calendarRow,
                        background: css.bg,
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
                            background: `${getPlatformColor(item.platform)}15`,
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

                      <p style={{ ...st.aiSmall, color: css.accent }}>
                        ✦ {item.aiPrediction}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================= AI ANALYTICS ================= */}
            {activeTab === "analytics" && (
              <div className="ciq-compare-grid" style={st.compareGrid}>
                {[
                  [
                    "Learning Loop",
                    "AI zna treść przed publikacją, a potem łączy ją z wynikiem z API.",
                  ],
                  [
                    "Content Score",
                    "Ocena hooka, CTA, stylu, formatu, platformy i realnego wyniku.",
                  ],
                  [
                    "Rekomendacje",
                    "System sugeruje, co poprawić i gdzie dany typ treści ma największy sens.",
                  ],
                ].map(([title, text]) => (
                  <div
                    key={title}
                    style={{
                      ...st.panel,
                      background: css.surface,
                      border: `1px solid ${css.border}`,
                    }}
                  >
                    <p style={{ ...st.smallLabel, color: css.accent }}>
                      AI Engine
                    </p>
                    <h2
                      style={{
                        ...st.sectionTitle,
                        color: css.text,
                        fontFamily: "'DM Serif Display', serif",
                      }}
                    >
                      {title}
                    </h2>
                    <p style={{ ...st.sectionText, color: css.muted }}>{text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ================= COMPARE ================= */}
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
                    Ten widok pokazuje, czy temat lepiej działa jako LinkedIn
                    post, TikTok, Reels, blog, YouTube albo podcast.
                  </p>
                </div>

                <div style={st.compareTable}>
                  {ACCOUNTS.map((account) => (
                    <div
                      key={account.id}
                      style={{
                        ...st.compareRow,
                        background: css.surface,
                        border: `1px solid ${css.border}`,
                      }}
                    >
                      <div>
                        <strong style={{ color: css.text }}>{account.name}</strong>
                        <p style={{ fontSize: 12, color: css.muted }}>
                          {account.handle}
                        </p>
                      </div>

                      <div>
                        <ScoreBar score={account.score} />
                      </div>

                      <div style={{ fontSize: 12, color: css.muted }}>
                        Najlepszy format:{" "}
                        <span style={{ color: account.color }}>
                          {account.bestFormat}
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: css.muted }}>
                        {account.aiTag}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================= PUBLISHING ================= */}
            {activeTab === "publishing" && (
              <div
                style={{
                  ...st.panel,
                  background: css.surface,
                  border: `1px solid ${css.border}`,
                }}
              >
                <p style={{ ...st.smallLabel, color: css.accent }}>
                  Scheduler / Publishing
                </p>

                <h2
                  style={{
                    ...st.sectionTitle,
                    color: css.text,
                    fontFamily: "'DM Serif Display', serif",
                  }}
                >
                  Planowanie i publikacja z aplikacji
                </h2>

                <p style={{ ...st.sectionText, color: css.muted }}>
                  Docelowo użytkownik tworzy content w aplikacji, wybiera
                  platformy, planuje publikację, a system po publikacji pobiera
                  wyniki i łączy je z zaplanowaną treścią.
                </p>

                <div className="ciq-compare-grid" style={st.compareGrid}>
                  {[
                    ["1", "Treść utworzona w Content Studio"],
                    ["2", "Warianty dopasowane do platform"],
                    ["3", "Publikacja / zaplanowanie"],
                    ["4", "Pobranie wyników po publikacji"],
                    ["5", "AI porównuje treść z wynikiem"],
                    ["6", "AI rekomenduje lepszą wersję"],
                  ].map(([step, text]) => (
                    <div
                      key={step}
                      style={{
                        ...st.suggestionCard,
                        background: css.bg,
                        border: `1px solid ${css.border}`,
                      }}
                    >
                      <strong style={{ color: css.accent }}>Krok {step}</strong>
                      <p style={{ color: css.muted }}>{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================= INTEGRATIONS ================= */}
            {activeTab === "integrations" && (
              <div className="ciq-integrations-grid" style={st.integrationsGrid}>
                {INTEGRATIONS.map((integration) => (
                  <div
                    key={integration.name}
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
                        background: css.bg,
                      }}
                    >
                      Skonfiguruj
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ================= SETTINGS ================= */}
            {activeTab === "settings" && (
              <div className="ciq-studio-grid" style={st.studioGrid}>
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
                    Ton komunikacji, słowa preferowane, słowa zakazane, persony,
                    oferta, CTA i przykłady najlepszych postów.
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
                    Workspace
                  </p>

                  <h2
                    style={{
                      ...st.sectionTitle,
                      color: css.text,
                      fontFamily: "'DM Serif Display', serif",
                    }}
                  >
                    Ustawienia projektu
                  </h2>

                  <p style={{ ...st.sectionText, color: css.muted }}>
                    Zespół, role, integracje, połączone konta, dashboard i
                    domyślne cele contentowe.
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
  bg: "#080c14",
  sidebar: "#070a11",
  surface: "#0f1520",
  text: "#eef2ff",
  muted: "#8190ad",
  border: "#151e30",
  accent: "#818cf8",
  activeBg: "#131b2e",
  hoverBg: "#131b2e",
  accentBorder: "#818cf8",
};

const lightVars = {
  bg: "#f8f7f4",
  sidebar: "#ffffff",
  surface: "#ffffff",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e8e8e4",
  accent: "#6366f1",
  activeBg: "#f0f0fe",
  hoverBg: "#f8f8ff",
  accentBorder: "#6366f1",
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
    gridTemplateColumns: "250px 1fr",
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
    padding: "20px 18px",
    textDecoration: "none",
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 800,
    flexShrink: 0,
  },
  logoText: {
    fontSize: 16,
    letterSpacing: "-0.02em",
  },
  logoWs: {
    fontSize: 10,
    textTransform: "capitalize",
    letterSpacing: "0.02em",
    marginTop: 1,
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
    padding: "10px 18px",
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
    padding: "8px 12px",
    borderRadius: 10,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  signoutBtn: {
    padding: "8px 12px",
    borderRadius: 10,
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
    padding: "16px 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 400,
    letterSpacing: "-0.02em",
    margin: 0,
  },
  pageSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  topActions: {
    display: "flex",
    gap: 10,
  },
  topBtn: {
    padding: "9px 16px",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  content: {
    padding: "24px 28px",
    flex: 1,
    overflowY: "auto",
  },
  insightStrip: {
    borderRadius: 16,
    padding: "18px 20px",
    marginBottom: 20,
  },
  insightTitle: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  insightsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
  },
  insightItem: {
    paddingLeft: 12,
  },
  insightText: {
    fontSize: 12,
    lineHeight: 1.6,
    margin: 0,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 14,
    marginBottom: 24,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 18,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 400,
    margin: "6px 0",
  },
  summaryNote: {
    fontSize: 12,
    lineHeight: 1.6,
    margin: 0,
  },
  smallLabel: {
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    margin: 0,
  },
  tilesLabel: {
    fontSize: 11,
    fontWeight: 700,
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
    borderRadius: 16,
    padding: 18,
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
  },
  tileTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  tileName: {
    fontSize: 15,
    fontWeight: 800,
  },
  tileHandle: {
    fontSize: 11,
    marginTop: 2,
  },
  tileArrow: {
    fontSize: 12,
    marginTop: 2,
  },
  scoreTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    background: "#ffffff18",
  },
  tileStats: {
    display: "flex",
    gap: 20,
    paddingTop: 12,
    marginTop: 12,
  },
  tileStatValue: {
    fontSize: 13,
    fontWeight: 800,
  },
  tileStatLabel: {
    fontSize: 10,
  },
  tileAI: {
    display: "flex",
    gap: 6,
    alignItems: "flex-start",
    padding: "8px 10px",
    borderRadius: 9,
    marginTop: 12,
    fontSize: 11,
    lineHeight: 1.45,
  },
  tileTrend: {
    fontSize: 11,
    marginTop: 8,
    fontWeight: 700,
  },
  backBtn: {
    padding: "7px 14px",
    borderRadius: 10,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    marginBottom: 18,
  },
  accountSummary: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  accountSummaryRow: {
    display: "flex",
    gap: 34,
    alignItems: "center",
    justifyContent: "space-between",
  },
  accountMetrics: {
    display: "flex",
    gap: 28,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 800,
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  postsLabel: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 12,
  },
  postsList: {
    display: "flex",
    flexDirection: "column",
    gap: 9,
  },
  postRow: {
    borderRadius: 14,
    padding: "15px 16px",
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
    fontWeight: 800,
    lineHeight: 1.4,
    margin: 0,
  },
  postMeta: {
    display: "flex",
    gap: 14,
    marginTop: 7,
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
    fontWeight: 700,
  },
  postAI: {
    display: "inline-flex",
    gap: 6,
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 8,
    marginTop: 9,
    fontSize: 11,
    lineHeight: 1.4,
  },
  postScoreBox: {
    textAlign: "center",
    flexShrink: 0,
    minWidth: 54,
  },
  panel: {
    borderRadius: 18,
    padding: 22,
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
  studioGrid: {
    display: "grid",
    gridTemplateColumns: "0.9fr 1.1fr",
    gap: 18,
  },
  formStack: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginTop: 18,
  },
  input: {
    width: "100%",
    borderRadius: 12,
    padding: "12px 14px",
    outline: "none",
    fontFamily: "inherit",
    fontSize: 13,
  },
  textarea: {
    width: "100%",
    minHeight: 130,
    borderRadius: 12,
    padding: "12px 14px",
    outline: "none",
    fontFamily: "inherit",
    fontSize: 13,
    resize: "vertical",
  },
  primaryButton: {
    border: "none",
    borderRadius: 12,
    padding: "12px 16px",
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  secondaryButton: {
    marginTop: 18,
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  platformSuggestions: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 16,
  },
  suggestionCard: {
    borderRadius: 14,
    padding: 14,
  },
  calendarRow: {
    borderRadius: 14,
    padding: 15,
    display: "grid",
    gridTemplateColumns: "1.2fr 120px 120px 120px 1fr",
    gap: 12,
    alignItems: "center",
  },
  aiSmall: {
    fontSize: 12,
    lineHeight: 1.5,
    margin: 0,
  },
  compareGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
  },
  compareTable: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  compareRow: {
    borderRadius: 14,
    padding: 15,
    display: "grid",
    gridTemplateColumns: "180px 160px 1fr 1.4fr",
    gap: 16,
    alignItems: "center",
  },
  integrationsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
  },
  integrationTitle: {
    fontSize: 25,
    fontWeight: 400,
    margin: "10px 0",
  },
};