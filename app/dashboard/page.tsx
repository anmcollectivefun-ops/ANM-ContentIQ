"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type WorkspaceStatus = "Aktywny" | "W przygotowaniu" | "Do rozbudowy";

type Workspace = {
  id: string;
  name: string;
  type: string;
  score: number;
  trend: number;
  status: WorkspaceStatus;
  platforms: string[];
  posts: number;
  topPlatform: string;
  insight: string;
};

type Stat = {
  label: string;
  value: string;
  sub: string;
};

type Activity = {
  title: string;
  meta: string;
  type: "ai" | "content" | "integration" | "warning";
};

// ─── START DATA / LATER SUPABASE ─────────────────────────────────────────────

const workspaces: Workspace[] = [
  {
    id: "anm-collective",
    name: "ANM Collective",
    type: "Firma / SaaS",
    score: 87,
    trend: 11,
    status: "Aktywny",
    platforms: ["ig", "li", "tt", "yt", "fb", "blog", "sp"],
    posts: 42,
    topPlatform: "LinkedIn",
    insight:
      "Najlepsze wyniki daje content ekspercki i case studies. TikTok wymaga krótszych hooków.",
  },
  {
    id: "creator-planner",
    name: "Creator Planner",
    type: "Influencer",
    score: 82,
    trend: 4,
    status: "W przygotowaniu",
    platforms: ["ig", "tt", "yt", "sp"],
    posts: 18,
    topPlatform: "Instagram",
    insight:
      "Współprace sponsorowane wymagają balansu z contentem organicznym.",
  },
  {
    id: "blog-seo",
    name: "Blog & SEO Hub",
    type: "Content marketing",
    score: 74,
    trend: -2,
    status: "Do rozbudowy",
    platforms: ["blog", "li", "yt"],
    posts: 11,
    topPlatform: "Blog",
    insight:
      "Artykuły poradnikowe mają dobry potencjał SEO, ale wymagają dystrybucji w social mediach.",
  },
];

const baseStats: Stat[] = [
  { label: "Projekty", value: "3", sub: "workspace’y contentowe" },
  { label: "Publikacje", value: "71", sub: "we wszystkich projektach" },
  { label: "Avg AI Score", value: "81", sub: "+5 vs ostatni miesiąc" },
  { label: "Rekomendacje AI", value: "18", sub: "do przejrzenia" },
];

const activities: Activity[] = [
  {
    title: "LinkedIn ma najwyższy wynik w projekcie ANM Collective",
    meta: "AI rekomenduje więcej case studies i postów eksperckich.",
    type: "ai",
  },
  {
    title: "TikTok wymaga przebudowy hooków",
    meta: "Długie wstępy obniżają retencję w pierwszych sekundach.",
    type: "warning",
  },
  {
    title: "Blog & SEO Hub ma potencjał do recyklingu treści",
    meta: "Artykuły można przerobić na LinkedIn, newsletter i Shorts.",
    type: "content",
  },
  {
    title: "Integracje do podłączenia",
    meta: "Priorytet: YouTube, Meta, LinkedIn, Spotify i Blog/WordPress.",
    type: "integration",
  },
];

const aiSummary = [
  "Największy potencjał ma obecnie LinkedIn, bo treści eksperckie i case studies generują najlepszy wynik jakościowy.",
  "TikTok i Instagram potrzebują krótszych formatów, mocniejszych hooków i treści bardziej dynamicznych.",
  "Blog powinien działać jako baza wiedzy, z której AI generuje posty, newslettery, scenariusze video i podcasty.",
];

const PLATFORM_ICONS: Record<string, string> = {
  ig: "IG",
  li: "LI",
  tt: "TT",
  yt: "YT",
  fb: "FB",
  blog: "BL",
  sp: "SP",
};

const PLATFORM_COLORS: Record<string, string> = {
  ig: "#E1306C",
  li: "#0A66C2",
  tt: "#111827",
  yt: "#FF0000",
  fb: "#1877F2",
  blog: "#22C55E",
  sp: "#1DB954",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getInitials(email?: string | null) {
  if (!email) return "U";
  const name = email.split("@")[0] ?? "user";
  return name.slice(0, 2).toUpperCase();
}

function getScoreColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

function getStatusColor(status: WorkspaceStatus, dark: boolean) {
  if (status === "Aktywny") {
    return {
      background: dark ? "#052e16" : "#dcfce7",
      color: "#22c55e",
    };
  }

  if (status === "W przygotowaniu") {
    return {
      background: dark ? "#172554" : "#dbeafe",
      color: "#60a5fa",
    };
  }

  return {
    background: dark ? "#1c1917" : "#f5f5f4",
    color: dark ? "#a8a29e" : "#78716c",
  };
}

function getActivityAccent(type: Activity["type"]) {
  if (type === "ai") return "#818cf8";
  if (type === "content") return "#22c55e";
  if (type === "integration") return "#38bdf8";
  return "#f59e0b";
}

// ─── SCORE RING ──────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const radius = (size - 7) / 2;
  const circumference = 2 * Math.PI * radius;
  const fill = (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          opacity={0.12}
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={`${fill} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          fontWeight: 800,
          color,
        }}
      >
        {score}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const css = dark ? theme.dark : theme.light;

  const bestWorkspace = useMemo(
    () => [...workspaces].sort((a, b) => b.score - a.score)[0],
    []
  );

  const weakestWorkspace = useMemo(
    () => [...workspaces].sort((a, b) => a.score - b.score)[0],
    []
  );

  useEffect(() => {
    setMounted(true);

    const saved = localStorage.getItem("ciq-theme");
    if (saved) {
      setDark(saved === "dark");
    }

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserEmail(user.email ?? null);
      setLoadingUser(false);
    }

    loadUser();
  }, [router, supabase.auth]);

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

  if (!mounted || loadingUser) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#080c14",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800 }}>ANM ContentIQ</div>
          <p style={{ marginTop: 8, color: "#94a3b8" }}>
            Ładowanie dashboardu...
          </p>
        </div>
      </main>
    );
  }

  return (
    <div style={{ ...s.root, background: css.bg, color: css.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,300&family=DM+Serif+Display:ital@0;1&display=swap');

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
        }

        ::selection {
          background: ${dark ? "#6366f140" : "#0f172a20"};
        }

        .ciq-card {
          transition: transform 0.22s cubic-bezier(.22,.68,0,1.2), border-color 0.22s ease, box-shadow 0.22s ease;
        }

        .ciq-card:hover {
          transform: translateY(-3px);
          border-color: ${css.accentBorder} !important;
          box-shadow: ${dark ? "0 24px 60px rgba(0,0,0,0.28)" : "0 24px 60px rgba(15,23,42,0.08)"};
        }

        .ciq-card:hover .arrow-hint {
          opacity: 1 !important;
          transform: translateX(0) !important;
        }

        .ciq-stat {
          transition: transform 0.18s ease, border-color 0.18s ease;
        }

        .ciq-stat:hover {
          transform: translateY(-2px);
          border-color: ${css.accentBorder} !important;
        }

        .ciq-link {
          transition: opacity 0.15s ease;
        }

        .ciq-link:hover {
          opacity: 0.65;
        }

        @media (max-width: 960px) {
          .ciq-header-inner,
          .ciq-main {
            padding-left: 20px !important;
            padding-right: 20px !important;
          }

          .ciq-nav {
            gap: 10px !important;
          }

          .ciq-nav-hide-mobile {
            display: none !important;
          }

          .ciq-hero-grid,
          .ciq-stats-grid,
          .ciq-cards-grid,
          .ciq-bottom-grid {
            grid-template-columns: 1fr !important;
          }

          .ciq-section-head {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .ciq-header-inner {
            height: auto !important;
            padding-top: 16px !important;
            padding-bottom: 16px !important;
            gap: 14px !important;
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .ciq-nav {
            width: 100%;
            flex-wrap: wrap;
          }
        }
      `}</style>

      {/* ================= TOP BAR ================= */}
      <header
        style={{
          ...s.header,
          borderBottom: `1px solid ${css.border}`,
          background: `${css.bg}e6`,
        }}
      >
        <div className="ciq-header-inner" style={s.headerInner}>
          <Link href="/dashboard" style={s.logoGroup}>
            <span
              style={{
                ...s.logoMark,
                background: dark ? "#fff" : "#0f172a",
                color: dark ? "#0f172a" : "#fff",
              }}
            >
              IQ
            </span>

            <div>
              <div
                style={{
                  ...s.logoName,
                  fontFamily: "'DM Serif Display', serif",
                  color: css.text,
                }}
              >
                ANM ContentIQ
              </div>

              <div style={{ ...s.logoSub, color: css.muted }}>
                Panel użytkownika
              </div>
            </div>
          </Link>

          <nav className="ciq-nav" style={s.nav}>
            <Link
              href="/"
              className="ciq-link ciq-nav-hide-mobile"
              style={{ ...s.navItem, color: css.muted, textDecoration: "none" }}
            >
              Landing
            </Link>

            <span
              className="ciq-link ciq-nav-hide-mobile"
              style={{ ...s.navItem, color: css.muted }}
            >
              Dokumentacja
            </span>

            <span
              className="ciq-link ciq-nav-hide-mobile"
              style={{ ...s.navItem, color: css.muted }}
            >
              Wsparcie
            </span>

            <button
              onClick={toggleTheme}
              style={{
                ...s.themeBtn,
                background: css.surface,
                border: `1px solid ${css.border}`,
                color: css.text,
              }}
            >
              {dark ? "☀ Jasny" : "☾ Ciemny"}
            </button>

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              style={{
                ...s.signOutBtn,
                background: "#ef444414",
                border: "1px solid #ef444438",
                color: "#ef4444",
              }}
            >
              {signingOut ? "..." : "Wyloguj"}
            </button>

            <div
              style={{
                ...s.avatar,
                background: dark ? "#1e293b" : "#f1f5f9",
                border: `1.5px solid ${css.border}`,
              }}
              title={userEmail ?? undefined}
            >
              <span style={{ fontSize: 11, fontWeight: 800, color: css.text }}>
                {getInitials(userEmail)}
              </span>
            </div>
          </nav>
        </div>
      </header>

      <main className="ciq-main" style={s.main}>
        {/* ================= HERO ================= */}
        <section className="ciq-hero-grid" style={s.heroGrid}>
          <div>
            <div style={{ ...s.greeting, color: css.accent }}>
              Witaj w panelu
            </div>

            <h1
              style={{
                ...s.heroTitle,
                fontFamily: "'DM Serif Display', serif",
                color: css.text,
              }}
            >
              Twoje centrum contentu AI
            </h1>

            <p style={{ ...s.heroSub, color: css.muted }}>
              Zalogowano jako{" "}
              <span style={{ color: css.text, fontWeight: 700 }}>
                {userEmail}
              </span>
              . Wybierz projekt, aby przejść do analizy kont, publikacji,
              Content Studio i planowania.
            </p>
          </div>

          <div
            style={{
              ...s.heroPanel,
              background: css.surface,
              border: `1px solid ${css.border}`,
            }}
          >
            <p style={{ ...s.panelLabel, color: css.accent }}>
              AI Global Summary
            </p>

            <div style={s.aiList}>
              {aiSummary.map((item, index) => (
                <div
                  key={item}
                  style={{
                    ...s.aiItem,
                    borderLeft: `2px solid ${
                      index === 0
                        ? "#22c55e"
                        : index === 1
                          ? "#f59e0b"
                          : css.accent
                    }`,
                  }}
                >
                  <p style={{ color: css.muted }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= STATS ================= */}
        <section className="ciq-stats-grid" style={s.statsGrid}>
          {baseStats.map((stat) => (
            <div
              key={stat.label}
              className="ciq-stat"
              style={{
                ...s.statCard,
                background: css.surface,
                border: `1px solid ${css.border}`,
              }}
            >
              <div
                style={{
                  ...s.statValue,
                  color: css.text,
                  fontFamily: "'DM Serif Display', serif",
                }}
              >
                {stat.value}
              </div>

              <div style={{ ...s.statLabel, color: css.text }}>
                {stat.label}
              </div>

              <div style={{ ...s.statSub, color: css.muted }}>{stat.sub}</div>
            </div>
          ))}
        </section>

        {/* ================= QUICK OVERVIEW ================= */}
        <section className="ciq-bottom-grid" style={s.quickGrid}>
          <div
            style={{
              ...s.quickCard,
              background: css.surface,
              border: `1px solid ${css.border}`,
            }}
          >
            <p style={{ ...s.panelLabel, color: css.accent }}>
              Najmocniejszy projekt
            </p>

            <h2
              style={{
                ...s.quickTitle,
                color: css.text,
                fontFamily: "'DM Serif Display', serif",
              }}
            >
              {bestWorkspace.name}
            </h2>

            <p style={{ ...s.quickText, color: css.muted }}>
              {bestWorkspace.insight}
            </p>
          </div>

          <div
            style={{
              ...s.quickCard,
              background: css.surface,
              border: `1px solid ${css.border}`,
            }}
          >
            <p style={{ ...s.panelLabel, color: css.accent }}>Do poprawy</p>

            <h2
              style={{
                ...s.quickTitle,
                color: css.text,
                fontFamily: "'DM Serif Display', serif",
              }}
            >
              {weakestWorkspace.name}
            </h2>

            <p style={{ ...s.quickText, color: css.muted }}>
              {weakestWorkspace.insight}
            </p>
          </div>
        </section>

        {/* ================= SECTION HEAD ================= */}
        <div className="ciq-section-head" style={s.sectionHead}>
          <div>
            <span style={{ ...s.sectionLabel, color: css.muted }}>
              Workspace’y
            </span>

            <h2
              style={{
                ...s.sectionTitle,
                color: css.text,
                fontFamily: "'DM Serif Display', serif",
              }}
            >
              Projekty contentowe
            </h2>
          </div>

          <button
            style={{
              ...s.addBtn,
              background: dark ? "#fff" : "#0f172a",
              color: dark ? "#0f172a" : "#fff",
            }}
          >
            + Nowy projekt
          </button>
        </div>

        {/* ================= WORKSPACE CARDS ================= */}
        <section className="ciq-cards-grid" style={s.cardsGrid}>
          {workspaces.map((workspace) => {
            const statusColor = getStatusColor(workspace.status, dark);

            return (
              <Link
                key={workspace.id}
                href={`/app/${workspace.id}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  className="ciq-card"
                  style={{
                    ...s.wsCard,
                    background: css.surface,
                    border: `1px solid ${css.border}`,
                  }}
                >
                  {/* ===== TOP ROW ===== */}
                  <div style={s.wsTop}>
                    <span
                      style={{
                        ...s.wsStatus,
                        background: statusColor.background,
                        color: statusColor.color,
                      }}
                    >
                      {workspace.status}
                    </span>

                    <span
                      className="arrow-hint"
                      style={{
                        ...s.arrowHint,
                        color: css.muted,
                        opacity: 0,
                        transform: "translateX(-6px)",
                      }}
                    >
                      Otwórz →
                    </span>
                  </div>

                  {/* ===== TITLE ===== */}
                  <div style={{ marginTop: 22 }}>
                    <h3
                      style={{
                        ...s.wsName,
                        fontFamily: "'DM Serif Display', serif",
                        color: css.text,
                      }}
                    >
                      {workspace.name}
                    </h3>

                    <p style={{ ...s.wsType, color: css.muted }}>
                      {workspace.type}
                    </p>
                  </div>

                  {/* ===== SCORE ===== */}
                  <div
                    style={{
                      ...s.wsMiddle,
                      borderTop: `1px solid ${css.border}`,
                    }}
                  >
                    <ScoreRing score={workspace.score} />

                    <div>
                      <div
                        style={{
                          ...s.wsTrend,
                          color: workspace.trend > 0 ? "#22c55e" : "#ef4444",
                        }}
                      >
                        {workspace.trend > 0 ? "↑" : "↓"}{" "}
                        {Math.abs(workspace.trend)}% vs ostatni mies.
                      </div>

                      <div style={s.wsPlatforms}>
                        {workspace.platforms.map((platform) => (
                          <span
                            key={platform}
                            style={{
                              ...s.platformPill,
                              background: `${PLATFORM_COLORS[platform]}${
                                dark ? "25" : "18"
                              }`,
                              color: PLATFORM_COLORS[platform],
                            }}
                          >
                            {PLATFORM_ICONS[platform]}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ===== AI INSIGHT ===== */}
                  <div
                    style={{
                      ...s.wsInsight,
                      background: dark ? "#ffffff08" : "#f8fafc",
                      color: css.muted,
                    }}
                  >
                    ✦ {workspace.insight}
                  </div>

                  {/* ===== FOOTER ===== */}
                  <div
                    style={{
                      ...s.wsFooter,
                      borderTop: `1px solid ${css.border}`,
                    }}
                  >
                    <span style={{ color: css.muted, fontSize: 12 }}>
                      {workspace.posts} publikacji · Najlepszy kanał:{" "}
                      <strong style={{ color: css.text }}>
                        {workspace.topPlatform}
                      </strong>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

        {/* ================= ACTIVITY / NEXT STEPS ================= */}
        <section className="ciq-bottom-grid" style={s.bottomGrid}>
          <div
            style={{
              ...s.activityPanel,
              background: css.surface,
              border: `1px solid ${css.border}`,
            }}
          >
            <p style={{ ...s.panelLabel, color: css.accent }}>
              Ostatnie sygnały AI
            </p>

            <div style={s.activityList}>
              {activities.map((activity) => (
                <div
                  key={activity.title}
                  style={{
                    ...s.activityItem,
                    borderLeft: `2px solid ${getActivityAccent(activity.type)}`,
                  }}
                >
                  <p style={{ ...s.activityTitle, color: css.text }}>
                    {activity.title}
                  </p>

                  <p style={{ ...s.activityMeta, color: css.muted }}>
                    {activity.meta}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              ...s.activityPanel,
              background: css.surface,
              border: `1px solid ${css.border}`,
            }}
          >
            <p style={{ ...s.panelLabel, color: css.accent }}>
              Następny krok techniczny
            </p>

            <h2
              style={{
                ...s.nextTitle,
                color: css.text,
                fontFamily: "'DM Serif Display', serif",
              }}
            >
              Podpiąć workspace’y pod Supabase
            </h2>

            <p style={{ ...s.quickText, color: css.muted }}>
              Ten widok jest już gotowy pod prawdziwą bazę. Następnie
              przeniesiemy projekty z constów do tabeli{" "}
              <strong style={{ color: css.text }}>workspaces</strong>, żeby każdy
              użytkownik widział swoje własne projekty.
            </p>

            <div style={s.nextSteps}>
              {["profiles", "workspaces", "workspace_members"].map((item) => (
                <span
                  key={item}
                  style={{
                    ...s.nextPill,
                    background: css.bg,
                    border: `1px solid ${css.border}`,
                    color: css.muted,
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// ─── THEME ───────────────────────────────────────────────────────────────────

const theme = {
  dark: {
    bg: "#080c14",
    surface: "#0f1520",
    text: "#f0f4ff",
    muted: "#8390a8",
    border: "#1a2234",
    accent: "#818cf8",
    accentBorder: "#818cf8",
  },
  light: {
    bg: "#f8f7f4",
    surface: "#ffffff",
    text: "#0f172a",
    muted: "#64748b",
    border: "#e8e8e4",
    accent: "#6366f1",
    accentBorder: "#6366f1",
  },
};

// ─── STYLES ──────────────────────────────────────────────────────────────────

const s: Record<string, CSSProperties> = {
  root: {
    minHeight: "100vh",
    transition: "background 0.3s, color 0.3s",
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  },
  headerInner: {
    maxWidth: 1220,
    margin: "0 auto",
    padding: "0 32px",
    minHeight: 68,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoGroup: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    textDecoration: "none",
  },
  logoMark: {
    width: 38,
    height: 38,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: "-0.02em",
    flexShrink: 0,
  },
  logoName: {
    fontSize: 18,
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
  },
  logoSub: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  navItem: {
    fontSize: 13,
    cursor: "pointer",
  },
  themeBtn: {
    fontSize: 12,
    padding: "7px 14px",
    borderRadius: 999,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  signOutBtn: {
    fontSize: 12,
    padding: "7px 14px",
    borderRadius: 999,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "default",
  },
  main: {
    maxWidth: 1220,
    margin: "0 auto",
    padding: "48px 32px 80px",
  },
  heroGrid: {
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: 22,
    alignItems: "stretch",
    marginBottom: 28,
  },
  greeting: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 58,
    fontWeight: 400,
    letterSpacing: "-0.04em",
    lineHeight: 1.02,
    margin: "0 0 14px",
  },
  heroSub: {
    fontSize: 14,
    lineHeight: 1.7,
    maxWidth: 660,
    margin: 0,
  },
  heroPanel: {
    borderRadius: 22,
    padding: 22,
  },
  panelLabel: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    margin: "0 0 14px",
  },
  aiList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  aiItem: {
    paddingLeft: 12,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
    marginBottom: 22,
  },
  statCard: {
    padding: "20px 22px",
    borderRadius: 16,
  },
  statValue: {
    fontSize: 36,
    fontWeight: 400,
    letterSpacing: "-0.03em",
  },
  statLabel: {
    fontSize: 13,
    fontWeight: 700,
    marginTop: 4,
  },
  statSub: {
    fontSize: 11,
    marginTop: 4,
  },
  quickGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginBottom: 34,
  },
  quickCard: {
    borderRadius: 18,
    padding: 20,
  },
  quickTitle: {
    fontSize: 28,
    fontWeight: 400,
    margin: "0 0 8px",
  },
  quickText: {
    fontSize: 13,
    lineHeight: 1.7,
    margin: 0,
  },
  sectionHead: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: 400,
    margin: "6px 0 0",
  },
  addBtn: {
    fontSize: 12,
    fontWeight: 800,
    padding: "10px 18px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
    marginBottom: 28,
  },
  wsCard: {
    borderRadius: 22,
    padding: "22px 24px",
    cursor: "pointer",
    minHeight: 310,
    display: "flex",
    flexDirection: "column",
  },
  wsTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  wsStatus: {
    fontSize: 11,
    fontWeight: 800,
    padding: "5px 11px",
    borderRadius: 999,
  },
  arrowHint: {
    fontSize: 12,
    transition: "opacity 0.2s, transform 0.2s",
  },
  wsName: {
    fontSize: 28,
    letterSpacing: "-0.02em",
    lineHeight: 1.12,
    margin: 0,
  },
  wsType: {
    fontSize: 12,
    marginTop: 6,
  },
  wsMiddle: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    paddingTop: 18,
    marginTop: 22,
  },
  wsTrend: {
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 9,
  },
  wsPlatforms: {
    display: "flex",
    gap: 5,
    flexWrap: "wrap",
  },
  platformPill: {
    fontSize: 9,
    fontWeight: 900,
    padding: "3px 7px",
    borderRadius: 7,
    letterSpacing: "0.04em",
  },
  wsInsight: {
    marginTop: 18,
    borderRadius: 14,
    padding: 12,
    fontSize: 12,
    lineHeight: 1.55,
  },
  wsFooter: {
    paddingTop: 14,
    marginTop: "auto",
  },
  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  activityPanel: {
    borderRadius: 22,
    padding: 22,
  },
  activityList: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  activityItem: {
    paddingLeft: 12,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: 800,
    margin: 0,
  },
  activityMeta: {
    fontSize: 12,
    lineHeight: 1.55,
    margin: "5px 0 0",
  },
  nextTitle: {
    fontSize: 30,
    fontWeight: 400,
    margin: "0 0 10px",
  },
  nextSteps: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 18,
  },
  nextPill: {
    borderRadius: 999,
    padding: "7px 11px",
    fontSize: 11,
    fontWeight: 800,
  },
};