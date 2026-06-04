"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";

type ShortPlatform = "tiktok" | "instagram_reels" | "facebook_reels" | "youtube_shorts" | "linkedin_video";
type ShortGoal = "zasięg" | "edukacja" | "sprzedaż" | "lead" | "społeczność" | "eksperckość";
type ShortAiProvider = "gemini" | "deepseek";
type ShortVideoStatus = "idle" | "uploaded_temp" | "analyzed" | "template_ready" | "deleted_local" | "publishing" | "published_external" | "expired";

type VideoUploadRecord = {
  id: string;
  workspace_id: string;
  storage_path: string;
  signed_url: string | null;
  file_name: string;
  mime_type: string;
  file_size: number;
  status: Exclude<ShortVideoStatus, "idle">;
};

type ShortVideoAnalysis = {
  title: string;
  visual_summary: string;
  transcript: string;
  detected_topic: string;
  hook: string;
  caption: string;
  hashtags: string[];
  on_screen_text: { time: string; text: string }[];
  platform_recommendations: {
    platform: ShortPlatform;
    caption: string;
    hook: string;
    hashtags: string[];
    publishing_notes: string;
  }[];
  template_summary: string;
};

type ShortVariant = {
  platform: ShortPlatform;
  platform_name: string;
  duration_seconds: number;
  format: string;
  hook: string;
  script: string;
  shots: { time: string; scene: string; action: string }[];
  on_screen_text: { time: string; text: string }[];
  caption: string;
  hashtags: string[];
  thumbnail_text: string;
  publishing_notes: string;
  score: number;
};

type ShortResult = {
  idea_title: string;
  main_angle: string;
  ai_summary: string;
  variants: ShortVariant[];
  cross_platform_notes: string[];
};

type ApiResponse = { answer?: string; error?: string };

const TEMP_VIDEO_BUCKET = "contentiq-temp-videos";
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);

const SHORT_PLATFORMS: { id: ShortPlatform; name: string; shortName: string; color: string }[] = [
  { id: "tiktok", name: "TikTok", shortName: "TikTok", color: "#ffffff" },
  { id: "instagram_reels", name: "Instagram Reels", shortName: "Reels", color: "#E1306C" },
  { id: "facebook_reels", name: "Facebook Reels", shortName: "FB Reels", color: "#1877F2" },
  { id: "youtube_shorts", name: "YouTube Shorts", shortName: "Shorts", color: "#FF0033" },
  { id: "linkedin_video", name: "LinkedIn Video", shortName: "LinkedIn", color: "#0A66C2" },
];

const GOALS: ShortGoal[] = ["zasięg", "edukacja", "sprzedaż", "lead", "społeczność", "eksperckość"];
const FORMATS = ["3 błędy", "3 wskazówki", "Mit vs prawda", "Przed / po", "Mini tutorial", "POV", "Case study w 30 sekund", "Lista narzędzi", "Problem → rozwiązanie", "Reakcja na trend"];
const LENGTHS = [15, 20, 30, 45, 60];

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function cleanJsonAnswer(answer: string) {
  return answer.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

function safeFileName(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  const extension = dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
  const base = dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName;
  return `${base.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72) || "short-video"}${extension}`;
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function normalizeVideoAnalysis(value: Partial<ShortVideoAnalysis>): ShortVideoAnalysis {
  return {
    title: value.title || "Analiza short video",
    visual_summary: value.visual_summary || "",
    transcript: value.transcript || "",
    detected_topic: value.detected_topic || value.title || "",
    hook: value.hook || "",
    caption: value.caption || "",
    hashtags: safeArray(value.hashtags),
    on_screen_text: safeArray(value.on_screen_text),
    platform_recommendations: safeArray(value.platform_recommendations).map((item) => ({
      platform: item.platform,
      caption: item.caption || "",
      hook: item.hook || "",
      hashtags: safeArray(item.hashtags),
      publishing_notes: item.publishing_notes || "",
    })),
    template_summary: value.template_summary || "",
  };
}

function explainSupabaseVideoError(message: string) {
  if (message.includes("permission denied") || message.includes("row-level security")) {
    return "Supabase blokuje zapis. Sprawdź RLS dla tabel short_video_uploads, short_templates oraz policy Storage dla contentiq-temp-videos.";
  }
  return message;
}

function getPlatformInfo(platform: ShortPlatform) {
  return SHORT_PLATFORMS.find((item) => item.id === platform);
}

function getScoreColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

function formatResultAsText(result: ShortResult) {
  return `
${result.idea_title}

GŁÓWNY KĄT:
${result.main_angle}

AI PODSUMOWANIE:
${result.ai_summary}

WARIANTY:
${safeArray(result.variants).map((variant) => `
${variant.platform_name}
Score: ${variant.score}/100
Format: ${variant.format}
Długość: ${variant.duration_seconds}s

Hook:
${variant.hook}

Scenariusz:
${variant.script}

Opis:
${variant.caption}

Hashtagi:
${safeArray(variant.hashtags).join(" ")}
`).join("\n\n")}

WNIOSKI CROSS-PLATFORM:
${safeArray(result.cross_platform_notes).map((item) => `- ${item}`).join("\n")}
  `.trim();
}

function buildPrompt({ topic, sourceContent, selectedPlatforms, goal, format, duration, brandContext }: {
  topic: string;
  sourceContent: string;
  selectedPlatforms: ShortPlatform[];
  goal: ShortGoal;
  format: string;
  duration: number;
  brandContext: string;
}) {
  const platformNames = selectedPlatforms.map((id) => getPlatformInfo(id)?.name || id).join(", ");
  return `
Jesteś ekspertem od short video: TikTok, Instagram Reels, Facebook Reels, YouTube Shorts i LinkedIn Video.

Przygotuj osobne warianty short video na platformy: ${platformNames}.
Cel: ${goal}
Format: ${format}
Długość: ${duration} sekund

Temat / idea:
${topic}

Materiał źródłowy:
${sourceContent || "brak"}

Kontekst marki:
${brandContext || "brak"}

Zasady:
- nie kopiuj tego samego scenariusza 1:1 na wszystkie platformy,
- TikTok: mocny hook, szybkie tempo, naturalny język,
- Reels: emocje, teksty na ekranie, zapis i udostępnienia,
- YouTube Shorts: szybka wartość i retencja,
- LinkedIn Video: konkret, eksperckość, B2B.

Zwróć wyłącznie poprawny JSON, bez markdown:
{
  "idea_title": "tytuł głównej idei",
  "main_angle": "główny kąt komunikacji",
  "ai_summary": "krótkie podsumowanie AI",
  "variants": [
    {
      "platform": "tiktok",
      "platform_name": "TikTok",
      "duration_seconds": 30,
      "format": "3 błędy",
      "hook": "hook 0-2 sekundy",
      "script": "pełny scenariusz do powiedzenia",
      "shots": [{ "time": "0-2s", "scene": "co widzimy", "action": "co robi osoba" }],
      "on_screen_text": [{ "time": "0-2s", "text": "tekst na ekranie" }],
      "caption": "opis posta",
      "hashtags": ["#hashtag1", "#hashtag2"],
      "thumbnail_text": "tekst na miniaturę",
      "publishing_notes": "krótka wskazówka publikacyjna",
      "score": 85
    }
  ],
  "cross_platform_notes": ["wniosek porównawczy"]
}

W JSON zwróć warianty tylko dla: ${selectedPlatforms.join(", ")}.
  `.trim();
}

function SectionLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color, marginBottom: 8 }}>{children}</div>;
}

function Card({ title, eyebrow, children, css, accent = false, minHeight }: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  css: Record<string, string>;
  accent?: boolean;
  minHeight?: number;
}) {
  return (
    <section style={{ background: accent ? css.aiBg : css.surface, border: `1px solid ${accent ? css.aiBorder : css.border}`, borderRadius: 22, padding: 18, minHeight }}>
      <SectionLabel color={accent ? css.aiText : css.accent}>{eyebrow}</SectionLabel>
      <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, lineHeight: 1.05, margin: "0 0 14px", color: css.text, fontWeight: 400 }}>{title}</h3>
      {children}
    </section>
  );
}

function ResultBox({ label, children, css, accent = false }: { label: string; children: React.ReactNode; css: Record<string, string>; accent?: boolean }) {
  return <div style={{ background: accent ? css.aiBg : css.surfaceSoft, border: `1px solid ${accent ? css.aiBorder : css.border}`, borderRadius: 16, padding: 14 }}><SectionLabel color={accent ? css.aiText : css.accent}>{label}</SectionLabel>{children}</div>;
}

function Pill({ active, children, onClick, color, css }: { active: boolean; children: React.ReactNode; onClick: () => void; color: string; css: Record<string, string> }) {
  return <button type="button" onClick={onClick} style={{ padding: "7px 12px", borderRadius: 10, border: `1.5px solid ${active ? color : css.border}`, background: active ? `${color}18` : "transparent", color: active ? color : css.muted, fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{children}</button>;
}

export default function ShortStudio({ dark = true, workspaceId = "contentiq" }: { dark?: boolean; workspaceId?: string }) {
  const supabase = createClient();
  const [selectedPlatforms, setSelectedPlatforms] = useState<ShortPlatform[]>(["tiktok", "instagram_reels", "youtube_shorts"]);
  const [goal, setGoal] = useState<ShortGoal>("zasięg");
  const [format, setFormat] = useState("3 błędy");
  const [duration, setDuration] = useState(30);
  const [topic, setTopic] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [brandContext, setBrandContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [result, setResult] = useState<ShortResult | null>(null);
  const [rawAnswer, setRawAnswer] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [videoUpload, setVideoUpload] = useState<VideoUploadRecord | null>(null);
  const [videoAnalysis, setVideoAnalysis] = useState<ShortVideoAnalysis | null>(null);
  const [videoStatus, setVideoStatus] = useState<ShortVideoStatus>("idle");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [analyzingVideo, setAnalyzingVideo] = useState(false);
  const [deletingVideo, setDeletingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoError, setVideoError] = useState("");
  const [shortAiProvider, setShortAiProvider] = useState<ShortAiProvider>("gemini");
  const [videoAnalysisNotes, setVideoAnalysisNotes] = useState("");
  const [videoReferenceUrl, setVideoReferenceUrl] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  const css: Record<string, string> = dark ? {
    surface: "#1E222B", surfaceSoft: "#171A21", text: "#F4F5F7", muted: "#A7ADB8", border: "#2C313D", accent: "#8FB7FF", aiBg: "#172337", aiBgSoft: "#1C2A3D", aiBorder: "#315E8E", aiText: "#8FD7FF",
  } : {
    surface: "#FFFFFF", surfaceSoft: "#F6F8FB", text: "#1B1F27", muted: "#667085", border: "#D9DEE7", accent: "#315E8E", aiBg: "#EAF6FF", aiBgSoft: "#F3FAFF", aiBorder: "#B9DCF5", aiText: "#156B9D",
  };

  const selectedPlatformNames = useMemo(() => selectedPlatforms.map((id) => getPlatformInfo(id)?.shortName || id).join(", "), [selectedPlatforms]);
  const canGenerate = selectedPlatforms.length > 0 && Boolean(topic.trim() || videoAnalysis?.detected_topic?.trim() || videoAnalysis?.title?.trim() || videoAnalysis?.hook?.trim());

  useEffect(() => () => { if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl); }, [videoPreviewUrl]);

  function showToast(message: string) { setToast(message); setTimeout(() => setToast(""), 3200); }

  function togglePlatform(platform: ShortPlatform) {
    setSelectedPlatforms((prev) => prev.includes(platform) ? (prev.length === 1 ? prev : prev.filter((item) => item !== platform)) : [...prev, platform]);
  }

  function updateVideoAnalysisField<K extends keyof ShortVideoAnalysis>(field: K, value: ShortVideoAnalysis[K]) {
    setVideoAnalysis((current) => current ? { ...current, [field]: value } : current);
  }

  async function getCurrentUserId() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Brak aktywnej sesji.");
    return data.user.id;
  }

  async function getOrCreateWorkspaceUuid() {
    const { data: existing, error: existingError } = await supabase.schema("contentiq").from("workspaces").select("id").eq("slug", workspaceId).maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing?.id) return existing.id as string;
    const userId = await getCurrentUserId();
    const { data: created, error } = await supabase.schema("contentiq").from("workspaces").insert({ user_id: userId, name: "ANM ContentIQ", type: "Content", slug: workspaceId }).select("id").single();
    if (error || !created?.id) throw new Error(error?.message || "Nie udało się utworzyć przestrzeni.");
    return created.id as string;
  }

  function handleVideoFileChange(file: File | null) {
    setVideoError(""); setVideoProgress(0); setVideoAnalysis(null); setVideoUpload(null); setVideoStatus("idle");
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl("");
    if (!file) { setVideoFile(null); return; }
    if (!ALLOWED_VIDEO_TYPES.has(file.type)) { setVideoFile(null); setVideoError("Zły format pliku. Dozwolone: MP4, MOV i WebM."); return; }
    if (file.size > MAX_VIDEO_SIZE_BYTES) { setVideoFile(null); setVideoError("Plik jest za duży. Maksymalny rozmiar to 100 MB."); return; }
    setVideoFile(file); setVideoPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadVideoTemp() {
    if (!videoFile) throw new Error("Brak pliku video.");
    setUploadingVideo(true); setVideoError(""); setVideoProgress(8);
    try {
      const wsId = await getOrCreateWorkspaceUuid();
      const userId = await getCurrentUserId();
      const path = `${userId}/${wsId}/${Date.now()}-${safeFileName(videoFile.name || "short-video")}`;
      const { error: uploadError } = await supabase.storage.from(TEMP_VIDEO_BUCKET).upload(path, videoFile, { contentType: videoFile.type, upsert: false });
      if (uploadError) throw new Error(`Błąd uploadu: ${uploadError.message}`);
      setVideoProgress(45);
      const { data: signedData } = await supabase.storage.from(TEMP_VIDEO_BUCKET).createSignedUrl(path, 60 * 60);
      const { data: row, error: insertError } = await supabase.schema("contentiq").from("short_video_uploads").insert({ workspace_id: wsId, user_id: userId, storage_bucket: TEMP_VIDEO_BUCKET, storage_path: path, public_url: null, file_name: videoFile.name, mime_type: videoFile.type, file_size: videoFile.size, status: "uploaded_temp" }).select("id, workspace_id, storage_path, file_name, mime_type, file_size, status").single();
      if (insertError || !row) { await supabase.storage.from(TEMP_VIDEO_BUCKET).remove([path]); throw new Error(insertError?.message || "Błąd zapisu uploadu w Supabase."); }
      const record: VideoUploadRecord = { id: row.id as string, workspace_id: row.workspace_id as string, storage_path: row.storage_path as string, signed_url: signedData?.signedUrl || null, file_name: row.file_name as string, mime_type: row.mime_type as string, file_size: Number(row.file_size || videoFile.size), status: row.status as Exclude<ShortVideoStatus, "idle"> };
      setVideoUpload(record); setVideoStatus("uploaded_temp"); setVideoProgress(60); return record;
    } catch (err) { setVideoError(explainSupabaseVideoError(err instanceof Error ? err.message : String(err))); throw err; }
    finally { setUploadingVideo(false); }
  }

  async function captureVideoFrames() {
  const currentVideo = videoRef.current;

  if (!currentVideo || !videoPreviewUrl) {
    return [];
  }

  const activeVideo: HTMLVideoElement = currentVideo;

  const waitForEvent = (eventName: string) =>
    new Promise<void>((resolve, reject) => {
      let timeout: number | undefined;

      const cleanup = () => {
        if (timeout) {
          window.clearTimeout(timeout);
        }

        activeVideo.removeEventListener(eventName, onEvent);
        activeVideo.removeEventListener("error", onError);
      };

      const onEvent = () => {
        cleanup();
        resolve();
      };

      const onError = () => {
        cleanup();
        reject(new Error("Błąd odczytu pliku video."));
      };

      timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error(`Nie udało się odczytać klatki video: ${eventName}.`));
      }, 2500);

      activeVideo.addEventListener(eventName, onEvent, { once: true });
      activeVideo.addEventListener("error", onError, { once: true });
    });

  if (activeVideo.readyState < 1) {
    await waitForEvent("loadedmetadata");
  }

  const duration =
    Number.isFinite(activeVideo.duration) && activeVideo.duration > 0
      ? activeVideo.duration
      : 1;

  const times = [0.8, duration * 0.45, Math.max(duration - 0.8, duration * 0.8)].map(
    (time) => Math.min(Math.max(time, 0.1), Math.max(duration - 0.1, 0.1))
  );

  const canvas = document.createElement("canvas");
  const width = Math.min(activeVideo.videoWidth || 720, 720);
  const height = Math.round(
    width * ((activeVideo.videoHeight || 1280) / (activeVideo.videoWidth || 720))
  );

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return [];
  }

  const frames: string[] = [];
  const originalTime = activeVideo.currentTime;
  const wasPaused = activeVideo.paused;

  activeVideo.pause();

  for (const time of times) {
    activeVideo.currentTime = time;
    await waitForEvent("seeked");
    ctx.drawImage(activeVideo, 0, 0, width, height);
    frames.push(canvas.toDataURL("image/jpeg", 0.78));
  }

  activeVideo.currentTime = originalTime;

  if (!wasPaused) {
    void activeVideo.play().catch(() => undefined);
  }

  return frames;
}

  async function analyzeVideo() {
    if (!videoFile && !videoUpload) { setVideoError("Najpierw wybierz plik video."); return; }
    setAnalyzingVideo(true); setVideoError(""); setVideoProgress(videoUpload ? 62 : 12);
    try {
      const frameDataUrls = await captureVideoFrames().catch(() => [] as string[]);
      const upload = videoUpload || await uploadVideoTemp();
      setVideoProgress(70);
      const res = await fetch("/api/shorts/analyze-video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ upload_id: upload.id, workspace_id: upload.workspace_id, storage_path: upload.storage_path, signed_url: upload.signed_url, file_name: upload.file_name, mime_type: upload.mime_type, frame_data_urls: frameDataUrls, ai_provider: shortAiProvider, custom_user_notes: videoAnalysisNotes, reference_url: videoReferenceUrl }) });
      const json = await res.json(); setVideoProgress(88);
      if (!res.ok || json.error) throw new Error(json.error || "Błąd AI podczas analizy filmu.");
      const analysis = normalizeVideoAnalysis(json);
      setVideoAnalysis(analysis); setVideoStatus("analyzed"); setVideoProgress(100);
      setTopic((current) => current || analysis.detected_topic || analysis.title || "");
      setSourceContent((current) => current || [analysis.transcript ? `Transkrypcja / opis wypowiedzi:\n${analysis.transcript}` : "", analysis.visual_summary ? `Opis wizualny:\n${analysis.visual_summary}` : "", analysis.caption ? `Opis AI:\n${analysis.caption}` : "", analysis.hashtags.length ? `Hashtagi:\n${analysis.hashtags.join(" ")}` : ""].filter(Boolean).join("\n\n"));
      const { error: updateError } = await supabase.schema("contentiq").from("short_video_uploads").update({ status: "analyzed", ai_transcript: analysis.transcript, ai_visual_summary: analysis.visual_summary, ai_detected_topic: analysis.detected_topic, ai_suggested_hook: analysis.hook, ai_suggested_caption: analysis.caption, ai_suggested_hashtags: analysis.hashtags }).eq("id", upload.id);
      if (updateError) throw new Error(updateError.message);
      showToast("✓ AI przygotowało analizę filmu");
    } catch (err) { setVideoError(explainSupabaseVideoError(err instanceof Error ? err.message : String(err))); }
    finally { setAnalyzingVideo(false); }
  }

  async function deleteTempVideo() {
    if (!videoUpload) { setVideoFile(null); if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl); setVideoPreviewUrl(""); setVideoStatus("idle"); setVideoProgress(0); return; }
    setDeletingVideo(true); setVideoError("");
    try {
      const { error: removeError } = await supabase.storage.from(TEMP_VIDEO_BUCKET).remove([videoUpload.storage_path]);
      if (removeError) throw new Error(removeError.message);
      await supabase.schema("contentiq").from("short_video_uploads").update({ status: "deleted_local", deleted_local_at: new Date().toISOString() }).eq("id", videoUpload.id);
      setVideoFile(null); setVideoUpload(null); setVideoAnalysis(null); setVideoStatus("deleted_local"); setVideoProgress(0);
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl); setVideoPreviewUrl(""); showToast("✓ Usunięto plik tymczasowy");
    } catch (err) { setVideoError(explainSupabaseVideoError(err instanceof Error ? err.message : String(err))); }
    finally { setDeletingVideo(false); }
  }

  async function saveAnalyzedVideoTemplate() {
    if (!videoAnalysis || !videoUpload) { setVideoError("Najpierw przeanalizuj film AI."); return; }
    setSavingTemplate(true); setVideoError("");
    try {
      const userId = await getCurrentUserId();
      const rows = videoAnalysis.platform_recommendations.length ? videoAnalysis.platform_recommendations : selectedPlatforms.map((platform) => ({ platform, caption: videoAnalysis.caption, hook: videoAnalysis.hook, hashtags: videoAnalysis.hashtags, publishing_notes: "" }));
      const { error } = await supabase.schema("contentiq").from("short_templates").insert(rows.map((item) => ({ workspace_id: videoUpload.workspace_id, user_id: userId, source_upload_id: videoUpload.id, title: videoAnalysis.title || videoAnalysis.detected_topic || "Short video", platform: item.platform, hook: item.hook, caption: item.caption, hashtags: item.hashtags, script: videoAnalysis.transcript, on_screen_text: videoAnalysis.on_screen_text, shots: [], thumbnail_text: videoAnalysis.hook, ai_summary: [videoAnalysis.template_summary, videoAnalysis.visual_summary, videoReferenceUrl.trim() ? `Link roboczy: ${videoReferenceUrl.trim()}` : ""].filter(Boolean).join("\n\n"), video_storage_path: videoUpload.storage_path, video_public_url: null, status: "template_ready" })));
      if (error) throw new Error(error.message);
      await supabase.schema("contentiq").from("short_video_uploads").update({ status: "template_ready" }).eq("id", videoUpload.id);
      setVideoStatus("template_ready"); showToast("✓ Zapisano szablon shorta z filmu");
    } catch (err) { setVideoError(explainSupabaseVideoError(err instanceof Error ? err.message : String(err))); }
    finally { setSavingTemplate(false); }
  }

  async function generateShorts() {
    const generationTopic = topic.trim() || videoAnalysis?.detected_topic?.trim() || videoAnalysis?.title?.trim() || videoAnalysis?.hook?.trim() || "";
    const generationSourceContent = sourceContent.trim() || [videoAnalysis?.transcript ? `Transkrypcja / opis wypowiedzi:\n${videoAnalysis.transcript}` : "", videoAnalysis?.visual_summary ? `Opis wizualny:\n${videoAnalysis.visual_summary}` : "", videoAnalysis?.caption ? `Opis AI:\n${videoAnalysis.caption}` : "", videoAnalysis?.hashtags?.length ? `Hashtagi:\n${videoAnalysis.hashtags.join(" ")}` : ""].filter(Boolean).join("\n\n");
    if (!generationTopic) { setError("Wpisz temat albo najpierw przeanalizuj film AI."); return; }
    setLoading(true); setError(""); setResult(null); setRawAnswer("");
    try {
      const prompt = buildPrompt({ topic: generationTopic, sourceContent: generationSourceContent, selectedPlatforms, goal, format, duration, brandContext });
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "chat", prompt }) });
      const json = await res.json() as ApiResponse;
      if (!res.ok || json.error) throw new Error(json.error || "Błąd API.");
      const answer = json.answer || ""; setRawAnswer(answer);
      const parsed = JSON.parse(cleanJsonAnswer(answer)) as ShortResult;
      parsed.variants = safeArray(parsed.variants).map((variant) => ({ ...variant, shots: safeArray(variant.shots), on_screen_text: safeArray(variant.on_screen_text), hashtags: safeArray(variant.hashtags), score: Number(variant.score || 0) }));
      parsed.cross_platform_notes = safeArray(parsed.cross_platform_notes);
      setResult(parsed); showToast("✓ Wygenerowano treści AI");
    } catch (err) { setError(err instanceof Error ? err.message : "AI nie zwróciło poprawnego JSON. Spróbuj jeszcze raz."); }
    finally { setLoading(false); }
  }

  async function saveDraft() {
    if (!result) return; setSaving(true); setError("");
    try {
      const wsId = await getOrCreateWorkspaceUuid();
      const avgScore = result.variants.length ? Math.round(result.variants.reduce((sum, item) => sum + item.score, 0) / result.variants.length) : null;
      const { error } = await supabase.schema("contentiq").from("content_drafts").insert({ workspace_id: wsId, title: result.idea_title || topic.slice(0, 80), body: formatResultAsText(result), topic, content_type: "Short Studio / multi-platform video", target_platforms: selectedPlatforms, ai_score: avgScore, ai_feedback: result.ai_summary, status: "draft" });
      if (error) throw new Error(error.message); showToast("✓ Zapisano jako szkic");
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setSaving(false); }
  }

  async function saveTemplate() {
    if (!result) return; setSavingTemplate(true); setError("");
    try {
      const wsId = await getOrCreateWorkspaceUuid();
      const avgScore = result.variants.length ? Math.round(result.variants.reduce((sum, item) => sum + item.score, 0) / result.variants.length) : null;
      const { error } = await supabase.schema("contentiq").from("content_drafts").insert({ workspace_id: wsId, title: result.idea_title || topic.slice(0, 80), body: formatResultAsText(result), topic, content_type: "Short Studio / multi-platform video", target_platforms: selectedPlatforms, ai_score: avgScore, ai_feedback: result.ai_summary, status: "template" });
      if (error) throw new Error(error.message);
      showToast("✓ Zapisano jako szablon");
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setSavingTemplate(false); }
  }

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", color: css.text } as CSSProperties}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }
        textarea { resize: none; }
        .short-card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: stretch; }
        .short-two-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .short-action-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        .variant-card { transition: transform .18s ease, border-color .18s ease; }
        .variant-card:hover { transform: translateY(-2px); border-color: ${css.aiBorder}; }
        @media(max-width: 980px) { .short-card-grid, .short-two-grid, .short-action-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {toast && <div style={{ position: "fixed", top: 20, right: 20, zIndex: 100, background: "#052e16", color: "#22c55e", border: "1px solid #166534", borderRadius: 12, padding: "10px 16px", fontSize: 13, fontWeight: 800 }}>{toast}</div>}

      <div style={{ marginBottom: 16 }}>
        <SectionLabel color={css.aiText}>Short Studio Pro</SectionLabel>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, lineHeight: 1.02, margin: "0 0 8px", color: css.text, fontWeight: 400 }}>Stwórz z AI swój short</h2>
        <p style={{ margin: 0, color: css.muted, fontSize: 13, lineHeight: 1.7 }}>Dodaj film i dostań gotowy opis posta albo wpisz pomysł i wygeneruj pełne warianty shortów.</p>
      </div>

      <div className="short-card-grid" style={{ marginBottom: 28 }}>
        <Card title="Dodaj film" eyebrow="Upload video" css={css} accent minHeight={520}>
          <p style={{ margin: "0 0 12px", color: css.muted, fontSize: 12, lineHeight: 1.7 }}>Film jest przechowywany tymczasowo. Po publikacji lokalny plik zostanie usunięty.</p>

          <SectionLabel color={css.aiText}>Silnik analizy</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {([{ id: "gemini", label: "Gemini" }, { id: "deepseek", label: "DeepSeek" }] as { id: ShortAiProvider; label: string }[]).map((item) => (
              <button key={item.id} type="button" onClick={() => setShortAiProvider(item.id)} style={{ borderRadius: 13, border: `1px solid ${shortAiProvider === item.id ? css.aiBorder : css.border}`, background: shortAiProvider === item.id ? css.aiBgSoft : css.surfaceSoft, color: shortAiProvider === item.id ? css.aiText : css.muted, padding: "10px 12px", cursor: "pointer", fontWeight: 900, fontFamily: "inherit" }}>{item.label}</button>
            ))}
          </div>

          <input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(e) => handleVideoFileChange(e.target.files?.[0] || null)} style={{ width: "100%", borderRadius: 14, border: `1px dashed ${css.aiBorder}`, background: css.surfaceSoft, color: css.text, padding: 12, fontSize: 12, fontFamily: "inherit" }} />

          {videoFile && <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: css.muted, fontSize: 11, marginBottom: 10 }}><span>{videoFile.name}</span><strong>{formatBytes(videoFile.size)}</strong></div>
            {videoPreviewUrl && <video ref={videoRef} src={videoPreviewUrl} controls style={{ width: "100%", maxHeight: 250, borderRadius: 16, background: "#000", border: `1px solid ${css.border}` }} />}
          </div>}

          <div style={{ marginTop: 12 }}>
            <SectionLabel color={css.aiText}>Sugestie dla AI</SectionLabel>
            <textarea value={videoAnalysisNotes} onChange={(e) => setVideoAnalysisNotes(e.target.value)} placeholder="Np. przygotuj opis sprzedażowy, mocny hook, CTA i hashtagi." style={{ width: "100%", minHeight: 82, borderRadius: 14, border: `1px solid ${css.aiBorder}`, background: css.surfaceSoft, color: css.text, padding: 12, outline: "none", fontFamily: "inherit", fontSize: 12, lineHeight: 1.65 }} />
          </div>

          <div style={{ marginTop: 12 }}>
            <SectionLabel color={css.aiText}>Link opcjonalny</SectionLabel>
            <input value={videoReferenceUrl} onChange={(e) => setVideoReferenceUrl(e.target.value)} placeholder="Landing page, produkt albo post referencyjny" style={{ width: "100%", borderRadius: 14, border: `1px solid ${css.aiBorder}`, background: css.surfaceSoft, color: css.text, padding: 12, outline: "none", fontFamily: "inherit", fontSize: 12 }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: videoUpload ? "1fr 1fr" : "1fr", gap: 8, marginTop: 12 }}>
            <button type="button" onClick={analyzeVideo} disabled={!videoFile || uploadingVideo || analyzingVideo} style={{ border: "none", borderRadius: 14, background: dark ? "#fff" : "#111", color: dark ? "#050505" : "#fff", padding: "12px 14px", fontSize: 12, fontWeight: 900, cursor: !videoFile || uploadingVideo || analyzingVideo ? "not-allowed" : "pointer", opacity: !videoFile || uploadingVideo || analyzingVideo ? 0.55 : 1, fontFamily: "inherit" }}>{uploadingVideo ? "Uploaduję film..." : analyzingVideo ? "AI analizuje film..." : "Przeanalizuj film AI"}</button>
            {videoUpload && <button type="button" onClick={deleteTempVideo} disabled={deletingVideo} style={{ borderRadius: 14, border: "1px solid #ef444460", background: "#ef444414", color: "#ef4444", padding: "12px 14px", fontSize: 12, fontWeight: 900, cursor: deletingVideo ? "not-allowed" : "pointer", fontFamily: "inherit" }}>{deletingVideo ? "Usuwam..." : "Usuń plik"}</button>}
          </div>

          <div style={{ marginTop: 10, color: css.muted, fontSize: 11 }}>Status: <strong style={{ color: css.aiText }}>{videoStatus}</strong></div>
          {(uploadingVideo || analyzingVideo || videoProgress > 0) && <div style={{ marginTop: 10 }}><div style={{ display: "flex", justifyContent: "space-between", color: css.muted, fontSize: 11, fontWeight: 800, marginBottom: 6 }}><span>{uploadingVideo ? "Upload" : analyzingVideo ? "Analiza AI" : "Gotowe"}</span><span>{Math.round(videoProgress)}%</span></div><div style={{ height: 7, borderRadius: 999, background: css.surfaceSoft, border: `1px solid ${css.border}`, overflow: "hidden" }}><div style={{ width: `${Math.min(100, Math.max(0, videoProgress))}%`, height: "100%", background: css.aiText }} /></div></div>}
          {videoError && <div style={{ marginTop: 12, background: "#ef444414", border: "1px solid #ef444440", color: "#ef4444", borderRadius: 14, padding: 12, fontSize: 12, lineHeight: 1.6 }}>{videoError}</div>}
        </Card>

        <Card title="Wynik wygenerowanej treści od AI" eyebrow="Analiza filmu" css={css} accent minHeight={520}>
          {!videoAnalysis && <div style={{ minHeight: 360, display: "grid", placeItems: "center", textAlign: "center", color: css.muted }}><p style={{ maxWidth: 420, fontSize: 13, lineHeight: 1.7 }}>Po analizie filmu pojawi się tutaj hook, opis, hashtagi i pakiet do zapisania jako szablon shorta.</p></div>}
          {videoAnalysis && <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <ResultBox label="Temat posta" css={css} accent><input value={videoAnalysis.detected_topic || videoAnalysis.title} onChange={(e) => { updateVideoAnalysisField("detected_topic", e.target.value); updateVideoAnalysisField("title", e.target.value); }} style={{ width: "100%", borderRadius: 12, border: `1px solid ${css.aiBorder}`, background: css.surface, color: css.text, padding: 11, fontFamily: "inherit", fontSize: 13, outline: "none" }} /></ResultBox>
            <ResultBox label="Hook" css={css}><textarea value={videoAnalysis.hook} onChange={(e) => updateVideoAnalysisField("hook", e.target.value)} style={{ width: "100%", minHeight: 66, borderRadius: 12, border: `1px solid ${css.border}`, background: css.surface, color: css.text, padding: 11, fontFamily: "inherit", fontSize: 13, lineHeight: 1.6, outline: "none" }} /></ResultBox>
            <ResultBox label="Opis posta" css={css}><textarea value={videoAnalysis.caption} onChange={(e) => updateVideoAnalysisField("caption", e.target.value)} style={{ width: "100%", minHeight: 112, borderRadius: 12, border: `1px solid ${css.border}`, background: css.surface, color: css.text, padding: 11, fontFamily: "inherit", fontSize: 13, lineHeight: 1.65, outline: "none" }} /></ResultBox>
            <ResultBox label="Hashtagi" css={css}><input value={videoAnalysis.hashtags.join(" ")} onChange={(e) => updateVideoAnalysisField("hashtags", e.target.value.split(/[\s,]+/).map((tag) => tag.trim()).filter(Boolean))} placeholder="#short #reels #content" style={{ width: "100%", borderRadius: 12, border: `1px solid ${css.border}`, background: css.surface, color: css.text, padding: 11, fontFamily: "inherit", fontSize: 13, outline: "none" }} /></ResultBox>
            <div className="short-two-grid"><ResultBox label="Opis wizualny" css={css}><textarea value={videoAnalysis.visual_summary} onChange={(e) => updateVideoAnalysisField("visual_summary", e.target.value)} style={{ width: "100%", minHeight: 105, borderRadius: 12, border: `1px solid ${css.border}`, background: css.surface, color: css.text, padding: 11, fontFamily: "inherit", fontSize: 12, lineHeight: 1.6, outline: "none" }} /></ResultBox><ResultBox label="Transkrypcja" css={css}><textarea value={videoAnalysis.transcript} onChange={(e) => updateVideoAnalysisField("transcript", e.target.value)} style={{ width: "100%", minHeight: 105, borderRadius: 12, border: `1px solid ${css.border}`, background: css.surface, color: css.text, padding: 11, fontFamily: "inherit", fontSize: 12, lineHeight: 1.6, outline: "none" }} /></ResultBox></div>
            <button type="button" onClick={saveAnalyzedVideoTemplate} disabled={savingTemplate} style={{ borderRadius: 14, border: `1px solid ${css.aiBorder}`, background: dark ? "#fff" : "#111", color: dark ? "#050505" : "#fff", padding: "12px 14px", fontSize: 12, fontWeight: 900, cursor: savingTemplate ? "not-allowed" : "pointer", opacity: savingTemplate ? 0.6 : 1, fontFamily: "inherit" }}>{savingTemplate ? "Zapisuję..." : "Zapisz jako szablon shorta"}</button>
          </div>}
        </Card>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionLabel color={css.accent}>Generator scenariusza</SectionLabel>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 34, lineHeight: 1.02, margin: "0 0 8px", color: css.text, fontWeight: 400 }}>Pomysł na short</h2>
        <p style={{ margin: 0, color: css.muted, fontSize: 13, lineHeight: 1.7 }}>Wpisz temat albo wykorzystaj analizę filmu. AI stworzy osobne warianty scenariusza, opisów i hashtagów dla wybranych platform.</p>
      </div>

      <div className="short-card-grid">
        <Card title="Treść dla AI" eyebrow="Prompt i ustawienia" css={css} minHeight={560}>
          <SectionLabel color={css.muted}>Platformy: {selectedPlatformNames}</SectionLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>{SHORT_PLATFORMS.map((item) => <Pill key={item.id} active={selectedPlatforms.includes(item.id)} onClick={() => togglePlatform(item.id)} color={item.color} css={css}>{item.name}</Pill>)}</div>
          <SectionLabel color={css.muted}>Cel</SectionLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>{GOALS.map((item) => <Pill key={item} active={goal === item} onClick={() => setGoal(item)} color={css.accent} css={css}>{item}</Pill>)}</div>
          <SectionLabel color={css.muted}>Format bazowy</SectionLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>{FORMATS.map((item) => <Pill key={item} active={format === item} onClick={() => setFormat(item)} color={css.aiText} css={css}>{item}</Pill>)}</div>
          <SectionLabel color={css.muted}>Długość bazowa</SectionLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>{LENGTHS.map((item) => <Pill key={item} active={duration === item} onClick={() => setDuration(item)} color={css.accent} css={css}>{item}s</Pill>)}</div>
          <SectionLabel color={css.muted}>Temat / idea</SectionLabel><textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="np. Dlaczego firmy nie powinny kopiować tego samego contentu na wszystkie platformy" style={{ width: "100%", minHeight: 112, borderRadius: 16, border: `1px solid ${css.border}`, background: css.surfaceSoft, color: css.text, padding: 14, outline: "none", fontFamily: "inherit", fontSize: 13, lineHeight: 1.7, marginBottom: 16 }} />
          <SectionLabel color={css.muted}>Materiał źródłowy</SectionLabel><textarea value={sourceContent} onChange={(e) => setSourceContent(e.target.value)} placeholder="Możesz wkleić post, opis bloga albo użyć analizy filmu AI." style={{ width: "100%", minHeight: 92, borderRadius: 16, border: `1px solid ${css.border}`, background: css.surfaceSoft, color: css.text, padding: 14, outline: "none", fontFamily: "inherit", fontSize: 13, lineHeight: 1.7, marginBottom: 16 }} />
          <SectionLabel color={css.muted}>Kontekst marki</SectionLabel><textarea value={brandContext} onChange={(e) => setBrandContext(e.target.value)} placeholder="np. marka ekspercka B2B, prosty ton, odbiorcy: właściciele firm." style={{ width: "100%", minHeight: 82, borderRadius: 16, border: `1px solid ${css.border}`, background: css.surfaceSoft, color: css.text, padding: 14, outline: "none", fontFamily: "inherit", fontSize: 13, lineHeight: 1.7, marginBottom: 18 }} />
          <button type="button" onClick={generateShorts} disabled={loading || !canGenerate} style={{ width: "100%", border: "none", borderRadius: 16, padding: "14px 16px", background: dark ? "#fff" : "#111", color: dark ? "#050505" : "#fff", fontSize: 13, fontWeight: 900, cursor: loading || !canGenerate ? "not-allowed" : "pointer", opacity: loading || !canGenerate ? 0.5 : 1, fontFamily: "inherit" }}>{loading ? "AI tworzy treści..." : "✦ Wygeneruj treści AI"}</button>
          {error && <div style={{ marginTop: 12, background: "#ef444414", border: "1px solid #ef444440", color: "#ef4444", borderRadius: 14, padding: 12, fontSize: 12, lineHeight: 1.6 }}>{error}</div>}
        </Card>

        <Card title="Wygenerowana treść AI" eyebrow="Scenariusze shortów" css={css} minHeight={560}>
          {!result && !loading && <div style={{ minHeight: 430, borderRadius: 18, border: `1px dashed ${css.border}`, background: css.surfaceSoft, display: "grid", placeItems: "center", padding: 28, textAlign: "center" }}><p style={{ maxWidth: 420, color: css.muted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>Po kliknięciu „Wygeneruj treści AI” zobaczysz tutaj hooki, scenariusze, opisy i hashtagi.</p></div>}
          {loading && <div style={{ minHeight: 430, display: "grid", placeItems: "center", textAlign: "center" }}><p style={{ color: css.muted, fontSize: 13 }}>AI dopasowuje shorty do platform...</p></div>}
          {result && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <ResultBox label="AI podsumowanie" css={css} accent><h3 style={{ margin: "0 0 8px", color: css.text, fontSize: 22, lineHeight: 1.2 }}>{result.idea_title}</h3><p style={{ margin: "0 0 10px", color: css.text, fontSize: 13, lineHeight: 1.7 }}>{result.ai_summary}</p><p style={{ margin: 0, color: css.muted, fontSize: 12 }}>Kąt: {result.main_angle}</p></ResultBox>
            {safeArray(result.variants).map((variant) => {
              const color = getPlatformInfo(variant.platform)?.color || css.accent;
              return <div key={variant.platform} className="variant-card" style={{ background: css.surface, border: `1px solid ${css.border}`, borderRadius: 20, overflow: "hidden" }}><div style={{ padding: "12px 15px", background: `${color}14`, borderBottom: `1px solid ${css.border}`, display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center" }}><div><div style={{ color, fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>{variant.platform_name}</div><div style={{ color: css.text, fontSize: 18, fontWeight: 900, marginTop: 3 }}>{variant.format} · {variant.duration_seconds}s</div></div><div style={{ color: getScoreColor(variant.score), fontSize: 28, fontWeight: 900 }}>{variant.score}</div></div><div style={{ padding: 15, display: "flex", flexDirection: "column", gap: 10 }}><ResultBox label="Hook" css={css} accent><p style={{ margin: 0, color: css.text, fontSize: 17, fontWeight: 900 }}>“{variant.hook}”</p></ResultBox><ResultBox label="Scenariusz" css={css}><p style={{ margin: 0, color: css.text, fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{variant.script}</p></ResultBox><ResultBox label="Opis i hashtagi" css={css}><p style={{ margin: 0, color: css.text, fontSize: 13, lineHeight: 1.7 }}>{variant.caption}</p><div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>{safeArray(variant.hashtags).map((tag, index) => <span key={`${variant.platform}-${tag}-${index}`} style={{ color, background: `${color}18`, borderRadius: 999, padding: "5px 9px", fontSize: 11, fontWeight: 800 }}>{tag}</span>)}</div></ResultBox></div></div>;
            })}
            <div className="short-action-grid"><button type="button" onClick={async () => { if (!result) return; await navigator.clipboard.writeText(formatResultAsText(result)); setCopied(true); setTimeout(() => setCopied(false), 1800); }} style={{ borderRadius: 14, border: `1px solid ${css.border}`, background: css.surface, color: css.muted, padding: "12px 14px", fontSize: 12, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>{copied ? "✓ Skopiowano" : "Kopiuj całość"}</button><button type="button" onClick={saveTemplate} disabled={savingTemplate} style={{ borderRadius: 14, border: `1px solid ${css.aiBorder}`, background: css.aiBg, color: css.aiText, padding: "12px 14px", fontSize: 12, fontWeight: 900, cursor: savingTemplate ? "not-allowed" : "pointer", opacity: savingTemplate ? 0.6 : 1, fontFamily: "inherit" }}>{savingTemplate ? "Zapisuję..." : "Zapisz jako szablon"}</button><button type="button" onClick={saveDraft} disabled={saving} style={{ borderRadius: 14, border: "none", background: dark ? "#fff" : "#111", color: dark ? "#050505" : "#fff", padding: "12px 14px", fontSize: 12, fontWeight: 900, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "inherit" }}>{saving ? "Zapisuję..." : "Zapisz jako szkic"}</button></div>
            {rawAnswer && <details style={{ background: css.surface, border: `1px solid ${css.border}`, borderRadius: 14, padding: 12 }}><summary style={{ color: css.muted, fontSize: 11, cursor: "pointer", fontWeight: 800 }}>Surowa odpowiedź AI</summary><pre style={{ color: css.muted, fontSize: 10, lineHeight: 1.7, whiteSpace: "pre-wrap", marginTop: 10 }}>{rawAnswer}</pre></details>}
          </div>}
        </Card>
      </div>
    </div>
  );
}
