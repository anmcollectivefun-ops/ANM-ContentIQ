"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";

type CreativePlatform =
  | "instagram"
  | "facebook"
  | "linkedin"
  | "blog"
  | "tiktok"
  | "youtube";

type CreativeAssetType =
  | "post"
  | "cover"
  | "thumbnail"
  | "carousel"
  | "ad";

type CreativeFormat = "1:1" | "4:5" | "9:16" | "16:9";

type ProviderMode = "anm" | "own";

type CreativeStyle =
  | "realistyczny"
  | "minimalistyczny"
  | "premium"
  | "nowoczesny"
  | "brandowy"
  | "editorial"
  | "cinematic";

type DraftImageResult = {
  id: string;
  title: string;
  prompt: string;
  negativePrompt: string;
  overlayText: string;
  platform: CreativePlatform;
  assetType: CreativeAssetType;
  format: CreativeFormat;
  style: CreativeStyle;
  providerMode: ProviderMode;
  generatedImageUrl?: string;
  generatedImageMimeType?: string;
  generationText?: string;
};

type GenerateImageResponse = {
  ok?: boolean;
  error?: string;
  text?: string;
  images?: {
    id: string;
    mimeType: string;
    base64: string;
    dataUrl: string;
  }[];
};

const PLATFORM_OPTIONS: {
  id: CreativePlatform;
  name: string;
  color: string;
  icon: string;
}[] = [
  { id: "instagram", name: "Instagram", color: "#E1306C", icon: "IG" },
  { id: "facebook", name: "Facebook", color: "#1877F2", icon: "FB" },
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2", icon: "LI" },
  { id: "blog", name: "Blog", color: "#22C55E", icon: "BL" },
  { id: "tiktok", name: "TikTok", color: "#F5F5F5", icon: "TT" },
  { id: "youtube", name: "YouTube", color: "#FF0033", icon: "YT" },
];

const ASSET_TYPES: { id: CreativeAssetType; label: string }[] = [
  { id: "post", label: "Grafika do posta" },
  { id: "cover", label: "Okładka / cover" },
  { id: "thumbnail", label: "Miniatura" },
  { id: "carousel", label: "Karuzela / slajd" },
  { id: "ad", label: "Grafika reklamowa" },
];

const FORMAT_OPTIONS: CreativeFormat[] = ["1:1", "4:5", "9:16", "16:9"];

const STYLE_OPTIONS: CreativeStyle[] = [
  "realistyczny",
  "minimalistyczny",
  "premium",
  "nowoczesny",
  "brandowy",
  "editorial",
  "cinematic",
];

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

function getPlatformInfo(platform: CreativePlatform) {
  return PLATFORM_OPTIONS.find((item) => item.id === platform);
}

function buildPrompt({
  platform,
  assetType,
  format,
  style,
  prompt,
  overlayText,
}: {
  platform: CreativePlatform;
  assetType: CreativeAssetType;
  format: CreativeFormat;
  style: CreativeStyle;
  prompt: string;
  overlayText: string;
}) {
  const platformName = getPlatformInfo(platform)?.name || platform;

  const assetLabel =
    ASSET_TYPES.find((item) => item.id === assetType)?.label || assetType;

  return `
Stwórz ${assetLabel.toLowerCase()} na platformę ${platformName}.
Format: ${format}.
Styl: ${style}.
Temat i opis grafiki: ${prompt}.
${overlayText ? `Tekst na grafice: ${overlayText}.` : ""}
Grafika ma być estetyczna, czytelna, nowoczesna i dopasowana do publikacji contentowej.
  `.trim();
}

export default function CreativeStudio({
  dark = true,
  workspaceId = "contentiq",
}: {
  dark?: boolean;
  workspaceId?: string;
}) {
  const supabase = createClient();
  const [providerMode, setProviderMode] = useState<ProviderMode>("anm");
  const [platform, setPlatform] = useState<CreativePlatform>("instagram");
  const [assetType, setAssetType] = useState<CreativeAssetType>("post");
  const [format, setFormat] = useState<CreativeFormat>("1:1");
  const [style, setStyle] = useState<CreativeStyle>("nowoczesny");
  const [variations, setVariations] = useState(3);

  const [prompt, setPrompt] = useState("");
  const [overlayText, setOverlayText] = useState("");
  const [negativePrompt, setNegativePrompt] = useState(
    "rozmazany tekst, zniekształcone dłonie, niska jakość, chaotyczny układ"
  );

  const [results, setResults] = useState<DraftImageResult[]>([]);
  const [savingTemplateId, setSavingTemplateId] = useState<string | null>(null);
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const css: Record<string, string> = dark
    ? {
        bg: "#050505",
        surface: "#111111",
        surfaceSoft: "#0B0B0C",
        text: "#F5F5F5",
        muted: "#A1A1AA",
        border: "#27272A",
        accent: "#E5E7EB",
        aiBg: "#0C1117",
        aiBorder: "#1E3A4C",
        aiText: "#7DD3FC",
      }
    : {
        bg: "#F7F7F7",
        surface: "#FFFFFF",
        surfaceSoft: "#FAFAFA",
        text: "#111111",
        muted: "#71717A",
        border: "#E4E4E7",
        accent: "#111111",
        aiBg: "#F0F9FF",
        aiBorder: "#BAE6FD",
        aiText: "#0284C7",
      };

  const activePlatform = useMemo(() => getPlatformInfo(platform), [platform]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 2800);
  }

  function handlePrepareDrafts() {
    setError("");

    if (!prompt.trim()) {
      setError("Wpisz opis grafiki lub temat.");
      return;
    }

    const nextResults: DraftImageResult[] = Array.from(
      { length: variations },
      (_, index) => ({
        id: `${Date.now()}-${index}`,
        title: `Wariant ${index + 1}`,
        prompt: `${buildPrompt({
          platform,
          assetType,
          format,
          style,
          prompt,
          overlayText,
        })} Wariant kreatywny numer ${index + 1}.`,
        negativePrompt,
        overlayText,
        platform,
        assetType,
        format,
        style,
        providerMode,
      })
    );

    setResults(nextResults);
    showToast("✓ Przygotowano warianty do generowania");
  }

  async function copyPrompt(text: string) {
    await navigator.clipboard.writeText(text);
    showToast("✓ Skopiowano prompt");
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

    const { data: created, error: createError } = await supabase
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

    if (createError || !created?.id) {
      throw new Error(createError?.message || "Nie udało się utworzyć workspace.");
    }

    return created.id as string;
  }

  async function saveCreativeTemplate(item: DraftImageResult) {
    setSavingTemplateId(item.id);
    setError("");

    try {
      const wsId = await getOrCreateWorkspaceUuid();
      const platformName = getPlatformInfo(item.platform)?.name || item.platform;
      const body = [
        `PLATFORMA: ${platformName}`,
        `TYP: ${item.assetType}`,
        `FORMAT: ${item.format}`,
        `STYL: ${item.style}`,
        `TEKST NA GRAFICE: ${item.overlayText || "brak"}`,
        "",
        "PROMPT:",
        item.prompt,
        "",
        "NEGATIVE PROMPT:",
        item.negativePrompt,
      ].join("\n");

      const { error: insertError } = await supabase
        .schema("contentiq")
        .from("content_drafts")
        .insert({
          workspace_id: wsId,
          title: `${item.title} - ${platformName} ${item.format}`,
          body,
          topic: prompt,
          content_type: `Creative Studio / ${item.assetType} / ${item.format}`,
          target_platforms: [item.platform],
          ai_score: null,
          ai_feedback: `Prompt graficzny: ${item.style}, ${item.assetType}, ${item.format}.`,
          status: "template",
        });

      if (insertError) throw new Error(insertError.message);

      showToast("✓ Zapisano szablon creative");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingTemplateId(null);
    }
  }

  async function generateImage(item: DraftImageResult) {
    setGeneratingImageId(item.id);
    setError("");

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: item.prompt,
          negativePrompt: item.negativePrompt,
          aspectRatio: item.format,
          providerMode: item.providerMode,
        }),
      });

      const json = (await response.json()) as GenerateImageResponse;

      if (!response.ok || json.error) {
        throw new Error(json.error || "Nie udało się wygenerować obrazu.");
      }

      const image = json.images?.[0];
      if (!image?.dataUrl) {
        throw new Error("API nie zwróciło obrazu.");
      }

      setResults((current) =>
        current.map((result) =>
          result.id === item.id
            ? {
                ...result,
                generatedImageUrl: image.dataUrl,
                generatedImageMimeType: image.mimeType,
                generationText: json.text,
              }
            : result
        )
      );

      showToast("✓ Wygenerowano obraz");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGeneratingImageId(null);
    }
  }

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

  return (
    <div style={rootStyle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&family=DM+Serif+Display&display=swap');

        * {
          box-sizing: border-box;
        }

        .creative-grid {
          display: grid;
          grid-template-columns: 0.95fr 1.05fr;
          gap: 18px;
          align-items: start;
        }

        .creative-pill:hover,
        .creative-btn:hover {
          transform: translateY(-1px);
          transition: all .18s ease;
        }

        textarea {
          resize: vertical;
        }

        @media (max-width: 980px) {
          .creative-grid {
            grid-template-columns: 1fr;
          }

          .creative-results-grid {
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
            zIndex: 200,
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

      <div className="creative-grid">
        {/* LEFT */}
        <div
          style={{
            background: css.surface,
            border: `1px solid ${css.border}`,
            borderRadius: 22,
            padding: 18,
          }}
        >
          <SectionLabel color={css.accent}>Creative Studio</SectionLabel>

          <h2
            style={{
              margin: "8px 0 10px",
              fontFamily: "'DM Serif Display', serif",
              fontSize: 31,
              lineHeight: 1.05,
              fontWeight: 400,
              color: css.text,
            }}
          >
            Generowanie grafik AI
          </h2>

          <p
            style={{
              margin: "0 0 18px",
              color: css.muted,
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            Przygotuj prompt, wybierz platformę, format i styl. Na tym etapie
            komponent tworzy gotowe warianty do generowania — w kolejnym kroku
            podepniemy API i prawdziwe obrazy.
          </p>

          {/* PROVIDER */}
          <div style={{ marginBottom: 16 }}>
            <SectionLabel color={css.muted}>Źródło generowania</SectionLabel>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="creative-pill"
                onClick={() => setProviderMode("anm")}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: `1.5px solid ${
                    providerMode === "anm" ? css.aiText : css.border
                  }`,
                  background:
                    providerMode === "anm" ? `${css.aiText}18` : "transparent",
                  color: providerMode === "anm" ? css.aiText : css.muted,
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                ANM AI
              </button>

              <button
                type="button"
                className="creative-pill"
                onClick={() => setProviderMode("own")}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: `1.5px solid ${
                    providerMode === "own" ? css.aiText : css.border
                  }`,
                  background:
                    providerMode === "own" ? `${css.aiText}18` : "transparent",
                  color: providerMode === "own" ? css.aiText : css.muted,
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Własny API key
              </button>
            </div>

            <div
              style={{
                marginTop: 8,
                background: css.aiBg,
                border: `1px solid ${css.aiBorder}`,
                borderRadius: 12,
                padding: 10,
                color: css.aiText,
                fontSize: 11,
                lineHeight: 1.6,
              }}
            >
              {providerMode === "anm"
                ? "Tryb ANM AI — później podepniemy limity i generowanie na zasobach aplikacji."
                : "Tryb własny API key — później podepniemy klucz użytkownika z ustawień."}
            </div>
          </div>

          {/* PLATFORM */}
          <div style={{ marginBottom: 16 }}>
            <SectionLabel color={css.muted}>Platforma docelowa</SectionLabel>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PLATFORM_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="creative-pill"
                  onClick={() => setPlatform(item.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: `1.5px solid ${
                      platform === item.id ? item.color : css.border
                    }`,
                    background:
                      platform === item.id ? `${item.color}18` : "transparent",
                    color: platform === item.id ? item.color : css.muted,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          {/* TYPE */}
          <div style={{ marginBottom: 16 }}>
            <SectionLabel color={css.muted}>Typ grafiki</SectionLabel>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ASSET_TYPES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="creative-pill"
                  onClick={() => setAssetType(item.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: `1px solid ${
                      assetType === item.id ? css.accent : css.border
                    }`,
                    background:
                      assetType === item.id ? `${css.accent}14` : "transparent",
                    color: assetType === item.id ? css.text : css.muted,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* FORMAT */}
          <div style={{ marginBottom: 16 }}>
            <SectionLabel color={css.muted}>Format</SectionLabel>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {FORMAT_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="creative-pill"
                  onClick={() => setFormat(item)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: `1px solid ${format === item ? css.accent : css.border}`,
                    background: format === item ? `${css.accent}14` : "transparent",
                    color: format === item ? css.text : css.muted,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* STYLE */}
          <div style={{ marginBottom: 16 }}>
            <SectionLabel color={css.muted}>Styl grafiki</SectionLabel>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {STYLE_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="creative-pill"
                  onClick={() => setStyle(item)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: `1px solid ${style === item ? css.aiText : css.border}`,
                    background: style === item ? `${css.aiText}14` : "transparent",
                    color: style === item ? css.aiText : css.muted,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* VARIATIONS */}
          <div style={{ marginBottom: 16 }}>
            <SectionLabel color={css.muted}>Liczba wariantów</SectionLabel>

            <select
              value={variations}
              onChange={(e) => setVariations(Number(e.target.value))}
              style={{
                width: "100%",
                borderRadius: 14,
                border: `1px solid ${css.border}`,
                background: css.surfaceSoft,
                color: css.text,
                padding: "12px 14px",
                fontSize: 13,
                fontFamily: "inherit",
                outline: "none",
              }}
            >
              <option value={1}>1 wariant</option>
              <option value={2}>2 warianty</option>
              <option value={3}>3 warianty</option>
              <option value={4}>4 warianty</option>
            </select>
          </div>

          {/* PROMPT */}
          <div style={{ marginBottom: 16 }}>
            <SectionLabel color={css.muted}>Opis grafiki / prompt</SectionLabel>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="np. Dynamiczna okładka do shorta o 3 błędach firm na TikToku, ciemne tło, nowoczesny biznesowy klimat, osoba przy laptopie, estetyka SaaS"
              style={{
                width: "100%",
                minHeight: 120,
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

          {/* OVERLAY */}
          <div style={{ marginBottom: 16 }}>
            <SectionLabel color={css.muted}>Tekst na grafice</SectionLabel>

            <input
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value)}
              placeholder="np. 3 błędy firm na TikToku"
              style={{
                width: "100%",
                borderRadius: 14,
                border: `1px solid ${css.border}`,
                background: css.surfaceSoft,
                color: css.text,
                padding: "12px 14px",
                fontSize: 13,
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>

          {/* NEGATIVE */}
          <div style={{ marginBottom: 18 }}>
            <SectionLabel color={css.muted}>Negative prompt</SectionLabel>

            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="np. rozmyty obraz, niska jakość, źle ułożony tekst"
              style={{
                width: "100%",
                minHeight: 90,
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
            onClick={handlePrepareDrafts}
            className="creative-btn"
            style={{
              width: "100%",
              border: "none",
              borderRadius: 16,
              padding: "14px 16px",
              background: dark ? "#ffffff" : "#111111",
              color: dark ? "#050505" : "#ffffff",
              fontSize: 13,
              fontWeight: 900,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ✦ Przygotuj warianty do generowania
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

        {/* RIGHT */}
        <div>
          {results.length === 0 ? (
            <div
              style={{
                minHeight: 540,
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
                  ◫
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
                  Warianty grafik pojawią się tutaj
                </h3>

                <p
                  style={{
                    maxWidth: 390,
                    color: css.muted,
                    fontSize: 13,
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  Na tym etapie komponent tworzy gotowe drafty promptów i układu
                  generowania. W kolejnym kroku podepniemy API i tutaj pojawią
                  się prawdziwe wygenerowane obrazy.
                </p>
              </div>
            </div>
          ) : (
            <div
              className="creative-results-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              {results.map((item, index) => {
                const p = getPlatformInfo(item.platform);

                return (
                  <div
                    key={item.id}
                    style={{
                      background: css.surface,
                      border: `1px solid ${css.border}`,
                      borderRadius: 20,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 14px",
                        background: `${p?.color || css.aiText}14`,
                        borderBottom: `1px solid ${css.border}`,
                      }}
                    >
                      <div
                        style={{
                          color: p?.color || css.aiText,
                          fontSize: 10,
                          fontWeight: 900,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          marginBottom: 3,
                        }}
                      >
                        {p?.name} • {item.format}
                      </div>

                      <div
                        style={{
                          color: css.text,
                          fontSize: 18,
                          fontWeight: 900,
                          lineHeight: 1.2,
                        }}
                      >
                        {item.title}
                      </div>
                    </div>

                    <div style={{ padding: 14 }}>
                      <div
                        style={{
                          aspectRatio: item.format === "9:16" ? "9 / 16" : item.format === "16:9" ? "16 / 9" : item.format === "4:5" ? "4 / 5" : "1 / 1",
                          width: "100%",
                          borderRadius: 16,
                          background:
                            "linear-gradient(135deg, rgba(125,211,252,0.10), rgba(255,255,255,0.04))",
                          border: `1px solid ${css.border}`,
                          display: "grid",
                          placeItems: "center",
                          marginBottom: 12,
                          padding: 14,
                          textAlign: "center",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              color: css.muted,
                              marginBottom: 6,
                              fontWeight: 700,
                            }}
                          >
                            Podgląd miejsca na grafikę
                          </div>

                          {item.overlayText ? (
                            <div
                              style={{
                                fontSize: 18,
                                fontWeight: 900,
                                color: css.text,
                                lineHeight: 1.2,
                              }}
                            >
                              {item.overlayText}
                            </div>
                          ) : (
                            <div
                              style={{
                                fontSize: 14,
                                color: css.text,
                                fontWeight: 800,
                              }}
                            >
                              Wariant {index + 1}
                            </div>
                          )}
                        </div>
                        {item.generatedImageUrl && (
                          <img
                            src={item.generatedImageUrl}
                            alt={item.title}
                            style={{
                              position: "absolute",
                              inset: 0,
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        )}
                      </div>

                      <div
                        style={{
                          marginBottom: 10,
                          background: css.aiBg,
                          border: `1px solid ${css.aiBorder}`,
                          borderRadius: 12,
                          padding: 10,
                        }}
                      >
                        <SectionLabel color={css.aiText}>AI Prompt</SectionLabel>
                        <p
                          style={{
                            margin: 0,
                            color: css.text,
                            fontSize: 12,
                            lineHeight: 1.7,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {item.prompt}
                        </p>
                      </div>

                      <div
                        style={{
                          marginBottom: 10,
                          borderRadius: 12,
                          background: css.surfaceSoft,
                          border: `1px solid ${css.border}`,
                          padding: 10,
                        }}
                      >
                        <SectionLabel color={css.muted}>Negative prompt</SectionLabel>
                        <p
                          style={{
                            margin: 0,
                            color: css.muted,
                            fontSize: 11,
                            lineHeight: 1.6,
                          }}
                        >
                          {item.negativePrompt}
                        </p>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => copyPrompt(item.prompt)}
                          style={{
                            borderRadius: 12,
                            border: `1px solid ${css.border}`,
                            background: css.surface,
                            color: css.muted,
                            padding: "10px 12px",
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          Kopiuj prompt
                        </button>

                        <button
                          type="button"
                          onClick={() => saveCreativeTemplate(item)}
                          disabled={savingTemplateId === item.id}
                          style={{
                            borderRadius: 12,
                            border: `1px solid ${css.aiBorder}`,
                            background: css.aiBg,
                            color: css.aiText,
                            padding: "10px 12px",
                            fontSize: 11,
                            fontWeight: 900,
                            opacity: savingTemplateId === item.id ? 0.6 : 1,
                            cursor: savingTemplateId === item.id ? "not-allowed" : "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          {savingTemplateId === item.id ? "Zapisuję..." : "Zapisz szablon"}
                        </button>

                        <button
                          type="button"
                          onClick={() => generateImage(item)}
                          disabled={generatingImageId === item.id}
                          style={{
                            borderRadius: 12,
                            border: "none",
                            background: dark ? "#ffffff" : "#111111",
                            color: dark ? "#050505" : "#ffffff",
                            padding: "10px 12px",
                            fontSize: 11,
                            fontWeight: 900,
                            opacity: generatingImageId === item.id ? 0.6 : 1,
                            cursor: generatingImageId === item.id ? "not-allowed" : "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          {generatingImageId === item.id ? "Generuję..." : "Generuj obraz"}
                        </button>
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          color: css.muted,
                          fontSize: 10,
                          lineHeight: 1.6,
                        }}
                      >
                        Provider: {item.providerMode === "anm" ? "ANM AI" : "Własny API key"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
