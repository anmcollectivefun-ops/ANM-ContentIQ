"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";

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

type ShortVariant = {
  platform: ShortPlatform;
  platform_name: string;
  duration_seconds: number;
  format: string;
  hook: string;
  script: string;
  shots: {
    time: string;
    scene: string;
    action: string;
  }[];
  on_screen_text: {
    time: string;
    text: string;
  }[];
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

type StudioMode = "idea" | "video";
type ShortAiProvider = "gemini" | "deepseek";

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

type ShortVideoStatus =
  | "uploaded_temp"
  | "analyzed"
  | "template_ready"
  | "publishing"
  | "published_external"
  | "deleted_local"
  | "expired";

type ShortVideoAnalysis = {
  title: string;
  visual_summary: string;
  transcript: string;
  detected_topic: string;
  hook: string;
  caption: string;
  hashtags: string[];
  on_screen_text: {
    time: string;
    text: string;
  }[];
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
  {
    id: "tiktok",
    name: "TikTok",
    shortName: "TikTok",
    color: "#ffffff",
  },
  {
    id: "instagram_reels",
    name: "Instagram Reels",
    shortName: "Reels",
    color: "#E1306C",
  },
  {
    id: "facebook_reels",
    name: "Facebook Reels",
    shortName: "FB Reels",
    color: "#1877F2",
  },
  {
    id: "youtube_shorts",
    name: "YouTube Shorts",
    shortName: "Shorts",
    color: "#FF0033",
  },
  {
    id: "linkedin_video",
    name: "LinkedIn Video",
    shortName: "LinkedIn",
    color: "#0A66C2",
  },
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
    message.includes("permission denied for table short_video_uploads") ||
    message.includes("row-level security policy")
  ) {
    return (
      "Supabase blokuje zapis filmu. Uruchom SQL z pliku " +
      "supabase/short_studio_rls_fix.sql, żeby nadać uprawnienia i polityki RLS dla Short Studio."
    );
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
${variant.shots
  .map(
    (shot) =>
      `- ${shot.time}: ${shot.scene}\n  Akcja: ${shot.action}`
  )
  .join("\n")}

Teksty na ekranie:
${variant.on_screen_text
  .map((item) => `- ${item.time}: ${item.text}`)
  .join("\n")}

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
  topic,
  sourceContent,
  selectedPlatforms,
  goal,
  format,
  duration,
  brandContext,
}: {
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

Twoje zadanie:
Z jednej idei przygotuj osobne warianty short video na wskazane platformy.

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

Materiał źródłowy / istniejący content:
${sourceContent || "brak"}

Kontekst marki / styl komunikacji:
${brandContext || "brak"}

Zasady:
- nie kopiuj tego samego scenariusza 1:1 na wszystkie platformy,
- TikTok: mocny hook, szybkie tempo, naturalny styl, prosty język,
- Instagram Reels: wizualność, emocje, zapis/udostępnienia, teksty na ekranie,
- Facebook Reels: prostszy przekaz, społeczność, praktyczny temat,
- YouTube Shorts: jasny tytuł, szybka wartość, retencja, miniatura,
- LinkedIn Video: eksperckość, konkret, B2B, mniej trendowo, bardziej merytorycznie,
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
        background: accent ? css.aiBg : css.surface,
        border: `1px solid ${accent ? css.aiBorder : css.border}`,
        borderRadius: 16,
        padding: 15,
      }}
    >
      <SectionLabel color={accent ? css.aiText : css.accent}>
        {label}
      </SectionLabel>
      {children}
    </div>
  );
}

export default function ShortStudio({
  dark = true,
  workspaceId = "contentiq",
}: {
  dark?: boolean;
  workspaceId?: string;
}) {
  const supabase = createClient();
  const [studioMode, setStudioMode] = useState<StudioMode>("idea");

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
  const [videoStatus, setVideoStatus] = useState<ShortVideoStatus | "idle">("idle");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [analyzingVideo, setAnalyzingVideo] = useState(false);
  const [deletingVideo, setDeletingVideo] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [shortAiProvider, setShortAiProvider] = useState<ShortAiProvider>("gemini");

  const topicRef = useRef<HTMLTextAreaElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const contextRef = useRef<HTMLTextAreaElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  async function copyResult() {
    if (!result) return;
    await navigator.clipboard.writeText(formatResultAsText(result));
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
      throw new Error(error?.message || "Nie udało się utworzyć przestrzeni.");
    }

    return created.id as string;
  }

  async function getCurrentUserId() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Brak aktywnej sesji.");
    return auth.user.id;
  }

  function handleVideoFileChange(file: File | null) {
    setVideoError("");
    setVideoAnalysis(null);
    setResult(null);

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

    try {
      const wsId = await getOrCreateWorkspaceUuid();
      const userId = await getCurrentUserId();
      if (!wsId) throw new Error("Brak workspace.");

      const fileName = safeFileName(videoFile.name || "short-video");
      const path = `${userId}/${wsId}/${Date.now()}-${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(TEMP_VIDEO_BUCKET)
        .upload(path, videoFile, {
          contentType: videoFile.type,
          upsert: false,
        });

      if (uploadError) throw new Error(`Błąd uploadu: ${uploadError.message}`);

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
    const video = videoRef.current;
    if (!video || !videoPreviewUrl) return [];
    const activeVideo = video;

    const waitForEvent = (eventName: string) =>
      new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          cleanup();
          reject(new Error(`Nie udało się odczytać klatki video: ${eventName}.`));
        }, 2500);

        function cleanup() {
          window.clearTimeout(timeout);
          activeVideo.removeEventListener(eventName, onEvent);
          activeVideo.removeEventListener("error", onError);
        }

        function onEvent() {
          cleanup();
          resolve();
        }

        function onError() {
          cleanup();
          reject(new Error("Błąd odczytu pliku video."));
        }

        activeVideo.addEventListener(eventName, onEvent, { once: true });
        activeVideo.addEventListener("error", onError, { once: true });
      });

    if (video.readyState < 1) {
      await waitForEvent("loadedmetadata");
    }

    const duration = Number.isFinite(video.duration) && video.duration > 0
      ? video.duration
      : 1;
    const times = [0.8, duration * 0.45, Math.max(duration - 0.8, duration * 0.8)]
      .map((time) => Math.min(Math.max(time, 0.1), Math.max(duration - 0.1, 0.1)));

    const canvas = document.createElement("canvas");
    const width = Math.min(video.videoWidth || 720, 720);
    const height = Math.round(width * ((video.videoHeight || 1280) / (video.videoWidth || 720)));
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    const frames: string[] = [];
    const originalTime = video.currentTime;
    const wasPaused = video.paused;
    video.pause();

    for (const time of times) {
      video.currentTime = time;
      await waitForEvent("seeked");
      ctx.drawImage(video, 0, 0, width, height);
      frames.push(canvas.toDataURL("image/jpeg", 0.78));
    }

    video.currentTime = originalTime;
    if (!wasPaused) void video.play().catch(() => undefined);

    return frames;
  }

  async function analyzeVideo() {
    if (!videoFile && !videoUpload) {
      setVideoError("Najpierw wybierz plik video.");
      return;
    }

    setAnalyzingVideo(true);
    setVideoError("");

    try {
      const frameDataUrls = await captureVideoFrames().catch((err) => {
        console.warn("Nie udało się pobrać klatek video:", err);
        return [] as string[];
      });
      const upload = videoUpload || (await uploadVideoTemp());

      const res = await fetch("/api/shorts/analyze-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || "Błąd AI podczas analizy filmu.");
      }

      const analysis = normalizeVideoAnalysis(json);
      setVideoAnalysis(analysis);
      setVideoStatus("analyzed");
      setTopic(analysis.detected_topic || analysis.title || topic);
      setSourceContent(
        [
          analysis.transcript ? `Transkrypcja / opis wypowiedzi:\n${analysis.transcript}` : "",
          analysis.visual_summary ? `Opis wizualny:\n${analysis.visual_summary}` : "",
        ]
          .filter(Boolean)
          .join("\n\n")
      );

      await supabase
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
      setResult(null);

      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl("");
      showToast("✓ Usunięto plik tymczasowy i rekord z bazy");
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
      const templateRows = videoAnalysis.platform_recommendations.length > 0
        ? videoAnalysis.platform_recommendations
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
          templateRows.map((item) => ({
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
            thumbnail_text: videoAnalysis.hook,
            ai_summary: `${videoAnalysis.template_summary}\n\n${videoAnalysis.visual_summary}`.trim(),
            video_storage_path: videoUpload.storage_path,
            video_public_url: videoUpload.public_url || videoUpload.signed_url,
            status: "template_ready",
          }))
        );

      if (insertError) throw new Error(insertError.message);

      await supabase
        .schema("contentiq")
        .from("short_video_uploads")
        .update({ status: "template_ready" })
        .eq("id", videoUpload.id);

      setVideoStatus("template_ready");
      showToast("✓ Zapisano szablon shorta z filmu");
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
          ? `Transkrypcja / opis wypowiedzi:
${videoAnalysis.transcript}`
          : "",
        videoAnalysis?.visual_summary
          ? `Opis wizualny:
${videoAnalysis.visual_summary}`
          : "",
        videoAnalysis?.caption ? `Opis AI:
${videoAnalysis.caption}` : "",
        videoAnalysis?.hashtags?.length
          ? `Hashtagi:
${videoAnalysis.hashtags.join(" ")}`
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "chat",
          prompt,
        }),
      });

      const json = (await res.json()) as ApiResponse;

      if (!res.ok || json.error) {
        setError(json.error || "Błąd API.");
        return;
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
    } catch (err) {
      console.error(err);
      setError(
        "AI nie zwróciło poprawnego JSON. Spróbuj jeszcze raz albo skróć opis."
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

      showToast("✓ Zapisano Short Studio jako szkic");
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

      if (videoAnalysis && videoUpload) {
        const userId = await getCurrentUserId();
        const { error: templateError } = await supabase
          .schema("contentiq")
          .from("short_templates")
          .insert(
            result.variants.map((variant) => ({
              workspace_id: wsId,
              user_id: userId,
              source_upload_id: videoUpload.id,
              title: result.idea_title || videoAnalysis.title,
              platform: variant.platform,
              hook: variant.hook,
              caption: variant.caption,
              hashtags: variant.hashtags,
              script: variant.script,
              on_screen_text: variant.on_screen_text,
              shots: variant.shots,
              thumbnail_text: variant.thumbnail_text,
              ai_summary: result.ai_summary || videoAnalysis.template_summary,
              video_storage_path: videoUpload.storage_path,
              video_public_url: videoUpload.public_url || videoUpload.signed_url,
              status: "template_ready",
            }))
          );

        if (templateError) throw new Error(templateError.message);

        await supabase
          .schema("contentiq")
          .from("short_video_uploads")
          .update({ status: "template_ready" })
          .eq("id", videoUpload.id);

        setVideoStatus("template_ready");
      }

      showToast("✓ Zapisano Short Studio jako szablon");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingTemplate(false);
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
        }

        .short-studio-grid {
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: 18px;
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
          .short-studio-grid {
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

      <div className="short-studio-grid">
        <div
          style={{
            background: css.surface,
            border: `1px solid ${css.border}`,
            borderRadius: 22,
            padding: 18,
          }}
        >
          <SectionLabel color={css.accent}>Short Studio</SectionLabel>

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
            Jedna idea, wiele shortów
          </h2>

          <p
            style={{
              margin: "0 0 18px",
              color: css.muted,
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            Przygotuj jeden temat i od razu dostaniesz osobne wersje pod TikTok,
            Reels, Shorts, Facebook Reels i LinkedIn Video.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 16,
            }}
          >
            {[
              { id: "idea" as StudioMode, label: "Pomysł → shorty" },
              { id: "video" as StudioMode, label: "Film → analiza AI" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStudioMode(item.id)}
                style={{
                  borderRadius: 14,
                  border: `1px solid ${
                    studioMode === item.id ? css.aiBorder : css.border
                  }`,
                  background: studioMode === item.id ? css.aiBg : css.surfaceSoft,
                  color: studioMode === item.id ? css.aiText : css.muted,
                  padding: "11px 12px",
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {studioMode === "video" && (
            <div
              style={{
                marginBottom: 16,
                padding: 15,
                borderRadius: 18,
                background: css.aiBg,
                border: `1px solid ${css.aiBorder}`,
              }}
            >
              <SectionLabel color={css.aiText}>
                Analiza shorta z pliku video
              </SectionLabel>

              <p
                style={{
                  margin: "0 0 12px",
                  color: css.muted,
                  fontSize: 12,
                  lineHeight: 1.7,
                }}
              >
                Film jest przechowywany tymczasowo i zostanie usunięty po
                publikacji lub wygaśnięciu. Do bazy trafiają tylko metadane,
                opis, analiza AI i link do posta po publikacji.
              </p>

              <div style={{ marginBottom: 12 }}>
                <SectionLabel color={css.aiText}>Silnik analizy</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    {
                      id: "gemini" as ShortAiProvider,
                      label: "Gemini",
                      note: "klatki + napisy",
                    },
                    {
                      id: "deepseek" as ShortAiProvider,
                      label: "DeepSeek",
                      note: "tekst + strategia",
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setShortAiProvider(item.id)}
                      style={{
                        borderRadius: 13,
                        border: `1px solid ${
                          shortAiProvider === item.id ? css.aiBorder : css.border
                        }`,
                        background:
                          shortAiProvider === item.id ? css.aiBgSoft : css.surfaceSoft,
                        color: shortAiProvider === item.id ? css.aiText : css.muted,
                        padding: "10px 12px",
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "inherit",
                      }}
                    >
                      <span style={{ display: "block", fontSize: 12, fontWeight: 900 }}>
                        {item.label}
                      </span>
                      <span style={{ display: "block", fontSize: 10, marginTop: 3 }}>
                        {item.note}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={(event) =>
                  handleVideoFileChange(event.target.files?.[0] || null)
                }
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
                        maxHeight: 260,
                        borderRadius: 16,
                        background: "#000",
                        border: `1px solid ${css.border}`,
                      }}
                    />
                  )}
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: videoUpload ? "1fr 1fr" : "1fr",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  onClick={analyzeVideo}
                  disabled={!videoFile || uploadingVideo || analyzingVideo}
                  style={{
                    border: "none",
                    borderRadius: 14,
                    background: dark ? "#ffffff" : "#111111",
                    color: dark ? "#050505" : "#ffffff",
                    padding: "12px 14px",
                    fontSize: 12,
                    fontWeight: 900,
                    cursor:
                      !videoFile || uploadingVideo || analyzingVideo
                        ? "not-allowed"
                        : "pointer",
                    opacity: !videoFile || uploadingVideo || analyzingVideo ? 0.55 : 1,
                    fontFamily: "inherit",
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
                    {deletingVideo ? "Usuwam..." : "Usuń plik tymczasowy"}
                  </button>
                )}
              </div>

              <div
                style={{
                  marginTop: 10,
                  color: css.muted,
                  fontSize: 11,
                  lineHeight: 1.6,
                }}
              >
                Status: <strong style={{ color: css.aiText }}>{videoStatus}</strong>
              </div>

              {videoAnalysis && (
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <ResultBox label="Wynik AI" css={css} accent>
                    <h3
                      style={{
                        margin: "0 0 8px",
                        color: css.text,
                        fontSize: 18,
                      }}
                    >
                      {videoAnalysis.title}
                    </h3>

                    <p
                      style={{
                        margin: "0 0 8px",
                        color: css.text,
                        fontSize: 12,
                        lineHeight: 1.7,
                      }}
                    >
                      {videoAnalysis.visual_summary}
                    </p>

                    <p
                      style={{
                        margin: 0,
                        color: css.muted,
                        fontSize: 12,
                        lineHeight: 1.7,
                      }}
                    >
                      Hook: {videoAnalysis.hook}
                    </p>
                  </ResultBox>

                  <button
                    type="button"
                    onClick={saveAnalyzedVideoTemplate}
                    disabled={savingTemplate}
                    style={{
                      borderRadius: 14,
                      border: `1px solid ${css.aiBorder}`,
                      background: css.surface,
                      color: css.aiText,
                      padding: "12px 14px",
                      fontSize: 12,
                      fontWeight: 900,
                      cursor: savingTemplate ? "not-allowed" : "pointer",
                      opacity: savingTemplate ? 0.6 : 1,
                      fontFamily: "inherit",
                    }}
                  >
                    {savingTemplate
                      ? "Zapisuję..."
                      : "Zapisz jako szablon shorta"}
                  </button>
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
            </div>
          )}


          <div style={{ marginBottom: 16 }}>
            <SectionLabel color={css.muted}>
              Platformy: {selectedPlatformNames}
            </SectionLabel>

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

          <div style={{ marginBottom: 16 }}>
            <SectionLabel color={css.muted}>Cel</SectionLabel>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {GOALS.map((item) => (
                <Pill
                  key={item}
                  active={goal === item}
                  onClick={() => setGoal(item)}
                  color={css.accent}
                  css={css}
                >
                  {item}
                </Pill>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <SectionLabel color={css.muted}>Format bazowy</SectionLabel>

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

          <div style={{ marginBottom: 16 }}>
            <SectionLabel color={css.muted}>Długość bazowa</SectionLabel>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {LENGTHS.map((item) => (
                <Pill
                  key={item}
                  active={duration === item}
                  onClick={() => setDuration(item)}
                  color={css.accent}
                  css={css}
                >
                  {item}s
                </Pill>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <SectionLabel color={css.muted}>Temat / idea</SectionLabel>

            <textarea
              ref={topicRef}
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="np. Dlaczego firmy nie powinny kopiować tego samego contentu na wszystkie platformy"
              style={{
                width: "100%",
                minHeight: 112,
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

          <div style={{ marginBottom: 16 }}>
            <SectionLabel color={css.muted}>
              Materiał źródłowy, opcjonalnie
            </SectionLabel>

            <textarea
              ref={sourceRef}
              value={sourceContent}
              onChange={(event) => setSourceContent(event.target.value)}
              placeholder="Możesz wkleić post z LinkedIna, opis bloga albo szkic tekstu, który AI ma przerobić na shorty."
              style={{
                width: "100%",
                minHeight: 92,
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
              placeholder="np. marka ekspercka B2B, ton prosty i konkretny, odbiorcy: właściciele firm i marketerzy."
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
            onClick={generateShorts}
            disabled={loading || !canGenerate}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 16,
              padding: "14px 16px",
              background: dark ? "#ffffff" : "#111111",
              color: dark ? "#050505" : "#ffffff",
              fontSize: 13,
              fontWeight: 900,
              cursor:
                loading || !canGenerate
                  ? "not-allowed"
                  : "pointer",
              opacity:
                loading || !canGenerate
                  ? 0.5
                  : 1,
              fontFamily: "inherit",
            }}
          >
            {loading ? "AI tworzy treści..." : "✦ Wygeneruj treści z filmu / pomysłu"}
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

        <div>


          {!result && !loading && (
            <div
              style={{
                minHeight: 520,
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
                <div style={{ fontSize: 48, opacity: 0.18, marginBottom: 12 }}>
                  ⊞
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
                  Warianty shortów pojawią się tutaj
                </h3>

                <p
                  style={{
                    maxWidth: 380,
                    color: css.muted,
                    fontSize: 13,
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  Zamiast jednego scenariusza AI przygotuje osobne wersje pod
                  każdą platformę.
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div
              style={{
                minHeight: 520,
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
                  AI dopasowuje shorty do platform...
                </p>
              </div>
            </div>
          )}

          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <ResultBox label="AI podsumowanie" css={css} accent>
                <h3
                  style={{
                    margin: "0 0 8px",
                    color: css.text,
                    fontSize: 22,
                    lineHeight: 1.2,
                  }}
                >
                  {result.idea_title}
                </h3>

                <p
                  style={{
                    margin: "0 0 10px",
                    color: css.text,
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  {result.ai_summary}
                </p>

                <p
                  style={{
                    margin: 0,
                    color: css.muted,
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
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
                      background: css.surface,
                      border: `1px solid ${css.border}`,
                      borderRadius: 20,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 15px",
                        background: `${color}14`,
                        borderBottom: `1px solid ${css.border}`,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 14,
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color,
                            fontSize: 11,
                            fontWeight: 900,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                          }}
                        >
                          {variant.platform_name}
                        </div>

                        <div
                          style={{
                            color: css.text,
                            fontSize: 18,
                            fontWeight: 900,
                            marginTop: 3,
                          }}
                        >
                          {variant.format} · {variant.duration_seconds}s
                        </div>
                      </div>

                      <div
                        style={{
                          color: getScoreColor(variant.score),
                          fontSize: 28,
                          fontWeight: 900,
                          fontFamily: "'DM Serif Display', serif",
                        }}
                      >
                        {variant.score}
                      </div>
                    </div>

                    <div style={{ padding: 15 }}>
                      <ResultBox label="Hook 0-2 sekundy" css={css} accent>
                        <p
                          style={{
                            margin: 0,
                            color: css.text,
                            fontSize: 17,
                            fontWeight: 900,
                            lineHeight: 1.45,
                          }}
                        >
                          “{variant.hook}”
                        </p>
                      </ResultBox>

                      <div style={{ height: 10 }} />

                      <ResultBox label="Scenariusz" css={css}>
                        <p
                          style={{
                            margin: 0,
                            color: css.text,
                            fontSize: 13,
                            lineHeight: 1.8,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {variant.script}
                        </p>
                      </ResultBox>

                      <div style={{ height: 10 }} />

                      <div
                        className="short-two-grid"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 10,
                        }}
                      >
                        <ResultBox label="Ujęcia" css={css}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                            {safeArray(variant.shots).map((shot, index) => (
                              <div
                                key={`${variant.platform}-shot-${index}`}
                                style={{
                                  borderLeft: `3px solid ${color}`,
                                  paddingLeft: 10,
                                }}
                              >
                                <div
                                  style={{
                                    color,
                                    fontSize: 10,
                                    fontWeight: 900,
                                    marginBottom: 3,
                                  }}
                                >
                                  {shot.time}
                                </div>
                                <div
                                  style={{
                                    color: css.text,
                                    fontSize: 12,
                                    lineHeight: 1.55,
                                  }}
                                >
                                  <strong>{shot.scene}</strong>
                                  <br />
                                  {shot.action}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ResultBox>

                        <ResultBox label="Teksty na ekranie" css={css}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {safeArray(variant.on_screen_text).map(
                              (item, index) => (
                                <div
                                  key={`${variant.platform}-txt-${index}`}
                                  style={{
                                    background: css.surfaceSoft,
                                    border: `1px solid ${css.border}`,
                                    borderRadius: 12,
                                    padding: 9,
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
                                      fontSize: 12,
                                      fontWeight: 800,
                                      lineHeight: 1.45,
                                    }}
                                  >
                                    {item.text}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </ResultBox>
                      </div>

                      <div style={{ height: 10 }} />

                      <ResultBox label="Opis i hashtagi" css={css}>
                        <p
                          style={{
                            margin: 0,
                            color: css.text,
                            fontSize: 13,
                            lineHeight: 1.7,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {variant.caption}
                        </p>

                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 6,
                            marginTop: 10,
                          }}
                        >
                          {safeArray(variant.hashtags).map((tag, index) => (
                            <span
                              key={`${variant.platform}-${tag}-${index}`}
                              style={{
                                color,
                                background: `${color}18`,
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
                      </ResultBox>

                      <div style={{ height: 10 }} />

                      <div
                        className="short-two-grid"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 10,
                        }}
                      >
                        <ResultBox label="Miniatura" css={css}>
                          <p
                            style={{
                              margin: 0,
                              color: css.text,
                              fontSize: 19,
                              fontWeight: 900,
                              lineHeight: 1.25,
                            }}
                          >
                            {variant.thumbnail_text}
                          </p>
                        </ResultBox>

                        <ResultBox label="Notatka publikacyjna" css={css} accent>
                          <p
                            style={{
                              margin: 0,
                              color: css.text,
                              fontSize: 12,
                              lineHeight: 1.7,
                            }}
                          >
                            {variant.publishing_notes}
                          </p>
                        </ResultBox>
                      </div>
                    </div>
                  </div>
                );
              })}

              <ResultBox label="Wnioski cross-platform" css={css} accent>
                <ul style={{ margin: 0, paddingLeft: 18, color: css.text }}>
                  {safeArray(result.cross_platform_notes).map((item, index) => (
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
              </ResultBox>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onClick={copyResult}
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
                  {copied ? "✓ Skopiowano" : "Kopiuj całość"}
                </button>

                <button
                  type="button"
                  onClick={saveTemplate}
                  disabled={savingTemplate}
                  style={{
                    borderRadius: 14,
                    border: `1px solid ${css.aiBorder}`,
                    background: css.aiBg,
                    color: css.aiText,
                    padding: "12px 14px",
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: savingTemplate ? "not-allowed" : "pointer",
                    opacity: savingTemplate ? 0.6 : 1,
                    fontFamily: "inherit",
                  }}
                >
                  {savingTemplate ? "Zapisuję..." : "Zapisz jako szablon"}
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
