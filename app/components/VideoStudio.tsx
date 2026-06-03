"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";

type VideoPlatform = "tiktok" | "instagram" | "youtube";

type VideoGoal =
  | "zasięg"
  | "sprzedaż"
  | "edukacja"
  | "lead"
  | "społeczność"
  | "brand awareness";

type VideoFormat =
  | "3 błędy"
  | "3 wskazówki"
  | "Mit vs prawda"
  | "Przed / po"
  | "Tutorial"
  | "Storytelling"
  | "POV"
  | "Lista narzędzi"
  | "Mini case study"
  | "Reakcja na trend";

interface VideoShot {
  time: string;
  scene: string;
  camera: string;
  action: string;
}

interface OnScreenText {
  time: string;
  text: string;
}

interface VideoBrief {
  title: string;
  platform: VideoPlatform;
  goal: VideoGoal;
  format: VideoFormat;
  duration_seconds: number;
  hook: string;
  script: string;
  shots: VideoShot[];
  on_screen_text: OnScreenText[];
  caption: string;
  hashtags: string[];
  thumbnail_text: string;
  retention_tips: string[];
  production_checklist: string[];
  estimated_score: number;
  ai_notes: string;
}

type ApiResponse = {
  answer?: string;
  data?: unknown;
  error?: string;
};

const PLATFORMS: {
  id: VideoPlatform;
  name: string;
  color: string;
  label: string;
}[] = [
  {
    id: "tiktok",
    name: "TikTok",
    color: "#ffffff",
    label: "TikTok",
  },
  {
    id: "instagram",
    name: "Instagram Reels",
    color: "#E1306C",
    label: "Reels",
  },
  {
    id: "youtube",
    name: "YouTube Shorts",
    color: "#FF0033",
    label: "Shorts",
  },
];

const GOALS: VideoGoal[] = [
  "zasięg",
  "edukacja",
  "sprzedaż",
  "lead",
  "społeczność",
  "brand awareness",
];

const FORMATS: VideoFormat[] = [
  "3 błędy",
  "3 wskazówki",
  "Mit vs prawda",
  "Przed / po",
  "Tutorial",
  "Storytelling",
  "POV",
  "Lista narzędzi",
  "Mini case study",
  "Reakcja na trend",
];

const DURATIONS = [15, 20, 30, 45, 60];

function getScoreColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

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

function buildVideoPrompt({
  platform,
  goal,
  format,
  duration,
  topic,
  brandContext,
}: {
  platform: VideoPlatform;
  goal: VideoGoal;
  format: VideoFormat;
  duration: number;
  topic: string;
  brandContext: string;
}) {
  return `
Jesteś ekspertem od krótkich video: TikTok, Instagram Reels i YouTube Shorts.

Przygotuj pełny brief video dla platformy: ${platform}.
Cel video: ${goal}
Format: ${format}
Długość: ${duration} sekund

Temat / pomysł:
${topic}

Kontekst marki / styl / branża:
${brandContext || "brak dodatkowego kontekstu"}

Ważne zasady:
- hook musi działać w pierwszych 0–2 sekundach,
- scenariusz ma być naturalny do nagrania telefonem,
- podziel video na konkretne ujęcia,
- dodaj teksty na ekranie z czasem,
- przygotuj opis posta i hashtagi,
- dodaj tekst miniatury,
- dodaj wskazówki retencyjne,
- dodaj checklistę produkcyjną,
- oceniaj pod krótkie video, nie pod zwykły post tekstowy.

Zwróć dokładnie taki JSON, bez markdown i bez komentarzy:

{
  "title": "tytuł roboczy video",
  "platform": "${platform}",
  "goal": "${goal}",
  "format": "${format}",
  "duration_seconds": ${duration},
  "hook": "mocny hook 0-2 sekundy",
  "script": "pełny scenariusz do powiedzenia w video",
  "shots": [
    {
      "time": "0-2s",
      "scene": "co widzimy",
      "camera": "jak nagrać / kadr",
      "action": "co robi osoba lub co pokazuje ekran"
    }
  ],
  "on_screen_text": [
    {
      "time": "0-2s",
      "text": "tekst na ekranie"
    }
  ],
  "caption": "opis posta pod video",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "thumbnail_text": "krótki tekst na miniaturę",
  "retention_tips": ["wskazówka 1", "wskazówka 2"],
  "production_checklist": ["co przygotować przed nagraniem"],
  "estimated_score": 85,
  "ai_notes": "krótki wniosek AI, dlaczego ten format powinien zadziałać"
}
  `.trim();
}

function formatBriefAsText(brief: VideoBrief) {
  return `
${brief.title}

PLATFORMA:
${brief.platform}

CEL:
${brief.goal}

FORMAT:
${brief.format}

DŁUGOŚĆ:
${brief.duration_seconds}s

HOOK:
${brief.hook}

SCENARIUSZ:
${brief.script}

UJĘCIA:
${brief.shots
  .map(
    (shot) =>
      `- ${shot.time}: ${shot.scene}\n  Kadr: ${shot.camera}\n  Akcja: ${shot.action}`
  )
  .join("\n")}

TEKSTY NA EKRANIE:
${brief.on_screen_text.map((item) => `- ${item.time}: ${item.text}`).join("\n")}

OPIS POSTA:
${brief.caption}

HASHTAGI:
${brief.hashtags.join(" ")}

MINIATURA:
${brief.thumbnail_text}

RETENCJA:
${brief.retention_tips.map((tip) => `- ${tip}`).join("\n")}

CHECKLISTA:
${brief.production_checklist.map((item) => `- ${item}`).join("\n")}

AI SCORE:
${brief.estimated_score}/100

AI NOTES:
${brief.ai_notes}
  `.trim();
}

function SectionLabel({
  children,
  color,
}: {
  children: string;
  color: string;
}) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 900,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function PillButton({
  active,
  children,
  onClick,
  color,
  css,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
  color: string;
  css: Record<string, string>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "7px 12px",
        borderRadius: 10,
        border: `1.5px solid ${active ? color : css.border}`,
        background: active ? `${color}18` : "transparent",
        color: active ? color : css.muted,
        fontSize: 11,
        fontWeight: 800,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

function ResultBlock({
  label,
  children,
  css,
  accent = false,
}: {
  label: string;
  children: React.ReactNode;
  css: Record<string, string>;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: accent ? css.aiBg : css.surface,
        border: `1px solid ${accent ? css.aiBorder : css.border}`,
        borderRadius: 16,
        padding: 15,
      }}
    >
      <SectionLabel color={accent ? css.aiText : css.accent}>{label}</SectionLabel>
      {children}
    </div>
  );
}

export default function VideoStudio({
  dark = true,
  workspaceId = "contentiq",
}: {
  dark?: boolean;
  workspaceId?: string;
}) {
  const supabase = createClient();

  const [platform, setPlatform] = useState<VideoPlatform>("tiktok");
  const [goal, setGoal] = useState<VideoGoal>("zasięg");
  const [format, setFormat] = useState<VideoFormat>("3 błędy");
  const [duration, setDuration] = useState(30);
  const [topic, setTopic] = useState("");
  const [brandContext, setBrandContext] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [brief, setBrief] = useState<VideoBrief | null>(null);
  const [rawAnswer, setRawAnswer] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");

  const topicRef = useRef<HTMLTextAreaElement>(null);
  const contextRef = useRef<HTMLTextAreaElement>(null);

  const css: Record<string, string> = dark
    ? {
        bg: "#050505",
        surface: "#111111",
        surfaceSoft: "#0B0B0C",
        text: "#F5F5F5",
        muted: "#9CA3AF",
        border: "#27272A",
        accent: "#E5E7EB",
        aiBg: "#0C1117",
        aiBgSoft: "#101820",
        aiBorder: "#1E3A4C",
        aiText: "#7DD3FC",
      }
    : {
        bg: "#F6F6F6",
        surface: "#FFFFFF",
        surfaceSoft: "#FAFAFA",
        text: "#111111",
        muted: "#71717A",
        border: "#E4E4E7",
        accent: "#111111",
        aiBg: "#F0F9FF",
        aiBgSoft: "#F8FCFF",
        aiBorder: "#BAE6FD",
        aiText: "#0284C7",
      };

  const platformInfo = useMemo(
    () => PLATFORMS.find((item) => item.id === platform) || PLATFORMS[0],
    [platform]
  );

  useEffect(() => {
    [topicRef.current, contextRef.current].forEach((textarea) => {
      if (!textarea) return;
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    });
  }, [topic, brandContext]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 3200);
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function getOrCreateWorkspaceUuid() {
    const { data: existing } = await supabase
      .schema("contentiq")
      .from("workspaces")
      .select("id")
      .eq("slug", workspaceId)
      .single();

    if (existing?.id) return existing.id as string;

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Brak aktywnej sesji.");

    const { data: created, error } = await supabase
      .schema("contentiq")
      .from("workspaces")
      .insert({
        user_id: auth.user.id,
        name: "ANM ContentIQ",
        type: "Content",
        slug: workspaceId,
      })
      .select("id")
      .single();

    if (error || !created?.id) {
      throw new Error(error?.message || "Nie udało się utworzyć workspace.");
    }

    return created.id as string;
  }

  async function generateVideoBrief() {
    if (!topic.trim()) {
      setError("Wpisz temat albo pomysł na video.");
      return;
    }

    setLoading(true);
    setError("");
    setBrief(null);
    setRawAnswer("");

    try {
      const videoPrompt = buildVideoPrompt({
        platform,
        goal,
        format,
        duration,
        topic,
        brandContext,
      });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "chat",
          prompt: videoPrompt,
        }),
      });

      const json = (await res.json()) as ApiResponse;

      if (!res.ok || json.error) {
        setError(json.error || "Błąd API.");
        return;
      }

      const answer = json.answer || "";
      setRawAnswer(answer);

      const parsed = JSON.parse(cleanJsonAnswer(answer)) as VideoBrief;

      parsed.platform = parsed.platform || platform;
      parsed.goal = parsed.goal || goal;
      parsed.format = parsed.format || format;
      parsed.duration_seconds = parsed.duration_seconds || duration;
      parsed.shots = safeArray(parsed.shots);
      parsed.on_screen_text = safeArray(parsed.on_screen_text);
      parsed.hashtags = safeArray(parsed.hashtags);
      parsed.retention_tips = safeArray(parsed.retention_tips);
      parsed.production_checklist = safeArray(parsed.production_checklist);
      parsed.estimated_score = Number(parsed.estimated_score || 0);

      setBrief(parsed);
    } catch (err) {
      console.error(err);
      setError(
        "AI nie zwróciło poprawnego JSON. Spróbuj jeszcze raz albo skróć opis tematu."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft() {
    if (!brief) return;

    setSaving(true);
    setError("");

    try {
      const wsId = await getOrCreateWorkspaceUuid();
      const body = formatBriefAsText(brief);

      const { error: insertError } = await supabase
        .schema("contentiq")
        .from("content_drafts")
        .insert({
          workspace_id: wsId,
          title: brief.title || topic.slice(0, 80),
          body,
          topic,
          content_type: `Video Studio / ${brief.format}`,
          target_platforms: [brief.platform],
          ai_score: brief.estimated_score,
          ai_feedback: brief.ai_notes,
          status: "draft",
        });

      if (insertError) throw new Error(insertError.message);

      showToast("✓ Zapisano brief video jako szkic");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={
        {
          "--bg": css.bg,
          "--surface": css.surface,
          "--text": css.text,
          "--muted": css.muted,
          "--border": css.border,
          "--accent": css.accent,
          fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
          color: css.text,
        } as CSSProperties
      }
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&family=DM+Serif+Display&display=swap');

        * {
          box-sizing: border-box;
        }

        textarea {
          resize: none;
          overflow: hidden;
        }

        .video-studio-grid {
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: 18px;
          align-items: start;
        }

        .video-card {
          transition: transform .18s ease, border-color .18s ease, background .18s ease;
        }

        .video-card:hover {
          transform: translateY(-1px);
          border-color: ${css.aiBorder};
        }

        @media(max-width: 980px) {
          .video-studio-grid {
            grid-template-columns: 1fr;
          }

          .video-two-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 100,
            background: "#052e16",
            color: "#22c55e",
            border: "1px solid #166534",
            borderRadius: 12,
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 800,
            boxShadow: "0 18px 44px rgba(0,0,0,0.35)",
          }}
        >
          {toast}
        </div>
      )}

      <div className="video-studio-grid">
        {/* LEFT FORM */}
        <div
          style={{
            background: css.surface,
            border: `1px solid ${css.border}`,
            borderRadius: 22,
            padding: 18,
          }}
        >
          <SectionLabel color={css.accent}>Video Studio</SectionLabel>

          <h2
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 31,
              lineHeight: 1.05,
              margin: "8px 0 8px",
              color: css.text,
              fontWeight: 400,
            }}
          >
            TikTok / Reels / Shorts brief
          </h2>

          <p
            style={{
              margin: "0 0 18px",
              color: css.muted,
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            AI przygotuje nie tylko opis posta, ale cały plan nagrania: hook,
            scenariusz, ujęcia, teksty na ekranie, miniaturę i wskazówki
            retencyjne.
          </p>

          <div style={{ marginBottom: 16 }}>
            <SectionLabel color={css.muted}>Platforma</SectionLabel>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PLATFORMS.map((item) => (
                <PillButton
                  key={item.id}
                  active={platform === item.id}
                  onClick={() => setPlatform(item.id)}
                  color={item.color}
                  css={css}
                >
                  {item.name}
                </PillButton>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <SectionLabel color={css.muted}>Cel video</SectionLabel>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {GOALS.map((item) => (
                <PillButton
                  key={item}
                  active={goal === item}
                  onClick={() => setGoal(item)}
                  color={css.accent}
                  css={css}
                >
                  {item}
                </PillButton>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <SectionLabel color={css.muted}>Format</SectionLabel>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {FORMATS.map((item) => (
                <PillButton
                  key={item}
                  active={format === item}
                  onClick={() => setFormat(item)}
                  color={platformInfo.color}
                  css={css}
                >
                  {item}
                </PillButton>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <SectionLabel color={css.muted}>Długość</SectionLabel>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {DURATIONS.map((item) => (
                <PillButton
                  key={item}
                  active={duration === item}
                  onClick={() => setDuration(item)}
                  color={css.accent}
                  css={css}
                >
                  {item}s
                </PillButton>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <SectionLabel color={css.muted}>Temat / pomysł</SectionLabel>
            <textarea
              ref={topicRef}
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="np. 3 błędy firm, przez które ich TikToki wyglądają jak reklama, a nie naturalny content"
              style={{
                width: "100%",
                minHeight: 120,
                borderRadius: 16,
                border: `1px solid ${css.border}`,
                background: css.surfaceSoft,
                color: css.text,
                padding: 14,
                outline: "none",
                fontFamily: "inherit",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <SectionLabel color={css.muted}>Kontekst marki</SectionLabel>
            <textarea
              ref={contextRef}
              value={brandContext}
              onChange={(event) => setBrandContext(event.target.value)}
              placeholder="np. ton: ekspercki, ale prosty; grupa: właściciele małych firm; marka: ANM ContentIQ"
              style={{
                width: "100%",
                minHeight: 82,
                borderRadius: 16,
                border: `1px solid ${css.border}`,
                background: css.surfaceSoft,
                color: css.text,
                padding: 14,
                outline: "none",
                fontFamily: "inherit",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            />
          </div>

          <button
            type="button"
            onClick={generateVideoBrief}
            disabled={loading || !topic.trim()}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 16,
              padding: "14px 16px",
              background: dark ? "#ffffff" : "#111111",
              color: dark ? "#050505" : "#ffffff",
              fontSize: 13,
              fontWeight: 900,
              cursor: loading || !topic.trim() ? "not-allowed" : "pointer",
              opacity: loading || !topic.trim() ? 0.5 : 1,
              fontFamily: "inherit",
            }}
          >
            {loading ? "AI tworzy brief video..." : "✦ Wygeneruj brief video"}
          </button>

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
        </div>

        {/* RIGHT RESULT */}
        <div>
          {!brief && !loading && (
            <div
              style={{
                minHeight: 500,
                borderRadius: 22,
                border: `1px dashed ${css.border}`,
                background: css.surface,
                display: "grid",
                placeItems: "center",
                padding: 28,
                textAlign: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 48,
                    opacity: 0.18,
                    marginBottom: 12,
                  }}
                >
                  ▶
                </div>

                <h3
                  style={{
                    fontFamily: "'DM Serif Display', serif",
                    fontSize: 28,
                    fontWeight: 400,
                    margin: "0 0 8px",
                    color: css.text,
                  }}
                >
                  Brief video pojawi się tutaj
                </h3>

                <p
                  style={{
                    maxWidth: 360,
                    color: css.muted,
                    fontSize: 13,
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  To będzie kompletna instrukcja nagrania: hook, scenariusz,
                  ujęcia, napisy, opis, miniatura i wskazówki pod retencję.
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div
              style={{
                minHeight: 500,
                borderRadius: 22,
                border: `1px solid ${css.border}`,
                background: css.surface,
                display: "grid",
                placeItems: "center",
                padding: 28,
                textAlign: "center",
              }}
            >
              <div>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    border: `3px solid ${css.border}`,
                    borderTopColor: css.aiText,
                    margin: "0 auto 14px",
                    animation: "spin .8s linear infinite",
                  }}
                />
                <style>{`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}</style>
                <p style={{ color: css.muted, fontSize: 13 }}>
                  AI układa scenariusz, ujęcia i napisy...
                </p>
              </div>
            </div>
          )}

          {brief && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <ResultBlock label="AI Video Score" css={css} accent>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 18,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 42,
                        fontFamily: "'DM Serif Display', serif",
                        color: getScoreColor(brief.estimated_score),
                        lineHeight: 1,
                      }}
                    >
                      {brief.estimated_score}
                    </div>
                    <div style={{ fontSize: 11, color: css.muted, marginTop: 4 }}>
                      /100 potencjał video
                    </div>
                  </div>

                  <p
                    style={{
                      flex: 1,
                      margin: 0,
                      color: css.text,
                      fontSize: 13,
                      lineHeight: 1.7,
                    }}
                  >
                    {brief.ai_notes}
                  </p>
                </div>
              </ResultBlock>

              <ResultBlock label="Tytuł roboczy" css={css}>
                <h3
                  style={{
                    margin: 0,
                    color: css.text,
                    fontSize: 20,
                    lineHeight: 1.25,
                  }}
                >
                  {brief.title}
                </h3>
              </ResultBlock>

              <ResultBlock label="Hook 0–2 sekundy" css={css} accent>
                <p
                  style={{
                    margin: 0,
                    color: css.text,
                    fontSize: 18,
                    lineHeight: 1.5,
                    fontWeight: 900,
                  }}
                >
                  “{brief.hook}”
                </p>
              </ResultBlock>

              <ResultBlock label="Scenariusz do powiedzenia" css={css}>
                <p
                  style={{
                    margin: 0,
                    color: css.text,
                    whiteSpace: "pre-wrap",
                    fontSize: 13,
                    lineHeight: 1.8,
                  }}
                >
                  {brief.script}
                </p>
              </ResultBlock>

              <div
                className="video-two-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <ResultBlock label="Lista ujęć" css={css}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {safeArray(brief.shots).map((shot, index) => (
                      <div
                        key={`${shot.time}-${index}`}
                        className="video-card"
                        style={{
                          borderLeft: `3px solid ${platformInfo.color}`,
                          paddingLeft: 10,
                        }}
                      >
                        <div
                          style={{
                            color: platformInfo.color,
                            fontSize: 11,
                            fontWeight: 900,
                            marginBottom: 3,
                          }}
                        >
                          {shot.time}
                        </div>
                        <div style={{ color: css.text, fontSize: 12, lineHeight: 1.6 }}>
                          <strong>{shot.scene}</strong>
                          <br />
                          Kadr: {shot.camera}
                          <br />
                          Akcja: {shot.action}
                        </div>
                      </div>
                    ))}
                  </div>
                </ResultBlock>

                <ResultBlock label="Teksty na ekranie" css={css}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {safeArray(brief.on_screen_text).map((item, index) => (
                      <div
                        key={`${item.time}-${index}`}
                        style={{
                          background: css.surfaceSoft,
                          border: `1px solid ${css.border}`,
                          borderRadius: 12,
                          padding: 10,
                        }}
                      >
                        <div
                          style={{
                            color: css.muted,
                            fontSize: 10,
                            fontWeight: 900,
                            marginBottom: 3,
                          }}
                        >
                          {item.time}
                        </div>
                        <div
                          style={{
                            color: css.text,
                            fontSize: 13,
                            fontWeight: 800,
                            lineHeight: 1.4,
                          }}
                        >
                          {item.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </ResultBlock>
              </div>

              <ResultBlock label="Opis posta" css={css}>
                <p
                  style={{
                    margin: 0,
                    color: css.text,
                    fontSize: 13,
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {brief.caption}
                </p>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    marginTop: 12,
                  }}
                >
                  {safeArray(brief.hashtags).map((tag, index) => (
                    <span
                      key={`${tag}-${index}`}
                      style={{
                        color: platformInfo.color,
                        background: `${platformInfo.color}18`,
                        borderRadius: 999,
                        padding: "5px 9px",
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </ResultBlock>

              <ResultBlock label="Miniatura / tekst na okładkę" css={css}>
                <p
                  style={{
                    margin: 0,
                    color: css.text,
                    fontSize: 22,
                    lineHeight: 1.2,
                    fontWeight: 900,
                  }}
                >
                  {brief.thumbnail_text}
                </p>
              </ResultBlock>

              <div
                className="video-two-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <ResultBlock label="Wskazówki retencyjne" css={css} accent>
                  <ul style={{ margin: 0, paddingLeft: 18, color: css.text }}>
                    {safeArray(brief.retention_tips).map((tip, index) => (
                      <li
                        key={`${tip}-${index}`}
                        style={{
                          fontSize: 12,
                          lineHeight: 1.7,
                          marginBottom: 6,
                        }}
                      >
                        {tip}
                      </li>
                    ))}
                  </ul>
                </ResultBlock>

                <ResultBlock label="Checklist nagrania" css={css}>
                  <ul style={{ margin: 0, paddingLeft: 18, color: css.text }}>
                    {safeArray(brief.production_checklist).map((item, index) => (
                      <li
                        key={`${item}-${index}`}
                        style={{
                          fontSize: 12,
                          lineHeight: 1.7,
                          marginBottom: 6,
                        }}
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </ResultBlock>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => copyText(formatBriefAsText(brief))}
                  style={{
                    borderRadius: 14,
                    border: `1px solid ${css.border}`,
                    background: css.surface,
                    color: css.muted,
                    padding: "12px 14px",
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {copied ? "✓ Skopiowano" : "Kopiuj brief"}
                </button>

                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={saving}
                  style={{
                    borderRadius: 14,
                    border: "none",
                    background: dark ? "#ffffff" : "#111111",
                    color: dark ? "#050505" : "#ffffff",
                    padding: "12px 14px",
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.6 : 1,
                    fontFamily: "inherit",
                  }}
                >
                  {saving ? "Zapisuję..." : "Zapisz jako szkic"}
                </button>
              </div>

              {rawAnswer && (
                <details
                  style={{
                    background: css.surface,
                    border: `1px solid ${css.border}`,
                    borderRadius: 14,
                    padding: 12,
                  }}
                >
                  <summary
                    style={{
                      color: css.muted,
                      fontSize: 11,
                      cursor: "pointer",
                      fontWeight: 800,
                    }}
                  >
                    Surowa odpowiedź AI
                  </summary>
                  <pre
                    style={{
                      color: css.muted,
                      fontSize: 10,
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                      marginTop: 10,
                    }}
                  >
                    {rawAnswer}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}