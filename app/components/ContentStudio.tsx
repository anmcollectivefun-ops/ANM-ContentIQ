"use client";

// ─── Content Studio — ANM ContentIQ ──────────────────────────────────────────
// Podłączony do /api/ai (DeepSeek R1)
// Tryby: generowanie, analiza, adaptacja na platformy
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";

// ─── TYPY ────────────────────────────────────────────────────────────────────

type Mode = "generate" | "analyze" | "adapt";
type Platform = "linkedin" | "instagram" | "tiktok" | "youtube" | "facebook" | "blog";

interface GeneratedContent {
  title: string;
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

const PLATFORMS: { id: Platform; name: string; color: string; icon: string }[] = [
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2", icon: "LI" },
  { id: "instagram", name: "Instagram", color: "#E1306C", icon: "IG" },
  { id: "tiktok", name: "TikTok", color: "#111", icon: "TT" },
  { id: "youtube", name: "YouTube", color: "#FF0000", icon: "YT" },
  { id: "facebook", name: "Facebook", color: "#1877F2", icon: "FB" },
  { id: "blog", name: "Blog", color: "#22C55E", icon: "BL" },
];

const CONTENT_TYPES = [
  "Post ekspercki",
  "Case study",
  "Lista / poradnik",
  "Reels / Shorts script",
  "Karuzela",
  "Artykuł blogowy",
  "Newsletter",
  "Ogłoszenie",
];

// ─── SCORE BAR ───────────────────────────────────────────────────────────────

function ScoreBar({ label, value, color }: { label: string; value: number; color?: string }) {
  const c = color || (value >= 80 ? "#22c55e" : value >= 60 ? "#f59e0b" : "#ef4444");
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: c }}>{value}/100</span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: c, borderRadius: 2, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

// ─── THINKING PANEL ──────────────────────────────────────────────────────────

function ThinkingPanel({ thinking }: { thinking: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 16, borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", padding: "8px 14px", background: "var(--surface)", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--muted)", fontSize: 11, fontFamily: "inherit" }}>
        <span>◉ Proces myślowy DeepSeek R1</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding: "12px 14px", background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
          <pre style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "monospace", margin: 0 }}>
            {thinking}
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
  const [thinking, setThinking] = useState<string | null>(null);

  // Wyniki
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [adapted, setAdapted] = useState<AdaptResult | null>(null);
  const [selectedAdaptPlatforms, setSelectedAdaptPlatforms] = useState<Platform[]>(["linkedin", "instagram", "tiktok"]);
  const [rawAnswer, setRawAnswer] = useState("");
  const [error, setError] = useState("");

  // Kopiowanie
  const [copied, setCopied] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [prompt]);

  const css = dark
    ? { bg: "#080c14", surface: "#0f1520", text: "#eef2ff", muted: "#3d4966", border: "#151e30", accent: "#818cf8" }
    : { bg: "#f8f7f4", surface: "#ffffff", text: "#0f172a", muted: "#94a3b8", border: "#e8e8e4", accent: "#6366f1" };

  // Wstrzyknij CSS zmienne
  const rootStyle: Record<string, string> = {
    "--bg": css.bg, "--surface": css.surface, "--text": css.text,
    "--muted": css.muted, "--border": css.border, "--accent": css.accent,
  } as Record<string, string>;

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    setGenerated(null);
    setAnalysis(null);
    setAdapted(null);
    setThinking(null);
    setRawAnswer("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          prompt,
          platform: mode === "generate" || mode === "analyze" ? platform : undefined,
          contentType: mode === "generate" ? contentType : undefined,
        }),
      });

      const json = await res.json();

      if (json.error) { setError(json.error); return; }
      if (json.thinking) setThinking(json.thinking);
      if (json.answer) setRawAnswer(json.answer);

      if (json.data) {
        if (mode === "generate") setGenerated(json.data as GeneratedContent);
        if (mode === "analyze") setAnalysis(json.data as AnalysisResult);
        if (mode === "adapt") setAdapted(json.data as AdaptResult);
      } else if (json.parseError) {
        setError(`Błąd parsowania: ${json.parseError}`);
        setRawAnswer(json.answer);
      }
    } catch {
      setError("Błąd połączenia z API");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const scColor = (s: number) => s >= 80 ? "#22c55e" : s >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ ...rootStyle, fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", color: css.text } as React.CSSProperties}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }
        textarea { resize: none; overflow: hidden; }
        .mode-btn { transition: all 0.15s; }
        .mode-btn:hover { opacity: 0.8; }
        .plat-pill { transition: all 0.15s; cursor: pointer; }
        .plat-pill:hover { transform: translateY(-1px); }
        .generate-btn { transition: all 0.2s; }
        .generate-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .copy-btn { transition: all 0.15s; }
        .copy-btn:hover { opacity: 0.7; }
      `}</style>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* ── LEFT: Input Panel ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Mode selector */}
          <div style={{ display: "flex", gap: 6, padding: "4px", background: css.surface, borderRadius: 12, border: `1px solid ${css.border}` }}>
            {(["generate", "analyze", "adapt"] as Mode[]).map((m) => {
              const labels = { generate: "✦ Generuj", analyze: "◉ Analizuj", adapt: "⊞ Adaptuj" };
              return (
                <button key={m} onClick={() => setMode(m)} className="mode-btn"
                  style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12, fontWeight: mode === m ? 600 : 400, background: mode === m ? (dark ? "#fff" : "#0f172a") : "transparent", color: mode === m ? (dark ? "#0f172a" : "#fff") : css.muted, fontFamily: "inherit" }}>
                  {labels[m]}
                </button>
              );
            })}
          </div>

          {/* Platform (dla generate i analyze) */}
          {mode !== "adapt" && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", color: css.muted, marginBottom: 8 }}>
                Platforma docelowa
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PLATFORMS.map((p) => (
                  <button key={p.id} onClick={() => setPlatform(p.id)} className="plat-pill"
                    style={{ padding: "5px 12px", borderRadius: 8, border: `1.5px solid ${platform === p.id ? p.color : css.border}`, background: platform === p.id ? p.color + "20" : "transparent", color: platform === p.id ? p.color : css.muted, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Platforms for adapt */}
          {mode === "adapt" && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", color: css.muted, marginBottom: 8 }}>
                Adaptuj na platformy
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PLATFORMS.map((p) => {
                  const sel = selectedAdaptPlatforms.includes(p.id);
                  return (
                    <button key={p.id} className="plat-pill"
                      onClick={() => setSelectedAdaptPlatforms(prev => sel ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                      style={{ padding: "5px 12px", borderRadius: 8, border: `1.5px solid ${sel ? p.color : css.border}`, background: sel ? p.color + "20" : "transparent", color: sel ? p.color : css.muted, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Content type (tylko dla generate) */}
          {mode === "generate" && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", color: css.muted, marginBottom: 8 }}>
                Typ contentu
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {CONTENT_TYPES.map((ct) => (
                  <button key={ct} onClick={() => setContentType(ct)} className="plat-pill"
                    style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${contentType === ct ? css.accent : css.border}`, background: contentType === ct ? css.accent + "20" : "transparent", color: contentType === ct ? css.accent : css.muted, fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: contentType === ct ? 500 : 400 }}>
                    {ct}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prompt textarea */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", color: css.muted, marginBottom: 8 }}>
              {mode === "generate" ? "Temat, cel, grupa odbiorców..." : mode === "analyze" ? "Wklej treść do analizy..." : "Wklej treść do adaptacji..."}
            </div>
            <textarea ref={textareaRef} value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === "generate" ? "np. „Jak AI pomaga firmom analizować content — cel: edukacja, odbiorcy: marketerzy B2B, ton: ekspercki""
                : mode === "analyze" ? "Wklej tutaj treść posta, artykułu lub skryptu który chcesz przeanalizować..."
                : "Wklej tutaj oryginalną treść którą chcesz zaadaptować na wiele platform..."
              }
              style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${css.border}`, background: css.surface, color: css.text, fontSize: 13, lineHeight: 1.7, fontFamily: "inherit", outline: "none", minHeight: 120 }}
              onFocus={(e) => (e.target.style.borderColor = css.accent)}
              onBlur={(e) => (e.target.style.borderColor = css.border)} />
          </div>

          {/* CTA */}
          <button onClick={handleGenerate} disabled={loading || !prompt.trim()} className="generate-btn"
            style={{ padding: "13px", borderRadius: 12, border: "none", background: dark ? "#fff" : "#0f172a", color: dark ? "#0f172a" : "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? (
              <>
                <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                DeepSeek R1 myśli...
              </>
            ) : (
              <>
                {mode === "generate" ? "✦ Generuj content" : mode === "analyze" ? "◉ Analizuj treść" : "⊞ Adaptuj na platformy"}
              </>
            )}
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "#ef444415", border: "1px solid #ef444430", color: "#ef4444", fontSize: 12 }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {/* ── RIGHT: Results Panel ── */}
        <div>
          {/* Empty state */}
          {!generated && !analysis && !adapted && !loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12, border: `1px dashed ${css.border}`, borderRadius: 14 }}>
              <div style={{ fontSize: 32, opacity: 0.15 }}>✦</div>
              <div style={{ fontSize: 14, fontFamily: "'DM Serif Display', serif", color: css.text }}>Wynik pojawi się tutaj</div>
              <div style={{ fontSize: 12, color: css.muted, textAlign: "center", maxWidth: 220, lineHeight: 1.6 }}>
                Wypełnij formularz i kliknij generuj — DeepSeek R1 przeanalizuje i stworzy content
              </div>
            </div>
          )}

          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 16, border: `1px solid ${css.border}`, borderRadius: 14, background: css.surface }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: css.accent, animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
              <div style={{ fontSize: 13, color: css.muted }}>DeepSeek R1 generuje odpowiedź...</div>
              <div style={{ fontSize: 11, color: css.muted, opacity: 0.6 }}>Model myśli przed odpowiedzią</div>
              <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0.8);opacity:0.5} 40%{transform:scale(1);opacity:1} }`}</style>
            </div>
          )}

          {/* ── GENERATE result ── */}
          {generated && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Score */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 12, background: css.surface, border: `1px solid ${css.border}` }}>
                <div>
                  <div style={{ fontSize: 11, color: css.muted }}>Przewidywany AI Score</div>
                  <div style={{ fontSize: 28, fontFamily: "'DM Serif Display', serif", color: scColor(generated.estimated_score) }}>{generated.estimated_score}</div>
                </div>
                <div style={{ fontSize: 12, color: css.muted, maxWidth: 200, lineHeight: 1.5 }}>{generated.platform_notes}</div>
              </div>

              {/* Hook */}
              <div style={{ padding: "14px 16px", borderRadius: 12, background: css.surface, border: `1px solid ${css.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: css.accent }}>Hook</div>
                  <button onClick={() => copyToClipboard(generated.hook, "hook")} className="copy-btn" style={{ fontSize: 10, color: css.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                    {copied === "hook" ? "✓ Skopiowano" : "Kopiuj"}
                  </button>
                </div>
                <p style={{ fontSize: 14, color: css.text, lineHeight: 1.6, fontStyle: "italic" }}>"{generated.hook}"</p>
              </div>

              {/* Body */}
              <div style={{ padding: "14px 16px", borderRadius: 12, background: css.surface, border: `1px solid ${css.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: css.accent }}>Treść</div>
                  <button onClick={() => copyToClipboard(generated.body, "body")} className="copy-btn" style={{ fontSize: 10, color: css.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                    {copied === "body" ? "✓ Skopiowano" : "Kopiuj"}
                  </button>
                </div>
                <p style={{ fontSize: 13, color: css.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{generated.body}</p>
              </div>

              {/* CTA + Hashtags */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ padding: "12px 14px", borderRadius: 12, background: css.surface, border: `1px solid ${css.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: css.accent, marginBottom: 6 }}>CTA</div>
                  <p style={{ fontSize: 12, color: css.text, lineHeight: 1.5 }}>{generated.cta}</p>
                </div>
                <div style={{ padding: "12px 14px", borderRadius: 12, background: css.surface, border: `1px solid ${css.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: css.accent, marginBottom: 6 }}>Hashtagi</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {generated.hashtags.map((h, i) => (
                      <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: css.accent + "20", color: css.accent }}>{h}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Copy all */}
              <button onClick={() => copyToClipboard(`${generated.hook}\n\n${generated.body}\n\n${generated.cta}\n\n${generated.hashtags.join(" ")}`, "all")} className="copy-btn"
                style={{ padding: "10px", borderRadius: 10, border: `1px solid ${css.border}`, background: "transparent", color: css.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                {copied === "all" ? "✓ Skopiowano całość!" : "Kopiuj całą treść"}
              </button>

              {thinking && <ThinkingPanel thinking={thinking} />}
            </div>
          )}

          {/* ── ANALYZE result ── */}
          {analysis && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ padding: "14px 16px", borderRadius: 12, background: css.surface, border: `1px solid ${css.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: css.muted }}>Ogólny AI Score</div>
                    <div style={{ fontSize: 32, fontFamily: "'DM Serif Display', serif", color: scColor(analysis.score) }}>{analysis.score}</div>
                  </div>
                </div>
                <ScoreBar label="Jakość hooka" value={analysis.hook_quality} />
                <ScoreBar label="Jakość CTA" value={analysis.cta_quality} />
                <ScoreBar label="Dopasowanie do platformy" value={analysis.platform_fit} />
                <ScoreBar label="Potencjał zaangażowania" value={analysis.engagement_potential} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ padding: "12px 14px", borderRadius: 12, background: css.surface, border: `1px solid ${css.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#22c55e", marginBottom: 8 }}>Mocne strony</div>
                  {analysis.strengths.map((s, i) => <div key={i} style={{ fontSize: 11, color: css.text, lineHeight: 1.5, marginBottom: 4, paddingLeft: 10, borderLeft: "2px solid #22c55e" }}>{s}</div>)}
                </div>
                <div style={{ padding: "12px 14px", borderRadius: 12, background: css.surface, border: `1px solid ${css.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#ef4444", marginBottom: 8 }}>Słabe strony</div>
                  {analysis.weaknesses.map((w, i) => <div key={i} style={{ fontSize: 11, color: css.text, lineHeight: 1.5, marginBottom: 4, paddingLeft: 10, borderLeft: "2px solid #ef4444" }}>{w}</div>)}
                </div>
              </div>

              <div style={{ padding: "12px 14px", borderRadius: 12, background: css.surface, border: `1px solid ${css.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: css.accent, marginBottom: 8 }}>Jak poprawić</div>
                {analysis.improvements.map((imp, i) => (
                  <div key={i} style={{ fontSize: 11, color: css.text, lineHeight: 1.5, marginBottom: 6, display: "flex", gap: 8 }}>
                    <span style={{ color: css.accent, flexShrink: 0 }}>{i + 1}.</span>{imp}
                  </div>
                ))}
              </div>

              {analysis.rewritten_hook && (
                <div style={{ padding: "12px 14px", borderRadius: 12, background: css.accent + "12", border: `1px solid ${css.accent}30` }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: css.accent, marginBottom: 6 }}>Poprawiony hook</div>
                  <p style={{ fontSize: 13, color: css.text, lineHeight: 1.6, fontStyle: "italic" }}>"{analysis.rewritten_hook}"</p>
                  <button onClick={() => copyToClipboard(analysis.rewritten_hook, "hook-r")} className="copy-btn" style={{ marginTop: 8, fontSize: 10, color: css.accent, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                    {copied === "hook-r" ? "✓ Skopiowano" : "Kopiuj hook →"}
                  </button>
                </div>
              )}

              {thinking && <ThinkingPanel thinking={thinking} />}
            </div>
          )}

          {/* ── ADAPT result ── */}
          {adapted && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(adapted.platforms).map(([pid, variant]) => {
                const pInfo = PLATFORMS.find(p => p.id === pid);
                if (!pInfo || !variant) return null;
                const copyId = `adapt-${pid}`;
                return (
                  <div key={pid} style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${css.border}` }}>
                    <div style={{ padding: "8px 14px", background: pInfo.color + "18", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: pInfo.color, background: pInfo.color + "20", padding: "2px 8px", borderRadius: 6 }}>{pInfo.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: css.text }}>{pInfo.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: scColor(variant.score) }}>{variant.score}/100</span>
                        <button onClick={() => copyToClipboard(`${variant.body}\n\n${variant.hashtags?.join(" ")}`, copyId)} className="copy-btn"
                          style={{ fontSize: 10, color: css.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                          {copied === copyId ? "✓" : "Kopiuj"}
                        </button>
                      </div>
                    </div>
                    <div style={{ padding: "12px 14px", background: css.surface }}>
                      <p style={{ fontSize: 12, color: css.text, lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: 8 }}>{variant.body}</p>
                      {variant.hashtags?.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                          {variant.hashtags.map((h, i) => <span key={i} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: pInfo.color + "15", color: pInfo.color }}>{h}</span>)}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: css.muted, fontStyle: "italic" }}>ℹ {variant.notes}</div>
                    </div>
                  </div>
                );
              })}
              {thinking && <ThinkingPanel thinking={thinking} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
