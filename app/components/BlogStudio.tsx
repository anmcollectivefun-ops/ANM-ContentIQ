"use client";


import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen,
  FileText,
  Lightbulb,
  Link2,
  PenLine,
  RefreshCw,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";

type AiProvider = "deepseek" | "gemini";
type BlogStatus = "draft" | "template";
type Platform = "linkedin" | "instagram" | "tiktok" | "youtube" | "facebook" | "blog";

type BlogDraft = {
  id?: string;
  title: string;
  topic: string;
  body: string;
  angle: string;
  audience: string;
  cta: string;
  source_url: string;
  notes: string;
  status: BlogStatus;
};

type BlogAiAction =
  | "idea"
  | "start"
  | "continue"
  | "words"
  | "improve"
  | "outline"
  | "seo"
  | "social";

type ChatResponse = {
  answer?: string;
  error?: string;
  details?: string;
};

type ScrapeResponse = {
  ok?: boolean;
  title?: string;
  description?: string;
  source_notes?: string;
  text?: string;
  error?: string;
};
type BrandOffer = {
  id: string;
  name: string;
  offer_type: string | null;
  url: string | null;
  image_url: string | null;
  short_description: string | null;
  full_description: string | null;
  target_audience: string | null;
  pain_points: string[] | null;
  benefits: string[] | null;
  features: string[] | null;
  cta_options: string[] | null;
  keywords: string[] | null;
  avoid_words: string[] | null;
  content_angles: string[] | null;
  platforms: string[] | null;
  is_primary: boolean | null;
  status: string | null;
};

const EMPTY_DRAFT: BlogDraft = {
  title: "",
  topic: "",
  body: "",
  angle: "",
  audience: "",
  cta: "",
  source_url: "",
  notes: "",
  status: "draft",
};

const PLATFORM_TARGETS: { id: Platform; name: string; color: string }[] = [
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2" },
  { id: "instagram", name: "Instagram", color: "#E1306C" },
  { id: "facebook", name: "Facebook", color: "#1877F2" },
  { id: "tiktok", name: "TikTok", color: "#FFFFFF" },
  { id: "youtube", name: "YouTube", color: "#FF0033" },
  { id: "blog", name: "Blog", color: "#22C55E" },
];

const ACTIONS: {
  id: BlogAiAction;
  label: string;
  hint: string;
  icon: React.ReactNode;
  accent?: boolean;
}[] = [
  {
    id: "idea",
    label: "Pomysł AI",
    hint: "Gdy nie wiesz, o czym pisać",
    icon: <Lightbulb size={15} />,
    accent: true,
  },
  {
    id: "outline",
    label: "Plan wpisu",
    hint: "Nadaj strukturę artykułowi",
    icon: <BookOpen size={15} />,
  },
  {
    id: "start",
    label: "Zacznij tekst",
    hint: "Pierwszy akapit i wejście w temat",
    icon: <PenLine size={15} />,
  },
  {
    id: "continue",
    label: "Co dalej?",
    hint: "Dopisz kolejną część wpisu",
    icon: <Sparkles size={15} />,
    accent: true,
  },
  {
    id: "words",
    label: "Znajdź słowa",
    hint: "Lepsze frazy, metafory, nagłówki",
    icon: <Wand2 size={15} />,
  },
  {
    id: "improve",
    label: "Popraw fragment",
    hint: "Wygładź styl i logikę tekstu",
    icon: <RefreshCw size={15} />,
  },
  {
    id: "seo",
    label: "SEO i tytuły",
    hint: "Tytuł, meta, H2, FAQ",
    icon: <FileText size={15} />,
  },
  {
    id: "social",
    label: "Zrób social",
    hint: "Posty promujące wpis blogowy",
    icon: <Link2 size={15} />,
    accent: true,
  },
];

function cleanAiText(text: string) {
  return text
    .replace(/^```(?:markdown|txt|text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function readingTime(text: string) {
  const words = wordCount(text);
  return Math.max(1, Math.ceil(words / 220));
}

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function getPlatformNames(platforms: Platform[]) {
  return platforms
    .map((id) => PLATFORM_TARGETS.find((platform) => platform.id === id)?.name || id)
    .join(", ");
}

function buildPrompt({
  action,
  draft,
  selectedText,
  selectedPlatforms,
  sourceNotes,
  brandOffers,
}: {
  action: BlogAiAction;
  draft: BlogDraft;
  selectedText: string;
  selectedPlatforms: Platform[];
  sourceNotes: string;
  brandOffers: BrandOffer[];
}) {
  const offersContext = formatBrandOffersForPrompt(brandOffers);

  const base = `
Jesteś AI pisarzem, redaktorem i strategiem content marketingu.
Pomagasz twórcy pisać artykuł blogowy, który później może stać się źródłem contentu na social media i naturalnie prowadzić do realnej oferty marki.

NAJWAŻNIEJSZA ZASADA:
Najpierw korzystaj z danych zapisanych w aplikacji: oferty, produkty, aplikacje, linki, CTA i notatki użytkownika.
Nie wymyślaj produktów spoza listy ofert.
Jeśli brakuje danych, napisz czego brakuje zamiast zgadywać.

OFERTA / PRODUKTY MARKI:
${offersContext}

Jesteś AI pisarzem i redaktorem.
Nie pisz ogólników. Pracuj na notatkach użytkownika, aktualnym szkicu, kontekście marki i zapisanych ofertach.
Jeżeli zadanie dotyczy pomysłów, planu, SEO albo social media, połącz temat z konkretną ofertą, produktem, aplikacją, usługą, kursem lub landing page z listy.
Nie kończ całego artykułu na siłę, jeśli użytkownik prosi tylko o dalszy fragment.
Pisz naturalnie, konkretnie i po polsku.

DANE WPISU:
Tytuł: ${draft.title || "brak"}
Temat: ${draft.topic || "brak"}
Kąt komunikacji: ${draft.angle || "brak"}
Odbiorca: ${draft.audience || "brak"}
CTA / cel wpisu: ${draft.cta || "brak"}
Link źródłowy lub docelowy: ${draft.source_url || "brak"}
Notatki użytkownika: ${draft.notes || "brak"}

TREŚĆ OBECNEGO SZKICU:
${draft.body || "brak"}

ZAZNACZONY FRAGMENT / FRAGMENT DO POPRAWY:
${selectedText || "brak"}

DANE POBRANE ZE STRONY / BLOGA:
${sourceNotes || "brak"}
`.trim();

  if (action === "idea") {
    return `${base}

ZADANIE:
Zaproponuj 8 konkretnych pomysłów na wpis blogowy, które wynikają z realnej oferty marki.

ZASADY:
1. Nie twórz ogólnych tematów blogowych typu „jak planować content”, jeśli nie są powiązane z konkretną ofertą marki.
2. Każdy pomysł musi wskazywać, z którą ofertą jest powiązany.
3. Każdy temat ma zaczynać od realnego problemu odbiorcy.
4. Temat ma przyciągać uwagę, ale nie może być clickbaitem bez wartości.
5. CTA ma prowadzić do konkretnego produktu, aplikacji, usługi albo linku z listy ofert.
6. Jeżeli oferta ma link, użyj go jako sugerowanego CTA.
7. Nie wymyślaj produktów spoza listy ofert.
8. Nie pisz tylko o jednej ofercie, jeśli w bazie są też inne aktywne produkty.
9. Jeśli brakuje danych o ofercie, napisz czego brakuje.
10. Dla każdego pomysłu podaj też pomysł na dalszy content social media.

FORMAT:
### 1. Tytuł:
Produkt / oferta:
Problem odbiorcy:
Kąt komunikacji:
Dlaczego to przyciągnie uwagę:
Jak wpis naturalnie sprzedaje ofertę:
CTA:
Social media po wpisie:
- LinkedIn:
- Facebook:
- Instagram:
- TikTok / Short:

Nie zwracaj JSON. Daj gotową listę do wyboru.`;
  }

  if (action === "outline") {
    return `${base}

ZADANIE:
Ułóż konkretny plan wpisu blogowego powiązany z najlepszą pasującą ofertą marki.
Daj:
- wybraną ofertę / produkt i dlaczego pasuje,
- mocny tytuł,
- krótki lead,
- strukturę H2/H3,
- gdzie naturalnie dodać CTA,
- jak zakończyć tekst,
- 5 pytań FAQ,
- 3 pomysły na social media po publikacji wpisu.

Plan ma być praktyczny, sprzedażowo sprytny i nieakademicki.`;
  }

  if (action === "start") {
    return `${base}

ZADANIE:
Napisz początek wpisu blogowego: mocny lead i pierwsze 2-3 akapity.
Styl: ciekawy, lekko narracyjny, ale konkretny.
Jeżeli temat pasuje do jednej z ofert marki, zacznij od problemu odbiorcy tej oferty, a nie od opisu produktu.
Nie rób podsumowania. Tekst ma dawać autorowi dobry start do dalszego pisania.`;
  }

  if (action === "continue") {
    return `${base}

ZADANIE:
Dopisz kolejną część wpisu blogowego w tym samym stylu.
Nie powtarzaj tego, co już jest w szkicu.
Jeżeli naturalnie pasuje, subtelnie zbliż tekst do problemu, który rozwiązuje konkretna oferta marki.
Daj płynne przejście i 3-5 akapitów gotowych do wklejenia.`;
  }

  if (action === "words") {
    return `${base}

ZADANIE:
Pomóż znaleźć lepsze słowa i sformułowania.
Daj:
- 10 mocniejszych nagłówków,
- 10 lepszych zdań otwierających,
- 10 fraz do CTA,
- 10 słów/zwrotów pasujących do tego wpisu,
- krótkie przykłady użycia.

Nie przepisuj całego artykułu.`;
  }

  if (action === "improve") {
    return `${base}

ZADANIE:
Popraw zaznaczony fragment. Jeśli nie ma zaznaczonego fragmentu, popraw ostatnie 2-4 akapity szkicu.
Zwróć:
1. Poprawioną wersję.
2. Krótkie uzasadnienie, co zostało poprawione.
3. Jedną mocniejszą alternatywę bardziej storytellingową.`;
  }

  if (action === "seo") {
    return `${base}

ZADANIE:
Przygotuj SEO dla wpisu z uwzględnieniem oferty marki.
Daj:
- najlepszą pasującą ofertę / produkt,
- 5 tytułów SEO,
- meta title,
- meta description,
- slug,
- słowa kluczowe,
- strukturę H2/H3,
- FAQ,
- propozycję tekstu CTA w środku i na końcu wpisu,
- sugestię linkowania wewnętrznego do produktu/oferty, jeśli ma URL.

Nie wciskaj sprzedaży na siłę. CTA ma wynikać z problemu omawianego we wpisie.`;
  }

  return `${base}

ZADANIE:
Na podstawie szkicu blogowego przygotuj content promujący wpis na platformy: ${getPlatformNames(selectedPlatforms)}.
Blog jest źródłem. Nie publikujemy bloga z aplikacji, tylko tworzymy social media wokół niego.
Jeżeli wpis pasuje do konkretnej oferty marki, użyj jej jako naturalnego CTA. Nie używaj CTA, które nie wynika z listy ofert.

Dla każdej platformy przygotuj:
- hook,
- treść posta,
- CTA z sugestią: "link do bloga w komentarzu" albo naturalny dopisek,
- hashtagi,
- jaką grafikę/zdjęcie dodać,
- krótką uwagę dlaczego ten wariant pasuje do platformy.

Dostosuj ton:
- LinkedIn: ekspercko, konkretnie, B2B.
- Instagram: wizualnie, emocjonalnie, zapis/udostępnienie.
- Facebook: społecznościowo, prościej, rozmowa.
- TikTok: dynamicznie, luźno, bez ciężkiej sprzedaży.
- YouTube: tytuł/short/miniatura i retencja.
Nie kopiuj jednego posta 1:1 na wszystkie platformy.`;
}
function formatBrandOffersForPrompt(offers: BrandOffer[]) {
  if (!offers.length) {
    return "Brak zapisanych produktów, usług lub aplikacji marki.";
  }

  return offers
    .map((offer, index) => {
      return `
OFERTA ${index + 1}${offer.is_primary ? " — OFERTA GŁÓWNA" : ""}

Nazwa:
${offer.name}

Typ:
${offer.offer_type || "brak"}

Link:
${offer.url || "brak"}

Krótki opis:
${offer.short_description || "brak"}

Pełny opis:
${offer.full_description || "brak"}

Dla kogo:
${offer.target_audience || "brak"}

Problemy odbiorcy:
${(offer.pain_points || []).map((x) => `- ${x}`).join("\n") || "- brak"}

Korzyści:
${(offer.benefits || []).map((x) => `- ${x}`).join("\n") || "- brak"}

Funkcje / elementy oferty:
${(offer.features || []).map((x) => `- ${x}`).join("\n") || "- brak"}

CTA:
${(offer.cta_options || []).map((x) => `- ${x}`).join("\n") || "- brak"}

Kąty contentowe:
${(offer.content_angles || []).map((x) => `- ${x}`).join("\n") || "- brak"}

Słowa kluczowe:
${(offer.keywords || []).join(", ") || "brak"}

Słowa, których unikać:
${(offer.avoid_words || []).join(", ") || "brak"}

Platformy:
${(offer.platforms || []).join(", ") || "brak"}
`.trim();
    })
    .join("\n\n---\n\n");
}
export default function BlogStudio({
  dark = true,
  workspaceId = "contentiq",
}: {
  dark?: boolean;
  workspaceId?: string;
}) {
  const supabase = createClient();
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const [brandOffers, setBrandOffers] = useState<BrandOffer[]>([]);

  const [aiProvider, setAiProvider] = useState<AiProvider>("deepseek");
  const [draft, setDraft] = useState<BlogDraft>(EMPTY_DRAFT);
  const [sourceNotes, setSourceNotes] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([
    "linkedin",
    "instagram",
    "facebook",
  ]);

  const [loadingAction, setLoadingAction] = useState<BlogAiAction | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState<BlogDraft[]>([]);
  const [aiOutput, setAiOutput] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const css: Record<string, string> = dark
    ? {
        bg: "#1A2233",
        surface: "#050505",
        surfaceSoft: "#101010",
        text: "#FFFFFF",
        muted: "#C9CED8",
        border: "rgba(255,255,255,0.10)",
        accent: "#8E443D",
        heading: "#8E443D",
        aiBg: "rgba(109, 40, 217, 0.16)",
        aiBgSoft: "rgba(147, 51, 234, 0.12)",
        aiBorder: "rgba(192, 132, 252, 0.55)",
        aiText: "#D8B4FE",
        aiIcon: "#F0ABFC",
        aiGlow: "0 0 28px rgba(168, 85, 247, 0.26)",
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
        aiIcon: "#A855F7",
        aiGlow: "0 0 26px rgba(124, 58, 237, 0.16)",
      };

  const stats = useMemo(() => {
    return {
      words: wordCount(draft.body),
      read: readingTime(draft.body),
      chars: draft.body.length,
    };
  }, [draft.body]);

  useEffect(() => {
    void loadDrafts();
    void loadBrandOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);


  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 2800);
  }

  function updateDraft<K extends keyof BlogDraft>(field: K, value: BlogDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function captureSelection() {
    const el = editorRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = draft.body.slice(start, end).trim();
    if (selected) setSelectedText(selected);
  }

  function insertIntoEditor(text: string, mode: "append" | "replace-selection" | "replace-all") {
    const cleaned = cleanAiText(text);
    if (!cleaned) return;

    const el = editorRef.current;

    if (mode === "replace-all") {
      updateDraft("body", cleaned);
      return;
    }

    if (mode === "replace-selection" && el && selectedText) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = `${draft.body.slice(0, start)}${cleaned}${draft.body.slice(end)}`;
      updateDraft("body", next);
      setSelectedText("");
      return;
    }

    updateDraft("body", draft.body.trim() ? `${draft.body.trim()}\n\n${cleaned}` : cleaned);
  }


async function loadBrandOffers() {
  try {
    const wsId = await getOrCreateWorkspaceUuid();

    const { data, error } = await supabase
      .schema("contentiq")
      .from("brand_offers")
      .select("*")
      .eq("workspace_id", wsId)
      .eq("status", "active")
      .order("is_primary", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);

    setBrandOffers((data || []) as BrandOffer[]);
  } catch (err) {
    console.error("Brand offers load error:", err);
  }
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

    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) throw new Error(authError.message);
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
      throw new Error(error?.message || "Nie udało się utworzyć workspace.");
    }

    return created.id as string;
  }

  async function loadDrafts() {
    setLoadingDrafts(true);

    try {
      const { data: ws } = await supabase
        .schema("contentiq")
        .from("workspaces")
        .select("id")
        .eq("slug", workspaceId)
        .maybeSingle();

      if (!ws?.id) return;

      const { data, error } = await supabase
        .schema("contentiq")
        .from("content_drafts")
        .select("id,title,topic,body,content_type,target_platforms,ai_feedback,status,created_at")
        .eq("workspace_id", ws.id)
        .ilike("content_type", "%Blog Studio%")
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) throw new Error(error.message);

      setSavedDrafts(
        (data || []).map((item: any) => ({
          id: item.id,
          title: item.title || "Szkic blogowy",
          topic: item.topic || "",
          body: item.body || "",
          angle: "",
          audience: "",
          cta: "",
          source_url: "",
          notes: item.ai_feedback || "",
          status: item.status === "template" ? "template" : "draft",
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingDrafts(false);
    }
  }

  async function scrapeSource() {
    const url = draft.source_url.trim();
    if (!url) {
      setError("Wklej link do bloga, strony lub materiału źródłowego.");
      return;
    }

    setError("");
    setLoadingAction("seo");

    try {
      const response = await fetch("/api/brand/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = (await response.json().catch(() => null)) as ScrapeResponse | null;

      if (!response.ok || data?.error) {
        throw new Error(data?.error || "Nie udało się pobrać treści ze strony.");
      }

      const notes =
        data?.source_notes ||
        [data?.title, data?.description, data?.text].filter(Boolean).join("\n\n");

      setSourceNotes(notes || "");

      if (!draft.title && data?.title) updateDraft("title", data.title);
      if (!draft.topic && data?.description) updateDraft("topic", data.description);

      showToast("✓ Pobrano kontekst ze strony");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingAction(null);
    }
  }

  async function runAi(action: BlogAiAction) {
    setError("");
    setLoadingAction(action);
    setAiOutput("");
    captureSelection();

    try {
      const prompt = buildPrompt({
        action,
        draft,
        selectedText,
        selectedPlatforms,
        sourceNotes,
        brandOffers,
      });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          provider: aiProvider,
          ai_provider: aiProvider,
          prompt,
          historicalData: {
            source: "Blog Studio",
            action,
            selectedPlatforms,
            title: draft.title,
            topic: draft.topic,
            hasSourceNotes: Boolean(sourceNotes),
            brandOffersCount: brandOffers.length,
            primaryOffer: brandOffers.find((offer) => offer.is_primary)?.name || null,
          },
        }),
      });

      const data = (await response.json().catch(() => null)) as ChatResponse | null;

      if (!response.ok || data?.error) {
        throw new Error(data?.details || data?.error || "AI nie zwróciło odpowiedzi.");
      }

      const answer = cleanAiText(data?.answer || "");
      setAiOutput(answer);

      if (action === "start" || action === "continue") {
        insertIntoEditor(answer, "append");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingAction(null);
    }
  }

  async function saveAs(status: BlogStatus) {
    setSaving(true);
    setError("");

    try {
      const wsId = await getOrCreateWorkspaceUuid();
      const title = draft.title.trim() || draft.topic.trim() || "Szkic blogowy";
      const body = draft.body.trim() || aiOutput.trim();

      if (!body && !draft.topic.trim()) {
        throw new Error("Najpierw wpisz temat albo treść szkicu.");
      }

      const payload = {
        workspace_id: wsId,
        title,
        body,
        topic: draft.topic || draft.angle || title,
        content_type: status === "template" ? "Blog Studio / template" : "Blog Studio / editable draft",
        target_platforms: ["blog", ...selectedPlatforms.filter((item) => item !== "blog")],
        ai_score: null,
        ai_feedback: [
          draft.angle ? `Kąt: ${draft.angle}` : "",
          draft.audience ? `Odbiorca: ${draft.audience}` : "",
          draft.cta ? `CTA: ${draft.cta}` : "",
          draft.source_url ? `Źródło: ${draft.source_url}` : "",
          draft.notes ? `Notatki: ${draft.notes}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        status,
        media: [],
      };

      if (draft.id) {
        const { error: updateError } = await supabase
          .schema("contentiq")
          .from("content_drafts")
          .update(payload)
          .eq("id", draft.id);

        if (updateError) throw new Error(updateError.message);
      } else {
        const { data, error: insertError } = await supabase
          .schema("contentiq")
          .from("content_drafts")
          .insert(payload)
          .select("id")
          .single();

        if (insertError) throw new Error(insertError.message);
        if (data?.id) updateDraft("id", data.id);
      }

      updateDraft("status", status);
      await loadDrafts();
      showToast(status === "template" ? "✓ Zapisano jako szablon blogowy" : "✓ Zapisano szkic do dalszej edycji");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function loadSavedDraft(item: BlogDraft) {
    setDraft(item);
    setAiOutput("");
    setSelectedText("");
    showToast("✓ Wczytano szkic");
  }

  function togglePlatform(platform: Platform) {
    setSelectedPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  }

  const fieldStyle: CSSProperties = {
    width: "100%",
    borderRadius: 14,
    border: `1px solid ${css.border}`,
    background: css.surfaceSoft,
    color: css.text,
    padding: "11px 12px",
    outline: "none",
    fontSize: 12,
    lineHeight: 1.6,
    fontFamily: "var(--font-body)",
  };

  const labelStyle: CSSProperties = {
    color: css.accent,
    fontFamily: "var(--font-label)",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: ".12em",
    textTransform: "uppercase",
    marginBottom: 8,
  };

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
        .blog-studio-grid { display: grid; grid-template-columns: 290px minmax(0, 1fr) 340px; gap: 16px; align-items: start; }
        .blog-tool-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .blog-btn { transition: transform .15s ease, opacity .15s ease, border-color .15s ease; }
        .blog-btn:hover:not(:disabled) { transform: translateY(-1px); opacity: .9; }
        .blog-editor::placeholder { color: ${css.muted}; opacity: .72; }
        @media(max-width: 1180px) { .blog-studio-grid { grid-template-columns: 1fr; } }
        @media(max-width: 680px) { .blog-tool-grid { grid-template-columns: 1fr; } }
      `}</style>

      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 100,
            borderRadius: 14,
            border: "1px solid #166534",
            background: "#052e16",
            color: "#22c55e",
            padding: "10px 14px",
            fontSize: 12,
            fontWeight: 800,
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
          padding: 18,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: 24,
            top: 8,
            fontFamily: "var(--font-heading)",
            fontSize: 120,
            color: css.accent,
            opacity: 0.05,
            pointerEvents: "none",
          }}
        >
          Blog
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={labelStyle}>Blog Studio / AI pisarz</div>
          <h2
            style={{
              margin: 0,
              color: css.heading,
              fontFamily: "var(--font-heading)",
              fontSize: 34,
              lineHeight: 1.05,
              fontWeight: 500,
            }}
          >
            Notatnik do pisania, rozwijania i zapisywania szkiców blogowych
          </h2>
          <p style={{ margin: "10px 0 0", color: css.muted, fontSize: 13, lineHeight: 1.7, maxWidth: 980 }}>
            To nie publikuje wpisu na blogu. Ten moduł pomaga pisać artykuł jak w edytorze pisarza:
            zaczynasz szkic, a kiedy brakuje weny, AI podpowiada pomysł, kolejny akapit, lepsze słowa,
            strukturę SEO albo posty social media wokół gotowego wpisu.
          </p>
        </div>
      </div>

      <div className="blog-studio-grid">
        <aside
          style={{
            background: css.surface,
            border: `1px solid ${css.border}`,
            borderRadius: 22,
            padding: 14,
            display: "grid",
            gap: 12,
          }}
        >
          <div>
            <div style={labelStyle}>Silnik AI</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {(["deepseek", "gemini"] as AiProvider[]).map((provider) => {
                const active = aiProvider === provider;
                return (
                  <button
                    key={provider}
                    type="button"
                    className="blog-btn"
                    onClick={() => setAiProvider(provider)}
                    style={{
                      borderRadius: 12,
                      border: `1px solid ${active ? css.aiBorder : css.border}`,
                      background: active ? css.aiBgSoft : css.surfaceSoft,
                      color: active ? css.aiText : css.muted,
                      padding: "9px 8px",
                      fontSize: 11,
                      fontWeight: 900,
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {provider === "deepseek" ? "DeepSeek" : "Gemini"}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${brandOffers.length ? css.aiBorder : css.border}`,
              background: brandOffers.length ? css.aiBgSoft : css.surfaceSoft,
              padding: 11,
            }}
          >
            <div
              style={{
                color: brandOffers.length ? css.aiText : css.muted,
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Kontekst oferty dla AI
            </div>
            <div style={{ color: css.text, fontSize: 12, lineHeight: 1.55 }}>
              {brandOffers.length
                ? `AI widzi ${brandOffers.length} aktywnych ofert/produktów marki.`
                : "Brak aktywnych ofert. Dodaj je w sekcji Oferta i linki, żeby AI pisało bardziej sprzedażowo."}
            </div>
            {brandOffers.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                {brandOffers.slice(0, 4).map((offer) => (
                  <span
                    key={offer.id}
                    style={{
                      borderRadius: 999,
                      border: `1px solid ${css.aiBorder}`,
                      background: css.aiBg,
                      color: css.aiText,
                      padding: "4px 7px",
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    {offer.is_primary ? "★ " : ""}
                    {offer.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={labelStyle}>Narzędzia AI</div>
            <div className="blog-tool-grid">
              {ACTIONS.map((action) => {
                const loading = loadingAction === action.id;
                return (
                  <button
                    key={action.id}
                    type="button"
                    className="blog-btn"
                    onClick={() => runAi(action.id)}
                    disabled={Boolean(loadingAction)}
                    title={action.hint}
                    style={{
                      borderRadius: 14,
                      border: `1px solid ${action.accent ? css.aiBorder : css.border}`,
                      background: action.accent ? css.aiBg : css.surfaceSoft,
                      boxShadow: action.accent ? css.aiGlow : "none",
                      color: action.accent ? css.aiText : css.text,
                      padding: "10px 10px",
                      cursor: loadingAction ? "not-allowed" : "pointer",
                      opacity: loadingAction && !loading ? 0.45 : 1,
                      fontFamily: "var(--font-body)",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 900 }}>
                      <span style={{ color: action.accent ? css.aiIcon : css.accent }}>{loading ? "…" : action.icon}</span>
                      {action.label}
                    </span>
                    <span style={{ display: "block", marginTop: 4, color: css.muted, fontSize: 10, lineHeight: 1.35 }}>
                      {action.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={labelStyle}>Platformy do rozwinięcia</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PLATFORM_TARGETS.filter((item) => item.id !== "blog").map((platform) => {
                const active = selectedPlatforms.includes(platform.id);
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => togglePlatform(platform.id)}
                    style={{
                      borderRadius: 999,
                      border: `1px solid ${active ? platform.color : css.border}`,
                      background: active ? `${platform.color}18` : "transparent",
                      color: active ? platform.color : css.muted,
                      padding: "6px 9px",
                      fontSize: 10,
                      fontWeight: 900,
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {platform.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={labelStyle}>Szkice</div>
            <div style={{ display: "grid", gap: 8 }}>
              {loadingDrafts && <div style={{ color: css.muted, fontSize: 12 }}>Ładowanie szkiców...</div>}
              {!loadingDrafts && savedDrafts.length === 0 && (
                <div style={{ color: css.muted, fontSize: 12, lineHeight: 1.5 }}>
                  Nie masz jeszcze zapisanych szkiców z Blog Studio.
                </div>
              )}
              {savedDrafts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => loadSavedDraft(item)}
                  style={{
                    borderRadius: 13,
                    border: `1px solid ${css.border}`,
                    background: css.surfaceSoft,
                    color: css.text,
                    padding: 10,
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  <div style={{ color: css.heading, fontFamily: "var(--font-heading)", fontSize: 16, lineHeight: 1.1 }}>
                    {item.title || "Szkic blogowy"}
                  </div>
                  <div style={{ color: css.muted, fontSize: 10, marginTop: 5 }}>
                    {item.status === "template" ? "Szablon" : "Szkic edytowalny"} · {wordCount(item.body)} słów
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main
          style={{
            background: css.surface,
            border: `1px solid ${css.border}`,
            borderRadius: 22,
            padding: 16,
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 10 }}>
            <div>
              <div style={labelStyle}>Tytuł roboczy</div>
              <input
                value={draft.title}
                onChange={(event) => updateDraft("title", event.target.value)}
                placeholder="Np. Jak z jednego artykułu stworzyć content na cały tydzień"
                style={fieldStyle}
              />
            </div>
            <div>
              <div style={labelStyle}>Temat / główna myśl</div>
              <input
                value={draft.topic}
                onChange={(event) => updateDraft("topic", event.target.value)}
                placeholder="O czym jest wpis?"
                style={fieldStyle}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={labelStyle}>Kąt komunikacji</div>
              <input
                value={draft.angle}
                onChange={(event) => updateDraft("angle", event.target.value)}
                placeholder="Np. blog jako centrum contentu"
                style={fieldStyle}
              />
            </div>
            <div>
              <div style={labelStyle}>Odbiorca</div>
              <input
                value={draft.audience}
                onChange={(event) => updateDraft("audience", event.target.value)}
                placeholder="Np. twórcy, marki, małe firmy, B2B"
                style={fieldStyle}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end" }}>
            <div>
              <div style={labelStyle}>Link źródłowy / strona / blog</div>
              <input
                value={draft.source_url}
                onChange={(event) => updateDraft("source_url", event.target.value)}
                placeholder="https://... — opcjonalnie pobierz kontekst"
                style={fieldStyle}
              />
            </div>
            <button
              type="button"
              className="blog-btn"
              onClick={scrapeSource}
              disabled={Boolean(loadingAction)}
              style={{
                borderRadius: 14,
                border: `1px solid ${css.aiBorder}`,
                background: css.aiBg,
                color: css.aiText,
                padding: "11px 13px",
                cursor: loadingAction ? "not-allowed" : "pointer",
                fontSize: 11,
                fontWeight: 900,
                fontFamily: "var(--font-body)",
                whiteSpace: "nowrap",
              }}
            >
              Pobierz kontekst
            </button>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 8 }}>
              <div style={labelStyle}>Notatnik pisarza</div>
              <div style={{ display: "flex", gap: 8, color: css.muted, fontSize: 10, fontWeight: 800 }}>
                <span>{stats.words} słów</span>
                <span>{stats.read} min czytania</span>
                <span>{stats.chars} znaków</span>
              </div>
            </div>
            <textarea
              ref={editorRef}
              value={draft.body}
              onChange={(event) => updateDraft("body", event.target.value)}
              onSelect={captureSelection}
              className="blog-editor"
              placeholder="Zacznij pisać tutaj. To może być brudnopis, fragment artykułu, luźne myśli albo pełny wpis. Kiedy utkniesz, użyj narzędzi AI po lewej stronie."
              style={{
                ...fieldStyle,
                minHeight: 520,
                resize: "vertical",
                fontSize: 15,
                lineHeight: 1.9,
                padding: 18,
                fontFamily: "var(--font-body)",
                background: dark ? "#080808" : "#FFFDFB",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={labelStyle}>CTA / cel wpisu</div>
              <input
                value={draft.cta}
                onChange={(event) => updateDraft("cta", event.target.value)}
                placeholder="Np. przejście do aplikacji, zapytanie, pobranie demo"
                style={fieldStyle}
              />
            </div>
            <div>
              <div style={labelStyle}>Notatki dla siebie</div>
              <input
                value={draft.notes}
                onChange={(event) => updateDraft("notes", event.target.value)}
                placeholder="Co jeszcze dopisać, czego nie zapomnieć?"
                style={fieldStyle}
              />
            </div>
          </div>

          {error && (
            <div style={{ borderRadius: 14, border: "1px solid #ef444440", background: "#ef444414", color: "#ef4444", padding: 12, fontSize: 12, lineHeight: 1.6 }}>
              {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <button
              type="button"
              className="blog-btn"
              onClick={() => saveAs("draft")}
              disabled={saving}
              style={{
                borderRadius: 14,
                border: `1px solid ${css.border}`,
                background: css.surfaceSoft,
                color: css.text,
                padding: "12px 12px",
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: 12,
                fontWeight: 900,
                fontFamily: "var(--font-body)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Save size={15} />
              {saving ? "Zapisuję..." : "Zapisz szkic"}
            </button>
            <button
              type="button"
              className="blog-btn"
              onClick={() => saveAs("template")}
              disabled={saving}
              style={{
                borderRadius: 14,
                border: `1px solid ${css.accent}`,
                background: `${css.accent}20`,
                color: css.accent,
                padding: "12px 12px",
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: 12,
                fontWeight: 900,
                fontFamily: "var(--font-body)",
              }}
            >
              Zapisz jako szablon
            </button>
            <button
              type="button"
              className="blog-btn"
              onClick={() => setDraft(EMPTY_DRAFT)}
              style={{
                borderRadius: 14,
                border: `1px solid ${css.border}`,
                background: "transparent",
                color: css.muted,
                padding: "12px 12px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 900,
                fontFamily: "var(--font-body)",
              }}
            >
              Nowy szkic
            </button>
          </div>
        </main>

        <aside
          style={{
            background: css.surface,
            border: `1px solid ${css.aiBorder}`,
            boxShadow: css.aiGlow,
            borderRadius: 22,
            padding: 14,
            display: "grid",
            gap: 12,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", left: 20, right: 20, bottom: -22, height: 44, background: "rgba(168,85,247,.16)", filter: "blur(24px)", pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ ...labelStyle, color: css.aiText, display: "flex", alignItems: "center", gap: 7 }}>
              <Wand2 size={15} color={css.aiIcon} />
              Odpowiedź AI
            </div>
            {!aiOutput && !loadingAction && (
              <div style={{ borderRadius: 18, border: `1px dashed ${css.border}`, background: dark ? "#080808" : "#FFFDFB", padding: 20, minHeight: 280, display: "grid", placeItems: "center", textAlign: "center" }}>
                <div>
                  <div style={{ fontSize: 34, color: css.aiText, opacity: .35 }}>✦</div>
                  <h3 style={{ margin: "8px 0", color: css.heading, fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 500 }}>
                    AI pisarz czeka obok
                  </h3>
                  <p style={{ margin: 0, color: css.muted, fontSize: 12, lineHeight: 1.7 }}>
                    Wybierz narzędzie po lewej. Wynik możesz dopisać do notatnika, wkleić w miejsce zaznaczenia albo potraktować jako inspirację.
                  </p>
                </div>
              </div>
            )}

            {loadingAction && (
              <div style={{ borderRadius: 18, border: `1px solid ${css.aiBorder}`, background: css.aiBg, padding: 20, minHeight: 220, display: "grid", placeItems: "center", textAlign: "center" }}>
                <div>
                  <div style={{ color: css.aiText, fontSize: 13, fontWeight: 900 }}>AI pisze...</div>
                  <p style={{ color: css.muted, fontSize: 12, lineHeight: 1.6 }}>
                    Pracuję na Twoim szkicu, notatkach i wybranym zadaniu.
                  </p>
                </div>
              </div>
            )}

            {aiOutput && !loadingAction && (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ borderRadius: 18, border: `1px solid ${css.aiBorder}`, background: dark ? "#080808" : "#FFFDFB", padding: 14, color: css.text, fontSize: 12, lineHeight: 1.75, whiteSpace: "pre-wrap", maxHeight: 560, overflow: "auto" }}>
                  {aiOutput}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button
                    type="button"
                    className="blog-btn"
                    onClick={() => insertIntoEditor(aiOutput, "append")}
                    style={{ borderRadius: 13, border: `1px solid ${css.aiBorder}`, background: css.aiBg, color: css.aiText, padding: "10px 8px", fontSize: 11, fontWeight: 900, cursor: "pointer", fontFamily: "var(--font-body)" }}
                  >
                    Dopisz do tekstu
                  </button>
                  <button
                    type="button"
                    className="blog-btn"
                    onClick={() => insertIntoEditor(aiOutput, "replace-selection")}
                    disabled={!selectedText}
                    style={{ borderRadius: 13, border: `1px solid ${css.border}`, background: css.surfaceSoft, color: selectedText ? css.text : css.muted, padding: "10px 8px", fontSize: 11, fontWeight: 900, cursor: selectedText ? "pointer" : "not-allowed", opacity: selectedText ? 1 : .55, fontFamily: "var(--font-body)" }}
                  >
                    Zamień zaznaczenie
                  </button>
                </div>
                <button
                  type="button"
                  className="blog-btn"
                  onClick={() => navigator.clipboard.writeText(aiOutput)}
                  style={{ borderRadius: 13, border: `1px solid ${css.border}`, background: "transparent", color: css.muted, padding: "10px 8px", fontSize: 11, fontWeight: 900, cursor: "pointer", fontFamily: "var(--font-body)" }}
                >
                  Kopiuj odpowiedź AI
                </button>
              </div>
            )}
          </div>

          {sourceNotes && (
            <details style={{ position: "relative", zIndex: 1, borderRadius: 14, border: `1px solid ${css.border}`, background: css.surfaceSoft, padding: 10 }}>
              <summary style={{ color: css.muted, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>Kontekst pobrany ze strony</summary>
              <div style={{ marginTop: 10, color: css.muted, fontSize: 11, lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 220, overflow: "auto" }}>
                {sourceNotes}
              </div>
            </details>
          )}
        </aside>
      </div>
    </div>
  );
}
