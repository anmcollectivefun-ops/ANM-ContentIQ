"use client";

// app/dashboard/page.tsx
// Jeden dashboard — wszystkie konta social media w kafelkach z wykresami.
// Brak systemu projektów — jeden użytkownik, wszystkie platformy w jednym miejscu.

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ─── TYPY ────────────────────────────────────────────────────────────────────

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
  sparkline: number[]; // 12 punktów danych do mini wykresu
  weeklyReach: number[];
}

// ─── DANE ────────────────────────────────────────────────────────────────────

const ACCOUNTS: AccountData[] = [
  {
    id: "instagram",
    name: "Instagram",
    handle: "@anm_collective",
    color: "#E1306C",
    gradient: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)",
    score: 84,
    trend: 11,
    posts: 38,
    engRate: "4.2%",
    reach: "12.4k",
    followers: "8.2k",
    bestFormat: "Reels edukacyjne",
    aiTag: "Reels mają 2× wyższy zasięg niż karuzele. Zwiększ częstotliwość krótkich video.",
    connected: true,
    sparkline: [40, 55, 48, 62, 58, 71, 65, 80, 74, 88, 82, 94],
    weeklyReach: [8200, 9400, 8800, 11200, 10400, 13100, 12400],
  },
  {
    id: "facebook",
    name: "Facebook",
    handle: "ANM Collective",
    color: "#1877F2",
    gradient: "linear-gradient(135deg, #1877F2, #0d5fd8)",
    score: 58,
    trend: -2,
    posts: 18,
    engRate: "1.4%",
    reach: "5.1k",
    followers: "3.4k",
    bestFormat: "Video + grupy",
    aiTag: "Organiczny zasięg spada. Skup się na grupach tematycznych i video.",
    connected: false,
    sparkline: [62, 58, 55, 60, 52, 49, 55, 51, 48, 54, 56, 58],
    weeklyReach: [5800, 5200, 4900, 5400, 4800, 5100, 5100],
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    handle: "ANM Collective",
    color: "#0A66C2",
    gradient: "linear-gradient(135deg, #0A66C2, #084fa0)",
    score: 91,
    trend: 18,
    posts: 22,
    engRate: "6.8%",
    reach: "28.1k",
    followers: "12.1k",
    bestFormat: "Case studies",
    aiTag: "Najlepszy kanał na leady B2B. Case studies z liczbami w tytule dominują.",
    connected: true,
    sparkline: [55, 62, 70, 68, 75, 80, 77, 85, 83, 88, 90, 91],
    weeklyReach: [18200, 21400, 23800, 25200, 26400, 27800, 28100],
  },
  {
    id: "tiktok",
    name: "TikTok",
    handle: "@anm_collective",
    color: "#000000",
    gradient: "linear-gradient(135deg, #010101, #69C9D0)",
    score: 63,
    trend: -4,
    posts: 15,
    engRate: "2.1%",
    reach: "6.8k",
    followers: "4.8k",
    bestFormat: "Krótkie listy błędów",
    aiTag: "Hook musi wejść w pierwszej sekundzie. Długie wstępy zabijają zasięg.",
    connected: true,
    sparkline: [72, 68, 65, 70, 63, 58, 65, 61, 57, 62, 64, 63],
    weeklyReach: [7800, 7200, 6600, 7100, 6500, 6800, 6800],
  },
  {
    id: "youtube",
    name: "YouTube",
    handle: "ANM Collective",
    color: "#FF0000",
    gradient: "linear-gradient(135deg, #FF0000, #cc0000)",
    score: 77,
    trend: 6,
    posts: 9,
    engRate: "54% ret.",
    reach: "3.2k",
    followers: "1.9k",
    bestFormat: "Shorts + tutoriale",
    aiTag: "Shorts mają 3× wyższy CTR niż długie filmy. Zwiększ do 3 Shorts tygodniowo.",
    connected: true,
    sparkline: [60, 65, 62, 68, 70, 72, 69, 74, 75, 76, 77, 77],
    weeklyReach: [2400, 2600, 2800, 2900, 3000, 3100, 3200],
  },
  {
    id: "blog",
    name: "Blog",
    handle: "anmcollective.pl",
    color: "#22C55E",
    gradient: "linear-gradient(135deg, #22C55E, #16a34a)",
    score: 79,
    trend: 22,
    posts: 11,
    engRate: "3:42 avg",
    reach: "8.9k",
    followers: "—",
    bestFormat: "Poradniki SEO",
    aiTag: "Artykuły poradnikowe mają najwyższy czas na stronie i generują leady organiczne.",
    connected: true,
    sparkline: [45, 50, 55, 58, 62, 65, 68, 72, 74, 76, 78, 79],
    weeklyReach: [5200, 6100, 6800, 7400, 7900, 8400, 8900],
  },
  {
    id: "spotify",
    name: "Spotify",
    handle: "ANM Podcast",
    color: "#1DB954",
    gradient: "linear-gradient(135deg, #1DB954, #158a3e)",
    score: 72,
    trend: 9,
    posts: 7,
    engRate: "41% compl.",
    reach: "2.7k",
    followers: "890",
    bestFormat: "Odcinki poradnikowe",
    aiTag: "Krótkie odcinki z konkretną obietnicą w tytule mają 2× wyższy completion rate.",
    connected: false,
    sparkline: [58, 62, 60, 65, 63, 68, 66, 70, 69, 72, 71, 72],
    weeklyReach: [1800, 2000, 2100, 2300, 2400, 2600, 2700],
  },
];

const GLOBAL_INSIGHTS = [
  { col: "#22c55e", text: "LinkedIn generuje 3× więcej leadów niż pozostałe platformy. Content ekspercki z case studies dominuje." },
  { col: "#f59e0b", text: "TikTok i Facebook tracą zasięg. Hook pierwszych 2 sekund jest kluczowy — bez niego algorytm nie wypycha treści." },
  { col: "#818cf8", text: "Blog rośnie najszybciej (+22%). Artykuły poradnikowe warto recyklować na LinkedIn i jako Shorts na YouTube." },
];

// ─── MINI SPARKLINE SVG ───────────────────────────────────────────────────────

function Sparkline({ data, color, width = 120, height = 40 }: { data: number[]; color: string; width?: number; height?: number }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });
  const pathD = `M ${points.join(" L ")}`;
  const areaD = `M ${points[0]} L ${points.join(" L ")} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#sg-${color.replace("#", "")})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].split(",")[0]} cy={points[points.length - 1].split(",")[1]} r="3" fill={color} />
    </svg>
  );
}

// ─── BAR CHART (weekly reach) ─────────────────────────────────────────────────

function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const days = ["P", "W", "Ś", "C", "P", "S", "N"];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 36 }}>
      {data.map((v, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: 1 }}>
          <div style={{ width: "100%", height: Math.max(3, (v / max) * 28), background: i === data.length - 1 ? color : color + "55", borderRadius: 3, transition: "height 0.6s ease" }} />
          <span style={{ fontSize: 8, color: "#ffffff44", fontFamily: "inherit" }}>{days[i]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── SCORE RING ───────────────────────────────────────────────────────────────

function ScoreRing({ score, color, size = 52 }: { score: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ffffff15" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
    </svg>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [expandedInsights, setExpandedInsights] = useState(true);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("ciq-theme");
    if (saved) setDark(saved === "dark");
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/login");
      else setUserEmail(data.user.email || "");
    });
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
  const bg = d ? "#07111e" : "#f0f4f8";
  const surface = d ? "#0d1b2a" : "#ffffff";
  const surfaceUp = d ? "#112235" : "#f7fafd";
  const border = d ? "#1a2e42" : "#dce8f0";
  const text = d ? "#e8f2ff" : "#0d1b2a";
  const muted = d ? "#4a6480" : "#6b8299";
  const accent = "#4E8FD4";
  const cardBg = d ? "#0f1f30" : "#ffffff";
  const cardBorder = d ? "#1e3248" : "#dde8f2";

  const connectedCount = ACCOUNTS.filter(a => a.connected).length;
  const avgScore = Math.round(ACCOUNTS.reduce((s, a) => s + a.score, 0) / ACCOUNTS.length);
  const totalPosts = ACCOUNTS.reduce((s, a) => s + a.posts, 0);

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", transition: "background 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700&family=DM+Serif+Display&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .account-card{transition:transform 0.2s cubic-bezier(.22,.68,0,1.2),box-shadow 0.2s ease,border-color 0.2s}
        .account-card:hover{transform:translateY(-3px)}
        .btn-hover{transition:opacity 0.15s,transform 0.15s}
        .btn-hover:hover{opacity:0.85;transform:translateY(-1px)}
        .nav-link{transition:color 0.15s,opacity 0.15s}
        .nav-link:hover{opacity:0.7}
        .connect-btn{transition:all 0.15s}
        .connect-btn:hover{filter:brightness(1.1)}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:${border};border-radius:4px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp 0.4s ease forwards}
      `}</style>

      {/* ── TOPBAR ── */}
      <header style={{ borderBottom: `1px solid ${border}`, background: d ? "rgba(7,17,30,0.9)" : "rgba(240,244,248,0.9)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1360, margin: "0 auto", padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: "-0.03em" }}>IQ</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'DM Serif Display', serif", color: text, letterSpacing: "-0.02em" }}>ANM ContentIQ</div>
              <div style={{ fontSize: 10, color: muted, letterSpacing: "0.05em", textTransform: "uppercase" }}>Analytics Dashboard</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: muted }}>{userEmail}</span>
            <Link href="/app/anm-collective/settings?tab=integrations" className="btn-hover"
              style={{ padding: "7px 14px", borderRadius: 9, border: `1px solid ${border}`, background: surfaceUp, color: muted, fontSize: 12, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
              ⊕ Integracje API
            </Link>
            <button onClick={toggleTheme} className="btn-hover"
              style={{ padding: "7px 14px", borderRadius: 9, border: `1px solid ${border}`, background: surfaceUp, color: muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              {d ? "☀" : "☾"}
            </button>
            <button onClick={handleSignOut} disabled={signingOut} className="btn-hover"
              style={{ padding: "7px 14px", borderRadius: 9, background: "#ef444415", border: "1px solid #ef444430", color: "#ef4444", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              {signingOut ? "..." : "Wyloguj"}
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1360, margin: "0 auto", padding: "32px 28px 80px" }}>

        {/* ── HERO ── */}
        <div style={{ marginBottom: 32 }} className="fade-up">
          <div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 10 }}>
            ✦ Live Analytics
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 400, fontFamily: "'DM Serif Display', serif", color: text, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: 10 }}>
            Centrum analityki contentu
          </h1>
          <p style={{ fontSize: 14, color: muted, maxWidth: 560, lineHeight: 1.7 }}>
            Wszystkie platformy w jednym miejscu — wyniki live, porównanie kanałów i rekomendacje AI.
          </p>
        </div>

        {/* ── STATS ROW ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Podłączone konta", value: `${connectedCount}/${ACCOUNTS.length}`, sub: "platform aktywnych", color: "#22c55e" },
            { label: "Avg AI Score", value: String(avgScore), sub: "średnia wszystkich kanałów", color: accent },
            { label: "Publikacje", value: String(totalPosts), sub: "wszystkich platform", color: "#f59e0b" },
            { label: "Najlepsza platforma", value: "LinkedIn", sub: "score 91 · trend +18%", color: "#0A66C2" },
          ].map((stat, i) => (
            <div key={i} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: "16px 18px" }} className="fade-up">
              <div style={{ fontSize: 11, color: muted, marginBottom: 6, fontWeight: 500 }}>{stat.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'DM Serif Display', serif", color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* ── AI INSIGHTS ── */}
        <div style={{ background: d ? "#0a1929" : "#eef6ff", border: `1px solid ${d ? "#1a3a5c" : "#c8dcf0"}`, borderRadius: 16, padding: "16px 20px", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: expandedInsights ? 14 : 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              ✦ AI Cross-Platform Insights
            </div>
            <button onClick={() => setExpandedInsights(!expandedInsights)}
              style={{ background: "none", border: "none", color: muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              {expandedInsights ? "Zwiń ▲" : "Rozwiń ▼"}
            </button>
          </div>
          {expandedInsights && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {GLOBAL_INSIGHTS.map((ins, i) => (
                <div key={i} style={{ borderLeft: `2px solid ${ins.col}`, paddingLeft: 12, fontSize: 12, color: d ? "#a8c4e0" : "#334e66", lineHeight: 1.65 }}>
                  {ins.text}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── ACCOUNT TILES ── */}
        <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
          Wszystkie konta — kliknij aby wejść w szczegóły
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {ACCOUNTS.map((acc, idx) => (
            <div key={acc.id} className="account-card fade-up" style={{ animationDelay: `${idx * 0.05}s`, background: cardBg, border: `1px solid ${acc.connected ? acc.color + "35" : cardBorder}`, borderRadius: 18, overflow: "hidden", cursor: "pointer" }}
              onClick={() => router.push(`/app/anm-collective?platform=${acc.id}`)}>

              {/* Color strip */}
              <div style={{ height: 3, background: acc.gradient }} />

              <div style={{ padding: "16px 18px 18px" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: text }}>{acc.name}</div>
                    <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{acc.handle}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    {acc.connected ? (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: "#22c55e18", color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        ● Aktywne
                      </span>
                    ) : (
                      <Link href="/app/anm-collective/settings?tab=integrations"
                        onClick={e => e.stopPropagation()}
                        className="connect-btn"
                        style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: acc.color + "25", color: acc.color, textTransform: "uppercase", letterSpacing: "0.06em", textDecoration: "none" }}>
                        + Połącz
                      </Link>
                    )}
                  </div>
                </div>

                {/* Score + sparkline */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <ScoreRing score={acc.score} color={acc.color} />
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: acc.color, fontFamily: "'DM Serif Display', serif", lineHeight: 1 }}>{acc.score}</div>
                      <div style={{ fontSize: 10, color: muted }}>AI Score</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: acc.trend > 0 ? "#22c55e" : "#ef4444", marginTop: 2 }}>
                        {acc.trend > 0 ? "↑" : "↓"} {Math.abs(acc.trend)}%
                      </div>
                    </div>
                  </div>
                  <Sparkline data={acc.sparkline} color={acc.color} width={110} height={38} />
                </div>

                {/* Stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: "10px 0", borderTop: `1px solid ${d ? "#1a2e42" : "#e8f0f8"}`, borderBottom: `1px solid ${d ? "#1a2e42" : "#e8f0f8"}`, marginBottom: 12 }}>
                  {[
                    { label: "Posty", val: acc.posts },
                    { label: "Zasięg avg", val: acc.reach },
                    { label: "Followers", val: acc.followers },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: text }}>{val}</div>
                      <div style={{ fontSize: 10, color: muted }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Mini bar chart */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: muted, marginBottom: 6 }}>Zasięg — ostatnie 7 dni</div>
                  <MiniBarChart data={acc.weeklyReach} color={acc.color} />
                </div>

                {/* Best format */}
                <div style={{ fontSize: 10, color: muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Najlepszy format</div>
                <div style={{ display: "inline-flex", padding: "4px 10px", borderRadius: 8, background: acc.color + "18", color: acc.color, fontSize: 11, fontWeight: 600, marginBottom: 10 }}>
                  {acc.bestFormat}
                </div>

                {/* AI tag */}
                <div style={{ background: d ? "#0a1929" : "#eef6ff", border: `1px solid ${d ? "#1a3a5c" : "#c8dcf0"}`, borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>✦ AI</div>
                  <div style={{ fontSize: 11, color: d ? "#a8c4e0" : "#334e66", lineHeight: 1.55 }}>{acc.aiTag}</div>
                </div>

                {/* Footer links */}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <Link href={`/app/anm-collective?platform=${acc.id}`} onClick={e => e.stopPropagation()}
                    style={{ flex: 1, textAlign: "center", padding: "7px", borderRadius: 9, background: acc.color, color: "#fff", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                    Szczegóły →
                  </Link>
                  <Link href="/app/anm-collective/settings?tab=integrations" onClick={e => e.stopPropagation()}
                    style={{ padding: "7px 12px", borderRadius: 9, border: `1px solid ${cardBorder}`, color: muted, fontSize: 11, textDecoration: "none" }}>
                    ⊕ API
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── QUICK LINKS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 28 }}>
          {[
            { label: "Content Studio AI", desc: "Generuj, analizuj i adaptuj treści pod każdą platformę", icon: "✦", href: "/app/anm-collective?tab=studio", color: accent },
            { label: "Porównanie platform", desc: "Sprawdź gdzie jaki format i temat działa najlepiej", icon: "⊞", href: "/app/anm-collective?tab=compare", color: "#f59e0b" },
            { label: "Ustawienia integracji", desc: "Podłącz konta przez OAuth — Instagram, LinkedIn, TikTok i więcej", icon: "⊕", href: "/app/anm-collective/settings?tab=integrations", color: "#22c55e" },
          ].map((link, i) => (
            <Link key={i} href={link.href} className="btn-hover"
              style={{ display: "block", background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: "16px 18px", textDecoration: "none" }}>
              <div style={{ fontSize: 18, marginBottom: 8, color: link.color }}>{link.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: text, marginBottom: 4 }}>{link.label}</div>
              <div style={{ fontSize: 12, color: muted, lineHeight: 1.6 }}>{link.desc}</div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
