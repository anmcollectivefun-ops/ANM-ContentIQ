"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Wand2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type VideoPlatform = "youtube" | "tiktok" | "facebook" | "instagram" | "linkedin";

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

type VideoAiProvider = "gemini" | "deepseek";

type VideoUploadStatus =
  | "idle"
  | "uploaded_temp"
  | "analyzed"
  | "template_ready"
  | "publishing"
  | "published_external"
  | "deleted_local"
  | "expired";

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
  thumbnail_prompt?: string;
  seo_keywords?: string[];
  chapters?: {
    time: string;
    title: string;
  }[];
  pinned_comment?: string;
  publish_checklist?: string[];
  retention_tips: string[];
  production_checklist: string[];
  estimated_score: number;
  ai_notes: string;
}

interface UploadedVideoAnalysis {
  title: string;
  visual_summary: string;
  transcript: string;
  detected_topic: string;
  hook: string;
  caption: string;
  hashtags: string[];
  on_screen_text: OnScreenText[];
  platform_recommendations: {
    platform: string;
    caption: string;
    hook: string;
    hashtags: string[];
    publishing_notes: string;
  }[];
  template_summary: string;
}

interface VideoUploadRecord {
  id: string;
  workspace_id: string;
  storage_path: string;
  public_url: string | null;
  signed_url: string | null;
  file_name: string;
  mime_type: string;
  file_size: number;
  status: VideoUploadStatus;
}

type ApiResponse = {
  answer?: string;
  data?: unknown;
  error?: string;
  details?: string;
};

const TEMP_VIDEO_BUCKET = "contentiq-temp-videos";
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

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
    name: "Instagram Video",
    color: "#E1306C",
    label: "IG",
  },
  {
    id: "youtube",
    name: "YouTube",
    color: "#FF0033",
    label: "YT",
  },
  {
    id: "facebook",
    name: "Facebook Video",
    color: "#1877F2",
    label: "FB",
  },
  {
    id: "linkedin",
    name: "LinkedIn Video",
    color: "#0A66C2",
    label: "IN",
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

const DURATIONS = [180, 300, 600, 900, 1200, 1800];

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

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function extractHashtags(text: string | null | undefined) {
  if (!text) return [];
  return unique((text.match(/#[\p{L}\p{N}_-]+/gu) || []).slice(0, 32));
}

function safeFileName(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  const extension = dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
  const base = dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName;

  return `${base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "video"}${extension}`;
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function normalizeUploadedVideoAnalysis(value: Partial<UploadedVideoAnalysis>): UploadedVideoAnalysis {
  return {
    title: value.title || "Analiza video",
    visual_summary: value.visual_summary || "",
    transcript: value.transcript || "",
    detected_topic: value.detected_topic || value.title || "",
    hook: value.hook || "",
    caption: value.caption || "",
    hashtags: safeArray(value.hashtags),
    on_screen_text: safeArray(value.on_screen_text),
    platform_recommendations: safeArray(value.platform_recommendations).map((item) => ({
      platform: item.platform || "",
      caption: item.caption || "",
      hook: item.hook || "",
      hashtags: safeArray(item.hashtags),
      publishing_notes: item.publishing_notes || "",
    })),
    template_summary: value.template_summary || "",
  };
}

function explainSupabaseVideoError(message: string) {
  if (
    message.includes("permission denied") ||
    message.includes("row-level security policy")
  ) {
    return "Supabase blokuje zapis. Sprawdź RLS dla short_video_uploads, short_templates i storage.objects.";
  }

  return message;
}

function buildVideoPrompt({
  platform,
  goal,
  format,
  duration,
  topic,
  sourceContent,
  brandContext,
}: {
  platform: VideoPlatform;
  goal: VideoGoal;
  format: VideoFormat;
  duration: number;
  topic: string;
  sourceContent: string;
  brandContext: string;
}) {
  const platformName = PLATFORMS.find((item) => item.id === platform)?.name || platform;

  return `
Jesteś ekspertem od video marketingu i krótkich/średnich formatów video.

Przygotuj pełny brief video dla platformy: ${platformName}.
Cel video: ${goal}
Format: ${format}
Długość: ${duration} sekund

Temat / pomysł:
${topic}

Materiał źródłowy / analiza uploadowanego filmu:
${sourceContent || "brak"}

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
- dobierz język i tempo do wybranej platformy,
- oceniaj pod video, nie pod zwykły post tekstowy.

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
  children: React.ReactNode;
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

function Card({
  children,
  css,
  variant = "default",
  minHeight,
}: {
  children: React.ReactNode;
  css: Record<string, string>;
  variant?: "default" | "aiGlow";
  minHeight?: number;
}) {
  const isAiGlow = variant === "aiGlow";

  return (
    <section
      style={{
        background: css.surface,
        border: `1px solid ${isAiGlow ? css.aiBorder : css.border}`,
        boxShadow: isAiGlow
          ? `0 20px 50px rgba(0,0,0,0.35), 0 18px 40px rgba(168, 85, 247, 0.16)`
          : "0 10px 24px rgba(0,0,0,0.18)",
        color: css.text,
        borderRadius: 18,
        padding: 16,
        minHeight,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {isAiGlow && (
        <div
          style={{
            position: "absolute",
            left: 20,
            right: 20,
            bottom: -18,
            height: 42,
            background: "rgba(168, 85, 247, 0.18)",
            filter: "blur(22px)",
            pointerEvents: "none",
          }}
        />
      )}

      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </section>
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
  children: React.ReactNode;
  onClick: () => void;
  color: string;
  css: Record<string, string>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "7px 11px",
        borderRadius: 10,
        border: `1px solid ${active ? color : css.border}`,
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
        background: css.surfaceSoft,
        border: `1px solid ${accent ? css.aiBorder : css.border}`,
        boxShadow: accent
          ? `0 10px 28px rgba(168, 85, 247, 0.10)`
          : "none",
        color: css.text,
        borderRadius: accent ? 18 : 14,
        padding: accent ? 14 : 13,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {accent && (
        <div
          style={{
            position: "absolute",
            left: 14,
            right: 14,
            bottom: -14,
            height: 28,
            background: "rgba(168, 85, 247, 0.14)",
            filter: "blur(18px)",
            pointerEvents: "none",
          }}
        />
      )}

      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionLabel color={accent ? css.aiText : css.accent}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {accent && <Wand2 size={15} color={css.aiIcon} />}
            {label}
          </span>
        </SectionLabel>
        {children}
      </div>
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

  const [platform, setPlatform] = useState<VideoPlatform>("youtube");
  const [goal, setGoal] = useState<VideoGoal>("zasięg");
  const [format, setFormat] = useState<VideoFormat>("3 błędy");
  const [duration, setDuration] = useState(600);
  const [topic, setTopic] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [brandContext, setBrandContext] = useState("");

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [videoUpload, setVideoUpload] = useState<VideoUploadRecord | null>(null);
  const [videoAnalysis, setVideoAnalysis] = useState<UploadedVideoAnalysis | null>(null);
  const [videoStatus, setVideoStatus] = useState<VideoUploadStatus>("idle");
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoError, setVideoError] = useState("");
  const [videoAnalysisNotes, setVideoAnalysisNotes] = useState("");
  const [videoReferenceUrl, setVideoReferenceUrl] = useState("");
  const [videoAiProvider, setVideoAiProvider] = useState<VideoAiProvider>("gemini");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [analyzingVideo, setAnalyzingVideo] = useState(false);
  const [deletingVideo, setDeletingVideo] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [brief, setBrief] = useState<VideoBrief | null>(null);
  const [rawAnswer, setRawAnswer] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const topicRef = useRef<HTMLTextAreaElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const contextRef = useRef<HTMLTextAreaElement>(null);

  const css: Record<string, string> = dark
    ? {
        bg: "#1A2233",
        surface: "#070707",
        surfaceSoft: "#101010",
        text: "#FFFFFF",
        muted: "#C9CED8",
        border: "rgba(255,255,255,0.10)",
        accent: "#8E443D",
        aiBg: "rgba(109, 40, 217, 0.16)",
        aiBgSoft: "rgba(147, 51, 234, 0.12)",
        aiBorder: "rgba(192, 132, 252, 0.55)",
        aiText: "#D8B4FE",
        aiGlow: "0 0 28px rgba(168, 85, 247, 0.28)",
        aiIcon: "#F0ABFC",
      }
    : {
        bg: "#FFFFFF",
        surface: "#B5937A",
        surfaceSoft: "#F7F2EF",
        text: "#231F20",
        muted: "#5F5A57",
        border: "rgba(35,31,32,0.14)",
        accent: "#231F20",
        aiBg: "rgba(124, 58, 237, 0.10)",
        aiBgSoft: "rgba(245, 243, 255, 0.95)",
        aiBorder: "rgba(124, 58, 237, 0.34)",
        aiText: "#6D28D9",
        aiGlow: "0 0 26px rgba(124, 58, 237, 0.18)",
        aiIcon: "#A855F7",
      };

  const platformInfo = useMemo(
    () => PLATFORMS.find((item) => item.id === platform) || PLATFORMS[0],
    [platform]
  );

  const canGenerate = Boolean(
    topic.trim() ||
      videoAnalysis?.detected_topic?.trim() ||
      videoAnalysis?.title?.trim() ||
      videoAnalysis?.hook?.trim()
  );

  useEffect(() => {
    [topicRef.current, sourceRef.current, contextRef.current].forEach((textarea) => {
      if (!textarea) return;
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    });
  }, [topic, sourceContent, brandContext]);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [videoPreviewUrl]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 3200);
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
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
    if (existing?.id) return existing.id as string;

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
      throw new Error(error?.message || "Nie udało się utworzyć workspace.");
    }

    return created.id as string;
  }

  function handleVideoFileChange(file: File | null) {
    setVideoError("");
    setVideoProgress(0);
    setVideoAnalysis(null);

    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);

    setVideoPreviewUrl("");
    setVideoUpload(null);
    setVideoStatus("idle");

    if (!file) {
      setVideoFile(null);
      return;
    }

    if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
      setVideoFile(null);
      setVideoError("Zły format pliku. Dozwolone: MP4, MOV i WebM.");
      return;
    }

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      setVideoFile(null);
      setVideoError("Plik jest za duży. Maksymalny rozmiar to 100 MB.");
      return;
    }

    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadVideoTemp() {
    if (!videoFile) throw new Error("Brak pliku video.");

    setUploadingVideo(true);
    setVideoError("");
    setVideoProgress(8);

    try {
      const wsId = await getOrCreateWorkspaceUuid();
      const userId = await getCurrentUserId();
      const fileName = safeFileName(videoFile.name || "video");
      const path = `${userId}/${wsId}/${Date.now()}-${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(TEMP_VIDEO_BUCKET)
        .upload(path, videoFile, {
          contentType: videoFile.type,
          upsert: false,
        });

      if (uploadError) throw new Error(`Błąd uploadu: ${uploadError.message}`);

      setVideoProgress(45);

      const { data: signedData, error: signedError } = await supabase.storage
        .from(TEMP_VIDEO_BUCKET)
        .createSignedUrl(path, 60 * 60);

      if (signedError) {
        console.warn("Nie udało się utworzyć signed URL:", signedError.message);
      }

      const { data: uploadRow, error: insertError } = await supabase
        .schema("contentiq")
        .from("short_video_uploads")
        .insert({
          workspace_id: wsId,
          user_id: userId,
          storage_bucket: TEMP_VIDEO_BUCKET,
          storage_path: path,
          public_url: null,
          file_name: videoFile.name,
          mime_type: videoFile.type,
          file_size: videoFile.size,
          status: "uploaded_temp",
        })
        .select("id, workspace_id, storage_path, public_url, file_name, mime_type, file_size, status")
        .single();

      if (insertError || !uploadRow) {
        await supabase.storage.from(TEMP_VIDEO_BUCKET).remove([path]);
        throw new Error(insertError?.message || "Błąd zapisu uploadu w Supabase.");
      }

      const record: VideoUploadRecord = {
        id: uploadRow.id as string,
        workspace_id: uploadRow.workspace_id as string,
        storage_path: uploadRow.storage_path as string,
        public_url: null,
        signed_url: signedData?.signedUrl || null,
        file_name: uploadRow.file_name as string,
        mime_type: uploadRow.mime_type as string,
        file_size: Number(uploadRow.file_size || videoFile.size),
        status: uploadRow.status as VideoUploadStatus,
      };

      setVideoUpload(record);
      setVideoStatus("uploaded_temp");
      setVideoProgress(60);

      return record;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setVideoError(explainSupabaseVideoError(message));
      throw err;
    } finally {
      setUploadingVideo(false);
    }
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
          if (timeout) window.clearTimeout(timeout);
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
    if (!ctx) return [];

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

  async function analyzeUploadedVideo() {
    if (!videoFile && !videoUpload) {
      setVideoError("Najpierw wybierz plik video.");
      return;
    }

    setAnalyzingVideo(true);
    setVideoError("");
    setVideoProgress(videoUpload ? 62 : 12);

    try {
      const frameDataUrls = await captureVideoFrames().catch((err) => {
        console.warn("Nie udało się pobrać klatek video:", err);
        return [] as string[];
      });

      const upload = videoUpload || (await uploadVideoTemp());

      setVideoProgress(70);

      const res = await fetch("/api/shorts/analyze-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upload_id: upload.id,
          workspace_id: upload.workspace_id,
          storage_path: upload.storage_path,
          public_url: upload.public_url,
          signed_url: upload.signed_url,
          file_name: upload.file_name,
          mime_type: upload.mime_type,
          frame_data_urls: frameDataUrls,
          ai_provider: videoAiProvider,
          custom_user_notes: videoAnalysisNotes,
          reference_url: videoReferenceUrl,
          target_platforms: [platform],
        }),
      });

      const json = (await res.json()) as ApiResponse & Partial<UploadedVideoAnalysis>;

      setVideoProgress(88);

      if (!res.ok || json.error) {
        const details = json.details ? ` Szczegóły: ${json.details}` : "";
        throw new Error(`${json.error || "Błąd AI podczas analizy filmu."}${details}`);
      }

      const analysis = normalizeUploadedVideoAnalysis(json);

      setVideoAnalysis(analysis);
      setVideoStatus("analyzed");
      setVideoProgress(100);

      setTopic(analysis.detected_topic || analysis.title || topic);
      setSourceContent(
        [
          analysis.transcript ? `Transkrypcja / opis wypowiedzi:\n${analysis.transcript}` : "",
          analysis.visual_summary ? `Opis wizualny:\n${analysis.visual_summary}` : "",
          analysis.caption ? `Opis AI:\n${analysis.caption}` : "",
          analysis.hashtags.length ? `Hashtagi:\n${analysis.hashtags.join(" ")}` : "",
        ]
          .filter(Boolean)
          .join("\n\n")
      );

      const { error: updateError } = await supabase
        .schema("contentiq")
        .from("short_video_uploads")
        .update({
          status: "analyzed",
          ai_transcript: analysis.transcript,
          ai_visual_summary: analysis.visual_summary,
          ai_detected_topic: analysis.detected_topic,
          ai_suggested_hook: analysis.hook,
          ai_suggested_caption: analysis.caption,
          ai_suggested_hashtags: analysis.hashtags,
        })
        .eq("id", upload.id);

      if (updateError) throw new Error(updateError.message);

      showToast("✓ AI przygotowało analizę video");
    } catch (err) {
      setVideoError(
        explainSupabaseVideoError(err instanceof Error ? err.message : String(err))
      );
    } finally {
      setAnalyzingVideo(false);
    }
  }

  async function deleteTempVideo() {
    if (!videoUpload) {
      setVideoFile(null);

      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);

      setVideoPreviewUrl("");
      setVideoProgress(0);
      setVideoStatus("idle");
      return;
    }

    setDeletingVideo(true);
    setVideoError("");

    try {
      const { error: removeError } = await supabase.storage
        .from(TEMP_VIDEO_BUCKET)
        .remove([videoUpload.storage_path]);

      if (removeError) throw new Error(removeError.message);

      const { error: deleteError } = await supabase
        .schema("contentiq")
        .from("short_video_uploads")
        .delete()
        .eq("id", videoUpload.id);

      if (deleteError) throw new Error(deleteError.message);

      setVideoFile(null);
      setVideoUpload(null);
      setVideoAnalysis(null);
      setVideoStatus("deleted_local");
      setVideoProgress(0);

      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);

      setVideoPreviewUrl("");
      showToast("✓ Usunięto plik tymczasowy");
    } catch (err) {
      setVideoError(
        explainSupabaseVideoError(err instanceof Error ? err.message : String(err))
      );
    } finally {
      setDeletingVideo(false);
    }
  }

  async function saveUploadedVideoTemplate() {
    if (!videoAnalysis || !videoUpload) {
      setVideoError("Najpierw przeanalizuj video AI.");
      return;
    }

    setSavingTemplate(true);
    setVideoError("");

    try {
      const body = [
        `PLATFORMA: ${platformInfo.name}`,
        `HOOK:\n${videoAnalysis.hook}`,
        `OPIS POSTA:\n${videoAnalysis.caption}`,
        `HASHTAGI:\n${safeArray(videoAnalysis.hashtags).join(" ")}`,
        videoReferenceUrl.trim() ? `LINK:\n${videoReferenceUrl.trim()}` : "",
        videoAnalysis.transcript ? `TRANSKRYPCJA / NAPISY:\n${videoAnalysis.transcript}` : "",
        videoAnalysis.visual_summary ? `NOTATKA TECHNICZNA:\n${videoAnalysis.visual_summary}` : "",
        videoAnalysis.template_summary ? `AI SUMMARY:\n${videoAnalysis.template_summary}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const { error: draftInsertError } = await supabase
        .schema("contentiq")
        .from("content_drafts")
        .insert({
          workspace_id: videoUpload.workspace_id,
          title: videoAnalysis.title || videoAnalysis.detected_topic || "Propozycja video z pliku",
          body,
          topic: videoAnalysis.detected_topic || videoAnalysis.title,
          content_type: "Video Studio / uploaded video post",
          target_platforms: [platform],
          ai_feedback: [
            "Propozycja video wygenerowana z uploadowanego pliku i sugestii użytkownika.",
            videoAnalysis.template_summary,
            videoAnalysisNotes.trim() ? `Sugestia użytkownika: ${videoAnalysisNotes.trim()}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
          status: "template",
          media: [
            {
              kind: "cover",
              asset_type: "video",
              storage_bucket: TEMP_VIDEO_BUCKET,
              storage_path: videoUpload.storage_path,
              file_name: videoUpload.file_name,
              mime_type: videoUpload.mime_type,
              file_size: videoUpload.file_size,
              preview_text: videoAnalysis.hook || videoAnalysis.title || videoUpload.file_name,
              source: "video_studio",
              status: "temporary",
            },
          ],
        });

      if (draftInsertError) throw new Error(draftInsertError.message);

      const { error: updateError } = await supabase
        .schema("contentiq")
        .from("short_video_uploads")
        .update({
          status: "template_ready",
          ai_transcript: videoAnalysis.transcript,
          ai_visual_summary: videoAnalysis.visual_summary,
          ai_detected_topic: videoAnalysis.detected_topic,
          ai_suggested_hook: videoAnalysis.hook,
          ai_suggested_caption: videoAnalysis.caption,
          ai_suggested_hashtags: videoAnalysis.hashtags,
        })
        .eq("id", videoUpload.id);

      if (updateError) throw new Error(updateError.message);

      setVideoStatus("template_ready");
      showToast("✓ Zapisano video jako szablon dla wybranej platformy");
    } catch (err) {
      setVideoError(
        explainSupabaseVideoError(err instanceof Error ? err.message : String(err))
      );
    } finally {
      setSavingTemplate(false);
    }
  }

  async function generateVideoBrief() {
    const generationTopic =
      topic.trim() ||
      videoAnalysis?.detected_topic?.trim() ||
      videoAnalysis?.title?.trim() ||
      videoAnalysis?.hook?.trim() ||
      "";

    const generationSource =
      sourceContent.trim() ||
      [
        videoAnalysis?.transcript ? `Transkrypcja / opis wypowiedzi:\n${videoAnalysis.transcript}` : "",
        videoAnalysis?.visual_summary ? `Opis wizualny:\n${videoAnalysis.visual_summary}` : "",
        videoAnalysis?.caption ? `Opis AI:\n${videoAnalysis.caption}` : "",
        videoAnalysis?.hashtags?.length ? `Hashtagi:\n${videoAnalysis.hashtags.join(" ")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

    if (!generationTopic) {
      setError("Wpisz temat albo najpierw przeanalizuj video AI.");
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
        topic: generationTopic,
        sourceContent: generationSource,
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
      showToast("✓ Wygenerowano brief video");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "AI nie zwróciło poprawnego JSON. Spróbuj jeszcze raz albo skróć opis tematu."
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
        .from("inspirations")
        .insert({
          workspace_id: wsId,
          source_kind: "video",
          source_studio: "Video Studio",
          title: brief.title || topic.slice(0, 80),
          description: brief.hook || brief.ai_notes,
          body,
          platforms: [brief.platform],
          hashtags: extractHashtags(body),
          ai_score: brief.estimated_score,
          ai_feedback: brief.ai_notes,
          status: "active",
        });

      if (insertError) throw new Error(insertError.message);

      showToast("✓ Zapisano brief video jako inspirację");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveTemplate() {
    if (!brief) return;

    setSavingTemplate(true);
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
          status: "template",
        });

      if (insertError) throw new Error(insertError.message);

      showToast("✓ Zapisano brief video jako szablon");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingTemplate(false);
    }
  }

  const panelTitleStyle: CSSProperties = {
    fontFamily: "var(--font-heading)",
    fontSize: 26,
    lineHeight: 1.05,
    margin: "6px 0 8px",
    color: css.text,
    fontWeight: 400,
  };

  const primaryButton: CSSProperties = {
    width: "100%",
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
    <div
      style={
        {
          "--bg": css.bg,
          "--surface": css.surface,
          "--text": css.text,
          "--muted": css.muted,
          "--border": css.border,
          "--accent": css.accent,
          fontFamily: "var(--font-body)",
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

        .video-section-grid {
          display: grid;
          grid-template-columns: 0.92fr 1.08fr;
          gap: 14px;
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
          .video-section-grid {
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

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <SectionLabel color={css.aiText}>Stwórz z AI swoje video</SectionLabel>

          <div className="video-section-grid">
            <Card css={css}>
              <SectionLabel color={css.aiText}>Dodaj video</SectionLabel>

              <h2 style={panelTitleStyle}>Upload video</h2>

              <p style={{ margin: "0 0 12px", color: css.muted, fontSize: 12, lineHeight: 1.65 }}>
                Dodaj MP4, MOV lub WebM. Plik jest tymczasowy i zostanie usunięty po publikacji albo wygaśnięciu.
              </p>

              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={(event) => handleVideoFileChange(event.target.files?.[0] || null)}
                style={{
                  width: "100%",
                  borderRadius: 14,
                  border: `1px dashed ${css.aiBorder}`,
                  background: css.surfaceSoft,
                  color: css.text,
                  padding: 12,
                  fontSize: 12,
                  fontFamily: "inherit",
                }}
              />

              {videoFile && (
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      color: css.muted,
                      fontSize: 11,
                      lineHeight: 1.5,
                      marginBottom: 10,
                    }}
                  >
                    <span>{videoFile.name}</span>
                    <strong>{formatBytes(videoFile.size)}</strong>
                  </div>

                  {videoPreviewUrl && (
                    <video
                      ref={videoRef}
                      src={videoPreviewUrl}
                      controls
                      style={{
                        width: "100%",
                        maxHeight: 220,
                        borderRadius: 14,
                        background: "#000",
                        border: `1px solid ${css.border}`,
                      }}
                    />
                  )}
                </div>
              )}

              <div style={{ marginTop: 13 }}>
                <SectionLabel color={css.aiText}>Platforma video</SectionLabel>

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

              <div style={{ marginTop: 13 }}>
  <SectionLabel color={css.aiText}>Sugestia dla AI</SectionLabel>

  <div
    style={{
      borderRadius: 16,
      border: `1px solid ${css.aiBorder}`,
      background: css.surface,
      boxShadow: `0 12px 30px rgba(168, 85, 247, 0.14)`,
      position: "relative",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 14,
        right: 14,
        bottom: -14,
        height: 28,
        background: "rgba(168, 85, 247, 0.15)",
        filter: "blur(18px)",
        pointerEvents: "none",
      }}
    />

    <textarea
      value={videoAnalysisNotes}
      onChange={(event) => setVideoAnalysisNotes(event.target.value)}
      placeholder="Np. zrób analizę pod YouTube, zaproponuj mocny wstęp, tytuł, opis i CTA."
      style={{
        width: "100%",
        minHeight: 78,
        borderRadius: 16,
        border: "none",
        background: "transparent",
        color: css.text,
        padding: 12,
        outline: "none",
        fontFamily: "inherit",
        fontSize: 12,
        lineHeight: 1.65,
        position: "relative",
        zIndex: 1,
      }}
    />
  </div>
</div>

              <div style={{ marginTop: 13 }}>
                <SectionLabel color={css.aiText}>Silnik analizy</SectionLabel>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { id: "gemini" as VideoAiProvider, label: "Gemini" },
                    { id: "deepseek" as VideoAiProvider, label: "DeepSeek" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setVideoAiProvider(item.id)}
                      style={{
                        borderRadius: 12,
                        border: `1px solid ${videoAiProvider === item.id ? css.aiBorder : css.border}`,
                        background: videoAiProvider === item.id ? css.aiBgSoft : css.surfaceSoft,
                        color: videoAiProvider === item.id ? css.aiText : css.muted,
                        padding: "9px 11px",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 900,
                        fontFamily: "inherit",
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 13 }}>
                <SectionLabel color={css.aiText}>Link opcjonalny</SectionLabel>

                <input
                  value={videoReferenceUrl}
                  onChange={(event) => setVideoReferenceUrl(event.target.value)}
                  placeholder="Link do produktu, strony albo posta referencyjnego"
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    border: `1px solid ${css.aiBorder}`,
                    background: css.surfaceSoft,
                    color: css.text,
                    padding: 12,
                    outline: "none",
                    fontFamily: "inherit",
                    fontSize: 12,
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: videoUpload ? "1fr 1fr" : "1fr",
                  gap: 8,
                  marginTop: 13,
                }}
              >
                <button
                  type="button"
                  onClick={analyzeUploadedVideo}
                  disabled={!videoFile || uploadingVideo || analyzingVideo}
                  style={{
                    ...primaryButton,
                    cursor: !videoFile || uploadingVideo || analyzingVideo ? "not-allowed" : "pointer",
                    opacity: !videoFile || uploadingVideo || analyzingVideo ? 0.55 : 1,
                  }}
                >
                  {uploadingVideo
                    ? "Uploaduję video..."
                    : analyzingVideo
                      ? "AI analizuje video..."
                      : "Przeanalizuj video AI"}
                </button>

                {videoUpload && (
                  <button
                    type="button"
                    onClick={deleteTempVideo}
                    disabled={deletingVideo}
                    style={{
                      borderRadius: 14,
                      border: "1px solid #ef444460",
                      background: "#ef444414",
                      color: "#ef4444",
                      padding: "12px 14px",
                      fontSize: 12,
                      fontWeight: 900,
                      cursor: deletingVideo ? "not-allowed" : "pointer",
                      opacity: deletingVideo ? 0.6 : 1,
                      fontFamily: "inherit",
                    }}
                  >
                    {deletingVideo ? "Usuwam..." : "Usuń plik"}
                  </button>
                )}
              </div>

              <div style={{ marginTop: 10, color: css.muted, fontSize: 11, lineHeight: 1.6 }}>
                Status: <strong style={{ color: css.aiText }}>{videoStatus}</strong>
              </div>

              {(uploadingVideo || analyzingVideo || videoProgress > 0) && (
                <div style={{ marginTop: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: css.muted,
                      fontSize: 11,
                      fontWeight: 800,
                      marginBottom: 6,
                    }}
                  >
                    <span>{uploadingVideo ? "Upload video" : analyzingVideo ? "Analiza AI" : "Gotowe"}</span>
                    <span>{Math.round(videoProgress)}%</span>
                  </div>

                  <div
                    style={{
                      height: 7,
                      borderRadius: 999,
                      background: css.surfaceSoft,
                      border: `1px solid ${css.border}`,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, videoProgress))}%`,
                        height: "100%",
                        background: css.aiText,
                        transition: "width .25s ease",
                      }}
                    />
                  </div>
                </div>
              )}

              {videoError && (
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
                  {videoError}
                </div>
              )}
            </Card>

          <Card css={css} variant="aiGlow" minHeight={420}>
              <SectionLabel color={css.accent}>Wynik analizy AI</SectionLabel>

              {!videoAnalysis && !analyzingVideo && (
                <div
                  style={{
                    minHeight: 320,
                    borderRadius: 16,
                    border: `1px dashed ${css.border}`,
                    display: "grid",
                    placeItems: "center",
                    textAlign: "center",
                    padding: 24,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 42, opacity: 0.16, marginBottom: 10 }}>▶</div>
                    <h3 style={{ ...panelTitleStyle, fontSize: 25 }}>Tutaj pojawi się analiza video</h3>
                    <p style={{ color: css.muted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                      Po analizie AI zobaczysz temat, hook, opis, hashtagi i treść gotową do zapisania jako szablon.
                    </p>
                  </div>
                </div>
              )}

              {analyzingVideo && (
                <div
                  style={{
                    minHeight: 320,
                    display: "grid",
                    placeItems: "center",
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
                    <p style={{ color: css.muted, fontSize: 13 }}>AI analizuje video...</p>
                  </div>
                </div>
              )}

              {videoAnalysis && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <ResultBlock label="Platforma szablonu" css={css} accent>
                    <span
                      style={{
                        borderRadius: 999,
                        padding: "5px 9px",
                        background: `${platformInfo.color}18`,
                        color: platformInfo.color,
                        fontSize: 11,
                        fontWeight: 900,
                      }}
                    >
                      {platformInfo.name}
                    </span>
                  </ResultBlock>

                  <ResultBlock label="Temat video" css={css} accent>
                    <input
                      value={videoAnalysis.detected_topic || videoAnalysis.title}
                      onChange={(event) =>
                        setVideoAnalysis((current) =>
                          current
                            ? {
                                ...current,
                                detected_topic: event.target.value,
                                title: event.target.value,
                              }
                            : current
                        )
                      }
                      style={{
                        width: "100%",
                        borderRadius: 12,
                        border: `1px solid ${css.aiBorder}`,
                        background: css.surface,
                        color: css.text,
                        padding: 10,
                        fontFamily: "inherit",
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                  </ResultBlock>

                  <ResultBlock label="Opis wizualny" css={css}>
                    <textarea
                      value={videoAnalysis.visual_summary}
                      onChange={(event) =>
                        setVideoAnalysis((current) =>
                          current ? { ...current, visual_summary: event.target.value } : current
                        )
                      }
                      style={{
                        width: "100%",
                        minHeight: 78,
                        borderRadius: 12,
                        border: `1px solid ${css.border}`,
                        background: css.surface,
                        color: css.text,
                        padding: 10,
                        fontFamily: "inherit",
                        fontSize: 13,
                        lineHeight: 1.6,
                        outline: "none",
                      }}
                    />
                  </ResultBlock>

                  <ResultBlock label="Hook" css={css}>
                    <textarea
                      value={videoAnalysis.hook}
                      onChange={(event) =>
                        setVideoAnalysis((current) =>
                          current ? { ...current, hook: event.target.value } : current
                        )
                      }
                      style={{
                        width: "100%",
                        minHeight: 60,
                        borderRadius: 12,
                        border: `1px solid ${css.border}`,
                        background: css.surface,
                        color: css.text,
                        padding: 10,
                        fontFamily: "inherit",
                        fontSize: 13,
                        lineHeight: 1.55,
                        outline: "none",
                      }}
                    />
                  </ResultBlock>

                  <ResultBlock label="Opis posta" css={css}>
                    <textarea
                      value={videoAnalysis.caption}
                      onChange={(event) =>
                        setVideoAnalysis((current) =>
                          current ? { ...current, caption: event.target.value } : current
                        )
                      }
                      style={{
                        width: "100%",
                        minHeight: 90,
                        borderRadius: 12,
                        border: `1px solid ${css.border}`,
                        background: css.surface,
                        color: css.text,
                        padding: 10,
                        fontFamily: "inherit",
                        fontSize: 13,
                        lineHeight: 1.65,
                        outline: "none",
                      }}
                    />
                  </ResultBlock>

                  <button
                    type="button"
                    onClick={saveUploadedVideoTemplate}
                    disabled={savingTemplate}
                    style={{
                      ...primaryButton,
                      marginTop: 2,
                      opacity: savingTemplate ? 0.6 : 1,
                      cursor: savingTemplate ? "not-allowed" : "pointer",
                    }}
                  >
                    {savingTemplate ? "Zapisuję..." : "Zapisz video jako szablon"}
                  </button>
                </div>
              )}
            </Card>
          </div>
        </div>

        <div>
          <SectionLabel color={css.accent}>Pomysł na video</SectionLabel>

          <div className="video-section-grid">
            <Card css={css}>
              <SectionLabel color={css.accent}>Brief dla AI</SectionLabel>

              <h2 style={panelTitleStyle}>Pomysł lub tekst źródłowy</h2>

              <p style={{ margin: "0 0 12px", color: css.muted, fontSize: 12, lineHeight: 1.65 }}>
                Wpisz pomysł od zera albo wykorzystaj analizę video z górnego kafelka.
              </p>

              <div style={{ marginBottom: 14 }}>
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

              <div className="video-two-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <SectionLabel color={css.muted}>Cel</SectionLabel>
                  <select
                    value={goal}
                    onChange={(event) => setGoal(event.target.value as VideoGoal)}
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      border: `1px solid ${css.border}`,
                      background: css.surfaceSoft,
                      color: css.text,
                      padding: 11,
                      fontFamily: "inherit",
                      fontSize: 12,
                      outline: "none",
                    }}
                  >
                    {GOALS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <SectionLabel color={css.muted}>Długość</SectionLabel>
                  <select
                    value={duration}
                    onChange={(event) => setDuration(Number(event.target.value))}
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      border: `1px solid ${css.border}`,
                      background: css.surfaceSoft,
                      color: css.text,
                      padding: 11,
                      fontFamily: "inherit",
                      fontSize: 12,
                      outline: "none",
                    }}
                  >
                    {DURATIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}s
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
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

              <div style={{ marginBottom: 14 }}>
                <SectionLabel color={css.muted}>Temat / pomysł</SectionLabel>
                <textarea
                  ref={topicRef}
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="np. 3 błędy firm, przez które ich video wygląda jak reklama, a nie naturalny content"
                  style={{
                    width: "100%",
                    minHeight: 92,
                    borderRadius: 14,
                    border: `1px solid ${css.border}`,
                    background: css.surfaceSoft,
                    color: css.text,
                    padding: 12,
                    outline: "none",
                    fontFamily: "inherit",
                    fontSize: 13,
                    lineHeight: 1.65,
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <SectionLabel color={css.muted}>Materiał źródłowy</SectionLabel>
                <textarea
                  ref={sourceRef}
                  value={sourceContent}
                  onChange={(event) => setSourceContent(event.target.value)}
                  placeholder="Wklej notatki, opis produktu albo użyj analizy video z uploadu."
                  style={{
                    width: "100%",
                    minHeight: 78,
                    borderRadius: 14,
                    border: `1px solid ${css.border}`,
                    background: css.surfaceSoft,
                    color: css.text,
                    padding: 12,
                    outline: "none",
                    fontFamily: "inherit",
                    fontSize: 13,
                    lineHeight: 1.65,
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <SectionLabel color={css.muted}>Kontekst marki</SectionLabel>
                <textarea
                  ref={contextRef}
                  value={brandContext}
                  onChange={(event) => setBrandContext(event.target.value)}
                  placeholder="np. ton ekspercki, ale prosty; grupa: właściciele małych firm; marka: ANM ContentIQ"
                  style={{
                    width: "100%",
                    minHeight: 72,
                    borderRadius: 14,
                    border: `1px solid ${css.border}`,
                    background: css.surfaceSoft,
                    color: css.text,
                    padding: 12,
                    outline: "none",
                    fontFamily: "inherit",
                    fontSize: 13,
                    lineHeight: 1.65,
                  }}
                />
              </div>

              <button
                type="button"
                onClick={generateVideoBrief}
                disabled={loading || !canGenerate}
                style={{
                  ...primaryButton,
                  cursor: loading || !canGenerate ? "not-allowed" : "pointer",
                  opacity: loading || !canGenerate ? 0.5 : 1,
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
            </Card>

            <Card css={css} variant="aiGlow" minHeight={420}>
              <SectionLabel color={css.accent}>Wygenerowany brief AI</SectionLabel>

              {!brief && !loading && (
                <div
                  style={{
                    minHeight: 320,
                    borderRadius: 16,
                    border: `1px dashed ${css.border}`,
                    display: "grid",
                    placeItems: "center",
                    textAlign: "center",
                    padding: 24,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 42, opacity: 0.16, marginBottom: 10 }}>✦</div>
                    <h3 style={{ ...panelTitleStyle, fontSize: 25 }}>Brief video pojawi się tutaj</h3>
                    <p style={{ color: css.muted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                      AI przygotuje hook, scenariusz, ujęcia, teksty na ekranie, opis, miniaturę i checklistę nagrania.
                    </p>
                  </div>
                </div>
              )}

              {loading && (
                <div
                  style={{
                    minHeight: 320,
                    display: "grid",
                    placeItems: "center",
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
                    <p style={{ color: css.muted, fontSize: 13 }}>
                      AI układa scenariusz, ujęcia i napisy...
                    </p>
                  </div>
                </div>
              )}

              {brief && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <ResultBlock label="AI Video Score" css={css} accent>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 16,
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 38,
                            fontFamily: "var(--font-heading)",
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

                      <p style={{ flex: 1, margin: 0, color: css.text, fontSize: 12, lineHeight: 1.7 }}>
                        {brief.ai_notes}
                      </p>
                    </div>
                  </ResultBlock>

                  <ResultBlock label="Tytuł roboczy" css={css}>
                    <h3 style={{ margin: 0, color: css.text, fontSize: 19, lineHeight: 1.25 }}>
                      {brief.title}
                    </h3>
                  </ResultBlock>

                  <ResultBlock label="Hook 0-2 sekundy" css={css} accent>
                    <p style={{ margin: 0, color: css.text, fontSize: 16, lineHeight: 1.5, fontWeight: 900 }}>
                      “{brief.hook}”
                    </p>
                  </ResultBlock>

                  <ResultBlock label="Scenariusz" css={css}>
                    <p
                      style={{
                        margin: 0,
                        color: css.text,
                        whiteSpace: "pre-wrap",
                        fontSize: 12,
                        lineHeight: 1.75,
                      }}
                    >
                      {brief.script}
                    </p>
                  </ResultBlock>

                  <div className="video-two-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <ResultBlock label="Lista ujęć" css={css}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                        {safeArray(brief.shots).map((shot, index) => (
                          <div
                            key={`${shot.time}-${index}`}
                            className="video-card"
                            style={{ borderLeft: `3px solid ${platformInfo.color}`, paddingLeft: 10 }}
                          >
                            <div style={{ color: platformInfo.color, fontSize: 10, fontWeight: 900, marginBottom: 3 }}>
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
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {safeArray(brief.on_screen_text).map((item, index) => (
                          <div
                            key={`${item.time}-${index}`}
                            style={{
                              background: css.surfaceSoft,
                              border: `1px solid ${css.border}`,
                              borderRadius: 12,
                              padding: 9,
                            }}
                          >
                            <div style={{ color: css.muted, fontSize: 10, fontWeight: 900, marginBottom: 3 }}>
                              {item.time}
                            </div>
                            <div style={{ color: css.text, fontSize: 12, fontWeight: 800, lineHeight: 1.4 }}>
                              {item.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ResultBlock>
                  </div>

                  <ResultBlock label="Opis posta" css={css}>
                    <p style={{ margin: 0, color: css.text, fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {brief.caption}
                    </p>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                      {safeArray(brief.hashtags).map((tag, index) => (
                        <span
                          key={`${tag}-${index}`}
                          style={{
                            color: platformInfo.color,
                            background: `${platformInfo.color}18`,
                            borderRadius: 999,
                            padding: "5px 8px",
                            fontSize: 10,
                            fontWeight: 800,
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </ResultBlock>

                  <ResultBlock label="Miniatura / tekst na okładkę" css={css}>
                    <p style={{ margin: 0, color: css.text, fontSize: 20, lineHeight: 1.2, fontWeight: 900 }}>
                      {brief.thumbnail_text}
                    </p>
                  </ResultBlock>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => copyText(formatBriefAsText(brief))}
                      style={{
                        borderRadius: 13,
                        border: `1px solid ${css.border}`,
                        background: css.surface,
                        color: css.muted,
                        padding: "11px 12px",
                        fontSize: 11,
                        fontWeight: 900,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {copied ? "✓ Skopiowano" : "Kopiuj"}
                    </button>

                    <button
                      type="button"
                      onClick={saveTemplate}
                      disabled={savingTemplate}
                      style={{
                        borderRadius: 13,
                        border: `1px solid ${css.aiBorder}`,
                        background: css.aiBg,
                        color: css.aiText,
                        padding: "11px 12px",
                        fontSize: 11,
                        fontWeight: 900,
                        cursor: savingTemplate ? "not-allowed" : "pointer",
                        opacity: savingTemplate ? 0.6 : 1,
                        fontFamily: "inherit",
                      }}
                    >
                      {savingTemplate ? "Zapisuję..." : "Szablon"}
                    </button>

                    <button
                      type="button"
                      onClick={saveDraft}
                      disabled={saving}
                      style={{
                        borderRadius: 13,
                        border: "none",
                        background: dark ? "#ffffff" : "#111111",
                        color: dark ? "#050505" : "#ffffff",
                        padding: "11px 12px",
                        fontSize: 11,
                        fontWeight: 900,
                        cursor: saving ? "not-allowed" : "pointer",
                        opacity: saving ? 0.6 : 1,
                        fontFamily: "inherit",
                      }}
                    >
                      {saving ? "Zapisuję..." : "Inspiracja"}
                    </button>
                  </div>

                  {rawAnswer && (
                    <details
                      style={{
                        background: css.surfaceSoft,
                        border: `1px solid ${css.border}`,
                        borderRadius: 13,
                        padding: 11,
                      }}
                    >
                      <summary style={{ color: css.muted, fontSize: 11, cursor: "pointer", fontWeight: 800 }}>
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
            </Card>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
