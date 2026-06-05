"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "generate" | "analyze" | "adapt";

type Platform =
  | "linkedin"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "blog"
  | "spotify";

type MediaStatus = "local" | "uploaded";

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

interface TemplateDraft {
  id: string;
  title: string | null;
  body: string | null;
  topic: string | null;
  content_type: string | null;
  target_platforms: string[] | null;
  ai_score: number | null;
  ai_feedback: string | null;
  created_at: string | null;
}

interface LocalMediaItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  mimeType: string;
  size: number;
  assetType: "image" | "video" | "audio" | "document";
  status: MediaStatus;
}

interface UploadedMediaItem {
  kind: "cover" | "attachment";
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  asset_type: "image" | "video" | "audio" | "document";
  status: "temporary" | "scheduled";
  expires_at: string;
}

type ApiResponse = {
  data?: GeneratedContent | AnalysisResult | AdaptResult;
  answer?: string;
  error?: string;
  parseError?: string;
};

const STORAGE_BUCKET = "content-temp-media";

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

function getDraftTitle(generated: GeneratedContent, prompt: string) {
  return generated.title || prompt.slice(0, 80) || "Szablon bez tytułu";
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function getAssetType(file: File): LocalMediaItem["assetType"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 100);
}

function getExpiryDate(scheduledAt?: string) {
  const base = scheduledAt ? new Date(scheduledAt) : new Date();
  base.setDate(base.getDate() + (scheduledAt ? 7 : 30));
  return base.toISOString();
}

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

function MediaPicker({
  media,
  setMedia,
  css,
}: {
  media: LocalMediaItem[];
  setMedia: React.Dispatch<React.SetStateAction<LocalMediaItem[]>>;
  css: Record<string, string>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | null) {
    if (!files?.length) return;

    const allowed = Array.from(files).filter((file) => {
      const type = getAssetType(file);
      const maxSize = type === "video" ? 250 * 1024 * 1024 : 25 * 1024 * 1024;
      return file.size <= maxSize;
    });

    const nextItems: LocalMediaItem[] = allowed.map((file) => ({
      id: `${Date.now()}-${crypto.randomUUID()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      assetType: getAssetType(file),
      status: "local",
    }));

    setMedia((prev) => [...prev, ...nextItems]);
  }

  function removeMedia(id: string) {
    setMedia((prev) => {
      const item = prev.find((entry) => entry.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((entry) => entry.id !== id);
    });
  }

  return (
    <div>
      <SectionLabel color={css.muted}>Media do posta</SectionLabel>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(event.dataTransfer.files);
        }}
        style={{
          border: `1px dashed ${css.border}`,
          background: css.surface,
          borderRadius: 14,
          padding: 16,
          cursor: "pointer",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(event) => addFiles(event.target.files)}
          style={{ display: "none" }}
        />

        <div style={{ fontSize: 13, fontWeight: 800, color: css.text }}>
          Dodaj zdjęcie, grafikę albo video
        </div>

        <div style={{ fontSize: 11, color: css.muted, marginTop: 5, lineHeight: 1.6 }}>
          Pliki są przechowywane tymczasowo tylko do publikacji. Po publikacji
          zostawiamy link/ID posta z platformy, a plik można usunąć ze Storage.
        </div>
      </div>

      {media.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 8,
            marginTop: 10,
          }}
        >
          {media.map((item) => (
            <div
              key={item.id}
              style={{
                border: `1px solid ${css.border}`,
                background: css.surface,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: 120,
                  background: css.bg,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {item.assetType === "image" && (
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                )}

                {item.assetType === "video" && (
                  <video
                    src={item.previewUrl}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    muted
                    controls
                  />
                )}

                {!["image", "video"].includes(item.assetType) && (
                  <span style={{ color: css.muted, fontSize: 12 }}>
                    {item.assetType}
                  </span>
                )}
              </div>

              <div style={{ padding: 10 }}>
                <div
                  style={{
                    color: css.text,
                    fontSize: 11,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.name}
                </div>

                <div style={{ color: css.muted, fontSize: 10, marginTop: 3 }}>
                  {item.assetType} · {formatFileSize(item.size)}
                </div>

                <button
                  type="button"
                  onClick={() => removeMedia(item.id)}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    border: `1px solid ${css.border}`,
                    background: "transparent",
                    color: "#ef4444",
                    borderRadius: 8,
                    padding: "6px 8px",
                    fontSize: 10,
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Usuń
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleModal({
  onClose,
  onSchedule,
  platform,
  css,
}: {
  onClose: () => void;
  onSchedule: (date: string) => void;
  platform: Platform;
  css: Record<string, string>;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: css.surface,
          border: `1px solid ${css.border}`,
          borderRadius: 18,
          padding: 28,
          width: 380,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: css.text,
            marginBottom: 6,
          }}
        >
          Zaplanuj publikację
        </div>

        <div style={{ fontSize: 12, color: css.muted, marginBottom: 20 }}>
          Platforma:{" "}
          <span style={{ color: getPlatformInfo(platform)?.color }}>
            {getPlatformInfo(platform)?.name}
          </span>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: css.muted,
              marginBottom: 6,
            }}
          >
            Data
          </div>

          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 10,
              border: `1px solid ${css.border}`,
              background: css.bg,
              color: css.text,
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
            }}
          />
        </div>

        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: css.muted,
              marginBottom: 6,
            }}
          >
            Godzina
          </div>

          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 10,
              border: `1px solid ${css.border}`,
              background: css.bg,
              color: css.text,
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 10,
              border: `1px solid ${css.border}`,
              background: "transparent",
              color: css.muted,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Anuluj
          </button>

          <button
            type="button"
            onClick={() => {
              if (date) onSchedule(`${date}T${time}:00`);
            }}
            disabled={!date}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 10,
              border: "none",
              background: getPlatformInfo(platform)?.color || css.accent,
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              opacity: !date ? 0.5 : 1,
            }}
          >
            ◷ Zaplanuj
          </button>
        </div>
      </div>
    </div>
  );
}

function ContentActions({
  generated,
  platform,
  prompt,
  contentType,
  workspaceId,
  css,
  media,
}: {
  generated: GeneratedContent;
  platform: Platform;
  prompt: string;
  contentType: string;
  workspaceId: string;
  css: Record<string, string>;
  media: LocalMediaItem[];
}) {
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(
    null
  );

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const fullContent = [
    generated.hook,
    generated.body,
    generated.cta,
    safeArray(generated.hashtags).join(" "),
  ]
    .filter((part) => part.trim().length > 0)
    .join("\n\n");

  async function getOrCreateWorkspaceUuid() {
    const { data, error } = await supabase
      .schema("contentiq")
      .from("workspaces")
      .select("id")
      .eq("slug", workspaceId)
      .single();

    if (error) throw new Error(error.message);
    return data?.id as string | undefined;
  }

  async function uploadMediaForDraft({
    wsId,
    draftId,
    scheduledAt,
    status,
  }: {
    wsId: string;
    draftId: string;
    scheduledAt?: string;
    status: "temporary" | "scheduled";
  }) {
    if (media.length === 0) return [];

    const expiresAt = getExpiryDate(scheduledAt);
    const uploaded: UploadedMediaItem[] = [];

    for (const item of media) {
      const fileName = safeFileName(item.name || "media");
      const path = `${wsId}/${draftId}/${Date.now()}-${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, item.file, {
          contentType: item.mimeType,
          upsert: false,
        });

      if (uploadError) throw new Error(uploadError.message);

      const record: UploadedMediaItem = {
        kind: uploaded.length === 0 ? "cover" : "attachment",
        storage_bucket: STORAGE_BUCKET,
        storage_path: path,
        file_name: item.name,
        mime_type: item.mimeType,
        file_size: item.size,
        asset_type: item.assetType,
        status,
        expires_at: expiresAt,
      };

      uploaded.push(record);

      const { error: assetError } = await supabase
        .schema("contentiq")
        .from("media_assets")
        .insert({
          workspace_id: wsId,
          draft_id: draftId,
          storage_bucket: STORAGE_BUCKET,
          storage_path: path,
          file_name: item.name,
          mime_type: item.mimeType,
          file_size: item.size,
          asset_type: item.assetType,
          status,
          expires_at: expiresAt,
        });

      if (assetError) throw new Error(assetError.message);
    }

    const { error: updateError } = await supabase
      .schema("contentiq")
      .from("content_drafts")
      .update({ media: uploaded })
      .eq("id", draftId);

    if (updateError) throw new Error(updateError.message);

    return uploaded;
  }

  async function saveDraft() {
    setSaving(true);

    try {
      const wsId = await getOrCreateWorkspaceUuid();
      if (!wsId) throw new Error("Brak przestrzeni aplikacji.");

      const { error } = await supabase
        .schema("contentiq")
        .from("inspirations")
        .insert({
          workspace_id: wsId,
          source_kind: "content",
          source_studio: "Content Studio",
          title: getDraftTitle(generated, prompt),
          description: generated.hook || prompt,
          body: fullContent,
          platforms: [platform],
          hashtags: safeArray(generated.hashtags),
          ai_score: generated.estimated_score,
          ai_feedback: generated.platform_notes,
          status: "active",
        });

      if (error) throw new Error(error.message);

      showToast("✓ Zapisano jako inspirację", "ok");
    } catch (err) {
      showToast(`Błąd: ${err instanceof Error ? err.message : String(err)}`, "err");
    } finally {
      setSaving(false);
    }
  }

  async function saveTemplate() {
    setSavingTemplate(true);

    try {
      const wsId = await getOrCreateWorkspaceUuid();
      if (!wsId) throw new Error("Brak przestrzeni aplikacji.");

      const { data: draft, error } = await supabase
        .schema("contentiq")
        .from("content_drafts")
        .insert({
          workspace_id: wsId,
          title: getDraftTitle(generated, prompt),
          body: fullContent,
          topic: prompt,
          content_type: contentType,
          target_platforms: [platform],
          ai_score: generated.estimated_score,
          ai_feedback: generated.platform_notes,
          status: "template",
          media: [],
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);

      await uploadMediaForDraft({
        wsId,
        draftId: draft.id,
        status: "temporary",
      });

      showToast("✓ Zapisano szablon z okładką", "ok");
    } catch (err) {
      showToast(`Błąd: ${err instanceof Error ? err.message : String(err)}`, "err");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function schedulePost(scheduledAt: string) {
    setScheduling(true);
    setShowModal(false);

    try {
      const wsId = await getOrCreateWorkspaceUuid();
      if (!wsId) throw new Error("Brak przestrzeni aplikacji.");

      const { data: draft, error: draftErr } = await supabase
        .schema("contentiq")
        .from("content_drafts")
        .insert({
          workspace_id: wsId,
          title: getDraftTitle(generated, prompt),
          body: fullContent,
          topic: prompt,
          content_type: contentType,
          target_platforms: [platform],
          ai_score: generated.estimated_score,
          ai_feedback: generated.platform_notes,
          status: "scheduled",
          media: [],
        })
        .select("id")
        .single();

      if (draftErr) throw new Error(draftErr.message);

      await uploadMediaForDraft({
        wsId,
        draftId: draft.id,
        scheduledAt,
        status: "scheduled",
      });

      const { data: conn } = await supabase
        .schema("contentiq")
        .from("platform_connections")
        .select("id")
        .eq("workspace_id", wsId)
        .eq("platform", platform)
        .eq("connected", true)
        .limit(1)
        .single();

      if (!conn) throw new Error(`Brak podłączonego konta: ${platform}`);

      const { data: scheduled, error: schedErr } = await supabase
        .schema("contentiq")
        .from("scheduled_posts")
        .insert({
          draft_id: draft.id,
          connection_id: conn.id,
          platform,
          scheduled_at: scheduledAt,
          status: "scheduled",
        })
        .select("id")
        .single();

      if (schedErr) throw new Error(schedErr.message);

      await supabase
        .schema("contentiq")
        .from("media_assets")
        .update({ scheduled_post_id: scheduled.id })
        .eq("draft_id", draft.id);

      showToast(
        `✓ Zaplanowano na ${new Date(scheduledAt).toLocaleString("pl-PL")}`,
        "ok"
      );
    } catch (err) {
      showToast(`Błąd: ${err instanceof Error ? err.message : String(err)}`, "err");
    } finally {
      setScheduling(false);
    }
  }

  async function publishNow() {
    setPublishing(true);

    try {
      await schedulePost(new Date().toISOString());
      showToast("✓ Wysłano do kolejki publikacji", "ok");
    } catch (err) {
      showToast(`Błąd: ${err instanceof Error ? err.message : String(err)}`, "err");
    } finally {
      setPublishing(false);
    }
  }

  const pColor = getPlatformInfo(platform)?.color || css.accent;

  return (
    <>
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 200,
            padding: "10px 18px",
            borderRadius: 10,
            background: toast.type === "ok" ? "#052e16" : "#450a0a",
            color: toast.type === "ok" ? "#22c55e" : "#ef4444",
            fontSize: 13,
            border: `1px solid ${toast.type === "ok" ? "#166534" : "#991b1b"}`,
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {toast.msg}
        </div>
      )}

      {showModal && (
        <ScheduleModal
          platform={platform}
          css={css}
          onClose={() => setShowModal(false)}
          onSchedule={schedulePost}
        />
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          marginTop: 4,
        }}
      >
        <button
          type="button"
          onClick={saveTemplate}
          disabled={savingTemplate}
          style={{
            padding: "10px 8px",
            borderRadius: 10,
            border: `1px solid ${css.border}`,
            background: css.surface,
            color: css.muted,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            opacity: savingTemplate ? 0.6 : 1,
          }}
        >
          {savingTemplate ? "Zapisuję..." : "□ Zapisz szablon"}
        </button>

        <button
          type="button"
          onClick={saveDraft}
          disabled={saving}
          style={{
            padding: "10px 8px",
            borderRadius: 10,
            border: `1px solid ${css.border}`,
            background: css.surface,
            color: css.muted,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Zapisuję..." : "▤ Zapisz inspirację"}
        </button>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          disabled={scheduling}
          style={{
            padding: "10px 8px",
            borderRadius: 10,
            border: `1.5px solid ${pColor}`,
            background: `${pColor}15`,
            color: pColor,
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            opacity: scheduling ? 0.6 : 1,
          }}
        >
          {scheduling ? "Planowanie..." : "◷ Zaplanuj"}
        </button>

        <button
          type="button"
          onClick={publishNow}
          disabled={publishing}
          style={{
            padding: "10px 8px",
            borderRadius: 10,
            border: "none",
            background: pColor,
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            opacity: publishing ? 0.6 : 1,
          }}
        >
          {publishing ? "Wysyłam..." : "↑ Publikuj teraz"}
        </button>
      </div>
    </>
  );
}

export default function ContentStudio({
  dark = true,
  workspaceId = "contentiq",
}: {
  dark?: boolean;
  workspaceId?: string;
}) {
  const [mode, setMode] = useState<Mode>("generate");
  const [platform, setPlatform] = useState<Platform>("linkedin");
  const [contentType, setContentType] = useState(CONTENT_TYPES[0]);
  const [prompt, setPrompt] = useState("");
  const [media, setMedia] = useState<LocalMediaItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [adapted, setAdapted] = useState<AdaptResult | null>(null);
  const [selectedAdaptPlatforms, setSelectedAdaptPlatforms] = useState<Platform[]>([
    "linkedin",
    "instagram",
    "tiktok",
  ]);

  const [rawAnswer, setRawAnswer] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const css: Record<string, string> = dark
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

  useEffect(() => {
    return () => {
      media.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [media]);

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          prompt,
          platform: mode !== "adapt" ? platform : undefined,
          contentType: mode === "generate" ? contentType : undefined,
          platforms: mode === "adapt" ? selectedAdaptPlatforms : undefined,
        }),
      });

      const json = (await res.json()) as ApiResponse;

      if (!res.ok || json.error) {
        setError(json.error || "Błąd API.");
        return;
      }

      if (json.answer) setRawAnswer(json.answer);

      if (json.parseError) {
        setError(`Błąd parsowania: ${json.parseError}`);
        return;
      }

      if (!json.data) {
        setError("Brak danych w odpowiedzi API.");
        return;
      }

      if (mode === "generate") setGenerated(json.data as GeneratedContent);
      if (mode === "analyze") setAnalysis(json.data as AnalysisResult);
      if (mode === "adapt") setAdapted(json.data as AdaptResult);
    } catch {
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
      setError("Nie udało się skopiować.");
    }
  }

  function toggleAdaptPlatform(platformId: Platform) {
    setSelectedAdaptPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((item) => item !== platformId)
        : [...prev, platformId]
    );
  }

  function useTemplate(template: TemplateDraft) {
    const targetPlatform = safeArray(template.target_platforms)[0] as Platform | undefined;

    setMode("generate");
    setPlatform(targetPlatform && PLATFORMS.some((item) => item.id === targetPlatform)
      ? targetPlatform
      : "linkedin");
    setContentType(template.content_type || CONTENT_TYPES[0]);
    setPrompt(template.topic || template.body || "");
    setGenerated({
      title: template.title || undefined,
      hook: "",
      body: template.body || "",
      cta: "",
      hashtags: [],
      estimated_score: template.ai_score || 0,
      platform_notes: template.ai_feedback || "Szablon wczytany z biblioteki.",
    });
    setAnalysis(null);
    setAdapted(null);
    setRawAnswer("");
    setError("");
  }

  useEffect(() => {
    const rawTemplate = localStorage.getItem("ciq-content-template");
    if (!rawTemplate) return;

    localStorage.removeItem("ciq-content-template");

    try {
      useTemplate(JSON.parse(rawTemplate) as TemplateDraft);
    } catch {
      setError("Nie udało się wczytać szablonu.");
    }
  }, []);

  return (
    <div style={rootStyle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Serif+Display&display=swap');

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
          transition: all .15s ease;
        }

        .ciq-mode-btn:hover,
        .ciq-copy-btn:hover {
          opacity: .75;
        }

        .ciq-platform-pill:hover {
          transform: translateY(-1px);
        }

        .ciq-generate-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .ciq-generate-btn:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes bounce {
          0%,80%,100% {
            transform: scale(.8);
            opacity: .5;
          }

          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @media(max-width:960px) {
          .ciq-studio-layout {
            grid-template-columns:1fr!important;
          }

          .ciq-result-grid {
            grid-template-columns:1fr!important;
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
        <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
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
                  color: mode === item ? (dark ? "#0f172a" : "#fff") : css.muted,
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
                      border: `1px solid ${contentType === item ? css.accent : css.border}`,
                      background: contentType === item ? `${css.accent}20` : "transparent",
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

          <MediaPicker media={media} setMedia={setMedia} css={css} />

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
                    ? "Wklej tutaj treść posta, artykułu lub skryptu..."
                    : "Wklej tutaj oryginalną treść do adaptacji..."
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
            ) : mode === "generate" ? (
              "✦ Generuj content"
            ) : mode === "analyze" ? (
              "◉ Analizuj treść"
            ) : (
              "⊞ Adaptuj na platformy"
            )}
          </button>

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

        <div>
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
                Wybierz tryb, platformę i wklej temat lub treść. Możesz też
                dodać zdjęcie albo video do pełnego posta.
              </div>
            </div>
          )}

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

              <div
                className="ciq-result-grid"
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
              >
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
                    `${generated.title ? `${generated.title}\n\n` : ""}${
                      generated.hook
                    }\n\n${generated.body}\n\n${generated.cta}\n\n${safeArray(
                      generated.hashtags
                    ).join(" ")}`,
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

              <div style={{ borderTop: `1px solid ${css.border}`, paddingTop: 14 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: css.muted,
                    marginBottom: 10,
                  }}
                >
                  Co chcesz zrobić z tym contentem?
                </div>

                <ContentActions
                  generated={generated}
                  platform={platform}
                  prompt={prompt}
                  contentType={contentType}
                  workspaceId={workspaceId}
                  css={css}
                  media={media}
                />
              </div>

              <RawAnswerPanel rawAnswer={rawAnswer} />
            </div>
          )}

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
                  <div style={{ fontSize: 11, color: css.muted }}>Ogólny AI Score</div>
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
                <ScoreBar label="Dopasowanie do platformy" value={analysis.platform_fit} />
                <ScoreBar
                  label="Potencjał zaangażowania"
                  value={analysis.engagement_potential}
                />
              </div>

              <div
                className="ciq-result-grid"
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
              >
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
  css: Record<string, string>;
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

      <div style={{ fontSize: 12, color: css.muted, maxWidth: 260, lineHeight: 1.55 }}>
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
  css: Record<string, string>;
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
        <SectionLabel color={css.accent}>{label}</SectionLabel>

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
  css: Record<string, string>;
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
      <p style={{ fontSize: 12, color: css.text, lineHeight: 1.55, margin: 0 }}>
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
  css: Record<string, string>;
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
          <p style={{ fontSize: 12, color: css.text, margin: 0 }}>Brak danych.</p>
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


