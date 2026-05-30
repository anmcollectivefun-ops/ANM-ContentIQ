// app/app/[id]/page.tsx
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase/client"; // ✔ jedyne miejsce importu
import ContentStudio from "@/components/ContentStudio";

// ─── TYPES ───────────────────────────────────────────────────────────────────
type Platform = "instagram" | "linkedin" | "tiktok" | "youtube" | "facebook" | "blog";

interface Account {
  id: Platform;
  name: string;
  handle: string;
  score: number;
  trend: number;
  posts: number;
  engRate: string;
  reach: string;
  aiTag: string;
  color: string;
}

interface Post {
  title: string;
  date: string;
  type: string;
  score: number;
  reach: string;
  likes: number;
  comments: number;
  saves?: number;
  ai: string;
}

// ─── MOCK DATA ───────────────────────────────────────────────────────────────
const ACCOUNTS: Account[] = [
  { id: "instagram", name: "Instagram", handle: "@anm_collective", score: 84, trend: 11, posts: 38, engRate: "4.2%", reach: "12.4k", aiTag: "Reels edukacyjne mają 2× wyższy zasięg", color: "#E1306C" },
  { id: "linkedin", name: "LinkedIn", handle: "ANM Collective", score: 91, trend: 18, posts: 22, engRate: "6.8%", reach: "28.1k", aiTag: "Case studies dominują", color: "#0A66C2" },
  { id: "tiktok", name: "TikTok", handle: "@anm_collective", score: 63, trend: -4, posts: 15, engRate: "2.1%", reach: "6.8k", aiTag: "Potrzebujesz mocniejszego hooka", color: "#000000" },
  { id: "youtube", name: "YouTube", handle: "ANM Collective", score: 77, trend: 6, posts: 9, engRate: "54% ret.", reach: "3.2k", aiTag: "Zwiększ częstotliwość Shorts", color: "#FF0000" },
  { id: "facebook", name: "Facebook", handle: "ANM Collective", score: 58, trend: -2, posts: 18, engRate: "1.4%", reach: "5.1k", aiTag: "Skup się na grupach", color: "#1877F2" },
  { id: "blog", name: "Blog", handle: "anmcollective.pl", score: 79, trend: 22, posts: 11, engRate: "3:42 avg", reach: "8.9k", aiTag: "Artykuły poradnikowe mają najwyższy czas", color: "#22C55E" },
];

const POSTS: Record<Platform, Post[]> = {
  instagram: [
    { title: "5 narzędzi AI do tworzenia contentu", date: "24 maja", type: "Reels", score: 94, reach: "31.2k", likes: 1840, comments: 94, saves: 420, ai: "Kontynuuj format „narzędzia + demo\"." },
    { title: "Jak planować content na miesiąc", date: "19 maja", type: "Karuzela", score: 71, reach: "12.8k", likes: 540, comments: 38, saves: 210, ai: "Popraw okładkę — zbyt mało kontrastu." },
  ],
  linkedin: [
    { title: "Case study: +340% zasięgu", date: "23 maja", type: "Post", score: 96, reach: "48.3k", likes: 2140, comments: 187, ai: "Kontynuuj case studies z liczbami." },
  ],
  tiktok: [
    { title: "3 błędy twórców content marketingu", date: "22 maja", type: "Video", score: 81, reach: "18.4k", likes: 1240, comments: 87, saves: 340, ai: "Format „3 błędy\" działa." },
  ],
  youtube: [],
  facebook: [],
  blog: [],
};

const NAV_TABS = [
  { id: "dashboard", label: "Dashboard", icon: "◈" },
  { id: "studio", label: "Content Studio", icon: "✦" },
  { id: "calendar", label: "Kalendarz", icon: "◻" },
  { id: "analytics", label: "AI Analiza", icon: "◉" },
  { id: "compare", label: "Porównanie", icon: "⊞" },
  { id: "integrations", label: "Integracje", icon: "⊕" },
  { id: "settings", label: "Ustawienia", icon: "◎" },
];

const INSIGHTS = [
  { type: "up", text: "Temat „AI w marketingu\" zebrał 48k na LinkedIn, ale tylko 2.1k na TikToku." },
  { type: "warn", text: "Styl z długim wstępem działa źle na TikToku i Instagramie." },
  { type: "up", text: "Content edukacyjny ma 2× wyższe zaangażowanie." },
];

// ─── SCORE BAR ───────────────────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 3, borderRadius: 2, background: "#ffffff12" }}>
        <div style={{ width: `${score}%`, height: "100%", borderRadius: 2, background: color }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color }}>{score}</span>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function AppWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = getSupabase(); // ✔ bezpiecznie, może być null
  const workspaceId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("ciq-theme");
    if (saved) setDark(saved === "dark");
  }, []);

  if (!mounted) return null;

  const css = dark ? darkVars : lightVars;

  const handleSignOut = async () => {
    if (!supabase) return;
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div style={{ ...st.root, background: css.bg, color: css.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Serif+Display:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .nav-tab:hover { background: ${css.hoverBg} !important; }
        .account-tile:hover { transform: translateY(-2px); border-color: ${css.accentBorder} !important; }
        .post-row:hover { background: ${css.hoverBg} !important; }
      `}</style>

      <div style={st.shell}>
        {/* SIDEBAR */}
        <aside style={{ ...st.sidebar, background: css.sidebar, borderRight: `1px solid ${css.border}` }}>
          <div style={st.sidebarLogo}>
            <div style={{ ...st.logoMark, background: dark ? "#fff" : "#0f172a", color: dark ? "#0f172a" : "#fff" }}>IQ</div>
            <div>
              <div style={{ ...st.logoText, fontFamily: "'DM Serif Display', serif", color: css.text }}>ContentIQ</div>
              <div style={{ ...st.logoWs, color: css.muted }}>{workspaceId.replaceAll("-", " ")}</div>
            </div>
          </div>
          <nav style={{ flex: 1, padding: "8px 0" }}>
            {NAV_TABS.map((tab) => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setActiveAccount(null); }} className="nav-tab"
                style={{ ...st.navTab, background: activeTab === tab.id ? css.activeBg : "transparent", color: activeTab === tab.id ? css.text : css.muted, borderLeft: activeTab === tab.id ? `2px solid ${css.accent}` : "2px solid transparent" }}>
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
          </nav>
          <div style={st.sidebarBottom}>
            <button onClick={() => { setDark(!dark); localStorage.setItem("ciq-theme", !dark ? "dark" : "light"); }} style={{ ...st.themeToggle, background: css.surface, border: `1px solid ${css.border}`, color: css.muted }}>{dark ? "☀ Jasny tryb" : "☾ Ciemny tryb"}</button>
            {supabase && <button onClick={handleSignOut} disabled={signingOut} style={{ ...st.signoutBtn, color: "#ef4444", background: "#ef444410" }}>{signingOut ? "Wylogowywanie..." : "Wyloguj"}</button>}
          </div>
        </aside>

        {/* MAIN AREA */}
        <div style={{ ...st.mainArea, background: css.bg }}>
          <header style={{ ...st.topbar, borderBottom: `1px solid ${css.border}` }}>
            <div>
              <div style={{ ...st.tabLabel, color: css.accent }}>{NAV_TABS.find(t => t.id === activeTab)?.label}</div>
              <h1 style={{ ...st.pageTitle, fontFamily: "'DM Serif Display', serif" }}>{activeAccount ? activeAccount.name : "Wszystkie konta"}</h1>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Link href="/dashboard" style={{ ...st.topBtn, background: css.surface, border: `1px solid ${css.border}`, color: css.muted, textDecoration: "none" }}>← Dashboard</Link>
              <button style={{ ...st.topBtn, background: dark ? "#fff" : "#0f172a", color: dark ? "#0f172a" : "#fff" }}>+ Nowy content</button>
            </div>
          </header>

          <div style={st.content}>
            {/* DASHBOARD TAB */}
            {activeTab === "dashboard" && !activeAccount && (
              <div>
                <div style={{ ...st.insightStrip, background: css.surface, border: `1px solid ${css.border}` }}>
                  <div style={{ ...st.insightTitle, color: css.accent }}>✦ AI Cross-Platform Insights</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                    {INSIGHTS.map((ins, i) => (
                      <div key={i} style={{ ...st.insightItem, borderLeft: `2px solid ${ins.type === "up" ? "#22c55e" : "#f59e0b"}` }}>
                        <p style={{ fontSize: 12, color: css.muted }}>{ins.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ ...st.tilesLabel, color: css.muted }}>Podłączone konta</div>
                <div style={st.tilesGrid}>
                  {ACCOUNTS.map((acc) => (
                    <div key={acc.id} className="account-tile" onClick={() => setActiveAccount(acc)} style={{ ...st.tile, background: css.surface, border: `1px solid ${css.border}`, cursor: "pointer" }}>
                      <div style={{ height: 3, background: acc.color, borderRadius: "12px 12px 0 0", margin: "-18px -18px 14px" }} />
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{acc.name}</div>
                          <div style={{ fontSize: 11, color: css.muted }}>{acc.handle}</div>
                        </div>
                        <span style={{ fontSize: 10, color: css.muted }}>→</span>
                      </div>
                      <ScoreBar score={acc.score} />
                      <div style={{ ...st.tileAI, background: acc.color + "15", color: acc.color }}>✦ {acc.aiTag}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ACCOUNT DETAIL */}
            {activeTab === "dashboard" && activeAccount && (
              <div>
                <button onClick={() => setActiveAccount(null)} style={{ ...st.backBtn, color: css.muted, background: css.surface, border: `1px solid ${css.border}` }}>← Wszystkie konta</button>
                <div style={{ ...st.accountSummary, background: css.surface, border: `1px solid ${css.border}` }}>
                  <div style={{ height: 4, background: activeAccount.color, borderRadius: "14px 14px 0 0", margin: "-20px -20px 16px" }} />
                  <h2 style={{ fontFamily: "'DM Serif Display', serif" }}>{activeAccount.name}</h2>
                  <div style={{ ...st.tileAI, background: activeAccount.color + "15", color: activeAccount.color }}>✦ {activeAccount.aiTag}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(POSTS[activeAccount.id] ?? []).map((post, i) => {
                    const scColor = post.score >= 80 ? "#22c55e" : post.score >= 60 ? "#f59e0b" : "#ef4444";
                    return (
                      <div key={i} className="post-row" style={{ ...st.postRow, background: css.surface, border: `1px solid ${css.border}` }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{post.title}</div>
                          <div style={{ ...st.postAI, background: activeAccount.color + "12", color: activeAccount.color }}>✦ {post.ai}</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 26, fontFamily: "'DM Serif Display', serif", color: scColor }}>{post.score}</div>
                          <div style={{ fontSize: 10, color: css.muted }}>AI Score</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CONTENT STUDIO */}
            {activeTab === "studio" && <ContentStudio dark={dark} />}

            {/* OTHER TABS */}
            {activeTab !== "dashboard" && activeTab !== "studio" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16 }}>
                <div style={{ fontSize: 48, opacity: 0.15 }}>{NAV_TABS.find(t => t.id === activeTab)?.icon}</div>
                <div style={{ fontSize: 22, fontFamily: "'DM Serif Display', serif" }}>{NAV_TABS.find(t => t.id === activeTab)?.label}</div>
                <div style={{ fontSize: 13, color: css.muted }}>Ten moduł jest w budowie.</div>
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
  bg: "#080c14", sidebar: "#070a11", surface: "#0f1520", text: "#eef2ff",
  muted: "#3d4966", border: "#151e30", accent: "#818cf8", activeBg: "#131b2e",
  hoverBg: "#131b2e20", accentBorder: "#818cf8",
};
const lightVars = {
  bg: "#f8f7f4", sidebar: "#ffffff", surface: "#ffffff", text: "#0f172a",
  muted: "#94a3b8", border: "#e8e8e4", accent: "#6366f1", activeBg: "#f0f0fe",
  hoverBg: "#f8f8ff", accentBorder: "#6366f1",
};

// ─── STATIC STYLES ────────────────────────────────────────────────────────────
const st: Record<string, React.CSSProperties> = {
  root: { transition: "background 0.3s", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" },
  shell: { display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" },
  sidebar: { display: "flex", flexDirection: "column", padding: "0", position: "sticky", top: 0, height: "100vh" },
  sidebarLogo: { display: "flex", alignItems: "center", gap: 10, padding: "20px 18px" },
  logoMark: { width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 },
  logoText: { fontSize: 15, letterSpacing: "-0.02em" },
  logoWs: { fontSize: 10, textTransform: "capitalize", marginTop: 1 },
  navTab: { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 18px", fontSize: 13, border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all 0.15s" },
  sidebarBottom: { padding: 16, display: "flex", flexDirection: "column", gap: 8 },
  themeToggle: { padding: "7px 12px", borderRadius: 10, fontSize: 12, cursor: "pointer" },
  signoutBtn: { padding: "7px 12px", borderRadius: 10, fontSize: 12, cursor: "pointer", border: "none" },
  mainArea: { display: "flex", flexDirection: "column", minHeight: "100vh" },
  topbar: { padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 },
  tabLabel: { fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 },
  pageTitle: { fontSize: 26, fontWeight: 400, letterSpacing: "-0.02em" },
  topBtn: { padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: "pointer" },
  content: { padding: "24px 28px", flex: 1, overflowY: "auto" },
  insightStrip: { borderRadius: 14, padding: "18px 20px", marginBottom: 24 },
  insightTitle: { fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 },
  insightItem: { paddingLeft: 12 },
  tilesLabel: { fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 },
  tilesGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 },
  tile: { borderRadius: 14, padding: 18 },
  tileAI: { display: "flex", gap: 6, alignItems: "center", padding: "7px 10px", borderRadius: 8, marginTop: 12 },
  backBtn: { padding: "6px 14px", borderRadius: 10, fontSize: 12, cursor: "pointer", marginBottom: 18 },
  accountSummary: { borderRadius: 14, padding: 20, marginBottom: 20 },
  postRow: { borderRadius: 12, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  postAI: { display: "inline-flex", gap: 6, padding: "5px 9px", borderRadius: 7, marginTop: 8, fontSize: 11 },
};