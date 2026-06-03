"use client";

// app/dashboard/page.tsx
// Jeden dashboard — wszystkie konta social media w kafelkach z wykresami.
// Brak systemu projektów — jeden użytkownik, wszystkie platformy w jednym miejscu.

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { calculatePerformanceScore, getMetricEngagement, getMetricReach } from "@/lib/performanceScore";

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

interface PlatformConnection {
  id: string;
  platform: Platform;
  account_name: string;
  last_synced_at: string | null;
  connected: boolean;
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

// ─── DANE ────────────────────────────────────────────────────────────────────

const ACCOUNTS: AccountData[] = [
  { id: "instagram", name: "Instagram", handle: "Niepodłączone", color: "#E1306C", gradient: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)", score: 0, trend: 0, posts: 0, engRate: "0%", reach: "0", followers: "0", bestFormat: "Brak danych", aiTag: "Połącz konto, a po synchronizacji dashboard pokaże prawdziwe dane.", connected: false, sparkline: Array(12).fill(0), weeklyReach: Array(7).fill(0) },
  { id: "facebook", name: "Facebook", handle: "Niepodłączone", color: "#1877F2", gradient: "linear-gradient(135deg, #1877F2, #0d5fd8)", score: 0, trend: 0, posts: 0, engRate: "0%", reach: "0", followers: "0", bestFormat: "Brak danych", aiTag: "Połącz konto, a po synchronizacji dashboard pokaże prawdziwe dane.", connected: false, sparkline: Array(12).fill(0), weeklyReach: Array(7).fill(0) },
  { id: "linkedin", name: "LinkedIn", handle: "Niepodłączone", color: "#0A66C2", gradient: "linear-gradient(135deg, #0A66C2, #084fa0)", score: 0, trend: 0, posts: 0, engRate: "0%", reach: "0", followers: "0", bestFormat: "Brak danych", aiTag: "Połącz konto, a po synchronizacji dashboard pokaże prawdziwe dane.", connected: false, sparkline: Array(12).fill(0), weeklyReach: Array(7).fill(0) },
  { id: "tiktok", name: "TikTok", handle: "Niepodłączone", color: "#000000", gradient: "linear-gradient(135deg, #010101, #69C9D0)", score: 0, trend: 0, posts: 0, engRate: "0%", reach: "0", followers: "0", bestFormat: "Brak danych", aiTag: "Połącz konto, a po synchronizacji dashboard pokaże prawdziwe dane.", connected: false, sparkline: Array(12).fill(0), weeklyReach: Array(7).fill(0) },
  { id: "youtube", name: "YouTube", handle: "Niepodłączone", color: "#FF0000", gradient: "linear-gradient(135deg, #FF0000, #cc0000)", score: 0, trend: 0, posts: 0, engRate: "0%", reach: "0", followers: "0", bestFormat: "Brak danych", aiTag: "Połącz konto, a po synchronizacji dashboard pokaże prawdziwe dane.", connected: false, sparkline: Array(12).fill(0), weeklyReach: Array(7).fill(0) },
  { id: "blog", name: "Blog", handle: "Niepodłączone", color: "#22C55E", gradient: "linear-gradient(135deg, #22C55E, #16a34a)", score: 0, trend: 0, posts: 0, engRate: "0%", reach: "0", followers: "0", bestFormat: "Brak danych", aiTag: "Połącz konto, a po synchronizacji dashboard pokaże prawdziwe dane.", connected: false, sparkline: Array(12).fill(0), weeklyReach: Array(7).fill(0) },
  { id: "spotify", name: "Spotify", handle: "Niepodłączone", color: "#1DB954", gradient: "linear-gradient(135deg, #1DB954, #158a3e)", score: 0, trend: 0, posts: 0, engRate: "0%", reach: "0", followers: "0", bestFormat: "Brak danych", aiTag: "Połącz konto, a po synchronizacji dashboard pokaże prawdziwe dane.", connected: false, sparkline: Array(12).fill(0), weeklyReach: Array(7).fill(0) },
];

const GLOBAL_INSIGHTS: { col: string; text: string }[] = [];

// ─── MINI SPARKLINE SVG ───────────────────────────────────────────────────────

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

function zeroAccount(account: AccountData, connected: boolean, handle: string, lastSyncTag?: string): AccountData {
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
    bestFormat: "Brak danych",
    aiTag: connected
      ? `Konto jest podłączone${lastSyncTag ? ` (${lastSyncTag})` : ""}, ale nie ma jeszcze pobranych publikacji.`
      : "Połącz konto, a po synchronizacji dashboard pokaże prawdziwe dane.",
    sparkline: Array(12).fill(0),
    weeklyReach: Array(7).fill(0),
  };
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
    const total = posts.reduce((sum, post) => sum + getPostReach(post), 0);
    buckets[6] = total;
  }

  return buckets;
}

function buildSparkline(posts: DbPost[]) {
  const sorted = [...posts]
    .sort((a, b) => new Date(a.published_at || a.fetched_at || 0).getTime() - new Date(b.published_at || b.fetched_at || 0).getTime())
    .slice(-12)
    .map(getPostReach);

  return [...Array(Math.max(0, 12 - sorted.length)).fill(0), ...sorted];
}

function summarizeDbPosts(account: AccountData, posts: DbPost[], lastSync: string) {
  if (!posts.length) return zeroAccount(account, true, account.handle, lastSync);

  const reachTotal = posts.reduce((sum, post) => sum + getPostReach(post), 0);
  const engagementTotal = posts.reduce((sum, post) => sum + getPostEngagement(post), 0);
  const scores = posts.map(scorePost).filter((score) => score > 0);
  const typeCounts = posts.reduce<Record<string, number>>((acc, post) => {
    const type = post.post_type || "Post";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  const bestFormat = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Brak danych";

  return {
    ...account,
    score: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
    trend: 0,
    posts: posts.length,
    engRate: reachTotal > 0 ? `${((engagementTotal / reachTotal) * 100).toFixed(1)}%` : "0%",
    reach: formatNumber(reachTotal),
    followers: "0",
    bestFormat,
    aiTag: `Dane pochodzą z ostatniej synchronizacji API. Zaimportowano ${posts.length} publikacji dla ${account.name}.`,
    sparkline: buildSparkline(posts),
    weeklyReach: buildWeeklyReach(posts),
  };
}

function mergeConnections(accounts: AccountData[], connections: PlatformConnection[], postsByConnection: Map<string, DbPost[]>) {
  return accounts.map((account) => {
    const connection = connections.find((item) => item.platform === account.id);

    if (!connection) {
      return zeroAccount(account, false, "Niepodłączone");
    }

    const connectedAccount = {
      ...account,
      connected: true,
      handle: connection.account_name || account.name,
    };

    return summarizeDbPosts(connectedAccount, postsByConnection.get(connection.id) || [], formatLastSync(connection.last_synced_at));
  });
}

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
  const max = Math.max(...data, 1);
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
  const [accounts, setAccounts] = useState<AccountData[]>(() => mergeConnections(ACCOUNTS, [], new Map()));

  async function getOrCreateWorkspace(slug: string) {
    const { data: existing } = await supabase
      .schema("contentiq")
      .from("workspaces")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing?.id) return existing.id as string;

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Brak aktywnej sesji");

    const { data: created, error } = await supabase
      .schema("contentiq")
      .from("workspaces")
      .insert({
        user_id: auth.user.id,
        name: slug
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        type: "Firma",
        slug,
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
      if (saved) setDark(saved === "dark");
    });

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/login");
      else setUserEmail(data.user.email || "");
    });

    getOrCreateWorkspace("anm-collective")
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
              setAccounts(mergeConnections(ACCOUNTS, [], new Map()));
              return;
            }

            supabase
              .schema("contentiq")
              .from("posts")
              .select("connection_id, post_type, published_at, fetched_at, reach, impressions, likes, comments, shares, saves, clicks, ai_score")
              .in("connection_id", connectionIds)
              .then(({ data: postRows, error: postsError }) => {
                if (postsError) {
                  console.error("Dashboard posts load error:", postsError.message);
                }

                const postsByConnection = new Map<string, DbPost[]>();
                ((postRows || []) as DbPost[]).forEach((post) => {
                  const current = postsByConnection.get(post.connection_id) || [];
                  current.push(post);
                  postsByConnection.set(post.connection_id, current);
                });

                setAccounts(mergeConnections(ACCOUNTS, connections, postsByConnection));
              });
          });
      })
      .catch((error) => {
        console.error("Workspace load error:", error instanceof Error ? error.message : error);
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

  const connectedCount = accounts.filter(a => a.connected).length;
  const avgScore = Math.round(accounts.reduce((s, a) => s + a.score, 0) / accounts.length);
  const totalPosts = accounts.reduce((s, a) => s + a.posts, 0);
  const bestPlatform = [...accounts].filter(a => a.posts > 0).sort((a, b) => b.score - a.score)[0] || null;
  const globalInsights = totalPosts === 0
    ? [
        {
          col: accent,
          text: connectedCount
            ? "Konta są podłączone, ale w Supabase nie ma jeszcze pobranych publikacji. Dashboard pokazuje zera zamiast atrap."
            : "Połącz pierwszą platformę i uruchom synchronizację. Do tego czasu dashboard pokazuje zera zamiast przykładowych danych.",
        },
      ]
    : [
        {
          col: "#22c55e",
          text: `Realnie pobrane publikacje: ${totalPosts}. Średni wynik AI z zapisanych danych: ${avgScore}/100.`,
        },
        {
          col: "#818cf8",
          text: `Aktywne połączenia: ${connectedCount}/${accounts.length}. Kafelki liczą posty i zasięg z tabeli contentiq.posts.`,
        },
      ];

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
            <img src="/ANM_ContentIQ_.JPG" alt="ANM ContentIQ app icon" style={{ width: 38, height: 38, borderRadius: 12, objectFit: "cover", border: `1px solid ${border}` }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'DM Serif Display', serif", color: text, letterSpacing: "-0.02em" }}>ANM ContentIQ</div>
              <div style={{ fontSize: 10, color: muted, letterSpacing: "0.05em", textTransform: "uppercase" }}>Analytics Dashboard</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: muted }}>{userEmail}</span>
            <Link href="/app/anm-collective/settings" className="btn-hover"
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
            { label: "Podłączone konta", value: `${connectedCount}/${accounts.length}`, sub: "platform aktywnych", color: "#22c55e" },
            { label: "Avg AI Score", value: String(avgScore), sub: "średnia wszystkich kanałów", color: accent },
            { label: "Publikacje", value: String(totalPosts), sub: "wszystkich platform", color: "#f59e0b" },
            {
              label: "Najlepsza platforma",
              value: bestPlatform?.name || "Brak danych",
              sub: bestPlatform ? `score ${bestPlatform.score} · ${bestPlatform.posts} publikacji` : "czeka na synchronizację",
              color: bestPlatform?.color || muted,
            },
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
              {globalInsights.map((ins, i) => (
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
          {accounts.map((acc, idx) => (
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
                      <div style={{ fontSize: 11, fontWeight: 600, color: acc.trend === 0 ? muted : acc.trend > 0 ? "#22c55e" : "#ef4444", marginTop: 2 }}>
                        {acc.trend === 0 ? "0%" : `${acc.trend > 0 ? "↑" : "↓"} ${Math.abs(acc.trend)}%`}
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

        <footer style={{ marginTop: 32, paddingTop: 18, borderTop: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, color: muted, fontSize: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <img src="/ANM_ContentIQ_.JPG" alt="ANM ContentIQ app icon" style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover" }} />
            ANM ContentIQ
          </span>
          <span style={{ display: "inline-flex", gap: 16, flexWrap: "wrap" }}>
            <Link href="/privacy" style={{ color: muted, textDecoration: "none" }}>Polityka prywatności</Link>
            <Link href="/terms" style={{ color: muted, textDecoration: "none" }}>Regulamin</Link>
          </span>
        </footer>
      </main>
    </div>
  );
}
