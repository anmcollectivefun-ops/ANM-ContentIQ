"use client";



import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── TYPY ────────────────────────────────────────────────────────────────────

type Platform = "instagram" | "facebook" | "linkedin" | "tiktok" | "youtube" | "blog" | "spotify";

type Status = "scheduled" | "published" | "failed" | "cancelled";

interface ScheduledPost {
  id: string;
  platform: Platform;
  scheduled_at: string;
  published_at: string | null;
  status: Status;
  draft: {
    title: string;
    body: string;
    content_type: string | null;
    ai_score: number | null;
    target_platforms: string[] | null;
  } | null;
}

// ─── CONSTS ──────────────────────────────────────────────────────────────────

const PLATFORM_META: Record<Platform, { color: string; label: string; icon: string }> = {
  instagram: { color: "#E1306C", label: "Instagram", icon: "IG" },
  facebook:  { color: "#1877F2", label: "Facebook",  icon: "FB" },
  linkedin:  { color: "#0A66C2", label: "LinkedIn",  icon: "LI" },
  tiktok:    { color: "#00C4CC", label: "TikTok",    icon: "TT" },
  youtube:   { color: "#FF0000", label: "YouTube",   icon: "YT" },
  blog:      { color: "#22C55E", label: "Blog",      icon: "BL" },
  spotify:   { color: "#1DB954", label: "Spotify",   icon: "SP" },
};

const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  scheduled:  { label: "Zaplanowane",  color: "#818cf8", bg: "#818cf820" },
  published:  { label: "Opublikowane", color: "#22c55e", bg: "#22c55e18" },
  failed:     { label: "Błąd",         color: "#ef4444", bg: "#ef444418" },
  cancelled:  { label: "Anulowane",    color: "#6b7280", bg: "#6b728018" },
};

const DAYS_PL = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];
const MONTHS_PL = ["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec","Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatDate(val: string) {
  const d = new Date(val);
  return `${d.getDate()} ${MONTHS_PL[d.getMonth()].slice(0,3)} ${d.getFullYear()}, ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function Schedule({
  dark = true,
  workspaceId,
}: {
  dark?: boolean;
  workspaceId: string;
}) {
  const supabase = createClient();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState<Status | "all">("all");
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selected, setSelected] = useState<ScheduledPost | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const css = dark
    ? { bg: "#080c14", surface: "#0d1829", text: "#e8f0ff", muted: "#4a6480", border: "#1a2740", accent: "#818cf8" }
    : { bg: "#f0f4f8", surface: "#ffffff", text: "#0f172a", muted: "#64748b", border: "#e2e8f0", accent: "#6366f1" };

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    setLoading(true);
    try {
      // Pobierz workspace UUID
      const { data: ws } = await supabase.schema("contentiq").from("workspaces")
        .select("id").eq("slug", workspaceId).single();
      if (!ws?.id) { setLoading(false); return; }

      // Pobierz scheduled_posts z draftem
      const { data, error } = await supabase
        .schema("contentiq")
        .from("scheduled_posts")
        .select(`
          id, platform, scheduled_at, published_at, status,
          draft:draft_id (title, body, content_type, ai_score, target_platforms)
        `)
        .in("connection_id", 
          (await supabase.schema("contentiq").from("platform_connections")
            .select("id").eq("workspace_id", ws.id).eq("connected", true)).data?.map(c => c.id) || []
        )
        .order("scheduled_at", { ascending: true });

      if (error) throw new Error(error.message);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPosts((data || []) as any as ScheduledPost[]);
    } catch (e) {
      console.error("Schedule load error:", e);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [workspaceId]);

  async function cancelPost(id: string) {
    setCancelling(id);
    const { error } = await supabase.schema("contentiq").from("scheduled_posts")
      .update({ status: "cancelled" }).eq("id", id);
    if (error) showToast("Błąd anulowania");
    else { showToast("Post anulowany"); await load(); setSelected(null); }
    setCancelling(null);
  }

  const filtered = filter === "all" ? posts : posts.filter(p => p.status === filter);
  const upcoming = posts.filter(p => p.status === "scheduled" && new Date(p.scheduled_at) > new Date());
  const today = posts.filter(p => p.status === "scheduled" && isSameDay(new Date(p.scheduled_at), new Date()));

  // Kalendarz
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const calDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const calOffset = Array.from({ length: firstDay }, (_, i) => i);

  function postsOnDay(day: number) {
    return posts.filter(p => {
      const d = new Date(p.scheduled_at);
      return d.getFullYear() === calYear && d.getMonth() === calMonth && d.getDate() === day;
    });
  }

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  }

  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  }

  return (
    <div style={{ fontFamily: "var(--font-body)", color: css.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Serif+Display&display=swap');
        *{box-sizing:border-box}
        .sch-btn{transition:opacity .15s,transform .15s;cursor:pointer;font-family:inherit}
        .sch-btn:hover{opacity:.8}
        .sch-btn:active{transform:scale(.97)}
        .sch-card{transition:border-color .15s,transform .15s}
        .sch-card:hover{transform:translateY(-1px)}
        .cal-day{transition:background .15s,border-color .15s;cursor:pointer}
        .cal-day:hover{background:${css.surface}!important}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fade{animation:fadeUp .3s ease forwards}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        .slide{animation:slideIn .25s ease forwards}
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 200, padding: "10px 18px", borderRadius: 10, background: "#052e16", color: "#22c55e", fontSize: 13, border: "1px solid #166534", boxShadow: "0 8px 32px rgba(0,0,0,.4)" }}>
          {toast}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setSelected(null)}>
          <div style={{ background: css.surface, border: `1px solid ${css.border}`, borderRadius: 18, padding: 28, maxWidth: 500, width: "100%" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: PLATFORM_META[selected.platform]?.color + "20", border: `1px solid ${PLATFORM_META[selected.platform]?.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: PLATFORM_META[selected.platform]?.color }}>
                  {PLATFORM_META[selected.platform]?.icon}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: css.text }}>{selected.draft?.title || "Post bez tytułu"}</div>
                  <div style={{ fontSize: 12, color: css.muted }}>{PLATFORM_META[selected.platform]?.label} · {formatDate(selected.scheduled_at)}</div>
                </div>
              </div>
              <button className="sch-btn" onClick={() => setSelected(null)}
                style={{ background: "none", border: "none", color: css.muted, fontSize: 18 }}>✕</button>
            </div>

            {selected.draft?.ai_score && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: css.muted }}>Przewidywany AI Score:</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-heading)", color: selected.draft.ai_score >= 80 ? "#22c55e" : selected.draft.ai_score >= 60 ? "#f59e0b" : "#ef4444" }}>
                  {selected.draft.ai_score}
                </div>
              </div>
            )}

            {selected.draft?.body && (
              <div style={{ padding: "12px 14px", borderRadius: 10, background: css.bg, border: `1px solid ${css.border}`, marginBottom: 16, fontSize: 12, color: css.muted, lineHeight: 1.7, maxHeight: 160, overflowY: "auto", whiteSpace: "pre-wrap" }}>
                {selected.draft.body.slice(0, 400)}{selected.draft.body.length > 400 ? "..." : ""}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: STATUS_META[selected.status].bg, color: STATUS_META[selected.status].color, fontSize: 12, fontWeight: 600, textAlign: "center" }}>
                {STATUS_META[selected.status].label}
              </span>
              {selected.status === "scheduled" && (
                <button className="sch-btn" onClick={() => cancelPost(selected.id)} disabled={cancelling === selected.id}
                  style={{ padding: "8px 16px", borderRadius: 8, background: "#ef444415", border: "1px solid #ef444430", color: "#ef4444", fontSize: 12, fontWeight: 600, opacity: cancelling === selected.id ? 0.6 : 1 }}>
                  {cancelling === selected.id ? "Anulowanie..." : "Anuluj post"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Zaplanowane", value: upcoming.length, color: css.accent },
          { label: "Dziś", value: today.length, color: "#f59e0b" },
          { label: "Opublikowane", value: posts.filter(p => p.status === "published").length, color: "#22c55e" },
        ].map((stat, i) => (
          <div key={i} className="fade" style={{ animationDelay: `${i * 0.05}s`, padding: "16px 18px", borderRadius: 14, background: css.surface, border: `1px solid ${css.border}` }}>
            <div style={{ fontSize: 11, color: css.muted, marginBottom: 6 }}>{stat.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--font-heading)", color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        {/* View toggle */}
        <div style={{ display: "flex", gap: 4, padding: 4, background: css.surface, borderRadius: 10, border: `1px solid ${css.border}` }}>
          {(["list", "calendar"] as const).map(v => (
            <button key={v} className="sch-btn" onClick={() => setView(v)}
              style={{ padding: "7px 16px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: view === v ? 700 : 500, background: view === v ? (dark ? "#fff" : "#0f172a") : "transparent", color: view === v ? (dark ? "#0f172a" : "#fff") : css.muted }}>
              {v === "list" ? "▤ Lista" : "◫ Kalendarz"}
            </button>
          ))}
        </div>

        {/* Filter */}
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "scheduled", "published", "failed"] as const).map(f => (
            <button key={f} className="sch-btn" onClick={() => setFilter(f)}
              style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${filter === f ? css.accent : css.border}`, background: filter === f ? css.accent + "20" : "transparent", color: filter === f ? css.accent : css.muted, fontSize: 11, fontWeight: 600 }}>
              {f === "all" ? "Wszystkie" : STATUS_META[f as Status].label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: css.muted, fontSize: 13 }}>
          Ładowanie harmonogramu...
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, border: `1px dashed ${css.border}`, borderRadius: 16, background: css.surface }}>
          <div style={{ fontSize: 36, opacity: 0.2, marginBottom: 12 }}>◷</div>
          <div style={{ fontSize: 18, fontFamily: "var(--font-heading)", color: css.text, marginBottom: 8 }}>
            Brak zaplanowanych postów
          </div>
          <div style={{ fontSize: 13, color: css.muted, lineHeight: 1.7 }}>
            Wygeneruj treść w Content Studio i kliknij "Zaplanuj" żeby pojawił się tutaj.
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {!loading && view === "list" && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((post, i) => {
            const meta = PLATFORM_META[post.platform];
            const statusMeta = STATUS_META[post.status];
            const isPast = new Date(post.scheduled_at) < new Date() && post.status === "scheduled";

            return (
              <div key={post.id} className="sch-card fade" style={{ animationDelay: `${i * 0.04}s`, padding: "16px 18px", borderRadius: 14, background: css.surface, border: `1px solid ${isPast ? "#f59e0b40" : css.border}`, cursor: "pointer", display: "grid", gridTemplateColumns: "36px 1fr auto", gap: 14, alignItems: "center" }}
                onClick={() => setSelected(post)}>
                {/* Platform icon */}
                <div style={{ width: 36, height: 36, borderRadius: 10, background: meta?.color + "20", border: `1px solid ${meta?.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: meta?.color, flexShrink: 0 }}>
                  {meta?.icon}
                </div>

                {/* Content */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: css.text, marginBottom: 3 }}>
                    {post.draft?.title || "Post bez tytułu"}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: css.muted }}>{formatDate(post.scheduled_at)}</span>
                    {post.draft?.content_type && (
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: css.bg, color: css.muted, border: `1px solid ${css.border}` }}>{post.draft.content_type}</span>
                    )}
                    {isPast && <span style={{ fontSize: 10, color: "#f59e0b" }}>⚠ Minął termin</span>}
                  </div>
                </div>

                {/* Right side */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  {post.draft?.ai_score && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-heading)", color: post.draft.ai_score >= 80 ? "#22c55e" : post.draft.ai_score >= 60 ? "#f59e0b" : "#ef4444" }}>
                        {post.draft.ai_score}
                      </div>
                      <div style={{ fontSize: 9, color: css.muted }}>AI Score</div>
                    </div>
                  )}
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: statusMeta.bg, color: statusMeta.color }}>
                    {statusMeta.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CALENDAR VIEW */}
      {!loading && view === "calendar" && (
        <div style={{ background: css.surface, border: `1px solid ${css.border}`, borderRadius: 16, overflow: "hidden" }}>
          {/* Month nav */}
          <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${css.border}` }}>
            <button className="sch-btn" onClick={prevMonth}
              style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${css.border}`, background: "transparent", color: css.muted, fontSize: 14 }}>←</button>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-heading)", color: css.text }}>
              {MONTHS_PL[calMonth]} {calYear}
            </div>
            <button className="sch-btn" onClick={nextMonth}
              style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${css.border}`, background: "transparent", color: css.muted, fontSize: 14 }}>→</button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${css.border}` }}>
            {DAYS_PL.map(d => (
              <div key={d} style={{ padding: "8px 0", textAlign: "center", fontSize: 10, fontWeight: 700, color: css.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {calOffset.map(i => <div key={`offset-${i}`} style={{ padding: 8, minHeight: 80, borderRight: `1px solid ${css.border}`, borderBottom: `1px solid ${css.border}` }} />)}
            {calDays.map(day => {
              const dayPosts = postsOnDay(day);
              const isToday = isSameDay(new Date(calYear, calMonth, day), new Date());
              return (
                <div key={day} className="cal-day" style={{ padding: 8, minHeight: 80, borderRight: `1px solid ${css.border}`, borderBottom: `1px solid ${css.border}`, background: isToday ? css.accent + "10" : "transparent" }}>
                  <div style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? css.accent : css.muted, marginBottom: 4 }}>{day}</div>
                  {dayPosts.slice(0, 3).map(p => {
                    const meta = PLATFORM_META[p.platform];
                    return (
                      <div key={p.id} onClick={() => setSelected(p)}
                        style={{ padding: "2px 6px", borderRadius: 5, background: meta?.color + "25", color: meta?.color, fontSize: 9, fontWeight: 700, marginBottom: 2, cursor: "pointer", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                        {meta?.icon} {p.draft?.title?.slice(0, 12) || "Post"}
                      </div>
                    );
                  })}
                  {dayPosts.length > 3 && <div style={{ fontSize: 9, color: css.muted }}>+{dayPosts.length - 3} więcej</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
