"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";
import { useContentIQLanguage } from "@/lib/contentiq-language";

type Lang = "pl" | "en";
type StudioFlow = "smart" | "social" | "hooks" | "blog" | "article";
type AiProvider = "deepseek" | "gemini";

type Platform =
  | "linkedin"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "blog"
  | "spotify";

type LocalMediaItem = {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  mimeType: string;
  size: number;
  assetType: "image" | "video" | "audio" | "document";
};

type UploadedMediaItem = {
  kind: "cover" | "attachment";
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  asset_type: LocalMediaItem["assetType"];
  status: "temporary" | "scheduled";
  expires_at: string;
};

type InspirationMediaItem = Omit<UploadedMediaItem, "status" | "expires_at"> & {
  status: "active";
  source: "content_studio";
};

type GeneratedPost = {
  title: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  estimated_score: number;
  platform_notes: string;
  recommended_comment?: string;
  format?: string;
  why_this_should_work?: string;
  based_on_data?: string[];
};

type HookIdea = {
  text: string;
  type: string;
  score: number;
  best_for: string;
  note: string;
};

type ContentVariant = {
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
  why_this_should_work?: string;
  based_on_data?: string[];
};

type ContentPlanItem = {
  platform: Platform;
  idea: string;
  format: string;
  angle: string;
  cta: string;
};

type ContentOpportunity = {
  title: string;
  reason: string;
  platform: Platform;
  format: string;
  evidence: string[];
};

type StudioResult = {
  title: string;
  strategic_note: string;
  source_summary?: string;
  ai_observations?: string[];
  primary?: GeneratedPost;
  hooks?: HookIdea[];
  variants?: ContentVariant[];
  article_html?: string;
  article_outline?: string[];
  blog_cta_blocks?: string[];
  content_plan?: ContentPlanItem[];
};

type AiContext = {
  hasData: boolean;
  postsAnalyzed: number;
  commentsAnalyzed: number;
  bestPostByViews?: {
    title: string;
    views: number;
    platform: Platform;
    format?: string;
  };
  bestPostByEngagement?: {
    title: string;
    engagementRate: number;
    platform: Platform;
    format?: string;
  };
  mostCommentedPost?: {
    title: string;
    comments: number;
    platform: Platform;
    format?: string;
  };
  winningFormats: string[];
  winningTopics: string[];
  commonCommentTopics: string[];
  audienceQuestions: string[];
  recommendedTone: string;
  recommendedActions: string[];
  brandVoice?: string;
  offerSummary?: string;
  contentOpportunities?: ContentOpportunity[];
};

type ApiResponse = {
  answer?: string;
  data?: unknown;
  error?: string;
  details?: string;
};

const STORAGE_BUCKET = "content-temp-media";

const PLATFORMS: { id: Platform; pl: string; en: string; color: string }[] = [
  { id: "linkedin", pl: "LinkedIn", en: "LinkedIn", color: "#0A66C2" },
  { id: "instagram", pl: "Instagram", en: "Instagram", color: "#E1306C" },
  { id: "tiktok", pl: "TikTok", en: "TikTok", color: "#FFFFFF" },
  { id: "youtube", pl: "YouTube", en: "YouTube", color: "#FF0033" },
  { id: "facebook", pl: "Facebook", en: "Facebook", color: "#1877F2" },
  { id: "blog", pl: "Blog", en: "Blog", color: "#22C55E" },
  { id: "spotify", pl: "Spotify", en: "Spotify", color: "#1DB954" },
];

const CONTENT_FORMATS = [
  {
    pl: "Post ekspercki",
    en: "Expert post",
  },
  {
    pl: "Post sprzedażowy miękki",
    en: "Soft sales post",
  },
  {
    pl: "Case study",
    en: "Case study",
  },
  {
    pl: "Lista / poradnik",
    en: "List / guide",
  },
  {
    pl: "Storytelling",
    en: "Storytelling",
  },
  {
    pl: "Karuzela",
    en: "Carousel",
  },
  {
    pl: "Reels / Shorts script",
    en: "Reels / Shorts script",
  },
  {
    pl: "Komentarz do trendu",
    en: "Trend commentary",
  },
  {
    pl: "Artykuł blogowy",
    en: "Blog article",
  },
  {
    pl: "Newsletter",
    en: "Newsletter",
  },
];

const BLOG_REPURPOSE_PLATFORMS: Platform[] = [
  "linkedin",
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
];

const EMPTY_CONTEXT: AiContext = {
  hasData: false,
  postsAnalyzed: 0,
  commentsAnalyzed: 0,
  winningFormats: [],
  winningTopics: [],
  commonCommentTopics: [],
  audienceQuestions: [],
  recommendedTone: "",
  recommendedActions: [],
};

function getPlatformInfo(platform: Platform) {
  return PLATFORMS.find((item) => item.id === platform) || PLATFORMS[0];
}

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function cleanJsonAnswer(answer: string) {
  return answer
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function formatNumber(value?: number) {
  if (typeof value !== "number") return "—";
  return new Intl.NumberFormat("pl-PL").format(value);
}

function getScoreColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

function getAssetType(file: File): LocalMediaItem["assetType"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
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

function normalizeStudioResult(raw: Partial<StudioResult>): StudioResult {
  return {
    title: raw.title || "Content Studio",
    strategic_note: raw.strategic_note || "",
    source_summary: raw.source_summary || "",
    ai_observations: safeArray(raw.ai_observations),
    primary: raw.primary
      ? {
          title: raw.primary.title || "",
          hook: raw.primary.hook || "",
          body: raw.primary.body || "",
          cta: raw.primary.cta || "",
          hashtags: safeArray(raw.primary.hashtags),
          estimated_score: Number(raw.primary.estimated_score || 0),
          platform_notes: raw.primary.platform_notes || "",
          recommended_comment: raw.primary.recommended_comment || "",
          format: raw.primary.format || "",
          why_this_should_work: raw.primary.why_this_should_work || "",
          based_on_data: safeArray(raw.primary.based_on_data),
        }
      : undefined,
    hooks: safeArray(raw.hooks).map((item) => ({
      text: item.text || "",
      type: item.type || "",
      score: Number(item.score || 0),
      best_for: item.best_for || "",
      note: item.note || "",
    })),
    variants: safeArray(raw.variants).map((item) => ({
      platform: item.platform,
      title: item.title || "",
      hook: item.hook || "",
      body: item.body || "",
      cta: item.cta || "",
      hashtags: safeArray(item.hashtags),
      format: item.format || "",
      score: Number(item.score || 0),
      notes: item.notes || "",
      recommended_comment: item.recommended_comment || "",
      why_this_should_work: item.why_this_should_work || "",
      based_on_data: safeArray(item.based_on_data),
    })),
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

function fullPostText(post: GeneratedPost | ContentVariant) {
  return [
    post.title,
    post.hook,
    post.body,
    post.cta,
    safeArray(post.hashtags).join(" "),
    post.recommended_comment
      ? `\nKomentarz / link:\n${post.recommended_comment}`
      : "",
  ]
    .filter((part) => String(part || "").trim().length > 0)
    .join("\n\n");
}

function buildStudioPrompt({
  language,
  flow,
  platform,
  selectedPlatforms,
  contentFormat,
  userPrompt,
  blogUrl,
  blogText,
  brandContext,
  aiContext,
}: {
  language: Lang;
  flow: StudioFlow;
  platform: Platform;
  selectedPlatforms: Platform[];
  contentFormat: string;
  userPrompt: string;
  blogUrl: string;
  blogText: string;
  brandContext: string;
  aiContext: AiContext;
}) {
  const platformInfo = getPlatformInfo(platform);
  const platformName = language === "pl" ? platformInfo.pl : platformInfo.en;

  const selectedNames = selectedPlatforms
    .map((id) => {
      const info = getPlatformInfo(id);
      return language === "pl" ? info.pl : info.en;
    })
    .join(", ");

  const contextBlock = `
DANE Z PLATFORMY, KTÓRE MASZ WYKORZYSTAĆ:
- Czy są dane: ${aiContext.hasData ? "tak" : "nie"}
- Liczba przeanalizowanych postów: ${aiContext.postsAnalyzed}
- Liczba przeanalizowanych komentarzy: ${aiContext.commentsAnalyzed}
- Najlepszy post po wyświetleniach/zasięgu: ${
    aiContext.bestPostByViews
      ? `${aiContext.bestPostByViews.title} (${aiContext.bestPostByViews.views})`
      : "brak danych"
  }
- Najlepszy post po engagement rate: ${
    aiContext.bestPostByEngagement
      ? `${aiContext.bestPostByEngagement.title} (${aiContext.bestPostByEngagement.engagementRate}%)`
      : "brak danych"
  }
- Najbardziej komentowany post: ${
    aiContext.mostCommentedPost
      ? `${aiContext.mostCommentedPost.title} (${aiContext.mostCommentedPost.comments})`
      : "brak danych"
  }
- Wygrywające formaty: ${safeArray(aiContext.winningFormats).join(", ") || "brak danych"}
- Wygrywające tematy: ${safeArray(aiContext.winningTopics).join(", ") || "brak danych"}
- Najczęstsze tematy komentarzy: ${safeArray(aiContext.commonCommentTopics).join(", ") || "brak danych"}
- Pytania odbiorców: ${safeArray(aiContext.audienceQuestions).join(" | ") || "brak danych"}
- Rekomendowany ton: ${aiContext.recommendedTone || "brak danych"}
- Rekomendowane działania: ${safeArray(aiContext.recommendedActions).join(" | ") || "brak danych"}
- Brand voice z workspace: ${aiContext.brandVoice || "brak danych"}
- Oferta / CTA z workspace: ${aiContext.offerSummary || "brak danych"}
`.trim();

  const commonRules = `
Jesteś AI Content Strategiem w ANM ContentIQ.

To NIE jest zwykły chat. Nie czekasz biernie na prompt użytkownika.
Najpierw wykorzystujesz dane z platformy: wyniki postów, komentarze, formaty, tematy, zasięg, engagement i pytania odbiorców.
Jeśli użytkownik dopisał dodatkową sugestię, traktuj ją tylko jako doprecyzowanie, a nie główne źródło wiedzy.

Zasady:
- Pisz w języku ${language === "pl" ? "polskim" : "angielskim"}.
- Nie wymyślaj wyników analitycznych.
- Jeśli brakuje danych, napisz to w strategic_note i oprzyj się na dostępnych danych.
- Każda sugestia ma mieć uzasadnienie: dlaczego powinna zadziałać.
- Uwzględniaj różnice platform.
- AI może sugerować, ale użytkownik zatwierdza publikację ręcznie.
- Zwróć wyłącznie JSON bez markdown.

${contextBlock}

KONTEKST MARKI / OFERTA / CTA OD UŻYTKOWNIKA:
${brandContext || "Brak dodatkowego kontekstu."}

OPCJONALNE DOPRECYZOWANIE UŻYTKOWNIKA:
${userPrompt || "Brak. Działaj na podstawie danych z platformy."}
`.trim();

  if (flow === "smart") {
    return `
${commonRules}

Zadanie:
Wygeneruj najlepszy następny ruch contentowy na podstawie danych z platformy.

Platforma główna:
${platformName}

Format preferowany:
${contentFormat}

Wymagania:
- wskaż, co AI zauważyło w danych,
- przygotuj gotowy post,
- zaproponuj komentarz uzupełniający pod postem,
- zaproponuj 3-5 kolejnych tematów,
- uzasadnij, dlaczego ten kierunek wynika z wyników platformy.

JSON:
{
  "title": "tytuł rekomendacji",
  "strategic_note": "krótka rekomendacja strategiczna na podstawie danych",
  "ai_observations": ["obserwacja 1", "obserwacja 2", "obserwacja 3"],
  "primary": {
    "title": "tytuł roboczy",
    "hook": "hook",
    "body": "treść posta",
    "cta": "CTA",
    "hashtags": ["#..."],
    "estimated_score": 0,
    "platform_notes": "dlaczego pasuje do platformy",
    "recommended_comment": "komentarz uzupełniający pod postem",
    "format": "${contentFormat}",
    "why_this_should_work": "uzasadnienie na podstawie danych",
    "based_on_data": ["dana 1", "dana 2", "dana 3"]
  },
  "content_plan": [
    {
      "platform": "${platform}",
      "idea": "pomysł",
      "format": "format",
      "angle": "kąt",
      "cta": "CTA"
    }
  ]
}
`.trim();
  }

  if (flow === "social") {
    return `
${commonRules}

Zadanie:
Stwórz gotowy post social media na podstawie danych z platformy.

Platforma:
${platformName}

Format:
${contentFormat}

JSON:
{
  "title": "tytuł roboczy",
  "strategic_note": "co wynika z danych i dlaczego ta treść ma sens",
  "ai_observations": ["obserwacja 1", "obserwacja 2"],
  "primary": {
    "title": "tytuł",
    "hook": "hook",
    "body": "treść posta",
    "cta": "CTA",
    "hashtags": ["#..."],
    "estimated_score": 0,
    "platform_notes": "dlaczego działa na tej platformie",
    "recommended_comment": "opcjonalny komentarz z linkiem lub dopowiedzeniem",
    "format": "${contentFormat}",
    "why_this_should_work": "uzasadnienie na podstawie danych",
    "based_on_data": ["konkret z danych"]
  },
  "content_plan": []
}
`.trim();
  }

  if (flow === "hooks") {
    return `
${commonRules}

Zadanie:
Wygeneruj hooki na podstawie treści, które do tej pory miały najlepsze wyniki.

Platforma główna:
${platformName}

Format:
${contentFormat}

JSON:
{
  "title": "zestaw hooków oparty na danych",
  "strategic_note": "jaki kierunek hooków wynika z wyników platformy",
  "ai_observations": ["obserwacja 1", "obserwacja 2"],
  "hooks": [
    {
      "text": "hook",
      "type": "problemowy / pytanie / lista / kontrast / storytelling",
      "score": 0,
      "best_for": "platforma / format",
      "note": "dlaczego może zadziałać na podstawie danych"
    }
  ]
}
`.trim();
  }

  if (flow === "blog") {
    return `
${commonRules}

Zadanie:
Zrób dystrybucję bloga na social media, ale dopasuj ją do tego, co już najlepiej działa na platformach.

Link do bloga:
${blogUrl || "brak linku"}

Treść / streszczenie bloga:
${blogText || "Brak treści bloga."}

Platformy docelowe:
${selectedNames}

JSON:
{
  "title": "kampania wokół artykułu blogowego",
  "source_summary": "krótkie streszczenie bloga",
  "strategic_note": "jak dystrybuować ten blog na podstawie wyników platform",
  "ai_observations": ["obserwacja 1", "obserwacja 2"],
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
      "recommended_comment": "komentarz z linkiem do bloga",
      "why_this_should_work": "uzasadnienie na podstawie danych",
      "based_on_data": ["konkret z danych"]
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
Przygotuj artykuł / wpis blogowy jako treść źródłową do kampanii.
Temat artykułu powinien wynikać z danych: najlepszych tematów, komentarzy i pytań odbiorców.

Format:
${contentFormat}

JSON:
{
  "title": "tytuł artykułu",
  "strategic_note": "dlaczego ten artykuł jest dobrym kierunkiem na podstawie danych",
  "ai_observations": ["obserwacja 1", "obserwacja 2"],
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

function inputStyle(css: Record<string, string>): CSSProperties {
  return {
    width: "100%",
    borderRadius: 14,
    border: `1px solid ${css.border}`,
    background: css.surface,
    color: css.text,
    padding: "12px 14px",
    fontFamily: "inherit",
    fontSize: 13,
    outline: "none",
  };
}

function actionButton(css: Record<string, string>, strong = false): CSSProperties {
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

function MediaPicker({
  media,
  setMedia,
  css,
  lang,
}: {
  media: LocalMediaItem[];
  setMedia: React.Dispatch<React.SetStateAction<LocalMediaItem[]>>;
  css: Record<string, string>;
  lang: Lang;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function t(pl: string, en: string) {
    return lang === "pl" ? pl : en;
  }

  function addFiles(files: FileList | null) {
    if (!files?.length) return;

    const nextItems: LocalMediaItem[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${crypto.randomUUID()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      assetType: getAssetType(file),
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
      <SectionLabel color={css.muted}>
        {t("Media do contentu", "Content media")}
      </SectionLabel>

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
          {t("Dodaj zdjęcie, grafikę albo video", "Add a photo, graphic or video")}
        </div>

        <div style={{ fontSize: 11, color: css.muted, marginTop: 5, lineHeight: 1.6 }}>
          {t(
            "AI uwzględni media przy tworzeniu posta, hooka albo planu dystrybucji.",
            "AI will use your media when creating posts, hooks or distribution plans."
          )}
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
                  <span style={{ color: css.muted, fontSize: 12 }}>
                    {item.assetType}
                  </span>
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
                  {t("Usuń", "Remove")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AiContextPanel({
  css,
  lang,
  context,
  loading,
  onRefresh,
}: {
  css: Record<string, string>;
  lang: Lang;
  context: AiContext;
  loading: boolean;
  onRefresh: () => void;
}) {
  function t(pl: string, en: string) {
    return lang === "pl" ? pl : en;
  }

  return (
    <div
      style={{
        background: css.aiBg,
        border: `1px solid ${css.aiBorder}`,
        boxShadow: css.aiGlow,
        borderRadius: 22,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <SectionLabel color={css.aiText}>
            {t("AI widzi teraz", "AI sees now")}
          </SectionLabel>

          <h3
            style={{
              margin: "0 0 8px",
              color: css.heading,
              fontFamily: "var(--font-heading)",
              fontSize: 27,
              lineHeight: 1.05,
              fontWeight: 500,
            }}
          >
            {t("Kontekst z platformy przed generowaniem", "Platform context before generation")}
          </h3>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          style={{
            ...actionButton(css, true),
            minWidth: 112,
          }}
        >
          {loading ? t("Analizuję...", "Analyzing...") : t("Odśwież dane", "Refresh data")}
        </button>
      </div>

      {!context.hasData && (
        <p style={{ margin: "8px 0 0", color: css.muted, fontSize: 12, lineHeight: 1.7 }}>
          {t(
            "Brak pełnego kontekstu z platformy. AI nadal może pomóc, ale najlepsze rekomendacje pojawią się po synchronizacji konta i pobraniu wyników.",
            "No full platform context yet. AI can still help, but the best recommendations will appear after account sync and performance data import."
          )}
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 9,
          marginTop: 13,
        }}
      >
        <MetricBox
          css={css}
          label={t("Posty", "Posts")}
          value={formatNumber(context.postsAnalyzed)}
        />
        <MetricBox
          css={css}
          label={t("Komentarze", "Comments")}
          value={formatNumber(context.commentsAnalyzed)}
        />
        <MetricBox
          css={css}
          label={t("Ton", "Tone")}
          value={context.recommendedTone || "—"}
        />
      </div>

      <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
        <InsightLine
          css={css}
          label={t("Największy zasięg", "Top reach")}
          value={
            context.bestPostByViews
              ? `${context.bestPostByViews.title} · ${formatNumber(context.bestPostByViews.views)}`
              : t("brak danych", "no data")
          }
        />

        <InsightLine
          css={css}
          label={t("Najlepszy engagement", "Top engagement")}
          value={
            context.bestPostByEngagement
              ? `${context.bestPostByEngagement.title} · ${context.bestPostByEngagement.engagementRate}%`
              : t("brak danych", "no data")
          }
        />

        <InsightLine
          css={css}
          label={t("Najwięcej komentarzy", "Most comments")}
          value={
            context.mostCommentedPost
              ? `${context.mostCommentedPost.title} · ${context.mostCommentedPost.comments}`
              : t("brak danych", "no data")
          }
        />
      </div>

      <ChipGroup
        css={css}
        title={t("Wygrywające formaty", "Winning formats")}
        items={context.winningFormats}
        empty={t("Po synchronizacji AI pokaże formaty, które działają najlepiej.", "After sync AI will show the formats that work best.")}
      />

      <ChipGroup
        css={css}
        title={t("Tematy z komentarzy", "Comment topics")}
        items={context.commonCommentTopics}
        empty={t("Po pobraniu komentarzy AI pokaże najczęstsze tematy rozmów.", "After importing comments AI will show the most common conversation topics.")}
      />

      <ChipGroup
        css={css}
        title={t("Rekomendowane działania", "Recommended actions")}
        items={context.recommendedActions}
        empty={t("AI podpowie kolejne kroki po analizie danych.", "AI will suggest next steps after analyzing data.")}
      />
    </div>
  );
}

function MetricBox({
  css,
  label,
  value,
}: {
  css: Record<string, string>;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: css.liveSoft,
        border: `1px solid ${css.border}`,
        borderRadius: 15,
        padding: 11,
      }}
    >
      <div style={{ color: css.muted, fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>
        {label}
      </div>
      <div
        style={{
          color: css.text,
          fontSize: 17,
          fontWeight: 900,
          marginTop: 4,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function InsightLine({
  css,
  label,
  value,
}: {
  css: Record<string, string>;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: css.liveSoft,
        border: `1px solid ${css.border}`,
        borderRadius: 14,
        padding: 10,
      }}
    >
      <div style={{ color: css.muted, fontSize: 10, fontWeight: 900, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: css.text, fontSize: 12, lineHeight: 1.5 }}>
        {value}
      </div>
    </div>
  );
}

function ChipGroup({
  css,
  title,
  items,
  empty,
}: {
  css: Record<string, string>;
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div style={{ marginTop: 13 }}>
      <SectionLabel color={css.aiText}>{title}</SectionLabel>
      {items.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {items.map((item) => (
            <span
              key={item}
              style={{
                background: css.aiBgSoft,
                border: `1px solid ${css.aiBorder}`,
                color: css.text,
                borderRadius: 999,
                padding: "5px 9px",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p style={{ margin: 0, color: css.muted, fontSize: 11, lineHeight: 1.6 }}>
          {empty}
        </p>
      )}
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
        boxShadow: active
          ? `0 0 0 1px ${css.accentBorder}, 0 16px 34px rgba(0,0,0,0.22)`
          : "none",
        color: css.text,
        cursor: "pointer",
        fontFamily: "inherit",
        minHeight: 170,
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

function PostCard({
  item,
  platform,
  css,
  lang,
  onCopy,
  actions,
}: {
  item: GeneratedPost | ContentVariant;
  platform: Platform;
  css: Record<string, string>;
  lang: Lang;
  onCopy: (text: string) => void;
  actions: React.ReactNode;
}) {
  function t(pl: string, en: string) {
    return lang === "pl" ? pl : en;
  }

  const info = getPlatformInfo(platform);
  const score = "estimated_score" in item ? item.estimated_score : item.score;
  const notes = "platform_notes" in item ? item.platform_notes : item.notes;

  return (
    <div
      style={{
        background: css.surface,
        border: `1px solid ${css.border}`,
        borderTop: `4px solid ${info.color}`,
        borderRadius: 20,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <SectionLabel color={info.color}>
            {lang === "pl" ? info.pl : info.en}
          </SectionLabel>
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
            {item.title || t("Wariant contentu", "Content variant")}
          </h3>
        </div>

        <div
          style={{
            color: getScoreColor(score),
            fontSize: 28,
            fontWeight: 900,
            fontFamily: "var(--font-heading)",
          }}
        >
          {score || 0}
        </div>
      </div>

      {safeArray(item.based_on_data).length > 0 && (
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
          <SectionLabel color={css.aiText}>
            {t("Dlaczego AI to proponuje", "Why AI suggests this")}
          </SectionLabel>
          <ul style={{ margin: 0, paddingLeft: 18, color: css.text, fontSize: 12, lineHeight: 1.7 }}>
            {safeArray(item.based_on_data).map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </div>
      )}

      {item.hook && (
        <div
          style={{
            marginTop: 13,
            background: css.aiBgSoft,
            border: `1px solid ${css.aiBorder}`,
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
          <strong style={{ color: css.text }}>
            {t("Komentarz uzupełniający:", "Follow-up comment:")}
          </strong>{" "}
          {item.recommended_comment}
        </div>
      )}

      {item.why_this_should_work && (
        <p style={{ margin: "12px 0 0", color: css.text, fontSize: 12, lineHeight: 1.65 }}>
          <strong>{t("Uzasadnienie:", "Reasoning:")}</strong> {item.why_this_should_work}
        </p>
      )}

      {safeArray(item.hashtags).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 12 }}>
          {safeArray(item.hashtags).map((tag) => (
            <span
              key={tag}
              style={{
                background: `${info.color}18`,
                color: info.color,
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
        onClick={() => onCopy(fullPostText(item))}
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
        {t("Kopiuj treść", "Copy content")}
      </button>

      <div style={{ marginTop: 10 }}>{actions}</div>
    </div>
  );
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
  lang,
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
  lang: Lang;
  media: LocalMediaItem[];
}) {
  const [copied, setCopied] = useState(false);

  function t(pl: string, en: string) {
    return lang === "pl" ? pl : en;
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
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
        <SectionLabel color={css.accent}>
          {t("Wynik Content Studio", "Content Studio result")}
        </SectionLabel>

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
          {result.strategic_note}
        </p>

        {safeArray(result.ai_observations).length > 0 && (
          <div
            style={{
              marginTop: 13,
              background: css.aiBg,
              border: `1px solid ${css.aiBorder}`,
              borderRadius: 16,
              padding: 13,
            }}
          >
            <SectionLabel color={css.aiText}>
              {t("Co AI zauważyło w danych", "What AI noticed in the data")}
            </SectionLabel>

            <ul style={{ margin: 0, paddingLeft: 18, color: css.text, fontSize: 12, lineHeight: 1.7 }}>
              {safeArray(result.ai_observations).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {copied && (
          <div style={{ marginTop: 10, color: "#22c55e", fontSize: 12, fontWeight: 900 }}>
            {t("Skopiowano", "Copied")}
          </div>
        )}
      </div>

      {primary && (
        <PostCard
          item={primary}
          platform={platform}
          css={css}
          lang={lang}
          onCopy={copy}
          actions={
            <ContentActions
              item={primary}
              platform={platform}
              prompt={prompt}
              contentType={contentType}
              workspaceId={workspaceId}
              css={css}
              lang={lang}
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
          <SectionLabel color={css.accent}>
            {t("Hooki oparte na danych", "Data-based hooks")}
          </SectionLabel>

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
                  <div style={{ color: getScoreColor(hook.score), fontWeight: 900 }}>
                    {hook.score}
                  </div>
                </div>

                <div style={{ marginTop: 7, color: css.muted, fontSize: 11, lineHeight: 1.55 }}>
                  {hook.type} · {hook.best_for} · {hook.note}
                </div>

                <button
                  type="button"
                  onClick={() => copy(hook.text)}
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
                  {t("Kopiuj hook", "Copy hook")}
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
              lang={lang}
              onCopy={copy}
              actions={
                <ContentActions
                  item={variant}
                  platform={variant.platform}
                  prompt={prompt}
                  contentType={variant.format || contentType}
                  workspaceId={workspaceId}
                  css={css}
                  lang={lang}
                  media={media}
                />
              }
            />
          ))}
        </div>
      )}

      {safeArray(result.article_outline).length > 0 && (
        <div style={resultBox(css)}>
          <SectionLabel color={css.accent}>
            {t("Konspekt artykułu", "Article outline")}
          </SectionLabel>

          <ol style={{ margin: 0, paddingLeft: 18, color: css.text, fontSize: 12, lineHeight: 1.75 }}>
            {safeArray(result.article_outline).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>
      )}

      {result.article_html && (
        <div style={resultBox(css)}>
          <SectionLabel color={css.accent}>
            {t("HTML artykułu", "Article HTML")}
          </SectionLabel>

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
          <SectionLabel color={css.accent}>
            {t("Bloki CTA do bloga", "Blog CTA blocks")}
          </SectionLabel>

          <div style={{ display: "grid", gap: 8 }}>
            {safeArray(result.blog_cta_blocks).map((item) => (
              <div
                key={item}
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
          <SectionLabel color={css.accent}>
            {t("Kolejne ruchy contentowe", "Next content moves")}
          </SectionLabel>

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
                  <div style={{ color: info.color, fontWeight: 900, fontSize: 12 }}>
                    {lang === "pl" ? info.pl : info.en} · {item.format}
                  </div>

                  <div style={{ color: css.text, fontSize: 13, fontWeight: 900, marginTop: 5 }}>
                    {item.idea}
                  </div>

                  <div style={{ color: css.muted, fontSize: 11, lineHeight: 1.6, marginTop: 5 }}>
                    {t("Kąt:", "Angle:")} {item.angle} · CTA: {item.cta}
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

function ScheduleModal({
  onClose,
  onSchedule,
  platform,
  css,
  lang,
}: {
  onClose: () => void;
  onSchedule: (date: string) => void;
  platform: Platform;
  css: Record<string, string>;
  lang: Lang;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("15:00");

  function t(pl: string, en: string) {
    return lang === "pl" ? pl : en;
  }

  const info = getPlatformInfo(platform);

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
        <h3
          style={{
            margin: "0 0 6px",
            color: css.heading,
            fontFamily: "var(--font-heading)",
            fontSize: 26,
            fontWeight: 500,
          }}
        >
          {t("Zaplanuj publikację", "Schedule publication")}
        </h3>

        <div style={{ fontSize: 12, color: css.muted, marginBottom: 18 }}>
          {t("Platforma:", "Platform:")}{" "}
          <span style={{ color: info.color }}>
            {lang === "pl" ? info.pl : info.en}
          </span>
        </div>

        <div style={{ marginBottom: 13 }}>
          <SectionLabel color={css.muted}>{t("Data", "Date")}</SectionLabel>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            style={inputStyle(css)}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <SectionLabel color={css.muted}>{t("Godzina", "Time")}</SectionLabel>
          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            style={inputStyle(css)}
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onClose} style={actionButton(css, false)}>
            {t("Anuluj", "Cancel")}
          </button>

          <button
            type="button"
            onClick={() => {
              if (date) onSchedule(`${date}T${time}:00`);
            }}
            disabled={!date}
            style={{
              ...actionButton(css, true),
              background: info.color,
              color: "#fff",
              opacity: !date ? 0.5 : 1,
            }}
          >
            {t("Zaplanuj", "Schedule")}
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
  lang,
  media,
}: {
  item: GeneratedPost | ContentVariant;
  platform: Platform;
  prompt: string;
  contentType: string;
  workspaceId: string;
  css: Record<string, string>;
  lang: Lang;
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
  const pColor = getPlatformInfo(platform).color;

  function t(pl: string, en: string) {
    return lang === "pl" ? pl : en;
  }

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
    const uploaded = [];

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
      if (!wsId) throw new Error(t("Brak przestrzeni aplikacji.", "Missing workspace."));

      const { data: inspiration, error } = await supabase
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
          media: [],
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);

      const uploaded: InspirationMediaItem[] = [];

      try {
        for (const mediaItem of media) {
          const fileName = safeFileName(mediaItem.name || "media");
          const path = `${wsId}/inspirations/${inspiration.id}/${Date.now()}-${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(path, mediaItem.file, {
              contentType: mediaItem.mimeType,
              upsert: false,
            });

          if (uploadError) throw new Error(uploadError.message);

          uploaded.push({
            kind: uploaded.length === 0 ? "cover" : "attachment",
            storage_bucket: STORAGE_BUCKET,
            storage_path: path,
            file_name: mediaItem.name,
            mime_type: mediaItem.mimeType,
            file_size: mediaItem.size,
            asset_type: mediaItem.assetType,
            status: "active",
            source: "content_studio",
          });
        }

        if (uploaded.length > 0) {
          const { error: mediaUpdateError } = await supabase
            .schema("contentiq")
            .from("inspirations")
            .update({ media: uploaded })
            .eq("id", inspiration.id);

          if (mediaUpdateError) throw new Error(mediaUpdateError.message);
        }
      } catch (mediaError) {
        if (uploaded.length > 0) {
          await supabase.storage
            .from(STORAGE_BUCKET)
            .remove(uploaded.map((mediaItem) => mediaItem.storage_path));
        }

        await supabase
          .schema("contentiq")
          .from("inspirations")
          .delete()
          .eq("id", inspiration.id);

        throw mediaError;
      }

      showToast(t("✓ Zapisano jako inspirację", "✓ Saved as inspiration"), "ok");
    } catch (err) {
      showToast(`${t("Błąd:", "Error:")} ${err instanceof Error ? err.message : String(err)}`, "err");
    } finally {
      setSaving(false);
    }
  }

  async function saveTemplate(status: "template" | "scheduled" = "template", scheduledAt?: string) {
    const wsId = await getOrCreateWorkspaceUuid();
    if (!wsId) throw new Error(t("Brak przestrzeni aplikacji.", "Missing workspace."));

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
      showToast(t("✓ Zapisano jako szablon", "✓ Saved as template"), "ok");
    } catch (err) {
      showToast(`${t("Błąd:", "Error:")} ${err instanceof Error ? err.message : String(err)}`, "err");
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

      if (!conn) {
        throw new Error(t(`Brak podłączonego konta: ${platform}`, `No connected account: ${platform}`));
      }

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

      showToast(
        `${t("✓ Zaplanowano na", "✓ Scheduled for")} ${new Date(scheduledAt).toLocaleString("pl-PL")}`,
        "ok"
      );
    } catch (err) {
      showToast(`${t("Błąd:", "Error:")} ${err instanceof Error ? err.message : String(err)}`, "err");
    } finally {
      setScheduling(false);
    }
  }

  async function publishNow() {
    setPublishing(true);

    try {
      await schedulePost(new Date().toISOString());
      showToast(t("✓ Wysłano do kolejki publikacji", "✓ Sent to publishing queue"), "ok");
    } catch (err) {
      showToast(`${t("Błąd:", "Error:")} ${err instanceof Error ? err.message : String(err)}`, "err");
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
          lang={lang}
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
          {savingTemplate ? t("Zapisuję...", "Saving...") : t("Szablon", "Template")}
        </button>

        <button type="button" onClick={saveInspiration} disabled={saving} style={actionButton(css, false)}>
          {saving ? t("Zapisuję...", "Saving...") : t("Inspiracja", "Inspiration")}
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
          {scheduling ? t("Planowanie...", "Scheduling...") : t("Zaplanuj", "Schedule")}
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
          {publishing ? t("Wysyłam...", "Sending...") : t("Publikuj", "Publish")}
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
  const { lang, text } = useContentIQLanguage();
  const language = (lang === "en" ? "en" : "pl") as Lang;

  function t(pl: string, en: string) {
    return language === "pl" ? pl : en;
  }

  const [flow, setFlow] = useState<StudioFlow>("smart");
  const [aiProvider, setAiProvider] = useState<AiProvider>("deepseek");
  const [platform, setPlatform] = useState<Platform>("facebook");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(BLOG_REPURPOSE_PLATFORMS);
  const [contentFormat, setContentFormat] = useState(CONTENT_FORMATS[0].pl);
  const [prompt, setPrompt] = useState("");
  const [brandContext, setBrandContext] = useState("");
  const [blogUrl, setBlogUrl] = useState("");
  const [blogText, setBlogText] = useState("");
  const [media, setMedia] = useState<LocalMediaItem[]>([]);
  const [aiContext, setAiContext] = useState<AiContext>(EMPTY_CONTEXT);

  const [contextLoading, setContextLoading] = useState(false);
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

  const FLOW_CARDS: {
    id: StudioFlow;
    title: string;
    label: string;
    description: string;
    hint: string;
  }[] = [
    {
      id: "smart",
      title: t("AI wybiera kierunek", "AI chooses the direction"),
      label: t("Rekomendacja z danych", "Data recommendation"),
      description: t(
        "AI analizuje wyniki platformy, najlepsze posty, komentarze i pytania odbiorców, a potem proponuje następny ruch.",
        "AI analyzes platform performance, top posts, comments and audience questions, then suggests the next move."
      ),
      hint: t(
        "Najlepszy tryb, gdy chcesz, żeby aplikacja sama podpowiedziała temat i format.",
        "Best when you want the app to suggest the topic and format by itself."
      ),
    },
    {
      id: "social",
      title: t("Post social media", "Social media post"),
      label: t("Tworzenie postów", "Post creation"),
      description: t(
        "Stwórz gotowy post pod wybraną platformę, ale na podstawie danych, a nie pustego prompta.",
        "Create a post for a selected platform based on data, not an empty prompt."
      ),
      hint: t(
        "Dobre do codziennych publikacji, kampanii i edukacyjnych postów.",
        "Good for daily posts, campaigns and educational content."
      ),
    },
    {
      id: "hooks",
      title: t("Hooki i otwarcia", "Hooks and openings"),
      label: t("Testowanie uwagi", "Attention testing"),
      description: t(
        "AI tworzy hooki na podstawie treści, które wcześniej miały najlepsze wyniki.",
        "AI creates hooks based on content that previously performed best."
      ),
      hint: t(
        "Dobre, gdy chcesz poprawić pierwszy wers posta, rolki albo artykułu.",
        "Good when you want to improve the first line of a post, reel or article."
      ),
    },
    {
      id: "blog",
      title: t("Content z bloga", "Blog to social"),
      label: t("Blog → social", "Blog → social"),
      description: t(
        "Przerób wpis blogowy na treści social media dopasowane do wyników platform.",
        "Turn a blog post into social content adapted to platform performance."
      ),
      hint: t(
        "Idealne do procesu: blog jako źródło, social media jako dystrybucja.",
        "Ideal for the process: blog as the source, social media as distribution."
      ),
    },
    {
      id: "article",
      title: t("Artykuł / wpis blogowy", "Article / blog post"),
      label: t("Dłuższa treść", "Long-form content"),
      description: t(
        "AI proponuje artykuł na podstawie pytań odbiorców, komentarzy i tematów, które już działają.",
        "AI suggests an article based on audience questions, comments and topics that already work."
      ),
      hint: t(
        "Dobre do budowania kampanii wokół jednego mocnego tematu.",
        "Good for building a campaign around one strong topic."
      ),
    },
  ];

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

  useEffect(() => {
    loadAiContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, platform]);

  const canGenerate = useMemo(() => {
    if (flow === "blog") return Boolean(blogText.trim() || blogUrl.trim() || prompt.trim() || aiContext.hasData);
    return Boolean(prompt.trim() || brandContext.trim() || aiContext.hasData);
  }, [flow, prompt, brandContext, blogText, blogUrl, aiContext.hasData]);

  async function loadAiContext() {
    setContextLoading(true);

    try {
      const res = await fetch(
        `/api/content-studio/context?workspaceId=${encodeURIComponent(workspaceId)}&platform=${encodeURIComponent(platform)}`,
        { cache: "no-store" }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.error) {
        setAiContext(EMPTY_CONTEXT);
        return;
      }

      setAiContext({
        ...EMPTY_CONTEXT,
        ...(data?.context || data || {}),
      });
    } catch {
      setAiContext(EMPTY_CONTEXT);
    } finally {
      setContextLoading(false);
    }
  }

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
      setError(t("Wklej link do wpisu blogowego.", "Paste the blog post link."));
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
        throw new Error(data?.error || t("Nie udało się pobrać treści bloga.", "Could not fetch the blog content."));
      }

      setBlogText(data.source_notes || data.text || data.summary || "");
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
        language,
        flow,
        platform,
        selectedPlatforms,
        contentFormat,
        userPrompt: prompt,
        blogUrl,
        blogText,
        brandContext,
        aiContext,
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
            aiContext,
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
        throw new Error(json?.details || json?.error || t("Błąd API.", "API error."));
      }

      const answer = json?.answer || "";
      setRawAnswer(answer);

      const parsed = normalizeStudioResult(
        JSON.parse(cleanJsonAnswer(answer)) as Partial<StudioResult>
      );

      setResult(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const rootStyle = {
    fontFamily: "var(--font-body)",
    color: css.text,
  } as CSSProperties;

  return (
    <div style={rootStyle}>
      <style>{`
        * { box-sizing: border-box; }
        textarea { resize: none; overflow: hidden; }
        .ciq-studio-grid { display:grid; grid-template-columns: 0.92fr 1.08fr; gap:18px; align-items:start; }
        .ciq-flow-grid { display:grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap:10px; }
        .ciq-two { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        button { transition: all .15s ease; }
        button:hover:not(:disabled) { opacity:.86; }
        @media(max-width:1220px) {
          .ciq-flow-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .ciq-studio-grid { grid-template-columns:1fr; }
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
            {t(
              "AI najpierw analizuje wyniki, potem tworzy content",
              "AI analyzes performance first, then creates content"
            )}
          </h2>

          <p style={{ margin: 0, color: css.muted, fontSize: 13, lineHeight: 1.7, maxWidth: 980 }}>
            {t(
              "ContentIQ nie działa jak zwykły chat. Aplikacja sprawdza najlepsze posty, komentarze, formaty i pytania odbiorców, a dopiero potem proponuje temat, hook, treść, CTA i kolejny ruch.",
              "ContentIQ does not work like a regular chat. The app checks top posts, comments, formats and audience questions first, then suggests the topic, hook, copy, CTA and next move."
            )}
          </p>
        </div>

        <AiContextPanel
          css={css}
          lang={language}
          context={aiContext}
          loading={contextLoading}
          onRefresh={loadAiContext}
        />

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
              <SectionLabel color={css.aiText}>
                {t("Aktywny tryb AI", "Active AI mode")}
              </SectionLabel>

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
                <SectionLabel color={css.muted}>{t("Silnik AI", "AI engine")}</SectionLabel>

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
                <SectionLabel color={css.muted}>{t("Format", "Format")}</SectionLabel>

                <select
                  value={contentFormat}
                  onChange={(event) => setContentFormat(event.target.value)}
                  style={{
                    ...inputStyle(css),
                    padding: "11px 12px",
                  }}
                >
                  {CONTENT_FORMATS.map((item) => (
                    <option key={item.pl} value={language === "pl" ? item.pl : item.en}>
                      {language === "pl" ? item.pl : item.en}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {flow !== "blog" && (
              <div>
                <SectionLabel color={css.muted}>
                  {t("Platforma główna", "Primary platform")}
                </SectionLabel>

                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {PLATFORMS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setPlatform(item.id);
                        resetResult();
                      }}
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
                      {language === "pl" ? item.pl : item.en}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {flow === "blog" && (
              <div>
                <SectionLabel color={css.muted}>
                  {t("Platformy dystrybucji bloga", "Blog distribution platforms")}
                </SectionLabel>

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
                        {language === "pl" ? item.pl : item.en}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {flow === "blog" && (
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <SectionLabel color={css.muted}>
                    {t("Link do wpisu blogowego", "Blog post link")}
                  </SectionLabel>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                    <input
                      value={blogUrl}
                      onChange={(event) => setBlogUrl(event.target.value)}
                      placeholder={t(
                        "https://twojastrona.pl/artykul",
                        "https://yourwebsite.com/article"
                      )}
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
                      {scraping ? t("Pobieram...", "Fetching...") : t("Pobierz", "Fetch")}
                    </button>
                  </div>
                </div>

                <div>
                  <SectionLabel color={css.muted}>
                    {t("Treść / streszczenie bloga", "Blog content / summary")}
                  </SectionLabel>

                  <textarea
                    value={blogText}
                    onChange={(event) => setBlogText(event.target.value)}
                    placeholder={t(
                      "Wklej treść artykułu albo pobierz ją z linku. AI połączy blog z danymi z platform i zrobi wersje do dystrybucji.",
                      "Paste the article or fetch it from the link. AI will combine the blog with platform data and create distribution versions."
                    )}
                    style={{ ...inputStyle(css), minHeight: 125, lineHeight: 1.65 }}
                  />
                </div>
              </div>
            )}

            <div>
              <SectionLabel color={css.muted}>
                {t("Doprecyzowanie dla AI — opcjonalnie", "AI refinement — optional")}
              </SectionLabel>

              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={
                  flow === "smart"
                    ? t(
                        "Opcjonalnie: np. skup się na pozyskaniu leadów, użyj miękkiej sprzedaży, przygotuj coś pod demo aplikacji. Możesz zostawić puste — AI użyje danych z platform.",
                        "Optional: e.g. focus on lead generation, use soft sales, prepare something for the app demo. You can leave this empty — AI will use platform data."
                      )
                    : flow === "blog"
                      ? t(
                          "Opcjonalnie: np. link w komentarzu, ton ekspercki na LinkedIn i lżejszy na Facebooku.",
                          "Optional: e.g. link in the comment, expert tone on LinkedIn and lighter tone on Facebook."
                        )
                      : t(
                          "Opcjonalnie: dopisz cel kampanii, ofertę, link albo ton. AI i tak zacznie od danych z platformy.",
                          "Optional: add campaign goal, offer, link or tone. AI will still start from platform data."
                        )
                }
                style={{
                  ...inputStyle(css),
                  minHeight: 105,
                  lineHeight: 1.7,
                }}
              />
            </div>

            <div>
              <SectionLabel color={css.muted}>
                {t("Kontekst marki / oferta / CTA", "Brand context / offer / CTA")}
              </SectionLabel>

              <textarea
                value={brandContext}
                onChange={(event) => setBrandContext(event.target.value)}
                placeholder={t(
                  "Np. ANM Collective tworzy aplikacje B2B/B2C. CTA: zobacz demo, napisz do nas, link do bloga w komentarzu. Jeśli zostawisz puste, AI użyje danych zapisanych w workspace.",
                  "E.g. ANM Collective builds B2B/B2C apps. CTA: see demo, contact us, blog link in the comment. If empty, AI will use workspace data."
                )}
                style={{ ...inputStyle(css), minHeight: 86, lineHeight: 1.65 }}
              />
            </div>

            <MediaPicker media={media} setMedia={setMedia} css={css} lang={language} />

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
                opacity: !canGenerate || loading ? 0.45 : 1,
                fontFamily: "inherit",
              }}
            >
              {loading
                ? t("AI analizuje dane i tworzy...", "AI is analyzing data and creating...")
                : t("Wygeneruj na podstawie danych", "Generate from data")}
            </button>

            {error && (
              <div
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.35)",
                  color: "#fecaca",
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
            {result ? (
              <ResultPanel
                result={result}
                flow={flow}
                platform={platform}
                selectedPlatforms={selectedPlatforms}
                prompt={prompt}
                contentType={contentFormat}
                workspaceId={workspaceId}
                css={css}
                lang={language}
                media={media}
              />
            ) : (
              <div
                style={{
                  minHeight: 340,
                  background: css.surface,
                  border: `1px dashed ${css.border}`,
                  borderRadius: 24,
                  display: "grid",
                  placeItems: "center",
                  padding: 30,
                  textAlign: "center",
                }}
              >
                <div style={{ maxWidth: 520 }}>
                  <div style={{ fontSize: 44, marginBottom: 14, opacity: 0.35 }}>✦</div>

                  <h3
                    style={{
                      margin: "0 0 10px",
                      color: css.heading,
                      fontFamily: "var(--font-heading)",
                      fontSize: 34,
                      lineHeight: 1.05,
                      fontWeight: 500,
                    }}
                  >
                    {t("Wynik pojawi się tutaj", "Your result will appear here")}
                  </h3>

                  <p style={{ margin: 0, color: css.text, fontSize: 14, lineHeight: 1.7 }}>
                    {t(
                      "Content Studio pokaże gotową treść, uzasadnienie oparte na danych, warianty platformowe, hooki, komentarz uzupełniający i plan kolejnych publikacji.",
                      "Content Studio will show ready copy, data-based reasoning, platform variants, hooks, follow-up comment and next publishing plan."
                    )}
                  </p>
                </div>
              </div>
            )}

            {rawAnswer && (
              <details style={{ marginTop: 12 }}>
                <summary style={{ color: css.muted, fontSize: 11, cursor: "pointer" }}>
                  {t("Pokaż surową odpowiedź AI", "Show raw AI response")}
                </summary>

                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    color: css.muted,
                    background: css.surface,
                    border: `1px solid ${css.border}`,
                    borderRadius: 14,
                    padding: 12,
                    fontSize: 11,
                    lineHeight: 1.6,
                    marginTop: 8,
                    maxHeight: 360,
                    overflow: "auto",
                  }}
                >
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
