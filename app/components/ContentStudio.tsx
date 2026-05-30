"use client";

// ─── Content Studio — ANM ContentIQ ──────────────────────────────────────────
// Tryby: generowanie, analiza, adaptacja na platformy
// Endpoint: /api/chat
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, type CSSProperties } from "react";

// ─── TYPY ────────────────────────────────────────────────────────────────────

type Mode = "generate" | "analyze" | "adapt";

type Platform =
  | "linkedin"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "blog"
  | "spotify";

interface GeneratedContent {
  title?: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  estimated_score: number;
  platform_notes: string;
}

interface AnalysisResult {
  score: number;
  hook_quality: number;
  cta_quality: number;
  platform_fit: number;
  engagement_potential: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  rewritten_hook: string;
}

interface PlatformVariant {
  body: string;
  hashtags: string[];
  score: number;
  notes: string;
}

interface AdaptResult {
  platforms: Partial<Record<Platform, PlatformVariant>>;
}

type ApiResponse = {
  data?: GeneratedContent | AnalysisResult | AdaptResult;
  answer?: string;
  error?: string;
  parseError?: string;
};

// ─── CONSTS ──────────────────────────────────────────────────────────────────

const PLATFORMS: { id: Platform; name: string; color: string; icon: string }[] = [
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2", icon: "LI" },
  { id: "instagram", name: "Instagram", color: "#E1306C", icon: "IG" },
  { id: "tiktok", name: "TikTok", color: "#111827", icon: "TT" },
  { id: "youtube", name: "YouTube", color: "#FF0000", icon: "YT" },
  { id: "facebook", name: "Facebook", color: "#1877F2", icon: "FB" },
  { id: "blog", name: "Blog", color: "#22C55E", icon: "BL" },
  { id: "spotify", name: "Spotify", color: "#1DB954", icon: "SP" },
];

const CONTENT_TYPES = [
  "Post ekspercki",
  "Case study",
  "Lista / poradnik",
  "Reels / Shorts script",
  "Karuzela",
  "Artykuł blogowy",
  "Newsletter",
  "Podcast outline",
  "Ogłoszenie",
];

const MODE_LABELS: Record<Mode, string> = {
  generate: "✦ Generuj",
  analyze: "◉ Analizuj",
  adapt: "⊞ Adaptuj",
};

const MODE_DESCRIPTIONS: Record<Mode, string> = {
  generate:
    "Wygeneruj nowy content pod konkretną platformę, typ treści i cel komunikacji.",
  analyze:
    "Wklej gotową treść, a AI oceni hook, CTA, dopasowanie do platformy i potencjał wyniku.",
  adapt:
    "Wklej jedną treść, a AI przerobi ją na warianty dopasowane do wielu platform.",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getScoreColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

function getPlatformInfo(platform: string) {
  return PLATFORMS.find((item) => item.id === platform);
}

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

// ─── SCORE BAR ───────────────────────────────────────────────────────────────

function ScoreBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const c = color || getScoreColor(safeValue);

  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 5,
        }}
      >
        <span style={{ fontSize: 11, color: "var(--muted)" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: c }}>
          {safeValue}/100
        </span>
      </div>

      <div
        style={{
          height: 4,
          borderRadius: 999,
          background: "var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.max(0, Math.min(100, safeValue))}%`,
            background: c,
            borderRadius: 999,
            transition: "width 0.8s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── RAW ANSWER PANEL ────────────────────────────────────────────────────────

function RawAnswerPanel({ rawAnswer }: { rawAnswer: string }) {
  const [open, setOpen] = useState(false);

  if (!rawAnswer) return null;

  return (
    <div
      style={{
        marginTop: 14,
        borderRadius: 12,
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "9px 14px",
          background: "var(--surface)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "var(--muted)",
          fontSize: 11,
          fontFamily: "inherit",
        }}
      >
        <span>Podgląd surowej odpowiedzi AI</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          style={{
            padding: "12px 14px",
            background: "var(--surface)",
            borderTop: "1px solid var(--border)",
          }}
        >
          <pre
            style={{
              fontSize: 10,
              color: "var(--muted)",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              fontFamily: "monospace",
              margin: 0,
            }}
          >
            {rawAnswer}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function ContentStudio({ dark = true }: { dark?: boolean }) {
  const [mode, setMode] = useState<Mode>("generate");
  const [platform, setPlatform] = useState<Platform>("linkedin");
  const [contentType, setContentType] = useState(CONTENT_TYPES[0]);
  const [prompt, setPrompt] = useState("");

  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [adapted, setAdapted] = useState<AdaptResult | null>(null);

  const [selectedAdaptPlatforms, setSelectedAdaptPlatforms] = useState<
    Platform[]
  >(["linkedin", "instagram", "tiktok"]);

  const [rawAnswer, setRawAnswer] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const css = dark
    ? {
        bg: "#080c14",
        surface: "#0f1520",
        text: "#eef2ff",
        muted: "#8190ad",
        border: "#151e30",
        accent: "#818cf8",
      }
    : {
        bg: "#f8f7f4",
        surface: "#ffffff",
        text: "#0f172a",
        muted: "#64748b",
        border: "#e8e8e4",
        accent: "#6366f1",
      };

  const rootStyle = {
    "--bg": css.bg,
    "--surface": css.surface,
    "--text": css.text,
    "--muted": css.muted,
    "--border": css.border,
    "--accent": css.accent,
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    color: css.text,
  } as CSSProperties;

  useEffect(() => {
    if (!textareaRef.current) return;

    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [prompt]);

  function resetResults() {
    setGenerated(null);
    setAnalysis(null);
    setAdapted(null);
    setRawAnswer("");
    setError("");
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;

    setLoading(true);
    resetResults();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          prompt,
          platform: mode === "generate" || mode === "analyze" ? platform : undefined,
          contentType: mode === "generate" ? contentType : undefined,
          platforms: mode === "adapt" ? selectedAdaptPlatforms : undefined,
        }),
      });

      const json = (await res.json()) as ApiResponse;

      if (!res.ok) {
        setError(json.error || "Błąd odpowiedzi API.");
        return;
      }

      if (json.error) {
        setError(json.error);
        return;
      }

      if (json.answer) {
        setRawAnswer(json.answer);
      }

      if (json.parseError) {
        setError(`Błąd parsowania odpowiedzi AI: ${json.parseError}`);
        return;
      }

      if (!json.data) {
        setError("API nie zwróciło danych w polu data.");
        return;
      }

      if (mode === "generate") {
        setGenerated(json.data as GeneratedContent);
      }

      if (mode === "analyze") {
        setAnalysis(json.data as AnalysisResult);
      }

      if (mode === "adapt") {
        setAdapted(json.data as AdaptResult);
      }
    } catch (err) {
      console.error(err);
      setError("Błąd połączenia z API.");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Nie udało się skopiować tekstu.");
    }
  }

  function toggleAdaptPlatform(platformId: Platform) {
    setSelectedAdaptPlatforms((prev) => {
      if (prev.includes(platformId)) {
        return prev.filter((item) => item !== platformId);
      }

      return [...prev, platformId];
    });
  }

  return (
    <div style={rootStyle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,300&family=DM+Serif+Display&display=swap');

        * {
          box-sizing: border-box;
        }

        textarea {
          resize: none;
          overflow: hidden;
        }

        .ciq-mode-btn,
        .ciq-platform-pill,
        .ciq-generate-btn,
        .ciq-copy-btn {
          transition: all 0.15s ease;
        }

        .ciq-mode-btn:hover,
        .ciq-copy-btn:hover {
          opacity: 0.75;
        }

        .ciq-platform-pill:hover {
          transform: translateY(-1px);
        }

        .ciq-generate-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .ciq-generate-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @media (max-width: 960px) {
          .ciq-studio-layout {
            grid-template-columns: 1fr !important;
          }

          .ciq-result-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div
        className="ciq-studio-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* ───────────────── LEFT: INPUT PANEL ───────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
          {/* ================= MODE SELECTOR ================= */}
          <div
            style={{
              display: "flex",
              gap: 6,
              padding: 5,
              background: css.surface,
              borderRadius: 14,
              border: `1px solid ${css.border}`,
            }}
          >
            {(["generate", "analyze", "adapt"] as Mode[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMode(item);
                  resetResults();
                }}
                className="ciq-mode-btn"
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: mode === item ? 700 : 500,
                  background:
                    mode === item ? (dark ? "#fff" : "#0f172a") : "transparent",
                  color:
                    mode === item ? (dark ? "#0f172a" : "#fff") : css.muted,
                  fontFamily: "inherit",
                }}
              >
                {MODE_LABELS[item]}
              </button>
            ))}
          </div>

          <div
            style={{
              borderRadius: 14,
              border: `1px solid ${css.border}`,
              background: css.surface,
              padding: 14,
            }}
          >
            <p style={{ margin: 0, color: css.muted, fontSize: 12, lineHeight: 1.6 }}>
              {MODE_DESCRIPTIONS[mode]}
            </p>
          </div>

          {/* ================= PLATFORM FOR GENERATE / ANALYZE ================= */}
          {mode !== "adapt" && (
            <div>
              <SectionLabel color={css.muted}>Platforma docelowa</SectionLabel>

              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {PLATFORMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPlatform(item.id)}
                    className="ciq-platform-pill"
                    style={{
                      padding: "6px 12px",
                      borderRadius: 9,
                      border: `1.5px solid ${
                        platform === item.id ? item.color : css.border
                      }`,
                      background:
                        platform === item.id ? `${item.color}20` : "transparent",
                      color: platform === item.id ? item.color : css.muted,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ================= PLATFORMS FOR ADAPT ================= */}
          {mode === "adapt" && (
            <div>
              <SectionLabel color={css.muted}>Adaptuj na platformy</SectionLabel>

              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {PLATFORMS.map((item) => {
                  const selected = selectedAdaptPlatforms.includes(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleAdaptPlatform(item.id)}
                      className="ciq-platform-pill"
                      style={{
                        padding: "6px 12px",
                        borderRadius: 9,
                        border: `1.5px solid ${selected ? item.color : css.border}`,
                        background: selected ? `${item.color}20` : "transparent",
                        color: selected ? item.color : css.muted,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= CONTENT TYPE ================= */}
          {mode === "generate" && (
            <div>
              <SectionLabel color={css.muted}>Typ contentu</SectionLabel>

              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {CONTENT_TYPES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setContentType(item)}
                    className="ciq-platform-pill"
                    style={{
                      padding: "6px 12px",
                      borderRadius: 9,
                      border: `1px solid ${
                        contentType === item ? css.accent : css.border
                      }`,
                      background:
                        contentType === item ? `${css.accent}20` : "transparent",
                      color: contentType === item ? css.accent : css.muted,
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontWeight: contentType === item ? 700 : 500,
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ================= PROMPT TEXTAREA ================= */}
          <div>
            <SectionLabel color={css.muted}>
              {mode === "generate"
                ? "Temat, cel, grupa odbiorców"
                : mode === "analyze"
                  ? "Treść do analizy"
                  : "Treść do adaptacji"}
            </SectionLabel>

            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={
                mode === "generate"
                  ? "np. Jak AI pomaga firmom analizować content — cel: edukacja, odbiorcy: marketerzy B2B, ton: ekspercki"
                  : mode === "analyze"
                    ? "Wklej tutaj treść posta, artykułu, newslettera, opisu video lub skryptu, który chcesz przeanalizować..."
                    : "Wklej tutaj oryginalną treść, którą chcesz zaadaptować na wiele platform..."
              }
              style={{
                width: "100%",
                padding: "13px 15px",
                borderRadius: 14,
                border: `1px solid ${css.border}`,
                background: css.surface,
                color: css.text,
                fontSize: 13,
                lineHeight: 1.7,
                fontFamily: "inherit",
                outline: "none",
                minHeight: 135,
              }}
              onFocus={(event) => {
                event.target.style.borderColor = css.accent;
              }}
              onBlur={(event) => {
                event.target.style.borderColor = css.border;
              }}
            />
          </div>

          {/* ================= CTA ================= */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={
              loading ||
              !prompt.trim() ||
              (mode === "adapt" && selectedAdaptPlatforms.length === 0)
            }
            className="ciq-generate-btn"
            style={{
              padding: "14px",
              borderRadius: 14,
              border: "none",
              background: dark ? "#fff" : "#0f172a",
              color: dark ? "#0f172a" : "#fff",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    border: "2px solid currentColor",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
                AI generuje odpowiedź...
              </>
            ) : (
              <>
                {mode === "generate"
                  ? "✦ Generuj content"
                  : mode === "analyze"
                    ? "◉ Analizuj treść"
                    : "⊞ Adaptuj na platformy"}
              </>
            )}
          </button>

          {/* ================= ERROR ================= */}
          {error && (
            <div
              style={{
                padding: "11px 14px",
                borderRadius: 12,
                background: "#ef444415",
                border: "1px solid #ef444430",
                color: "#ef4444",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              ⚠ {error}
            </div>
          )}
        </div>

        {/* ───────────────── RIGHT: RESULTS PANEL ───────────────── */}
        <div>
          {/* ================= EMPTY STATE ================= */}
          {!generated && !analysis && !adapted && !loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 340,
                gap: 12,
                border: `1px dashed ${css.border}`,
                borderRadius: 16,
                background: css.surface,
                padding: 26,
              }}
            >
              <div style={{ fontSize: 36, opacity: 0.18 }}>✦</div>
              <div
                style={{
                  fontSize: 20,
                  fontFamily: "'DM Serif Display', serif",
                  color: css.text,
                }}
              >
                Wynik pojawi się tutaj
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: css.muted,
                  textAlign: "center",
                  maxWidth: 280,
                  lineHeight: 1.7,
                }}
              >
                Wybierz tryb, platformę i wklej temat lub treść. AI przygotuje
                wynik zgodny z modułem ContentIQ.
              </div>
            </div>
          )}

          {/* ================= LOADING STATE ================= */}
          {loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 340,
                gap: 16,
                border: `1px solid ${css.border}`,
                borderRadius: 16,
                background: css.surface,
              }}
            >
              <div style={{ display: "flex", gap: 5 }}>
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: css.accent,
                      animation: `bounce 1.2s ease-in-out ${item * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>

              <div style={{ fontSize: 13, color: css.muted }}>
                AI przygotowuje odpowiedź...
              </div>
            </div>
          )}

          {/* ================= GENERATE RESULT ================= */}
          {generated && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <ResultScoreHeader
                label="Przewidywany AI Score"
                score={generated.estimated_score}
                note={generated.platform_notes}
                css={css}
              />

              {generated.title && (
                <ResultCard
                  label="Tytuł"
                  value={generated.title}
                  copyId="title"
                  copied={copied}
                  onCopy={copyToClipboard}
                  css={css}
                />
              )}

              <ResultCard
                label="Hook"
                value={generated.hook}
                copyId="hook"
                copied={copied}
                onCopy={copyToClipboard}
                css={css}
                italic
              />

              <ResultCard
                label="Treść"
                value={generated.body}
                copyId="body"
                copied={copied}
                onCopy={copyToClipboard}
                css={css}
                multiline
              />

              <div className="ciq-result-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <SmallResultCard label="CTA" value={generated.cta} css={css} />

                <div
                  style={{
                    padding: "13px 15px",
                    borderRadius: 14,
                    background: css.surface,
                    border: `1px solid ${css.border}`,
                  }}
                >
                  <SectionLabel color={css.accent}>Hashtagi</SectionLabel>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {safeArray(generated.hashtags).map((hashtag, index) => (
                      <span
                        key={`${hashtag}-${index}`}
                        style={{
                          fontSize: 10,
                          padding: "3px 8px",
                          borderRadius: 7,
                          background: `${css.accent}20`,
                          color: css.accent,
                          fontWeight: 700,
                        }}
                      >
                        {hashtag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `${generated.title ? `${generated.title}\n\n` : ""}${generated.hook}\n\n${generated.body}\n\n${generated.cta}\n\n${safeArray(generated.hashtags).join(" ")}`,
                    "all"
                  )
                }
                className="ciq-copy-btn"
                style={{
                  padding: "11px",
                  borderRadius: 12,
                  border: `1px solid ${css.border}`,
                  background: "transparent",
                  color: css.muted,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {copied === "all" ? "✓ Skopiowano całość" : "Kopiuj całą treść"}
              </button>

              <RawAnswerPanel rawAnswer={rawAnswer} />
            </div>
          )}

          {/* ================= ANALYZE RESULT ================= */}
          {analysis && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  padding: "15px 17px",
                  borderRadius: 14,
                  background: css.surface,
                  border: `1px solid ${css.border}`,
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: css.muted }}>
                    Ogólny AI Score
                  </div>

                  <div
                    style={{
                      fontSize: 34,
                      fontFamily: "'DM Serif Display', serif",
                      color: getScoreColor(analysis.score),
                    }}
                  >
                    {analysis.score}
                  </div>
                </div>

                <ScoreBar label="Jakość hooka" value={analysis.hook_quality} />
                <ScoreBar label="Jakość CTA" value={analysis.cta_quality} />
                <ScoreBar
                  label="Dopasowanie do platformy"
                  value={analysis.platform_fit}
                />
                <ScoreBar
                  label="Potencjał zaangażowania"
                  value={analysis.engagement_potential}
                />
              </div>

              <div className="ciq-result-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <ListCard
                  title="Mocne strony"
                  items={safeArray(analysis.strengths)}
                  color="#22c55e"
                  css={css}
                />

                <ListCard
                  title="Słabe strony"
                  items={safeArray(analysis.weaknesses)}
                  color="#ef4444"
                  css={css}
                />
              </div>

              <ListCard
                title="Jak poprawić"
                items={safeArray(analysis.improvements)}
                color={css.accent}
                css={css}
                numbered
              />

              {analysis.rewritten_hook && (
                <ResultCard
                  label="Poprawiony hook"
                  value={analysis.rewritten_hook}
                  copyId="rewritten-hook"
                  copied={copied}
                  onCopy={copyToClipboard}
                  css={css}
                  italic
                  accent
                />
              )}

              <RawAnswerPanel rawAnswer={rawAnswer} />
            </div>
          )}

          {/* ================= ADAPT RESULT ================= */}
          {adapted && (
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {Object.entries(adapted.platforms ?? {}).map(([platformId, variant]) => {
                const info = getPlatformInfo(platformId);
                if (!info || !variant) return null;

                const copyId = `adapt-${platformId}`;
                const hashtags = safeArray(variant.hashtags);

                return (
                  <div
                    key={platformId}
                    style={{
                      borderRadius: 14,
                      overflow: "hidden",
                      border: `1px solid ${css.border}`,
                      background: css.surface,
                    }}
                  >
                    <div
                      style={{
                        padding: "9px 14px",
                        background: `${info.color}18`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 900,
                            color: info.color,
                            background: `${info.color}20`,
                            padding: "3px 8px",
                            borderRadius: 7,
                          }}
                        >
                          {info.icon}
                        </span>

                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: css.text,
                          }}
                        >
                          {info.name}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: getScoreColor(variant.score),
                          }}
                        >
                          {variant.score}/100
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              `${variant.body}\n\n${hashtags.join(" ")}`,
                              copyId
                            )
                          }
                          className="ciq-copy-btn"
                          style={{
                            fontSize: 10,
                            color: css.muted,
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          {copied === copyId ? "✓" : "Kopiuj"}
                        </button>
                      </div>
                    </div>

                    <div style={{ padding: "13px 15px" }}>
                      <p
                        style={{
                          fontSize: 12,
                          color: css.text,
                          lineHeight: 1.7,
                          whiteSpace: "pre-wrap",
                          margin: "0 0 10px",
                        }}
                      >
                        {variant.body}
                      </p>

                      {hashtags.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 4,
                            marginBottom: 9,
                          }}
                        >
                          {hashtags.map((hashtag, index) => (
                            <span
                              key={`${platformId}-${hashtag}-${index}`}
                              style={{
                                fontSize: 10,
                                padding: "3px 7px",
                                borderRadius: 6,
                                background: `${info.color}15`,
                                color: info.color,
                                fontWeight: 700,
                              }}
                            >
                              {hashtag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div
                        style={{
                          fontSize: 11,
                          color: css.muted,
                          fontStyle: "italic",
                          lineHeight: 1.6,
                        }}
                      >
                        ℹ {variant.notes}
                      </div>
                    </div>
                  </div>
                );
              })}

              <RawAnswerPanel rawAnswer={rawAnswer} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SMALL UI COMPONENTS ─────────────────────────────────────────────────────

function SectionLabel({
  children,
  color,
}: {
  children: React.ReactNode;
  color: string;
}) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 800,
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

function ResultScoreHeader({
  label,
  score,
  note,
  css,
}: {
  label: string;
  score: number;
  note: string;
  css: {
    surface: string;
    border: string;
    text: string;
    muted: string;
  };
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        padding: "14px 16px",
        borderRadius: 14,
        background: css.surface,
        border: `1px solid ${css.border}`,
      }}
    >
      <div>
        <div style={{ fontSize: 11, color: css.muted }}>{label}</div>
        <div
          style={{
            fontSize: 32,
            fontFamily: "'DM Serif Display', serif",
            color: getScoreColor(score),
          }}
        >
          {score}
        </div>
      </div>

      <div
        style={{
          fontSize: 12,
          color: css.muted,
          maxWidth: 260,
          lineHeight: 1.55,
        }}
      >
        {note}
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
  copyId,
  copied,
  onCopy,
  css,
  italic = false,
  multiline = false,
  accent = false,
}: {
  label: string;
  value: string;
  copyId: string;
  copied: string | null;
  onCopy: (text: string, id: string) => void;
  css: {
    surface: string;
    border: string;
    text: string;
    muted: string;
    accent: string;
  };
  italic?: boolean;
  multiline?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 14,
        background: accent ? `${css.accent}12` : css.surface,
        border: `1px solid ${accent ? `${css.accent}35` : css.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          gap: 10,
        }}
      >
        <SectionLabel color={accent ? css.accent : css.accent}>{label}</SectionLabel>

        <button
          type="button"
          onClick={() => onCopy(value, copyId)}
          className="ciq-copy-btn"
          style={{
            fontSize: 10,
            color: accent ? css.accent : css.muted,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          {copied === copyId ? "✓ Skopiowano" : "Kopiuj"}
        </button>
      </div>

      <p
        style={{
          fontSize: multiline ? 13 : 14,
          color: css.text,
          lineHeight: 1.7,
          whiteSpace: multiline ? "pre-wrap" : "normal",
          fontStyle: italic ? "italic" : "normal",
          margin: 0,
        }}
      >
        {italic ? `"${value}"` : value}
      </p>
    </div>
  );
}

function SmallResultCard({
  label,
  value,
  css,
}: {
  label: string;
  value: string;
  css: {
    surface: string;
    border: string;
    text: string;
    accent: string;
  };
}) {
  return (
    <div
      style={{
        padding: "13px 15px",
        borderRadius: 14,
        background: css.surface,
        border: `1px solid ${css.border}`,
      }}
    >
      <SectionLabel color={css.accent}>{label}</SectionLabel>

      <p
        style={{
          fontSize: 12,
          color: css.text,
          lineHeight: 1.55,
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function ListCard({
  title,
  items,
  color,
  css,
  numbered = false,
}: {
  title: string;
  items: string[];
  color: string;
  css: {
    surface: string;
    border: string;
    text: string;
  };
  numbered?: boolean;
}) {
  return (
    <div
      style={{
        padding: "13px 15px",
        borderRadius: 14,
        background: css.surface,
        border: `1px solid ${css.border}`,
      }}
    >
      <SectionLabel color={color}>{title}</SectionLabel>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {items.length === 0 && (
          <p style={{ fontSize: 12, color: css.text, margin: 0 }}>
            Brak danych do wyświetlenia.
          </p>
        )}

        {items.map((item, index) => (
          <div
            key={`${title}-${index}`}
            style={{
              fontSize: 11,
              color: css.text,
              lineHeight: 1.55,
              paddingLeft: 10,
              borderLeft: `2px solid ${color}`,
            }}
          >
            {numbered ? `${index + 1}. ` : ""}
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}