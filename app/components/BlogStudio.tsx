"use client";


import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";
import { useContentIQLanguage } from "@/lib/contentiq-language";
import {
  BookOpen,
  FileText,
  ImagePlus,
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

type BlogCover = {
  file: File;
  previewUrl: string;
};

const BLOG_MEDIA_BUCKET = "content-temp-media";

function safeMediaFileName(name: string) {
  const dot = name.lastIndexOf(".");
  const extension = dot >= 0 ? name.slice(dot).toLowerCase() : "";
  const base = dot >= 0 ? name.slice(0, dot) : name;

  return `${base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "blog-cover"}${extension}`;
}

function formatMediaSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

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
  labelPl: string;
  labelEn: string;
  hintPl: string;
  hintEn: string;
  icon: React.ReactNode;
  accent?: boolean;
}[] = [
  {
    id: "idea",
    labelPl: "Pomysł AI",
    labelEn: "AI idea",
    hintPl: "Gdy nie wiesz, o czym pisać",
    hintEn: "When you are not sure what to write about",
    icon: <Lightbulb size={15} />,
    accent: true,
  },
  {
    id: "outline",
    labelPl: "Plan wpisu",
    labelEn: "Post outline",
    hintPl: "Nadaj strukturę artykułowi",
    hintEn: "Create a clear article structure",
    icon: <BookOpen size={15} />,
  },
  {
    id: "start",
    labelPl: "Zacznij tekst",
    labelEn: "Start writing",
    hintPl: "Pierwszy akapit i wejście w temat",
    hintEn: "Write the opening and first paragraph",
    icon: <PenLine size={15} />,
  },
  {
    id: "continue",
    labelPl: "Co dalej?",
    labelEn: "Continue",
    hintPl: "Dopisz kolejną część wpisu",
    hintEn: "Write the next section of the post",
    icon: <Sparkles size={15} />,
    accent: true,
  },
  {
    id: "words",
    labelPl: "Znajdź słowa",
    labelEn: "Find better words",
    hintPl: "Lepsze frazy, metafory, nagłówki",
    hintEn: "Improve phrases, metaphors and headings",
    icon: <Wand2 size={15} />,
  },
  {
    id: "improve",
    labelPl: "Popraw fragment",
    labelEn: "Improve excerpt",
    hintPl: "Wygładź styl i logikę tekstu",
    hintEn: "Polish the style and logic",
    icon: <RefreshCw size={15} />,
  },
  {
    id: "seo",
    labelPl: "SEO i tytuły",
    labelEn: "SEO and titles",
    hintPl: "Tytuł, meta, H2, FAQ",
    hintEn: "Titles, metadata, H2s and FAQ",
    icon: <FileText size={15} />,
  },
  {
    id: "social",
    labelPl: "Zrób social",
    labelEn: "Create social posts",
    hintPl: "Posty promujące wpis blogowy",
    hintEn: "Turn the article into promotional posts",
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
  language,
  action,
  draft,
  selectedText,
  selectedPlatforms,
  sourceNotes,
  brandOffers,
}: {
  language: "pl" | "en";
  action: BlogAiAction;
  draft: BlogDraft;
  selectedText: string;
  selectedPlatforms: Platform[];
  sourceNotes: string;
  brandOffers: BrandOffer[];
}) {
  const offersContext = formatBrandOffersForPrompt(brandOffers, language);
  const missing = language === "pl" ? "brak" : "not provided";
  const responseLanguage = language === "pl" ? "polskim" : "angielskim";

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
JĘZYK ODPOWIEDZI: ${responseLanguage}.
Całą odpowiedź napisz wyłącznie w języku ${responseLanguage}. Nie mieszaj języków, także w nagłówkach, CTA, przykładach i nazwach sekcji.
Pisz naturalnie i konkretnie.

DANE WPISU:
Tytuł: ${draft.title || missing}
Temat: ${draft.topic || missing}
Kąt komunikacji: ${draft.angle || missing}
Odbiorca: ${draft.audience || missing}
CTA / cel wpisu: ${draft.cta || missing}
Link źródłowy lub docelowy: ${draft.source_url || missing}
Notatki użytkownika: ${draft.notes || missing}

TREŚĆ OBECNEGO SZKICU:
${draft.body || missing}

ZAZNACZONY FRAGMENT / FRAGMENT DO POPRAWY:
${selectedText || missing}

DANE POBRANE ZE STRONY / BLOGA:
${sourceNotes || missing}
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
function formatBrandOffersForPrompt(offers: BrandOffer[], language: "pl" | "en") {
  const missing = language === "pl" ? "brak" : "not provided";
  if (!offers.length) {
    return language === "pl"
      ? "Brak zapisanych produktów, usług lub aplikacji marki."
      : "No saved brand products, services or applications.";
  }

  return offers
    .map((offer, index) => {
      if (language === "en") {
        return `
OFFER ${index + 1}${offer.is_primary ? " — PRIMARY OFFER" : ""}

Name:
${offer.name}

Type:
${offer.offer_type || missing}

Link:
${offer.url || missing}

Short description:
${offer.short_description || missing}

Full description:
${offer.full_description || missing}

Target audience:
${offer.target_audience || missing}

Audience pain points:
${safeArray(offer.pain_points).map((x) => `- ${x}`).join("\n") || `- ${missing}`}

Benefits:
${safeArray(offer.benefits).map((x) => `- ${x}`).join("\n") || `- ${missing}`}

Features:
${safeArray(offer.features).map((x) => `- ${x}`).join("\n") || `- ${missing}`}

CTA options:
${safeArray(offer.cta_options).map((x) => `- ${x}`).join("\n") || `- ${missing}`}

Content angles:
${safeArray(offer.content_angles).map((x) => `- ${x}`).join("\n") || `- ${missing}`}

Keywords:
${safeArray(offer.keywords).join(", ") || missing}

Words to avoid:
${safeArray(offer.avoid_words).join(", ") || missing}

Platforms:
${safeArray(offer.platforms).join(", ") || missing}
`.trim();
      }

      return `
OFERTA ${index + 1}${offer.is_primary ? " — OFERTA GŁÓWNA" : ""}

Nazwa:
${offer.name}

Typ:
${offer.offer_type || missing}

Link:
${offer.url || missing}

Krótki opis:
${offer.short_description || missing}

Pełny opis:
${offer.full_description || missing}

Dla kogo:
${offer.target_audience || missing}

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
  const { lang, text } = useContentIQLanguage();
  const supabase = createClient();
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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
  const [blogCover, setBlogCover] = useState<BlogCover | null>(null);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);
  const [coverUploadStatus, setCoverUploadStatus] = useState("");

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

  useEffect(() => {
    return () => {
      if (blogCover?.previewUrl) URL.revokeObjectURL(blogCover.previewUrl);
    };
  }, [blogCover]);


  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 2800);
  }

  function updateDraft<K extends keyof BlogDraft>(field: K, value: BlogDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function selectBlogCover(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(text("Wybierz plik graficzny JPG, PNG, WebP lub GIF.", "Choose a JPG, PNG, WebP or GIF image."));
      return;
    }

    setBlogCover((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return { file, previewUrl: URL.createObjectURL(file) };
    });
    setCoverUploadProgress(0);
    setCoverUploadStatus(text("Zdjęcie wybrane — podgląd gotowy", "Image selected — preview ready"));
    setError("");
  }

  function removeBlogCover(requireConfirmation = false) {
    if (
      requireConfirmation &&
      blogCover &&
      !window.confirm(
        text(
          `Czy na pewno chcesz usunąć okładkę „${blogCover.file.name}”?`,
          `Are you sure you want to remove the “${blogCover.file.name}” cover?`
        )
      )
    ) {
      return;
    }

    setBlogCover((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
    setCoverUploadProgress(0);
    setCoverUploadStatus("");
    if (coverInputRef.current) coverInputRef.current.value = "";
  }

  async function uploadBlogCover(wsId: string, draftId: string) {
    if (!blogCover) return;

    const file = blogCover.file;
    const path = `${wsId}/${draftId}/${Date.now()}-${safeMediaFileName(file.name)}`;

    setCoverUploadProgress(12);
    setCoverUploadStatus(text("Przygotowuję zdjęcie...", "Preparing image..."));

    setCoverUploadProgress(28);
    setCoverUploadStatus(text("Wysyłam zdjęcie do Storage...", "Uploading image to Storage..."));
    const { error: uploadError } = await supabase.storage
      .from(BLOG_MEDIA_BUCKET)
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message);

    setCoverUploadProgress(84);
    setCoverUploadStatus(text("Zapisuję miniaturę przy szkicu...", "Saving thumbnail with the draft..."));

    const media = [
      {
        kind: "cover",
        asset_type: "image",
        storage_bucket: BLOG_MEDIA_BUCKET,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        preview_text: draft.title || draft.topic || file.name,
        source: "blog_studio",
        status: "temporary",
      },
    ];

    const [{ error: draftMediaError }, { error: assetError }] = await Promise.all([
      supabase
        .schema("contentiq")
        .from("content_drafts")
        .update({ media })
        .eq("id", draftId),
      supabase
        .schema("contentiq")
        .from("media_assets")
        .insert({
          workspace_id: wsId,
          draft_id: draftId,
          storage_bucket: BLOG_MEDIA_BUCKET,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type,
          file_size: file.size,
          asset_type: "image",
          status: "temporary",
        }),
    ]);

    if (draftMediaError || assetError) {
      await supabase.storage.from(BLOG_MEDIA_BUCKET).remove([path]);
      await supabase
        .schema("contentiq")
        .from("content_drafts")
        .update({ media: [] })
        .eq("id", draftId);
      throw new Error(
        draftMediaError?.message ||
          assetError?.message ||
          text("Nie udało się zapisać miniatury.", "Could not save the thumbnail.")
      );
    }

    setCoverUploadProgress(100);
    setCoverUploadStatus(text("Zdjęcie zapisane", "Image saved"));
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
    if (!auth.user) throw new Error(text("Brak aktywnej sesji.", "No active session."));

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
      throw new Error(error?.message || text("Nie udało się utworzyć workspace.", "Could not create the workspace."));
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
          title: item.title || text("Szkic blogowy", "Blog draft"),
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
      setError(text("Wklej link do bloga, strony lub materiału źródłowego.", "Paste a link to a blog, website or source material."));
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
        throw new Error(data?.error || text("Nie udało się pobrać treści ze strony.", "Could not collect content from the website."));
      }

      const notes =
        data?.source_notes ||
        [data?.title, data?.description, data?.text].filter(Boolean).join("\n\n");

      setSourceNotes(notes || "");

      if (!draft.title && data?.title) updateDraft("title", data.title);
      if (!draft.topic && data?.description) updateDraft("topic", data.description);

      showToast(text("✓ Pobrano kontekst ze strony", "✓ Website context collected"));
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
        language: lang,
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
        throw new Error(data?.details || data?.error || text("AI nie zwróciło odpowiedzi.", "AI did not return a response."));
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
    if (blogCover) {
      setCoverUploadProgress(5);
      setCoverUploadStatus(text("Przygotowuję zapis...", "Preparing save..."));
    }

    try {
      const wsId = await getOrCreateWorkspaceUuid();
      const title = draft.title.trim() || draft.topic.trim() || text("Szkic blogowy", "Blog draft");
      const body = draft.body.trim() || aiOutput.trim();

      if (!body && !draft.topic.trim()) {
        throw new Error(text("Najpierw wpisz temat albo treść szkicu.", "Enter a topic or draft content first."));
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
          draft.angle ? `${text("Kąt", "Angle")}: ${draft.angle}` : "",
          draft.audience ? `${text("Odbiorca", "Audience")}: ${draft.audience}` : "",
          draft.cta ? `CTA: ${draft.cta}` : "",
          draft.source_url ? `${text("Źródło", "Source")}: ${draft.source_url}` : "",
          draft.notes ? `${text("Notatki", "Notes")}: ${draft.notes}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        status,
      };

      let draftId = draft.id || "";

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
          .insert({ ...payload, media: [] })
          .select("id")
          .single();

        if (insertError) throw new Error(insertError.message);
        if (data?.id) {
          draftId = data.id;
          updateDraft("id", data.id);
        }
      }

      if (!draftId) throw new Error(text("Nie udało się ustalić ID szkicu.", "Could not determine the draft ID."));
      await uploadBlogCover(wsId, draftId);

      updateDraft("status", status);
      await loadDrafts();
      showToast(
        status === "template"
          ? text("✓ Zapisano jako szablon blogowy", "✓ Saved as a blog template")
          : text("✓ Zapisano szkic do dalszej edycji", "✓ Draft saved for further editing")
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function loadSavedDraft(item: BlogDraft) {
    setDraft(item);
    removeBlogCover();
    setAiOutput("");
    setSelectedText("");
    showToast(text("✓ Wczytano szkic", "✓ Draft loaded"));
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
          <div style={labelStyle}>{text("Blog Studio / AI pisarz", "Blog Studio / AI writer")}</div>
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
            {text("Notatnik do pisania, rozwijania i zapisywania szkiców blogowych", "A workspace for writing, developing and saving blog drafts")}
          </h2>
          <p style={{ margin: "10px 0 0", color: css.muted, fontSize: 13, lineHeight: 1.7, maxWidth: 980 }}>
            {text(
              "Ten moduł nie publikuje bezpośrednio na blogu. Pomaga pisać artykuł jak w edytorze: zaczynasz szkic, a AI podpowiada pomysł, kolejny akapit, lepsze słowa, strukturę SEO albo posty social media.",
              "This module does not publish directly to your blog. It works as a writing editor where AI can suggest ideas, the next paragraph, better wording, SEO structure or social posts."
            )}
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
            <div style={labelStyle}>{text("Silnik AI", "AI engine")}</div>
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
              {text("Kontekst oferty dla AI", "Offer context for AI")}
            </div>
            <div style={{ color: css.text, fontSize: 12, lineHeight: 1.55 }}>
              {brandOffers.length
                ? text(
                    `AI widzi ${brandOffers.length} aktywnych ofert/produktów marki.`,
                    `AI can use ${brandOffers.length} active brand offers/products.`
                  )
                : text(
                    "Brak aktywnych ofert. Dodaj je w sekcji Oferta i linki, żeby AI pisało bardziej sprzedażowo.",
                    "No active offers. Add them in Offers and links so AI can write more conversion-focused content."
                  )}
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
            <div style={labelStyle}>{text("Narzędzia AI", "AI tools")}</div>
            <div className="blog-tool-grid">
              {ACTIONS.map((action) => {
                const loading = loadingAction === action.id;
                const actionLabel = text(action.labelPl, action.labelEn);
                const actionHint = text(action.hintPl, action.hintEn);
                return (
                  <button
                    key={action.id}
                    type="button"
                    className="blog-btn"
                    onClick={() => runAi(action.id)}
                    disabled={Boolean(loadingAction)}
                    title={actionHint}
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
                      {actionLabel}
                    </span>
                    <span style={{ display: "block", marginTop: 4, color: css.muted, fontSize: 10, lineHeight: 1.35 }}>
                      {actionHint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={labelStyle}>{text("Platformy do rozwinięcia", "Platforms to expand to")}</div>
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
            <div style={labelStyle}>{text("Szkice", "Drafts")}</div>
            <div style={{ display: "grid", gap: 8 }}>
              {loadingDrafts && <div style={{ color: css.muted, fontSize: 12 }}>{text("Ładowanie szkiców...", "Loading drafts...")}</div>}
              {!loadingDrafts && savedDrafts.length === 0 && (
                <div style={{ color: css.muted, fontSize: 12, lineHeight: 1.5 }}>
                  {text("Nie masz jeszcze zapisanych szkiców z Blog Studio.", "You do not have any saved Blog Studio drafts yet.")}
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
                    {item.title || text("Szkic blogowy", "Blog draft")}
                  </div>
                  <div style={{ color: css.muted, fontSize: 10, marginTop: 5 }}>
                    {item.status === "template" ? text("Szablon", "Template") : text("Szkic edytowalny", "Editable draft")} ·{" "}
                    {wordCount(item.body)} {text("słów", "words")}
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
              <div style={labelStyle}>{text("Tytuł roboczy", "Working title")}</div>
              <input
                value={draft.title}
                onChange={(event) => updateDraft("title", event.target.value)}
                placeholder={text(
                  "Np. Jak z jednego artykułu stworzyć content na cały tydzień",
                  "E.g. How to turn one article into a full week of content"
                )}
                style={fieldStyle}
              />
            </div>
            <div>
              <div style={labelStyle}>{text("Temat / główna myśl", "Topic / main idea")}</div>
              <input
                value={draft.topic}
                onChange={(event) => updateDraft("topic", event.target.value)}
                placeholder={text("O czym jest wpis?", "What is the post about?")}
                style={fieldStyle}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={labelStyle}>{text("Kąt komunikacji", "Communication angle")}</div>
              <input
                value={draft.angle}
                onChange={(event) => updateDraft("angle", event.target.value)}
                placeholder={text("Np. blog jako centrum contentu", "E.g. the blog as a content hub")}
                style={fieldStyle}
              />
            </div>
            <div>
              <div style={labelStyle}>{text("Odbiorca", "Audience")}</div>
              <input
                value={draft.audience}
                onChange={(event) => updateDraft("audience", event.target.value)}
                placeholder={text("Np. twórcy, marki, małe firmy, B2B", "E.g. creators, brands, small businesses, B2B")}
                style={fieldStyle}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end" }}>
            <div>
              <div style={labelStyle}>{text("Link źródłowy / strona / blog", "Source link / website / blog")}</div>
              <input
                value={draft.source_url}
                onChange={(event) => updateDraft("source_url", event.target.value)}
                placeholder={text("https://... — opcjonalnie pobierz kontekst", "https://... — optionally collect context")}
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
              {text("Pobierz kontekst", "Collect context")}
            </button>
          </div>

          <div>
            <div style={labelStyle}>{text("Okładka / miniatura wpisu", "Post cover / thumbnail")}</div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => selectBlogCover(event.target.files?.[0] || null)}
              style={{ display: "none" }}
            />

            {!blogCover ? (
              <button
                type="button"
                className="blog-btn"
                onClick={() => coverInputRef.current?.click()}
                style={{
                  width: "100%",
                  minHeight: 92,
                  borderRadius: 16,
                  border: `1px dashed ${css.border}`,
                  background: css.surfaceSoft,
                  color: css.text,
                  padding: 14,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  display: "grid",
                  placeItems: "center",
                  textAlign: "center",
                }}
              >
                <span>
                  <ImagePlus size={22} color={css.accent} />
                  <strong style={{ display: "block", marginTop: 6, fontSize: 12 }}>
                    {text("Dodaj zdjęcie do wpisu", "Add an image to the post")}
                  </strong>
                  <span style={{ display: "block", color: css.muted, fontSize: 10, marginTop: 4 }}>
                    {text("JPG, PNG, WebP lub GIF", "JPG, PNG, WebP or GIF")}
                  </span>
                </span>
              </button>
            ) : (
              <div
                style={{
                  borderRadius: 16,
                  border: `1px solid ${css.border}`,
                  background: css.surfaceSoft,
                  overflow: "hidden",
                }}
              >
                <img
                  src={blogCover.previewUrl}
                  alt={blogCover.file.name}
                  style={{
                    width: "100%",
                    maxHeight: 280,
                    objectFit: "cover",
                    display: "block",
                    background: "#000",
                  }}
                />
                <div style={{ padding: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: css.text, fontSize: 11, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {blogCover.file.name}
                      </div>
                      <div style={{ color: css.muted, fontSize: 10, marginTop: 3 }}>
                        {formatMediaSize(blogCover.file.size)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBlogCover(true)}
                      disabled={saving}
                      style={{
                        borderRadius: 10,
                        border: "1px solid #ef444455",
                        background: "#ef444412",
                        color: "#ef4444",
                        padding: "7px 10px",
                        cursor: saving ? "not-allowed" : "pointer",
                        fontSize: 10,
                        fontWeight: 900,
                      }}
                    >
                      {text("Usuń", "Remove")}
                    </button>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, color: coverUploadProgress === 100 ? "#22c55e" : css.muted, fontSize: 10, fontWeight: 800, marginTop: 10 }}>
                    <span>
                      {coverUploadStatus ||
                        text(
                          "Zdjęcie wybrane — zostanie wysłane przy zapisie",
                          "Image selected — it will upload when saved"
                        )}
                    </span>
                    <span>
                      {coverUploadProgress > 0
                        ? `${coverUploadProgress}%`
                        : text("Podgląd", "Preview")}
                    </span>
                  </div>
                  <div style={{ height: 7, borderRadius: 999, background: css.bg, overflow: "hidden", marginTop: 7 }}>
                    <div
                      style={{
                        width: `${coverUploadProgress > 0 ? coverUploadProgress : 100}%`,
                        height: "100%",
                        borderRadius: 999,
                        background: coverUploadProgress === 100 ? "#22c55e" : css.accent,
                        transition: "width .25s ease",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 8 }}>
              <div style={labelStyle}>{text("Notatnik pisarza", "Writer's notebook")}</div>
              <div style={{ display: "flex", gap: 8, color: css.muted, fontSize: 10, fontWeight: 800 }}>
                <span>{stats.words} {text("słów", "words")}</span>
                <span>{stats.read} {text("min czytania", "min read")}</span>
                <span>{stats.chars} {text("znaków", "characters")}</span>
              </div>
            </div>
            <textarea
              ref={editorRef}
              value={draft.body}
              onChange={(event) => updateDraft("body", event.target.value)}
              onSelect={captureSelection}
              className="blog-editor"
              placeholder={text(
                "Zacznij pisać tutaj. To może być brudnopis, fragment artykułu, luźne myśli albo pełny wpis. Kiedy utkniesz, użyj narzędzi AI po lewej stronie.",
                "Start writing here. This can be a rough draft, an article excerpt, loose notes or a complete post. When you get stuck, use the AI tools on the left."
              )}
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
              <div style={labelStyle}>{text("CTA / cel wpisu", "CTA / post goal")}</div>
              <input
                value={draft.cta}
                onChange={(event) => updateDraft("cta", event.target.value)}
                placeholder={text(
                  "Np. przejście do aplikacji, zapytanie, pobranie demo",
                  "E.g. visit the app, send an inquiry, request a demo"
                )}
                style={fieldStyle}
              />
            </div>
            <div>
              <div style={labelStyle}>{text("Notatki dla siebie", "Private notes")}</div>
              <input
                value={draft.notes}
                onChange={(event) => updateDraft("notes", event.target.value)}
                placeholder={text("Co jeszcze dopisać, czego nie zapomnieć?", "What else should be added or remembered?")}
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
              {saving ? text("Zapisuję...", "Saving...") : text("Zapisz szkic", "Save draft")}
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
              {text("Zapisz jako szablon", "Save as template")}
            </button>
            <button
              type="button"
              className="blog-btn"
              onClick={() => {
                setDraft(EMPTY_DRAFT);
                removeBlogCover();
              }}
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
              {text("Nowy szkic", "New draft")}
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
              {text("Odpowiedź AI", "AI response")}
            </div>
            {!aiOutput && !loadingAction && (
              <div style={{ borderRadius: 18, border: `1px dashed ${css.border}`, background: dark ? "#080808" : "#FFFDFB", padding: 20, minHeight: 280, display: "grid", placeItems: "center", textAlign: "center" }}>
                <div>
                  <div style={{ fontSize: 34, color: css.aiText, opacity: .35 }}>✦</div>
                  <h3 style={{ margin: "8px 0", color: css.heading, fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 500 }}>
                    {text("AI pisarz czeka obok", "Your AI writer is ready")}
                  </h3>
                  <p style={{ margin: 0, color: css.muted, fontSize: 12, lineHeight: 1.7 }}>
                    {text(
                      "Wybierz narzędzie po lewej. Wynik możesz dopisać do notatnika, wkleić w miejsce zaznaczenia albo potraktować jako inspirację.",
                      "Choose a tool on the left. You can append the result to the notebook, replace selected text or use it as inspiration."
                    )}
                  </p>
                </div>
              </div>
            )}

            {loadingAction && (
              <div style={{ borderRadius: 18, border: `1px solid ${css.aiBorder}`, background: css.aiBg, padding: 20, minHeight: 220, display: "grid", placeItems: "center", textAlign: "center" }}>
                <div>
                  <div style={{ color: css.aiText, fontSize: 13, fontWeight: 900 }}>{text("AI pisze...", "AI is writing...")}</div>
                  <p style={{ color: css.muted, fontSize: 12, lineHeight: 1.6 }}>
                    {text(
                      "Pracuję na Twoim szkicu, notatkach i wybranym zadaniu.",
                      "I am working with your draft, notes and selected task."
                    )}
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
                    {text("Dopisz do tekstu", "Append to text")}
                  </button>
                  <button
                    type="button"
                    className="blog-btn"
                    onClick={() => insertIntoEditor(aiOutput, "replace-selection")}
                    disabled={!selectedText}
                    style={{ borderRadius: 13, border: `1px solid ${css.border}`, background: css.surfaceSoft, color: selectedText ? css.text : css.muted, padding: "10px 8px", fontSize: 11, fontWeight: 900, cursor: selectedText ? "pointer" : "not-allowed", opacity: selectedText ? 1 : .55, fontFamily: "var(--font-body)" }}
                  >
                    {text("Zamień zaznaczenie", "Replace selection")}
                  </button>
                </div>
                <button
                  type="button"
                  className="blog-btn"
                  onClick={() => navigator.clipboard.writeText(aiOutput)}
                  style={{ borderRadius: 13, border: `1px solid ${css.border}`, background: "transparent", color: css.muted, padding: "10px 8px", fontSize: 11, fontWeight: 900, cursor: "pointer", fontFamily: "var(--font-body)" }}
                >
                  {text("Kopiuj odpowiedź AI", "Copy AI response")}
                </button>
              </div>
            )}
          </div>

          {sourceNotes && (
            <details style={{ position: "relative", zIndex: 1, borderRadius: 14, border: `1px solid ${css.border}`, background: css.surfaceSoft, padding: 10 }}>
              <summary style={{ color: css.muted, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>{text("Kontekst pobrany ze strony", "Context collected from the website")}</summary>
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
