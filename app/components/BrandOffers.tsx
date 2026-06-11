"use client";

// app/components/BrandOffers.tsx
// Centrum oferty / produkty / aplikacje / linki marki dla ANM ContentIQ

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Wand2,
  Package,
  Plus,
  Save,
  Trash2,
  Star,
  Link as LinkIcon,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useContentIQLanguage } from "@/lib/contentiq-language";

type OfferStatus = "active" | "draft" | "archived";
type AiProvider = "deepseek" | "gemini";

type Platform =
  | "linkedin"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "blog"
  | "spotify";

interface BrandOffer {
  id?: string;
  workspace_id?: string;
  name: string;
  offer_type: string;
  url: string;
  image_url: string;
  short_description: string;
  full_description: string;
  target_audience: string;
  pain_points: string[];
  benefits: string[];
  features: string[];
  cta_options: string[];
  keywords: string[];
  avoid_words: string[];
  content_angles: string[];
  platforms: string[];
  status: OfferStatus;
  is_primary: boolean;
  created_at?: string;
  updated_at?: string;
}

const EMPTY_OFFER: BrandOffer = {
  name: "",
  offer_type: "aplikacja",
  url: "",
  image_url: "",
  short_description: "",
  full_description: "",
  target_audience: "",
  pain_points: [],
  benefits: [],
  features: [],
  cta_options: [],
  keywords: [],
  avoid_words: [],
  content_angles: [],
  platforms: ["linkedin", "instagram", "facebook"],
  status: "active",
  is_primary: false,
};

const OFFER_TYPES = [
  "aplikacja",
  "usługa",
  "szkolenie",
  "kurs",
  "webinar",
  "ebook",
  "landing page",
  "produkt",
  "konsultacja",
  "case study",
  "portfolio",
];

const PLATFORMS: { id: Platform; name: string; color: string }[] = [
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2" },
  { id: "instagram", name: "Instagram", color: "#E1306C" },
  { id: "tiktok", name: "TikTok", color: "#FFFFFF" },
  { id: "youtube", name: "YouTube", color: "#FF0033" },
  { id: "facebook", name: "Facebook", color: "#1877F2" },
  { id: "blog", name: "Blog", color: "#22C55E" },
  { id: "spotify", name: "Spotify", color: "#1DB954" },
];

function safeArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
}

function cleanJsonAnswer(answer: string) {
  return answer
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeOffer(row: Partial<BrandOffer>): BrandOffer {
  return {
    ...EMPTY_OFFER,
    ...row,
    name: row.name || "",
    offer_type: row.offer_type || "aplikacja",
    url: row.url || "",
    image_url: row.image_url || "",
    short_description: row.short_description || "",
    full_description: row.full_description || "",
    target_audience: row.target_audience || "",
    pain_points: safeArray(row.pain_points),
    benefits: safeArray(row.benefits),
    features: safeArray(row.features),
    cta_options: safeArray(row.cta_options),
    keywords: safeArray(row.keywords),
    avoid_words: safeArray(row.avoid_words),
    content_angles: safeArray(row.content_angles),
    platforms: safeArray(row.platforms),
    status: (row.status as OfferStatus) || "active",
    is_primary: Boolean(row.is_primary),
  };
}

function arrayToText(values: string[]) {
  return safeArray(values).join("\n");
}

function textToArray(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getOfferScore(offer: BrandOffer) {
  let score = 0;
  if (offer.name) score += 10;
  if (offer.url) score += 10;
  if (offer.short_description) score += 15;
  if (offer.full_description) score += 15;
  if (offer.target_audience) score += 15;
  if (offer.benefits.length) score += 12;
  if (offer.features.length) score += 8;
  if (offer.cta_options.length) score += 8;
  if (offer.content_angles.length) score += 7;
  return Math.min(100, score);
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
        letterSpacing: ".12em",
        color,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function SmallButton({
  children,
  onClick,
  disabled,
  css,
  accent = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  css: Record<string, string>;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        borderRadius: 12,
        border: `1px solid ${accent ? css.aiBorder : css.border}`,
        background: accent ? css.aiBgSoft : css.surfaceSoft,
        color: accent ? css.aiText : css.text,
        padding: "9px 11px",
        fontSize: 11,
        fontWeight: 900,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        fontFamily: "var(--font-body)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
      }}
    >
      {children}
    </button>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  css,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  css: Record<string, string>;
  type?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 7 }}>
      <SectionLabel color={css.muted}>{label}</SectionLabel>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          borderRadius: 14,
          border: `1px solid ${css.border}`,
          background: css.surfaceSoft,
          color: css.text,
          padding: "11px 12px",
          outline: "none",
          fontFamily: "var(--font-body)",
          fontSize: 13,
        }}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  css,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  css: Record<string, string>;
  rows?: number;
}) {
  return (
    <label style={{ display: "grid", gap: 7 }}>
      <SectionLabel color={css.muted}>{label}</SectionLabel>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: "100%",
          borderRadius: 14,
          border: `1px solid ${css.border}`,
          background: css.surfaceSoft,
          color: css.text,
          padding: "11px 12px",
          outline: "none",
          fontFamily: "var(--font-body)",
          fontSize: 13,
          lineHeight: 1.65,
          resize: "vertical",
        }}
      />
    </label>
  );
}

function ArrayEditor({
  label,
  values,
  onChange,
  placeholder,
  css,
  color,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  css: Record<string, string>;
  color?: string;
}) {
  const c = color || css.accent;

  return (
    <div>
      <SectionLabel color={css.muted}>{label}</SectionLabel>
      <textarea
        value={arrayToText(values)}
        onChange={(event) => onChange(textToArray(event.target.value))}
        placeholder={placeholder}
        rows={4}
        style={{
          width: "100%",
          borderRadius: 14,
          border: `1px solid ${css.border}`,
          background: css.surfaceSoft,
          color: css.text,
          padding: "11px 12px",
          outline: "none",
          fontFamily: "var(--font-body)",
          fontSize: 13,
          lineHeight: 1.65,
          resize: "vertical",
        }}
      />

      {values.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {values.slice(0, 12).map((item, index) => (
            <span
              key={`${label}-${item}-${index}`}
              style={{
                borderRadius: 999,
                border: `1px solid ${c}45`,
                background: `${c}18`,
                color: c,
                padding: "5px 8px",
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BrandOffers({
  dark = true,
  workspaceId = "contentiq",
}: {
  dark?: boolean;
  workspaceId?: string;
}) {
  const { lang, text } = useContentIQLanguage();
  const supabase = createClient();

  const css: Record<string, string> = dark
    ? {
        bg: "#1A2233",
        surface: "#050505",
        surfaceSoft: "#0B0B0D",
        text: "#FFFFFF",
        muted: "#C9CED8",
        border: "rgba(255,255,255,0.10)",
        accent: "#8E443D",
        heading: "#8E443D",
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
        heading: "#231F20",
        aiBg: "rgba(124, 58, 237, 0.10)",
        aiBgSoft: "rgba(245, 243, 255, 0.95)",
        aiBorder: "rgba(124, 58, 237, 0.34)",
        aiText: "#6D28D9",
        aiGlow: "0 0 26px rgba(124, 58, 237, 0.18)",
        aiIcon: "#A855F7",
      };

  const [workspaceUuid, setWorkspaceUuid] = useState("");
  const [offers, setOffers] = useState<BrandOffer[]>([]);
  const [activeId, setActiveId] = useState<string>("new");
  const [draft, setDraft] = useState<BrandOffer>(EMPTY_OFFER);
  const [aiProvider, setAiProvider] = useState<AiProvider>("gemini");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const activeScore = useMemo(() => getOfferScore(draft), [draft]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  }

  function updateDraft(patch: Partial<BrandOffer>) {
    setDraft((current) => ({ ...current, ...patch }));
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
    if (existing?.id) {
      setWorkspaceUuid(existing.id as string);
      return existing.id as string;
    }

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

    setWorkspaceUuid(created.id as string);
    return created.id as string;
  }

  async function loadOffers() {
    setLoading(true);
    setError("");

    try {
      const wsId = await getOrCreateWorkspaceUuid();

      const { data, error: fetchError } = await supabase
        .schema("contentiq")
        .from("brand_offers")
        .select("*")
        .eq("workspace_id", wsId)
        .order("is_primary", { ascending: false })
        .order("updated_at", { ascending: false });

      if (fetchError) throw new Error(fetchError.message);

      const normalized = (data || []).map((row) => normalizeOffer(row));

      setOffers(normalized);

      if (normalized.length > 0) {
        const first = normalized[0];
        setActiveId(first.id || "new");
        setDraft(first);
      } else {
        setActiveId("new");
        setDraft({ ...EMPTY_OFFER });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  function startNewOffer() {
    setActiveId("new");
    setDraft({ ...EMPTY_OFFER });
    setError("");
  }

  function selectOffer(offer: BrandOffer) {
    setActiveId(offer.id || "new");
    setDraft(normalizeOffer(offer));
    setError("");
  }

  async function saveOffer() {
    setSaving(true);
    setError("");

    try {
      const wsId = workspaceUuid || (await getOrCreateWorkspaceUuid());

      if (!draft.name.trim()) {
        throw new Error("Dodaj nazwę oferty, produktu albo aplikacji.");
      }

      const payload = {
        workspace_id: wsId,
        name: draft.name.trim(),
        offer_type: draft.offer_type || "product",
        url: draft.url.trim() || null,
        image_url: draft.image_url.trim() || null,
        short_description: draft.short_description.trim() || null,
        full_description: draft.full_description.trim() || null,
        target_audience: draft.target_audience.trim() || null,
        pain_points: safeArray(draft.pain_points),
        benefits: safeArray(draft.benefits),
        features: safeArray(draft.features),
        cta_options: safeArray(draft.cta_options),
        keywords: safeArray(draft.keywords),
        avoid_words: safeArray(draft.avoid_words),
        content_angles: safeArray(draft.content_angles),
        platforms: safeArray(draft.platforms),
        status: draft.status || "active",
        is_primary: Boolean(draft.is_primary),
        updated_at: new Date().toISOString(),
      };

      if (payload.is_primary) {
        await supabase
          .schema("contentiq")
          .from("brand_offers")
          .update({ is_primary: false })
          .eq("workspace_id", wsId);
      }

      if (draft.id) {
        const { error: updateError } = await supabase
          .schema("contentiq")
          .from("brand_offers")
          .update(payload)
          .eq("id", draft.id);

        if (updateError) throw new Error(updateError.message);
      } else {
        const { data: created, error: insertError } = await supabase
          .schema("contentiq")
          .from("brand_offers")
          .insert(payload)
          .select("*")
          .single();

        if (insertError) throw new Error(insertError.message);
        if (created?.id) {
          setDraft(normalizeOffer(created));
          setActiveId(created.id as string);
        }
      }

      await loadOffers();
      showToast("✓ Oferta zapisana");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteOffer() {
    if (!draft.id) return;

    const ok = window.confirm("Usunąć tę ofertę z bazy marki?");
    if (!ok) return;

    setDeleting(true);
    setError("");

    try {
      const { error: deleteError } = await supabase
        .schema("contentiq")
        .from("brand_offers")
        .delete()
        .eq("id", draft.id);

      if (deleteError) throw new Error(deleteError.message);

      await loadOffers();
      showToast("✓ Oferta usunięta");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  }

  async function suggestWithAi() {
    setAiLoading(true);
    setError("");

    try {
      let websiteContext = "";
      let scrapeWarning = "";

      if (draft.url.trim()) {
        try {
          const scrapeRes = await fetch("/api/brand/scrape", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: draft.url.trim() }),
          });
          const scrapeJson = await scrapeRes.json().catch(() => null);

          if (scrapeRes.ok && scrapeJson?.source_notes) {
            websiteContext = String(scrapeJson.source_notes);
          } else {
            scrapeWarning =
              scrapeJson?.error ||
              "Nie udało się odczytać strony. AI użyło danych wpisanych w formularzu.";
          }
        } catch {
          scrapeWarning =
            "Nie udało się odczytać strony. AI użyło danych wpisanych w formularzu.";
        }
      }

      const prompt = `
Jesteś strategiem marki w aplikacji ANM ContentIQ.

Uzupełnij opis oferty tak, żeby AI mogło później tworzyć wokół niej content sprzedażowy, edukacyjny, blogowy i social media.

Nie wymyślaj faktów, których nie ma. Jeżeli czegoś brakuje, uzupełnij jako rozsądną propozycję do edycji przez użytkownika.

DANE OFERTY:
${JSON.stringify(draft, null, 2)}

TREŚĆ POBRANA ZE STRONY OFERTY:
${websiteContext || "Brak pobranej treści strony. Korzystaj wyłącznie z danych formularza i nie udawaj, że odwiedziłeś link."}

Zwróć wyłącznie JSON bez markdown:
{
  "name": "nazwa oferty",
  "offer_type": "aplikacja/usługa/kurs/szkolenie/webinar/produkt",
  "short_description": "jednozdaniowy opis do użycia w content marketingu",
  "full_description": "pełniejszy opis oferty",
  "target_audience": "dla kogo jest oferta",
  "pain_points": ["problem odbiorcy 1", "problem odbiorcy 2"],
  "benefits": ["korzyść 1", "korzyść 2"],
  "features": ["funkcja / element oferty 1", "funkcja / element oferty 2"],
  "cta_options": ["miękkie CTA", "CTA na LinkedIn", "CTA na TikTok/Instagram", "CTA sprzedażowe"],
  "keywords": ["słowo kluczowe 1", "słowo kluczowe 2"],
  "avoid_words": ["czego unikać w komunikacji"],
  "content_angles": ["pomysł na serię contentu 1", "pomysł na serię contentu 2"],
  "platforms": ["linkedin", "instagram", "facebook", "blog"]
}
      `.trim();

      async function requestAi(provider: AiProvider) {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "chat",
            provider,
            ai_provider: provider,
            prompt,
          }),
        });
        const data = await response.json().catch(() => null);
        return { response, data };
      }

      let usedProvider = aiProvider;
      let { response: res, data: json } = await requestAi(aiProvider);

      if ((!res.ok || json?.error) && aiProvider === "gemini") {
        const details = String(json?.details || json?.error || "");
        const isTemporaryGeminiError =
          res.status === 503 ||
          /503|unavailable|high demand|overloaded|try again later/i.test(details);

        if (isTemporaryGeminiError) {
          usedProvider = "deepseek";
          ({ response: res, data: json } = await requestAi("deepseek"));
        }
      }

      if (!res.ok || json?.error) {
        const details = String(json?.details || json?.error || "Błąd AI.");
        if (/503|unavailable|high demand|overloaded/i.test(details)) {
          throw new Error(
            "Wybrany model AI jest chwilowo przeciążony. Spróbuj ponownie za moment albo wybierz drugi silnik."
          );
        }
        throw new Error(details);
      }

      const parsed = JSON.parse(cleanJsonAnswer(json.answer || "{}"));

      setDraft((current) =>
        normalizeOffer({
          ...current,
          ...parsed,
          id: current.id,
          workspace_id: current.workspace_id,
          url: current.url || parsed.url || "",
          image_url: current.image_url || parsed.image_url || "",
          status: current.status || "active",
          is_primary: current.is_primary,
        })
      );

      showToast(
        scrapeWarning
          ? `AI uzupełniło ofertę. ${scrapeWarning}`
          : `AI uzupełniło ofertę przez ${usedProvider === "gemini" ? "Gemini" : "DeepSeek"}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiLoading(false);
    }
  }

  async function makePrimary() {
    updateDraft({ is_primary: true });
    setTimeout(() => {
      void saveOffer();
    }, 0);
  }

  if (loading) {
    return (
      <div
        style={{
          color: css.muted,
          fontFamily: "var(--font-body)",
          padding: 40,
          textAlign: "center",
        }}
      >
        Ładowanie ofert marki...
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "var(--font-body)",
        color: css.text,
        display: "grid",
        gap: 18,
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        .bo-card-hover { transition: transform .16s ease, border-color .16s ease, background .16s ease; }
        .bo-card-hover:hover { transform: translateY(-1px); border-color: ${css.accent}; }
        .bo-grid { display: grid; grid-template-columns: 330px minmax(0, 1fr); gap: 18px; align-items: start; }
        .bo-two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .bo-three { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        @media(max-width: 980px) {
          .bo-grid, .bo-two, .bo-three { grid-template-columns: 1fr; }
        }
      `}</style>

      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 999,
            borderRadius: 12,
            padding: "10px 16px",
            background: "#052e16",
            border: "1px solid #166534",
            color: "#22c55e",
            fontSize: 13,
            fontWeight: 800,
            boxShadow: "0 18px 44px rgba(0,0,0,.35)",
          }}
        >
          {toast}
        </div>
      )}

      <div
        style={{
          background: css.surface,
          border: `1px solid ${css.border}`,
          borderRadius: 24,
          padding: 20,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: 22,
            top: 8,
            fontFamily: "var(--font-heading)",
            fontSize: 112,
            lineHeight: 1,
            opacity: 0.045,
            color: css.accent,
            pointerEvents: "none",
          }}
        >
          Offer
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <p
            style={{
              margin: "0 0 7px",
              color: css.accent,
              fontFamily: "var(--font-label)",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: ".12em",
              textTransform: "uppercase",
            }}
          >
            {text("Oferta i linki marki", "Brand offers and links")}
          </p>

          <h2
            style={{
              margin: "0 0 10px",
              color: css.heading,
              fontFamily: "var(--font-heading)",
              fontSize: 31,
              lineHeight: 1.04,
              fontWeight: 500,
            }}
          >
            {text("Powiedz AI, co firma sprzedaje, promuje i rozwija", "Tell AI what your company sells, promotes and builds")}
          </h2>

          <p
            style={{
              margin: 0,
              color: css.muted,
              fontSize: 13,
              lineHeight: 1.75,
              maxWidth: 900,
            }}
          >
            {text(
              "Content nie powstaje w próżni. Dodaj aplikacje, kursy, usługi, landing page, webinary, ebooki albo konsultacje. AI będzie mogło dobierać CTA, linki, argumenty sprzedażowe i tematy blogowe pod realną ofertę marki.",
              "Content does not exist in a vacuum. Add apps, courses, services, landing pages, webinars, ebooks or consulting offers so AI can select relevant CTAs, links, sales arguments and blog topics."
            )}
          </p>
        </div>
      </div>

      <div className="bo-grid">
        <aside
          style={{
            background: css.surface,
            border: `1px solid ${css.border}`,
            borderRadius: 22,
            padding: 14,
            display: "grid",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={startNewOffer}
            style={{
              borderRadius: 16,
              border: `1px solid ${css.aiBorder}`,
              background: css.aiBgSoft,
              color: css.aiText,
              padding: "12px 13px",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              fontSize: 12,
              fontWeight: 900,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: css.aiGlow,
            }}
          >
            <Plus size={15} />
            Dodaj ofertę
          </button>

          {offers.length === 0 && (
            <div
              style={{
                borderRadius: 16,
                border: `1px dashed ${css.border}`,
                padding: 16,
                color: css.muted,
                fontSize: 12,
                lineHeight: 1.65,
                textAlign: "center",
              }}
            >
              Nie masz jeszcze żadnej oferty. Dodaj pierwszą aplikację, kurs,
              usługę albo landing page.
            </div>
          )}

          {offers.map((offer) => {
            const active = activeId === offer.id;
            const score = getOfferScore(offer);

            return (
              <button
                key={offer.id}
                type="button"
                onClick={() => selectOffer(offer)}
                className="bo-card-hover"
                style={{
                  textAlign: "left",
                  borderRadius: 18,
                  border: `1px solid ${active ? css.accent : css.border}`,
                  background: active ? `${css.accent}14` : css.surfaceSoft,
                  padding: 13,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  color: css.text,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {offer.is_primary && (
                  <div
                    style={{
                      position: "absolute",
                      right: 10,
                      top: 10,
                      color: "#f59e0b",
                    }}
                  >
                    <Star size={14} fill="#f59e0b" />
                  </div>
                )}

                <div
                  style={{
                    color: css.heading,
                    fontFamily: "var(--font-heading)",
                    fontSize: 21,
                    lineHeight: 1.05,
                    paddingRight: 22,
                  }}
                >
                  {offer.name || "Oferta bez nazwy"}
                </div>

                <div
                  style={{
                    marginTop: 5,
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      borderRadius: 999,
                      background: `${css.accent}18`,
                      color: css.accent,
                      padding: "4px 7px",
                      fontSize: 10,
                      fontWeight: 900,
                    }}
                  >
                    {offer.offer_type}
                  </span>

                  <span
                    style={{
                      color: score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#ef4444",
                      fontSize: 10,
                      fontWeight: 900,
                    }}
                  >
                    {score}% uzupełnienia
                  </span>
                </div>

                <p
                  style={{
                    margin: "9px 0 0",
                    color: css.muted,
                    fontSize: 11,
                    lineHeight: 1.55,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {offer.short_description ||
                    offer.full_description ||
                    "Brak krótkiego opisu oferty."}
                </p>
              </button>
            );
          })}
        </aside>

        <main
          style={{
            background: css.surface,
            border: `1px solid ${css.border}`,
            borderRadius: 24,
            padding: 18,
            display: "grid",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div>
              <SectionLabel color={css.accent}>
                {draft.id ? "Edycja oferty" : "Nowa oferta"}
              </SectionLabel>

              <h3
                style={{
                  margin: 0,
                  color: css.heading,
                  fontFamily: "var(--font-heading)",
                  fontSize: 28,
                  lineHeight: 1.05,
                  fontWeight: 500,
                }}
              >
                {draft.name || "Dodaj produkt, usługę albo aplikację"}
              </h3>

              <p
                style={{
                  margin: "8px 0 0",
                  color: css.muted,
                  fontSize: 12,
                  lineHeight: 1.65,
                  maxWidth: 720,
                }}
              >
                Im dokładniej opiszesz ofertę, tym lepiej AI dobierze tematy,
                CTA, kąty sprzedażowe i linki w Content Studio, Blog Studio,
                AI Partnerze oraz Strategu.
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["gemini", "deepseek"] as AiProvider[]).map((provider) => (
                <button
                  key={provider}
                  type="button"
                  onClick={() => setAiProvider(provider)}
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${
                      aiProvider === provider ? css.aiBorder : css.border
                    }`,
                    background:
                      aiProvider === provider ? css.aiBgSoft : css.surfaceSoft,
                    color: aiProvider === provider ? css.aiText : css.muted,
                    padding: "9px 11px",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 900,
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {provider === "gemini" ? "Gemini" : "DeepSeek"}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 10,
              alignItems: "center",
              padding: 12,
              borderRadius: 18,
              background: css.surfaceSoft,
              border: `1px solid ${css.border}`,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: ".09em",
                  textTransform: "uppercase",
                  color: css.muted,
                  marginBottom: 6,
                }}
              >
                Gotowość oferty dla AI
              </div>

              <div
                style={{
                  height: 8,
                  borderRadius: 999,
                  background: dark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.08)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${activeScore}%`,
                    height: "100%",
                    background:
                      activeScore >= 70
                        ? "#22c55e"
                        : activeScore >= 45
                          ? "#f59e0b"
                          : "#ef4444",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                color:
                  activeScore >= 70
                    ? "#22c55e"
                    : activeScore >= 45
                      ? "#f59e0b"
                      : "#ef4444",
                fontFamily: "var(--font-heading)",
                fontSize: 28,
                lineHeight: 1,
              }}
            >
              {activeScore}%
            </div>
          </div>

          <div className="bo-three">
            <TextInput
              label="Nazwa oferty"
              value={draft.name}
              onChange={(value) => updateDraft({ name: value })}
              placeholder="np. ANM ContentIQ"
              css={css}
            />

            <label style={{ display: "grid", gap: 7 }}>
              <SectionLabel color={css.muted}>{text("Typ", "Type")}</SectionLabel>
              <select
                value={draft.offer_type}
                onChange={(event) => updateDraft({ offer_type: event.target.value })}
                style={{
                  width: "100%",
                  borderRadius: 14,
                  border: `1px solid ${css.border}`,
                  background: css.surfaceSoft,
                  color: css.text,
                  padding: "11px 12px",
                  outline: "none",
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                }}
              >
                {OFFER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 7 }}>
              <SectionLabel color={css.muted}>{text("Status", "Status")}</SectionLabel>
              <select
                value={draft.status}
                onChange={(event) =>
                  updateDraft({ status: event.target.value as OfferStatus })
                }
                style={{
                  width: "100%",
                  borderRadius: 14,
                  border: `1px solid ${css.border}`,
                  background: css.surfaceSoft,
                  color: css.text,
                  padding: "11px 12px",
                  outline: "none",
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                }}
              >
                <option value="active">active</option>
                <option value="draft">draft</option>
                <option value="archived">archived</option>
              </select>
            </label>
          </div>

          <div className="bo-two">
            <TextInput
              label="Link do oferty"
              value={draft.url}
              onChange={(value) => updateDraft({ url: value })}
              placeholder="https://..."
              css={css}
            />

            <TextInput
              label="Logo / grafika URL"
              value={draft.image_url}
              onChange={(value) => updateDraft({ image_url: value })}
              placeholder="https://.../image.webp"
              css={css}
            />
          </div>

          {(draft.url || draft.image_url) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: draft.image_url ? "120px 1fr" : "1fr",
                gap: 12,
                alignItems: "stretch",
              }}
            >
              {draft.image_url && (
                <div
                  style={{
                    borderRadius: 18,
                    border: `1px solid ${css.border}`,
                    background: css.surfaceSoft,
                    minHeight: 96,
                    overflow: "hidden",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <img
                    src={draft.image_url}
                    alt={draft.name || "Oferta"}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                  {!draft.image_url && <ImageIcon size={22} color={css.muted} />}
                </div>
              )}

              {draft.url && (
                <a
                  href={draft.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    borderRadius: 18,
                    border: `1px solid ${css.border}`,
                    background: css.surfaceSoft,
                    color: css.text,
                    padding: 14,
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    minHeight: 96,
                  }}
                >
                  <LinkIcon size={18} color={css.accent} />
                  <div>
                    <div
                      style={{
                        color: css.heading,
                        fontFamily: "var(--font-heading)",
                        fontSize: 22,
                        lineHeight: 1.1,
                      }}
                    >
                      Otwórz link oferty
                    </div>
                    <div style={{ color: css.muted, fontSize: 12, marginTop: 5 }}>
                      {draft.url}
                    </div>
                  </div>
                </a>
              )}
            </div>
          )}

          <TextArea
            label="Krótki opis do contentu"
            value={draft.short_description}
            onChange={(value) => updateDraft({ short_description: value })}
            placeholder="Jedno zdanie, które AI może używać w postach, CTA i opisach."
            css={css}
            rows={3}
          />

          <TextArea
            label="Pełniejszy opis oferty"
            value={draft.full_description}
            onChange={(value) => updateDraft({ full_description: value })}
            placeholder="Co to jest, jaki problem rozwiązuje, dla kogo, jak działa i dlaczego warto."
            css={css}
            rows={5}
          />

          <TextArea
            label="Grupa docelowa"
            value={draft.target_audience}
            onChange={(value) => updateDraft({ target_audience: value })}
            placeholder="Dla kogo jest ta oferta? Firmy, twórcy, kursanci, pacjenci, agencje, właściciele biznesów..."
            css={css}
            rows={3}
          />

          <div>
            <SectionLabel color={css.muted}>{text("Platformy, na których promujemy", "Promotion platforms")}</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PLATFORMS.map((platform) => {
                const active = draft.platforms.includes(platform.id);
                const color =
                  platform.id === "tiktok" && !dark ? "#111827" : platform.color;

                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => {
                      const exists = draft.platforms.includes(platform.id);
                      updateDraft({
                        platforms: exists
                          ? draft.platforms.filter((id) => id !== platform.id)
                          : [...draft.platforms, platform.id],
                      });
                    }}
                    style={{
                      borderRadius: 12,
                      border: `1px solid ${active ? color : css.border}`,
                      background: active ? `${color}18` : css.surfaceSoft,
                      color: active ? color : css.muted,
                      padding: "8px 10px",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 900,
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {platform.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bo-two">
            <ArrayEditor
              label="Problemy odbiorcy"
              values={draft.pain_points}
              onChange={(values) => updateDraft({ pain_points: values })}
              placeholder="Każdy problem w nowej linii, np. brak czasu na content"
              css={css}
              color="#ef4444"
            />

            <ArrayEditor
              label="Korzyści"
              values={draft.benefits}
              onChange={(values) => updateDraft({ benefits: values })}
              placeholder="Każda korzyść w nowej linii, np. mniej chaosu w planowaniu"
              css={css}
              color="#22c55e"
            />
          </div>

          <div className="bo-two">
            <ArrayEditor
              label="Funkcje / elementy oferty"
              values={draft.features}
              onChange={(values) => updateDraft({ features: values })}
              placeholder="np. AI Partner, Harmonogram, Analiza kont"
              css={css}
              color={css.accent}
            />

            <ArrayEditor
              label="CTA / wezwania do działania"
              values={draft.cta_options}
              onChange={(values) => updateDraft({ cta_options: values })}
              placeholder="np. Zobacz demo, Napisz do nas, Sprawdź moduł"
              css={css}
              color={css.aiText}
            />
          </div>

          <div className="bo-two">
            <ArrayEditor
              label="Słowa kluczowe"
              values={draft.keywords}
              onChange={(values) => updateDraft({ keywords: values })}
              placeholder="np. AI, content, automatyzacja, strategia"
              css={css}
              color="#22c55e"
            />

            <ArrayEditor
              label="Słowa, których unikać"
              values={draft.avoid_words}
              onChange={(values) => updateDraft({ avoid_words: values })}
              placeholder="np. nachalna sprzedaż, obietnice bez pokrycia"
              css={css}
              color="#ef4444"
            />
          </div>

          <ArrayEditor
            label="Kąty contentowe / serie wokół tej oferty"
            values={draft.content_angles}
            onChange={(values) => updateDraft({ content_angles: values })}
            placeholder="np. Jak planować content na podstawie danych&#10;Kulisy budowy aplikacji&#10;Błędy w publikowaniu na social media"
            css={css}
            color={css.aiText}
          />

          <div
            style={{
              background: css.surface,
              border: `1px solid ${css.aiBorder}`,
              boxShadow: css.aiGlow,
              borderRadius: 20,
              padding: 15,
              display: "grid",
              gap: 12,
            }}
          >
            <div
              style={{
                color: css.aiText,
                fontFamily: "var(--font-label)",
                fontWeight: 900,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <Wand2 size={15} color={css.aiIcon} />
              AI jako strateg oferty
            </div>

            <p
              style={{
                margin: 0,
                color: css.muted,
                fontSize: 12,
                lineHeight: 1.7,
              }}
            >
              Wpisz minimum nazwę, typ i link albo krótki opis. AI może
              uzupełnić korzyści, CTA, problemy odbiorców i kąty contentowe.
              Potem te dane wykorzystamy w Content Studio, Blog Studio,
              AI Partnerze i Strategu.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
              }}
            >
              <SmallButton
                css={css}
                accent
                disabled={aiLoading}
                onClick={suggestWithAi}
              >
                <Sparkles size={14} />
                {aiLoading ? "AI myśli..." : "Uzupełnij z AI"}
              </SmallButton>

              <SmallButton
                css={css}
                disabled={!draft.id || draft.is_primary}
                onClick={makePrimary}
              >
                <Star size={14} />
                Ustaw jako główną
              </SmallButton>

              <SmallButton
                css={css}
                disabled={!draft.id || deleting}
                onClick={deleteOffer}
              >
                <Trash2 size={14} />
                {deleting ? "Usuwam..." : "Usuń"}
              </SmallButton>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ color: css.muted, fontSize: 12, lineHeight: 1.55 }}>
              {draft.is_primary
                ? "Ta oferta jest oznaczona jako główna. AI może ją traktować jako priorytet sprzedażowy."
                : "Możesz oznaczyć jedną ofertę jako główną, żeby AI częściej brało ją pod uwagę."}
            </div>

            <button
              type="button"
              onClick={saveOffer}
              disabled={saving}
              style={{
                borderRadius: 15,
                border: "none",
                background: dark ? "#ffffff" : "#111111",
                color: dark ? "#050505" : "#ffffff",
                padding: "13px 18px",
                fontSize: 13,
                fontWeight: 900,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
                fontFamily: "var(--font-body)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Save size={15} />
              {saving ? "Zapisuję..." : "Zapisz ofertę"}
            </button>
          </div>

          {error && (
            <div
              style={{
                borderRadius: 14,
                background: "#ef444414",
                border: "1px solid #ef444440",
                color: "#ef4444",
                padding: 12,
                fontSize: 12,
                lineHeight: 1.65,
              }}
            >
              {error}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
