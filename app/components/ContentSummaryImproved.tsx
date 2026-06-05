"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Platform = "tiktok" | "instagram" | "youtube" | "facebook" | "linkedin" | "blog" | "spotify";

type Metric = {
  id: string;
  post_id: string;
  metric_date: string;
  views: number;
  profile_views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  followers_delta: number;
  rewards_estimate: number;
};

type Account = {
  profile_name: string;
  username: string;
  avatar_url: string | null;
  followers: number;
  profile_likes: number;
};

const LABELS: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  blog: "Blog",
  spotify: "Spotify",
};

const COLORS: Record<string, string> = {
  tiktok: "#7DD3FC",
  instagram: "#E1306C",
  youtube: "#FF0033",
  facebook: "#1877F2",
  linkedin: "#0A66C2",
  blog: "#22C55E",
  spotify: "#1DB954",
};

function n(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fmt(value: number) {
  return new Intl.NumberFormat("pl-PL").format(Math.round(value));
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function normalizeMetric(row: Record<string, unknown>): Metric {
  return {
    id: String(row.id ?? crypto.randomUUID()),
    post_id: String(row.post_id ?? row.external_post_id ?? row.id ?? ""),
    metric_date: String(row.metric_date ?? row.date ?? row.created_at ?? ""),
    views: n(row.views ?? row.video_views ?? row.play_count ?? row.impressions),
    profile_views: n(row.profile_views ?? row.profile_view_count),
    likes: n(row.likes ?? row.like_count ?? row.reactions),
    comments: n(row.comments ?? row.comment_count),
    shares: n(row.shares ?? row.share_count),
    saves: n(row.saves ?? row.save_count ?? row.bookmarks),
    followers_delta: n(row.followers_delta ?? row.new_followers),
    rewards_estimate: n(row.rewards_estimate ?? row.estimated_rewards ?? row.revenue),
  };
}

function normalizeAccount(row: Record<string, unknown>, platform: Platform): Account {
  return {
    profile_name: String(row.profile_name ?? row.account_name ?? row.username ?? LABELS[platform]),
    username: String(row.username ?? row.account_name ?? ""),
    avatar_url: row.avatar_url ? String(row.avatar_url) : null,
    followers: n(row.followers ?? row.followers_count ?? row.follower_count),
    profile_likes: n(row.profile_likes ?? row.likes_count ?? row.total_likes ?? row.heart_count),
  };
}

function totals(metrics: Metric[]) {
  const posts = new Set(metrics.map((m) => m.post_id || m.id)).size || metrics.length || 1;
  const total = metrics.reduce(
    (acc, item) => {
      acc.views += item.views;
      acc.profile_views += item.profile_views;
      acc.likes += item.likes;
      acc.comments += item.comments;
      acc.shares += item.shares;
      acc.saves += item.saves;
      acc.followers_delta += item.followers_delta;
      acc.rewards_estimate += item.rewards_estimate;
      return acc;
    },
    {
      views: 0,
      profile_views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      followers_delta: 0,
      rewards_estimate: 0,
    }
  );

  return {
    ...total,
    posts_count: posts,
    avg_views: total.views / posts,
    avg_likes: total.likes / posts,
    avg_comments: total.comments / posts,
    avg_shares: total.shares / posts,
    avg_saves: total.saves / posts,
    engagement_rate:
      total.views > 0
        ? ((total.likes + total.comments + total.shares + total.saves) / total.views) * 100
        : 0,
  };
}

function series(metrics: Metric[], rangeDays: number) {
  const start = daysAgo(rangeDays - 1);

  const days = Array.from({ length: rangeDays }).map((_, i) => {
    const d = new Date(`${start}T00:00:00`);
    d.setDate(d.getDate() + i);
    return {
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("pl-PL", { day: "2-digit", month: "short" }),
      views: 0,
    };
  });

  const map = new Map(days.map((d) => [d.date, d]));

  metrics.forEach((m) => {
    const day = map.get((m.metric_date || "").slice(0, 10));
    if (day) day.views += m.views;
  });

  return days;
}

function Kpi({
  label,
  value,
  note,
  color,
  dark,
}: {
  label: string;
  value: string;
  note?: string;
  color: string;
  dark: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${dark ? "#27272A" : "#E4E4E7"}`,
        background: dark ? "#111111" : "#FFFFFF",
        padding: 15,
        minHeight: 108,
      }}
    >
      <div style={{ color: dark ? "#F5F5F5" : "#111111", fontSize: 13, fontWeight: 900, marginBottom: 9 }}>
        {label}
      </div>
      <div style={{ color, fontSize: 29, lineHeight: 1, fontFamily: "'DM Serif Display', serif" }}>{value}</div>
      {note && <div style={{ marginTop: 8, color: dark ? "#9CA3AF" : "#71717A", fontSize: 12 }}>{note}</div>}
    </div>
  );
}

function Trend({
  data,
  color,
  dark,
}: {
  data: ReturnType<typeof series>;
  color: string;
  dark: boolean;
}) {
  const w = 700;
  const h = 170;
  const pad = 26;
  const max = Math.max(...data.map((d) => d.views), 10);
  const points = data.map((d, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - (d.views / max) * (h - pad * 2);
    return { ...d, x, y };
  });

  const line = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 190, display: "block" }}>
      {[0, 0.33, 0.66, 1].map((ratio) => {
        const y = pad + ratio * (h - pad * 2);
        return <line key={ratio} x1={pad} y1={y} x2={w - pad} y2={y} stroke={dark ? "#27272A" : "#E4E4E7"} strokeDasharray="5 5" />;
      })}
      <polygon points={area} fill={color} opacity="0.08" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2.5" />
      {points.map((p) => (
        <g key={p.date}>
          <circle cx={p.x} cy={p.y} r="4" fill={dark ? "#111111" : "#ffffff"} stroke={color} strokeWidth="2" />
          <text x={p.x} y={h - 5} textAnchor="middle" fill={dark ? "#9CA3AF" : "#71717A"} fontSize="11">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function ContentSummaryImproved({
  dark = true,
  workspaceId = "contentiq",
  platform = "tiktok",
}: {
  dark?: boolean;
  workspaceId?: string;
  platform?: Platform;
}) {
  const supabase = createClient();
  const [account, setAccount] = useState<Account | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [rangeDays, setRangeDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const color = COLORS[platform] || "#7DD3FC";
  const t = useMemo(() => totals(metrics), [metrics]);
  const chart = useMemo(() => series(metrics, rangeDays), [metrics, rangeDays]);

  const css = dark
    ? {
        surface: "#111111",
        surfaceSoft: "#0B0B0C",
        text: "#F5F5F5",
        muted: "#9CA3AF",
        border: "#27272A",
        aiText: "#7DD3FC",
      }
    : {
        surface: "#FFFFFF",
        surfaceSoft: "#FAFAFA",
        text: "#111111",
        muted: "#71717A",
        border: "#E4E4E7",
        aiText: "#0284C7",
      };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const { data: ws, error: wsErr } = await supabase
          .schema("contentiq")
          .from("workspaces")
          .select("id")
          .eq("slug", workspaceId)
          .maybeSingle();

        if (wsErr) throw new Error(wsErr.message);
        if (!ws?.id) throw new Error("Nie znaleziono workspace.");

        const { data: conn } = await supabase
          .schema("contentiq")
          .from("platform_connections")
          .select("*")
          .eq("workspace_id", ws.id)
          .eq("platform", platform)
          .eq("connected", true)
          .limit(1)
          .maybeSingle();

        if (!cancelled) {
          setAccount(conn ? normalizeAccount(conn as Record<string, unknown>, platform) : null);
        }

        let loaded: Metric[] = [];
        const fromIso = daysAgo(rangeDays - 1);

        const metricsResult = await supabase
          .schema("contentiq")
          .from("content_metrics")
          .select("*")
          .eq("workspace_id", ws.id)
          .eq("platform", platform)
          .gte("metric_date", fromIso)
          .order("metric_date", { ascending: true });

        if (!metricsResult.error && metricsResult.data) {
          loaded = (metricsResult.data as Record<string, unknown>[]).map(normalizeMetric);
        } else {
          const postsResult = await supabase
            .schema("contentiq")
            .from("content_posts")
            .select("*")
            .eq("workspace_id", ws.id)
            .eq("platform", platform)
            .gte("created_at", fromIso)
            .order("created_at", { ascending: true });

          if (!postsResult.error && postsResult.data) {
            loaded = (postsResult.data as Record<string, unknown>[]).map(normalizeMetric);
          }
        }

        if (!cancelled) setMetrics(loaded);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [supabase, workspaceId, platform, rangeDays]);

  return (
    <section style={{ fontFamily: "'DM Sans','Helvetica Neue',sans-serif", color: css.text }}>
      <style>{`
        .content-summary-top {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 12px;
        }
        .content-summary-kpis {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
        }
        .content-summary-averages {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
          margin-top: 12px;
        }
        .content-summary-bottom {
          display: grid;
          grid-template-columns: 0.82fr 1.18fr;
          gap: 12px;
          margin-top: 12px;
        }
        @media(max-width: 1200px) {
          .content-summary-top,
          .content-summary-bottom {
            grid-template-columns: 1fr;
          }
          .content-summary-kpis {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .content-summary-averages {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @media(max-width: 760px) {
          .content-summary-kpis,
          .content-summary-averages {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div style={{ background: css.surface, border: `1px solid ${css.border}`, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${css.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: css.muted, fontSize: 10, fontWeight: 900, letterSpacing: ".1em", textTransform: "uppercase" }}>
              Podsumowanie contentu
            </div>
            <h2 style={{ margin: "5px 0 0", color: css.text, fontSize: 26, fontFamily: "'DM Serif Display', serif", fontWeight: 400 }}>
              Kluczowe wskaźniki · {LABELS[platform] || platform}
            </h2>
          </div>

          <select
            value={rangeDays}
            onChange={(e) => setRangeDays(Number(e.target.value))}
            style={{
              borderRadius: 12,
              border: `1px solid ${css.border}`,
              background: css.surfaceSoft,
              color: css.text,
              padding: "10px 12px",
              fontWeight: 800,
              fontFamily: "inherit",
            }}
          >
            <option value={7}>Ostatnich 7 dni</option>
            <option value={14}>Ostatnich 14 dni</option>
            <option value={30}>Ostatnich 30 dni</option>
          </select>
        </div>

        {loading && <div style={{ padding: 18, color: css.muted, fontSize: 13 }}>Ładowanie danych...</div>}
        {error && !loading && <div style={{ padding: 18, color: "#ef4444", fontSize: 13 }}>{error}</div>}

        {!loading && !error && (
          <div style={{ padding: 16 }}>
            <div className="content-summary-top">
              <div style={{ borderRadius: 16, border: `1px solid ${css.border}`, background: css.surfaceSoft, padding: 15 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                  {account?.avatar_url ? (
                    <img src={account.avatar_url} alt="" style={{ width: 48, height: 48, borderRadius: 16, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 16, display: "grid", placeItems: "center", background: `${color}18`, color, border: `1px solid ${color}44`, fontWeight: 900 }}>
                      {LABELS[platform]?.slice(0, 2).toUpperCase() || "SM"}
                    </div>
                  )}

                  <div>
                    <div style={{ color: css.text, fontSize: 15, fontWeight: 900 }}>
                      {account?.profile_name || "Profil niepodłączony"}
                    </div>
                    <div style={{ color: css.muted, fontSize: 12, marginTop: 3 }}>
                      {account?.username ? `@${account.username}` : LABELS[platform] || platform}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <div style={{ color: css.muted, fontSize: 11, fontWeight: 800 }}>Polubienia profilu</div>
                    <div style={{ color, fontSize: 28, fontFamily: "'DM Serif Display', serif" }}>
                      {fmt(account?.profile_likes || 0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: css.muted, fontSize: 11, fontWeight: 800 }}>Obserwujący</div>
                    <div style={{ color: css.text, fontSize: 22, fontWeight: 900 }}>
                      {fmt(account?.followers || 0)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="content-summary-kpis">
                <Kpi label="Wyświetlenia filmu" value={fmt(t.views)} note={`+${fmt(t.views)} w ${rangeDays} dni`} color={color} dark={dark} />
                <Kpi label="Wyświetlenia profilu" value={fmt(t.profile_views)} note={`+${fmt(t.profile_views)}`} color={color} dark={dark} />
                <Kpi label="Polubienia" value={fmt(t.likes)} note={`+${fmt(t.likes)}`} color={color} dark={dark} />
                <Kpi label="Komentarze" value={fmt(t.comments)} note={`+${fmt(t.comments)}`} color={color} dark={dark} />
                <Kpi label="Udostępnienia" value={fmt(t.shares)} note={`+${fmt(t.shares)}`} color={color} dark={dark} />
                <Kpi label="Szac. nagrody" value={money(t.rewards_estimate)} note={`${money(t.rewards_estimate)}`} color={color} dark={dark} />
              </div>
            </div>

            <div className="content-summary-averages">
              <Kpi label="Śr. wyświetleń / post" value={fmt(t.avg_views)} color={css.aiText} dark={dark} />
              <Kpi label="Śr. polubień / post" value={fmt(t.avg_likes)} color={css.aiText} dark={dark} />
              <Kpi label="Śr. komentarzy / post" value={fmt(t.avg_comments)} color={css.aiText} dark={dark} />
              <Kpi label="Śr. udostępnień / post" value={fmt(t.avg_shares)} color={css.aiText} dark={dark} />
              <Kpi label="Engagement rate" value={`${t.engagement_rate.toFixed(2)}%`} note={`${fmt(t.posts_count)} publikacji`} color={css.aiText} dark={dark} />
            </div>

            <div className="content-summary-bottom">
              <div style={{ borderRadius: 16, border: `1px solid ${css.border}`, background: css.surfaceSoft, padding: 15 }}>
                <div style={{ color: css.muted, fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>
                  Łączne statystyki
                </div>

                {[
                  ["Publikacje w okresie", fmt(t.posts_count)],
                  ["Zapisania", fmt(t.saves)],
                  ["Nowi obserwujący", fmt(t.followers_delta)],
                  ["Interakcje razem", fmt(t.likes + t.comments + t.shares + t.saves)],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: `1px solid ${css.border}`, fontSize: 13 }}>
                    <span style={{ color: css.muted }}>{label}</span>
                    <strong style={{ color: css.text }}>{value}</strong>
                  </div>
                ))}
              </div>

              <div style={{ borderRadius: 16, border: `1px solid ${css.border}`, background: css.surfaceSoft, padding: 15 }}>
                <div style={{ color: css.muted, fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>
                  Trend wyświetleń
                </div>
                <Trend data={chart} color={color} dark={dark} />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
