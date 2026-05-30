"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

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
  { id: "instagram", name: "Instagram", handle: "@anm_collective", score: 84, trend: 11, posts: 38, engRate: "4.2%", reach: "12.4k", aiTag: "Reels edukacyjne mają 2× wyższy zasięg niż karuzele", color: "#E1306C" },
  { id: "linkedin", name: "LinkedIn", handle: "ANM Collective", score: 91, trend: 18, posts: 22, engRate: "6.8%", reach: "28.1k", aiTag: "Case studies dominują. Najlepszy kanał na leady B2B", color: "#0A66C2" },
  { id: "tiktok", name: "TikTok", handle: "@anm_collective", score: 63, trend: -4, posts: 15, engRate: "2.1%", reach: "6.8k", aiTag: "Długie opisy nie działają. Potrzebujesz mocniejszego hooka", color: "#000000" },
  { id: "youtube", name: "YouTube", handle: "ANM Collective", score: 77, trend: 6, posts: 9, engRate: "54% ret.", reach: "3.2k", aiTag: "Shorts mają 3× wyższy CTR. Zwiększ ich częstotliwość", color: "#FF0000" },
  { id: "facebook", name: "Facebook", handle: "ANM Collective", score: 58, trend: -2, posts: 18, engRate: "1.4%", reach: "5.1k", aiTag: "Organiczny zasięg spada. Rekomendacja: skupić się na grupach", color: "#1877F2" },
  { id: "blog", name: "Blog", handle: "anmcollective.pl", score: 79, trend: 22, posts: 11, engRate: "3:42 avg", reach: "8.9k", aiTag: "Artykuły poradnikowe mają najwyższy czas na stronie", color: "#22C55E" },
];

const POSTS: Record<Platform, Post[]> = {
  instagram: [
    { title: "5 narzędzi AI do tworzenia contentu", date: "24 maja", type: "Reels", score: 94, reach: "31.2k", likes: 1840, comments: 94, saves: 420, ai: "Najlepszy wynik miesiąca. Kontynuuj format „narzędzia + demo" w Reels." },
    { title: "Jak planować content na miesiąc", date: "19 maja", type: "Karuzela", score: 71, reach: "12.8k", likes: 540, comments: 38, saves: 210, ai: "Dobre zapisy, ale niski zasięg. Popraw okładkę — zbyt mało kontrastu." },
    { title: "Cytat o content marketingu", date: "15 maja", type: "Obraz", score: 42, reach: "4.1k", likes: 180, comments: 6, saves: 22, ai: "Słaby wynik. Cytaty bez kontekstu nie angażują. Zastąp konkretną radą." },
    { title: "Kulisy pracy nad kampanią klienta", date: "10 maja", type: "Reels", score: 88, reach: "24.6k", likes: 1230, comments: 67, saves: 310, ai: "Format BTS działa świetnie. Zaplanuj serię miesięczną BTS." },
  ],
  linkedin: [
    { title: "Case study: +340% zasięgu dla klienta", date: "23 maja", type: "Post", score: 96, reach: "48.3k", likes: 2140, comments: 187, ai: "Najlepszy post kwartału. Kontynuuj case studies z liczbami w tytule." },
    { title: "AI nie zastąpi strategii contentowej", date: "18 maja", type: "Post", score: 89, reach: "33.1k", likes: 1640, comments: 142, ai: "Wysoki engagement. Posty kontrariańskie działają dobrze na B2B." },
    { title: "Jak tworzysz content? (ankieta)", date: "13 maja", type: "Ankieta", score: 74, reach: "18.9k", likes: 890, comments: 98, ai: "Ankiety zbierają komentarze, ale mały zasięg. Używaj jako uzupełnienie." },
  ],
  tiktok: [
    { title: "3 błędy twórców content marketingu", date: "22 maja", type: "Video", score: 81, reach: "18.4k", likes: 1240, comments: 87, saves: 340, ai: "Najlepszy wynik na TikToku. Format „3 błędy" + dynamiczny montaż działa." },
    { title: "Jak działają algorytmy TikToka", date: "17 maja", type: "Video", score: 44, reach: "3.2k", likes: 210, comments: 12, saves: 44, ai: "Zbyt długi wstęp — 8 sekund bez hooka. Przebuduj pierwsze 2 sekundy." },
    { title: "Mega lista narzędzi AI do marketingu", date: "11 maja", type: "Video", score: 38, reach: "2.8k", likes: 180, comments: 8, saves: 62, ai: "Długi opis i wolne tempo. Ten temat lepiej jako karuzela na Instagramie." },
  ],
  youtube: [
    { title: "AI do planowania contentu [tutorial]", date: "20 maja", type: "Film", score: 83, reach: "4.1k", likes: 312, comments: 54, ai: "Dobra retencja (62%). Dodaj rozdziały — użytkownicy pomijają intro." },
    { title: "Content strategy 2025 — co działa?", date: "12 maja", type: "Shorts", score: 91, reach: "11.2k", likes: 840, comments: 73, ai: "Shorts ma 3× wyższy CTR niż długie filmy. Zwiększ do 3 Shorts/tydzień." },
  ],
  facebook: [
    { title: "5 trendów content marketingu 2025", date: "21 maja", type: "Post", score: 52, reach: "6.8k", likes: 210, comments: 18, ai: "Zasięg organiczny spada. Rozważ grupy tematyczne lub promocję." },
    { title: "Prezentacja nowych usług ANM", date: "14 maja", type: "Video", score: 61, reach: "9.2k", likes: 380, comments: 27, ai: "Video działa lepiej niż posty statyczne. Zwiększ udział video." },
  ],
  blog: [
    { title: "Jak mierzyć skuteczność content marketingu?", date: "23 maja", type: "Artykuł", score: 88, reach: "12.3k", likes: 0, comments: 34, ai: "Najwyższy czas na stronie (5:12). Format z checklistą — replikuj." },
    { title: "AI w marketingu treści: przegląd narzędzi", date: "16 maja", type: "Artykuł", score: 79, reach: "8.1k", likes: 0, comments: 18, ai: "Dobre SEO (pozycja 4). Zaktualizuj sekcję o narzędziach co kwartał." },
    { title: "Dlaczego twój content nie działa? 7 powodów", date: "9 maja", type: "Artykuł", score: 92, reach: "18.7k", likes: 0, comments: 61, ai: "Najwyższy zasięg miesiąca. Format „N powodów" + liczba w tytule = świetne SEO." },
  ],
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
  { type: "up", text: "Temat „AI w marketingu" zebrał 48k na LinkedIn, ale tylko 2.1k na TikToku. Rozbuduj jako post ekspercki, na TikTok przebuduj jako „3 błędy"." },
  { type: "warn", text: "Styl z długim wstępem działa źle na TikToku i Instagramie (eng. rate < 1.8%). Skróć hook do 1–2 zdań." },
  { type: "up", text: "Content edukacyjny ma 2× wyższe zaangażowanie niż sprzedażowy na wszystkich kanałach." },
];

// ─── SCORE BAR ───────────────────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 3, borderRadius: 2, background: "#ffffff12" }}>
        <div style={{ width: `${score}%`, height: "100%", borderRadius: 2, background: color, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color, minWidth: 28, textAlign: "right" }}>{score}</span>
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
  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("ciq-theme");
    if (saved) setDark(saved === "dark");
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

  const css = dark ? darkVars : lightVars;

  return (
    <div style={{ ...st.root, background: css.bg, color: css.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Serif+Display:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .nav-tab { transition: background 0.15s, color 0.15s; }
        .nav-tab:hover { background: ${css.hoverBg} !important; }
        .account-tile { transition: transform 0.2s cubic-bezier(.22,.68,0,1.2), border-color 0.2s; }
        .account-tile:hover { transform: translateY(-2px); border-color: ${css.accentBorder} !important; }
        .post-row { transition: background 0.15s; }
        .post-row:hover { background: ${css.hoverBg} !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${css.border}; border-radius: 4px; }
      `}</style>

      <div style={st.shell}>
        {/* ── SIDEBAR ── */}
        <aside style={{ ...st.sidebar, background: css.sidebar, borderRight: `1px solid ${css.border}` }}>
          {/* Logo */}
          <div style={st.sidebarLogo}>
            <div style={{ ...st.logoMark, background: dark ? "#fff" : "#0f172a", color: dark ? "#0f172a" : "#fff" }}>IQ</div>
            <div>
              <div style={{ ...st.logoText, fontFamily: "'DM Serif Display', serif", color: css.text }}>ContentIQ</div>
              <div style={{ ...st.logoWs, color: css.muted }}>{String(workspaceId).replaceAll("-", " ")}</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "8px 0" }}>
            {NAV_TABS.map((tab) => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setActiveAccount(null); }} className="nav-tab"
                style={{ ...st.navTab, background: activeTab === tab.id ? css.activeBg : "transparent", color: activeTab === tab.id ? css.text : css.muted, borderLeft: activeTab === tab.id ? `2px solid ${css.accent}` : "2px solid transparent" }}>
                <span style={{ fontSize: 12, width: 16, textAlign: "center" }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Bottom */}
          <div style={st.sidebarBottom}>
            <button onClick={toggleTheme} style={{ ...st.themeToggle, background: css.surface, border: `1px solid ${css.border}`, color: css.muted }}>
              {dark ? "☀ Jasny tryb" : "☾ Ciemny tryb"}
            </button>
            <button onClick={handleSignOut} disabled={signingOut} style={{ ...st.signoutBtn, color: "#ef4444", background: "#ef444410", border: "1px solid #ef444430" }}>
              {signingOut ? "Wylogowywanie..." : "Wyloguj"}
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div style={{ ...st.mainArea, background: css.bg }}>

          {/* Top bar */}
          <header style={{ ...st.topbar, borderBottom: `1px solid ${css.border}`, background: css.bg }}>
            <div>
              <div style={{ ...st.tabLabel, color: css.accent }}>{NAV_TABS.find(t => t.id === activeTab)?.label}</div>
              <h1 style={{ ...st.pageTitle, fontFamily: "'DM Serif Display', serif", color: css.text }}>
                {activeAccount ? activeAccount.name : "Wszystkie konta"}
              </h1>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Link href="/dashboard" style={{ ...st.topBtn, background: css.surface, border: `1px solid ${css.border}`, color: css.muted, textDecoration: "none" }}>
                ← Dashboard
              </Link>
              <button style={{ ...st.topBtn, background: dark ? "#fff" : "#0f172a", color: dark ? "#0f172a" : "#fff", border: "none" }}>
                + Nowy content
              </button>
            </div>
          </header>

          {/* ── CONTENT AREA ── */}
          <div style={st.content}>

            {/* ====== DASHBOARD TAB ====== */}
            {activeTab === "dashboard" && !activeAccount && (
              <div>
                {/* AI insights strip */}
                <div style={{ ...st.insightStrip, background: css.surface, border: `1px solid ${css.border}` }}>
                  <div style={{ ...st.insightTitle, color: css.accent }}>✦ AI Cross-Platform Insights</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                    {INSIGHTS.map((ins, i) => (
                      <div key={i} style={{ ...st.insightItem, borderLeft: `2px solid ${ins.type === "up" ? "#22c55e" : "#f59e0b"}` }}>
                        <p style={{ fontSize: 12, color: css.muted, lineHeight: 1.6 }}>{ins.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Account tiles */}
                <div style={{ ...st.tilesLabel, color: css.muted }}>Podłączone konta — kliknij, aby zobaczyć posty</div>
                <div style={st.tilesGrid}>
                  {ACCOUNTS.map((acc) => (
                    <div key={acc.id} className="account-tile" onClick={() => setActiveAccount(acc)}
                      style={{ ...st.tile, background: css.surface, border: `1px solid ${css.border}`, cursor: "pointer" }}>

                      {/* Platform color strip */}
                      <div style={{ height: 3, background: acc.color, borderRadius: "12px 12px 0 0", margin: "-18px -18px 14px" }} />

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: css.text }}>{acc.name}</div>
                          <div style={{ fontSize: 11, color: css.muted, marginTop: 2 }}>{acc.handle}</div>
                        </div>
                        <span style={{ fontSize: 10, color: css.muted, marginTop: 2 }}>→</span>
                      </div>

                      <ScoreBar score={acc.score} />

                      <div style={{ ...st.tileStats, borderTop: `1px solid ${css.border}` }}>
                        <div><div style={{ fontSize: 13, fontWeight: 600, color: css.text }}>{acc.posts}</div><div style={{ fontSize: 10, color: css.muted }}>posty</div></div>
                        <div><div style={{ fontSize: 13, fontWeight: 600, color: css.text }}>{acc.engRate}</div><div style={{ fontSize: 10, color: css.muted }}>eng. rate</div></div>
                        <div><div style={{ fontSize: 13, fontWeight: 600, color: css.text }}>{acc.reach}</div><div style={{ fontSize: 10, color: css.muted }}>zasięg avg</div></div>
                      </div>

                      <div style={{ ...st.tileAI, background: acc.color + "15", color: acc.color }}>
                        <span style={{ fontSize: 10 }}>✦</span>
                        <span style={{ fontSize: 11, lineHeight: 1.4 }}>{acc.aiTag}</span>
                      </div>

                      <div style={{ ...st.tileTrend, color: acc.trend > 0 ? "#22c55e" : "#ef4444" }}>
                        {acc.trend > 0 ? "↑" : "↓"} {Math.abs(acc.trend)}% miesiąc do miesiąca
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ====== ACCOUNT DETAIL (post list) ====== */}
            {activeTab === "dashboard" && activeAccount && (
              <div>
                <button onClick={() => setActiveAccount(null)} style={{ ...st.backBtn, color: css.muted, background: css.surface, border: `1px solid ${css.border}` }}>
                  ← Wszystkie konta
                </button>

                {/* Account summary */}
                <div style={{ ...st.accountSummary, background: css.surface, border: `1px solid ${css.border}` }}>
                  <div style={{ height: 4, background: activeAccount.color, borderRadius: "14px 14px 0 0", margin: "-20px -20px 16px" }} />
                  <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 28, fontFamily: "'DM Serif Display', serif", color: css.text }}>{activeAccount.name}</div>
                      <div style={{ fontSize: 13, color: css.muted }}>{activeAccount.handle}</div>
                    </div>
                    <div style={{ display: "flex", gap: 28 }}>
                      {[["AI Score", `${activeAccount.score}/100`], ["Posty", String(activeAccount.posts)], ["Eng. Rate", activeAccount.engRate], ["Zasięg avg", activeAccount.reach]].map(([l, v]) => (
                        <div key={l}>
                          <div style={{ fontSize: 20, fontWeight: 600, color: css.text }}>{v}</div>
                          <div style={{ fontSize: 11, color: css.muted }}>{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ ...st.tileAI, background: activeAccount.color + "15", color: activeAccount.color, marginTop: 14 }}>
                    <span>✦</span> {activeAccount.aiTag}
                  </div>
                </div>

                {/* Posts */}
                <div style={{ ...st.postsLabel, color: css.muted }}>Posty ({POSTS[activeAccount.id]?.length ?? 0})</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(POSTS[activeAccount.id] ?? []).map((post, i) => {
                    const sc = post.score;
                    const scColor = sc >= 80 ? "#22c55e" : sc >= 60 ? "#f59e0b" : "#ef4444";
                    return (
                      <div key={i} className="post-row" style={{ ...st.postRow, background: css.surface, border: `1px solid ${css.border}` }}>
                        <div style={st.postLeft}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: css.text, lineHeight: 1.4 }}>{post.title}</div>
                          <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
                            {[["👁", post.reach], ["♥", post.likes > 0 ? post.likes.toLocaleString() : "—"], ["💬", post.comments], post.saves ? ["🔖", post.saves] : null, ["📅", post.date], ["◻", post.type]].filter(Boolean).map(([icon, val], j) => (
                              <span key={j} style={{ fontSize: 11, color: css.muted }}>{icon} {val}</span>
                            ))}
                          </div>
                          <div style={{ ...st.postAI, background: activeAccount.color + "12", color: activeAccount.color }}>
                            ✦ {post.ai}
                          </div>
                        </div>
                        <div style={{ textAlign: "center", flexShrink: 0 }}>
                          <div style={{ fontSize: 26, fontWeight: 700, color: scColor, fontFamily: "'DM Serif Display', serif" }}>{sc}</div>
                          <div style={{ fontSize: 10, color: css.muted }}>AI Score</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ====== OTHER TABS — placeholder ====== */}
            {activeTab !== "dashboard" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16 }}>
                <div style={{ fontSize: 48, opacity: 0.15 }}>{NAV_TABS.find(t => t.id === activeTab)?.icon}</div>
                <div style={{ fontSize: 22, fontFamily: "'DM Serif Display', serif", color: css.text }}>{NAV_TABS.find(t => t.id === activeTab)?.label}</div>
                <div style={{ fontSize: 13, color: css.muted, maxWidth: 320, textAlign: "center", lineHeight: 1.7 }}>
                  Ten moduł jest w budowie. Wróć do <button onClick={() => setActiveTab("dashboard")} style={{ background: "none", border: "none", color: css.accent, cursor: "pointer", fontSize: 13 }}>Dashboardu</button> albo kliknij konto, żeby zobaczyć posty.
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
  root: { transition: "background 0.3s", minHeight: "100vh", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" },
  shell: { display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" },
  sidebar: { display: "flex", flexDirection: "column", padding: "0", position: "sticky", top: 0, height: "100vh", transition: "background 0.3s" },
  sidebarLogo: { display: "flex", alignItems: "center", gap: 10, padding: "20px 18px", borderBottom: "1px solid transparent" },
  logoMark: { width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 },
  logoText: { fontSize: 15, letterSpacing: "-0.02em" },
  logoWs: { fontSize: 10, textTransform: "capitalize", letterSpacing: "0.02em", marginTop: 1 },
  navTab: { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 18px", fontSize: 13, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left", transition: "all 0.15s" },
  sidebarBottom: { padding: 16, display: "flex", flexDirection: "column", gap: 8 },
  themeToggle: { padding: "7px 12px", borderRadius: 10, fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
  signoutBtn: { padding: "7px 12px", borderRadius: 10, fontSize: 12, cursor: "pointer", fontFamily: "inherit", border: "none" },
  mainArea: { display: "flex", flexDirection: "column", minHeight: "100vh", transition: "background 0.3s" },
  topbar: { padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 },
  tabLabel: { fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 },
  pageTitle: { fontSize: 26, fontWeight: 400, letterSpacing: "-0.02em" },
  topBtn: { padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },
  content: { padding: "24px 28px", flex: 1, overflowY: "auto" },
  insightStrip: { borderRadius: 14, padding: "18px 20px", marginBottom: 24 },
  insightTitle: { fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 },
  insightItem: { paddingLeft: 12 },
  tilesLabel: { fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 },
  tilesGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 },
  tile: { borderRadius: 14, padding: 18 },
  tileStats: { display: "flex", gap: 20, paddingTop: 12, marginTop: 12 },
  tileAI: { display: "flex", gap: 6, alignItems: "flex-start", padding: "7px 10px", borderRadius: 8, marginTop: 12 },
  tileTrend: { fontSize: 11, marginTop: 8, fontWeight: 500 },
  backBtn: { padding: "6px 14px", borderRadius: 10, fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginBottom: 18 },
  accountSummary: { borderRadius: 14, padding: 20, marginBottom: 20 },
  postsLabel: { fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 },
  postRow: { borderRadius: 12, padding: "14px 16px", display: "flex", gap: 16, alignItems: "flex-start", justifyContent: "space-between" },
  postLeft: { flex: 1 },
  postAI: { display: "inline-flex", gap: 6, alignItems: "center", padding: "5px 9px", borderRadius: 7, marginTop: 8, fontSize: 11, lineHeight: 1.4 },
};
