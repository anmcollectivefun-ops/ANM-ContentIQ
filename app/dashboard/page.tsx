// app/dashboard/page.tsx
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const workspaces = [
  { id: "anm-collective", name: "ANM Collective", type: "Firma / SaaS", score: 87, trend: +11, status: "Aktywny", platforms: ["ig", "li", "tt", "yt"], posts: 42, topPlatform: "LinkedIn" },
  { id: "creator-planner", name: "Creator Planner", type: "Influencer", score: 82, trend: +4, status: "W przygotowaniu", platforms: ["ig", "tt", "yt"], posts: 18, topPlatform: "Instagram" },
  { id: "blog-seo", name: "Blog & SEO Hub", type: "Content marketing", score: 74, trend: -2, status: "Do rozbudowy", platforms: ["blog", "li"], posts: 11, topPlatform: "Blog" },
];

const stats = [
  { label: "Projekty", value: "3", sub: "1 aktywny" },
  { label: "Publikacje", value: "71", sub: "ten miesiąc" },
  { label: "Avg AI Score", value: "81", sub: "+5 vs ostatni mies." },
  { label: "Rekomendacje AI", value: "18", sub: "do przejrzenia" },
];

const PLATFORM_ICONS: Record<string, string> = { ig: "IG", li: "LI", tt: "TT", yt: "YT", blog: "BL", sp: "SP" };
const PLATFORM_COLORS: Record<string, string> = { ig: "#E1306C", li: "#0A66C2", tt: "#000000", yt: "#FF0000", blog: "#22C55E", sp: "#1DB954" };

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={3} opacity={0.1} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3} strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle" style={{ transform: `rotate(90deg) translateY(-${size / 2}px) translateX(${size / 2}px)`, fontSize: 13, fontWeight: 600, fill: color, fontFamily: "inherit" }}>{score}</text>
    </svg>
  );
}

export default function DashboardPage() {
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);

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

  if (!mounted) return null;

  const css = dark ? styles.dark : styles.light;

  return (
    <div style={{ ...s.root, background: css.bg, color: css.text, minHeight: "100vh", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Serif+Display:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .ws-card { transition: transform 0.22s cubic-bezier(.22,.68,0,1.2), box-shadow 0.22s ease; }
        .ws-card:hover { transform: translateY(-3px); }
        .ws-card:hover .arrow-hint { opacity: 1 !important; transform: translateX(0) !important; }
      `}</style>

      <header style={{ ...s.header, borderBottom: `1px solid ${css.border}` }}>
        <div style={s.headerInner}>
          <div style={s.logoGroup}>
            <span style={{ ...s.logoMark, background: dark ? "#fff" : "#0f172a", color: dark ? "#0f172a" : "#fff" }}>IQ</span>
            <div>
              <div style={{ ...s.logoName, fontFamily: "'DM Serif Display', serif", color: css.text }}>ANM ContentIQ</div>
              <div style={{ ...s.logoSub, color: css.muted }}>Panel użytkownika</div>
            </div>
          </div>
          <nav style={s.nav}>
            <button onClick={toggleTheme} style={{ ...s.themeBtn, background: css.surface, border: `1px solid ${css.border}`, color: css.text }}>{dark ? "☀ Jasny" : "☾ Ciemny"}</button>
          </nav>
        </div>
      </header>

      <main style={s.main}>
        <section style={s.hero}>
          <div style={{ ...s.greeting, color: css.accent }}>Dzień dobry, Anna</div>
          <h1 style={{ ...s.heroTitle, fontFamily: "'DM Serif Display', serif", color: css.text }}>Twoje projekty</h1>
        </section>

        <section style={s.statsGrid}>
          {stats.map((st, i) => (
            <div key={i} style={{ ...s.statCard, background: css.surface, border: `1px solid ${css.border}` }}>
              <div style={{ ...s.statValue, color: css.text }}>{st.value}</div>
              <div style={{ ...s.statLabel, color: css.text }}>{st.label}</div>
              <div style={{ ...s.statSub, color: css.muted }}>{st.sub}</div>
            </div>
          ))}
        </section>

        <div style={{ ...s.sectionHead }}>
          <span style={{ ...s.sectionLabel, color: css.muted }}>Workspace'y</span>
          <button style={{ ...s.addBtn, background: dark ? "#fff" : "#0f172a", color: dark ? "#0f172a" : "#fff" }}>+ Nowy projekt</button>
        </div>

        <section style={s.cardsGrid}>
          {workspaces.map((ws) => (
            <Link key={ws.id} href={`/app/${ws.id}`} style={{ textDecoration: "none" }}>
              <div className="ws-card" style={{ ...s.wsCard, background: css.surface, border: `1px solid ${css.border}` }}>
                <div style={s.wsTop}>
                  <span style={{ ...s.wsStatus, background: ws.status === "Aktywny" ? (dark ? "#052e16" : "#dcfce7") : dark ? "#1c1917" : "#f5f5f4", color: ws.status === "Aktywny" ? "#22c55e" : css.muted }}>{ws.status}</span>
                  <span className="arrow-hint" style={{ ...s.arrowHint, color: css.muted, opacity: 0, transform: "translateX(-6px)" }}>Otwórz →</span>
                </div>
                <div style={{ marginTop: 20 }}>
                  <h2 style={{ ...s.wsName, fontFamily: "'DM Serif Display', serif", color: css.text }}>{ws.name}</h2>
                  <p style={{ ...s.wsType, color: css.muted }}>{ws.type}</p>
                </div>
                <div style={{ ...s.wsMiddle, borderTop: `1px solid ${css.border}` }}>
                  <ScoreRing score={ws.score} />
                  <div>
                    <div style={{ ...s.wsTrend, color: ws.trend > 0 ? "#22c55e" : "#ef4444" }}>{ws.trend > 0 ? "↑" : "↓"} {Math.abs(ws.trend)}% vs ostatni mies.</div>
                    <div style={{ ...s.wsPlatforms }}>
                      {ws.platforms.map((p) => (
                        <span key={p} style={{ ...s.platformPill, background: PLATFORM_COLORS[p] + (dark ? "25" : "18"), color: PLATFORM_COLORS[p] }}>{PLATFORM_ICONS[p]}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ ...s.wsFooter, borderTop: `1px solid ${css.border}` }}>
                  <span style={{ color: css.muted, fontSize: 12 }}>{ws.posts} publikacji · Najlepszy: {ws.topPlatform}</span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}

const styles = {
  dark: { bg: "#080c14", surface: "#0f1520", text: "#f0f4ff", muted: "#4a5568", border: "#1a2234", accent: "#6366f1" },
  light: { bg: "#f8f7f4", surface: "#ffffff", text: "#0f172a", muted: "#94a3b8", border: "#e8e8e4", accent: "#6366f1" },
};

const s: Record<string, React.CSSProperties> = {
  root: { transition: "background 0.3s, color 0.3s" },
  header: { position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(12px)" },
  headerInner: { maxWidth: 1200, margin: "0 auto", padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" },
  logoGroup: { display: "flex", alignItems: "center", gap: 12 },
  logoMark: { width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 },
  logoName: { fontSize: 17, lineHeight: 1.1, letterSpacing: "-0.02em" },
  logoSub: { fontSize: 10, marginTop: 1, letterSpacing: "0.04em", textTransform: "uppercase" },
  nav: { display: "flex", alignItems: "center", gap: 20 },
  themeBtn: { fontSize: 12, padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit" },
  main: { maxWidth: 1200, margin: "0 auto", padding: "48px 32px 80px" },
  hero: { marginBottom: 48 },
  greeting: { fontSize: 12, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 },
  heroTitle: { fontSize: 52, fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: 12 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 40 },
  statCard: { padding: "20px 22px", borderRadius: 14 },
  statValue: { fontSize: 34, fontWeight: 600, letterSpacing: "-0.03em", fontFamily: "'DM Serif Display', serif" },
  statLabel: { fontSize: 13, fontWeight: 500, marginTop: 4 },
  statSub: { fontSize: 11, marginTop: 3 },
  sectionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em" },
  addBtn: { fontSize: 12, fontWeight: 500, padding: "8px 18px", borderRadius: 20, border: "none", cursor: "pointer", fontFamily: "inherit" },
  cardsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  wsCard: { borderRadius: 18, padding: "22px 24px", cursor: "pointer" },
  wsTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  wsStatus: { fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 20 },
  arrowHint: { fontSize: 12, transition: "opacity 0.2s, transform 0.2s" },
  wsName: { fontSize: 24, letterSpacing: "-0.02em", lineHeight: 1.15 },
  wsType: { fontSize: 12, marginTop: 4 },
  wsMiddle: { display: "flex", alignItems: "center", gap: 16, paddingTop: 18, marginTop: 20 },
  wsTrend: { fontSize: 12, fontWeight: 500, marginBottom: 8 },
  wsPlatforms: { display: "flex", gap: 5 },
  platformPill: { fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6, letterSpacing: "0.04em" },
  wsFooter: { paddingTop: 14, marginTop: 16 },
};