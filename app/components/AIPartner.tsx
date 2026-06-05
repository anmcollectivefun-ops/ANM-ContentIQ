"use client";

import { useEffect, useMemo, useState } from "react";
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

const PLATFORMS: { id: Platform; name: string; color: string; icon: string }[] = [
  { id: "instagram", name: "Instagram", color: "#E1306C", icon: "IG" },
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2", icon: "LI" },
  { id: "tiktok", name: "TikTok", color: "#111827", icon: "TT" },
  { id: "youtube", name: "YouTube", color: "#FF0000", icon: "YT" },
  { id: "facebook", name: "Facebook", color: "#1877F2", icon: "FB" },
  { id: "blog", name: "Blog", color: "#22C55E", icon: "BL" },
  { id: "spotify", name: "Spotify", color: "#1DB954", icon: "SP" },
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

function shortText(value: string | null | undefined, fallback: string) {
  const text = (value || "").trim();
  return text.length > 0 ? text : fallback;
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const css = dark
    ? {
        bg: "#080c14",
        surface: "#0f1520",
        text: "#eef2ff",
        muted: "#8190ad",
        border: "#151e30",
        accent: "#818cf8",
        soft: "#101a2c",
      }
    : {
        bg: "#f8f7f4",
        surface: "#ffffff",
        text: "#0f172a",
        muted: "#64748b",
        border: "#e8e8e4",
        accent: "#6366f1",
        soft: "#f1f5f9",
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

        if (wsError || !ws?.id) {
          throw new Error(wsError?.message || "Nie znaleziono workspace.");
        }

        const wsId = ws.id as string;
        if (!cancelled) setWorkspaceUuid(wsId);

        const [{ data: bv }, { data: draftRows }, { data: connRows }] =
          await Promise.all([
            supabase
              .schema("contentiq")
              .from("brand_voice")
              .select("tone,style,target_audience,keywords,avoid_words,brand_values,cta_style")
              .eq("workspace_id", wsId)
              .maybeSingle(),
            supabase
              .schema("contentiq")
              .from("content_drafts")
              .select("id,title,body,content_type,target_platforms,ai_score,status,created_at")
              .eq("workspace_id", wsId)
              .order("created_at", { ascending: false })
              .limit(80),
            supabase
              .schema("contentiq")
              .from("platform_connections")
              .select("id,platform")
              .eq("workspace_id", wsId)
              .eq("connected", true),
          ]);

        const typedConnections = (connRows || []) as ConnectionRow[];
        const connectionIds = typedConnections.map((connection) => connection.id);

        let postRows: PostRow[] = [];
        if (connectionIds.length > 0) {
          const { data: fetchedPosts } = await supabase
            .schema("contentiq")
            .from("posts")
            .select("connection_id,title,content,post_type,reach,impressions,likes,comments,shares,saves,clicks,ai_score,published_at")
            .in("connection_id", connectionIds)
            .order("published_at", { ascending: false })
            .limit(120);
          postRows = (fetchedPosts || []) as PostRow[];
        }

        const [{ data: profileRow }, { data: learningRows }] = await Promise.all([
          supabase
            .schema("contentiq")
            .from("creator_style_profiles")
            .select("summary,strengths,avoid_patterns,platform_notes,experiment_queue,confidence,updated_at")
            .eq("workspace_id", wsId)
            .maybeSingle(),
          supabase
            .schema("contentiq")
            .from("ai_learnings")
            .select("id,type,platform,insight,confidence,created_at")
            .eq("workspace_id", wsId)
            .order("created_at", { ascending: false })
            .limit(12),
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

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const connectionById = useMemo(() => {
    return new Map(connections.map((connection) => [connection.id, connection]));
  }, [connections]);

  const selectedDrafts = useMemo(() => {
    return drafts.filter((draft) =>
      ["template", "draft", "scheduled", "published"].includes(draft.status || "")
    );
  }, [drafts]);

  const platformStats = useMemo(() => {
    return PLATFORMS.map((platform) => {
      const platformPosts = posts.filter(
        (post) => connectionById.get(post.connection_id)?.platform === platform.id
      );
      const totalReach = platformPosts.reduce((sum, post) => sum + postReach(post), 0);
      const totalEngagement = platformPosts.reduce(
        (sum, post) => sum + postEngagement(post),
        0
      );
      const best = [...platformPosts].sort(
        (a, b) => postEngagement(b) + postReach(b) - (postEngagement(a) + postReach(a))
      )[0];
      const avgScore =
        platformPosts.length > 0
          ? Math.round(
              platformPosts.reduce((sum, post) => sum + Number(post.ai_score || 0), 0) /
                platformPosts.length
            )
          : 0;

      return {
        platform,
        posts: platformPosts.length,
        totalReach,
        totalEngagement,
        avgScore,
        best,
      };
    });
  }, [connectionById, posts]);

  const strongestPlatform = [...platformStats].sort((a, b) => {
    return b.totalEngagement + b.totalReach - (a.totalEngagement + a.totalReach);
  })[0];

  const styleSummary = useMemo(() => {
    const tone = shortText(brandVoice?.tone, "ton nie jest jeszcze ustawiony");
    const style = shortText(brandVoice?.style, "styl nie jest jeszcze ustawiony");
    const keywords = safeArray(brandVoice?.keywords).slice(0, 5).join(", ");
    const draftCount = selectedDrafts.length;

    if (profile?.summary) return profile.summary;

    return `AI widzi bazę stylu: ${tone}, ${style}. Wybrane słowa i motywy: ${
      keywords || "brak zapisanych słów kluczowych"
    }. Do nauki stylu używam też ${draftCount} szablonów i szkiców.`;
  }, [brandVoice, profile, selectedDrafts]);

  const strengths = useMemo(() => {
    if (safeArray(profile?.strengths).length > 0) return safeArray(profile?.strengths);

    const result = [
      brandVoice?.target_audience
        ? `Jasna grupa docelowa: ${brandVoice.target_audience.slice(0, 120)}`
        : "Uzupełnij grupę docelową w Brand Voice, żeby AI lepiej trzymało styl.",
      selectedDrafts.length > 0
        ? `AI ma ${selectedDrafts.length} decyzji użytkownika do nauki stylu: szablony, szkice i zaplanowane treści.`
        : "Brakuje jeszcze szablonów i szkiców, więc AI ma mało danych o Twoich wyborach.",
      posts.length > 0
        ? `AI widzi ${posts.length} realnych publikacji i może porównywać treść z reakcją odbiorców.`
        : "Po synchronizacji social mediów AI zacznie uczyć się z reakcji odbiorców.",
    ];

    return result;
  }, [brandVoice, posts, profile, selectedDrafts]);

  const experiments = useMemo(() => {
    if (safeArray(profile?.experiment_queue).length > 0) {
      return safeArray(profile?.experiment_queue);
    }

    return [
      "Seria 3 postów: problem odbiorcy, kulisy rozwiązania, konkretna instrukcja krok po kroku.",
      "Jeden temat w 3 wersjach: ekspercka na LinkedIn, narracyjna na Facebook, krótki hook pod Instagram/TikTok.",
      "Post z mocną tezą zamiast poradnika: sprawdzamy, czy odbiorcy reagują na bardziej odważny punkt widzenia.",
    ];
  }, [profile]);

  async function saveLearningSnapshot() {
    if (!workspaceUuid) return;
    setSaving(true);
    setToast("");

    const platformNotes = Object.fromEntries(
      platformStats.map((item) => [
        item.platform.id,
        item.posts > 0
          ? `${item.platform.name}: ${item.posts} postów, engagement ${item.totalEngagement}, zasięg ${item.totalReach}.`
          : `${item.platform.name}: brak danych z publikacji.`,
      ])
    );

    try {
      const { error: profileError } = await supabase
        .schema("contentiq")
        .from("creator_style_profiles")
        .upsert(
          {
            workspace_id: workspaceUuid,
            summary: styleSummary,
            strengths,
            avoid_patterns: safeArray(brandVoice?.avoid_words),
            platform_notes: platformNotes,
            experiment_queue: experiments,
            confidence: Math.min(100, 20 + selectedDrafts.length * 4 + posts.length * 2),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id" }
        );

      if (profileError) throw new Error(profileError.message);

      const strongest = strongestPlatform;
      const insight =
        strongest?.posts > 0
          ? `Najmocniejszy kanał z realnych danych: ${strongest.platform.name}. Warto rozwijać podobne tematy, ale testować nowy hook i format.`
          : "AI zapisało bazę stylu, ale potrzebuje synchronizacji postów, aby uczyć się z reakcji odbiorców.";

      const { error: learningError } = await supabase
        .schema("contentiq")
        .from("ai_learnings")
        .insert({
          workspace_id: workspaceUuid,
          type: "style_snapshot",
          platform: strongest?.platform.id || null,
          insight,
          evidence: {
            drafts: selectedDrafts.length,
            posts: posts.length,
            brandVoiceConfigured: Boolean(brandVoice),
          },
          confidence: Math.min(100, 20 + selectedDrafts.length * 4 + posts.length * 2),
        });

      if (learningError) throw new Error(learningError.message);

      setToast("Pamięć AI została odświeżona.");
    } catch (err) {
      setToast(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ color: css.text, fontFamily: "var(--font-body)" }}>
      {loading && (
        <div style={{ padding: 18, borderRadius: 14, background: css.surface, border: `1px solid ${css.border}`, color: css.muted }}>
          AI Partner czyta Brand Voice, szablony, szkice i wyniki...
        </div>
      )}

      {error && (
        <div style={{ padding: 18, borderRadius: 14, background: "#450a0a", border: "1px solid #991b1b", color: "#fca5a5" }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.15fr 0.85fr",
              gap: 14,
            }}
          >
            <section style={{ padding: 18, borderRadius: 16, background: css.surface, border: `1px solid ${css.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: css.accent, textTransform: "uppercase", marginBottom: 8 }}>
                Pamięć stylu twórcy
              </div>
              <h3 style={{ margin: "0 0 10px", fontSize: 24, fontFamily: "var(--font-heading)", fontWeight: 400 }}>
                AI ma pisać Twoim stylem, nie stylem AI
              </h3>
              <p style={{ margin: 0, color: css.muted, fontSize: 13, lineHeight: 1.75 }}>
                {styleSummary}
              </p>
            </section>

            <section style={{ padding: 18, borderRadius: 16, background: css.surface, border: `1px solid ${css.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: "#22c55e", textTransform: "uppercase", marginBottom: 10 }}>
                Dane do nauki
              </div>
              {[
                ["Brand Voice", brandVoice ? "uzupełniony" : "brak"],
                ["Szablony i szkice", String(selectedDrafts.length)],
                ["Pobrane posty", String(posts.length)],
                ["Zapisane learningi", String(learnings.length)],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${css.border}`, fontSize: 12 }}>
                  <span style={{ color: css.muted }}>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
              <button
                type="button"
                onClick={saveLearningSnapshot}
                disabled={saving}
                style={{
                  width: "100%",
                  marginTop: 14,
                  border: "none",
                  borderRadius: 12,
                  padding: "11px 12px",
                  background: dark ? "#fff" : "#0f172a",
                  color: dark ? "#0f172a" : "#fff",
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Aktualizuję pamięć..." : "Odśwież pamięć AI"}
              </button>
              {toast && <div style={{ marginTop: 10, color: css.muted, fontSize: 11 }}>{toast}</div>}
            </section>
          </div>

          <section style={{ padding: 18, borderRadius: 16, background: css.surface, border: `1px solid ${css.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: css.accent, textTransform: "uppercase", marginBottom: 12 }}>
              Duże wskazówki AI
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {strengths.map((item, index) => (
                <div key={index} style={{ padding: 14, borderRadius: 13, background: css.soft, border: `1px solid ${css.border}` }}>
                  <div style={{ fontSize: 11, color: css.accent, fontWeight: 900, marginBottom: 7 }}>
                    AI WNIOSEK {index + 1}
                  </div>
                  <p style={{ margin: 0, color: css.text, fontSize: 12, lineHeight: 1.65 }}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section style={{ padding: 18, borderRadius: 16, background: css.surface, border: `1px solid ${css.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: css.accent, textTransform: "uppercase", marginBottom: 12 }}>
              Platform fit
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {platformStats.map((item) => (
                <div key={item.platform.id} style={{ padding: 14, borderRadius: 13, background: css.soft, border: `1px solid ${css.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontWeight: 900, color: item.platform.color }}>
                      {item.platform.icon} {item.platform.name}
                    </span>
                    <span style={{ fontSize: 11, color: css.muted }}>{item.posts} postów</span>
                  </div>
                  <p style={{ margin: 0, color: css.muted, fontSize: 12, lineHeight: 1.65 }}>
                    {item.posts > 0
                      ? `AI widzi zasięg ${item.totalReach} i engagement ${item.totalEngagement}. Najlepszy kierunek: rozwijaj podobny temat, ale testuj nową konstrukcję hooka.`
                      : `Brak pobranych wyników. AI może przygotować wersję pod ${item.platform.name}, ale jeszcze nie oceni reakcji odbiorców.`}
                  </p>
                  {item.best && (
                    <div style={{ marginTop: 9, fontSize: 11, color: css.text }}>
                      Najlepszy sygnał: {shortText(item.best.title || item.best.content, "post bez tytułu").slice(0, 80)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section style={{ padding: 18, borderRadius: 16, background: css.surface, border: `1px solid ${css.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: "#f59e0b", textTransform: "uppercase", marginBottom: 12 }}>
              Eksperymenty, żeby nie stać w miejscu
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {experiments.map((experiment, index) => (
                <div key={index} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 12, borderRadius: 12, background: css.soft, border: `1px solid ${css.border}` }}>
                  <span style={{ color: "#f59e0b", fontWeight: 900 }}>{index + 1}.</span>
                  <span style={{ color: css.text, fontSize: 13, lineHeight: 1.6 }}>{experiment}</span>
                </div>
              ))}
            </div>
          </section>

          {learnings.length > 0 && (
            <section style={{ padding: 18, borderRadius: 16, background: css.surface, border: `1px solid ${css.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: css.accent, textTransform: "uppercase", marginBottom: 12 }}>
                Ostatnie zapamiętane learningi
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {learnings.map((learning) => (
                  <div key={learning.id} style={{ padding: 12, borderRadius: 12, background: css.soft, border: `1px solid ${css.border}` }}>
                    <div style={{ fontSize: 11, color: css.muted, marginBottom: 5 }}>
                      {learning.type} {learning.platform ? `· ${learning.platform}` : ""}
                    </div>
                    <div style={{ fontSize: 13, color: css.text, lineHeight: 1.6 }}>
                      {learning.insight}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
