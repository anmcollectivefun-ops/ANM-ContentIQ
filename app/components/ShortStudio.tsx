"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Wand2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useContentIQLanguage } from "@/lib/contentiq-language";

type ShortPlatform =
  | "tiktok"
  | "instagram_reels"
  | "facebook_reels"
  | "youtube_shorts"
  | "linkedin_video";

type ShortGoal =
  | "zasięg"
  | "edukacja"
  | "sprzedaż"
  | "lead"
  | "społeczność"
  | "eksperckość";

type ShortAiProvider = "gemini" | "deepseek";

type ShortVideoStatus =
  | "uploaded_temp"
  | "analyzed"
  | "template_ready"
  | "publishing"
  | "published_external"
  | "deleted_local"
  | "expired";

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

type ApiResponse = {
  answer?: string;
  error?: string;
};

type VideoUploadRecord = {
  id: string;
  workspace_id: string;
  storage_path: string;
  public_url: string | null;
  signed_url: string | null;
  file_name: string;
  mime_type: string;
  file_size: number;
  status: ShortVideoStatus;
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

const TEMP_VIDEO_BUCKET = "contentiq-temp-videos";
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

const SHORT_PLATFORMS: {
  id: ShortPlatform;
  name: string;
  shortName: string;
  color: string;
}[] = [
  { id: "tiktok", name: "TikTok", shortName: "TikTok", color: "#ffffff" },
  { id: "instagram_reels", name: "Instagram Reels", shortName: "Reels", color: "#E1306C" },
  { id: "facebook_reels", name: "Facebook Reels", shortName: "FB Reels", color: "#1877F2" },
  { id: "youtube_shorts", name: "YouTube Shorts", shortName: "Shorts", color: "#FF0033" },
  { id: "linkedin_video", name: "LinkedIn Video", shortName: "LinkedIn", color: "#0A66C2" },
];

const GOALS: ShortGoal[] = [
  "zasięg",
  "edukacja",
  "sprzedaż",
  "lead",
  "społeczność",
  "eksperckość",
];

const FORMATS = [
  "3 błędy",
  "3 wskazówki",
  "Mit vs prawda",
  "Przed / po",
  "Mini tutorial",
  "POV",
  "Case study w 30 sekund",
  "Lista narzędzi",
  "Problem → rozwiązanie",
  "Reakcja na trend",
];

const LENGTHS = [15, 20, 30, 45, 60];

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

function safeFileName(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  const extension = dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
  const base = dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName;

  return `${base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "short-video"}${extension}`;
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
  if (
    message.includes("permission denied") ||
    message.includes("row-level security policy")
  ) {
    return "Supabase blokuje zapis. Sprawdź RLS dla short_video_uploads, short_templates i storage.objects.";
  }

  return message;
}

function getScoreColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

function getPlatformInfo(platform: ShortPlatform) {
  return SHORT_PLATFORMS.find((item) => item.id === platform);
}

function formatResultAsText(result: ShortResult) {
  return `
${result.idea_title}

GŁÓWNY KĄT:
${result.main_angle}

AI PODSUMOWANIE:
${result.ai_summary}

WARIANTY:
${result.variants
  .map(
    (variant) => `
${variant.platform_name}
Score: ${variant.score}/100
Format: ${variant.format}
Długość: ${variant.duration_seconds}s

Hook:
${variant.hook}

Scenariusz:
${variant.script}

Ujęcia:
${variant.shots.map((shot) => `- ${shot.time}: ${shot.scene}\n  Akcja: ${shot.action}`).join("\n")}

Teksty na ekranie:
${variant.on_screen_text.map((item) => `- ${item.time}: ${item.text}`).join("\n")}

Opis:
${variant.caption}

Hashtagi:
${variant.hashtags.join(" ")}

Miniatura:
${variant.thumbnail_text}

Notatka publikacyjna:
${variant.publishing_notes}
`
  )
  .join("\n\n")}

WNIOSKI CROSS-PLATFORM:
${result.cross_platform_notes.map((item) => `- ${item}`).join("\n")}
  `.trim();
}

function buildPrompt({
  language,
  topic,
  sourceContent,
  selectedPlatforms,
  goal,
  format,
  duration,
  brandContext,
}: {
  language: "pl" | "en";
  topic: string;
  sourceContent: string;
  selectedPlatforms: ShortPlatform[];
  goal: ShortGoal;
  format: string;
  duration: number;
  brandContext: string;
}) {
  const platformNames = selectedPlatforms
    .map((id) => getPlatformInfo(id)?.name || id)
    .join(", ");

  return `
Jesteś ekspertem od short video: TikTok, Instagram Reels, Facebook Reels, YouTube Shorts i LinkedIn Video.

Wszystkie treści opisowe twórz w języku ${language === "pl" ? "polskim" : "angielskim"}.

Przygotuj osobne warianty short video na wskazane platformy.

Platformy:
${platformNames}

Cel:
${goal}

Preferowany format:
${format}

Preferowana długość:
${duration} sekund

Temat / idea:
${topic}

Materiał źródłowy:
${sourceContent || "brak"}

Kontekst marki:
${brandContext || "brak"}

Zasady:
- nie kopiuj tego samego scenariusza 1:1 na wszystkie platformy,
- TikTok: mocny hook, szybkie tempo, naturalny styl,
- Instagram Reels: wizualność, emocje, zapis i udostępnienia,
- Facebook Reels: prostszy przekaz, społeczność, praktyczny temat,
- YouTube Shorts: szybka wartość, retencja, miniatura,
- LinkedIn Video: eksperckość, konkret, B2B,
- każdy wariant ma mieć hook, scenariusz, ujęcia, napisy, opis, hashtagi, miniaturę i notatkę publikacyjną.

Zwróć dokładnie taki JSON, bez markdown i bez komentarzy:

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
      "shots": [
        {
          "time": "0-2s",
          "scene": "co widzimy",
          "action": "co robi osoba / co pokazuje ekran"
        }
      ],
      "on_screen_text": [
        {
          "time": "0-2s",
          "text": "tekst na ekranie"
        }
      ],
      "caption": "opis posta",
      "hashtags": ["#hashtag1", "#hashtag2"],
      "thumbnail_text": "tekst na miniaturę",
      "publishing_notes": "krótka wskazówka publikacyjna dla tej platformy",
      "score": 85
    }
  ],
  "cross_platform_notes": [
    "wniosek porównawczy między platformami"
  ]
}

W JSON zwróć warianty tylko dla tych platform:
${selectedPlatforms.join(", ")}
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
        fontFamily: "var(--font-label)",
        fontSize: 11,
        fontWeight: 900,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color,
        marginBottom: 8,
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
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
          ? `0 20px 50px rgba(0,0,0,0.35), 0 18px 42px rgba(168, 85, 247, 0.16)`
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

function ResultBox({
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
        boxShadow: accent ? `0 10px 28px rgba(168, 85, 247, 0.10)` : "none",
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
          {accent && <Wand2 size={15} color={css.aiIcon} />}
          {label}
        </SectionLabel>
        {children}
      </div>
    </div>
  );
}

function Pill({
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

export default function ShortStudio({
  dark = true,
  workspaceId = "contentiq",
}: {
  dark?: boolean;
  workspaceId?: string;
}) {
  const { lang, text } = useContentIQLanguage();
  const supabase = createClient();

  const [selectedPlatforms, setSelectedPlatforms] = useState<ShortPlatform[]>([
    "tiktok",
    "instagram_reels",
    "youtube_shorts",
  ]);

  const [goal, setGoal] = useState<ShortGoal>("zasięg");
  const [format, setFormat] = useState("3 błędy");
  const [duration, setDuration] = useState(30);
  const [topic, setTopic] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [brandContext, setBrandContext] = useState("");
  const [videoAnalysisNotes, setVideoAnalysisNotes] = useState("");
  const [videoReferenceUrl, setVideoReferenceUrl] = useState("");
  const [shortAiProvider, setShortAiProvider] = useState<ShortAiProvider>("gemini");

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [videoUpload, setVideoUpload] = useState<VideoUploadRecord | null>(null);
  const [videoAnalysis, setVideoAnalysis] = useState<ShortVideoAnalysis | null>(null);
  const [videoStatus, setVideoStatus] = useState<ShortVideoStatus | "idle">("idle");
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoError, setVideoError] = useState("");

  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [analyzingVideo, setAnalyzingVideo] = useState(false);
  const [deletingVideo, setDeletingVideo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [result, setResult] = useState<ShortResult | null>(null);
  const [rawAnswer, setRawAnswer] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);

  const css: Record<string, string> = dark
    ? {
        bg: "#1A2233",
        surface: "#050505",
        surfaceSoft: "#0B0B0D",
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

  const selectedPlatformNames = useMemo(() => {
    return selectedPlatforms
      .map((id) => getPlatformInfo(id)?.shortName || id)
      .join(", ");
  }, [selectedPlatforms]);

  const canGenerate =
    selectedPlatforms.length > 0 &&
    Boolean(
      topic.trim() ||
        videoAnalysis?.detected_topic?.trim() ||
        videoAnalysis?.title?.trim() ||
        videoAnalysis?.hook?.trim()
    );

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [videoPreviewUrl]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 3200);
  }

  function togglePlatform(platform: ShortPlatform) {
    setSelectedPlatforms((prev) => {
      if (prev.includes(platform)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== platform);
      }

      return [...prev, platform];
    });
  }

  function updateVideoAnalysisField<K extends keyof ShortVideoAnalysis>(
    field: K,
    value: ShortVideoAnalysis[K]
  ) {
    setVideoAnalysis((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current
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
      throw new Error(error?.message || "Nie udało się utworzyć przestrzeni.");
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
      const fileName = safeFileName(videoFile.name || "short-video");
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
        status: uploadRow.status as ShortVideoStatus,
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

  async function analyzeVideo() {
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
          ai_provider: shortAiProvider,
          custom_user_notes: videoAnalysisNotes,
          reference_url: videoReferenceUrl,
          target_platforms: selectedPlatforms,
        }),
      });

      const json = await res.json();

      setVideoProgress(88);

      if (!res.ok || json.error) {
        const details = json.details ? ` Szczegóły: ${json.details}` : "";
        throw new Error(`${json.error || "Błąd AI podczas analizy filmu."}${details}`);
      }

      const analysis = normalizeVideoAnalysis(json);

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

      showToast("✓ AI przygotowało analizę filmu");
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

  async function saveAnalyzedVideoTemplate() {
    if (!videoAnalysis || !videoUpload) {
      setVideoError("Najpierw przeanalizuj film AI.");
      return;
    }

    setSavingTemplate(true);
    setVideoError("");

    try {
      const userId = await getCurrentUserId();

      const templateRows =
        videoAnalysis.platform_recommendations.length > 0
          ? videoAnalysis.platform_recommendations.filter((item) =>
              selectedPlatforms.includes(item.platform)
            )
          : selectedPlatforms.map((platform) => ({
              platform,
              caption: videoAnalysis.caption,
              hook: videoAnalysis.hook,
              hashtags: videoAnalysis.hashtags,
              publishing_notes: "",
            }));

      const rows = templateRows.length
        ? templateRows
        : selectedPlatforms.map((platform) => ({
            platform,
            caption: videoAnalysis.caption,
            hook: videoAnalysis.hook,
            hashtags: videoAnalysis.hashtags,
            publishing_notes: "",
          }));

      const { error: insertError } = await supabase
        .schema("contentiq")
        .from("short_templates")
        .insert(
          rows.map((item) => ({
            workspace_id: videoUpload.workspace_id,
            user_id: userId,
            source_upload_id: videoUpload.id,
            title: videoAnalysis.title,
            platform: item.platform,
            hook: item.hook,
            caption: item.caption,
            hashtags: item.hashtags,
            script: videoAnalysis.transcript,
            on_screen_text: videoAnalysis.on_screen_text,
            shots: [],
            thumbnail_text: item.hook || videoAnalysis.hook,
            ai_summary: [
              videoAnalysis.template_summary,
              videoAnalysis.visual_summary,
              videoReferenceUrl.trim() ? `Link roboczy: ${videoReferenceUrl.trim()}` : "",
            ]
              .filter(Boolean)
              .join("\n\n"),
            video_storage_path: videoUpload.storage_path,
            video_public_url: null,
            status: "template_ready",
          }))
        );

      if (insertError) throw new Error(insertError.message);

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
      showToast("✓ Zapisano szablon shorta dla wybranych platform");
    } catch (err) {
      setVideoError(
        explainSupabaseVideoError(err instanceof Error ? err.message : String(err))
      );
    } finally {
      setSavingTemplate(false);
    }
  }

  async function generateShorts() {
    const generationTopic =
      topic.trim() ||
      videoAnalysis?.detected_topic?.trim() ||
      videoAnalysis?.title?.trim() ||
      videoAnalysis?.hook?.trim() ||
      "";

    const generationSourceContent =
      sourceContent.trim() ||
      [
        videoAnalysis?.transcript
          ? `Transkrypcja / opis wypowiedzi:\n${videoAnalysis.transcript}`
          : "",
        videoAnalysis?.visual_summary
          ? `Opis wizualny:\n${videoAnalysis.visual_summary}`
          : "",
        videoAnalysis?.caption ? `Opis AI:\n${videoAnalysis.caption}` : "",
        videoAnalysis?.hashtags?.length
          ? `Hashtagi:\n${videoAnalysis.hashtags.join(" ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");

    if (!generationTopic) {
      setError("Wpisz temat albo najpierw przeanalizuj film AI.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setRawAnswer("");

    try {
      const prompt = buildPrompt({
        language: lang,
        topic: generationTopic,
        sourceContent: generationSourceContent,
        selectedPlatforms,
        goal,
        format,
        duration,
        brandContext,
      });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "chat", prompt }),
      });

      let json: ApiResponse = {};

      try {
        json = (await res.json()) as ApiResponse;
      } catch {
        throw new Error("API nie zwróciło poprawnego JSON.");
      }

      if (!res.ok || json.error) {
        throw new Error(json.error || "Błąd API.");
      }

      const answer = json.answer || "";
      setRawAnswer(answer);

      const parsed = JSON.parse(cleanJsonAnswer(answer)) as ShortResult;

      parsed.variants = safeArray(parsed.variants).map((variant) => ({
        ...variant,
        shots: safeArray(variant.shots),
        on_screen_text: safeArray(variant.on_screen_text),
        hashtags: safeArray(variant.hashtags),
        score: Number(variant.score || 0),
      }));

      parsed.cross_platform_notes = safeArray(parsed.cross_platform_notes);

      setResult(parsed);
      showToast("✓ Wygenerowano warianty shortów");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "AI nie zwróciło poprawnego JSON. Spróbuj jeszcze raz albo skróć opis."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft() {
    if (!result) return;

    setSaving(true);
    setError("");

    try {
      const wsId = await getOrCreateWorkspaceUuid();
      const body = formatResultAsText(result);
      const avgScore =
        result.variants.length > 0
          ? Math.round(
              result.variants.reduce((sum, item) => sum + item.score, 0) /
                result.variants.length
            )
          : null;

      const { error: insertError } = await supabase
        .schema("contentiq")
        .from("content_drafts")
        .insert({
          workspace_id: wsId,
          title: result.idea_title || topic.slice(0, 80),
          body,
          topic,
          content_type: "Short Studio / multi-platform video",
          target_platforms: selectedPlatforms,
          ai_score: avgScore,
          ai_feedback: result.ai_summary,
          status: "draft",
        });

      if (insertError) throw new Error(insertError.message);

      showToast("✓ Zapisano jako szkic");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveTemplate() {
    if (!result) return;

    setSavingTemplate(true);
    setError("");

    try {
      const wsId = await getOrCreateWorkspaceUuid();
      const body = formatResultAsText(result);
      const avgScore =
        result.variants.length > 0
          ? Math.round(
              result.variants.reduce((sum, item) => sum + item.score, 0) /
                result.variants.length
            )
          : null;

      const { error: insertError } = await supabase
        .schema("contentiq")
        .from("content_drafts")
        .insert({
          workspace_id: wsId,
          title: result.idea_title || topic.slice(0, 80),
          body,
          topic,
          content_type: "Short Studio / multi-platform video",
          target_platforms: selectedPlatforms,
          ai_score: avgScore,
          ai_feedback: result.ai_summary,
          status: "template",
        });

      if (insertError) throw new Error(insertError.message);

      showToast("✓ Zapisano jako szablon");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingTemplate(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    await navigator.clipboard.writeText(formatResultAsText(result));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const panelTitleStyle: CSSProperties = {
    fontFamily: "var(--font-heading)",
    fontSize: 26,
    lineHeight: 1.05,
    margin: "6px 0 8px",
    color: css.accent,
    fontWeight: 500,
  };

  const buttonPrimary: CSSProperties = {
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

        * {
          box-sizing: border-box;
        }

        textarea {
          resize: none;
        }

        .short-section-grid {
          display: grid;
          grid-template-columns: 0.92fr 1.08fr;
          gap: 14px;
          align-items: start;
        }

        .variant-card {
          transition: transform .18s ease, border-color .18s ease;
        }

        .variant-card:hover {
          transform: translateY(-2px);
          border-color: ${css.aiBorder};
        }

        @media(max-width: 980px) {
          .short-section-grid {
            grid-template-columns: 1fr;
          }

          .short-two-grid {
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
          <SectionLabel color={css.aiText}>
            <Wand2 size={15} color={css.aiIcon} />
            {text("Stwórz z AI swój short", "Create your short with AI")}
          </SectionLabel>
          <div className="short-section-grid">
            <Card css={css}>
              <SectionLabel color={css.accent}>{text("Dodaj film", "Add video")}</SectionLabel>

              <h2 style={panelTitleStyle}>{text("Upload shorta", "Upload a short")}</h2>

              <p style={{ margin: "0 0 12px", color: css.muted, fontSize: 12, lineHeight: 1.65 }}>
                {text(
                  "Dodaj plik MP4, MOV lub WebM. Film jest tymczasowy i zostanie usunięty po publikacji albo wygaśnięciu.",
                  "Add an MP4, MOV or WebM file. It is stored temporarily and removed after publishing or expiration."
                )}
              </p>

              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={(event) => handleVideoFileChange(event.target.files?.[0] || null)}
                style={{
                  width: "100%",
                  borderRadius: 14,
                  border: `1px dashed ${css.border}`,
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
                <SectionLabel color={css.accent}>{text("Platforma szablonu", "Template platform")}</SectionLabel>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {SHORT_PLATFORMS.map((item) => (
                    <Pill
                      key={item.id}
                      active={selectedPlatforms.includes(item.id)}
                      onClick={() => togglePlatform(item.id)}
                      color={item.color}
                      css={css}
                    >
                      {item.name}
                    </Pill>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 13 }}>
                <SectionLabel color={css.aiText}>
                  <Wand2 size={15} color={css.aiIcon} />
                  Sugestia dla AI
                </SectionLabel>

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
                    placeholder="Np. przygotuj opis sprzedażowy, mocny hook, CTA do obserwowania i hashtagi pod wybrane platformy."
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
                <SectionLabel color={css.aiText}>
                  <Wand2 size={15} color={css.aiIcon} />
                  Silnik analizy
                </SectionLabel>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { id: "gemini" as ShortAiProvider, label: "Gemini" },
                    { id: "deepseek" as ShortAiProvider, label: "DeepSeek" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setShortAiProvider(item.id)}
                      style={{
                        borderRadius: 12,
                        border: `1px solid ${shortAiProvider === item.id ? css.aiBorder : css.border}`,
                        background: shortAiProvider === item.id ? css.aiBgSoft : css.surfaceSoft,
                        color: shortAiProvider === item.id ? css.aiText : css.muted,
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
                <SectionLabel color={css.accent}>{text("Link opcjonalny", "Optional link")}</SectionLabel>

                <input
                  value={videoReferenceUrl}
                  onChange={(event) => setVideoReferenceUrl(event.target.value)}
                  placeholder="Link do produktu, strony albo posta referencyjnego"
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    border: `1px solid ${css.border}`,
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
                  onClick={analyzeVideo}
                  disabled={!videoFile || uploadingVideo || analyzingVideo}
                  style={{
                    ...buttonPrimary,
                    cursor: !videoFile || uploadingVideo || analyzingVideo ? "not-allowed" : "pointer",
                    opacity: !videoFile || uploadingVideo || analyzingVideo ? 0.55 : 1,
                  }}
                >
                  {uploadingVideo
                    ? "Uploaduję film..."
                    : analyzingVideo
                      ? "AI analizuje film..."
                      : "Przeanalizuj film AI"}
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
                    <span>{uploadingVideo ? "Upload filmu" : analyzingVideo ? "Analiza AI" : "Gotowe"}</span>
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
              <SectionLabel color={css.aiText}>
                <Wand2 size={15} color={css.aiIcon} />
                Wynik wygenerowanej treści od AI
              </SectionLabel>

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
                    <div style={{ fontSize: 42, opacity: 0.16, marginBottom: 10 }}>⊞</div>
                    <h3 style={{ ...panelTitleStyle, fontSize: 25 }}>{text("Tutaj pojawi się opis filmu", "Your video post copy will appear here")}</h3>
                    <p style={{ color: css.muted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                      Po analizie AI zobaczysz hook, opis posta, hashtagi i platformy, do których zapiszesz szablon.
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
                    <p style={{ color: css.muted, fontSize: 13 }}>{text("AI analizuje film...", "AI is analyzing the video...")}</p>
                  </div>
                </div>
              )}

              {videoAnalysis && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <ResultBox label="Platformy szablonu" css={css} accent>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {selectedPlatforms.map((platform) => (
                        <span
                          key={platform}
                          style={{
                            borderRadius: 999,
                            padding: "5px 9px",
                            background: `${getPlatformInfo(platform)?.color || css.aiText}18`,
                            color: getPlatformInfo(platform)?.color || css.aiText,
                            fontSize: 11,
                            fontWeight: 900,
                          }}
                        >
                          {getPlatformInfo(platform)?.name || platform}
                        </span>
                      ))}
                    </div>
                  </ResultBox>

                  <ResultBox label="Temat posta" css={css} accent>
                    <input
                      value={videoAnalysis.detected_topic || videoAnalysis.title}
                      onChange={(event) => {
                        updateVideoAnalysisField("detected_topic", event.target.value);
                        updateVideoAnalysisField("title", event.target.value);
                      }}
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
                  </ResultBox>

                  <ResultBox label="Hook" css={css}>
                    <textarea
                      value={videoAnalysis.hook}
                      onChange={(event) => updateVideoAnalysisField("hook", event.target.value)}
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
                  </ResultBox>

                  <ResultBox label="Opis posta" css={css}>
                    <textarea
                      value={videoAnalysis.caption}
                      onChange={(event) => updateVideoAnalysisField("caption", event.target.value)}
                      style={{
                        width: "100%",
                        minHeight: 100,
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
                  </ResultBox>

                  <ResultBox label="Hashtagi" css={css}>
                    <input
                      value={videoAnalysis.hashtags.join(" ")}
                      onChange={(event) =>
                        updateVideoAnalysisField(
                          "hashtags",
                          event.target.value
                            .split(/[\s,]+/)
                            .map((tag) => tag.trim())
                            .filter(Boolean)
                        )
                      }
                      placeholder="#short #reels #content"
                      style={{
                        width: "100%",
                        borderRadius: 12,
                        border: `1px solid ${css.border}`,
                        background: css.surface,
                        color: css.text,
                        padding: 10,
                        fontFamily: "inherit",
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                  </ResultBox>

                  <button
                    type="button"
                    onClick={saveAnalyzedVideoTemplate}
                    disabled={savingTemplate}
                    style={{
                      ...buttonPrimary,
                      marginTop: 2,
                      opacity: savingTemplate ? 0.6 : 1,
                      cursor: savingTemplate ? "not-allowed" : "pointer",
                    }}
                  >
                    {savingTemplate ? "Zapisuję..." : "Zapisz jako szablon shorta"}
                  </button>
                </div>
              )}
            </Card>
          </div>
        </div>

        <div>
          <SectionLabel color={css.accent}>{text("Pomysł na short", "Short idea")}</SectionLabel>
          <div className="short-section-grid">
            <Card css={css}>
              <SectionLabel color={css.accent}>{text("Treść dla AI", "Content for AI")}</SectionLabel>

              <h2 style={panelTitleStyle}>{text("Pomysł lub tekst źródłowy", "Idea or source text")}</h2>

              <p style={{ margin: "0 0 12px", color: css.muted, fontSize: 12, lineHeight: 1.65 }}>
                {text(
                  "Możesz wpisać pomysł od zera albo użyć danych z analizy filmu powyżej.",
                  "Start with your own idea or use the video analysis above."
                )}
              </p>

              <div style={{ marginBottom: 14 }}>
                <SectionLabel color={css.muted}>Platformy: {selectedPlatformNames}</SectionLabel>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {SHORT_PLATFORMS.map((item) => (
                    <Pill
                      key={item.id}
                      active={selectedPlatforms.includes(item.id)}
                      onClick={() => togglePlatform(item.id)}
                      color={item.color}
                      css={css}
                    >
                      {item.name}
                    </Pill>
                  ))}
                </div>
              </div>

              <div className="short-two-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <SectionLabel color={css.muted}>{text("Cel", "Goal")}</SectionLabel>
                  <select
                    value={goal}
                    onChange={(event) => setGoal(event.target.value as ShortGoal)}
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
                  <SectionLabel color={css.muted}>{text("Długość", "Length")}</SectionLabel>
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
                    {LENGTHS.map((item) => (
                      <option key={item} value={item}>
                        {item}s
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <SectionLabel color={css.muted}>{text("Format bazowy", "Base format")}</SectionLabel>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {FORMATS.map((item) => (
                    <Pill
                      key={item}
                      active={format === item}
                      onClick={() => setFormat(item)}
                      color={css.aiText}
                      css={css}
                    >
                      {item}
                    </Pill>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <SectionLabel color={css.muted}>{text("Temat / idea", "Topic / idea")}</SectionLabel>

                <textarea
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="np. Dlaczego firmy nie powinny kopiować tego samego contentu na wszystkie platformy"
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
                <SectionLabel color={css.muted}>{text("Materiał źródłowy", "Source material")}</SectionLabel>

                <textarea
                  value={sourceContent}
                  onChange={(event) => setSourceContent(event.target.value)}
                  placeholder="Wklej post, opis bloga albo użyj analizy filmu."
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
                <SectionLabel color={css.muted}>{text("Kontekst marki", "Brand context")}</SectionLabel>

                <textarea
                  value={brandContext}
                  onChange={(event) => setBrandContext(event.target.value)}
                  placeholder="np. marka ekspercka B2B, ton prosty i konkretny."
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
                onClick={generateShorts}
                disabled={loading || !canGenerate}
                style={{
                  ...buttonPrimary,
                  cursor: loading || !canGenerate ? "not-allowed" : "pointer",
                  opacity: loading || !canGenerate ? 0.5 : 1,
                }}
              >
                {loading ? "AI tworzy treści..." : "✦ Wygeneruj treści AI"}
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
              <SectionLabel color={css.aiText}>
                <Wand2 size={15} color={css.aiIcon} />
                Wygenerowana treść AI
              </SectionLabel>

              {!result && !loading && (
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
                    <h3 style={{ ...panelTitleStyle, fontSize: 25 }}>{text("Warianty shortów pojawią się tutaj", "Short variants will appear here")}</h3>
                    <p style={{ color: css.muted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                      Po kliknięciu generowania AI przygotuje osobne scenariusze, opisy i hashtagi dla wybranych platform.
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
                    <p style={{ color: css.muted, fontSize: 13 }}>{text("AI dopasowuje shorty do platform...", "AI is adapting shorts for each platform...")}</p>
                  </div>
                </div>
              )}

              {result && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <ResultBox label="AI podsumowanie" css={css} accent>
                    <h3 style={{ margin: "0 0 8px", color: css.text, fontSize: 20, lineHeight: 1.2 }}>
                      {result.idea_title}
                    </h3>

                    <p style={{ margin: "0 0 8px", color: css.text, fontSize: 13, lineHeight: 1.7 }}>
                      {result.ai_summary}
                    </p>

                    <p style={{ margin: 0, color: css.muted, fontSize: 12, lineHeight: 1.6 }}>
                      Kąt: {result.main_angle}
                    </p>
                  </ResultBox>

                  {safeArray(result.variants).map((variant) => {
                    const platformInfo = getPlatformInfo(variant.platform);
                    const color = platformInfo?.color || css.accent;

                    return (
                      <div
                        key={variant.platform}
                        className="variant-card"
                        style={{
                          background: css.surfaceSoft,
                          border: `1px solid ${css.border}`,
                          borderRadius: 16,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            padding: "11px 13px",
                            background: `${color}14`,
                            borderBottom: `1px solid ${css.border}`,
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                color,
                                fontSize: 10,
                                fontWeight: 900,
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                              }}
                            >
                              {variant.platform_name}
                            </div>

                            <div style={{ color: css.text, fontSize: 15, fontWeight: 900, marginTop: 3 }}>
                              {variant.format} · {variant.duration_seconds}s
                            </div>
                          </div>

                          <div
                            style={{
                              color: getScoreColor(variant.score),
                              fontSize: 24,
                              fontWeight: 900,
                              fontFamily: "var(--font-heading)",
                            }}
                          >
                            {variant.score}
                          </div>
                        </div>

                        <div style={{ padding: 13, display: "flex", flexDirection: "column", gap: 9 }}>
                          <ResultBox label="Hook" css={css} accent>
                            <p style={{ margin: 0, color: css.text, fontSize: 15, fontWeight: 900, lineHeight: 1.45 }}>
                              “{variant.hook}”
                            </p>
                          </ResultBox>

                          <ResultBox label="Scenariusz" css={css}>
                            <p style={{ margin: 0, color: css.text, fontSize: 12, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                              {variant.script}
                            </p>
                          </ResultBox>

                          <ResultBox label="Opis i hashtagi" css={css}>
                            <p style={{ margin: 0, color: css.text, fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                              {variant.caption}
                            </p>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
                              {safeArray(variant.hashtags).map((tag, index) => (
                                <span
                                  key={`${variant.platform}-${tag}-${index}`}
                                  style={{
                                    color,
                                    background: `${color}18`,
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
                          </ResultBox>
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <button
                      type="button"
                      onClick={copyResult}
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
                      {saving ? "Zapisuję..." : "Szkic"}
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
