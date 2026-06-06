"use client";



import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";

type StudioFlow = "social" | "hooks" | "blog" | "article";
type AiProvider = "deepseek" | "gemini";

type Platform =
  | "linkedin"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "blog"
  | "spotify";

type MediaStatus = "local" | "uploaded";

interface GeneratedPost {
  title: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  estimated_score: number;
  platform_notes: string;
  recommended_comment?: string;
  format?: string;
}

interface HookIdea {
  text: string;
  type: string;
  score: number;
  best_for: string;
  note: string;
}

interface ContentVariant {
  platform: Platform;
  title: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  format: string;
  score: number;
  notes: string;
  recommended_comment?: string;
}

interface StudioResult {
  title: string;
  strategic_note: string;
  source_summary?: string;
  primary?: GeneratedPost;
  hooks?: HookIdea[];
  variants?: ContentVariant[];
  article_html?: string;
  article_outline?: string[];
  blog_cta_blocks?: string[];
  content_plan?: {
    platform: Platform;
    idea: string;
    format: string;
    angle: string;
    cta: string;
  }[];
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
  answer?: string;
  data?: unknown;
  error?: string;
  details?: string;
  parseError?: string;
};

const STORAGE_BUCKET = "content-temp-media";

const PLATFORMS: { id: Platform; name: string; color: string; icon: string }[] = [
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2", icon: "LI" },
  { id: "instagram", name: "Instagram", color: "#E1306C", icon: "IG" },
  { id: "tiktok", name: "TikTok", color: "#FFFFFF", icon: "TT" },
  { id: "youtube", name: "YouTube", color: "#FF0033", icon: "YT" },
  { id: "facebook", name: "Facebook", color: "#1877F2", icon: "FB" },
  { id: "blog", name: "Blog", color: "#22C55E", icon: "BL" },
  { id: "spotify", name: "Spotify", color: "#1DB954", icon: "SP" },
];

const FLOW_CARDS: {
  id: StudioFlow;
  title: string;
  label: string;
  description: string;
  hint: string;
}[] = [
  {
    id: "social",
    title: "Post social media",
    label: "Tworzenie postów",
    description: "Stwórz gotowy post pod wybraną platformę: hook, treść, CTA, hashtagi i notatkę publikacyjną.",
    hint: "Najlepsze do codziennych publikacji, kampanii, promocji aplikacji i edukacyjnych postów.",
  },
  {
    id: "hooks",
    title: "Hooki i otwarcia",
    label: "Testowanie uwagi",
    description: "Wygeneruj zestaw mocnych hooków do posta, rolki, shorta, karuzeli lub artykułu.",
    hint: "Dobre, gdy masz temat, ale nie masz pierwszego zdania, które zatrzyma odbiorcę.",
  },
  {
    id: "blog",
    title: "Content z bloga",
    label: "Blog → social",
    description: "Pobierz lub wklej artykuł blogowy i zrób z niego posty na LinkedIn, Facebook, Instagram, TikTok i YouTube.",
    hint: "Idealne do Twojego procesu: najpierw blog z CTA, potem dystrybucja na social media z linkiem w komentarzu.",
  },
  {
    id: "article",
    title: "Artykuł / wpis blogowy",
    label: "Dłuższa treść",
    description: "Przygotuj strukturę artykułu, lead, śródtytuły, CTA i HTML do dalszej obróbki poza aplikacją.",
    hint: "Aplikacja nie musi publikować bloga — może przygotować treść i bloki CTA do ręcznego użycia.",
  },
];

const CONTENT_FORMATS = [
  "Post ekspercki",
  "Post sprzedażowy miękki",
  "Case study",
  "Lista / poradnik",
  "Storytelling",
  "Karuzela",
  "Reels / Shorts script",
  "Komentarz do trendu",
  "Artykuł blogowy",
  "Newsletter",
];

const BLOG_REPURPOSE_PLATFORMS: Platform[] = [
  "linkedin",
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
];

function getPlatformInfo(platform: string) {
  return PLATFORMS.find((item) => item.id === platform);
}

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

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

function fullPostText(post: GeneratedPost | ContentVariant) {
  return [
    post.title ? `${post.title}` : "",
    post.hook,
    post.body,
    post.cta,
    safeArray(post.hashtags).join(" "),
    post.recommended_comment ? `\nKomentarz / link:\n${post.recommended_comment}` : "",
  ]
    .filter((part) => String(part || "").trim().length > 0)
    .join("\n\n");
}

function normalizeStudioResult(raw: Partial<StudioResult>): StudioResult {
  const variants = safeArray(raw.variants).map((item) => ({
    platform: item.platform,
    title: item.title || "",
    hook: item.hook || "",
    body: item.body || "",
    cta: item.cta || "",
    hashtags: safeArray(item.hashtags),
    format: item.format || "post",
    score: Number(item.score || 0),
    notes: item.notes || "",
    recommended_comment: item.recommended_comment || "",
  }));

  const hooks = safeArray(raw.hooks).map((item) => ({
    text: item.text || "",
    type: item.type || "hook",
    score: Number(item.score || 0),
    best_for: item.best_for || "",
    note: item.note || "",
  }));

  return {
    title: raw.title || "Content Studio",
    strategic_note: raw.strategic_note || "",
    source_summary: raw.source_summary || "",
    primary: raw.primary
      ? {
          title: raw.primary.title || raw.title || "",
          hook: raw.primary.hook || "",
          body: raw.primary.body || "",
          cta: raw.primary.cta || "",
          hashtags: safeArray(raw.primary.hashtags),
          estimated_score: Number(raw.primary.estimated_score || 0),
          platform_notes: raw.primary.platform_notes || "",
          recommended_comment: raw.primary.recommended_comment || "",
          format: raw.primary.format || "",
        }
      : undefined,
    hooks,
    variants,
    article_html: raw.article_html || "",
    article_outline: safeArray(raw.article_outline),
    blog_cta_blocks: safeArray(raw.blog_cta_blocks),
    content_plan: safeArray(raw.content_plan).map((item) => ({
      platform: item.platform,
      idea: item.idea || "",
      format: item.format || "",
      angle: item.angle || "",
      cta: item.cta || "",
    })),
  };
}

function buildStudioPrompt({
  flow,
  platform,
  selectedPlatforms,
  contentFormat,
  userPrompt,
  blogUrl,
  blogText,
  brandContext,
}: {
  flow: StudioFlow;
  platform: Platform;
  selectedPlatforms: Platform[];
  contentFormat: string;
  userPrompt: string;
  blogUrl: string;
  blogText: string;
  brandContext: string;
}) {
  const platformName = getPlatformInfo(platform)?.name || platform;
  const selectedNames = selectedPlatforms.map((id) => getPlatformInfo(id)?.name || id).join(", ");

  const commonRules = `
Jesteś AI Content Strategiem w ANM ContentIQ.

Najważniejsze:
- Tworzysz treści do social mediów i bloga.
- Nie pisz ogólników.
- Dopasuj styl do platformy.
- Nie używaj identycznego CTA na każdej platformie.
- Jeśli tworzysz z bloga, link do bloga sugeruj jako komentarz albo dopisek, nie wciskaj go agresywnie w środek posta.
- Pisz po polsku.
- Zwróć wyłącznie JSON bez markdown.
- Nie wymyślaj wyników analitycznych. Jeśli brakuje danych, wpisz to w notes / strategic_note.

Kontekst marki / użytkownika:
${brandContext || "Brak dodatkowego kontekstu marki."}

Sugestia użytkownika:
${userPrompt || "Brak."}
`.trim();

  if (flow === "social") {
    return `
${commonRules}

Zadanie:
Stwórz gotowy post social media.

Platforma:
${platformName}

Format:
${contentFormat}

Wymagania:
- mocny hook,
- główna treść posta,
- CTA dopasowane do platformy,
- hashtagi,
- krótka notatka, dlaczego ta wersja pasuje do platformy,
- jeżeli platforma to TikTok/YouTube, przygotuj tekst jako opis/scenariusz shorta,
- jeżeli LinkedIn, użyj bardziej eksperckiego tonu,
- jeżeli Instagram, zadbaj o zapis/udostępnienie i wizualny kontekst.

JSON:
{
  "title": "tytuł roboczy",
  "strategic_note": "krótka rekomendacja strategiczna",
  "primary": {
    "title": "tytuł",
    "hook": "hook",
    "body": "treść posta",
    "cta": "CTA",
    "hashtags": ["#..."],
    "estimated_score": 0,
    "platform_notes": "dlaczego działa na tej platformie",
    "recommended_comment": "opcjonalny komentarz z linkiem lub dopowiedzeniem",
    "format": "${contentFormat}"
  },
  "content_plan": []
}
`.trim();
  }

  if (flow === "hooks") {
    return `
${commonRules}

Zadanie:
Wygeneruj zestaw hooków i otwarć do contentu.

Platforma główna:
${platformName}

Format:
${contentFormat}

Wymagania:
- wygeneruj minimum 12 hooków,
- różne typy: problemowy, liczbowy, pytanie, błąd, kontrast, storytelling, case, kontrowersyjny, obietnica,
- oceń każdy hook 0-100,
- wyjaśnij, do jakiej platformy i formatu pasuje.

JSON:
{
  "title": "zestaw hooków",
  "strategic_note": "jaki kierunek hooków wybrać",
  "hooks": [
    {
      "text": "hook",
      "type": "problemowy",
      "score": 0,
      "best_for": "LinkedIn / TikTok / Instagram / ...",
      "note": "dlaczego może zadziałać"
    }
  ]
}
`.trim();
  }

  if (flow === "blog") {
    return `
${commonRules}

Zadanie:
Zrób dystrybucję treści blogowej na social media.

Link do bloga:
${blogUrl || "brak linku"}

Treść / notatki z bloga:
${blogText || "Brak treści bloga. Jeśli link był podany, korzystaj z opisu użytkownika i wpisz w strategic_note, że nie pobrano pełnej treści."}

Platformy docelowe:
${selectedNames}

Wymagania:
- potraktuj blog jako źródło główne,
- przygotuj osobne wersje na wybrane platformy,
- nie kopiuj 1:1 tego samego tekstu,
- LinkedIn: ekspercki wniosek + link w komentarzu,
- Facebook: prościej, rozmownie, zachęta do kliknięcia,
- Instagram: krótko, wizualnie, zapis/udostępnienie,
- TikTok: pomysł na krótkie video, hook i opis,
- YouTube: Shorts albo opis filmu z kierowaniem do pełnej wersji,
- w recommended_comment zaproponuj komentarz z linkiem do bloga,
- dodaj 3-6 pomysłów na dalsze treści wokół tego artykułu.

JSON:
{
  "title": "kampania wokół artykułu blogowego",
  "source_summary": "krótkie streszczenie bloga",
  "strategic_note": "jak dystrybuować ten blog i dlaczego",
  "variants": [
    {
      "platform": "linkedin",
      "title": "tytuł wariantu",
      "hook": "hook",
      "body": "treść posta",
      "cta": "CTA",
      "hashtags": ["#..."],
      "format": "post / rolka / short / karuzela",
      "score": 0,
      "notes": "dlaczego ta wersja pasuje",
      "recommended_comment": "np. Link do artykułu w komentarzu: ${blogUrl || "[tu wstaw link]"}"
    }
  ],
  "content_plan": [
    {
      "platform": "linkedin",
      "idea": "pomysł",
      "format": "format",
      "angle": "kąt",
      "cta": "CTA"
    }
  ]
}
`.trim();
  }

  return `
${commonRules}

Zadanie:
Przygotuj artykuł / wpis blogowy jako materiał źródłowy do dalszej dystrybucji.

Format:
${contentFormat}

Wymagania:
- przygotuj outline,
- przygotuj tytuł, lead i treść artykułu,
- dodaj miejsca na CTA do aplikacji/produktu,
- przygotuj przykładowe bloki CTA jako HTML,
- artykuł ma być możliwy do ręcznego wklejenia do bloga,
- nie publikuj automatycznie,
- dodaj plan, jak później przerobić artykuł na social media.

JSON:
{
  "title": "tytuł artykułu",
  "strategic_note": "po co ten artykuł i jak użyć go w dystrybucji",
  "article_outline": ["H2 / punkt", "H2 / punkt"],
  "article_html": "<article>...</article>",
  "blog_cta_blocks": ["<a ...>CTA</a>"],
  "content_plan": [
    {
      "platform": "linkedin",
      "idea": "pomysł na post z artykułu",
      "format": "post",
      "angle": "kąt",
      "cta": "CTA"
    }
  ]
}
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
        letterSpacing: "0.11em",
        color,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function FlowCard({
  active,
  title,
  label,
  description,
  hint,
  onClick,
  css,
}: {
  active: boolean;
  title: string;
  label: string;
  description: string;
  hint: string;
  onClick: () => void;
  css: Record<string, string>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: 15,
        borderRadius: 18,
        background: css.surface,
        border: `1px solid ${active ? css.accentBorder : css.border}`,
        boxShadow: active ? `0 0 0 1px ${css.accentBorder}, 0 16px 34px rgba(0,0,0,0.22)` : "none",
        color: css.text,
        cursor: "pointer",
        fontFamily: "inherit",
        minHeight: 162,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {active && (
        <div
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: -18,
            height: 34,
            background: css.accentSoft,
            filter: "blur(20px)",
          }}
        />
      )}

      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionLabel color={css.accent}>{label}</SectionLabel>
        <div
          style={{
            fontFamily: "var(--font-heading)",
            color: css.heading,
            fontSize: 24,
            lineHeight: 1.05,
            fontWeight: 500,
            marginBottom: 9,
          }}
        >
          {title}
        </div>
        <p style={{ margin: 0, color: css.text, fontSize: 12, lineHeight: 1.55 }}>
          {description}
        </p>
        <p style={{ margin: "9px 0 0", color: css.muted, fontSize: 11, lineHeight: 1.55 }}>
          {hint}
        </p>
      </div>
    </button>
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
      <SectionLabel color={css.muted}>Media do contentu</SectionLabel>

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
          borderRadius: 16,
          padding: 15,
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

        <div style={{ fontSize: 13, fontWeight: 900, color: css.text }}>
          Dodaj zdjęcie, grafikę albo video
        </div>

        <div style={{ fontSize: 11, color: css.muted, marginTop: 5, lineHeight: 1.6 }}>
          Media zapiszą się razem z szablonem, inspiracją albo harmonogramem.
        </div>
      </div>

      {media.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: 116,
                  background: css.bg,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {item.assetType === "image" && (
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}

                {item.assetType === "video" && (
                  <video
                    src={item.previewUrl}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    muted
                    controls
                  />
                )}

                {!["image", "video"].includes(item.assetType) && (
                  <span style={{ color: css.muted, fontSize: 12 }}>{item.assetType}</span>
                )}
              </div>

              <div style={{ padding: 9 }}>
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
                    borderRadius: 9,
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
  const [time, setTime] = useState("15:00");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.62)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <div
        style={{
          background: css.surface,
          border: `1px solid ${css.border}`,
          borderRadius: 22,
          padding: 24,
          width: 390,
          maxWidth: "100%",
          fontFamily: "var(--font-body)",
        }}
      >
        <h3 style={{ margin: "0 0 6px", color: css.heading, fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 500 }}>
          Zaplanuj publikację
        </h3>

        <div style={{ fontSize: 12, color: css.muted, marginBottom: 18 }}>
          Platforma:{" "}
          <span style={{ color: getPlatformInfo(platform)?.color }}>
            {getPlatformInfo(platform)?.name}
          </span>
        </div>

        <div style={{ marginBottom: 13 }}>
          <SectionLabel color={css.muted}>Data</SectionLabel>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: `1px solid ${css.border}`,
              background: css.bg,
              color: css.text,
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <SectionLabel color={css.muted}>Godzina</SectionLabel>
          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
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
              padding: "11px",
              borderRadius: 12,
              border: "none",
              background: getPlatformInfo(platform)?.color || css.accent,
              color: "#fff",
              fontSize: 12,
              fontWeight: 900,
              cursor: "pointer",
              fontFamily: "inherit",
              opacity: !date ? 0.5 : 1,
            }}
          >
            Zaplanuj
          </button>
        </div>
      </div>
    </div>
  );
}

function ContentActions({
  item,
  platform,
  prompt,
  contentType,
  workspaceId,
  css,
  media,
}: {
  item: GeneratedPost | ContentVariant;
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
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const score = "estimated_score" in item ? item.estimated_score : item.score;
  const notes = "platform_notes" in item ? item.platform_notes : item.notes;
  const fullContent = fullPostText(item);
  const pColor = getPlatformInfo(platform)?.color || css.accent;

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

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

    for (const mediaItem of media) {
      const fileName = safeFileName(mediaItem.name || "media");
      const path = `${wsId}/${draftId}/${Date.now()}-${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, mediaItem.file, {
          contentType: mediaItem.mimeType,
          upsert: false,
        });

      if (uploadError) throw new Error(uploadError.message);

      const record: UploadedMediaItem = {
        kind: uploaded.length === 0 ? "cover" : "attachment",
        storage_bucket: STORAGE_BUCKET,
        storage_path: path,
        file_name: mediaItem.name,
        mime_type: mediaItem.mimeType,
        file_size: mediaItem.size,
        asset_type: mediaItem.assetType,
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
          file_name: mediaItem.name,
          mime_type: mediaItem.mimeType,
          file_size: mediaItem.size,
          asset_type: mediaItem.assetType,
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

  async function saveInspiration() {
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
          title: item.title || prompt.slice(0, 80) || "Inspiracja contentowa",
          description: item.hook || prompt,
          body: fullContent,
          platforms: [platform],
          hashtags: safeArray(item.hashtags),
          ai_score: score,
          ai_feedback: notes,
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

  async function saveTemplate(status: "template" | "scheduled" = "template", scheduledAt?: string) {
    const wsId = await getOrCreateWorkspaceUuid();
    if (!wsId) throw new Error("Brak przestrzeni aplikacji.");

    const { data: draft, error } = await supabase
      .schema("contentiq")
      .from("content_drafts")
      .insert({
        workspace_id: wsId,
        title: item.title || prompt.slice(0, 80) || "Szablon contentowy",
        body: fullContent,
        topic: prompt,
        content_type: contentType,
        target_platforms: [platform],
        ai_score: score,
        ai_feedback: notes,
        status,
        media: [],
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await uploadMediaForDraft({
      wsId,
      draftId: draft.id,
      scheduledAt,
      status: status === "scheduled" ? "scheduled" : "temporary",
    });

    return { wsId, draftId: draft.id };
  }

  async function saveAsTemplate() {
    setSavingTemplate(true);

    try {
      await saveTemplate("template");
      showToast("✓ Zapisano jako szablon", "ok");
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
      const { wsId, draftId } = await saveTemplate("scheduled", scheduledAt);

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
          draft_id: draftId,
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
        .eq("draft_id", draftId);

      showToast(`✓ Zaplanowano na ${new Date(scheduledAt).toLocaleString("pl-PL")}`, "ok");
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
            borderRadius: 12,
            background: toast.type === "ok" ? "#052e16" : "#450a0a",
            color: toast.type === "ok" ? "#22c55e" : "#ef4444",
            fontSize: 13,
            border: `1px solid ${toast.type === "ok" ? "#166534" : "#991b1b"}`,
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            fontFamily: "var(--font-body)",
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
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 8,
          marginTop: 8,
        }}
      >
        <button type="button" onClick={saveAsTemplate} disabled={savingTemplate} style={actionButton(css, false)}>
          {savingTemplate ? "Zapisuję..." : "Szablon"}
        </button>

        <button type="button" onClick={saveInspiration} disabled={saving} style={actionButton(css, false)}>
          {saving ? "Zapisuję..." : "Inspiracja"}
        </button>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          disabled={scheduling}
          style={{
            ...actionButton(css, true),
            border: `1px solid ${pColor}`,
            background: `${pColor}17`,
            color: pColor,
          }}
        >
          {scheduling ? "Planowanie..." : "Zaplanuj"}
        </button>

        <button
          type="button"
          onClick={publishNow}
          disabled={publishing}
          style={{
            ...actionButton(css, true),
            border: "none",
            background: pColor,
            color: "#fff",
          }}
        >
          {publishing ? "Wysyłam..." : "Publikuj"}
        </button>
      </div>
    </>
  );
}

function actionButton(css: Record<string, string>, strong: boolean): CSSProperties {
  return {
    padding: "10px 8px",
    borderRadius: 12,
    border: `1px solid ${css.border}`,
    background: strong ? css.accentSoft : css.surface,
    color: strong ? css.accent : css.muted,
    fontSize: 11,
    fontWeight: 900,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

function ResultPanel({
  result,
  flow,
  platform,
  selectedPlatforms,
  prompt,
  contentType,
  workspaceId,
  css,
  media,
}: {
  result: StudioResult;
  flow: StudioFlow;
  platform: Platform;
  selectedPlatforms: Platform[];
  prompt: string;
  contentType: string;
  workspaceId: string;
  css: Record<string, string>;
  media: LocalMediaItem[];
}) {
  const [copied, setCopied] = useState("");

  async function copy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(""), 1600);
  }

  const primary = result.primary;
  const variants = safeArray(result.variants);
  const hooks = safeArray(result.hooks);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          background: css.surface,
          border: `1px solid ${css.border}`,
          borderRadius: 20,
          padding: 16,
        }}
      >
        <SectionLabel color={css.accent}>Wynik Content Studio</SectionLabel>
        <h3
          style={{
            margin: "0 0 8px",
            color: css.heading,
            fontFamily: "var(--font-heading)",
            fontSize: 28,
            lineHeight: 1.05,
            fontWeight: 500,
          }}
        >
          {result.title}
        </h3>
        <p style={{ margin: 0, color: css.muted, fontSize: 13, lineHeight: 1.7 }}>
          {result.strategic_note || "AI przygotowało propozycję contentu."}
        </p>
        {result.source_summary && (
          <p style={{ margin: "10px 0 0", color: css.text, fontSize: 12, lineHeight: 1.7 }}>
            <strong>Źródło:</strong> {result.source_summary}
          </p>
        )}
      </div>

      {primary && (
        <PostCard
          item={primary}
          platform={platform}
          css={css}
          copied={copied}
          onCopy={copy}
          actions={
            <ContentActions
              item={primary}
              platform={platform}
              prompt={prompt}
              contentType={contentType}
              workspaceId={workspaceId}
              css={css}
              media={media}
            />
          }
        />
      )}

      {hooks.length > 0 && (
        <div
          style={{
            background: css.surface,
            border: `1px solid ${css.border}`,
            borderRadius: 20,
            padding: 16,
          }}
        >
          <SectionLabel color={css.accent}>Hooki do testu</SectionLabel>
          <div style={{ display: "grid", gap: 9 }}>
            {hooks.map((hook, index) => (
              <div
                key={`${hook.text}-${index}`}
                style={{
                  border: `1px solid ${css.border}`,
                  background: css.liveSoft,
                  borderRadius: 15,
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ color: css.text, fontSize: 14, fontWeight: 900, lineHeight: 1.45 }}>
                    “{hook.text}”
                  </div>
                  <div style={{ color: getScoreColor(hook.score), fontWeight: 900 }}>{hook.score}</div>
                </div>
                <div style={{ marginTop: 7, color: css.muted, fontSize: 11, lineHeight: 1.55 }}>
                  {hook.type} · {hook.best_for} · {hook.note}
                </div>
                <button
                  type="button"
                  onClick={() => copy(hook.text, `hook-${index}`)}
                  style={{
                    marginTop: 8,
                    border: "none",
                    background: "transparent",
                    color: css.accent,
                    fontSize: 11,
                    fontWeight: 900,
                    cursor: "pointer",
                    padding: 0,
                    fontFamily: "inherit",
                  }}
                >
                  {copied === `hook-${index}` ? "Skopiowano" : "Kopiuj hook"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {variants.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {variants.map((variant, index) => (
            <PostCard
              key={`${variant.platform}-${index}`}
              item={variant}
              platform={variant.platform}
              css={css}
              copied={copied}
              onCopy={copy}
              actions={
                <ContentActions
                  item={variant}
                  platform={variant.platform}
                  prompt={prompt}
                  contentType={variant.format || contentType}
                  workspaceId={workspaceId}
                  css={css}
                  media={media}
                />
              }
            />
          ))}
        </div>
      )}

      {result.article_outline && result.article_outline.length > 0 && (
        <div style={resultBox(css)}>
          <SectionLabel color={css.accent}>Konspekt artykułu</SectionLabel>
          <ol style={{ margin: 0, paddingLeft: 18, color: css.text, fontSize: 12, lineHeight: 1.75 }}>
            {result.article_outline.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ol>
        </div>
      )}

      {result.article_html && (
        <div style={resultBox(css)}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <SectionLabel color={css.accent}>HTML artykułu</SectionLabel>
            <button
              type="button"
              onClick={() => copy(result.article_html || "", "article-html")}
              style={{
                border: "none",
                background: "transparent",
                color: css.accent,
                fontSize: 11,
                fontWeight: 900,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {copied === "article-html" ? "Skopiowano" : "Kopiuj HTML"}
            </button>
          </div>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              color: css.muted,
              fontSize: 11,
              lineHeight: 1.65,
              margin: 0,
              maxHeight: 420,
              overflow: "auto",
            }}
          >
            {result.article_html}
          </pre>
        </div>
      )}

      {safeArray(result.blog_cta_blocks).length > 0 && (
        <div style={resultBox(css)}>
          <SectionLabel color={css.accent}>Bloki CTA do bloga</SectionLabel>
          <div style={{ display: "grid", gap: 8 }}>
            {safeArray(result.blog_cta_blocks).map((item, index) => (
              <div
                key={`${item}-${index}`}
                style={{
                  border: `1px solid ${css.border}`,
                  background: css.liveSoft,
                  borderRadius: 14,
                  padding: 11,
                  color: css.text,
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {safeArray(result.content_plan).length > 0 && (
        <div style={resultBox(css)}>
          <SectionLabel color={css.accent}>Co zrobić dalej z tym contentem?</SectionLabel>
          <div style={{ display: "grid", gap: 8 }}>
            {safeArray(result.content_plan).map((item, index) => {
              const info = getPlatformInfo(item.platform);
              return (
                <div
                  key={`${item.platform}-${index}`}
                  style={{
                    border: `1px solid ${css.border}`,
                    background: css.liveSoft,
                    borderRadius: 14,
                    padding: 12,
                  }}
                >
                  <div style={{ color: info?.color || css.accent, fontWeight: 900, fontSize: 12 }}>
                    {info?.name || item.platform} · {item.format}
                  </div>
                  <div style={{ color: css.text, fontSize: 13, fontWeight: 900, marginTop: 5 }}>
                    {item.idea}
                  </div>
                  <div style={{ color: css.muted, fontSize: 11, lineHeight: 1.6, marginTop: 5 }}>
                    Kąt: {item.angle} · CTA: {item.cta}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function resultBox(css: Record<string, string>): CSSProperties {
  return {
    background: css.surface,
    border: `1px solid ${css.border}`,
    borderRadius: 20,
    padding: 16,
  };
}

function PostCard({
  item,
  platform,
  css,
  copied,
  onCopy,
  actions,
}: {
  item: GeneratedPost | ContentVariant;
  platform: Platform;
  css: Record<string, string>;
  copied: string;
  onCopy: (text: string, id: string) => void;
  actions: React.ReactNode;
}) {
  const info = getPlatformInfo(platform);
  const score = "estimated_score" in item ? item.estimated_score : item.score;
  const notes = "platform_notes" in item ? item.platform_notes : item.notes;

  return (
    <div
      style={{
        background: css.surface,
        border: `1px solid ${css.border}`,
        borderTop: `4px solid ${info?.color || css.accent}`,
        borderRadius: 20,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <SectionLabel color={info?.color || css.accent}>{info?.name || platform}</SectionLabel>
          <h3
            style={{
              margin: 0,
              color: css.heading,
              fontFamily: "var(--font-heading)",
              fontSize: 25,
              lineHeight: 1.08,
              fontWeight: 500,
            }}
          >
            {item.title || "Wariant contentu"}
          </h3>
        </div>

        <div style={{ color: getScoreColor(score), fontSize: 28, fontWeight: 900, fontFamily: "var(--font-heading)" }}>
          {score || 0}
        </div>
      </div>

      {item.hook && (
        <div
          style={{
            marginTop: 13,
            background: css.aiBg,
            border: `1px solid ${css.aiBorder}`,
            boxShadow: css.aiGlow,
            borderRadius: 16,
            padding: 13,
          }}
        >
          <SectionLabel color={css.aiText}>Hook</SectionLabel>
          <p style={{ margin: 0, color: css.text, fontSize: 15, fontWeight: 900, lineHeight: 1.45 }}>
            “{item.hook}”
          </p>
        </div>
      )}

      <div style={{ marginTop: 11, color: css.text, fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
        {item.body}
      </div>

      {item.cta && (
        <div style={{ marginTop: 11, color: css.accent, fontSize: 13, fontWeight: 900 }}>
          CTA: {item.cta}
        </div>
      )}

      {item.recommended_comment && (
        <div
          style={{
            marginTop: 11,
            border: `1px dashed ${css.border}`,
            background: css.liveSoft,
            borderRadius: 14,
            padding: 11,
            color: css.muted,
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: css.text }}>Komentarz / link:</strong> {item.recommended_comment}
        </div>
      )}

      {safeArray(item.hashtags).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 12 }}>
          {safeArray(item.hashtags).map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              style={{
                background: `${info?.color || css.accent}18`,
                color: info?.color || css.accent,
                borderRadius: 999,
                padding: "4px 8px",
                fontSize: 10,
                fontWeight: 900,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {notes && (
        <p style={{ margin: "12px 0 0", color: css.muted, fontSize: 11, lineHeight: 1.65 }}>
          {notes}
        </p>
      )}

      <button
        type="button"
        onClick={() => onCopy(fullPostText(item), `copy-${platform}-${item.title}`)}
        style={{
          width: "100%",
          marginTop: 12,
          border: `1px solid ${css.border}`,
          background: "transparent",
          color: css.muted,
          borderRadius: 12,
          padding: "10px 12px",
          fontSize: 11,
          fontWeight: 900,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {copied === `copy-${platform}-${item.title}` ? "Skopiowano" : "Kopiuj treść"}
      </button>

      <div style={{ marginTop: 10 }}>{actions}</div>
    </div>
  );
}

export default function ContentStudio({
  dark = true,
  workspaceId = "contentiq",
}: {
  dark?: boolean;
  workspaceId?: string;
}) {
  const [flow, setFlow] = useState<StudioFlow>("social");
  const [aiProvider, setAiProvider] = useState<AiProvider>("deepseek");
  const [platform, setPlatform] = useState<Platform>("linkedin");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(BLOG_REPURPOSE_PLATFORMS);
  const [contentFormat, setContentFormat] = useState(CONTENT_FORMATS[0]);
  const [prompt, setPrompt] = useState("");
  const [brandContext, setBrandContext] = useState("");
  const [blogUrl, setBlogUrl] = useState("");
  const [blogText, setBlogText] = useState("");
  const [media, setMedia] = useState<LocalMediaItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [result, setResult] = useState<StudioResult | null>(null);
  const [rawAnswer, setRawAnswer] = useState("");
  const [error, setError] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const css: Record<string, string> = dark
    ? {
        bg: "#1A2233",
        surface: "#050505",
        surfaceSoft: "#0B0B0D",
        text: "#FFFFFF",
        muted: "#C9CED8",
        border: "rgba(255,255,255,0.10)",
        accent: "#8E443D",
        accentSoft: "rgba(142, 68, 61, 0.18)",
        accentBorder: "rgba(142, 68, 61, 0.55)",
        heading: "#8E443D",
        aiBg: "rgba(109, 40, 217, 0.16)",
        aiBgSoft: "rgba(147, 51, 234, 0.12)",
        aiBorder: "rgba(192, 132, 252, 0.55)",
        aiText: "#D8B4FE",
        aiGlow: "0 0 28px rgba(168, 85, 247, 0.24)",
        liveSoft: "rgba(255,255,255,0.045)",
      }
    : {
        bg: "#FFFFFF",
        surface: "#B5937A",
        surfaceSoft: "#F7F2EF",
        text: "#2B2B2B",
        muted: "#5F5A57",
        border: "rgba(35,31,32,0.14)",
        accent: "#231F20",
        accentSoft: "rgba(181, 147, 122, 0.22)",
        accentBorder: "rgba(35,31,32,0.24)",
        heading: "#231F20",
        aiBg: "rgba(124, 58, 237, 0.10)",
        aiBgSoft: "rgba(245, 243, 255, 0.95)",
        aiBorder: "rgba(124, 58, 237, 0.34)",
        aiText: "#6D28D9",
        aiGlow: "0 0 26px rgba(124, 58, 237, 0.16)",
        liveSoft: "rgba(255,255,255,0.55)",
      };

  const rootStyle = {
    fontFamily: "var(--font-body)",
    color: css.text,
  } as CSSProperties;

  const activeFlow = FLOW_CARDS.find((item) => item.id === flow) || FLOW_CARDS[0];

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

  const canGenerate = useMemo(() => {
    if (flow === "blog") return Boolean(blogText.trim() || blogUrl.trim() || prompt.trim());
    return Boolean(prompt.trim());
  }, [flow, prompt, blogText, blogUrl]);

  function resetResult() {
    setResult(null);
    setRawAnswer("");
    setError("");
  }

  function toggleSelectedPlatform(platformId: Platform) {
    setSelectedPlatforms((prev) => {
      if (prev.includes(platformId)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== platformId);
      }
      return [...prev, platformId];
    });
  }

  async function scrapeBlogUrl() {
    if (!blogUrl.trim()) {
      setError("Wklej link do wpisu blogowego.");
      return;
    }

    setScraping(true);
    setError("");

    try {
      const res = await fetch("/api/brand/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: blogUrl.trim() }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.error) {
        throw new Error(data?.error || "Nie udało się pobrać treści bloga.");
      }

      const sourceNotes = data.source_notes || data.text || data.summary || "";
      setBlogText(sourceNotes);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setScraping(false);
    }
  }

  async function handleGenerate() {
    if (!canGenerate || loading) return;

    setLoading(true);
    resetResult();

    try {
      const studioPrompt = buildStudioPrompt({
        flow,
        platform,
        selectedPlatforms,
        contentFormat,
        userPrompt: prompt,
        blogUrl,
        blogText,
        brandContext,
      });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          provider: aiProvider,
          ai_provider: aiProvider,
          prompt: studioPrompt,
          historicalData: {
            flow,
            platform,
            selectedPlatforms,
            contentFormat,
            blogUrl,
            hasMedia: media.length > 0,
            media: media.map((item) => ({
              name: item.name,
              type: item.assetType,
              mimeType: item.mimeType,
              size: item.size,
            })),
          },
        }),
      });

      const json = (await res.json().catch(() => null)) as ApiResponse | null;

      if (!res.ok || json?.error) {
        throw new Error(json?.details || json?.error || "Błąd API.");
      }

      const answer = json?.answer || "";
      setRawAnswer(answer);

      let parsed: StudioResult | null = null;

      try {
        parsed = normalizeStudioResult(JSON.parse(cleanJsonAnswer(answer)) as Partial<StudioResult>);
      } catch {
        throw new Error("AI nie zwróciło poprawnego JSON. Spróbuj ponownie albo skróć brief.");
      }

      setResult(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={rootStyle}>
      <style>{`
        * { box-sizing: border-box; }
        textarea { resize: none; overflow: hidden; }
        .ciq-studio-grid { display:grid; grid-template-columns: 0.95fr 1.05fr; gap:18px; align-items:start; }
        .ciq-flow-grid { display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap:10px; }
        .ciq-two { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        button { transition: all .15s ease; }
        button:hover:not(:disabled) { opacity:.86; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media(max-width:1100px) {
          .ciq-studio-grid { grid-template-columns:1fr; }
          .ciq-flow-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media(max-width:680px) {
          .ciq-flow-grid, .ciq-two { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ display: "grid", gap: 18 }}>
        <div
          style={{
            background: css.surface,
            border: `1px solid ${css.border}`,
            borderRadius: 24,
            padding: 18,
          }}
        >
          <SectionLabel color={css.accent}>Content Studio</SectionLabel>
          <h2
            style={{
              margin: "0 0 8px",
              color: css.heading,
              fontFamily: "var(--font-heading)",
              fontSize: 34,
              lineHeight: 1.02,
              fontWeight: 500,
            }}
          >
            Twórz content z jasnego procesu, nie z jednego chaotycznego pola
          </h2>
          <p style={{ margin: 0, color: css.muted, fontSize: 13, lineHeight: 1.7, maxWidth: 980 }}>
            Wybierz, czy chcesz stworzyć post, przetestować hooki, przerobić blog na social media
            albo przygotować artykuł jako źródło kampanii. Wynik możesz zapisać jako inspirację,
            szablon, dodać do harmonogramu albo wysłać do kolejki publikacji.
          </p>
        </div>

        <div className="ciq-flow-grid">
          {FLOW_CARDS.map((card) => (
            <FlowCard
              key={card.id}
              active={flow === card.id}
              title={card.title}
              label={card.label}
              description={card.description}
              hint={card.hint}
              css={css}
              onClick={() => {
                setFlow(card.id);
                resetResult();
              }}
            />
          ))}
        </div>

        <div className="ciq-studio-grid">
          <div style={{ display: "grid", gap: 13 }}>
            <div
              style={{
                background: css.aiBg,
                border: `1px solid ${css.aiBorder}`,
                boxShadow: css.aiGlow,
                borderRadius: 20,
                padding: 15,
              }}
            >
              <SectionLabel color={css.aiText}>Aktywny tryb</SectionLabel>
              <h3
                style={{
                  margin: "0 0 7px",
                  color: css.heading,
                  fontFamily: "var(--font-heading)",
                  fontSize: 27,
                  lineHeight: 1.05,
                  fontWeight: 500,
                }}
              >
                {activeFlow.title}
              </h3>
              <p style={{ margin: 0, color: css.text, fontSize: 12, lineHeight: 1.65 }}>
                {activeFlow.description}
              </p>
            </div>

            <div className="ciq-two">
              <div>
                <SectionLabel color={css.muted}>Silnik AI</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {(["deepseek", "gemini"] as AiProvider[]).map((provider) => (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => setAiProvider(provider)}
                      style={{
                        borderRadius: 13,
                        border: `1px solid ${aiProvider === provider ? css.aiBorder : css.border}`,
                        background: aiProvider === provider ? css.aiBgSoft : css.surface,
                        color: aiProvider === provider ? css.aiText : css.muted,
                        padding: "10px 12px",
                        fontSize: 11,
                        fontWeight: 900,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        textTransform: "uppercase",
                      }}
                    >
                      {provider}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <SectionLabel color={css.muted}>Format</SectionLabel>
                <select
                  value={contentFormat}
                  onChange={(event) => setContentFormat(event.target.value)}
                  style={{
                    width: "100%",
                    borderRadius: 13,
                    border: `1px solid ${css.border}`,
                    background: css.surface,
                    color: css.text,
                    padding: "11px 12px",
                    fontFamily: "inherit",
                    fontSize: 12,
                    outline: "none",
                  }}
                >
                  {CONTENT_FORMATS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>

            {flow !== "blog" && (
              <div>
                <SectionLabel color={css.muted}>Platforma główna</SectionLabel>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {PLATFORMS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPlatform(item.id)}
                      style={{
                        padding: "7px 12px",
                        borderRadius: 11,
                        border: `1px solid ${platform === item.id ? item.color : css.border}`,
                        background: platform === item.id ? `${item.color}18` : css.surface,
                        color: platform === item.id ? item.color : css.muted,
                        fontSize: 11,
                        fontWeight: 900,
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

            {flow === "blog" && (
              <div>
                <SectionLabel color={css.muted}>Platformy dystrybucji bloga</SectionLabel>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {PLATFORMS.filter((item) => item.id !== "blog" && item.id !== "spotify").map((item) => {
                    const selected = selectedPlatforms.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleSelectedPlatform(item.id)}
                        style={{
                          padding: "7px 12px",
                          borderRadius: 11,
                          border: `1px solid ${selected ? item.color : css.border}`,
                          background: selected ? `${item.color}18` : css.surface,
                          color: selected ? item.color : css.muted,
                          fontSize: 11,
                          fontWeight: 900,
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

            {flow === "blog" && (
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <SectionLabel color={css.muted}>Link do wpisu blogowego</SectionLabel>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                    <input
                      value={blogUrl}
                      onChange={(event) => setBlogUrl(event.target.value)}
                      placeholder="https://twojastrona.pl/artykul"
                      style={inputStyle(css)}
                    />
                    <button
                      type="button"
                      onClick={scrapeBlogUrl}
                      disabled={scraping || !blogUrl.trim()}
                      style={{
                        borderRadius: 13,
                        border: `1px solid ${css.border}`,
                        background: css.surface,
                        color: css.text,
                        padding: "0 13px",
                        fontSize: 11,
                        fontWeight: 900,
                        cursor: scraping ? "not-allowed" : "pointer",
                        opacity: scraping || !blogUrl.trim() ? 0.55 : 1,
                        fontFamily: "inherit",
                      }}
                    >
                      {scraping ? "Pobieram..." : "Pobierz"}
                    </button>
                  </div>
                </div>

                <div>
                  <SectionLabel color={css.muted}>Treść / streszczenie bloga</SectionLabel>
                  <textarea
                    value={blogText}
                    onChange={(event) => setBlogText(event.target.value)}
                    placeholder="Wklej treść artykułu albo pobierz ją z linku. AI zrobi z niej posty na social media."
                    style={{ ...inputStyle(css), minHeight: 125, lineHeight: 1.65 }}
                  />
                </div>
              </div>
            )}

            <div>
              <SectionLabel color={css.muted}>
                {flow === "social" ? "Temat posta" : flow === "hooks" ? "Temat hooków" : flow === "article" ? "Brief artykułu" : "Dodatkowa sugestia"}
              </SectionLabel>
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={
                  flow === "blog"
                    ? "Np. dodaj CTA do aplikacji, link w komentarzu, ton ekspercki na LinkedIn i lżejszy na Facebooku."
                    : flow === "article"
                      ? "Np. artykuł o tym, jak używać bloga jako centrum kampanii contentowej..."
                      : "Np. temat, cel, odbiorca, oferta, link, ton lub ważna sugestia."
                }
                style={{
                  ...inputStyle(css),
                  minHeight: 120,
                  lineHeight: 1.7,
                }}
              />
            </div>

            <div>
              <SectionLabel color={css.muted}>Kontekst marki / oferta / CTA</SectionLabel>
              <textarea
                value={brandContext}
                onChange={(event) => setBrandContext(event.target.value)}
                placeholder="Np. ANM Collective tworzy aplikacje B2B/B2C. CTA: zobacz demo, napisz do nas, link do bloga w komentarzu."
                style={{ ...inputStyle(css), minHeight: 86, lineHeight: 1.65 }}
              />
            </div>

            <MediaPicker media={media} setMedia={setMedia} css={css} />

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate || loading}
              style={{
                border: "none",
                borderRadius: 16,
                background: dark ? "#ffffff" : "#111111",
                color: dark ? "#050505" : "#ffffff",
                padding: "14px 16px",
                fontSize: 13,
                fontWeight: 900,
                cursor: !canGenerate || loading ? "not-allowed" : "pointer",
                opacity: !canGenerate || loading ? 0.55 : 1,
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
              }}
            >
              {loading && (
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: "2px solid currentColor",
                    borderTopColor: "transparent",
                    animation: "spin .75s linear infinite",
                  }}
                />
              )}
              {loading ? "AI tworzy content..." : flow === "blog" ? "Stwórz content z bloga" : flow === "hooks" ? "Wygeneruj hooki" : flow === "article" ? "Przygotuj artykuł" : "Wygeneruj post"}
            </button>

            {error && (
              <div
                style={{
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
                  minHeight: 420,
                  background: css.surface,
                  border: `1px dashed ${css.border}`,
                  borderRadius: 24,
                  display: "grid",
                  placeItems: "center",
                  textAlign: "center",
                  padding: 28,
                }}
              >
                <div>
                  <div style={{ fontSize: 46, opacity: 0.16, marginBottom: 10 }}>✦</div>
                  <h3
                    style={{
                      margin: "0 0 10px",
                      color: css.heading,
                      fontFamily: "var(--font-heading)",
                      fontSize: 30,
                      fontWeight: 500,
                    }}
                  >
                    Wynik pojawi się tutaj
                  </h3>
                  <p style={{ margin: 0, color: css.muted, fontSize: 13, lineHeight: 1.75, maxWidth: 420 }}>
                    Content Studio pokaże gotową treść, warianty platformowe, hooki,
                    plan dystrybucji i akcje: szablon, inspiracja, harmonogram albo publikacja.
                  </p>
                </div>
              </div>
            )}

            {loading && (
              <div
                style={{
                  minHeight: 420,
                  background: css.surface,
                  border: `1px solid ${css.border}`,
                  borderRadius: 24,
                  display: "grid",
                  placeItems: "center",
                  textAlign: "center",
                  padding: 28,
                }}
              >
                <div>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      border: `3px solid ${css.border}`,
                      borderTopColor: css.aiText,
                      margin: "0 auto 14px",
                      animation: "spin .8s linear infinite",
                    }}
                  />
                  <p style={{ color: css.muted, fontSize: 13 }}>
                    AI układa content i dopasowuje go do wybranego procesu...
                  </p>
                </div>
              </div>
            )}

            {result && (
              <ResultPanel
                result={result}
                flow={flow}
                platform={platform}
                selectedPlatforms={selectedPlatforms}
                prompt={prompt}
                contentType={contentFormat}
                workspaceId={workspaceId}
                css={css}
                media={media}
              />
            )}

            {rawAnswer && (
              <details
                style={{
                  marginTop: 12,
                  background: css.surface,
                  border: `1px solid ${css.border}`,
                  borderRadius: 16,
                  padding: 12,
                }}
              >
                <summary style={{ color: css.muted, fontSize: 11, cursor: "pointer", fontWeight: 900 }}>
                  Surowa odpowiedź AI
                </summary>
                <pre style={{ color: css.muted, fontSize: 10, lineHeight: 1.7, whiteSpace: "pre-wrap", marginTop: 10 }}>
                  {rawAnswer}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function inputStyle(css: Record<string, string>): CSSProperties {
  return {
    width: "100%",
    borderRadius: 14,
    border: `1px solid ${css.border}`,
    background: css.surface,
    color: css.text,
    padding: "12px 13px",
    outline: "none",
    fontFamily: "inherit",
    fontSize: 12,
  };
}
