"use client";

import React, { useState, useRef, type CSSProperties } from "react";
import { 
  UploadCloud, 
  Video, 
  Sparkles, 
  Trash2, 
  Eraser, 
  BookmarkPlus, 
  Loader2, 
  Bot, 
  Link as LinkIcon 
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ShortStudioProps = {
  dark?: boolean;
  workspaceId?: string;
};

// Zmienne kolorów zależne od motywu
const getColors = (dark: boolean) => ({
  bg: dark ? "#050505" : "#F6F6F6",
  surface: dark ? "#111111" : "#FFFFFF",
  surfaceSoft: dark ? "#0B0B0C" : "#FAFAFA",
  text: dark ? "#F5F5F5" : "#111111",
  muted: dark ? "#9CA3AF" : "#71717A",
  border: dark ? "#27272A" : "#E4E4E7",
  accent: dark ? "#E5E7EB" : "#111111",
  aiBg: dark ? "#0C1117" : "#F0F9FF",
  aiBgSoft: dark ? "#101820" : "#F8FCFF",
  aiBorder: dark ? "#1E3A4C" : "#BAE6FD",
  aiText: dark ? "#7DD3FC" : "#0284C7",
  danger: "#ef4444",
  dangerBg: dark ? "#451a1a" : "#fef2f2",
  success: "#22c55e",
});

export default function ShortStudio({ dark = true, workspaceId = "contentiq" }: ShortStudioProps) {
  const css = getColors(dark);
  const supabase = createClient();

  // --- STATE: WIDEO & ANALIZA ---
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [customUserNotes, setCustomUserNotes] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [analysisProvider, setAnalysisProvider] = useState<"gemini" | "deepseek">("gemini");
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  // --- STATE: SCENARIUSZE ---
  const [scenarioSuggestions, setScenarioSuggestions] = useState("");
  const [scenarioProvider, setScenarioProvider] = useState<"deepseek" | "gemini">("deepseek");
  const [scenarioResult, setScenarioResult] = useState<any | null>(null);
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);

  // --- STATE: SUPABASE & UI ---
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 3200);
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

    if (error || !created?.id) throw new Error(error.message);
    return created.id as string;
  }

  // --- LOGIKA WIDEO (EKSTRAKCJA KLATEK) ---
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setVideoFile(e.target.files[0]);
      setUploadProgress(0);
      setAnalysisResult(null);
    }
  };

  const extractFrames = async (file: File): Promise<string[]> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.crossOrigin = "anonymous";
      const frames: string[] = [];

      video.addEventListener("loadeddata", async () => {
        const canvas = document.createElement("canvas");
        // Pomniejszamy klatki, żeby nie przekroczyć limitów API
        canvas.width = video.videoWidth / 4; 
        canvas.height = video.videoHeight / 4;
        const ctx = canvas.getContext("2d");
        const duration = video.duration || 5;

        for (let i = 1; i <= 4; i++) {
          video.currentTime = (duration / 5) * i;
          await new Promise((r) => setTimeout(r, 400));
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          frames.push(canvas.toDataURL("image/jpeg", 0.7));
          setUploadProgress((prev) => prev + 15);
        }
        resolve(frames);
      });
      video.load();
    });
  };

  const handleAnalyzeVideo = async () => {
    if (!videoFile && analysisProvider === "gemini") {
      alert("Proszę wgrać wideo, aby użyć analizy wizualnej Gemini.");
      return;
    }
    
    setIsAnalyzing(true);
    setUploadProgress(10);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev < 40 ? prev + 5 : prev));
      }, 300);

      let frames: string[] = [];
      if (videoFile) {
        frames = await extractFrames(videoFile);
      }
      
      clearInterval(progressInterval);
      setUploadProgress(60);

      const payload = {
        upload_id: `upl_${Date.now()}`,
        workspace_id: workspaceId,
        storage_path: videoFile ? `/temp/${videoFile.name}` : "/temp/manual-analysis",
        file_name: videoFile ? videoFile.name : "Analiza bez pliku",
        mime_type: videoFile ? videoFile.type : "video/mp4",
        frame_data_urls: frames,
        ai_provider: analysisProvider,
        custom_user_notes: customUserNotes,
        reference_url: referenceUrl,
      };

      setUploadProgress(85);

      const res = await fetch("/api/analyze-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Błąd podczas analizy API.");

      const data = await res.json();
      setAnalysisResult(data);
      setUploadProgress(100);
      showToast("✓ Wideo przeanalizowane");
    } catch (error) {
      console.error(error);
      alert("Wystąpił błąd podczas analizy wideo.");
      setUploadProgress(0);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- LOGIKA SCENARIUSZA ---
  const handleGenerateScenario = async () => {
    if (!scenarioSuggestions.trim()) return;
    setIsGeneratingScenario(true);

    try {
      const payload = {
        mode: "generate",
        platform: "tiktok/reels/shorts",
        contentType: "short_video_scenario",
        prompt: scenarioSuggestions,
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Błąd API podczas generowania");

      const result = await res.json();
      setScenarioResult(result.data || { title: "Nowy Scenariusz", body: result.answer });
      showToast("✓ Scenariusz wygenerowany");
    } catch (error) {
      console.error(error);
      alert("Wystąpił błąd podczas tworzenia scenariusza.");
    } finally {
      setIsGeneratingScenario(false);
    }
  };

  // --- LOGIKA ZAPISU (SUPABASE) ---
  const handleSaveToSupabase = async (section: "analysis" | "scenario", isTemplate: boolean) => {
    setSaving(true);
    try {
      const wsId = await getOrCreateWorkspaceUuid();
      
      let title = "Bez tytułu";
      let body = "";
      let topic = "";

      if (section === "analysis" && analysisResult) {
        title = analysisResult.title;
        topic = analysisResult.detected_topic || "Analiza Wideo";
        body = `WIZUALNE PODSUMOWANIE:\n${analysisResult.visual_summary}\n\nHOOK:\n${analysisResult.hook}\n\nOPIS:\n${analysisResult.caption}\n\nHASHTAGI:\n${(analysisResult.hashtags || []).join(" ")}`;
      } else if (section === "scenario" && scenarioResult) {
        title = scenarioResult.title || "Scenariusz Short";
        topic = scenarioSuggestions;
        body = scenarioResult.body || JSON.stringify(scenarioResult, null, 2);
      }

      const { error: insertError } = await supabase
        .schema("contentiq")
        .from("content_drafts")
        .insert({
          workspace_id: wsId,
          title: title,
          body,
          topic,
          content_type: `Short Studio / ${section === "analysis" ? "Analiza" : "Scenariusz"}`,
          target_platforms: ["tiktok", "instagram_reels", "youtube_shorts"],
          status: isTemplate ? "template" : "draft",
        });

      if (insertError) throw new Error(insertError.message);
      showToast(`✓ Zapisano jako ${isTemplate ? "szablon" : "szkic"}`);
    } catch (error: any) {
      alert(`Błąd zapisu: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAction = (section: "analysis" | "scenario", action: "template" | "draft" | "clear" | "delete") => {
    if (action === "template" || action === "draft") {
      handleSaveToSupabase(section, action === "template");
      return;
    }

    if (section === "analysis") {
      if (action === "clear") setAnalysisResult(null);
      if (action === "delete") {
        setAnalysisResult(null);
        setCustomUserNotes("");
        setReferenceUrl("");
        setVideoFile(null);
        setUploadProgress(0);
      }
    } else {
      if (action === "clear") setScenarioResult(null);
      if (action === "delete") {
        setScenarioResult(null);
        setScenarioSuggestions("");
      }
    }
  };

  const styles = {
    sectionTitle: { fontSize: 20, fontWeight: 700, color: css.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8, fontFamily: "'DM Serif Display', serif" },
    grid: { display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 24, marginBottom: 40 },
    card: { background: css.surface, border: `1px solid ${css.border}`, borderRadius: 22, padding: 24, display: "flex", flexDirection: "column" as const, gap: 16 },
    label: { fontSize: 11, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: css.muted, marginBottom: 8, display: "block" },
    input: { width: "100%", padding: 12, borderRadius: 12, background: css.surfaceSoft, border: `1px solid ${css.border}`, color: css.text, fontFamily: "inherit", fontSize: 13 },
    textarea: { width: "100%", padding: 14, borderRadius: 16, background: css.surfaceSoft, border: `1px solid ${css.border}`, color: css.text, fontFamily: "inherit", fontSize: 13, resize: "vertical" as const, lineHeight: 1.7 },
    buttonPrimary: { background: dark ? "#ffffff" : "#111111", color: dark ? "#050505" : "#ffffff", border: "none", padding: "12px 20px", borderRadius: 14, fontSize: 13, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "opacity 0.2s" },
    actionRow: { display: "flex", gap: 10, marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${css.border}` },
    btnTemplate: { flex: 1, padding: "10px", background: css.aiBgSoft, color: css.aiText, border: `1px solid ${css.aiBorder}`, borderRadius: 12, cursor: "pointer", fontSize: 12, fontWeight: 800, display: "flex", justifyContent: "center", alignItems: "center", gap: 6 },
    btnClear: { padding: "10px 16px", background: "transparent", color: css.muted, border: `1px solid ${css.border}`, borderRadius: 12, cursor: "pointer", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 },
    btnDelete: { padding: "10px 16px", background: css.dangerBg, color: css.danger, border: `1px solid ${css.danger}40`, borderRadius: 12, cursor: "pointer", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 },
    tableHeader: { fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: css.muted, paddingBottom: 8, borderBottom: `1px solid ${css.border}` },
    tableRow: { display: "grid", gridTemplateColumns: "140px 1fr", gap: 16, padding: "14px 0", borderBottom: `1px dashed ${css.border}80`, fontSize: 13 },
  };

  return (
    <div style={{ "--bg": css.bg, "--surface": css.surface, fontFamily: "'DM Sans', sans-serif", color: css.text } as CSSProperties}>
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 100, background: "#052e16", color: "#22c55e", border: "1px solid #166534", borderRadius: 12, padding: "10px 16px", fontSize: 13, fontWeight: 800, boxShadow: "0 18px 44px rgba(0,0,0,0.35)" }}>
          {toast}
        </div>
      )}

      {/* ───────────────── GŁÓWNA SEKCJA: ANALIZA VIDEO ───────────────── */}
      <h2 style={styles.sectionTitle}><Video size={22} color={css.aiText} /> Analiza Wideo AI</h2>
      
      <div style={{ ...styles.grid, gridTemplateColumns: "1fr 1.3fr" }}>
        {/* LEWA KOLUMNA: UPLOAD & INPUT */}
        <div style={styles.card}>
          <div>
            <label style={styles.label}>Wybierz materiał (Short/Reel)</label>
            <div 
              style={{ border: `2px dashed ${css.border}`, borderRadius: 16, padding: 24, textAlign: "center", cursor: "pointer", background: css.surfaceSoft }}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={32} color={css.muted} style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: css.text }}>
                {videoFile ? videoFile.name : "Wgraj wideo do analizy"}
              </div>
              <input type="file" accept="video/mp4,video/quicktime,video/webm" ref={fileInputRef} style={{ display: "none" }} onChange={handleVideoSelect} />
            </div>
            
            {(uploadProgress > 0 || isAnalyzing) && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6, color: css.muted, fontWeight: 600 }}>
                  <span>{uploadProgress === 100 ? "Zakończono" : "Pobieranie klatek i analiza..."}</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div style={{ width: "100%", height: 6, background: css.border, borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ width: `${uploadProgress}%`, height: "100%", background: css.success, transition: "width 0.3s ease" }} />
                </div>
              </div>
            )}
          </div>

          <div>
            <label style={{ ...styles.label, display: "flex", alignItems: "center", gap: 6 }}>
              <LinkIcon size={14} /> Link referencyjny (Opcjonalnie)
            </label>
            <input 
              type="text"
              style={styles.input}
              placeholder="np. link do produktu, artykułu lub inspiracji..."
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
            />
          </div>

          <div>
            <label style={styles.label}>Twoje sugestie do analizy</label>
            <textarea 
              style={{ ...styles.textarea, minHeight: 90 }} 
              placeholder="np. Zwróć uwagę na jakość dźwięku. Jakie CTA sprawdzi się pod sprzedaż e-booka?"
              value={customUserNotes}
              onChange={(e) => setCustomUserNotes(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Model AI</label>
              <select style={styles.input} value={analysisProvider} onChange={(e) => setAnalysisProvider(e.target.value as any)}>
                <option value="gemini">Google Gemini (OCR / Obraz)</option>
                <option value="deepseek">DeepSeek Reasoner</option>
              </select>
            </div>
            <button 
              style={{ ...styles.buttonPrimary, opacity: isAnalyzing ? 0.6 : 1 }} 
              disabled={isAnalyzing}
              onClick={handleAnalyzeVideo}
            >
              {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Bot size={18} />}
              Analizuj
            </button>
          </div>
        </div>

        {/* PRAWA KOLUMNA: WYNIK ANALIZY (TABELA) */}
        <div style={{ ...styles.card, background: analysisResult ? css.aiBgSoft : css.surface, borderColor: analysisResult ? css.aiBorder : css.border }}>
          {!analysisResult ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: css.muted, textAlign: "center" }}>
              <Sparkles size={40} style={{ marginBottom: 16, opacity: 0.3 }} />
              <p style={{ fontWeight: 600, fontSize: 16, margin: "0 0 8px 0", color: css.text }}>Brak wyników analizy</p>
              <p style={{ fontSize: 13, maxWidth: 300, lineHeight: 1.6 }}>Wgraj wideo i pozwól AI wyciągnąć wnioski wizualne, najmocniejsze hooki i rekomendacje.</p>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, overflowY: "auto", paddingRight: 8 }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: css.aiText, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>✦ Tytuł / Temat</div>
                  <h3 style={{ fontSize: 24, fontWeight: 400, margin: 0, color: css.text, fontFamily: "'DM Serif Display', serif" }}>{analysisResult.title}</h3>
                </div>

                <div style={{ marginBottom: 20, padding: 16, background: css.surfaceSoft, borderRadius: 16, border: `1px solid ${css.border}` }}>
                  <div style={{ fontSize: 10, color: css.accent, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Najmocniejszy Hook</div>
                  <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: css.text, fontStyle: "italic" }}>"{analysisResult.hook}"</p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: css.muted, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Proponowana Treść Posta</div>
                  <p style={{ fontSize: 13, lineHeight: 1.8, color: css.text, margin: 0, whiteSpace: "pre-wrap" }}>{analysisResult.caption}</p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: css.muted, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Podsumowanie wizualne</div>
                  <p style={{ fontSize: 12, lineHeight: 1.6, color: css.muted, margin: 0 }}>{analysisResult.visual_summary}</p>
                </div>

                {/* LOGIKA TABELI (ZGODNA Z WYTYCZNYMI) */}
                {analysisResult.platform_recommendations && analysisResult.platform_recommendations.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <div style={styles.tableHeader}>Tabela Rekomendacji Platform</div>
                    {analysisResult.platform_recommendations.map((plat: any, i: number) => (
                      <div key={i} style={styles.tableRow}>
                        <div>
                          <strong style={{ color: css.text, textTransform: "capitalize", fontSize: 14 }}>
                            {plat.platform.replace("_", " ")}
                          </strong>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <span style={{ color: css.text, lineHeight: 1.5 }}>
                            <strong>Hook:</strong> {plat.hook}
                          </span>
                          <span style={{ color: css.muted, fontSize: 12, lineHeight: 1.5 }}>
                            <strong>Notatki:</strong> {plat.publishing_notes}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.actionRow}>
                <button style={styles.btnTemplate} onClick={() => handleAction("analysis", "template")} disabled={saving}>
                  <BookmarkPlus size={16} /> Szablon
                </button>
                <button style={{ ...styles.btnTemplate, background: "transparent", color: css.text, borderColor: css.border }} onClick={() => handleAction("analysis", "draft")} disabled={saving}>
                  Szkic
                </button>
                <button style={styles.btnClear} onClick={() => handleAction("analysis", "clear")}>
                  <Eraser size={16} />
                </button>
                <button style={styles.btnDelete} onClick={() => handleAction("analysis", "delete")}>
                  <Trash2 size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ height: 1, background: css.border, margin: "40px 0" }} />

      {/* ───────────────── SEKCJA DOLNA: SCENARIUSZ SHORTÓW ───────────────── */}
      <h2 style={styles.sectionTitle}><Sparkles size={22} color={css.aiText} /> Kreator Scenariuszy</h2>
      
      <div style={styles.grid}>
        {/* LEWA KOLUMNA: INPUT SCENARIUSZA */}
        <div style={styles.card}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Kontekst i Brief (Dla AI)</label>
            <textarea 
              style={{ ...styles.textarea, minHeight: 180 }} 
              placeholder="Opisz krótko swój pomysł na shorta. Kto jest docelowym odbiorcą? Jaki ma być wydźwięk materiału (edukacyjny, humorystyczny)? Co jest głównym problemem, który rozwiązujesz?"
              value={scenarioSuggestions}
              onChange={(e) => setScenarioSuggestions(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Model AI</label>
              <select style={styles.input} value={scenarioProvider} onChange={(e) => setScenarioProvider(e.target.value as any)}>
                <option value="deepseek">DeepSeek Reasoner (Tworzenie i Strategia)</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </div>
            <button 
              style={{ ...styles.buttonPrimary, opacity: (!scenarioSuggestions.trim() || isGeneratingScenario) ? 0.6 : 1 }} 
              disabled={!scenarioSuggestions.trim() || isGeneratingScenario}
              onClick={handleGenerateScenario}
            >
              {isGeneratingScenario ? <Loader2 className="animate-spin" size={18} /> : <Bot size={18} />}
              Generuj Skrypt
            </button>
          </div>
        </div>

        {/* PRAWA KOLUMNA: WYNIK SCENARIUSZA */}
        <div style={{ ...styles.card, background: scenarioResult ? css.aiBgSoft : css.surface, borderColor: scenarioResult ? css.aiBorder : css.border }}>
          {!scenarioResult ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: css.muted, textAlign: "center" }}>
              <Sparkles size={40} style={{ marginBottom: 16, opacity: 0.3 }} />
              <p style={{ fontWeight: 600, fontSize: 16, margin: "0 0 8px 0", color: css.text }}>Brak scenariusza</p>
              <p style={{ fontSize: 13, maxWidth: 300, lineHeight: 1.6 }}>Opisz swój pomysł po lewej stronie, aby AI przygotowało kompleksowy scenariusz na shorta.</p>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, overflowY: "auto", paddingRight: 8 }}>
                <div style={{ fontSize: 10, color: css.aiText, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>✦ Koncepcja Od AI</div>
                <h3 style={{ fontSize: 24, fontWeight: 400, margin: "0 0 16px 0", color: css.text, fontFamily: "'DM Serif Display', serif" }}>{scenarioResult.title || "Nowy Scenariusz Wideo"}</h3>
                
                <div style={{ fontSize: 13, lineHeight: 1.8, color: css.text, whiteSpace: "pre-wrap" }}>
                  {scenarioResult.body || scenarioResult.hook || JSON.stringify(scenarioResult, null, 2)}
                </div>

                {scenarioResult.hashtags && (
                  <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {scenarioResult.hashtags.map((tag: string) => (
                      <span key={tag} style={{ background: `${css.aiText}18`, color: css.aiText, padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.actionRow}>
                <button style={styles.btnTemplate} onClick={() => handleAction("scenario", "template")} disabled={saving}>
                  <BookmarkPlus size={16} /> Szablon
                </button>
                <button style={{ ...styles.btnTemplate, background: "transparent", color: css.text, borderColor: css.border }} onClick={() => handleAction("scenario", "draft")} disabled={saving}>
                  Szkic
                </button>
                <button style={styles.btnClear} onClick={() => handleAction("scenario", "clear")}>
                  <Eraser size={16} />
                </button>
                <button style={styles.btnDelete} onClick={() => handleAction("scenario", "delete")}>
                  <Trash2 size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}