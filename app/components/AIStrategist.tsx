"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Wand2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

const PLATFORMS: { id: Platform; name: string; color: string; icon: string }[] = [
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2", icon: "LI" },
  { id: "instagram", name: "Instagram", color: "#E1306C", icon: "IG" },
  { id: "tiktok", name: "TikTok", color: "#ffffff", icon: "TT" },
  { id: "youtube", name: "YouTube", color: "#FF0033", icon: "YT" },
  { id: "facebook", name: "Facebook", color: "#1877F2", icon: "FB" },
  { id: "blog", name: "Blog", color: "#22C55E", icon: "BL" },
  { id: "spotify", name: "Spotify", color: "#1DB954", icon: "SP" },
];

const CONTENT_KINDS: { id: ContentKind; name: string }[] = [
  { id: "content", name: "Post / content" },
  { id: "short", name: "Short / rolka" },
  { id: "video", name: "Video" },
  { id: "creative", name: "Grafika / kreacja" },
  { id: "blog", name: "Blog" },
  { id: "podcast", name: "Podcast" },
];

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
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

function addDaysIso(dateIso: string, days: number) {
  const date = new Date(`${dateIso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDatePL(dateIso: string) {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString("pl-PL", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function platformInfo(platform: Platform) {
  return PLATFORMS.find((item) => item.id === platform) || PLATFORMS[0];
}

function parseStrategy(raw: unknown, fallbackStart: string): AiStrategyResult {
  const value = raw as Partial<AiStrategyResult>;

  const start = value.period_start || fallbackStart;
  const end = value.period_end || addDaysIso(start, 27);

  return {
    strategy_name: value.strategy_name || "Strategia contentu AI",
    period_start: start,
    period_end: end,
    main_goal: value.main_goal || "",
    positioning: value.positioning || "",
    ai_summary: value.ai_summary || "",
    content_pillars: safeArray(value.content_pillars).map((pillar) => ({
      name: pillar.name || "Filar contentu",
      description: pillar.description || "",
      platforms: safeArray(pillar.platforms),
    })),
    platform_distribution: safeArray(value.platform_distribution).map((row) => ({
      platform: row.platform || "linkedin",
      posts_per_month: Number(row.posts_per_month || 0),
      cadence: row.cadence || "",
      best_days: safeArray(row.best_days),
      best_hours: safeArray(row.best_hours),
      reasoning: row.reasoning || "",
    })),
    weekly_plan: safeArray(value.weekly_plan).map((item, index) => ({
      id: item.id || `ai-${index}`,
      week: Number(item.week || Math.floor(index / 7) + 1),
      date: item.date || addDaysIso(start, index),
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
    today_notification: value.today_notification || "",
    strategy_alerts: safeArray(value.strategy_alerts),
    assumptions: safeArray(value.assumptions),
    missing_data: safeArray(value.missing_data),
  };
}

function parseSavedStrategy(strategyRow: any, itemRows: any[]): AiStrategyResult {
  const sourceContext = strategyRow?.source_context || {};
  const assumptions = Array.isArray(sourceContext.assumptions) ? sourceContext.assumptions : [];
  const missingData = Array.isArray(sourceContext.missing_data) ? sourceContext.missing_data : [];

  return {
    strategy_name: strategyRow?.title || "Strategia contentu AI",
    period_start: strategyRow?.period_start || monthStartIso(),
    period_end: strategyRow?.period_end || addDaysIso(strategyRow?.period_start || monthStartIso(), 27),
    main_goal: strategyRow?.main_goal || "",
    positioning: strategyRow?.positioning || "",
    ai_summary: strategyRow?.ai_summary || "",
    content_pillars: [],
    platform_distribution: [],
    weekly_plan: itemRows.map((item: any, index: number) => ({
      id: item.id || `saved-${index}`,
      db_id: item.id,
      week: Number(item.week || Math.floor(index / 7) + 1),
      date: item.publish_date || addDaysIso(strategyRow?.period_start || monthStartIso(), index),
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
    assumptions,
    missing_data: missingData,
  };
}

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

OKRES:
${periodStart} - ${periodEnd}

PLATFORMY WYBRANE DO STRATEGII:
${selectedPlatforms.join(", ")}

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
    {
      "name": "filar",
      "description": "opis filaru",
      "platforms": ["linkedin", "instagram"]
    }
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
  "strategy_alerts": [
    "ważna sugestia strategiczna"
  ],
  "assumptions": [
    "założenie, jeśli brakuje danych"
  ],
  "missing_data": [
    "jakich danych brakuje do większej pewności"
  ]
}

Utwórz plan na minimum 20 pozycji i maksimum 40 pozycji na 4 tygodnie.
  `.trim();
}

export default function AIStrategist({
  dark = true,
  workspaceId = "contentiq",
}: {
  dark?: boolean;
  workspaceId?: string;
}) {
  const supabase = createClient();

  const css = dark
    ? {
        bg: "#1A2233",
        surface: "#111111",
        surfaceSoft: "#0B0B0C",
        text: "#F5F5F5",
        muted: "#C9CED8",
        border: "rgba(255,255,255,0.10)",
        accent: "#8E443D",
        aiBg: "rgba(109, 40, 217, 0.16)",
        aiBgSoft: "rgba(147, 51, 234, 0.12)",
        aiBorder: "rgba(192, 132, 252, 0.55)",
        aiText: "#D8B4FE",
        aiGlow: "0 0 28px rgba(168, 85, 247, 0.28)",
        aiIcon: "#F0ABFC",
        ok: "#22c55e",
        warning: "#f59e0b",
      }
    : {
        bg: "#FFFFFF",
        surface: "#FFFFFF",
        surfaceSoft: "#F7F2EF",
        text: "#111111",
        muted: "#71717A",
        border: "rgba(35,31,32,0.14)",
        accent: "#231F20",
        aiBg: "rgba(124, 58, 237, 0.10)",
        aiBgSoft: "rgba(245, 243, 255, 0.95)",
        aiBorder: "rgba(124, 58, 237, 0.34)",
        aiText: "#6D28D9",
        aiGlow: "0 0 26px rgba(124, 58, 237, 0.18)",
        aiIcon: "#A855F7",
        ok: "#16a34a",
        warning: "#d97706",
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
  const [contextPack, setContextPack] = useState<ContextPack>({
    drafts: [],
    templates: [],
    inspirations: [],
    scheduled: [],
    connections: [],
    posts: [],
    accountStats: [],
    previousStrategies: [],
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

  const todaysItems = useMemo(() => {
    if (!strategy) return [];
    const today = todayIso();
    return strategy.weekly_plan.filter((item) => item.date === today);
  }, [strategy]);

  const weeks = useMemo(() => {
    if (!strategy) return [];
    return [1, 2, 3, 4].map((week) => ({
      week,
      items: strategy.weekly_plan
        .filter((item) => item.week === week)
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    }));
  }, [strategy]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 3200);
  }

  function togglePlatform(platform: Platform) {
    setSelectedPlatforms((prev) => {
      if (prev.includes(platform)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== platform);
      }

      return [...prev, platform];
    });
  }

  function updatePlanItem(index: number, patch: Partial<StrategyDayItem>) {
    setStrategy((current) => {
      if (!current) return current;

      const next = [...current.weekly_plan];
      next[index] = { ...next[index], ...patch };

      return {
        ...current,
        weekly_plan: next,
      };
    });
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
      .insert({
        user_id: userId,
        name: "ANM ContentIQ",
        type: "Content",
        slug: workspaceId,
      })
      .select("id")
      .single();

    if (error || !created?.id) {
      throw new Error(error?.message || "Nie uda?o si? utworzy? workspace.");
    }

    setWorkspaceUuid(created.id as string);
    return created.id as string;
  }

  async function safeQuery<T>(label: string, query: PromiseLike<{ data: T[] | null; error: unknown }>) {
    try {
      const { data, error } = await query;
      if (error) {
        console.warn(`AI Strategist: ${label} query skipped`, error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn(`AI Strategist: ${label} query failed`, err);
      return [];
    }
  }

  async function loadSavedStrategy(wsId?: string) {
    setLoadingSavedStrategy(true);

    try {
      const resolvedWorkspaceId = wsId || (await getOrCreateWorkspaceUuid());

      const { data: strategyRow, error: strategyError } = await supabase
        .schema("contentiq")
        .from("content_strategies")
        .select("id,title,period_start,period_end,main_goal,positioning,ai_summary,source_context,status,updated_at,created_at")
        .eq("workspace_id", resolvedWorkspaceId)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (strategyError) throw new Error(strategyError.message);

      if (!strategyRow?.id) {
        setSavedStrategyId(null);
        return;
      }

      const { data: items, error: itemsError } = await supabase
        .schema("contentiq")
        .from("content_strategy_items")
        .select("id,week,publish_date,publish_time,platform,content_kind,title,angle,format,description,source_recommendation,status,updated_at,created_at")
        .eq("strategy_id", strategyRow.id)
        .order("publish_date", { ascending: true })
        .order("publish_time", { ascending: true });

      if (itemsError) throw new Error(itemsError.message);

      setSavedStrategyId(strategyRow.id as string);
      setStrategy(parseSavedStrategy(strategyRow, (items as any[]) || []));
      setPeriodStart((strategyRow.period_start as string) || monthStartIso());
      showToast("Wczytano aktywn? strategi?");
    } catch (err) {
      console.warn("AI Strategist: saved strategy load skipped", err);
    } finally {
      setLoadingSavedStrategy(false);
    }
  }

  useEffect(() => {
    void loadSavedStrategy();
  }, [workspaceId]);

  async function loadContext() {
    setLoadingContext(true);
    setError("");

    try {
      const wsId = await getOrCreateWorkspaceUuid();

      const drafts = await safeQuery(
        "drafts",
        supabase
          .schema("contentiq")
          .from("content_drafts")
          .select("id,title,body,topic,content_type,target_platforms,ai_score,ai_feedback,status,created_at")
          .eq("workspace_id", wsId)
          .order("created_at", { ascending: false })
          .limit(80)
      );

      const templates = (drafts as any[]).filter((item) => item.status === "template");
      const activeDrafts = (drafts as any[]).filter((item) => item.status !== "template");

      const inspirations = await safeQuery(
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

      const scheduled = await safeQuery(
        "scheduled_posts",
        supabase
          .schema("contentiq")
          .from("scheduled_posts")
          .select("id,platform,scheduled_at,status,draft_id,created_at")
          .order("scheduled_at", { ascending: false })
          .limit(80)
      );

      const connections = await safeQuery(
        "connections",
        supabase
          .schema("contentiq")
          .from("platform_connections")
          .select("id,platform,connected,account_name,created_at")
          .eq("workspace_id", wsId)
      );

      const posts = await safeQuery(
        "posts",
        supabase
          .schema("contentiq")
          .from("posts")
          .select("id,connection_id,platform_post_id,title,content,post_type,url,published_at,reach,impressions,likes,comments,shares,saves,clicks,ai_score,ai_summary,fetched_at")
          .order("published_at", { ascending: false })
          .limit(120)
      );

      const accountStats = await safeQuery(
        "account_stats",
        supabase
          .schema("contentiq")
          .from("account_stats")
          .select("id,connection_id,followers,following,total_posts,avg_reach,avg_engagement,ai_score,recorded_at")
          .order("recorded_at", { ascending: false })
          .limit(80)
      );

      const previousStrategies = await safeQuery(
        "content_strategies",
        supabase
          .schema("contentiq")
          .from("content_strategies")
          .select("id,title,period_start,period_end,main_goal,positioning,ai_summary,status,created_at,updated_at")
          .eq("workspace_id", wsId)
          .order("updated_at", { ascending: false })
          .limit(8)
      );

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
      showToast("Dane do strategii zosta?y pobrane");
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

      const prompt = buildStrategyPrompt({
        userBrief,
        periodStart,
        selectedPlatforms,
        contextPack: pack,
      });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "strategy",
          prompt,
          historicalData: {
            periodStart,
            periodEnd: addDaysIso(periodStart, 27),
            selectedPlatforms,
            contextPack: pack,
          },
        }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || "B??d generowania strategii AI.");
      }

      const parsed = json.data || JSON.parse(cleanJsonAnswer(json.answer || "{}"));
      const nextStrategy = parseStrategy(parsed, periodStart);

      setSavedStrategyId(null);
      setStrategy(nextStrategy);
      showToast("Strategia AI zosta?a wygenerowana");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "AI nie zwr?ci?o poprawnej strategii. Spr?buj skr?ci? opis albo pobierz dane ponownie."
      );
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
      const strategyPayload = {
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
          assumptions: strategy.assumptions,
          missing_data: strategy.missing_data,
        },
        status: "active",
        updated_at: new Date().toISOString(),
      };

      const strategySave = savedStrategyId
        ? await supabase
            .schema("contentiq")
            .from("content_strategies")
            .update(strategyPayload)
            .eq("id", savedStrategyId)
            .select("id")
            .single()
        : await supabase
            .schema("contentiq")
            .from("content_strategies")
            .insert(strategyPayload)
            .select("id")
            .single();

      if (strategySave.error || !strategySave.data?.id) {
        throw new Error(strategySave.error?.message || "Nie uda?o si? zapisa? strategii.");
      }

      const strategyId = strategySave.data.id as string;

      if (savedStrategyId) {
        const { error: deleteItemsError } = await supabase
          .schema("contentiq")
          .from("content_strategy_items")
          .delete()
          .eq("strategy_id", strategyId);

        if (deleteItemsError) throw new Error(deleteItemsError.message);
      }

      const { error: itemsError } = await supabase
        .schema("contentiq")
        .from("content_strategy_items")
        .insert(
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

      if (itemsError) throw new Error(itemsError.message);

      setSavedStrategyId(strategyId);
      await loadSavedStrategy(wsId);
      showToast("Strategia zosta?a zapisana i b?dzie dost?pna po od?wie?eniu");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function createDraftFromStrategyItem(item: StrategyDayItem) {
    const wsId = await getOrCreateWorkspaceUuid();

    const body = [
      `Kąt: ${item.angle}`,
      `Format: ${item.format}`,
      item.description,
      item.source_recommendation ? `Źródło sugestii: ${item.source_recommendation}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const { data, error: draftError } = await supabase
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

    if (draftError || !data?.id) {
      throw new Error(draftError?.message || "Nie udało się utworzyć draftu.");
    }

    return data.id as string;
  }

  async function getConnectionId(platform: Platform) {
    const wsId = await getOrCreateWorkspaceUuid();

    const { data, error: connError } = await supabase
      .schema("contentiq")
      .from("platform_connections")
      .select("id")
      .eq("workspace_id", wsId)
      .eq("platform", platform)
      .eq("connected", true)
      .limit(1)
      .maybeSingle();

    if (connError) throw new Error(connError.message);
    if (!data?.id) throw new Error(`Brak podłączonego konta dla platformy ${platform}.`);

    return data.id as string;
  }

  async function addItemToSchedule(item: StrategyDayItem, index: number) {
    setError("");

    try {
      const draftId = await createDraftFromStrategyItem(item);
      const connectionId = await getConnectionId(item.platform);
      const scheduledAt = new Date(`${item.date}T${item.time}:00`).toISOString();

      const { error: scheduleError } = await supabase
        .schema("contentiq")
        .from("scheduled_posts")
        .insert({
          draft_id: draftId,
          connection_id: connectionId,
          platform: item.platform,
          scheduled_at: scheduledAt,
          status: "scheduled",
        });

      if (scheduleError) throw new Error(scheduleError.message);

      if (item.db_id) {
        const { error: itemStatusError } = await supabase
          .schema("contentiq")
          .from("content_strategy_items")
          .update({
            status: "scheduled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.db_id);

        if (itemStatusError) throw new Error(itemStatusError.message);
      }

      updatePlanItem(index, { status: "scheduled" });
      showToast("✓ Dodano pozycję strategii do harmonogramu");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const inputStyle: CSSProperties = {
    width: "100%",
    borderRadius: 12,
    border: `1px solid ${css.border}`,
    background: css.surfaceSoft,
    color: css.text,
    padding: 11,
    outline: "none",
    fontFamily: "inherit",
    fontSize: 12,
  };

  const buttonPrimary: CSSProperties = {
    border: "none",
    borderRadius: 14,
    padding: "12px 14px",
    background: dark ? "#ffffff" : "#111111",
    color: dark ? "#050505" : "#ffffff",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
    fontFamily: "inherit",
  };

  return (
    <div style={{ fontFamily: "var(--font-body)", color: css.text }}>
      <style>{`
        .ai-strategy-grid {
          display: grid;
          grid-template-columns: 0.92fr 1.08fr;
          gap: 14px;
          align-items: start;
        }

        .ai-week-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        @media(max-width: 1080px) {
          .ai-strategy-grid,
          .ai-week-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 200,
            padding: "10px 16px",
            borderRadius: 12,
            background: "#052e16",
            color: "#22c55e",
            border: "1px solid #166534",
            fontSize: 13,
            fontWeight: 800,
            boxShadow: "0 18px 44px rgba(0,0,0,.35)",
          }}
        >
          {toast}
        </div>
      )}

      <div className="ai-strategy-grid">
        <section
          style={{
            background: css.surface,
            border: `1px solid ${css.border}`,
            borderRadius: 18,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: ".1em",
              color: css.aiText,
              marginBottom: 8,
            }}
          >
            AI Strateg
          </div>

          <h2
            style={{
              margin: "0 0 8px",
              color: css.text,
              fontSize: 30,
              lineHeight: 1.05,
              fontFamily: "var(--font-heading)",
              fontWeight: 400,
            }}
          >
            Centrum dowodzenia strategią contentu
          </h2>

          <p style={{ margin: "0 0 14px", color: css.muted, fontSize: 13, lineHeight: 1.7 }}>
            Opisz materiały, ofertę, cele i styl marki. AI pobierze dane z aplikacji,
            przejrzy szablony, inspiracje oraz harmonogram i ułoży miesięczny plan.
          </p>

          <label style={{ display: "grid", gap: 6, marginBottom: 13 }}>
            <span style={{ color: css.muted, fontSize: 11, fontWeight: 900 }}>
              Start strategii
            </span>
            <input
              type="date"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
              style={inputStyle}
            />
          </label>

          <div style={{ marginBottom: 13 }}>
            <div style={{ color: css.muted, fontSize: 11, fontWeight: 900, marginBottom: 8 }}>
              Platformy w strategii
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PLATFORMS.map((platform) => {
                const active = selectedPlatforms.includes(platform.id);

                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => togglePlatform(platform.id)}
                    style={{
                      borderRadius: 10,
                      border: `1px solid ${active ? platform.color : css.border}`,
                      background: active ? `${platform.color}18` : css.surfaceSoft,
                      color: active ? platform.color : css.muted,
                      padding: "8px 10px",
                      fontSize: 11,
                      fontWeight: 900,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {platform.name}
                  </button>
                );
              })}
            </div>
          </div>

          <label style={{ display: "grid", gap: 6, marginBottom: 13 }}>
            <span style={{ color: css.muted, fontSize: 11, fontWeight: 900 }}>
              Opis marki, contentu i materiałów
            </span>
            <textarea
              value={userBrief}
              onChange={(event) => setUserBrief(event.target.value)}
              placeholder="Opisz ofertę, grupę docelową, co już publikujesz, co się sprzedaje, jakie masz materiały, jakie są cele na miesiąc, które produkty/usługi są najważniejsze..."
              style={{
                ...inputStyle,
                minHeight: 190,
                resize: "vertical",
                lineHeight: 1.65,
              }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              type="button"
              onClick={loadContext}
              disabled={loadingContext}
              style={{
                borderRadius: 14,
                border: `1px solid ${css.aiBorder}`,
                background: css.aiBg,
                color: css.aiText,
                padding: "12px 14px",
                fontSize: 12,
                fontWeight: 900,
                cursor: loadingContext ? "not-allowed" : "pointer",
                opacity: loadingContext ? 0.6 : 1,
                fontFamily: "inherit",
              }}
            >
              {loadingContext ? "Pobieram dane..." : "Pobierz dane z aplikacji"}
            </button>

            <button
              type="button"
              onClick={generateStrategy}
              disabled={generating || selectedPlatforms.length === 0}
              style={{
                ...buttonPrimary,
                opacity: generating || selectedPlatforms.length === 0 ? 0.55 : 1,
                cursor: generating || selectedPlatforms.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {generating ? "AI tworzy strategię..." : "Wygeneruj strategię AI"}
            </button>
          </div>

          {contextLoaded && (
            <div
              style={{
                marginTop: 12,
                background: css.aiBg,
                border: `1px solid ${css.aiBorder}`,
                borderRadius: 14,
                padding: 12,
                color: css.muted,
                fontSize: 12,
                lineHeight: 1.7,
              }}
            >
              Dane pobrane: {contextPack.drafts.length} draftów,{" "}
              {contextPack.templates.length} szablonów,{" "}
              {contextPack.inspirations.length} inspiracji,{" "}
              {contextPack.scheduled.length} publikacji w harmonogramie.
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: 12,
                background: "#ef444414",
                border: "1px solid #ef444440",
                color: "#ef4444",
                borderRadius: 14,
                padding: 12,
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              {error}
            </div>
          )}
        </section>

        <section
          style={{
            background: css.aiBg,
            border: `1px solid ${css.aiBorder}`,
            boxShadow: css.aiGlow,
            color: css.text,
            borderRadius: 18,
            padding: 16,
            minHeight: 360,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              color: css.aiText,
              fontFamily: "var(--font-label)",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              marginBottom: 8,
            }}
          >
            <Wand2 size={15} color={css.aiIcon} />
            Powiadomienia strategiczne
          </div>

          {!strategy && (
            <div
              style={{
                minHeight: 260,
                borderRadius: 16,
                border: `1px dashed ${css.aiBorder}`,
                display: "grid",
                placeItems: "center",
                textAlign: "center",
                padding: 24,
              }}
            >
              <div>
                <Wand2 size={46} color={css.aiIcon} style={{ opacity: 0.28, marginBottom: 10 }} />
                <h3
                  style={{
                    margin: "0 0 8px",
                    color: css.text,
                    fontSize: 24,
                    fontFamily: "var(--font-heading)",
                    fontWeight: 400,
                  }}
                >
                  Tu pojawią się alerty AI
                </h3>
                <p style={{ margin: 0, color: css.muted, fontSize: 13, lineHeight: 1.7 }}>
                  AI pokaże, co masz publikować dziś i czy harmonogram zgadza się ze strategią.
                </p>
              </div>
            </div>
          )}

          {strategy && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  background: css.surface,
                  border: `1px solid ${css.border}`,
                  borderRadius: 14,
                  padding: 13,
                }}
              >
                <div style={{ color: css.aiText, fontSize: 10, fontWeight: 900, marginBottom: 6 }}>
                  DZISIAJ
                </div>
                <p style={{ margin: 0, color: css.text, fontSize: 13, lineHeight: 1.7 }}>
                  {strategy.today_notification ||
                    (todaysItems.length
                      ? `Dziś w strategii masz ${todaysItems.length} publikacji.`
                      : "Dziś strategia nie przewiduje publikacji albo harmonogram jest zgodny z planem.")}
                </p>
              </div>

              {todaysItems.length > 0 && (
                <div style={{ display: "grid", gap: 8 }}>
                  {todaysItems.map((item, index) => {
                    const p = platformInfo(item.platform);
                    return (
                      <div
                        key={`${item.date}-${item.platform}-${index}`}
                        style={{
                          background: css.surface,
                          border: `1px solid ${css.border}`,
                          borderRadius: 13,
                          padding: 11,
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ color: p.color, fontSize: 10, fontWeight: 900 }}>
                            {p.name} · {item.time}
                          </div>
                          <div style={{ color: css.text, fontSize: 13, fontWeight: 900, marginTop: 4 }}>
                            {item.title}
                          </div>
                        </div>
                        <span style={{ color: css.muted, fontSize: 11 }}>{item.status}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {strategy.strategy_alerts.map((alert, index) => (
                <div
                  key={`${alert}-${index}`}
                  style={{
                    background: css.aiBgSoft,
                    border: `1px solid ${css.aiBorder}`,
                    borderRadius: 13,
                    padding: 11,
                    color: css.text,
                    fontSize: 12,
                    lineHeight: 1.65,
                  }}
                >
                  {alert}
                </div>
              ))}

              <button
                type="button"
                onClick={saveStrategy}
                disabled={saving}
                style={{
                  ...buttonPrimary,
                  opacity: saving ? 0.6 : 1,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Zapisuję strategię..." : "Zapisz strategię jako aktywną"}
              </button>
            </div>
          )}
        </section>
      </div>

      {strategy && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <section
            style={{
              background: css.surface,
              border: `1px solid ${css.border}`,
              borderRadius: 18,
              padding: 16,
            }}
          >
            <div style={{ color: css.aiText, fontSize: 10, fontWeight: 900, marginBottom: 8 }}>
              STRATEGIA
            </div>

            <h2
              style={{
                margin: "0 0 8px",
                color: css.text,
                fontSize: 30,
                lineHeight: 1.05,
                fontFamily: "var(--font-heading)",
                fontWeight: 400,
              }}
            >
              {strategy.strategy_name}
            </h2>

            <p style={{ margin: "0 0 12px", color: css.muted, fontSize: 13, lineHeight: 1.7 }}>
              {strategy.ai_summary}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div
                style={{
                  background: css.surfaceSoft,
                  border: `1px solid ${css.border}`,
                  borderRadius: 14,
                  padding: 13,
                }}
              >
                <div style={{ color: css.accent, fontSize: 10, fontWeight: 900, marginBottom: 6 }}>
                  CEL
                </div>
                <p style={{ margin: 0, color: css.text, fontSize: 12, lineHeight: 1.7 }}>
                  {strategy.main_goal}
                </p>
              </div>

              <div
                style={{
                  background: css.surfaceSoft,
                  border: `1px solid ${css.border}`,
                  borderRadius: 14,
                  padding: 13,
                }}
              >
                <div style={{ color: css.accent, fontSize: 10, fontWeight: 900, marginBottom: 6 }}>
                  POZYCJONOWANIE
                </div>
                <p style={{ margin: 0, color: css.text, fontSize: 12, lineHeight: 1.7 }}>
                  {strategy.positioning}
                </p>
              </div>
            </div>
          </section>

          <section
            style={{
              background: css.surface,
              border: `1px solid ${css.border}`,
              borderRadius: 18,
              padding: 16,
            }}
          >
            <div style={{ color: css.aiText, fontSize: 10, fontWeight: 900, marginBottom: 12 }}>
              ROZKŁAD PLATFORM
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 }}>
              {strategy.platform_distribution.map((row) => {
                const p = platformInfo(row.platform);
                return (
                  <div
                    key={row.platform}
                    style={{
                      background: css.surfaceSoft,
                      border: `1px solid ${css.border}`,
                      borderRadius: 14,
                      padding: 13,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ color: p.color, fontSize: 11, fontWeight: 900 }}>{p.name}</span>
                      <span style={{ color: css.text, fontSize: 22, fontWeight: 900 }}>
                        {row.posts_per_month}
                      </span>
                    </div>
                    <div style={{ color: css.muted, fontSize: 11, lineHeight: 1.6, marginTop: 6 }}>
                      {row.cadence}
                      <br />
                      Dni: {row.best_days.join(", ") || "brak"}
                      <br />
                      Godziny: {row.best_hours.join(", ") || "brak"}
                    </div>
                    <p style={{ margin: "8px 0 0", color: css.text, fontSize: 12, lineHeight: 1.6 }}>
                      {row.reasoning}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section
            style={{
              background: css.surface,
              border: `1px solid ${css.border}`,
              borderRadius: 18,
              padding: 16,
            }}
          >
            <div style={{ color: css.aiText, fontSize: 10, fontWeight: 900, marginBottom: 12 }}>
              PLAN MIESIĘCZNY DO EDYCJI
            </div>

            <div className="ai-week-grid">
              {weeks.map(({ week, items }) => (
                <div
                  key={week}
                  style={{
                    background: css.surfaceSoft,
                    border: `1px solid ${css.border}`,
                    borderRadius: 16,
                    padding: 13,
                  }}
                >
                  <h3 style={{ margin: "0 0 10px", color: css.text, fontSize: 16 }}>
                    Tydzień {week}
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {items.map((item) => {
                      const globalIndex = strategy.weekly_plan.findIndex(
                        (row) =>
                          row.id === item.id ||
                          (row.date === item.date &&
                            row.time === item.time &&
                            row.platform === item.platform &&
                            row.title === item.title)
                      );
                      const p = platformInfo(item.platform);

                      return (
                        <div
                          key={`${item.id}-${item.date}-${item.platform}-${item.title}`}
                          style={{
                            background: css.surface,
                            border: `1px solid ${css.border}`,
                            borderRadius: 14,
                            padding: 11,
                            display: "grid",
                            gap: 8,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <span style={{ color: p.color, fontSize: 10, fontWeight: 900 }}>
                              {p.name} · {formatDatePL(item.date)}
                            </span>
                            <span style={{ color: css.muted, fontSize: 10 }}>{item.status}</span>
                          </div>

                          <input
                            value={item.title}
                            onChange={(event) => updatePlanItem(globalIndex, { title: event.target.value })}
                            style={inputStyle}
                          />

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <input
                              type="date"
                              value={item.date}
                              onChange={(event) => updatePlanItem(globalIndex, { date: event.target.value })}
                              style={inputStyle}
                            />
                            <input
                              type="time"
                              value={item.time}
                              onChange={(event) => updatePlanItem(globalIndex, { time: event.target.value })}
                              style={inputStyle}
                            />
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <select
                              value={item.platform}
                              onChange={(event) =>
                                updatePlanItem(globalIndex, { platform: event.target.value as Platform })
                              }
                              style={inputStyle}
                            >
                              {PLATFORMS.map((platform) => (
                                <option key={platform.id} value={platform.id}>
                                  {platform.name}
                                </option>
                              ))}
                            </select>

                            <select
                              value={item.content_kind}
                              onChange={(event) =>
                                updatePlanItem(globalIndex, {
                                  content_kind: event.target.value as ContentKind,
                                })
                              }
                              style={inputStyle}
                            >
                              {CONTENT_KINDS.map((kind) => (
                                <option key={kind.id} value={kind.id}>
                                  {kind.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <textarea
                            value={item.description}
                            onChange={(event) =>
                              updatePlanItem(globalIndex, { description: event.target.value })
                            }
                            style={{ ...inputStyle, minHeight: 80, resize: "vertical", lineHeight: 1.6 }}
                          />

                          <button
                            type="button"
                            onClick={() => addItemToSchedule(item, globalIndex)}
                            disabled={item.status === "scheduled"}
                            style={{
                              borderRadius: 12,
                              border: `1px solid ${css.aiBorder}`,
                              background: item.status === "scheduled" ? css.surfaceSoft : css.aiBg,
                              color: item.status === "scheduled" ? css.muted : css.aiText,
                              padding: "10px 12px",
                              fontSize: 11,
                              fontWeight: 900,
                              cursor: item.status === "scheduled" ? "not-allowed" : "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            {item.status === "scheduled"
                              ? "Już w harmonogramie"
                              : "Dodaj do harmonogramu"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {(strategy.missing_data.length > 0 || strategy.assumptions.length > 0) && (
            <section
              style={{
                background: css.aiBg,
                border: `1px solid ${css.aiBorder}`,
                borderRadius: 18,
                padding: 16,
              }}
            >
              <div style={{ color: css.aiText, fontSize: 10, fontWeight: 900, marginBottom: 10 }}>
                KONTROLA JAKOŚCI STRATEGII
              </div>

              {strategy.missing_data.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <h4 style={{ margin: "0 0 6px", color: css.text, fontSize: 14 }}>
                    Brakujące dane
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: 18, color: css.muted, fontSize: 12, lineHeight: 1.7 }}>
                    {strategy.missing_data.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {strategy.assumptions.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 6px", color: css.text, fontSize: 14 }}>
                    Założenia AI
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: 18, color: css.muted, fontSize: 12, lineHeight: 1.7 }}>
                    {strategy.assumptions.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
