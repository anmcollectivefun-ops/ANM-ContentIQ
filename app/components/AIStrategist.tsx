"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Wand2, RefreshCw, Download, Calendar, LayoutList, ChevronRight, Sparkles, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ─────────────────────────────────────────────────────────────────

type Platform =
  | "linkedin"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "blog"
  | "spotify";

type ContentKind =
  | "content"
  | "short"
  | "video"
  | "creative"
  | "blog"
  | "podcast";

type StrategyItemStatus = "planned" | "scheduled" | "published" | "done";
type ViewMode = "calendar" | "timeline";

interface StrategyDayItem {
  id?: string;
  db_id?: string;
  week: number;
  date: string;
  time: string;
  platform: Platform;
  content_kind: ContentKind;
  title: string;
  angle: string;
  format: string;
  description: string;
  source_recommendation: string;
  status: StrategyItemStatus;
}

interface AiStrategyResult {
  strategy_name: string;
  period_start: string;
  period_end: string;
  main_goal: string;
  positioning: string;
  ai_summary: string;
  content_pillars: {
    name: string;
    description: string;
    platforms: Platform[];
  }[];
  platform_distribution: {
    platform: Platform;
    posts_per_month: number;
    cadence: string;
    best_days: string[];
    best_hours: string[];
    reasoning: string;
  }[];
  weekly_plan: StrategyDayItem[];
  today_notification: string;
  strategy_alerts: string[];
  assumptions: string[];
  missing_data: string[];
}

interface ContextPack {
  drafts: unknown[];
  templates: unknown[];
  inspirations: unknown[];
  scheduled: unknown[];
  connections: unknown[];
  posts: unknown[];
  accountStats: unknown[];
  previousStrategies: unknown[];
}

// ─── Platform config ────────────────────────────────────────────────────────

const PLATFORMS: {
  id: Platform;
  name: string;
  color: string;
  bg: string;
  short: string;
}[] = [
  { id: "linkedin",  name: "LinkedIn",  color: "#0A66C2", bg: "#0A66C215", short: "LI" },
  { id: "instagram", name: "Instagram", color: "#E1306C", bg: "#E1306C15", short: "IG" },
  { id: "tiktok",    name: "TikTok",    color: "#111111", bg: "#11111112", short: "TT" },
  { id: "youtube",   name: "YouTube",   color: "#FF0033", bg: "#FF003315", short: "YT" },
  { id: "facebook",  name: "Facebook",  color: "#1877F2", bg: "#1877F215", short: "FB" },
  { id: "blog",      name: "Blog",      color: "#22C55E", bg: "#22C55E15", short: "BL" },
  { id: "spotify",   name: "Spotify",   color: "#1DB954", bg: "#1DB95415", short: "SP" },
];

const CONTENT_KINDS: { id: ContentKind; name: string }[] = [
  { id: "content",  name: "Post / content" },
  { id: "short",    name: "Short / rolka" },
  { id: "video",    name: "Video" },
  { id: "creative", name: "Grafika / kreacja" },
  { id: "blog",     name: "Blog" },
  { id: "podcast",  name: "Podcast" },
];

const DAYS_PL = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];

// ─── Helpers ────────────────────────────────────────────────────────────────

function cleanJsonAnswer(answer: string) {
  return answer
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIso() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function addDaysIso(dateIso: string, days: number) {
  const d = new Date(`${dateIso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDatePL(dateIso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString("pl-PL", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    ...opts,
  });
}

function platformInfo(platform: Platform) {
  return PLATFORMS.find((p) => p.id === platform) || PLATFORMS[0];
}

function getWeekDays(weekIndex: number, periodStart: string): string[] {
  // weekIndex 0-based; periodStart = Monday of week 1
  const start = new Date(`${periodStart}T00:00:00`);
  // Align to Monday
  const dow = start.getDay(); // 0=Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  start.setDate(start.getDate() + mondayOffset + weekIndex * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

function parseStrategy(raw: unknown, fallbackStart: string): AiStrategyResult {
  const v = raw as Partial<AiStrategyResult>;
  const start = v.period_start || fallbackStart;
  const end = v.period_end || addDaysIso(start, 27);
  return {
    strategy_name: v.strategy_name || "Strategia contentu AI",
    period_start: start,
    period_end: end,
    main_goal: v.main_goal || "",
    positioning: v.positioning || "",
    ai_summary: v.ai_summary || "",
    content_pillars: safeArray(v.content_pillars).map((p) => ({
      name: p.name || "Filar contentu",
      description: p.description || "",
      platforms: safeArray(p.platforms),
    })),
    platform_distribution: safeArray(v.platform_distribution).map((r) => ({
      platform: r.platform || "linkedin",
      posts_per_month: Number(r.posts_per_month || 0),
      cadence: r.cadence || "",
      best_days: safeArray(r.best_days),
      best_hours: safeArray(r.best_hours),
      reasoning: r.reasoning || "",
    })),
    weekly_plan: safeArray(v.weekly_plan).map((item, i) => ({
      id: item.id || `ai-${i}`,
      week: Number(item.week || Math.floor(i / 7) + 1),
      date: item.date || addDaysIso(start, i),
      time: item.time || "10:00",
      platform: item.platform || "linkedin",
      content_kind: item.content_kind || "content",
      title: item.title || "Pomysł contentowy",
      angle: item.angle || "",
      format: item.format || "",
      description: item.description || "",
      source_recommendation: item.source_recommendation || "",
      status: item.status || "planned",
    })),
    today_notification: v.today_notification || "",
    strategy_alerts: safeArray(v.strategy_alerts),
    assumptions: safeArray(v.assumptions),
    missing_data: safeArray(v.missing_data),
  };
}

function parseSavedStrategy(strategyRow: any, itemRows: any[]): AiStrategyResult {
  const ctx = strategyRow?.source_context || {};
  return {
    strategy_name: strategyRow?.title || "Strategia contentu AI",
    period_start: strategyRow?.period_start || monthStartIso(),
    period_end: strategyRow?.period_end || addDaysIso(strategyRow?.period_start || monthStartIso(), 27),
    main_goal: strategyRow?.main_goal || "",
    positioning: strategyRow?.positioning || "",
    ai_summary: strategyRow?.ai_summary || "",
    content_pillars: [],
    platform_distribution: [],
    weekly_plan: itemRows.map((item: any, i: number) => ({
      id: item.id || `saved-${i}`,
      db_id: item.id,
      week: Number(item.week || Math.floor(i / 7) + 1),
      date: item.publish_date || addDaysIso(strategyRow?.period_start || monthStartIso(), i),
      time: item.publish_time ? String(item.publish_time).slice(0, 5) : "10:00",
      platform: item.platform || "linkedin",
      content_kind: item.content_kind || "content",
      title: item.title || "Pozycja strategii",
      angle: item.angle || "",
      format: item.format || "",
      description: item.description || "",
      source_recommendation: item.source_recommendation || "",
      status: item.status || "planned",
    })),
    today_notification: "",
    strategy_alerts: [],
    assumptions: Array.isArray(ctx.assumptions) ? ctx.assumptions : [],
    missing_data: Array.isArray(ctx.missing_data) ? ctx.missing_data : [],
  };
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildStrategyPrompt({
  userBrief,
  periodStart,
  selectedPlatforms,
  contextPack,
}: {
  userBrief: string;
  periodStart: string;
  selectedPlatforms: Platform[];
  contextPack: ContextPack;
}) {
  const periodEnd = addDaysIso(periodStart, 27);
  return `
Jesteś AI Strategiem ContentIQ. Twoje zadanie to stworzyć realną strategię contentu na 4 tygodnie dla konkretnego użytkownika, a nie ogólnikowy plan z internetu.

BARDZO WAŻNE:
- strategia ma być oparta na danych użytkownika, szablonach, inspiracjach, planowanych publikacjach, połączonych platformach i opisie użytkownika,
- nie wymyślaj wyników sprzedażowych ani statystyk, jeśli ich nie ma w danych,
- jeśli brakuje danych, wpisz to w "missing_data",
- jeśli robisz założenie, wpisz je w "assumptions",
- plan ma być jasny: data, godzina, platforma, rodzaj contentu, tytuł, kąt, format, opis,
- strategia ma sterować aplikacją: ma dawać powiadomienia typu "dziś masz short na TikTok i YouTube",
- plan ma być realny miesięczny, podzielony na tygodnie,
- dobieraj częstotliwość do materiałów użytkownika i platform, nie rób losowego contentu.

OKRES: ${periodStart} - ${periodEnd}
PLATFORMY: ${selectedPlatforms.join(", ")}
OPIS UŻYTKOWNIKA / MARKI / MATERIAŁÓW:
${userBrief}

DANE Z APLIKACJI CONTENTIQ:
${JSON.stringify(contextPack, null, 2)}

Zwróć wyłącznie JSON bez markdown:

{
  "strategy_name": "nazwa strategii",
  "period_start": "${periodStart}",
  "period_end": "${periodEnd}",
  "main_goal": "główny cel strategii",
  "positioning": "pozycjonowanie marki na ten okres",
  "ai_summary": "krótkie podsumowanie strategii",
  "content_pillars": [
    { "name": "filar", "description": "opis filaru", "platforms": ["linkedin"] }
  ],
  "platform_distribution": [
    {
      "platform": "linkedin",
      "posts_per_month": 8,
      "cadence": "2 razy w tygodniu",
      "best_days": ["wtorek", "czwartek"],
      "best_hours": ["09:00", "12:00"],
      "reasoning": "dlaczego tak"
    }
  ],
  "weekly_plan": [
    {
      "week": 1,
      "date": "YYYY-MM-DD",
      "time": "09:00",
      "platform": "linkedin",
      "content_kind": "content",
      "title": "tytuł publikacji",
      "angle": "kąt komunikacji",
      "format": "format",
      "description": "co dokładnie opublikować",
      "source_recommendation": "na czym AI oparło tę sugestię",
      "status": "planned"
    }
  ],
  "today_notification": "komunikat na dziś",
  "strategy_alerts": ["ważna sugestia strategiczna"],
  "assumptions": ["założenie, jeśli brakuje danych"],
  "missing_data": ["jakich danych brakuje do większej pewności"]
}

Utwórz plan na minimum 20 pozycji i maksimum 40 pozycji na 4 tygodnie.
  `.trim();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status, dark }: { status: StrategyItemStatus; dark: boolean }) {
  const map: Record<StrategyItemStatus, { label: string; color: string; bg: string }> = {
    planned:   { label: "Planned",   color: dark ? "#9ca3af" : "#6b7280", bg: dark ? "#ffffff10" : "#f3f4f6" },
    scheduled: { label: "Scheduled", color: "#3b82f6",                    bg: "#3b82f615" },
    published: { label: "Published", color: "#22c55e",                    bg: "#22c55e15" },
    done:      { label: "Done",      color: "#a855f7",                    bg: "#a855f715" },
  };
  const s = map[status] || map.planned;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: 99,
        color: s.color,
        background: s.bg,
        border: `0.5px solid ${s.color}40`,
        whiteSpace: "nowrap",
        letterSpacing: ".03em",
      }}
    >
      {s.label}
    </span>
  );
}

function PlatformBadge({ platform, dark }: { platform: Platform; dark?: boolean }) {
  const p = platformInfo(platform);
  const isDark = dark ?? false;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: 5,
        color: p.id === "tiktok" ? (isDark ? "#e5e7eb" : "#374151") : p.color,
        background: p.id === "tiktok" ? (isDark ? "#ffffff12" : "#11111110") : p.bg,
        border: p.id === "tiktok" ? `0.5px solid ${isDark ? "#ffffff20" : "#00000020"}` : "none",
        letterSpacing: ".03em",
        whiteSpace: "nowrap",
      }}
    >
      {p.name}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AIStrategist({
  dark = true,
  workspaceId = "contentiq",
}: {
  dark?: boolean;
  workspaceId?: string;
}) {
  const supabase = createClient();

  // ── Theme ────────────────────────────────────────────────────────────────
  const css = dark
    ? {
        bg: "#0d0d0f",
        surface: "#141416",
        surfaceSoft: "#1a1a1e",
        surfaceHover: "#202026",
        text: "#f0f0f0",
        muted: "#9ca3af",
        faint: "#4b5563",
        border: "rgba(255,255,255,0.08)",
        borderMed: "rgba(255,255,255,0.13)",
        accent: "#8b5cf6",
        accentBg: "rgba(139,92,246,0.12)",
        accentBorder: "rgba(139,92,246,0.35)",
        accentText: "#c4b5fd",
        alertBg: "rgba(59,130,246,0.10)",
        alertBorder: "rgba(59,130,246,0.25)",
        alertText: "#93c5fd",
        ok: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
        todayBorder: "#3b82f6",
      }
    : {
        bg: "#fafafa",
        surface: "#ffffff",
        surfaceSoft: "#f5f5f7",
        surfaceHover: "#efefef",
        text: "#111111",
        muted: "#6b7280",
        faint: "#d1d5db",
        border: "rgba(0,0,0,0.08)",
        borderMed: "rgba(0,0,0,0.13)",
        accent: "#7c3aed",
        accentBg: "rgba(124,58,237,0.08)",
        accentBorder: "rgba(124,58,237,0.28)",
        accentText: "#6d28d9",
        alertBg: "rgba(59,130,246,0.07)",
        alertBorder: "rgba(59,130,246,0.22)",
        alertText: "#1d4ed8",
        ok: "#16a34a",
        warning: "#d97706",
        danger: "#dc2626",
        todayBorder: "#3b82f6",
      };

  // ── State ────────────────────────────────────────────────────────────────
  const [workspaceUuid, setWorkspaceUuid] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([
    "linkedin", "instagram", "tiktok", "youtube", "facebook",
  ]);
  const [periodStart, setPeriodStart] = useState(monthStartIso());
  const [userBrief, setUserBrief] = useState("");
  const [contextPack, setContextPack] = useState<ContextPack>({
    drafts: [], templates: [], inspirations: [], scheduled: [],
    connections: [], posts: [], accountStats: [], previousStrategies: [],
  });
  const [strategy, setStrategy] = useState<AiStrategyResult | null>(null);
  const [savedStrategyId, setSavedStrategyId] = useState<string | null>(null);

  const [loadingSavedStrategy, setLoadingSavedStrategy] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contextLoaded, setContextLoaded] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [activeWeek, setActiveWeek] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [showBriefPanel, setShowBriefPanel] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);

  // ── Derived data ──────────────────────────────────────────────────────────
  const todayIsoVal = todayIso();

  const todaysItems = useMemo(() => {
    if (!strategy) return [];
    return strategy.weekly_plan.filter((item) => item.date === todayIsoVal);
  }, [strategy, todayIsoVal]);

  const weekDays = useMemo(
    () => getWeekDays(activeWeek - 1, periodStart),
    [activeWeek, periodStart]
  );

  const itemsByDate = useMemo(() => {
    if (!strategy) return {} as Record<string, StrategyDayItem[]>;
    const map: Record<string, StrategyDayItem[]> = {};
    for (const item of strategy.weekly_plan) {
      if (!map[item.date]) map[item.date] = [];
      map[item.date].push(item);
    }
    return map;
  }, [strategy]);

  const currentWeekItems = useMemo(() => {
    if (!strategy) return [];
    return strategy.weekly_plan
      .filter((item) => item.week === activeWeek)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [strategy, activeWeek]);

  const totalPosts = strategy?.weekly_plan.length ?? 0;
  const scheduledCount = strategy?.weekly_plan.filter((i) => i.status === "scheduled").length ?? 0;
  const activePlatformsCount = strategy
    ? new Set(strategy.weekly_plan.map((i) => i.platform)).size
    : 0;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  }

  function togglePlatform(platform: Platform) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.length === 1 ? prev : prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  }

  function updatePlanItem(index: number, patch: Partial<StrategyDayItem>) {
    setStrategy((cur) => {
      if (!cur) return cur;
      const next = [...cur.weekly_plan];
      next[index] = { ...next[index], ...patch };
      return { ...cur, weekly_plan: next };
    });
  }

  function globalIndexOf(item: StrategyDayItem) {
    if (!strategy) return -1;
    return strategy.weekly_plan.findIndex(
      (r) => r.id === item.id || (r.date === item.date && r.time === item.time && r.platform === item.platform && r.title === item.title)
    );
  }

  // ── Auth / workspace ──────────────────────────────────────────────────────
  async function getCurrentUserId() {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) throw new Error(authError.message);
    if (!auth.user) throw new Error("Brak aktywnej sesji.");
    return auth.user.id;
  }

  async function getOrCreateWorkspaceUuid() {
    const { data: existing, error: existingError } = await supabase
      .schema("contentiq")
      .from("workspaces")
      .select("id")
      .eq("slug", workspaceId)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing?.id) { setWorkspaceUuid(existing.id as string); return existing.id as string; }
    const userId = await getCurrentUserId();
    const { data: created, error } = await supabase
      .schema("contentiq")
      .from("workspaces")
      .insert({ user_id: userId, name: "ANM ContentIQ", type: "Content", slug: workspaceId })
      .select("id")
      .single();
    if (error || !created?.id) throw new Error(error?.message || "Nie udało się utworzyć workspace.");
    setWorkspaceUuid(created.id as string);
    return created.id as string;
  }

  async function safeQuery<T>(label: string, query: PromiseLike<{ data: T[] | null; error: unknown }>) {
    try {
      const { data, error } = await query;
      if (error) { console.warn(`AI Strategist: ${label} skipped`, error); return []; }
      return data || [];
    } catch (err) {
      console.warn(`AI Strategist: ${label} failed`, err);
      return [];
    }
  }

  // ── Load saved strategy ───────────────────────────────────────────────────
  async function loadSavedStrategy(wsId?: string) {
    setLoadingSavedStrategy(true);
    try {
      const resolvedWsId = wsId || (await getOrCreateWorkspaceUuid());
      const { data: stratRow, error: stratError } = await supabase
        .schema("contentiq")
        .from("content_strategies")
        .select("id,title,period_start,period_end,main_goal,positioning,ai_summary,source_context,status,updated_at,created_at")
        .eq("workspace_id", resolvedWsId)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (stratError) throw new Error(stratError.message);
      if (!stratRow?.id) { setSavedStrategyId(null); return; }
      const { data: items, error: itemsError } = await supabase
        .schema("contentiq")
        .from("content_strategy_items")
        .select("id,week,publish_date,publish_time,platform,content_kind,title,angle,format,description,source_recommendation,status,updated_at,created_at")
        .eq("strategy_id", stratRow.id)
        .order("publish_date", { ascending: true })
        .order("publish_time", { ascending: true });
      if (itemsError) throw new Error(itemsError.message);
      setSavedStrategyId(stratRow.id as string);
      setStrategy(parseSavedStrategy(stratRow, (items as any[]) || []));
      setPeriodStart((stratRow.period_start as string) || monthStartIso());
      showToast("Wczytano aktywną strategię");
    } catch (err) {
      console.warn("AI Strategist: saved strategy load skipped", err);
    } finally {
      setLoadingSavedStrategy(false);
    }
  }

  useEffect(() => { void loadSavedStrategy(); }, [workspaceId]);

  // ── Load context ──────────────────────────────────────────────────────────
  async function loadContext() {
    setLoadingContext(true);
    setError("");
    try {
      const wsId = await getOrCreateWorkspaceUuid();
      const drafts = await safeQuery("drafts",
        supabase.schema("contentiq").from("content_drafts")
          .select("id,title,body,topic,content_type,target_platforms,ai_score,ai_feedback,status,created_at")
          .eq("workspace_id", wsId).order("created_at", { ascending: false }).limit(80));
      const templates = (drafts as any[]).filter((i) => i.status === "template");
      const activeDrafts = (drafts as any[]).filter((i) => i.status !== "template");
      const inspirations = await safeQuery("inspirations",
        supabase.schema("contentiq").from("inspirations")
          .select("id,title,description,body,platforms,hashtags,ai_score,ai_feedback,source_kind,source_studio,status,created_at")
          .eq("workspace_id", wsId).eq("status", "active").order("created_at", { ascending: false }).limit(80));
      const scheduled = await safeQuery("scheduled_posts",
        supabase.schema("contentiq").from("scheduled_posts")
          .select("id,platform,scheduled_at,status,draft_id,created_at")
          .order("scheduled_at", { ascending: false }).limit(80));
      const connections = await safeQuery("connections",
        supabase.schema("contentiq").from("platform_connections")
          .select("id,platform,connected,account_name,created_at").eq("workspace_id", wsId));
      const posts = await safeQuery("posts",
        supabase.schema("contentiq").from("posts")
          .select("id,connection_id,platform_post_id,title,content,post_type,url,published_at,reach,impressions,likes,comments,shares,saves,clicks,ai_score,ai_summary,fetched_at")
          .order("published_at", { ascending: false }).limit(120));
      const accountStats = await safeQuery("account_stats",
        supabase.schema("contentiq").from("account_stats")
          .select("id,connection_id,followers,following,total_posts,avg_reach,avg_engagement,ai_score,recorded_at")
          .order("recorded_at", { ascending: false }).limit(80));
      const previousStrategies = await safeQuery("content_strategies",
        supabase.schema("contentiq").from("content_strategies")
          .select("id,title,period_start,period_end,main_goal,positioning,ai_summary,status,created_at,updated_at")
          .eq("workspace_id", wsId).order("updated_at", { ascending: false }).limit(8));
      const pack: ContextPack = {
        drafts: activeDrafts.slice(0, 60),
        templates: templates.slice(0, 60),
        inspirations: (inspirations as any[]).slice(0, 60),
        scheduled: (scheduled as any[]).slice(0, 60),
        connections: (connections as any[]).slice(0, 20),
        posts: (posts as any[]).slice(0, 120),
        accountStats: (accountStats as any[]).slice(0, 80),
        previousStrategies: (previousStrategies as any[]).slice(0, 8),
      };
      setContextPack(pack);
      setContextLoaded(true);
      showToast("Dane pobrane pomyślnie");
      return pack;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoadingContext(false);
    }
  }

  // ── Generate ──────────────────────────────────────────────────────────────
  async function generateStrategy() {
    setGenerating(true);
    setError("");
    try {
      const pack = contextLoaded ? contextPack : await loadContext();
      const prompt = buildStrategyPrompt({ userBrief, periodStart, selectedPlatforms, contextPack: pack });
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "strategy",
          prompt,
          historicalData: { periodStart, periodEnd: addDaysIso(periodStart, 27), selectedPlatforms, contextPack: pack },
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Błąd generowania strategii AI.");
      const parsed = json.data || JSON.parse(cleanJsonAnswer(json.answer || "{}"));
      setStrategy(parseStrategy(parsed, periodStart));
      setSavedStrategyId(null);
      setShowBriefPanel(false);
      showToast("Strategia AI wygenerowana");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI nie zwróciło poprawnej strategii.");
    } finally {
      setGenerating(false);
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function saveStrategy() {
    if (!strategy) return;
    setSaving(true);
    setError("");
    try {
      const wsId = await getOrCreateWorkspaceUuid();
      const payload = {
        workspace_id: wsId,
        title: strategy.strategy_name,
        period_start: strategy.period_start,
        period_end: strategy.period_end,
        main_goal: strategy.main_goal,
        positioning: strategy.positioning,
        ai_summary: strategy.ai_summary,
        source_context: { userBrief, selectedPlatforms, contextPack, assumptions: strategy.assumptions, missing_data: strategy.missing_data },
        status: "active",
        updated_at: new Date().toISOString(),
      };
      const strategySave = savedStrategyId
        ? await supabase.schema("contentiq").from("content_strategies").update(payload).eq("id", savedStrategyId).select("id").single()
        : await supabase.schema("contentiq").from("content_strategies").insert(payload).select("id").single();
      if (strategySave.error || !strategySave.data?.id) throw new Error(strategySave.error?.message || "Nie udało się zapisać strategii.");
      const strategyId = strategySave.data.id as string;
      if (savedStrategyId) {
        const { error: del } = await supabase.schema("contentiq").from("content_strategy_items").delete().eq("strategy_id", strategyId);
        if (del) throw new Error(del.message);
      }
      const { error: itemsErr } = await supabase.schema("contentiq").from("content_strategy_items").insert(
        strategy.weekly_plan.map((item) => ({
          strategy_id: strategyId,
          workspace_id: wsId,
          week: item.week,
          publish_date: item.date,
          publish_time: item.time,
          platform: item.platform,
          content_kind: item.content_kind,
          title: item.title,
          angle: item.angle,
          format: item.format,
          description: item.description,
          source_recommendation: item.source_recommendation,
          status: item.status || "planned",
          updated_at: new Date().toISOString(),
        }))
      );
      if (itemsErr) throw new Error(itemsErr.message);
      setSavedStrategyId(strategyId);
      await loadSavedStrategy(wsId);
      showToast("Strategia zapisana");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  // ── Schedule item ─────────────────────────────────────────────────────────
  async function addItemToSchedule(item: StrategyDayItem, index: number) {
    setError("");
    try {
      const wsId = await getOrCreateWorkspaceUuid();
      const body = [
        item.angle ? `Kąt: ${item.angle}` : "",
        item.format ? `Format: ${item.format}` : "",
        item.description,
        item.source_recommendation ? `Źródło: ${item.source_recommendation}` : "",
      ].filter(Boolean).join("\n\n");
      const { data: draft, error: draftErr } = await supabase.schema("contentiq").from("content_drafts").insert({
        workspace_id: wsId,
        title: item.title,
        body,
        topic: item.title,
        content_type: `AI Strategy / ${item.content_kind}`,
        target_platforms: [item.platform],
        ai_feedback: strategy?.ai_summary || "",
        status: "scheduled",
      }).select("id").single();
      if (draftErr || !draft?.id) throw new Error(draftErr?.message || "Nie udało się utworzyć draftu.");
      const { data: conn, error: connErr } = await supabase.schema("contentiq").from("platform_connections")
        .select("id").eq("workspace_id", wsId).eq("platform", item.platform).eq("connected", true).limit(1).maybeSingle();
      if (connErr) throw new Error(connErr.message);
      if (!conn?.id) throw new Error(`Brak podłączonego konta dla ${item.platform}.`);
      const { error: schedErr } = await supabase.schema("contentiq").from("scheduled_posts").insert({
        draft_id: draft.id,
        connection_id: conn.id,
        platform: item.platform,
        scheduled_at: new Date(`${item.date}T${item.time}:00`).toISOString(),
        status: "scheduled",
      });
      if (schedErr) throw new Error(schedErr.message);
      if (item.db_id) {
        await supabase.schema("contentiq").from("content_strategy_items")
          .update({ status: "scheduled", updated_at: new Date().toISOString() }).eq("id", item.db_id);
      }
      updatePlanItem(index, { status: "scheduled" });
      showToast("✓ Dodano do harmonogramu");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const inputSt: CSSProperties = {
    width: "100%",
    borderRadius: 10,
    border: `0.5px solid ${css.borderMed}`,
    background: css.surfaceSoft,
    color: css.text,
    padding: "9px 11px",
    outline: "none",
    fontFamily: "inherit",
    fontSize: 13,
    lineHeight: 1.5,
  };

  const btnPrimary: CSSProperties = {
    border: "none",
    borderRadius: 10,
    padding: "10px 18px",
    background: dark ? "#ffffff" : "#111111",
    color: dark ? "#050505" : "#ffffff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
  };

  const btnGhost: CSSProperties = {
    border: `0.5px solid ${css.borderMed}`,
    borderRadius: 10,
    padding: "9px 16px",
    background: "transparent",
    color: css.muted,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
  };

  const cardSt: CSSProperties = {
    background: css.surface,
    border: `0.5px solid ${css.border}`,
    borderRadius: 14,
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "var(--font-body)", color: css.text, position: "relative" }}>

      {/* ── Global styles ── */}
      <style>{`
        .ais-input:focus { border-color: ${css.accentBorder} !important; }
        .ais-card-hover:hover { background: ${css.surfaceHover} !important; }
        .ais-pill-btn { transition: all .14s; }
        .ais-pill-btn:hover { opacity: .8; }
        .ais-post-row { transition: background .12s; }
        .ais-post-row:hover { background: ${css.surfaceHover} !important; cursor: pointer; }
        .ais-week-tab { transition: all .14s; }
        .ais-brief-panel { animation: ais-slide-in .2s ease; }
        @keyframes ais-slide-in { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:none } }
        @keyframes ais-pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 999,
          padding: "10px 18px", borderRadius: 12, background: "#052e16",
          color: "#22c55e", border: "1px solid #166534",
          fontSize: 13, fontWeight: 700, boxShadow: "0 16px 40px rgba(0,0,0,.4)",
        }}>
          {toast}
        </div>
      )}

      {/* ═══════════════════════════════════════
          TOP BAR
      ═══════════════════════════════════════ */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        gap: 16, marginBottom: 20, flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: css.accentText, marginBottom: 6 }}>
            AI Strateg
          </div>
          <h2 style={{ margin: 0, fontSize: 28, fontWeight: 400, lineHeight: 1.1, fontFamily: "var(--font-heading)", color: css.text }}>
            {strategy ? strategy.strategy_name : "Centrum dowodzenia strategią contentu"}
          </h2>
          {strategy && (
            <p style={{ margin: "5px 0 0", fontSize: 13, color: css.muted, lineHeight: 1.6 }}>
              {formatDatePL(strategy.period_start, { weekday: undefined })} – {formatDatePL(strategy.period_end, { weekday: undefined })}
              {" · "}
              {strategy.main_goal}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {strategy && (
            <>
              <button
                style={{
                  ...btnGhost,
                  color: css.accentText,
                  borderColor: css.accentBorder,
                  background: css.accentBg,
                }}
                onClick={saveStrategy}
                disabled={saving}
              >
                {saving ? "Zapisuję..." : "Zapisz strategię"}
              </button>
            </>
          )}
          <button
            style={{ ...btnGhost }}
            onClick={() => setShowBriefPanel((v) => !v)}
          >
            <RefreshCw size={14} />
            {strategy ? "Nowa strategia" : "Utwórz strategię AI"}
          </button>
          {strategy && (
            <button style={btnPrimary} onClick={saveStrategy} disabled={saving}>
              <Download size={14} />
              Eksportuj
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════
          BRIEF PANEL (collapsible)
      ═══════════════════════════════════════ */}
      {showBriefPanel && (
        <div className="ais-brief-panel" style={{
          ...cardSt,
          padding: 20,
          marginBottom: 20,
          border: `0.5px solid ${css.accentBorder}`,
          background: css.accentBg,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: css.accentText, display: "flex", alignItems: "center", gap: 6 }}>
              <Wand2 size={15} />
              Konfiguracja strategii AI
            </div>
            <button style={{ ...btnGhost, padding: "6px 12px", fontSize: 12 }} onClick={() => setShowBriefPanel(false)}>
              Zamknij
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <label style={{ display: "grid", gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: css.muted, textTransform: "uppercase", letterSpacing: ".07em" }}>Start strategii</span>
              <input
                className="ais-input"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                style={inputSt}
              />
            </label>
            <label style={{ display: "grid", gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: css.muted, textTransform: "uppercase", letterSpacing: ".07em" }}>Koniec</span>
              <input
                className="ais-input"
                type="date"
                value={addDaysIso(periodStart, 27)}
                readOnly
                style={{ ...inputSt, opacity: .5 }}
              />
            </label>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: css.muted, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>
              Platformy w strategii
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PLATFORMS.map((p) => {
                const active = selectedPlatforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    className="ais-pill-btn"
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    style={{
                      borderRadius: 8,
                      border: `0.5px solid ${active ? p.color : css.borderMed}`,
                      background: active ? `${p.color}18` : css.surfaceSoft,
                      color: active ? (p.id === "tiktok" ? (dark ? "#e5e7eb" : "#374151") : p.color) : css.muted,
                      padding: "7px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          <label style={{ display: "grid", gap: 5, marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: css.muted, textTransform: "uppercase", letterSpacing: ".07em" }}>
              Opis marki, contentu i materiałów
            </span>
            <textarea
              className="ais-input"
              value={userBrief}
              onChange={(e) => setUserBrief(e.target.value)}
              placeholder="Opisz ofertę, grupę docelową, co już publikujesz, jakie masz materiały, cele na miesiąc..."
              style={{ ...inputSt, minHeight: 120, resize: "vertical", lineHeight: 1.65 }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              type="button"
              onClick={loadContext}
              disabled={loadingContext}
              style={{ ...btnGhost, justifyContent: "center", opacity: loadingContext ? .6 : 1, cursor: loadingContext ? "not-allowed" : "pointer" }}
            >
              {loadingContext ? "Pobieram dane..." : "Pobierz dane z aplikacji"}
            </button>
            <button
              type="button"
              onClick={generateStrategy}
              disabled={generating || selectedPlatforms.length === 0}
              style={{ ...btnPrimary, justifyContent: "center", opacity: generating ? .6 : 1, cursor: generating ? "not-allowed" : "pointer" }}
            >
              <Wand2 size={14} />
              {generating ? "AI tworzy strategię..." : "Wygeneruj strategię AI"}
            </button>
          </div>

          {contextLoaded && (
            <div style={{ marginTop: 10, fontSize: 12, color: css.muted, padding: "8px 12px", background: css.surfaceSoft, borderRadius: 8 }}>
              Dane: {contextPack.drafts.length} draftów · {contextPack.templates.length} szablonów · {contextPack.inspirations.length} inspiracji · {contextPack.scheduled.length} zaplanowanych
            </div>
          )}
          {error && (
            <div style={{ marginTop: 10, background: "#ef444414", border: "1px solid #ef444440", color: "#ef4444", borderRadius: 10, padding: 12, fontSize: 12 }}>
              {error}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════
          EMPTY STATE
      ═══════════════════════════════════════ */}
      {!strategy && !loadingSavedStrategy && (
        <div style={{
          ...cardSt,
          padding: 48,
          textAlign: "center",
          border: `0.5px dashed ${css.accentBorder}`,
        }}>
          <Wand2 size={48} color={css.accentText} style={{ opacity: .3, marginBottom: 14 }} />
          <h3 style={{ margin: "0 0 8px", fontSize: 22, fontFamily: "var(--font-heading)", fontWeight: 400, color: css.text }}>
            Brak aktywnej strategii
          </h3>
          <p style={{ margin: "0 0 20px", color: css.muted, fontSize: 14, lineHeight: 1.7, maxWidth: 420, marginInline: "auto" }}>
            AI przejrzy Twoje drafty, inspiracje i harmonogram, a potem ułoży miesięczny rozkład jazdy na wszystkich platformach.
          </p>
          <button style={btnPrimary} onClick={() => setShowBriefPanel(true)}>
            <Wand2 size={14} />
            Utwórz strategię AI
          </button>
        </div>
      )}

      {loadingSavedStrategy && (
        <div style={{ textAlign: "center", padding: 60, color: css.muted, fontSize: 13 }}>
          <div style={{ animation: "ais-pulse 1.4s ease-in-out infinite" }}>Wczytywanie strategii...</div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          STRATEGY CONTENT
      ═══════════════════════════════════════ */}
      {strategy && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── AI Today Alert ── */}
          {(strategy.today_notification || todaysItems.length > 0 || strategy.strategy_alerts.length > 0) && (
            <div style={{
              ...cardSt,
              padding: 16,
              border: `0.5px solid ${css.alertBorder}`,
              background: css.alertBg,
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}>
              <Sparkles size={16} color={css.alertText} style={{ marginTop: 1, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: css.alertText, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>
                  Dziś · {formatDatePL(todayIsoVal)}
                </div>
                <p style={{ margin: 0, fontSize: 13, color: css.text, lineHeight: 1.65 }}>
                  {strategy.today_notification ||
                    (todaysItems.length > 0
                      ? `Dziś masz ${todaysItems.length} ${todaysItems.length === 1 ? "publikację" : "publikacje"} w strategii: ${todaysItems.map((i) => `${platformInfo(i.platform).name} o ${i.time}`).join(", ")}.`
                      : "Dziś strategia nie przewiduje publikacji.")}
                </p>
                {strategy.strategy_alerts.length > 0 && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                    {strategy.strategy_alerts.map((alert, i) => (
                      <div key={i} style={{ fontSize: 12, color: css.muted, display: "flex", alignItems: "flex-start", gap: 6 }}>
                        <AlertCircle size={12} style={{ marginTop: 1, flexShrink: 0, color: css.warning }} />
                        {alert}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Stats row ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {[
              { num: totalPosts, label: "Postów w planie" },
              { num: activePlatformsCount, label: "Platform aktywnych" },
              { num: strategy.content_pillars.length || 3, label: "Filary contentu" },
              { num: scheduledCount, label: "W harmonogramie" },
            ].map(({ num, label }) => (
              <div key={label} style={{ ...cardSt, padding: "14px 16px" }}>
                <div style={{ fontSize: 26, fontWeight: 500, color: css.text, lineHeight: 1 }}>{num}</div>
                <div style={{ fontSize: 11, color: css.muted, marginTop: 5, textTransform: "uppercase", letterSpacing: ".07em", fontWeight: 600 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* ── Content pillars ── */}
          {strategy.content_pillars.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
              {strategy.content_pillars.map((pillar, i) => (
                <div key={i} style={{ ...cardSt, padding: "14px 16px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: css.text, marginBottom: 5 }}>{pillar.name}</div>
                  <div style={{ fontSize: 12, color: css.muted, lineHeight: 1.6, marginBottom: 10 }}>{pillar.description}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {pillar.platforms.map((pl) => (
                      <PlatformBadge key={pl} platform={pl} dark={dark} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── View toggle + week tabs ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 10,
          }}>
            <div style={{ display: "flex", gap: 3, background: css.surfaceSoft, borderRadius: 10, padding: 3 }}>
              {(["calendar", "timeline"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  className="ais-week-tab"
                  onClick={() => setViewMode(mode)}
                  style={{
                    borderRadius: 8,
                    border: "none",
                    padding: "7px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    background: viewMode === mode ? css.surface : "transparent",
                    color: viewMode === mode ? css.text : css.muted,
                    boxShadow: viewMode === mode ? `0 0 0 0.5px ${css.borderMed}` : "none",
                  }}
                >
                  {mode === "calendar" ? <><Calendar size={13} />Kalendarz</> : <><LayoutList size={13} />Timeline</>}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4].map((w) => (
                <button
                  key={w}
                  className="ais-week-tab"
                  onClick={() => setActiveWeek(w)}
                  style={{
                    borderRadius: 8,
                    border: `0.5px solid ${activeWeek === w ? css.accentBorder : css.borderMed}`,
                    padding: "7px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: activeWeek === w ? css.accentBg : "transparent",
                    color: activeWeek === w ? css.accentText : css.muted,
                  }}
                >
                  Tydzień {w}
                </button>
              ))}
            </div>
          </div>

          {/* ════════════════════════════
              CALENDAR VIEW
          ════════════════════════════ */}
          {viewMode === "calendar" && (
            <div style={{ ...cardSt, padding: 16, overflowX: "auto" }}>
              {/* Day headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
                {DAYS_PL.map((d) => (
                  <div key={d} style={{
                    textAlign: "center", fontSize: 10, fontWeight: 700, color: css.muted,
                    textTransform: "uppercase", letterSpacing: ".08em", padding: "4px 0 8px",
                  }}>{d}</div>
                ))}
              </div>
              {/* Day cells */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
                {weekDays.map((dateStr, dayIdx) => {
                  const isWeekend = dayIdx >= 5;
                  const isToday = dateStr === todayIsoVal;
                  const dayItems = itemsByDate[dateStr] || [];
                  const dayNum = new Date(`${dateStr}T00:00:00`).getDate();
                  return (
                    <div
                      key={dateStr}
                      style={{
                        minHeight: 100,
                        borderRadius: 10,
                        border: isToday
                          ? `1.5px solid ${css.todayBorder}`
                          : `0.5px solid ${css.border}`,
                        background: isWeekend ? css.surfaceSoft : css.surface,
                        padding: 8,
                        transition: "all .12s",
                      }}
                    >
                      <div style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: isToday ? css.todayBorder : css.muted,
                        marginBottom: 6,
                      }}>{dayNum}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {dayItems.slice(0, 3).map((item, ii) => {
                          const p = platformInfo(item.platform);
                          return (
                            <div
                              key={ii}
                              className="ais-post-row"
                              onClick={() => setExpandedPost(expandedPost === item.id ? null : item.id ?? null)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                borderRadius: 5,
                                padding: "3px 6px",
                                background: `${p.color}14`,
                                cursor: "pointer",
                              }}
                            >
                              <div style={{ width: 5, height: 5, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                              <div style={{ fontSize: 10, fontWeight: 600, color: p.id === "tiktok" ? (dark ? "#9ca3af" : "#6b7280") : p.color, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {p.short} · {item.time}
                              </div>
                            </div>
                          );
                        })}
                        {dayItems.length > 3 && (
                          <div style={{ fontSize: 10, color: css.muted, padding: "2px 6px" }}>+{dayItems.length - 3} więcej</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ════════════════════════════
              TIMELINE VIEW (full detail)
          ════════════════════════════ */}
          {viewMode === "timeline" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {currentWeekItems.length === 0 && (
                <div style={{ ...cardSt, padding: 24, textAlign: "center", color: css.muted, fontSize: 13 }}>
                  Brak postów w tygodniu {activeWeek}.
                </div>
              )}
              {currentWeekItems.map((item) => {
                const gIdx = globalIndexOf(item);
                const p = platformInfo(item.platform);
                const isExpanded = expandedPost === item.id;
                const kindLabel = CONTENT_KINDS.find((k) => k.id === item.content_kind)?.name || item.content_kind;
                return (
                  <div key={item.id} style={{ ...cardSt, overflow: "hidden" }}>
                    {/* Row */}
                    <div
                      className="ais-post-row"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto auto 1fr auto auto",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        cursor: "pointer",
                      }}
                      onClick={() => setExpandedPost(isExpanded ? null : item.id ?? null)}
                    >
                      {/* Date */}
                      <div style={{ fontSize: 11, fontWeight: 600, color: css.muted, whiteSpace: "nowrap", minWidth: 72 }}>
                        {formatDatePL(item.date)}
                        <br />
                        <span style={{ color: css.faint }}>{item.time}</span>
                      </div>
                      {/* Platform badge */}
                      <PlatformBadge platform={item.platform} dark={dark} />
                      {/* Title + meta */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: css.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: 11, color: css.muted, marginTop: 2 }}>
                          {kindLabel}{item.angle ? ` · ${item.angle}` : ""}
                        </div>
                      </div>
                      {/* Status */}
                      <StatusBadge status={item.status} dark={dark} />
                      {/* Chevron */}
                      <ChevronRight size={14} color={css.faint} style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div style={{ borderTop: `0.5px solid ${css.border}`, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                        {item.description && (
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: css.muted, marginBottom: 5 }}>Opis</div>
                            <p style={{ margin: 0, fontSize: 13, color: css.text, lineHeight: 1.7 }}>{item.description}</p>
                          </div>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <label style={{ display: "grid", gap: 4 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: css.muted }}>Tytuł</span>
                            <input
                              className="ais-input"
                              value={item.title}
                              onChange={(e) => updatePlanItem(gIdx, { title: e.target.value })}
                              style={inputSt}
                            />
                          </label>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <label style={{ display: "grid", gap: 4 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: css.muted }}>Data</span>
                              <input className="ais-input" type="date" value={item.date} onChange={(e) => updatePlanItem(gIdx, { date: e.target.value })} style={inputSt} />
                            </label>
                            <label style={{ display: "grid", gap: 4 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: css.muted }}>Godz.</span>
                              <input className="ais-input" type="time" value={item.time} onChange={(e) => updatePlanItem(gIdx, { time: e.target.value })} style={inputSt} />
                            </label>
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <label style={{ display: "grid", gap: 4 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: css.muted }}>Platforma</span>
                            <select className="ais-input" value={item.platform} onChange={(e) => updatePlanItem(gIdx, { platform: e.target.value as Platform })} style={inputSt}>
                              {PLATFORMS.map((pp) => <option key={pp.id} value={pp.id}>{pp.name}</option>)}
                            </select>
                          </label>
                          <label style={{ display: "grid", gap: 4 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: css.muted }}>Rodzaj</span>
                            <select className="ais-input" value={item.content_kind} onChange={(e) => updatePlanItem(gIdx, { content_kind: e.target.value as ContentKind })} style={inputSt}>
                              {CONTENT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                            </select>
                          </label>
                        </div>

                        <label style={{ display: "grid", gap: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: css.muted }}>Notatki / opis</span>
                          <textarea
                            className="ais-input"
                            value={item.description}
                            onChange={(e) => updatePlanItem(gIdx, { description: e.target.value })}
                            style={{ ...inputSt, minHeight: 80, resize: "vertical" }}
                          />
                        </label>

                        {item.source_recommendation && (
                          <div style={{ fontSize: 12, color: css.muted, padding: "8px 12px", background: css.surfaceSoft, borderRadius: 8, lineHeight: 1.6 }}>
                            <strong style={{ color: css.accentText }}>AI:</strong> {item.source_recommendation}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => addItemToSchedule(item, gIdx)}
                          disabled={item.status === "scheduled"}
                          style={{
                            ...btnGhost,
                            justifyContent: "center",
                            color: item.status === "scheduled" ? css.muted : css.accentText,
                            borderColor: item.status === "scheduled" ? css.border : css.accentBorder,
                            background: item.status === "scheduled" ? "transparent" : css.accentBg,
                            cursor: item.status === "scheduled" ? "not-allowed" : "pointer",
                            opacity: item.status === "scheduled" ? .6 : 1,
                          }}
                        >
                          {item.status === "scheduled" ? "Już w harmonogramie" : "Dodaj do harmonogramu"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Platform distribution ── */}
          {strategy.platform_distribution.length > 0 && (
            <div style={{ ...cardSt, padding: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: css.muted, marginBottom: 12 }}>
                Rozkład platform
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
                {strategy.platform_distribution.map((row) => {
                  const p = platformInfo(row.platform);
                  return (
                    <div key={row.platform} style={{
                      background: css.surfaceSoft,
                      border: `0.5px solid ${css.border}`,
                      borderRadius: 10,
                      padding: 12,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: p.id === "tiktok" ? (dark ? "#9ca3af" : "#6b7280") : p.color }}>{p.name}</span>
                        <span style={{ fontSize: 22, fontWeight: 700, color: css.text, lineHeight: 1 }}>{row.posts_per_month}</span>
                      </div>
                      <div style={{ fontSize: 11, color: css.muted, lineHeight: 1.7 }}>
                        {row.cadence}<br />
                        Dni: {row.best_days.join(", ") || "–"}<br />
                        Godziny: {row.best_hours.join(", ") || "–"}
                      </div>
                      {row.reasoning && (
                        <p style={{ margin: "8px 0 0", fontSize: 11, color: css.text, lineHeight: 1.6 }}>{row.reasoning}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Quality control ── */}
          {(strategy.missing_data.length > 0 || strategy.assumptions.length > 0) && (
            <div style={{
              ...cardSt,
              padding: 16,
              border: `0.5px solid ${css.accentBorder}`,
              background: css.accentBg,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: css.accentText, marginBottom: 12 }}>
                Kontrola jakości strategii
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {strategy.missing_data.length > 0 && (
                  <div>
                    <h4 style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: css.text }}>Brakujące dane</h4>
                    <ul style={{ margin: 0, paddingLeft: 16, color: css.muted, fontSize: 12, lineHeight: 1.8 }}>
                      {strategy.missing_data.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                )}
                {strategy.assumptions.length > 0 && (
                  <div>
                    <h4 style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: css.text }}>Założenia AI</h4>
                    <ul style={{ margin: 0, paddingLeft: 16, color: css.muted, fontSize: 12, lineHeight: 1.8 }}>
                      {strategy.assumptions.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
