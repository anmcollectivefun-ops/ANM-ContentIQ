"use client";

// app/components/AIStrategist.tsx
// ANM ContentIQ — AI Strateg
// Wersja przebudowana: czytelne sekcje + timingInsights z realnych postów.

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Database,
  Download,
  LayoutList,
  RefreshCw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useContentIQLanguage } from "@/lib/contentiq-language";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Platform =
  | "linkedin"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "blog"
  | "spotify";

type ContentKind = "content" | "short" | "video" | "creative" | "blog" | "podcast";
type StrategyItemStatus = "planned" | "scheduled" | "published" | "done";
type ViewMode = "calendar" | "timeline";
type StrategyAiProvider = "gemini" | "deepseek";
type TimingConfidence = "high" | "medium" | "low";

type AnyRow = Record<string, any>;

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

interface TimingInsight {
  platform: Platform;
  platform_name: string;
  posts_analyzed: number;
  best_days: string[];
  best_hours: string[];
  best_windows: string[];
  strongest_posts: {
    title: string;
    published_at: string;
    day: string;
    hour: string;
    reach: number;
    impressions: number;
    engagement: number;
    score: number;
  }[];
  confidence: TimingConfidence;
  recommendation_note: string;
}

interface ContextPack {
  drafts: AnyRow[];
  templates: AnyRow[];
  inspirations: AnyRow[];
  scheduled: AnyRow[];
  connections: AnyRow[];
  posts: AnyRow[];
  accountStats: AnyRow[];
  previousStrategies: AnyRow[];
  timingInsights: TimingInsight[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const PLATFORMS: {
  id: Platform;
  name: string;
  color: string;
  bg: string;
  short: string;
}[] = [
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2", bg: "#0A66C215", short: "LI" },
  { id: "instagram", name: "Instagram", color: "#E1306C", bg: "#E1306C15", short: "IG" },
  { id: "tiktok", name: "TikTok", color: "#FFFFFF", bg: "#FFFFFF12", short: "TT" },
  { id: "youtube", name: "YouTube", color: "#FF0033", bg: "#FF003315", short: "YT" },
  { id: "facebook", name: "Facebook", color: "#1877F2", bg: "#1877F215", short: "FB" },
  { id: "blog", name: "Blog", color: "#22C55E", bg: "#22C55E15", short: "BL" },
  { id: "spotify", name: "Spotify", color: "#1DB954", bg: "#1DB95415", short: "SP" },
];

const CONTENT_KINDS: { id: ContentKind; name: string }[] = [
  { id: "content", name: "Post / content" },
  { id: "short", name: "Short / rolka" },
  { id: "video", name: "Video" },
  { id: "creative", name: "Grafika / kreacja" },
  { id: "blog", name: "Blog" },
  { id: "podcast", name: "Podcast" },
];

const DAYS_PL_SHORT = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];
const DAYS_FULL = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
const EMPTY_CONTEXT: ContextPack = {
  drafts: [],
  templates: [],
  inspirations: [],
  scheduled: [],
  connections: [],
  posts: [],
  accountStats: [],
  previousStrategies: [],
  timingInsights: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanJsonAnswer(answer: string) {
  return answer
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
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

function formatDateTimePL(value?: string | null) {
  if (!value) return "brak";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "brak";
  return d.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtNum(n: number) {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mln`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)} tys.`;
  return String(Math.round(n));
}

function toNumber(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function platformInfo(platform: Platform) {
  return PLATFORMS.find((p) => p.id === platform) || PLATFORMS[0];
}

function isPlatform(value: unknown): value is Platform {
  return typeof value === "string" && PLATFORMS.some((p) => p.id === value);
}

function getWeekDays(weekIndex: number, periodStart: string) {
  const start = new Date(`${periodStart}T00:00:00`);
  const dow = start.getDay(); // 0 = Sunday
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  start.setDate(start.getDate() + mondayOffset + weekIndex * 7);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function getPostPlatform(post: AnyRow, connections: AnyRow[]): Platform | null {
  if (isPlatform(post.platform)) return post.platform;

  const connection = connections.find((item) => item.id === post.connection_id);
  if (isPlatform(connection?.platform)) return connection.platform;

  return null;
}

function getPostEngagement(post: AnyRow) {
  return (
    toNumber(post.likes) +
    toNumber(post.comments) +
    toNumber(post.shares) +
    toNumber(post.saves) +
    toNumber(post.clicks)
  );
}

function getPostPerformanceScore(post: AnyRow) {
  const reach = toNumber(post.reach);
  const impressions = toNumber(post.impressions);
  const views = Math.max(reach, impressions);
  const engagement = getPostEngagement(post);
  const aiScore = toNumber(post.ai_score);

  return views + engagement * 12 + aiScore * 20;
}

function formatHour(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:00`;
}

function normalizeTitle(value: unknown, fallback = "Publikacja bez tytułu") {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text ? text.slice(0, 120) : fallback;
}

function buildTimingInsights(posts: AnyRow[], connections: AnyRow[]): TimingInsight[] {
  const grouped: Record<Platform, AnyRow[]> = {
    linkedin: [],
    instagram: [],
    tiktok: [],
    youtube: [],
    facebook: [],
    blog: [],
    spotify: [],
  };

  for (const post of posts) {
    const platform = getPostPlatform(post, connections);
    const publishedAt = post.published_at || post.fetched_at;

    if (!platform || !publishedAt) continue;
    grouped[platform].push(post);
  }

  return PLATFORMS.map((platformConfig) => {
    const platform = platformConfig.id;
    const platformPosts = grouped[platform] || [];

    const enriched = platformPosts
      .map((post) => {
        const publishedAt = post.published_at || post.fetched_at;
        const date = new Date(publishedAt);
        if (Number.isNaN(date.getTime())) return null;

        const day = DAYS_FULL[date.getDay()];
        const hour = formatHour(date);
        const reach = toNumber(post.reach);
        const impressions = toNumber(post.impressions);
        const engagement = getPostEngagement(post);
        const score = getPostPerformanceScore(post);

        return {
          post,
          day,
          hour,
          reach,
          impressions,
          engagement,
          score,
          published_at: publishedAt,
          title: normalizeTitle(post.title || post.content || post.message),
        };
      })
      .filter(Boolean) as {
      post: AnyRow;
      day: string;
      hour: string;
      reach: number;
      impressions: number;
      engagement: number;
      score: number;
      published_at: string;
      title: string;
    }[];

    const dayStats = new Map<string, { count: number; totalScore: number }>();
    const hourStats = new Map<string, { count: number; totalScore: number }>();

    for (const item of enriched) {
      const dayCurrent = dayStats.get(item.day) || { count: 0, totalScore: 0 };
      dayCurrent.count += 1;
      dayCurrent.totalScore += item.score;
      dayStats.set(item.day, dayCurrent);

      const hourCurrent = hourStats.get(item.hour) || { count: 0, totalScore: 0 };
      hourCurrent.count += 1;
      hourCurrent.totalScore += item.score;
      hourStats.set(item.hour, hourCurrent);
    }

    const bestDays = Array.from(dayStats.entries())
      .map(([day, stats]) => ({ day, avgScore: stats.totalScore / Math.max(1, stats.count), count: stats.count }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 3)
      .map((item) => item.day);

    const bestHours = Array.from(hourStats.entries())
      .map(([hour, stats]) => ({ hour, avgScore: stats.totalScore / Math.max(1, stats.count), count: stats.count }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 3)
      .map((item) => item.hour);

    const strongestPosts = enriched
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => ({
        title: item.title,
        published_at: item.published_at,
        day: item.day,
        hour: item.hour,
        reach: item.reach,
        impressions: item.impressions,
        engagement: item.engagement,
        score: Math.round(item.score),
      }));

    const confidence: TimingConfidence =
      enriched.length >= 10 ? "high" : enriched.length >= 4 ? "medium" : "low";

    const bestWindows =
      bestDays.length && bestHours.length
        ? bestDays.flatMap((day) => bestHours.map((hour) => `${day} ${hour}`)).slice(0, 5)
        : [];

    return {
      platform,
      platform_name: platformConfig.name,
      posts_analyzed: enriched.length,
      best_days: bestDays,
      best_hours: bestHours,
      best_windows: bestWindows,
      strongest_posts: strongestPosts,
      confidence,
      recommendation_note:
        enriched.length >= 4
          ? `Analiza oparta na ${enriched.length} realnych publikacjach. AI ma używać tych dni i godzin jako głównego źródła decyzji.`
          : `Za mało realnych publikacji, żeby pewnie wyznaczyć najlepszy czas. AI może zaproponować tylko testy i musi oznaczyć to jako założenie.`,
    };
  });
}

function resolveStrategyPayload(data: unknown, answer: unknown): unknown {
  if (isRecord(data)) {
    if (Array.isArray(data.weekly_plan)) return data;
    if (isRecord(data.strategy) && Array.isArray(data.strategy.weekly_plan)) return data.strategy;
    if (isRecord(data.data) && Array.isArray(data.data.weekly_plan)) return data.data;
  }

  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("AI nie zwróciło danych strategii.");
  }

  const parsedAnswer = JSON.parse(cleanJsonAnswer(answer));
  if (isRecord(parsedAnswer) && Array.isArray(parsedAnswer.weekly_plan)) return parsedAnswer;
  if (isRecord(parsedAnswer) && isRecord(parsedAnswer.strategy) && Array.isArray(parsedAnswer.strategy.weekly_plan)) {
    return parsedAnswer.strategy;
  }

  throw new Error("Odpowiedź AI nie zawiera pola weekly_plan.");
}

function parseStrategy(raw: unknown, fallbackStart: string): AiStrategyResult {
  if (!isRecord(raw)) {
    throw new Error("AI zwróciło nieprawidłowy format strategii.");
  }

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
    content_pillars: safeArray(v.content_pillars).map((p: any) => ({
      name: p?.name || "Filar contentu",
      description: p?.description || "",
      platforms: safeArray(p?.platforms).filter(isPlatform),
    })),
    platform_distribution: safeArray(v.platform_distribution).map((r: any) => ({
      platform: isPlatform(r?.platform) ? r.platform : "linkedin",
      posts_per_month: Number(r?.posts_per_month || 0),
      cadence: r?.cadence || "",
      best_days: safeArray(r?.best_days),
      best_hours: safeArray(r?.best_hours),
      reasoning: r?.reasoning || "",
    })),
    weekly_plan: safeArray(v.weekly_plan).map((item: any, i: number) => ({
      id: item?.id || `ai-${i}`,
      week: Number(item?.week || Math.floor(i / 7) + 1),
      date: item?.date || addDaysIso(start, i),
      time: item?.time || "10:00",
      platform: isPlatform(item?.platform) ? item.platform : "linkedin",
      content_kind: CONTENT_KINDS.some((k) => k.id === item?.content_kind) ? item.content_kind : "content",
      title: item?.title || "Pomysł contentowy",
      angle: item?.angle || "",
      format: item?.format || "",
      description: item?.description || "",
      source_recommendation: item?.source_recommendation || "",
      status: ["planned", "scheduled", "published", "done"].includes(item?.status) ? item.status : "planned",
    })),
    today_notification: v.today_notification || "",
    strategy_alerts: safeArray(v.strategy_alerts),
    assumptions: safeArray(v.assumptions),
    missing_data: safeArray(v.missing_data),
  };
}

function parseSavedStrategy(strategyRow: any, itemRows: any[]): AiStrategyResult {
  const ctx = strategyRow?.source_context || {};
  const start = strategyRow?.period_start || monthStartIso();

  return {
    strategy_name: strategyRow?.title || "Strategia contentu AI",
    period_start: start,
    period_end: strategyRow?.period_end || addDaysIso(start, 27),
    main_goal: strategyRow?.main_goal || "",
    positioning: strategyRow?.positioning || "",
    ai_summary: strategyRow?.ai_summary || "",
    content_pillars: Array.isArray(ctx.content_pillars) ? ctx.content_pillars : [],
    platform_distribution: Array.isArray(ctx.platform_distribution) ? ctx.platform_distribution : [],
    weekly_plan: itemRows.map((item: any, i: number) => ({
      id: item.id || `saved-${i}`,
      db_id: item.id,
      week: Number(item.week || Math.floor(i / 7) + 1),
      date: item.publish_date || addDaysIso(start, i),
      time: item.publish_time ? String(item.publish_time).slice(0, 5) : "10:00",
      platform: isPlatform(item.platform) ? item.platform : "linkedin",
      content_kind: CONTENT_KINDS.some((k) => k.id === item.content_kind) ? item.content_kind : "content",
      title: item.title || "Pozycja strategii",
      angle: item.angle || "",
      format: item.format || "",
      description: item.description || "",
      source_recommendation: item.source_recommendation || "",
      status: ["planned", "scheduled", "published", "done"].includes(item.status) ? item.status : "planned",
    })),
    today_notification: ctx.today_notification || "",
    strategy_alerts: Array.isArray(ctx.strategy_alerts) ? ctx.strategy_alerts : [],
    assumptions: Array.isArray(ctx.assumptions) ? ctx.assumptions : [],
    missing_data: Array.isArray(ctx.missing_data) ? ctx.missing_data : [],
  };
}

function compactContextForPrompt(pack: ContextPack) {
  return {
    drafts: pack.drafts.slice(0, 25).map((item) => ({
      title: item.title,
      topic: item.topic,
      content_type: item.content_type,
      target_platforms: item.target_platforms,
      ai_score: item.ai_score,
      status: item.status,
      body_preview: String(item.body || "").slice(0, 450),
    })),
    templates: pack.templates.slice(0, 25).map((item) => ({
      title: item.title,
      content_type: item.content_type,
      target_platforms: item.target_platforms,
      ai_score: item.ai_score,
      body_preview: String(item.body || "").slice(0, 350),
    })),
    inspirations: pack.inspirations.slice(0, 25).map((item) => ({
      title: item.title,
      description: item.description,
      platforms: item.platforms,
      hashtags: item.hashtags,
      ai_score: item.ai_score,
      source_kind: item.source_kind,
    })),
    scheduled: pack.scheduled.slice(0, 25),
    connections: pack.connections.map((item) => ({
      id: item.id,
      platform: item.platform,
      connected: item.connected,
      account_name: item.account_name,
    })),
    posts: pack.posts.slice(0, 70).map((post) => ({
      connection_id: post.connection_id,
      platform: post.platform,
      title: post.title,
      content_preview: String(post.content || "").slice(0, 280),
      post_type: post.post_type,
      published_at: post.published_at,
      reach: post.reach,
      impressions: post.impressions,
      likes: post.likes,
      comments: post.comments,
      shares: post.shares,
      saves: post.saves,
      clicks: post.clicks,
      ai_score: post.ai_score,
    })),
    accountStats: pack.accountStats.slice(0, 30),
    previousStrategies: pack.previousStrategies.slice(0, 5),
    timingInsights: pack.timingInsights,
  };
}

function buildStrategyPrompt({
  language,
  userBrief,
  periodStart,
  selectedPlatforms,
  contextPack,
}: {
  language: "pl" | "en";
  userBrief: string;
  periodStart: string;
  selectedPlatforms: Platform[];
  contextPack: ContextPack;
}) {
  const periodEnd = addDaysIso(periodStart, 27);
  const compactContext = compactContextForPrompt(contextPack);

  return `
Jesteś AI Strategiem ContentIQ. Tworzysz realną strategię contentu na 4 tygodnie dla konkretnego użytkownika.

Wszystkie treści opisowe w odpowiedzi zapisuj w języku ${language === "pl" ? "polskim" : "angielskim"}.

NIE TWÓRZ PLANU Z OGÓLNYCH PORAD INTERNETOWYCH.
Twoje centrum wiedzy to dane z aplikacji ContentIQ:
- posty pobrane z social mediów,
- data i godzina publikacji,
- zasięg / impressions / wyświetlenia,
- polubienia, komentarze, udostępnienia, zapisy i kliknięcia,
- szkice, szablony, inspiracje i harmonogram,
- opis użytkownika.

NAJWAŻNIEJSZA ZASADA CZASU PUBLIKACJI:
Masz używać pola timingInsights. To są policzone w aplikacji najlepsze dni i godziny na podstawie realnych postów użytkownika.

Jeżeli dla platformy timingInsights.posts_analyzed >= 4:
- użyj best_days, best_hours i best_windows jako głównego źródła decyzji,
- nie wybieraj dni i godzin sprzecznych z tymi danymi,
- w source_recommendation wpisz: "Na podstawie X realnych postów: najlepsze okna to ...".

Jeżeli dla platformy timingInsights.posts_analyzed < 4:
- możesz zaproponować godzinę tylko jako hipotezę,
- wpisz ten brak w missing_data,
- wpisz założenie w assumptions,
- NIE pisz, że to najlepsza godzina, tylko że to test.

Nie wpisuj ogólnych stwierdzeń typu "najlepiej publikować we wtorek o 10:00", jeśli nie wynika to z danych użytkownika.

Logika platform:
- TikTok i YouTube/Shorts: jeżeli dane użytkownika pokazują weekend lub popołudnia, planuj głównie weekendy i popołudnia.
- LinkedIn, Facebook i Instagram: jeżeli dane użytkownika pokazują dni robocze i popołudnia, planuj w tych oknach.
- Blog może wspierać treści eksperckie i SEO, ale nie udawaj metryk bloga, jeśli ich nie ma.
- Spotify tylko wtedy, gdy są dane lub użytkownik jasno chce podcast.

OKRES STRATEGII:
${periodStart} - ${periodEnd}

WYBRANE PLATFORMY:
${selectedPlatforms.join(", ")}

OPIS UŻYTKOWNIKA / MARKI / MATERIAŁÓW:
${userBrief || "Brak dodatkowego opisu użytkownika."}

DANE Z APLIKACJI CONTENTIQ:
${JSON.stringify(compactContext, null, 2)}

WYMAGANIA:
- Stwórz plan na minimum 20 i maksimum 40 pozycji na 4 tygodnie.
- Każda pozycja musi mieć realną datę z okresu strategii.
- Każda pozycja musi mieć godzinę zgodną z timingInsights, jeśli platforma ma dane.
- Każda pozycja musi mieć source_recommendation z uzasadnieniem z danych.
- Jeżeli nie masz danych dla platformy, oznacz to w missing_data.
- Nie wpisuj "brak danych o impressions/clicks/saves" dla wszystkich platform, jeśli masz reach, likes, comments, shares i published_at — użyj tego, co jest.
- Nie planuj platform, których użytkownik nie wybrał.
- Nie twórz pustej strategii.
- Nie powtarzaj jednego formatu na wszystkich platformach.
- Dopasuj styl do platformy.

Zwróć wyłącznie JSON bez markdown:

{
  "strategy_name": "nazwa strategii",
  "period_start": "${periodStart}",
  "period_end": "${periodEnd}",
  "main_goal": "główny cel strategii",
  "positioning": "pozycjonowanie marki na ten okres",
  "ai_summary": "krótkie podsumowanie strategii",
  "content_pillars": [
    {
      "name": "filar",
      "description": "opis filaru",
      "platforms": ["linkedin"]
    }
  ],
  "platform_distribution": [
    {
      "platform": "linkedin",
      "posts_per_month": 8,
      "cadence": "2 razy w tygodniu",
      "best_days": ["wtorek", "czwartek"],
      "best_hours": ["15:00", "18:00"],
      "reasoning": "uzasadnienie na podstawie timingInsights i danych postów"
    }
  ],
  "weekly_plan": [
    {
      "week": 1,
      "date": "YYYY-MM-DD",
      "time": "15:00",
      "platform": "linkedin",
      "content_kind": "content",
      "title": "tytuł publikacji",
      "angle": "kąt komunikacji",
      "format": "format",
      "description": "co dokładnie opublikować",
      "source_recommendation": "Na podstawie realnych danych: ...",
      "status": "planned"
    }
  ],
  "today_notification": "komunikat na dziś",
  "strategy_alerts": ["ważna sugestia strategiczna"],
  "assumptions": ["założenie, jeśli brakuje danych"],
  "missing_data": ["jakich danych brakuje do większej pewności"]
}
  `.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Small UI components
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div
      style={{
        color,
        fontFamily: "var(--font-label)",
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: ".12em",
        textTransform: "uppercase",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function PlatformBadge({ platform, dark }: { platform: Platform; dark?: boolean }) {
  const p = platformInfo(platform);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 10,
        fontWeight: 850,
        padding: "4px 8px",
        borderRadius: 999,
        color: p.color,
        background: p.bg,
        border: `1px solid ${p.color}35`,
        letterSpacing: ".03em",
        whiteSpace: "nowrap",
      }}
    >
      {p.name}
    </span>
  );
}

function StatusBadge({ status, dark }: { status: StrategyItemStatus; dark: boolean }) {
  const map: Record<StrategyItemStatus, { label: string; color: string; bg: string }> = {
    planned: { label: "Plan", color: dark ? "#9ca3af" : "#6b7280", bg: dark ? "#ffffff10" : "#f3f4f6" },
    scheduled: { label: "Harmonogram", color: "#3b82f6", bg: "#3b82f615" },
    published: { label: "Opublikowane", color: "#22c55e", bg: "#22c55e15" },
    done: { label: "Gotowe", color: "#a855f7", bg: "#a855f715" },
  };

  const s = map[status] || map.planned;

  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 850,
        padding: "4px 8px",
        borderRadius: 999,
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.color}40`,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function AIStrategist({
  dark = true,
  workspaceId = "contentiq",
}: {
  dark?: boolean;
  workspaceId?: string;
}) {
  const { lang, locale, text } = useContentIQLanguage();
  const supabase = createClient();

  const css = dark
    ? {
        bg: "#1A2233",
        surface: "#050505",
        surfaceSoft: "#0B0B0D",
        surfaceHover: "#121216",
        text: "#FFFFFF",
        muted: "#C9CED8",
        faint: "#7F8796",
        border: "rgba(255,255,255,0.10)",
        borderMed: "rgba(255,255,255,0.16)",
        accent: "#8E443D",
        accentBg: "rgba(142,68,61,0.18)",
        accentBorder: "rgba(142,68,61,0.55)",
        heading: "#8E443D",
        aiBg: "rgba(109,40,217,0.16)",
        aiBorder: "rgba(192,132,252,0.55)",
        aiText: "#D8B4FE",
        aiIcon: "#F0ABFC",
        aiGlow: "0 0 28px rgba(168,85,247,0.26)",
        ok: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
        info: "#60a5fa",
      }
    : {
        bg: "#FFFFFF",
        surface: "#B5937A",
        surfaceSoft: "#F7F2EF",
        surfaceHover: "#EFE5DE",
        text: "#2B2B2B",
        muted: "#5F5A57",
        faint: "#8A807B",
        border: "rgba(35,31,32,0.14)",
        borderMed: "rgba(35,31,32,0.22)",
        accent: "#231F20",
        accentBg: "rgba(181,147,122,0.26)",
        accentBorder: "rgba(35,31,32,0.24)",
        heading: "#231F20",
        aiBg: "rgba(124,58,237,0.10)",
        aiBorder: "rgba(124,58,237,0.34)",
        aiText: "#6D28D9",
        aiIcon: "#A855F7",
        aiGlow: "0 0 26px rgba(124,58,237,0.18)",
        ok: "#16a34a",
        warning: "#d97706",
        danger: "#dc2626",
        info: "#2563eb",
      };

  const [workspaceUuid, setWorkspaceUuid] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([
    "linkedin",
    "instagram",
    "tiktok",
    "youtube",
    "facebook",
  ]);
  const [periodStart, setPeriodStart] = useState(monthStartIso());
  const [userBrief, setUserBrief] = useState("");
  const [contextPack, setContextPack] = useState<ContextPack>(EMPTY_CONTEXT);
  const [contextLoaded, setContextLoaded] = useState(false);
  const [strategy, setStrategy] = useState<AiStrategyResult | null>(null);
  const [savedStrategyId, setSavedStrategyId] = useState<string | null>(null);

  const [loadingSavedStrategy, setLoadingSavedStrategy] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [activeWeek, setActiveWeek] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [strategyAiProvider, setStrategyAiProvider] = useState<StrategyAiProvider>("gemini");
  const [showBriefPanel, setShowBriefPanel] = useState(true);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);

  const todayIsoVal = todayIso();
  const periodEnd = addDaysIso(periodStart, 27);

  const selectedTimingInsights = useMemo(
    () => contextPack.timingInsights.filter((item) => selectedPlatforms.includes(item.platform)),
    [contextPack.timingInsights, selectedPlatforms]
  );

  const platformsWithTiming = selectedTimingInsights.filter((item) => item.posts_analyzed > 0).length;
  const platformsWithEnoughTiming = selectedTimingInsights.filter((item) => item.posts_analyzed >= 4).length;

  const todaysItems = useMemo(() => {
    if (!strategy) return [];
    return strategy.weekly_plan.filter((item) => item.date === todayIsoVal);
  }, [strategy, todayIsoVal]);

  const weekDays = useMemo(() => getWeekDays(activeWeek - 1, strategy?.period_start || periodStart), [activeWeek, strategy?.period_start, periodStart]);

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
  const activePlatformsCount = strategy ? new Set(strategy.weekly_plan.map((i) => i.platform)).size : 0;

  const inputSt: CSSProperties = {
    width: "100%",
    borderRadius: 12,
    border: `1px solid ${css.borderMed}`,
    background: css.surfaceSoft,
    color: css.text,
    padding: "11px 12px",
    outline: "none",
    fontFamily: "inherit",
    fontSize: 13,
    lineHeight: 1.55,
  };

  const btnPrimary: CSSProperties = {
    border: "none",
    borderRadius: 12,
    padding: "11px 16px",
    background: dark ? "#FFFFFF" : "#111111",
    color: dark ? "#050505" : "#FFFFFF",
    fontSize: 13,
    fontWeight: 900,
    cursor: "pointer",
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    whiteSpace: "nowrap",
  };

  const btnGhost: CSSProperties = {
    border: `1px solid ${css.borderMed}`,
    borderRadius: 12,
    padding: "10px 14px",
    background: "transparent",
    color: css.muted,
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    whiteSpace: "nowrap",
  };

  const cardSt: CSSProperties = {
    background: css.surface,
    border: `1px solid ${css.border}`,
    borderRadius: 20,
  };

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  }

  function togglePlatform(platform: Platform) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.length === 1
          ? prev
          : prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  }

  function updatePlanItem(index: number, patch: Partial<StrategyDayItem>) {
    setStrategy((cur) => {
      if (!cur || index < 0) return cur;
      const next = [...cur.weekly_plan];
      next[index] = { ...next[index], ...patch };
      return { ...cur, weekly_plan: next };
    });
  }

  function globalIndexOf(item: StrategyDayItem) {
    if (!strategy) return -1;
    return strategy.weekly_plan.findIndex(
      (r) =>
        r.id === item.id ||
        (r.date === item.date && r.time === item.time && r.platform === item.platform && r.title === item.title)
    );
  }

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
    if (existing?.id) {
      setWorkspaceUuid(existing.id as string);
      return existing.id as string;
    }

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
      if (error) {
        console.warn(`AI Strategist: ${label} skipped`, error);
        return [] as T[];
      }
      return data || [];
    } catch (err) {
      console.warn(`AI Strategist: ${label} failed`, err);
      return [] as T[];
    }
  }

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
      if (!stratRow?.id) {
        setSavedStrategyId(null);
        return;
      }

      const { data: items, error: itemsError } = await supabase
        .schema("contentiq")
        .from("content_strategy_items")
        .select("id,week,publish_date,publish_time,platform,content_kind,title,angle,format,description,source_recommendation,status,updated_at,created_at")
        .eq("strategy_id", stratRow.id)
        .order("publish_date", { ascending: true })
        .order("publish_time", { ascending: true });

      if (itemsError) throw new Error(itemsError.message);

      setSavedStrategyId(stratRow.id as string);
      const parsed = parseSavedStrategy(stratRow, (items as any[]) || []);
      setStrategy(parsed);
      setPeriodStart(parsed.period_start || monthStartIso());
      setShowBriefPanel(false);
    } catch (err) {
      console.warn("AI Strategist: saved strategy load skipped", err);
    } finally {
      setLoadingSavedStrategy(false);
    }
  }

  useEffect(() => {
    void loadSavedStrategy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function loadContext() {
    setLoadingContext(true);
    setError("");

    try {
      const wsId = await getOrCreateWorkspaceUuid();

      const drafts = await safeQuery<AnyRow>(
        "drafts",
        supabase
          .schema("contentiq")
          .from("content_drafts")
          .select("id,title,body,topic,content_type,target_platforms,ai_score,ai_feedback,status,created_at")
          .eq("workspace_id", wsId)
          .order("created_at", { ascending: false })
          .limit(80)
      );

      const templates = drafts.filter((i) => i.status === "template");
      const activeDrafts = drafts.filter((i) => i.status !== "template");

      const inspirations = await safeQuery<AnyRow>(
        "inspirations",
        supabase
          .schema("contentiq")
          .from("inspirations")
          .select("id,title,description,body,platforms,hashtags,ai_score,ai_feedback,source_kind,source_studio,status,created_at")
          .eq("workspace_id", wsId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(80)
      );

      const scheduled = await safeQuery<AnyRow>(
        "scheduled_posts",
        supabase
          .schema("contentiq")
          .from("scheduled_posts")
          .select("id,platform,scheduled_at,status,draft_id,created_at")
          .order("scheduled_at", { ascending: false })
          .limit(80)
      );

      const connections = await safeQuery<AnyRow>(
        "connections",
        supabase
          .schema("contentiq")
          .from("platform_connections")
          .select("id,platform,connected,account_name,created_at")
          .eq("workspace_id", wsId)
      );

      const connectionIds = connections.map((c) => c.id).filter(Boolean);

      let posts: AnyRow[] = [];
      if (connectionIds.length) {
        posts = await safeQuery<AnyRow>(
          "posts",
          supabase
            .schema("contentiq")
            .from("posts")
            .select("id,connection_id,platform_post_id,title,content,post_type,url,published_at,reach,impressions,likes,comments,shares,saves,clicks,ai_score,ai_summary,fetched_at")
            .in("connection_id", connectionIds)
            .order("published_at", { ascending: false })
            .limit(160)
        );
      } else {
        posts = await safeQuery<AnyRow>(
          "posts fallback",
          supabase
            .schema("contentiq")
            .from("posts")
            .select("id,connection_id,platform_post_id,title,content,post_type,url,published_at,reach,impressions,likes,comments,shares,saves,clicks,ai_score,ai_summary,fetched_at")
            .order("published_at", { ascending: false })
            .limit(160)
        );
      }

      const accountStats = await safeQuery<AnyRow>(
        "account_stats",
        supabase
          .schema("contentiq")
          .from("account_stats")
          .select("id,connection_id,followers,following,total_posts,avg_reach,avg_engagement,ai_score,recorded_at")
          .order("recorded_at", { ascending: false })
          .limit(80)
      );

      const previousStrategies = await safeQuery<AnyRow>(
        "content_strategies",
        supabase
          .schema("contentiq")
          .from("content_strategies")
          .select("id,title,period_start,period_end,main_goal,positioning,ai_summary,status,created_at,updated_at")
          .eq("workspace_id", wsId)
          .order("updated_at", { ascending: false })
          .limit(8)
      );

      const typedPosts = posts.slice(0, 160);
      const typedConnections = connections.slice(0, 20);
      const timingInsights = buildTimingInsights(typedPosts, typedConnections);

      const pack: ContextPack = {
        drafts: activeDrafts.slice(0, 60),
        templates: templates.slice(0, 60),
        inspirations: inspirations.slice(0, 60),
        scheduled: scheduled.slice(0, 60),
        connections: typedConnections,
        posts: typedPosts,
        accountStats: accountStats.slice(0, 80),
        previousStrategies: previousStrategies.slice(0, 8),
        timingInsights,
      };

      setContextPack(pack);
      setContextLoaded(true);
      showToast("Dane i okna publikacji pobrane");
      return pack;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoadingContext(false);
    }
  }

  async function generateStrategy() {
    setGenerating(true);
    setError("");

    try {
      const pack = contextLoaded ? contextPack : await loadContext();
      const prompt = buildStrategyPrompt({ language: lang, userBrief, periodStart, selectedPlatforms, contextPack: pack });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "strategy",
          provider: strategyAiProvider,
          ai_provider: strategyAiProvider,
          prompt,
          historicalData: {
            periodStart,
            periodEnd,
            selectedPlatforms,
            contextPack: compactContextForPrompt(pack),
          },
        }),
      });

      const responseText = await res.text();
      let json: Record<string, unknown>;
      try {
        json = JSON.parse(responseText) as Record<string, unknown>;
      } catch {
        console.error("[AI Strategist] non-JSON", responseText.slice(0, 800));
        throw new Error("Endpoint AI zwrócił nieprawidłową odpowiedź.");
      }

      if (!res.ok || json.error) {
        const msg = typeof json.details === "string" ? json.details : typeof json.error === "string" ? json.error : "Błąd generowania strategii AI.";
        throw new Error(msg);
      }

      const payload = resolveStrategyPayload(json.data, json.answer);
      const nextStrategy = parseStrategy(payload, periodStart);

      if (nextStrategy.weekly_plan.length === 0) {
        throw new Error("AI utworzyło strategię bez planu publikacji. Spróbuj ponownie lub wybierz drugi silnik AI.");
      }

      setStrategy(nextStrategy);
      setSavedStrategyId(null);
      setPeriodStart(nextStrategy.period_start);
      setActiveWeek(1);
      setExpandedPost(null);
      setShowBriefPanel(false);
      showToast("Strategia AI wygenerowana");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI nie zwróciło poprawnej strategii.");
    } finally {
      setGenerating(false);
    }
  }

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
        source_context: {
          userBrief,
          selectedPlatforms,
          contextPack,
          content_pillars: strategy.content_pillars,
          platform_distribution: strategy.platform_distribution,
          today_notification: strategy.today_notification,
          strategy_alerts: strategy.strategy_alerts,
          assumptions: strategy.assumptions,
          missing_data: strategy.missing_data,
        },
        status: "active",
        updated_at: new Date().toISOString(),
      };

      const strategySave = savedStrategyId
        ? await supabase.schema("contentiq").from("content_strategies").update(payload).eq("id", savedStrategyId).select("id").single()
        : await supabase.schema("contentiq").from("content_strategies").insert(payload).select("id").single();

      if (strategySave.error || !strategySave.data?.id) {
        throw new Error(strategySave.error?.message || "Nie udało się zapisać strategii.");
      }

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

  async function addItemToSchedule(item: StrategyDayItem, index: number) {
    setError("");

    try {
      const wsId = await getOrCreateWorkspaceUuid();
      const body = [
        item.angle ? `Kąt: ${item.angle}` : "",
        item.format ? `Format: ${item.format}` : "",
        item.description,
        item.source_recommendation ? `Źródło decyzji: ${item.source_recommendation}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const { data: draft, error: draftErr } = await supabase
        .schema("contentiq")
        .from("content_drafts")
        .insert({
          workspace_id: wsId,
          title: item.title,
          body,
          topic: item.title,
          content_type: `AI Strategy / ${item.content_kind}`,
          target_platforms: [item.platform],
          ai_feedback: strategy?.ai_summary || "",
          status: "scheduled",
        })
        .select("id")
        .single();

      if (draftErr || !draft?.id) throw new Error(draftErr?.message || "Nie udało się utworzyć draftu.");

      const { data: conn, error: connErr } = await supabase
        .schema("contentiq")
        .from("platform_connections")
        .select("id")
        .eq("workspace_id", wsId)
        .eq("platform", item.platform)
        .eq("connected", true)
        .limit(1)
        .maybeSingle();

      if (connErr) throw new Error(connErr.message);
      if (!conn?.id) throw new Error(`Brak podłączonego konta dla ${platformInfo(item.platform).name}.`);

      const { error: schedErr } = await supabase.schema("contentiq").from("scheduled_posts").insert({
        draft_id: draft.id,
        connection_id: conn.id,
        platform: item.platform,
        scheduled_at: new Date(`${item.date}T${item.time}:00`).toISOString(),
        status: "scheduled",
      });

      if (schedErr) throw new Error(schedErr.message);

      if (item.db_id) {
        await supabase
          .schema("contentiq")
          .from("content_strategy_items")
          .update({ status: "scheduled", updated_at: new Date().toISOString() })
          .eq("id", item.db_id);
      }

      updatePlanItem(index, { status: "scheduled" });
      showToast("Dodano do harmonogramu");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function exportStrategy() {
    if (!strategy) return;
    const fileName = (strategy.strategy_name || "strategia-contentu")
      .toLowerCase()
      .replace(/[^a-z0-9ąćęłńóśźż]+/gi, "-")
      .replace(/^-|-$/g, "");

    const blob = new Blob([JSON.stringify(strategy, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${fileName || "strategia-contentu"}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast("Strategia wyeksportowana");
  }

  return (
    <div style={{ fontFamily: "var(--font-body)", color: css.text, position: "relative" }}>
      <style>{`
        .ais-input:focus { border-color: ${css.accentBorder} !important; }
        .ais-card-hover:hover { background: ${css.surfaceHover} !important; }
        .ais-pill-btn { transition: all .14s ease; }
        .ais-pill-btn:hover { opacity: .82; transform: translateY(-1px); }
        .ais-row { transition: background .12s ease; }
        .ais-row:hover { background: ${css.surfaceHover} !important; cursor: pointer; }
        .ais-scrollbar { scrollbar-width: thin; scrollbar-color: ${css.borderMed} transparent; }
        .ais-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .ais-scrollbar::-webkit-scrollbar-thumb { background: ${css.borderMed}; border-radius: 999px; }
        @media (max-width: 980px) {
          .ais-two-col { grid-template-columns: 1fr !important; }
          .ais-stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .ais-plan-grid { grid-template-columns: 1fr !important; }
          .ais-topbar-actions { width: 100%; }
        }
        @media (max-width: 620px) {
          .ais-stats-grid { grid-template-columns: 1fr !important; }
          .ais-brief-actions { grid-template-columns: 1fr !important; }
        }
        @keyframes aisPulse { 0%,100%{opacity:1} 50%{opacity:.55} }
      `}</style>

      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 999,
            padding: "10px 16px",
            borderRadius: 14,
            background: "#052e16",
            color: "#22c55e",
            border: "1px solid #166534",
            fontSize: 13,
            fontWeight: 850,
            boxShadow: "0 16px 40px rgba(0,0,0,.4)",
          }}
        >
          {toast}
        </div>
      )}

      <div style={{ display: "grid", gap: 18 }}>
        {/* 1. Header / settings */}
        <section style={{ ...cardSt, padding: 18, position: "relative", overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              left: 24,
              right: 24,
              bottom: -24,
              height: 50,
              background: "rgba(168,85,247,0.14)",
              filter: "blur(26px)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <SectionLabel color={css.accent}>AI Strateg</SectionLabel>
                <h2
                  style={{
                    margin: 0,
                    color: css.heading,
                    fontFamily: "var(--font-heading)",
                    fontSize: 31,
                    lineHeight: 1.05,
                    fontWeight: 500,
                  }}
                >
                  {strategy ? strategy.strategy_name : text("Strategia oparta na realnych danych", "A strategy based on real data")}
                </h2>
                <p style={{ margin: "8px 0 0", color: css.muted, fontSize: 13, lineHeight: 1.7, maxWidth: 880 }}>
                  {text(
                    "AI nie ma zgadywać godzin publikacji. Najpierw liczymy z Twoich postów najlepsze dni i okna czasowe, a dopiero potem model układa plan.",
                    "AI should not guess publishing times. ContentIQ first calculates the best days and time windows from your posts, then builds the plan."
                  )}
                </p>
              </div>

              <div className="ais-topbar-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={btnGhost} type="button" onClick={() => setShowBriefPanel((v) => !v)}>
                  <RefreshCw size={14} />
                  {showBriefPanel ? text("Ukryj ustawienia", "Hide settings") : strategy ? text("Nowa strategia", "New strategy") : text("Ustawienia", "Settings")}
                </button>

                {strategy && (
                  <>
                    <button style={{ ...btnGhost, color: css.aiText, borderColor: css.aiBorder, background: css.aiBg }} type="button" onClick={saveStrategy} disabled={saving}>
                      {saving ? text("Zapisuję...", "Saving...") : text("Zapisz strategię", "Save strategy")}
                    </button>
                    <button style={btnPrimary} type="button" onClick={exportStrategy}>
                      <Download size={14} /> Eksportuj
                    </button>
                  </>
                )}
              </div>
            </div>

            {showBriefPanel && (
              <div
                className="ais-two-col"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                  marginTop: 18,
                }}
              >
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ color: css.muted, fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: ".08em" }}>Start</span>
                      <input className="ais-input" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} style={inputSt} />
                    </label>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ color: css.muted, fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: ".08em" }}>{text("Koniec", "End")}</span>
                      <input className="ais-input" type="date" value={periodEnd} readOnly style={{ ...inputSt, opacity: 0.6 }} />
                    </label>
                  </div>

                  <div>
                    <SectionLabel color={css.accent}>{text("Platformy w strategii", "Strategy platforms")}</SectionLabel>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {PLATFORMS.map((p) => {
                        const active = selectedPlatforms.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            className="ais-pill-btn"
                            onClick={() => togglePlatform(p.id)}
                            style={{
                              borderRadius: 11,
                              border: `1px solid ${active ? p.color : css.borderMed}`,
                              background: active ? `${p.color}18` : css.surfaceSoft,
                              color: active ? p.color : css.muted,
                              padding: "8px 11px",
                              fontSize: 12,
                              fontWeight: 900,
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

                  <div>
                    <SectionLabel color={css.aiText}>{text("Silnik AI", "AI engine")}</SectionLabel>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[
                        { id: "gemini" as StrategyAiProvider, label: "Gemini", note: "szybko czyta duży kontekst" },
                        { id: "deepseek" as StrategyAiProvider, label: "DeepSeek", note: "mocniejsze rozumowanie" },
                      ].map((provider) => {
                        const active = strategyAiProvider === provider.id;
                        return (
                          <button
                            key={provider.id}
                            type="button"
                            onClick={() => setStrategyAiProvider(provider.id)}
                            style={{
                              borderRadius: 14,
                              border: `1px solid ${active ? css.aiBorder : css.borderMed}`,
                              background: active ? css.aiBg : css.surfaceSoft,
                              color: active ? css.aiText : css.muted,
                              padding: "12px",
                              cursor: "pointer",
                              textAlign: "left",
                              fontFamily: "inherit",
                              boxShadow: active ? css.aiGlow : "none",
                            }}
                          >
                            <strong style={{ display: "block", fontSize: 13, marginBottom: 4 }}>{provider.label}</strong>
                            <span style={{ display: "block", fontSize: 11, lineHeight: 1.45 }}>{provider.note}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ color: css.muted, fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: ".08em" }}>
                      Opis marki, kampanii i materiałów
                    </span>
                    <textarea
                      className="ais-input"
                      value={userBrief}
                      onChange={(e) => setUserBrief(e.target.value)}
                      placeholder="Opisz cel miesiąca, produkty, materiały, priorytety i co AI ma uwzględnić. Np. TikTok i YouTube mocniej w weekendy, LinkedIn ekspercko po południu, promujemy aplikacje ANM..."
                      style={{ ...inputSt, minHeight: 164, resize: "vertical", lineHeight: 1.65 }}
                    />
                  </label>

                  <div className="ais-brief-actions" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                    <button type="button" onClick={loadContext} disabled={loadingContext} style={{ ...btnGhost, opacity: loadingContext ? 0.62 : 1 }}>
                      <Database size={14} />
                      {loadingContext ? "Pobieram dane..." : "Pobierz dane"}
                    </button>
                    <button type="button" onClick={generateStrategy} disabled={generating || selectedPlatforms.length === 0} style={{ ...btnPrimary, opacity: generating ? 0.62 : 1 }}>
                      <Wand2 size={14} />
                      {generating ? "AI tworzy..." : "Generuj strategię"}
                    </button>
                  </div>

                  {contextLoaded && (
                    <div style={{ borderRadius: 12, background: css.surfaceSoft, border: `1px solid ${css.border}`, padding: "10px 12px", color: css.muted, fontSize: 12, lineHeight: 1.55 }}>
                      Dane: {contextPack.drafts.length} draftów · {contextPack.templates.length} szablonów · {contextPack.inspirations.length} inspiracji · {contextPack.posts.length} postów · {platformsWithTiming} platform z czasem · {platformsWithEnoughTiming} z mocniejszą próbą
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div style={{ marginTop: 14, background: "#ef444414", border: "1px solid #ef444440", color: css.danger, borderRadius: 14, padding: 12, fontSize: 12, lineHeight: 1.6 }}>
                {error}
              </div>
            )}
          </div>
        </section>

        {/* 2. Data insights */}
        <section style={{ ...cardSt, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <div>
              <SectionLabel color={css.aiText}>{text("Wnioski z danych", "Data insights")}</SectionLabel>
              <h3 style={{ margin: 0, color: css.heading, fontFamily: "var(--font-heading)", fontSize: 27, lineHeight: 1.05, fontWeight: 500 }}>
                Kiedy publikować według Twoich postów?
              </h3>
            </div>
            <button style={btnGhost} type="button" onClick={loadContext} disabled={loadingContext}>
              <RefreshCw size={14} />
              {loadingContext ? "Odświeżam..." : "Odśwież dane"}
            </button>
          </div>

          {!contextLoaded && (
            <div style={{ borderRadius: 16, border: `1px dashed ${css.borderMed}`, padding: 22, color: css.muted, fontSize: 13, lineHeight: 1.7 }}>
              {text("Kliknij", "Click")} <strong style={{ color: css.text }}>{text("Pobierz dane", "Load data")}</strong>{text(", żeby aplikacja policzyła najlepsze dni i godziny z realnych postów. Bez tego AI może bazować tylko na briefie i oznaczy godziny jako test.", " so the app can calculate the best days and times from real posts. Without this data, AI can only use the brief and will mark publishing times as experimental.")}
            </div>
          )}

          {contextLoaded && (
            <div style={{ display: "grid", gap: 14 }}>
              <div className="ais-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
                {[
                  { label: "Pobrane posty", value: contextPack.posts.length, icon: Database },
                  { label: "Platformy z danymi", value: platformsWithTiming, icon: CheckCircle2 },
                  { label: "Pewniejsze platformy", value: platformsWithEnoughTiming, icon: Sparkles },
                  { label: "Szablony + drafty", value: contextPack.templates.length + contextPack.drafts.length, icon: LayoutList },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} style={{ background: css.surfaceSoft, border: `1px solid ${css.border}`, borderRadius: 16, padding: 14 }}>
                      <Icon size={15} color={css.aiText} />
                      <div style={{ color: css.text, fontSize: 27, fontWeight: 900, marginTop: 8, lineHeight: 1 }}>{stat.value}</div>
                      <div style={{ color: css.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 850, marginTop: 6 }}>{stat.label}</div>
                    </div>
                  );
                })}
              </div>

              <div className="ais-plan-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
                {selectedTimingInsights.map((insight) => {
                  const p = platformInfo(insight.platform);
                  const confidenceColor = insight.confidence === "high" ? css.ok : insight.confidence === "medium" ? css.warning : css.danger;
                  const bestPost = insight.strongest_posts[0];

                  return (
                    <div key={insight.platform} style={{ background: css.surfaceSoft, border: `1px solid ${insight.posts_analyzed >= 4 ? `${p.color}55` : css.border}`, borderRadius: 18, padding: 14, minHeight: 220 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                        <div>
                          <div style={{ color: p.color, fontWeight: 950, fontSize: 14 }}>{p.name}</div>
                          <div style={{ color: css.muted, fontSize: 11, marginTop: 3 }}>{insight.posts_analyzed} postów w analizie</div>
                        </div>
                        <span style={{ borderRadius: 999, padding: "4px 8px", background: `${confidenceColor}18`, color: confidenceColor, border: `1px solid ${confidenceColor}40`, fontSize: 10, fontWeight: 900 }}>
                          {insight.confidence === "high" ? "wysoka" : insight.confidence === "medium" ? "średnia" : "niska"}
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                        <div style={{ background: css.surface, border: `1px solid ${css.border}`, borderRadius: 14, padding: 10 }}>
                          <div style={{ color: css.muted, fontSize: 10, fontWeight: 900, textTransform: "uppercase", marginBottom: 6 }}>{text("Dni", "Days")}</div>
                          <div style={{ color: css.text, fontSize: 12, lineHeight: 1.55 }}>{insight.best_days.length ? insight.best_days.join(", ") : "za mało danych"}</div>
                        </div>
                        <div style={{ background: css.surface, border: `1px solid ${css.border}`, borderRadius: 14, padding: 10 }}>
                          <div style={{ color: css.muted, fontSize: 10, fontWeight: 900, textTransform: "uppercase", marginBottom: 6 }}>{text("Godziny", "Times")}</div>
                          <div style={{ color: css.text, fontSize: 12, lineHeight: 1.55 }}>{insight.best_hours.length ? insight.best_hours.join(", ") : "test"}</div>
                        </div>
                      </div>

                      {bestPost ? (
                        <div style={{ marginTop: 10, background: css.surface, border: `1px solid ${css.border}`, borderRadius: 14, padding: 10 }}>
                          <div style={{ color: css.aiText, fontSize: 10, fontWeight: 950, textTransform: "uppercase", marginBottom: 6 }}>{text("Najlepszy wzorzec", "Best pattern")}</div>
                          <div style={{ color: css.text, fontSize: 12, lineHeight: 1.45 }}>{bestPost.title}</div>
                          <div style={{ color: css.muted, fontSize: 11, marginTop: 6 }}>
                            {bestPost.day}, {bestPost.hour} · zasięg {fmtNum(Math.max(bestPost.reach, bestPost.impressions))} · reakcje {fmtNum(bestPost.engagement)}
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: 10, color: css.muted, fontSize: 12, lineHeight: 1.6 }}>{insight.recommendation_note}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Empty / loading */}
        {!strategy && !loadingSavedStrategy && (
          <section style={{ ...cardSt, padding: 42, textAlign: "center", border: `1px dashed ${css.aiBorder}`, boxShadow: css.aiGlow }}>
            <Wand2 size={46} color={css.aiText} style={{ opacity: 0.45, marginBottom: 12 }} />
            <h3 style={{ margin: "0 0 8px", color: css.heading, fontFamily: "var(--font-heading)", fontSize: 25, fontWeight: 500 }}>{text("Brak aktywnej strategii", "No active strategy")}</h3>
            <p style={{ margin: "0 auto 18px", color: css.muted, fontSize: 13, lineHeight: 1.7, maxWidth: 560 }}>
              {text(
                "Najpierw pobierz dane, sprawdź okna publikacji i wygeneruj plan. AI użyje realnych godzin z Twoich postów jako głównego źródła.",
                "Load your data, review publishing windows and generate a plan. AI will use the actual timing of your posts as its primary source."
              )}
            </p>
            <button style={btnPrimary} type="button" onClick={generateStrategy} disabled={generating}>
              <Wand2 size={14} />
              {generating ? text("AI tworzy...", "AI is creating...") : text("Wygeneruj strategię", "Generate strategy")}
            </button>
          </section>
        )}

        {loadingSavedStrategy && (
          <div style={{ textAlign: "center", padding: 52, color: css.muted, fontSize: 13 }}>
            <div style={{ animation: "aisPulse 1.4s ease-in-out infinite" }}>{text("Wczytywanie strategii...", "Loading strategy...")}</div>
          </div>
        )}

        {strategy && (
          <>
            {/* 3. Strategy overview */}
            <section style={{ ...cardSt, padding: 18 }}>
              <SectionLabel color={css.accent}>{text("Plan publikacji", "Publishing plan")}</SectionLabel>
              <div className="ais-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginBottom: 14 }}>
                {[
                  { label: "Postów w planie", value: totalPosts },
                  { label: "Platform", value: activePlatformsCount },
                  { label: "Filarów", value: strategy.content_pillars.length || 0 },
                  { label: "W harmonogramie", value: scheduledCount },
                ].map((item) => (
                  <div key={item.label} style={{ background: css.surfaceSoft, border: `1px solid ${css.border}`, borderRadius: 16, padding: 14 }}>
                    <div style={{ color: css.text, fontSize: 28, fontWeight: 950, lineHeight: 1 }}>{item.value}</div>
                    <div style={{ color: css.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 850, marginTop: 6 }}>{item.label}</div>
                  </div>
                ))}
              </div>

              {(strategy.ai_summary || strategy.today_notification || todaysItems.length > 0) && (
                <div style={{ background: css.aiBg, border: `1px solid ${css.aiBorder}`, boxShadow: css.aiGlow, borderRadius: 18, padding: 15, marginBottom: 14 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <Sparkles size={17} color={css.aiIcon} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ color: css.aiText, fontWeight: 950, fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{text("AI podsumowanie i alert na dziś", "AI summary and today's alert")}</div>
                      <p style={{ margin: 0, color: css.text, fontSize: 13, lineHeight: 1.7 }}>
                        {strategy.today_notification || strategy.ai_summary || `Dziś masz ${todaysItems.length} pozycji w strategii.`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {strategy.content_pillars.length > 0 && (
                <div className="ais-plan-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  {strategy.content_pillars.map((pillar, i) => (
                    <div key={`${pillar.name}-${i}`} style={{ background: css.surfaceSoft, border: `1px solid ${css.border}`, borderRadius: 16, padding: 14 }}>
                      <div style={{ color: css.heading, fontFamily: "var(--font-heading)", fontSize: 20, lineHeight: 1.1, marginBottom: 7 }}>{pillar.name}</div>
                      <div style={{ color: css.muted, fontSize: 12, lineHeight: 1.6, marginBottom: 10 }}>{pillar.description}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {pillar.platforms.map((pl) => <PlatformBadge key={`${pillar.name}-${pl}`} platform={pl} dark={dark} />)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Controls */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 4, background: css.surface, border: `1px solid ${css.border}`, borderRadius: 13, padding: 4 }}>
                {(["calendar", "timeline"] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    style={{
                      borderRadius: 10,
                      border: "none",
                      padding: "8px 13px",
                      fontSize: 12,
                      fontWeight: 850,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: viewMode === mode ? css.accentBg : "transparent",
                      color: viewMode === mode ? css.accent : css.muted,
                    }}
                  >
                    {mode === "calendar" ? <><Calendar size={13} />{text("Kalendarz", "Calendar")}</> : <><LayoutList size={13} />Timeline</>}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {[1, 2, 3, 4].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setActiveWeek(w)}
                    style={{
                      borderRadius: 11,
                      border: `1px solid ${activeWeek === w ? css.accentBorder : css.borderMed}`,
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 850,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      background: activeWeek === w ? css.accentBg : "transparent",
                      color: activeWeek === w ? css.accent : css.muted,
                    }}
                  >
                    Tydzień {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar */}
            {viewMode === "calendar" && (
              <section style={{ ...cardSt, padding: 16, overflowX: "auto" }} className="ais-scrollbar">
                <div style={{ minWidth: 860 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
                    {DAYS_PL_SHORT.map((d) => (
                      <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 950, color: css.muted, textTransform: "uppercase", letterSpacing: ".08em", padding: "4px 0 8px" }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                    {weekDays.map((dateStr, dayIdx) => {
                      const isWeekend = dayIdx >= 5;
                      const isToday = dateStr === todayIsoVal;
                      const dayItems = itemsByDate[dateStr] || [];
                      const dayNum = new Date(`${dateStr}T00:00:00`).getDate();

                      return (
                        <div
                          key={dateStr}
                          style={{
                            minHeight: 122,
                            borderRadius: 14,
                            border: isToday ? `1.5px solid ${css.info}` : `1px solid ${css.border}`,
                            background: isWeekend ? css.surfaceSoft : css.surface,
                            padding: 10,
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 950, color: isToday ? css.info : css.muted, marginBottom: 8 }}>{dayNum}</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            {dayItems.slice(0, 4).map((item, ii) => {
                              const p = platformInfo(item.platform);
                              return (
                                <div
                                  key={`${dateStr}-${ii}`}
                                  className="ais-row"
                                  onClick={() => setExpandedPost(expandedPost === item.id ? null : item.id ?? null)}
                                  style={{ display: "flex", alignItems: "center", gap: 5, borderRadius: 8, padding: "5px 7px", background: `${p.color}14`, cursor: "pointer" }}
                                >
                                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                                  <div style={{ color: p.color, fontSize: 10, fontWeight: 900, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {p.short} · {item.time}
                                  </div>
                                </div>
                              );
                            })}
                            {dayItems.length > 4 && <div style={{ color: css.muted, fontSize: 10, padding: "2px 7px" }}>+{dayItems.length - 4} więcej</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* Timeline */}
            {viewMode === "timeline" && (
              <section style={{ display: "grid", gap: 8 }}>
                {currentWeekItems.length === 0 && (
                  <div style={{ ...cardSt, padding: 24, textAlign: "center", color: css.muted, fontSize: 13 }}>Brak pozycji w tygodniu {activeWeek}.</div>
                )}

                {currentWeekItems.map((item) => {
                  const gIdx = globalIndexOf(item);
                  const p = platformInfo(item.platform);
                  const isExpanded = expandedPost === item.id;
                  const kindLabel = CONTENT_KINDS.find((k) => k.id === item.content_kind)?.name || item.content_kind;

                  return (
                    <div key={item.id} style={{ ...cardSt, overflow: "hidden" }}>
                      <div
                        className="ais-row"
                        onClick={() => setExpandedPost(isExpanded ? null : item.id ?? null)}
                        style={{ display: "grid", gridTemplateColumns: "86px auto 1fr auto auto", alignItems: "center", gap: 12, padding: "13px 16px", cursor: "pointer" }}
                      >
                        <div style={{ color: css.muted, fontSize: 11, fontWeight: 850, whiteSpace: "nowrap" }}>
                          {formatDatePL(item.date)}
                          <br />
                          <span style={{ color: css.faint }}>{item.time}</span>
                        </div>
                        <PlatformBadge platform={item.platform} dark={dark} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: css.text, fontSize: 13, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                          <div style={{ color: css.muted, fontSize: 11, marginTop: 3 }}>{kindLabel}{item.angle ? ` · ${item.angle}` : ""}</div>
                        </div>
                        <StatusBadge status={item.status} dark={dark} />
                        <ChevronRight size={15} color={css.faint} style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
                      </div>

                      {isExpanded && (
                        <div style={{ borderTop: `1px solid ${css.border}`, padding: 16, display: "grid", gap: 12 }}>
                          <div style={{ background: css.aiBg, border: `1px solid ${css.aiBorder}`, borderRadius: 15, padding: 12 }}>
                            <div style={{ color: css.aiText, fontSize: 10, fontWeight: 950, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>
                              Dlaczego AI wybrało ten termin?
                            </div>
                            <div style={{ color: css.text, fontSize: 12, lineHeight: 1.65 }}>{item.source_recommendation || "Brak uzasadnienia — warto wygenerować strategię ponownie z timingInsights."}</div>
                          </div>

                          <div className="ais-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <label style={{ display: "grid", gap: 5 }}>
                              <span style={{ color: css.muted, fontSize: 10, fontWeight: 950, textTransform: "uppercase", letterSpacing: ".08em" }}>{text("Tytuł", "Title")}</span>
                              <input className="ais-input" value={item.title} onChange={(e) => updatePlanItem(gIdx, { title: e.target.value })} style={inputSt} />
                            </label>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              <label style={{ display: "grid", gap: 5 }}>
                                <span style={{ color: css.muted, fontSize: 10, fontWeight: 950, textTransform: "uppercase", letterSpacing: ".08em" }}>{text("Data", "Date")}</span>
                                <input className="ais-input" type="date" value={item.date} onChange={(e) => updatePlanItem(gIdx, { date: e.target.value })} style={inputSt} />
                              </label>
                              <label style={{ display: "grid", gap: 5 }}>
                                <span style={{ color: css.muted, fontSize: 10, fontWeight: 950, textTransform: "uppercase", letterSpacing: ".08em" }}>{text("Godz.", "Time")}</span>
                                <input className="ais-input" type="time" value={item.time} onChange={(e) => updatePlanItem(gIdx, { time: e.target.value })} style={inputSt} />
                              </label>
                            </div>
                          </div>

                          <div className="ais-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <label style={{ display: "grid", gap: 5 }}>
                              <span style={{ color: css.muted, fontSize: 10, fontWeight: 950, textTransform: "uppercase", letterSpacing: ".08em" }}>{text("Platforma", "Platform")}</span>
                              <select className="ais-input" value={item.platform} onChange={(e) => updatePlanItem(gIdx, { platform: e.target.value as Platform })} style={inputSt}>
                                {PLATFORMS.map((pp) => <option key={pp.id} value={pp.id}>{pp.name}</option>)}
                              </select>
                            </label>
                            <label style={{ display: "grid", gap: 5 }}>
                              <span style={{ color: css.muted, fontSize: 10, fontWeight: 950, textTransform: "uppercase", letterSpacing: ".08em" }}>{text("Rodzaj", "Type")}</span>
                              <select className="ais-input" value={item.content_kind} onChange={(e) => updatePlanItem(gIdx, { content_kind: e.target.value as ContentKind })} style={inputSt}>
                                {CONTENT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                              </select>
                            </label>
                          </div>

                          <label style={{ display: "grid", gap: 5 }}>
                            <span style={{ color: css.muted, fontSize: 10, fontWeight: 950, textTransform: "uppercase", letterSpacing: ".08em" }}>{text("Opis / notatki", "Description / notes")}</span>
                            <textarea className="ais-input" value={item.description} onChange={(e) => updatePlanItem(gIdx, { description: e.target.value })} style={{ ...inputSt, minHeight: 94, resize: "vertical", lineHeight: 1.65 }} />
                          </label>

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                            <button type="button" style={btnGhost} onClick={() => updatePlanItem(gIdx, { status: item.status === "done" ? "planned" : "done" })}>
                              {item.status === "done" ? "Cofnij gotowe" : "Oznacz gotowe"}
                            </button>
                            <button type="button" style={btnPrimary} onClick={() => addItemToSchedule(item, gIdx)} disabled={item.status === "scheduled"}>
                              <Clock3 size={14} />
                              {item.status === "scheduled" ? "Już w harmonogramie" : "Dodaj do harmonogramu"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            )}

            {/* 4. Quality control */}
            <section style={{ background: css.aiBg, border: `1px solid ${css.aiBorder}`, boxShadow: css.aiGlow, borderRadius: 20, padding: 18 }}>
              <SectionLabel color={css.aiText}>{text("Kontrola jakości strategii", "Strategy quality check")}</SectionLabel>
              <div className="ais-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <h4 style={{ color: css.text, margin: "0 0 10px", fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 500 }}>{text("Brakujące dane", "Missing data")}</h4>
                  <div style={{ display: "grid", gap: 8 }}>
                    {strategy.missing_data.length ? strategy.missing_data.map((item, i) => (
                      <div key={i} style={{ background: css.surface, border: `1px solid ${css.border}`, borderRadius: 13, padding: 11, color: css.muted, fontSize: 12, lineHeight: 1.55 }}>
                        {item}
                      </div>
                    )) : (
                      <div style={{ color: css.muted, fontSize: 12 }}>{text("AI nie zgłosiło braków. Sprawdź jednak, czy timingInsights ma wystarczającą próbę na każdej platformie.", "AI reported no missing data. Still, verify that timingInsights has a sufficient sample for every platform.")}</div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 style={{ color: css.text, margin: "0 0 10px", fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 500 }}>{text("Założenia AI", "AI assumptions")}</h4>
                  <div style={{ display: "grid", gap: 8 }}>
                    {strategy.assumptions.length ? strategy.assumptions.map((item, i) => (
                      <div key={i} style={{ background: css.surface, border: `1px solid ${css.border}`, borderRadius: 13, padding: 11, color: css.muted, fontSize: 12, lineHeight: 1.55 }}>
                        {item}
                      </div>
                    )) : (
                      <div style={{ color: css.muted, fontSize: 12 }}>{text("Brak zapisanych założeń. To dobry znak, jeśli dane faktycznie są kompletne.", "No assumptions were recorded. This is a good sign if the source data is truly complete.")}</div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
