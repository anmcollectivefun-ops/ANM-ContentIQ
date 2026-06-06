"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Platform =
  | "instagram"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "blog"
  | "spotify";

interface BrandVoiceRow {
  tone: string | null;
  style: string | null;
  target_audience: string | null;
  keywords: string[] | null;
  avoid_words: string[] | null;
  brand_values: string | null;
  cta_style: string | null;
}

interface DraftRow {
  id: string;
  title: string | null;
  body: string | null;
  content_type: string | null;
  target_platforms: string[] | null;
  ai_score: number | null;
  status: string | null;
  created_at: string | null;
}

interface ConnectionRow {
  id: string;
  platform: Platform;
}

interface PostRow {
  connection_id: string;
  title: string | null;
  content: string | null;
  post_type: string | null;
  reach: number | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  clicks: number | null;
  ai_score: number | null;
  published_at: string | null;
}

interface StyleProfileRow {
  summary: string | null;
  strengths: string[] | null;
  avoid_patterns: string[] | null;
  platform_notes: Record<string, string> | null;
  experiment_queue: string[] | null;
  confidence: number | null;
  updated_at: string | null;
}

interface LearningRow {
  id: string;
  type: string;
  platform: Platform | null;
  insight: string;
  confidence: number | null;
  created_at: string | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const PLATFORMS: { id: Platform; name: string; color: string; icon: string }[] = [
  { id: "instagram", name: "Instagram", color: "#E1306C", icon: "IG" },
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2", icon: "LI" },
  { id: "tiktok", name: "TikTok", color: "#111827", icon: "TT" },
  { id: "youtube", name: "YouTube", color: "#FF0000", icon: "YT" },
  { id: "facebook", name: "Facebook", color: "#1877F2", icon: "FB" },
  { id: "blog", name: "Blog", color: "#22C55E", icon: "BL" },
  { id: "spotify", name: "Spotify", color: "#1DB954", icon: "SP" },
];

const QUICK_PROMPTS = [
  "Co daje mi najlepszy zasięg i dlaczego?",
  "Napisz mi post na Instagram bazując na moim stylu",
  "Który temat warto teraz rozwijać?",
  "Co powinienem przestać robić?",
  "Zaproponuj 3 pomysły na content na ten tydzień",
  "Porównaj moje platformy — gdzie tracę potencjał?",
];

function safeArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

function postReach(post: PostRow) {
  return Number(post.reach || post.impressions || 0);
}

function postEngagement(post: PostRow) {
  return (
    Number(post.likes || 0) +
    Number(post.comments || 0) +
    Number(post.shares || 0) +
    Number(post.saves || 0) +
    Number(post.clicks || 0)
  );
}

function engagementRate(post: PostRow) {
  const reach = postReach(post);
  if (!reach) return 0;
  return (postEngagement(post) / reach) * 100;
}

function shortText(value: string | null | undefined, fallback: string) {
  const text = (value || "").trim();
  return text.length > 0 ? text : fallback;
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export default function AIPartner({
  dark = true,
  workspaceId,
}: {
  dark?: boolean;
  workspaceId: string;
}) {
  const supabase = createClient();
  const [workspaceUuid, setWorkspaceUuid] = useState("");
  const [brandVoice, setBrandVoice] = useState<BrandVoiceRow | null>(null);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [profile, setProfile] = useState<StyleProfileRow | null>(null);
  const [learnings, setLearnings] = useState<LearningRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tab, setTab] = useState<"overview" | "chat" | "platforms">("overview");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [aiProvider, setAiProvider] = useState<"deepseek" | "gemini">("deepseek");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const css = dark
    ? {
        bg: "#0f1117",
        surface: "#16191f",
        card: "#1c1f28",
        text: "#f0f2f5",
        muted: "#8a9bb0",
        border: "rgba(255,255,255,0.07)",
        accent: "#c97c5d",
        accentSoft: "rgba(201,124,93,0.12)",
        green: "#4ade80",
        greenSoft: "rgba(74,222,128,0.1)",
        amber: "#fbbf24",
        amberSoft: "rgba(251,191,36,0.1)",
        blue: "#60a5fa",
        blueSoft: "rgba(96,165,250,0.1)",
        tabActive: "#c97c5d",
        tabActiveBg: "rgba(201,124,93,0.12)",
        inputBg: "#0f1117",
        pill: "rgba(255,255,255,0.06)",
      }
    : {
        bg: "#f9f7f5",
        surface: "#ffffff",
        card: "#f3f0ed",
        text: "#1a1714",
        muted: "#6b6560",
        border: "rgba(0,0,0,0.08)",
        accent: "#9b4f2e",
        accentSoft: "rgba(155,79,46,0.08)",
        green: "#16a34a",
        greenSoft: "rgba(22,163,74,0.08)",
        amber: "#d97706",
        amberSoft: "rgba(217,119,6,0.08)",
        blue: "#2563eb",
        blueSoft: "rgba(37,99,235,0.08)",
        tabActive: "#9b4f2e",
        tabActiveBg: "rgba(155,79,46,0.08)",
        inputBg: "#f3f0ed",
        pill: "rgba(0,0,0,0.05)",
      };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const { data: ws, error: wsError } = await supabase
          .schema("contentiq")
          .from("workspaces")
          .select("id")
          .eq("slug", workspaceId)
          .single();

        if (wsError || !ws?.id) throw new Error(wsError?.message || "Nie znaleziono workspace.");

        const wsId = ws.id as string;
        if (!cancelled) setWorkspaceUuid(wsId);

        const [{ data: bv }, { data: draftRows }, { data: connRows }] =
          await Promise.all([
            supabase.schema("contentiq").from("brand_voice")
              .select("tone,style,target_audience,keywords,avoid_words,brand_values,cta_style")
              .eq("workspace_id", wsId).maybeSingle(),
            supabase.schema("contentiq").from("content_drafts")
              .select("id,title,body,content_type,target_platforms,ai_score,status,created_at")
              .eq("workspace_id", wsId).order("created_at", { ascending: false }).limit(80),
            supabase.schema("contentiq").from("platform_connections")
              .select("id,platform").eq("workspace_id", wsId).eq("connected", true),
          ]);

        const typedConnections = (connRows || []) as ConnectionRow[];
        const connectionIds = typedConnections.map((c) => c.id);

        let postRows: PostRow[] = [];
        if (connectionIds.length > 0) {
          const { data: fetchedPosts } = await supabase
            .schema("contentiq").from("posts")
            .select("connection_id,title,content,post_type,reach,impressions,likes,comments,shares,saves,clicks,ai_score,published_at")
            .in("connection_id", connectionIds)
            .order("published_at", { ascending: false }).limit(200);
          postRows = (fetchedPosts || []) as PostRow[];
        }

        const [{ data: profileRow }, { data: learningRows }] = await Promise.all([
          supabase.schema("contentiq").from("creator_style_profiles")
            .select("summary,strengths,avoid_patterns,platform_notes,experiment_queue,confidence,updated_at")
            .eq("workspace_id", wsId).maybeSingle(),
          supabase.schema("contentiq").from("ai_learnings")
            .select("id,type,platform,insight,confidence,created_at")
            .eq("workspace_id", wsId).order("created_at", { ascending: false }).limit(20),
        ]);

        if (!cancelled) {
          setBrandVoice((bv || null) as BrandVoiceRow | null);
          setDrafts((draftRows || []) as DraftRow[]);
          setConnections(typedConnections);
          setPosts(postRows);
          setProfile((profileRow || null) as StyleProfileRow | null);
          setLearnings((learningRows || []) as LearningRow[]);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [workspaceId]);

  const connectionById = useMemo(() => {
    return new Map(connections.map((c) => [c.id, c]));
  }, [connections]);

  const selectedDrafts = useMemo(() => {
    return drafts.filter((d) =>
      ["template", "draft", "scheduled", "published"].includes(d.status || "")
    );
  }, [drafts]);

  const platformStats = useMemo(() => {
    return PLATFORMS.map((platform) => {
      const platformPosts = posts.filter(
        (p) => connectionById.get(p.connection_id)?.platform === platform.id
      );
      const totalReach = platformPosts.reduce((s, p) => s + postReach(p), 0);
      const totalEngagement = platformPosts.reduce((s, p) => s + postEngagement(p), 0);
      const avgEngRate =
        platformPosts.length > 0
          ? platformPosts.reduce((s, p) => s + engagementRate(p), 0) / platformPosts.length
          : 0;
      const sortedByEng = [...platformPosts].sort(
        (a, b) => postEngagement(b) + postReach(b) - (postEngagement(a) + postReach(a))
      );
      const best = sortedByEng[0];
      const worst = sortedByEng[sortedByEng.length - 1];
      const avgScore =
        platformPosts.length > 0
          ? Math.round(platformPosts.reduce((s, p) => s + Number(p.ai_score || 0), 0) / platformPosts.length)
          : 0;

      return { platform, posts: platformPosts.length, totalReach, totalEngagement, avgEngRate, avgScore, best, worst };
    });
  }, [connectionById, posts]);

  const topPlatforms = [...platformStats]
    .filter((p) => p.posts > 0)
    .sort((a, b) => b.totalEngagement + b.totalReach - (a.totalEngagement + a.totalReach));

  const confidenceScore = Math.min(100, 20 + selectedDrafts.length * 4 + posts.length * 2);

  /** Build system prompt with all workspace data as context */
  const buildSystemPrompt = () => {
    const bvSection = brandVoice
      ? `
## Brand Voice
- Ton: ${brandVoice.tone || "nie ustawiony"}
- Styl: ${brandVoice.style || "nie ustawiony"}
- Grupa docelowa: ${brandVoice.target_audience || "nie ustawiona"}
- Słowa kluczowe: ${safeArray(brandVoice.keywords).join(", ") || "brak"}
- Słowa do unikania: ${safeArray(brandVoice.avoid_words).join(", ") || "brak"}
- Wartości marki: ${brandVoice.brand_values || "nie ustawione"}
- Styl CTA: ${brandVoice.cta_style || "nie ustawiony"}
`
      : "\n## Brand Voice\nNie skonfigurowany.\n";

    const draftsSection = selectedDrafts.length > 0
      ? `\n## Szablony i szkice (${selectedDrafts.length} pozycji)\n` +
        selectedDrafts.slice(0, 15).map((d) =>
          `- [${d.status}] "${shortText(d.title, "bez tytułu")}" (platformy: ${safeArray(d.target_platforms).join(", ") || "nieokreślone"}, score AI: ${d.ai_score ?? "brak"})\n  Treść: ${(d.body || "").slice(0, 200)}`
        ).join("\n")
      : "\n## Szablony i szkice\nBrak.\n";

    const platformSection = platformStats
      .filter((p) => p.posts > 0)
      .map((p) => {
        const bestTitle = p.best ? shortText(p.best.title || p.best.content, "brak tytułu").slice(0, 100) : "brak";
        return `- ${p.platform.name}: ${p.posts} postów, zasięg łącznie ${p.totalReach}, engagement łącznie ${p.totalEngagement}, śr. engagement rate ${p.avgEngRate.toFixed(2)}%, śr. score AI: ${p.avgScore}. Najlepszy post: "${bestTitle}"`;
      }).join("\n");

    const learningsSection = learnings.length > 0
      ? "\n## Zapisane learningi AI\n" + learnings.map((l) => `- [${l.type}${l.platform ? " · " + l.platform : ""}] ${l.insight}`).join("\n")
      : "\n## Learningi AI\nBrak zapisanych.\n";

    return `Jesteś AI Partnerem twórcy contentu. Twoja rola to być STRATEGICZNYM DORADCĄ — nie asystentem od kopiowania. Masz dostęp do pełnych danych z jego aplikacji i na ich podstawie wydajesz KONKRETNE, OPARTE NA DANYCH rekomendacje.

ZASADY ODPOWIEDZI:
- Mów jak partner, nie jak chatbot. Krótko, konkretnie, z sensem.
- Zawsze odnoś się do REALNYCH danych z tej aplikacji — nie wymyślaj statystyk.
- Jeśli dane są słabe lub ich brak — powiedz wprost co brakuje i jak to naprawić.
- Kiedy piszesz content (posty, hooki, nagłówki) — trzymaj się Brand Voice tego twórcy.
- Wskazuj co działa, co nie działa i dlaczego — na podstawie wyników, nie opinii.
- Bądź spostrzegawczy: zauważaj wzorce, trendy, anomalie w danych.
- Język: polski.

DANE Z APLIKACJI TWÓRCY:
${bvSection}
## Wyniki platform
${platformSection || "Brak pobranych postów."}
${draftsSection}
${learningsSection}

## Statystyki globalne
- Posty w bazie: ${posts.length}
- Szablony/szkice: ${selectedDrafts.length}
- Pewność modelu: ${confidenceScore}%
- Połączone platformy: ${connections.map((c) => c.platform).join(", ") || "brak"}

Twój priorytet: pomagaj twórcy rozwijać się szybciej, unikać powtarzania błędów i tworzyć lepszy content — oparty na tym co realnie działa w jego danych.`;
  };

const sendChat = async (messageText?: string) => {
  const text = (messageText ?? chatInput).trim();
  if (!text || chatLoading) return;

  const userMsg: ChatMessage = { role: "user", content: text };
  const newMessages = [...chatMessages, userMsg];

  setChatMessages(newMessages);
  setChatInput("");
  setChatLoading(true);

  try {
    const conversationContext = newMessages
      .slice(-8)
      .map((message) =>
        `${message.role === "user" ? "Użytkownik" : "AI Partner"}:\n${message.content}`
      )
      .join("\n\n---\n\n");

    const partnerPrompt = `
${buildSystemPrompt()}

## OSTATNIA ROZMOWA
${conversationContext}

## AKTUALNE PYTANIE UŻYTKOWNIKA
${text}

Odpowiedz jako AI Partner ANM ContentIQ.

Zasady:
- Nie odpowiadaj ogólnikowo.
- Nie wymyślaj danych.
- Bazuj na danych z aplikacji przekazanych powyżej.
- Jeżeli danych brakuje, powiedz konkretnie, czego brakuje.
- Daj praktyczne wskazówki: co poprawić, co przetestować, co rozwinąć.
- Jeżeli użytkownik prosi o treść posta, napisz ją w stylu Brand Voice.
- Jeżeli pytanie dotyczy wyników, odnieś się do pobranych postów, platform, szablonów i learningów.
- Odpowiadaj po polsku, konkretnie i praktycznie.
`.trim();

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "chat",
        provider: aiProvider,
        prompt: partnerPrompt,
        historicalData: {
          workspaceId,
          brandVoice,
          selectedDrafts,
          platformStats,
          learnings,
          profile,
          postsCount: posts.length,
          draftsCount: selectedDrafts.length,
          connectedPlatforms: connections.map((connection) => connection.platform),
        },
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || data?.error) {
      throw new Error(
        data?.details || data?.error || "Nie udało się uzyskać odpowiedzi AI."
      );
    }

    setChatMessages([
      ...newMessages,
      {
        role: "assistant",
        content: data.answer || "Nie udało się uzyskać odpowiedzi.",
      },
    ]);
  } catch (err) {
    setChatMessages([
      ...newMessages,
      {
        role: "assistant",
        content:
          err instanceof Error
            ? `Błąd AI: ${err.message}`
            : "Błąd połączenia z AI.",
      },
    ]);
  } finally {
    setChatLoading(false);
  }
};

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const TAB_STYLES = (active: boolean) => ({
    padding: "8px 16px",
    borderRadius: 10,
    border: "none",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.04em",
    background: active ? css.tabActiveBg : "transparent",
    color: active ? css.tabActive : css.muted,
    transition: "all 0.15s",
  });

  // Overview tab: signal cards
  const overviewSignals = useMemo(() => {
    const signals: { label: string; value: string; sub: string; color: string; bg: string }[] = [];

    if (topPlatforms[0]) {
      const p = topPlatforms[0];
      signals.push({
        label: "Najsilniejsza platforma",
        value: p.platform.name,
        sub: `${fmtNum(p.totalEngagement)} engagement · ${fmtNum(p.totalReach)} zasięg`,
        color: css.green,
        bg: css.greenSoft,
      });
    }

    if (posts.length > 0) {
      const best = [...posts].sort((a, b) => postEngagement(b) - postEngagement(a))[0];
      signals.push({
        label: "Najlepszy post",
        value: shortText(best.title || best.content, "post bez tytułu").slice(0, 45),
        sub: `${fmtNum(postEngagement(best))} eng · ${fmtNum(postReach(best))} zasięg`,
        color: css.amber,
        bg: css.amberSoft,
      });
    }

    signals.push({
      label: "Pewność modelu AI",
      value: `${confidenceScore}%`,
      sub: `${posts.length} postów · ${selectedDrafts.length} szablonów`,
      color: css.blue,
      bg: css.blueSoft,
    });

    if (brandVoice?.tone) {
      signals.push({
        label: "Twój ton",
        value: brandVoice.tone.slice(0, 30),
        sub: brandVoice.style ? `Styl: ${brandVoice.style.slice(0, 50)}` : "Styl nie ustawiony",
        color: css.accent,
        bg: css.accentSoft,
      });
    }

    return signals;
  }, [topPlatforms, posts, brandVoice, confidenceScore, selectedDrafts]);

  // Generate AI observations from data
  const aiObservations = useMemo(() => {
    const obs: string[] = [];

    if (topPlatforms.length > 1) {
      const top = topPlatforms[0];
      const second = topPlatforms[1];
      const diff = top.totalEngagement - second.totalEngagement;
      if (diff > 0) {
        obs.push(`${top.platform.name} generuje ${fmtNum(diff)} więcej engagementu niż ${second.platform.name}. To twoja główna arena — ale brak testów na innych platformach to ryzyko, jeśli algorytm się zmieni.`);
      }
    }

    const highEngRate = platformStats.filter((p) => p.posts > 0 && p.avgEngRate > 3);
    if (highEngRate.length > 0) {
      obs.push(`Wysokie engagement rate (>3%) na: ${highEngRate.map((p) => p.platform.name).join(", ")}. Twoja treść tam trafia w potrzeby. Sprawdź co mają wspólnego te posty — i replikuj ten wzorzec.`);
    }

    const platformsWithNoData = connections.filter(
      (c) => !platformStats.find((p) => p.platform.id === c.platform)?.posts
    );
    if (platformsWithNoData.length > 0) {
      obs.push(`Masz połączone platformy bez danych: ${platformsWithNoData.map((c) => c.platform).join(", ")}. AI nie może ocenić co tam działa — wgraj lub zsynchronizuj posty żeby model mógł się uczyć.`);
    }

    if (selectedDrafts.length < 5) {
      obs.push(`Mało szablonów (${selectedDrafts.length}). AI uczy się Twojego stylu głównie z decyzji — im więcej zaaprobowanych formatów, tym lepiej model rozumie co chcesz tworzyć.`);
    }

    if (posts.length > 20 && !brandVoice?.tone) {
      obs.push(`Masz ${posts.length} postów ale Brand Voice jest pusty. AI analizuje wyniki bez znajomości Twojego zamierzonego stylu — uzupełnij Brand Voice żeby rekomendacje były trafniejsze.`);
    }

    if (obs.length === 0) {
      obs.push("Zbyt mało danych żeby wyciągnąć konkretne wnioski. Połącz platformy, dodaj szablony i uzupełnij Brand Voice.");
    }

    return obs;
  }, [topPlatforms, platformStats, connections, selectedDrafts, brandVoice, posts]);

  if (loading) {
    return (
      <div style={{ padding: 24, borderRadius: 16, background: css.surface, border: `1px solid ${css.border}`, color: css.muted, fontSize: 13 }}>
        Ładuję dane — Brand Voice, szablony, posty, wyniki...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, borderRadius: 16, background: "#1a0a0a", border: "1px solid #7f1d1d", color: "#fca5a5", fontSize: 13 }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ color: css.text, fontFamily: "var(--font-body)", display: "flex", flexDirection: "column", gap: 0 }}>

      {/* Header + Tabs */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontFamily: "var(--font-heading)", fontWeight: 400 }}>
            AI Partner
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: css.muted }}>
            uczy się z Twoich danych · pewność modelu {confidenceScore}%
          </p>
        </div>
  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
  <div
    style={{
      display: "flex",
      gap: 4,
      background: css.surface,
      padding: 4,
      borderRadius: 12,
      border: `1px solid ${css.border}`,
    }}
  >
    {(["overview", "chat", "platforms"] as const).map((t) => (
      <button
        key={t}
        type="button"
        style={TAB_STYLES(tab === t)}
        onClick={() => setTab(t)}
      >
        {t === "overview" ? "Analiza" : t === "chat" ? "Czat" : "Platformy"}
      </button>
    ))}
  </div>

  <div
    style={{
      display: "flex",
      gap: 4,
      background: css.surface,
      padding: 4,
      borderRadius: 12,
      border: `1px solid ${css.border}`,
    }}
  >
    {(["deepseek", "gemini"] as const).map((provider) => {
      const active = aiProvider === provider;

      return (
        <button
          key={provider}
          type="button"
          onClick={() => setAiProvider(provider)}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "none",
            fontSize: 11,
            fontWeight: 800,
            cursor: "pointer",
            letterSpacing: "0.04em",
            background: active ? css.accentSoft : "transparent",
            color: active ? css.accent : css.muted,
            fontFamily: "inherit",
            textTransform: "uppercase",
          }}
        >
          {provider === "deepseek" ? "DeepSeek" : "Gemini"}
        </button>
      );
    })}
  </div>
</div>
      </div>

      {/* OVERVIEW TAB */}
      {tab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Signal cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {overviewSignals.map((s, i) => (
              <div key={i} style={{ padding: 16, borderRadius: 14, background: css.surface, border: `1px solid ${css.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: css.muted, textTransform: "uppercase", marginBottom: 6 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.color, marginBottom: 4, lineHeight: 1.2 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 11, color: css.muted }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* AI Observations */}
          <div style={{ padding: 18, borderRadius: 16, background: css.surface, border: `1px solid ${css.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: css.accent, textTransform: "uppercase", marginBottom: 14 }}>
              Obserwacje AI — oparte na Twoich danych
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {aiObservations.map((obs, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: 14, borderRadius: 12, background: css.card, border: `1px solid ${css.border}`, alignItems: "flex-start" }}>
                  <span style={{ color: css.accent, fontWeight: 900, fontSize: 13, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                  <p style={{ margin: 0, fontSize: 13, color: css.text, lineHeight: 1.7 }}>{obs}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths from profile or computed */}
          {(safeArray(profile?.strengths).length > 0 || brandVoice) && (
            <div style={{ padding: 18, borderRadius: 16, background: css.surface, border: `1px solid ${css.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: css.green, textTransform: "uppercase", marginBottom: 14 }}>
                Co AI wie o Twoim stylu
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {[
                  brandVoice?.tone && { label: "Ton", value: brandVoice.tone },
                  brandVoice?.target_audience && { label: "Odbiorca", value: brandVoice.target_audience.slice(0, 120) },
                  brandVoice?.cta_style && { label: "Styl CTA", value: brandVoice.cta_style },
                  safeArray(brandVoice?.keywords).length > 0 && { label: "Kluczowe słowa", value: safeArray(brandVoice?.keywords).slice(0, 6).join(", ") },
                ].filter(Boolean).map((item, i) => (
                  <div key={i} style={{ padding: 12, borderRadius: 12, background: css.card, border: `1px solid ${css.border}` }}>
                    <div style={{ fontSize: 10, color: css.muted, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {(item as { label: string; value: string }).label}
                    </div>
                    <div style={{ fontSize: 12, color: css.text, lineHeight: 1.6 }}>
                      {(item as { label: string; value: string }).value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Experiments from profile */}
          <div style={{ padding: 18, borderRadius: 16, background: css.surface, border: `1px solid ${css.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: css.amber, textTransform: "uppercase", marginBottom: 14 }}>
              Następne eksperymenty
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(safeArray(profile?.experiment_queue).length > 0
                ? safeArray(profile?.experiment_queue)
                : [
                    "Seria 3 postów: problem odbiorcy → kulisy rozwiązania → konkretna instrukcja",
                    "Ten sam temat w 3 wersjach: ekspercka (LinkedIn), narracyjna (FB), hook (IG/TT)",
                    "Post z tezą zamiast poradnika — testuj czy mocna opinia daje więcej zasięgu",
                  ]
              ).map((exp, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: 12, borderRadius: 12, background: css.card, border: `1px solid ${css.border}`, alignItems: "flex-start" }}>
                  <span style={{ color: css.amber, fontWeight: 900, fontSize: 12, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                  <span style={{ fontSize: 13, color: css.text, lineHeight: 1.65 }}>{exp}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { setTab("chat"); setChatInput("Zaproponuj mi konkretne eksperymenty na podstawie moich danych"); }}
              style={{ marginTop: 12, padding: "9px 16px", borderRadius: 10, border: `1px solid ${css.border}`, background: "transparent", color: css.amber, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              Zapytaj AI o nowe eksperymenty →
            </button>
          </div>

          {/* Recent learnings */}
          {learnings.length > 0 && (
            <div style={{ padding: 18, borderRadius: 16, background: css.surface, border: `1px solid ${css.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: css.muted, textTransform: "uppercase", marginBottom: 12 }}>
                Pamięć AI — ostatnie learningi
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {learnings.slice(0, 5).map((l) => (
                  <div key={l.id} style={{ padding: 12, borderRadius: 12, background: css.card, border: `1px solid ${css.border}` }}>
                    <div style={{ fontSize: 10, color: css.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {l.type}{l.platform ? ` · ${l.platform}` : ""}
                    </div>
                    <div style={{ fontSize: 12, color: css.text, lineHeight: 1.65 }}>{l.insight}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CHAT TAB */}
      {tab === "chat" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Quick prompts */}
          {chatMessages.length === 0 && (
            <div style={{ padding: 18, borderRadius: 16, background: css.surface, border: `1px solid ${css.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: css.muted, textTransform: "uppercase", marginBottom: 14 }}>
                Szybkie pytania
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => sendChat(prompt)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 24,
                      border: `1px solid ${css.border}`,
                      background: css.pill,
                      color: css.text,
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <p style={{ margin: "14px 0 0", fontSize: 12, color: css.muted, lineHeight: 1.6 }}>
                AI zna Twoje dane — Brand Voice, szablony, posty i wyniki. Odpowiedzi są oparte na tym co masz w aplikacji, nie na ogólnych poradach.
              </p>
            </div>
          )}

          {/* Messages */}
          {chatMessages.length > 0 && (
            <div style={{
              maxHeight: 480,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: "4px 0",
            }}>
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "80%",
                      padding: "12px 16px",
                      borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: msg.role === "user" ? css.accentSoft : css.surface,
                      border: `1px solid ${msg.role === "user" ? css.accent + "40" : css.border}`,
                      fontSize: 13,
                      color: css.text,
                      lineHeight: 1.75,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.role === "assistant" && (
                      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: css.accent, textTransform: "uppercase", marginBottom: 6 }}>
                        AI PARTNER
                      </div>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ padding: "12px 16px", borderRadius: "16px 16px 16px 4px", background: css.surface, border: `1px solid ${css.border}` }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: css.accent, textTransform: "uppercase", marginBottom: 6 }}>
                      AI PARTNER
                    </div>
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      {[0, 1, 2].map((j) => (
                        <div key={j} style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: css.muted,
                          animation: `pulse 1.2s ${j * 0.2}s ease-in-out infinite`,
                        }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Input */}
          <div style={{ display: "flex", gap: 10, padding: 16, borderRadius: 16, background: css.surface, border: `1px solid ${css.border}` }}>
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChat();
                }
              }}
              placeholder="Zapytaj o strategię, poproś o napisanie posta, analizę platformy..."
              rows={2}
              style={{
                flex: 1,
                background: css.inputBg,
                border: `1px solid ${css.border}`,
                borderRadius: 12,
                padding: "10px 14px",
                color: css.text,
                fontSize: 13,
                resize: "none",
                fontFamily: "inherit",
                lineHeight: 1.6,
              }}
            />
            <button
              type="button"
              onClick={() => sendChat()}
              disabled={chatLoading || !chatInput.trim()}
              style={{
                padding: "0 18px",
                borderRadius: 12,
                border: "none",
                background: css.accent,
                color: "#fff",
                fontSize: 12,
                fontWeight: 800,
                cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer",
                opacity: chatLoading || !chatInput.trim() ? 0.5 : 1,
                flexShrink: 0,
                letterSpacing: "0.04em",
              }}
            >
              Wyślij
            </button>
          </div>

          {chatMessages.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {QUICK_PROMPTS.slice(0, 3).map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => sendChat(prompt)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 20,
                    border: `1px solid ${css.border}`,
                    background: "transparent",
                    color: css.muted,
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PLATFORMS TAB */}
      {tab === "platforms" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {platformStats.map((item) => {
            const isConnected = connections.some((c) => c.platform === item.platform.id);
            return (
              <div
                key={item.platform.id}
                style={{ padding: 18, borderRadius: 16, background: css.surface, border: `1px solid ${css.border}`, opacity: isConnected ? 1 : 0.55 }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: item.posts > 0 ? 14 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: item.platform.color + "22",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 900, color: item.platform.color,
                    }}>
                      {item.platform.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: css.text }}>{item.platform.name}</div>
                      <div style={{ fontSize: 11, color: css.muted }}>
                        {!isConnected ? "Nie połączone" : item.posts === 0 ? "Połączone · brak pobranych postów" : `${item.posts} postów`}
                      </div>
                    </div>
                  </div>
                  {item.posts > 0 && (
                    <div style={{ display: "flex", gap: 16, textAlign: "right" }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: css.text }}>{fmtNum(item.totalEngagement)}</div>
                        <div style={{ fontSize: 10, color: css.muted }}>engagement</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: css.text }}>{fmtNum(item.totalReach)}</div>
                        <div style={{ fontSize: 10, color: css.muted }}>zasięg</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: css.text }}>{item.avgEngRate.toFixed(1)}%</div>
                        <div style={{ fontSize: 10, color: css.muted }}>śr. eng. rate</div>
                      </div>
                    </div>
                  )}
                </div>

                {item.posts > 0 && (
                  <>
                    <div style={{ height: 1, background: css.border, margin: "12px 0" }} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {item.best && (
                        <div style={{ padding: 12, borderRadius: 12, background: css.greenSoft, border: `1px solid ${css.green}22` }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: css.green, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                            Najlepszy post
                          </div>
                          <div style={{ fontSize: 12, color: css.text, lineHeight: 1.55, marginBottom: 6 }}>
                            {shortText(item.best.title || item.best.content, "post bez tytułu").slice(0, 90)}
                          </div>
                          <div style={{ fontSize: 11, color: css.muted }}>
                            {fmtNum(postEngagement(item.best))} eng · {fmtNum(postReach(item.best))} zasięg
                          </div>
                        </div>
                      )}
                      <div style={{ padding: 12, borderRadius: 12, background: css.card, border: `1px solid ${css.border}` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: css.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                          Rekomendacja AI
                        </div>
                        <div style={{ fontSize: 12, color: css.text, lineHeight: 1.6 }}>
                          {item.avgEngRate > 4
                            ? `Wysoki engagement rate — treść trafia. Skaluj format najlepszego posta, testuj nowe hooki.`
                            : item.avgEngRate > 2
                            ? `Solidny wynik. Sprawdź co łączy posty z najwyższym zasięgiem i zduplikuj ich strukturę.`
                            : item.posts > 5
                            ? `Niski engagement rate. Zmień hook lub format — aktualna forma nie przyciąga do końca.`
                            : `Mało postów. Potrzebujesz więcej danych żeby AI mogło wyciągnąć wnioski.`}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTab("chat");
                        setChatInput(`Przeanalizuj wyniki ${item.platform.name} i powiedz mi co warto zmienić`);
                      }}
                      style={{
                        marginTop: 12, padding: "8px 14px", borderRadius: 10,
                        border: `1px solid ${css.border}`, background: "transparent",
                        color: css.muted, fontSize: 11, fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      Zapytaj AI o {item.platform.name} →
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
