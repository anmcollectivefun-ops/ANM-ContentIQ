"use client";

// app/components/BrandVoice.tsx
// Brand profiles + platform-specific Brand Voice for ANM ContentIQ

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Pencil, Wand2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Platform =
  | "instagram"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "blog"
  | "spotify";

type AiProvider = "deepseek" | "gemini";

type BrandProfile = {
  id?: string;
  workspace_id?: string;
  name: string;
  website_url: string;
  logo_url: string;
  brand_description: string;
  brand_values: string;
  target_audience: string;
  keywords: string[];
  avoid_words: string[];
  source_notes: string;
  is_default: boolean;
};

type PlatformSuggestion = {
  tone?: string;
  style?: string;
  cta_options?: string[];
  content_rules?: string;
  why?: string;
  best_examples_to_follow?: Array<{
    title?: string;
    reason?: string;
    metrics?: string;
    content?: string;
  }>;
};

type PlatformProfile = {
  id?: string;
  brand_profile_id?: string;
  platform: Platform;
  tone: string;
  style: string;
  cta_style: string;
  content_rules: string;
  ai_suggestions: PlatformSuggestion;
  selected_examples: Array<{
    title?: string;
    content?: string;
    metrics?: string;
    reason?: string;
  }>;
  user_notes: string;
};

type ConnectionRow = {
  id: string;
  platform: Platform;
};

type PostRow = {
  connection_id: string;
  title: string | null;
  content: string | null;
  post_type: string | null;
  reach: number | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  clicks: number | null;
  ai_score: number | null;
  published_at: string | null;
};

const PLATFORMS: { id: Platform; name: string; color: string; short: string; defaultTone: string; defaultCta: string }[] = [
  {
    id: "linkedin",
    name: "LinkedIn",
    color: "#0A66C2",
    short: "in",
    defaultTone: "Ekspercki, konkretny, B2B, oparty na wnioskach i przykładach.",
    defaultCta: "Zaproś do rozmowy, komentarza, demo lub kontaktu — bez nachalnej sprzedaży.",
  },
  {
    id: "instagram",
    name: "Instagram",
    color: "#E1306C",
    short: "IG",
    defaultTone: "Wizualny, lekki, emocjonalny, prosty i zapisujący się w pamięci.",
    defaultCta: "Zapisz, udostępnij, napisz w wiadomości, sprawdź link w bio.",
  },
  {
    id: "tiktok",
    name: "TikTok",
    color: "#FFFFFF",
    short: "TT",
    defaultTone: "Luźny, szybki, naturalny, z humorem i mocnym hookiem w pierwszej sekundzie.",
    defaultCta: "Zadaj pytanie, sprowokuj komentarz, zachęć do obserwacji przez wartość — nie przez suche „kup teraz”.",
  },
  {
    id: "facebook",
    name: "Facebook",
    color: "#1877F2",
    short: "FB",
    defaultTone: "Społecznościowy, rozmowny, prostszy, bardziej relacyjny.",
    defaultCta: "Zapytaj o opinię, zachęć do wiadomości, komentarza lub udostępnienia.",
  },
  {
    id: "youtube",
    name: "YouTube",
    color: "#FF0033",
    short: "YT",
    defaultTone: "Edukacyjny, retencyjny, konkretny, z jasną obietnicą w tytule.",
    defaultCta: "Obejrzyj kolejny materiał, zapisz, zasubskrybuj jeśli temat ma wracać.",
  },
  {
    id: "blog",
    name: "Blog",
    color: "#22C55E",
    short: "BL",
    defaultTone: "SEO, ekspercki, uporządkowany, pomocny i dłuższy.",
    defaultCta: "Przejdź do oferty, pobierz materiał, sprawdź usługę, skontaktuj się.",
  },
  {
    id: "spotify",
    name: "Spotify",
    color: "#1DB954",
    short: "SP",
    defaultTone: "Rozmowny, narracyjny, ekspercki, ale naturalny jak dialog.",
    defaultCta: "Zasubskrybuj odcinek, wyślij pytanie, sprawdź notatki lub link z opisu.",
  },
];

const EMPTY_BRAND: BrandProfile = {
  name: "Główna marka",
  website_url: "",
  logo_url: "",
  brand_description: "",
  brand_values: "",
  target_audience: "",
  keywords: [],
  avoid_words: [],
  source_notes: "",
  is_default: true,
};

function emptyPlatformProfile(platform: Platform): PlatformProfile {
  const meta = PLATFORMS.find((item) => item.id === platform);

  return {
    platform,
    tone: meta?.defaultTone || "",
    style: "",
    cta_style: meta?.defaultCta || "",
    content_rules: "",
    ai_suggestions: {},
    selected_examples: [],
    user_notes: "",
  };
}

function emptyPlatformProfiles() {
  return PLATFORMS.reduce((acc, item) => {
    acc[item.id] = emptyPlatformProfile(item.id);
    return acc;
  }, {} as Record<Platform, PlatformProfile>);
}

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function safeText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeBrandProfile(value: Partial<BrandProfile>): BrandProfile {
  return {
    ...EMPTY_BRAND,
    ...value,
    name: safeText(value.name) || EMPTY_BRAND.name,
    website_url: safeText(value.website_url),
    logo_url: safeText(value.logo_url),
    brand_description: safeText(value.brand_description),
    brand_values: safeText(value.brand_values),
    target_audience: safeText(value.target_audience),
    keywords: safeArray(value.keywords),
    avoid_words: safeArray(value.avoid_words),
    source_notes: safeText(value.source_notes),
    is_default: Boolean(value.is_default),
  };
}

function normalizePlatformProfile(
  platform: Platform,
  value: Partial<PlatformProfile> = {}
): PlatformProfile {
  const defaults = emptyPlatformProfile(platform);

  return {
    ...defaults,
    ...value,
    platform,
    tone: safeText(value.tone) || defaults.tone,
    style: safeText(value.style),
    cta_style: safeText(value.cta_style) || defaults.cta_style,
    content_rules: safeText(value.content_rules),
    ai_suggestions: (value.ai_suggestions || {}) as PlatformSuggestion,
    selected_examples: safeArray(value.selected_examples),
    user_notes: safeText(value.user_notes),
  };
}

function parseList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanJsonAnswer(answer: string) {
  return answer
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function postReach(post: PostRow) {
  return Number(post.reach || post.impressions || 0);
}

function postEngagement(post: PostRow) {
  return (
    Number(post.likes || 0) +
    Number(post.comments || 0) +
    Number(post.shares || 0) +
    Number(post.saves || 0) +
    Number(post.clicks || 0)
  );
}

function formatMetric(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value || 0));
}

export default function BrandVoice({
  dark = true,
  workspaceId,
}: {
  dark?: boolean;
  workspaceId: string;
}) {
  const supabase = createClient();

  const [workspaceUuid, setWorkspaceUuid] = useState("");
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [brand, setBrand] = useState<BrandProfile>(EMPTY_BRAND);
  const [platformProfiles, setPlatformProfiles] = useState<Record<Platform, PlatformProfile>>(emptyPlatformProfiles);
  const [activePlatform, setActivePlatform] = useState<Platform>("linkedin");
  const [aiProvider, setAiProvider] = useState<AiProvider>("deepseek");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [newAvoid, setNewAvoid] = useState("");
  const [scraping, setScraping] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [bestPosts, setBestPosts] = useState<Record<Platform, PostRow[]>>({
    instagram: [],
    linkedin: [],
    tiktok: [],
    youtube: [],
    facebook: [],
    blog: [],
    spotify: [],
  });

  const css = dark
    ? {
        bg: "#1A2233",
        surface: "#070707",
        surfaceSoft: "#101010",
        text: "#FFFFFF",
        muted: "#C9CED8",
        border: "rgba(255,255,255,0.10)",
        accent: "#8E443D",
        input: "#101010",
        heading: "#8E443D",
        aiText: "#D8B4FE",
        aiIcon: "#F0ABFC",
        aiBorder: "rgba(192,132,252,0.55)",
        aiBgSoft: "rgba(147,51,234,0.12)",
        aiGlow: "0 16px 42px rgba(168,85,247,0.16)",
      }
    : {
        bg: "#FFFFFF",
        surface: "#B5937A",
        surfaceSoft: "#F7F2EF",
        text: "#231F20",
        muted: "#5F5A57",
        border: "rgba(35,31,32,0.14)",
        accent: "#231F20",
        input: "#F7F2EF",
        heading: "#231F20",
        aiText: "#6D28D9",
        aiIcon: "#A855F7",
        aiBorder: "rgba(124,58,237,0.34)",
        aiBgSoft: "rgba(245,243,255,0.95)",
        aiGlow: "0 16px 38px rgba(124,58,237,0.13)",
      };

  const activeMeta = PLATFORMS.find((item) => item.id === activePlatform) || PLATFORMS[0];
  const activeProfile = platformProfiles[activePlatform];

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 12,
    border: `1px solid ${css.border}`,
    background: css.input,
    color: css.text,
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
  };

  const cardStyle: CSSProperties = {
    padding: 18,
    borderRadius: 18,
    background: css.surface,
    border: `1px solid ${css.border}`,
  };

  async function getWsId() {
    const { data: ws, error: wsError } = await supabase
      .schema("contentiq")
      .from("workspaces")
      .select("id")
      .eq("slug", workspaceId)
      .single();

    if (wsError || !ws?.id) throw new Error(wsError?.message || "Nie znaleziono workspace.");
    return ws.id as string;
  }

  async function loadBestPosts(wsId: string) {
    const { data: connections } = await supabase
      .schema("contentiq")
      .from("platform_connections")
      .select("id,platform")
      .eq("workspace_id", wsId)
      .eq("connected", true);

    const typedConnections = (connections || []) as ConnectionRow[];
    const connectionIds = typedConnections.map((item) => item.id);

    if (connectionIds.length === 0) return;

    const { data: posts } = await supabase
      .schema("contentiq")
      .from("posts")
      .select("connection_id,title,content,post_type,reach,impressions,likes,comments,shares,saves,clicks,ai_score,published_at")
      .in("connection_id", connectionIds)
      .order("published_at", { ascending: false })
      .limit(250);

    const connectionById = new Map(typedConnections.map((item) => [item.id, item.platform]));
    const nextBestPosts: Record<Platform, PostRow[]> = {
      instagram: [],
      linkedin: [],
      tiktok: [],
      youtube: [],
      facebook: [],
      blog: [],
      spotify: [],
    };

    ((posts || []) as PostRow[]).forEach((post) => {
      const platform = connectionById.get(post.connection_id);
      if (platform) nextBestPosts[platform].push(post);
    });

    PLATFORMS.forEach((platform) => {
      nextBestPosts[platform.id] = nextBestPosts[platform.id]
        .sort((a, b) => {
          const aPower = postReach(a) + postEngagement(a) * 8 + Number(a.ai_score || 0) * 40;
          const bPower = postReach(b) + postEngagement(b) * 8 + Number(b.ai_score || 0) * 40;
          return bPower - aPower;
        })
        .slice(0, 5);
    });

    setBestPosts(nextBestPosts);
  }

  async function load() {
    setLoading(true);
    setError("");

    try {
      const wsId = await getWsId();
      setWorkspaceUuid(wsId);

      const { data: brandRows, error: brandError } = await supabase
        .schema("contentiq")
        .from("brand_profiles")
        .select("*")
        .eq("workspace_id", wsId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });

      if (brandError) throw new Error(brandError.message);

      const typedBrands = ((brandRows || []) as BrandProfile[]).map((item) =>
        normalizeBrandProfile(item)
      );

      setBrands(typedBrands);

      const selectedBrand = typedBrands[0] || { ...EMPTY_BRAND, workspace_id: wsId };
      setBrand(selectedBrand);

      if (selectedBrand.id) {
        await loadPlatformProfiles(selectedBrand.id);
      } else {
        setPlatformProfiles(emptyPlatformProfiles());
      }

      await loadBestPosts(wsId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadPlatformProfiles(brandId: string) {
    const { data: rows, error: platformError } = await supabase
      .schema("contentiq")
      .from("brand_platform_profiles")
      .select("*")
      .eq("brand_profile_id", brandId);

    if (platformError) throw new Error(platformError.message);

    const next = emptyPlatformProfiles();

    ((rows || []) as PlatformProfile[]).forEach((row) => {
      if (PLATFORMS.some((item) => item.id === row.platform)) {
        next[row.platform] = normalizePlatformProfile(row.platform, row);
      }
    });

    setPlatformProfiles(next);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function ensureBrandSaved() {
    const wsId = workspaceUuid || (await getWsId());
    setWorkspaceUuid(wsId);
    const normalizedBrand = normalizeBrandProfile(brand);

    const payload = {
      workspace_id: wsId,
      name: normalizedBrand.name.trim() || "Główna marka",
      website_url: normalizedBrand.website_url.trim() || null,
      logo_url: normalizedBrand.logo_url.trim() || null,
      brand_description: normalizedBrand.brand_description.trim() || null,
      brand_values: normalizedBrand.brand_values.trim() || null,
      target_audience: normalizedBrand.target_audience.trim() || null,
      keywords: normalizedBrand.keywords,
      avoid_words: normalizedBrand.avoid_words,
      source_notes: normalizedBrand.source_notes.trim() || null,
      is_default: normalizedBrand.is_default,
      updated_at: new Date().toISOString(),
    };

    if (brand.id) {
      const { error: updateError } = await supabase
        .schema("contentiq")
        .from("brand_profiles")
        .update(payload)
        .eq("id", brand.id);

      if (updateError) throw new Error(updateError.message);
      const normalized = normalizeBrandProfile({
        ...brand,
        id: brand.id,
        workspace_id: wsId,
        name: payload.name,
        website_url: payload.website_url || "",
        logo_url: payload.logo_url || "",
        brand_description: payload.brand_description || "",
        brand_values: payload.brand_values || "",
        target_audience: payload.target_audience || "",
        keywords: payload.keywords,
        avoid_words: payload.avoid_words,
        source_notes: payload.source_notes || "",
        is_default: payload.is_default,
      });
      setBrand(normalized);
      setBrands((current) =>
        current.map((item) => (item.id === brand.id ? normalized : item))
      );
      return brand.id;
    }

    const { data: created, error: insertError } = await supabase
      .schema("contentiq")
      .from("brand_profiles")
      .insert(payload)
      .select("*")
      .single();

    if (insertError || !created?.id) throw new Error(insertError?.message || "Nie udało się utworzyć brandu.");

    const createdBrand = normalizeBrandProfile(created as BrandProfile);
    setBrand(createdBrand);
    setBrands((current) => [createdBrand, ...current]);

    return created.id as string;
  }

  async function saveAll() {
    setSaving(true);
    setError("");

    try {
      const brandId = await ensureBrandSaved();

      const rows = PLATFORMS.map((item) => {
        const profile = platformProfiles[item.id];
        return {
          brand_profile_id: brandId,
          platform: item.id,
          tone: profile.tone || null,
          style: profile.style || null,
          cta_style: profile.cta_style || null,
          content_rules: profile.content_rules || null,
          ai_suggestions: profile.ai_suggestions || {},
          selected_examples: profile.selected_examples || [],
          user_notes: profile.user_notes || null,
          updated_at: new Date().toISOString(),
        };
      });

      const { error: upsertError } = await supabase
        .schema("contentiq")
        .from("brand_platform_profiles")
        .upsert(rows, { onConflict: "brand_profile_id,platform" });

      if (upsertError) throw new Error(upsertError.message);

      setSaved(true);
      setTimeout(() => setSaved(false), 2800);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveBrandProfile() {
    setSaving(true);
    setError("");

    try {
      await ensureBrandSaved();
      setSaved(true);
      setTimeout(() => setSaved(false), 2800);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function savePlatform(platform: Platform) {
    setSaving(true);
    setError("");

    try {
      const brandId = await ensureBrandSaved();
      const profile = platformProfiles[platform];

      const { error: upsertError } = await supabase
        .schema("contentiq")
        .from("brand_platform_profiles")
        .upsert(
          {
            brand_profile_id: brandId,
            platform,
            tone: profile.tone || null,
            style: profile.style || null,
            cta_style: profile.cta_style || null,
            content_rules: profile.content_rules || null,
            ai_suggestions: profile.ai_suggestions || {},
            selected_examples: profile.selected_examples || [],
            user_notes: profile.user_notes || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "brand_profile_id,platform" }
        );

      if (upsertError) throw new Error(upsertError.message);
      setSaved(true);
      setTimeout(() => setSaved(false), 2600);
      await loadPlatformProfiles(brandId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function createNewBrand() {
    setBrand({ ...EMPTY_BRAND, name: `Nowy brand ${brands.length + 1}` });
    setPlatformProfiles(emptyPlatformProfiles());
    setActivePlatform("linkedin");
    setError("");
  }

  async function selectBrand(brandId: string) {
    const next = brands.find((item) => item.id === brandId);
    if (!next) return;
    setBrand(next);
    setActivePlatform("linkedin");
    await loadPlatformProfiles(brandId);
  }

  async function scrapeWebsite() {
    if (!brand.website_url.trim()) {
      setError("Najpierw wpisz adres strony marki.");
      return;
    }

    setScraping(true);
    setError("");

    try {
      const res = await fetch("/api/brand/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: brand.website_url }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.error) {
        throw new Error(json?.error || "Nie udało się pobrać strony.");
      }

      setBrand((current) => ({
        ...current,
        source_notes: json.source_notes || current.source_notes,
        brand_description:
          current.brand_description ||
          [json.title ? `Marka/strona: ${json.title}` : "", json.description ? `Opis: ${json.description}` : ""]
            .filter(Boolean)
            .join("\n"),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setScraping(false);
    }
  }

  function updateBrandField<K extends keyof BrandProfile>(field: K, value: BrandProfile[K]) {
    setBrand((current) => ({ ...current, [field]: value }));
  }

  function updatePlatformField<K extends keyof PlatformProfile>(
    platform: Platform,
    field: K,
    value: PlatformProfile[K]
  ) {
    setPlatformProfiles((current) => ({
      ...current,
      [platform]: {
        ...current[platform],
        [field]: value,
      },
    }));
  }

  function addTag(field: "keywords" | "avoid_words", value: string, setter: (value: string) => void) {
    const tags = parseList(value);
    if (tags.length === 0) return;

    setBrand((current) => ({
      ...current,
      [field]: Array.from(new Set([...safeArray(current[field]), ...tags])),
    }));

    setter("");
  }

  function removeTag(field: "keywords" | "avoid_words", index: number) {
    setBrand((current) => ({
      ...current,
      [field]: safeArray(current[field]).filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  const bestPostsForActivePlatform = useMemo(() => {
    return bestPosts[activePlatform] || [];
  }, [bestPosts, activePlatform]);

  async function suggestPlatform(platform: Platform) {
    const meta = PLATFORMS.find((item) => item.id === platform) || PLATFORMS[0];
    const currentProfile = platformProfiles[platform];
    const postsForPlatform = (bestPosts[platform] || []).map((post) => ({
      title: post.title,
      content: post.content?.slice(0, 900),
      type: post.post_type,
      reach: postReach(post),
      engagement: postEngagement(post),
      ai_score: post.ai_score,
      published_at: post.published_at,
    }));

    setAiLoading(platform);
    setError("");

    try {
      const prompt = `
Jesteś AI Brand Strategiem w ANM ContentIQ.

Twoje zadanie: zaproponuj ustawienia Brand Voice dla konkretnej platformy, nie ogólnie dla całej marki.

Platforma: ${meta.name}
Domyślna logika platformy: ${meta.defaultTone}
Domyślna logika CTA: ${meta.defaultCta}

Dane marki:
- Nazwa: ${brand.name || "brak"}
- Strona: ${brand.website_url || "brak"}
- Logo: ${brand.logo_url || "brak"}
- Opis marki: ${brand.brand_description || "brak"}
- Wartości/DNA: ${brand.brand_values || "brak"}
- Odbiorca: ${brand.target_audience || "brak"}
- Słowa lubiane: ${safeArray(brand.keywords).join(", ") || "brak"}
- Słowa zakazane: ${safeArray(brand.avoid_words).join(", ") || "brak"}
- Dane ze strony: ${brand.source_notes || "brak"}

Obecne ustawienia tej platformy:
- Ton: ${currentProfile.tone || "brak"}
- Styl: ${currentProfile.style || "brak"}
- CTA: ${currentProfile.cta_style || "brak"}
- Zasady: ${currentProfile.content_rules || "brak"}
- Notatki użytkownika: ${currentProfile.user_notes || "brak"}

Najlepsze posty pobrane z wyników tej platformy:
${postsForPlatform.length ? JSON.stringify(postsForPlatform, null, 2) : "Brak danych o postach dla tej platformy."}

Ważne:
- Nie dawaj jednego tonu dla wszystkich platform.
- Nie proponuj tego samego CTA dla LinkedIn i TikToka.
- Dla TikToka unikaj nachalnego „kup teraz”, chyba że marka wyraźnie tego wymaga.
- Jeżeli danych brakuje, daj rozsądne propozycje startowe i napisz, czego brakuje.
- Wybierz najlepsze przykłady z postów, jeśli są dostępne.

Zwróć wyłącznie JSON, bez markdown:
{
  "tone": "konkretny ton dla tej platformy",
  "style": "styl treści dla tej platformy",
  "cta_options": ["3-5 propozycji CTA dopasowanych do platformy"],
  "content_rules": "zasady pisania dla tej platformy: czego używać, czego unikać, długość, hook, energia, format",
  "why": "krótkie uzasadnienie na podstawie danych marki i postów",
  "best_examples_to_follow": [
    {
      "title": "tytuł lub skrót posta",
      "reason": "dlaczego warto się wzorować",
      "metrics": "metryki w skrócie",
      "content": "krótki fragment treści"
    }
  ]
}`.trim();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          provider: aiProvider,
          prompt,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.error) {
        throw new Error(json?.details || json?.error || "AI nie zwróciło sugestii.");
      }

      const suggestion = JSON.parse(cleanJsonAnswer(json.answer || "{}")) as PlatformSuggestion;

      setPlatformProfiles((current) => ({
        ...current,
        [platform]: {
          ...current[platform],
          tone: suggestion.tone || current[platform].tone,
          style: suggestion.style || current[platform].style,
          cta_style: safeArray(suggestion.cta_options).join("\n") || current[platform].cta_style,
          content_rules: suggestion.content_rules || current[platform].content_rules,
          ai_suggestions: suggestion,
          selected_examples: safeArray(suggestion.best_examples_to_follow),
        },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiLoading(null);
    }
  }

  async function suggestBrandBase() {
    setAiLoading("brand");
    setError("");

    try {
      const allBestPosts = PLATFORMS.flatMap((platform) =>
        (bestPosts[platform.id] || []).slice(0, 2).map((post) => ({
          platform: platform.name,
          title: post.title,
          content: post.content?.slice(0, 700),
          reach: postReach(post),
          engagement: postEngagement(post),
          ai_score: post.ai_score,
        }))
      );

      const prompt = `
Jesteś strategiem marki w ANM ContentIQ.

Na podstawie danych marki, strony i najlepszych postów zaproponuj bazowe DNA marki.

Dane aktualne:
- Nazwa: ${brand.name || "brak"}
- Strona: ${brand.website_url || "brak"}
- Opis: ${brand.brand_description || "brak"}
- Wartości: ${brand.brand_values || "brak"}
- Odbiorca: ${brand.target_audience || "brak"}
- Dane ze strony: ${brand.source_notes || "brak"}
- Najlepsze posty: ${allBestPosts.length ? JSON.stringify(allBestPosts, null, 2) : "brak"}

Zwróć wyłącznie JSON:
{
  "brand_description": "opis marki 2-4 zdania",
  "brand_values": "wartości i DNA marki",
  "target_audience": "najważniejsze grupy odbiorców",
  "keywords": ["słowa i frazy, których marka powinna używać"],
  "avoid_words": ["słowa lub style, których marka powinna unikać"]
}`.trim();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          provider: aiProvider,
          prompt,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.error) {
        throw new Error(json?.details || json?.error || "AI nie zwróciło propozycji marki.");
      }

      const suggestion = JSON.parse(cleanJsonAnswer(json.answer || "{}")) as Partial<BrandProfile>;

      setBrand((current) => ({
        ...current,
        brand_description: suggestion.brand_description || current.brand_description,
        brand_values: suggestion.brand_values || current.brand_values,
        target_audience: suggestion.target_audience || current.target_audience,
        keywords: safeArray(suggestion.keywords).length ? safeArray(suggestion.keywords) : current.keywords,
        avoid_words: safeArray(suggestion.avoid_words).length ? safeArray(suggestion.avoid_words) : current.avoid_words,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiLoading(null);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 28, borderRadius: 18, background: css.surface, border: `1px solid ${css.border}`, color: css.muted }}>
        Ładowanie profili marki...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "var(--font-body)", color: css.text, display: "grid", gap: 18 }}>
      <style>{`
        *{box-sizing:border-box}
        .bv-input:focus{border-color:${css.accent}!important}
        .bv-btn{transition:opacity .15s, transform .15s; cursor:pointer; font-family:inherit}
        .bv-btn:hover{opacity:.86; transform:translateY(-1px)}
        textarea{resize:vertical; font-family:inherit}
        @media(max-width:980px){.bv-grid{grid-template-columns:1fr!important}.bv-platform-layout{grid-template-columns:1fr!important}.bv-saved-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
        @media(max-width:620px){.bv-saved-grid{grid-template-columns:1fr!important}}
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "var(--font-label)", fontSize: 11, fontWeight: 900, color: css.accent, textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 8 }}>
            Brand Voice / profile marek
          </div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 32, lineHeight: 1.05, fontWeight: 500, color: css.heading, margin: 0 }}>
            Osobny styl dla każdej platformy
          </h2>
          <p style={{ color: css.muted, fontSize: 13, lineHeight: 1.7, maxWidth: 820, margin: "10px 0 0" }}>
            Marka ma jedno DNA, ale LinkedIn, TikTok, Instagram i Facebook nie powinny mówić identycznie. Tutaj zapisujesz profil marki oraz osobne zasady, ton i CTA dla każdej platformy.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            value={brand.id || "new"}
            onChange={(event) => {
              if (event.target.value === "new") void createNewBrand();
              else void selectBrand(event.target.value);
            }}
            style={{ ...inputStyle, width: 210 }}
          >
            {brand.id ? null : <option value="new">Nowy brand</option>}
            {brands.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <button className="bv-btn" type="button" onClick={createNewBrand} style={secondaryButton(css)}>
            + Dodaj brand
          </button>
        </div>
      </div>

      {brands.length > 0 ? (
        <section style={cardStyle}>
          <SectionLabel color={css.accent}>Zapisane profile firm</SectionLabel>
          <p style={{ color: css.muted, fontSize: 12, lineHeight: 1.6, margin: "0 0 14px" }}>
            Te profile są zapisane w bazie i stanowią stały kontekst marki dla funkcji AI.
          </p>
          <div className="bv-saved-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
            {brands.map((item) => {
              const selected = item.id === brand.id;
              return (
                <article
                  key={item.id}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    background: selected ? css.surfaceSoft : css.surface,
                    border: `1px solid ${selected ? css.accent : css.border}`,
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {item.logo_url ? (
                      <img
                        src={item.logo_url}
                        alt=""
                        style={{ width: 42, height: 42, borderRadius: 12, objectFit: "cover", border: `1px solid ${css.border}` }}
                      />
                    ) : (
                      <div style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: `${css.accent}22`, color: css.accent, fontWeight: 900 }}>
                        {(item.name || "B").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: css.text, fontWeight: 900, fontSize: 14 }}>{item.name}</div>
                      <div style={{ color: css.muted, fontSize: 11, marginTop: 3 }}>
                        {item.is_default ? "Główny profil marki" : "Profil marki"}
                      </div>
                    </div>
                  </div>
                  <p style={{ color: css.muted, fontSize: 12, lineHeight: 1.55, margin: "12px 0", minHeight: 38 }}>
                    {item.brand_description || "Profil zapisany. Uzupełnij opis, aby AI miało pełniejszy kontekst."}
                  </p>
                  <button
                    className="bv-btn"
                    type="button"
                    onClick={() => item.id && void selectBrand(item.id)}
                    style={{ ...secondaryButton(css), width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}
                  >
                    <Pencil size={14} />
                    {selected ? "Edytujesz ten profil" : "Edytuj profil"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="bv-grid" style={{ display: "grid", gridTemplateColumns: "1fr .9fr", gap: 14 }}>
        <div style={cardStyle}>
          <SectionLabel color={css.accent}>Profil marki</SectionLabel>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Nazwa brandu">
                <input value={brand.name} onChange={(event) => updateBrandField("name", event.target.value)} style={inputStyle} />
              </Field>
              <Field label="Link do strony">
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={brand.website_url}
                    onChange={(event) => updateBrandField("website_url", event.target.value)}
                    placeholder="https://twojastrona.pl"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button className="bv-btn" type="button" onClick={scrapeWebsite} disabled={scraping} style={smallAiButton(css)}>
                    {scraping ? "Pobieram..." : "Pobierz"}
                  </button>
                </div>
              </Field>
            </div>

            <Field label="Logo URL">
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {brand.logo_url ? (
                  <img src={brand.logo_url} alt="Logo" style={{ width: 48, height: 48, borderRadius: 14, objectFit: "cover", border: `1px solid ${css.border}` }} />
                ) : null}
                <input
                  value={brand.logo_url}
                  onChange={(event) => updateBrandField("logo_url", event.target.value)}
                  placeholder="https://.../logo.png"
                  style={inputStyle}
                />
              </div>
            </Field>

            <Field label="Opis marki / co robicie">
              <textarea
                value={brand.brand_description}
                onChange={(event) => updateBrandField("brand_description", event.target.value)}
                rows={4}
                placeholder="Opisz markę po ludzku: co robicie, dla kogo i dlaczego to ma znaczenie."
                style={inputStyle}
              />
            </Field>

            <Field label="Wartości i DNA marki">
              <textarea
                value={brand.brand_values}
                onChange={(event) => updateBrandField("brand_values", event.target.value)}
                rows={3}
                placeholder="Np. praktyczność, porządek, automatyzacja, prostsza praca, mniej chaosu."
                style={inputStyle}
              />
            </Field>

            <Field label="Odbiorcy">
              <textarea
                value={brand.target_audience}
                onChange={(event) => updateBrandField("target_audience", event.target.value)}
                rows={3}
                placeholder="Kim są odbiorcy? Co ich boli? Czego szukają?"
                style={inputStyle}
              />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <TagEditor
                label="Słowa i frazy lubiane"
                color="#22c55e"
                values={brand.keywords}
                inputValue={newKeyword}
                setInputValue={setNewKeyword}
                onAdd={() => addTag("keywords", newKeyword, setNewKeyword)}
                onRemove={(index) => removeTag("keywords", index)}
                inputStyle={inputStyle}
              />

              <TagEditor
                label="Słowa / style do unikania"
                color="#ef4444"
                values={brand.avoid_words}
                inputValue={newAvoid}
                setInputValue={setNewAvoid}
                onAdd={() => addTag("avoid_words", newAvoid, setNewAvoid)}
                onRemove={(index) => removeTag("avoid_words", index)}
                inputStyle={inputStyle}
              />
            </div>

            <button
              className="bv-btn"
              type="button"
              onClick={saveBrandProfile}
              disabled={saving}
              style={{ ...primaryButton(dark), width: "100%" }}
            >
              {saving ? "Zapisuję profil firmy..." : "Zapisz profil firmy"}
            </button>
          </div>
        </div>

        <div style={{ ...cardStyle, border: `1px solid ${css.aiBorder}`, boxShadow: css.aiGlow, position: "relative", overflow: "hidden" }}>
          <Glow />
          <div style={{ position: "relative", zIndex: 1 }}>
            <SectionLabel color={css.aiText} icon>
              AI pomocnik marki
            </SectionLabel>
            <h3 style={{ margin: "0 0 10px", color: css.heading, fontFamily: "var(--font-heading)", fontSize: 26, lineHeight: 1.08, fontWeight: 500 }}>
              Nie wpisuj wszystkiego od zera
            </h3>
            <p style={{ margin: "0 0 14px", color: css.muted, fontSize: 13, lineHeight: 1.7 }}>
              AI może pobrać opis ze strony, przejrzeć najlepsze posty z aplikacji i zaproponować DNA marki oraz osobny styl dla każdej platformy. Ty tylko poprawiasz i zapisujesz.
            </p>

            <div style={{ display: "grid", gap: 8 }}>
              <button className="bv-btn" type="button" onClick={suggestBrandBase} disabled={aiLoading === "brand"} style={primaryAiButton(css)}>
                <Wand2 size={15} color={css.aiIcon} />
                {aiLoading === "brand" ? "AI analizuje markę..." : "AI zaproponuj DNA marki"}
              </button>

              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ color: css.muted, fontSize: 12 }}>Silnik:</span>
                {(["deepseek", "gemini"] as const).map((provider) => (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => setAiProvider(provider)}
                    style={{
                      borderRadius: 999,
                      border: `1px solid ${aiProvider === provider ? css.aiBorder : css.border}`,
                      background: aiProvider === provider ? css.aiBgSoft : "transparent",
                      color: aiProvider === provider ? css.aiText : css.muted,
                      padding: "6px 10px",
                      fontSize: 11,
                      fontWeight: 900,
                      cursor: "pointer",
                      textTransform: "uppercase",
                    }}
                  >
                    {provider}
                  </button>
                ))}
              </div>
            </div>

            {brand.source_notes ? (
              <details style={{ marginTop: 14, background: css.surfaceSoft, border: `1px solid ${css.border}`, borderRadius: 14, padding: 12 }}>
                <summary style={{ cursor: "pointer", color: css.aiText, fontSize: 12, fontWeight: 800 }}>Dane pobrane ze strony</summary>
                <pre style={{ whiteSpace: "pre-wrap", color: css.muted, fontSize: 11, lineHeight: 1.65, marginTop: 10 }}>{brand.source_notes}</pre>
              </details>
            ) : null}
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <SectionLabel color={css.accent}>Profile per platforma</SectionLabel>

        {PLATFORMS.some((item) => Boolean(platformProfiles[item.id].id)) ? (
          <div style={{ marginBottom: 18 }}>
            <div style={{ color: css.muted, fontSize: 12, lineHeight: 1.6, marginBottom: 10 }}>
              Zapisane wzorce platformowe używane przez AI. Kliknij kafelek, aby edytować ton, CTA i zasady.
            </div>
            <div className="bv-saved-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
              {PLATFORMS.filter((item) => Boolean(platformProfiles[item.id].id)).map((platform) => {
                const profile = platformProfiles[platform.id];
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => setActivePlatform(platform.id)}
                    style={{
                      textAlign: "left",
                      padding: 12,
                      borderRadius: 14,
                      border: `1px solid ${activePlatform === platform.id ? platform.color : css.border}`,
                      background: activePlatform === platform.id ? `${platform.color}12` : css.surfaceSoft,
                      color: css.text,
                      cursor: "pointer",
                      minWidth: 0,
                    }}
                  >
                    <div style={{ color: platform.color, fontWeight: 900, fontSize: 12 }}>{platform.name}</div>
                    <div style={{ color: css.muted, fontSize: 11, lineHeight: 1.45, marginTop: 6 }}>
                      {(profile.tone || profile.style || "Zapisany profil platformy").slice(0, 90)}
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, color: css.aiText, fontSize: 10, fontWeight: 900, marginTop: 9 }}>
                      <Pencil size={12} />
                      Edytuj wzorzec AI
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {PLATFORMS.map((platform) => {
            const active = activePlatform === platform.id;
            return (
              <button
                key={platform.id}
                type="button"
                onClick={() => setActivePlatform(platform.id)}
                style={{
                  borderRadius: 999,
                  border: `1px solid ${active ? platform.color : css.border}`,
                  background: active ? `${platform.color}18` : "transparent",
                  color: active ? platform.color : css.muted,
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {platform.name}
              </button>
            );
          })}
        </div>

        <div className="bv-platform-layout" style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 14 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ color: activeMeta.color, fontFamily: "var(--font-heading)", fontSize: 28, lineHeight: 1.05, fontWeight: 500 }}>
                  {activeMeta.name}
                </div>
                <div style={{ color: css.muted, fontSize: 12, marginTop: 4 }}>
                  Osobny ton, styl, CTA i zasady dla tej platformy.
                </div>
              </div>

              <button className="bv-btn" type="button" onClick={() => suggestPlatform(activePlatform)} disabled={aiLoading === activePlatform} style={smallAiButton(css)}>
                <Wand2 size={14} color={css.aiIcon} />
                {aiLoading === activePlatform ? "AI pracuje..." : "AI zaproponuj"}
              </button>
            </div>

            <Field label="Ton dla tej platformy">
              <textarea
                value={activeProfile.tone}
                onChange={(event) => updatePlatformField(activePlatform, "tone", event.target.value)}
                rows={3}
                style={inputStyle}
              />
            </Field>

            <Field label="Styl treści dla tej platformy">
              <textarea
                value={activeProfile.style}
                onChange={(event) => updatePlatformField(activePlatform, "style", event.target.value)}
                rows={3}
                placeholder="Np. karuzele edukacyjne, krótkie hooki, case studies, BTS, opinie, checklisty."
                style={inputStyle}
              />
            </Field>

            <Field label="CTA — kilka propozycji albo własne">
              <textarea
                value={activeProfile.cta_style}
                onChange={(event) => updatePlatformField(activePlatform, "cta_style", event.target.value)}
                rows={4}
                placeholder="Każde CTA w osobnej linii. AI może zaproponować kilka wariantów."
                style={inputStyle}
              />
            </Field>

            <Field label="Zasady contentu / czego pilnować">
              <textarea
                value={activeProfile.content_rules}
                onChange={(event) => updatePlatformField(activePlatform, "content_rules", event.target.value)}
                rows={5}
                placeholder="Np. TikTok: szybki hook, bez korpo języka, bez nachalnego kup teraz. LinkedIn: wniosek, konkret, B2B, jasny przykład."
                style={inputStyle}
              />
            </Field>

            <Field label="Twoje notatki dla AI">
              <textarea
                value={activeProfile.user_notes}
                onChange={(event) => updatePlatformField(activePlatform, "user_notes", event.target.value)}
                rows={3}
                placeholder="Dodaj własne sugestie albo wyjątki dla tej platformy."
                style={inputStyle}
              />
            </Field>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="bv-btn" type="button" onClick={() => savePlatform(activePlatform)} disabled={saving} style={secondaryButton(css)}>
                {saving ? "Zapisuję..." : `Zapisz ${activeMeta.name}`}
              </button>
              <button className="bv-btn" type="button" onClick={saveAll} disabled={saving} style={primaryButton(dark)}>
                {saving ? "Zapisuję..." : "Zapisz cały Brand Voice"}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ ...cardStyle, background: css.surfaceSoft, border: `1px solid ${css.aiBorder}`, boxShadow: css.aiGlow, position: "relative", overflow: "hidden" }}>
              <Glow />
              <div style={{ position: "relative", zIndex: 1 }}>
                <SectionLabel color={css.aiText} icon>
                  AI uzasadnienie
                </SectionLabel>
                <p style={{ color: css.text, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                  {activeProfile.ai_suggestions?.why || "Kliknij „AI zaproponuj”, a system ułoży ton, CTA i zasady tej platformy na podstawie marki, strony i najlepszych postów."}
                </p>
              </div>
            </div>

            {safeArray(activeProfile.selected_examples).length > 0 ? (
              <div style={cardStyle}>
                <SectionLabel color={css.accent}>Posty, na których warto się wzorować</SectionLabel>
                <div style={{ display: "grid", gap: 8 }}>
                  {activeProfile.selected_examples.slice(0, 4).map((example, index) => (
                    <div key={index} style={{ padding: 12, borderRadius: 14, background: css.surfaceSoft, border: `1px solid ${css.border}` }}>
                      <div style={{ color: activeMeta.color, fontWeight: 900, fontSize: 12, marginBottom: 5 }}>
                        {example.title || `Przykład ${index + 1}`}
                      </div>
                      <div style={{ color: css.muted, fontSize: 11, lineHeight: 1.55 }}>
                        {example.reason || "AI wybrało ten przykład jako wzorzec."}
                      </div>
                      {example.metrics ? <div style={{ color: css.text, fontSize: 11, marginTop: 5 }}>{example.metrics}</div> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={cardStyle}>
                <SectionLabel color={css.accent}>Najlepsze posty z danych</SectionLabel>
                {bestPostsForActivePlatform.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {bestPostsForActivePlatform.slice(0, 3).map((post, index) => (
                      <div key={`${post.connection_id}-${index}`} style={{ padding: 12, borderRadius: 14, background: css.surfaceSoft, border: `1px solid ${css.border}` }}>
                        <div style={{ color: css.text, fontWeight: 800, fontSize: 12, lineHeight: 1.4 }}>
                          {(post.title || post.content || "Post bez tytułu").slice(0, 90)}
                        </div>
                        <div style={{ color: css.muted, fontSize: 11, marginTop: 5 }}>
                          {formatMetric(postReach(post))} zasięg · {formatMetric(postEngagement(post))} engagement
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: css.muted, fontSize: 12, lineHeight: 1.6, margin: 0 }}>
                    Brak pobranych postów dla tej platformy. Po synchronizacji AI samo wybierze przykłady, zamiast kazać Ci je wklejać ręcznie.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {saved && (
        <div style={{ padding: 13, borderRadius: 14, background: "#052e16", border: "1px solid #166534", color: "#22c55e", fontSize: 13 }}>
          ✓ Brand Voice zapisany. AI może teraz korzystać z osobnych zasad per platforma.
        </div>
      )}

      {error && (
        <div style={{ padding: 13, borderRadius: 14, background: "#450a0a", border: "1px solid #991b1b", color: "#fca5a5", fontSize: 13, whiteSpace: "pre-wrap" }}>
          {error}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children, color, icon = false }: { children: React.ReactNode; color: string; icon?: boolean }) {
  return (
    <div style={{ fontFamily: "var(--font-label)", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".12em", color, marginBottom: 10, display: "inline-flex", alignItems: "center", gap: 7 }}>
      {icon ? <Wand2 size={15} /> : null}
      {children}
    </div>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label style={{ display: "grid", gap: 7 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: "inherit", opacity: 0.72, textTransform: "uppercase", letterSpacing: ".08em" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function TagEditor({
  label,
  color,
  values,
  inputValue,
  setInputValue,
  onAdd,
  onRemove,
  inputStyle,
}: {
  label: string;
  color: string;
  values: string[];
  inputValue: string;
  setInputValue: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  inputStyle: CSSProperties;
}) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {values.map((value, index) => (
          <span key={`${value}-${index}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 9px", borderRadius: 999, color, background: `${color}18`, border: `1px solid ${color}40`, fontSize: 11, fontWeight: 800 }}>
            {value}
            <button type="button" onClick={() => onRemove(index)} style={{ background: "none", border: "none", color, cursor: "pointer", padding: 0 }}>
              ×
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 7 }}>
        <input
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAdd();
            }
          }}
          placeholder="Wpisz i Enter"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button type="button" onClick={onAdd} style={{ borderRadius: 12, border: `1px solid ${color}40`, background: `${color}18`, color, padding: "0 12px", fontWeight: 900, cursor: "pointer" }}>
          +
        </button>
      </div>
    </div>
  );
}

function Glow() {
  return (
    <div
      style={{
        position: "absolute",
        left: 20,
        right: 20,
        bottom: -20,
        height: 42,
        background: "rgba(168,85,247,0.17)",
        filter: "blur(22px)",
        pointerEvents: "none",
      }}
    />
  );
}

function primaryButton(dark: boolean): CSSProperties {
  return {
    borderRadius: 14,
    border: "none",
    background: dark ? "#FFFFFF" : "#111111",
    color: dark ? "#050505" : "#FFFFFF",
    padding: "11px 14px",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
  };
}

function secondaryButton(css: Record<string, string>): CSSProperties {
  return {
    borderRadius: 14,
    border: `1px solid ${css.border}`,
    background: css.surfaceSoft,
    color: css.text,
    padding: "11px 14px",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
  };
}

function smallAiButton(css: Record<string, string>): CSSProperties {
  return {
    borderRadius: 14,
    border: `1px solid ${css.aiBorder}`,
    background: css.aiBgSoft,
    color: css.aiText,
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    whiteSpace: "nowrap",
  };
}

function primaryAiButton(css: Record<string, string>): CSSProperties {
  return {
    ...smallAiButton(css),
    width: "100%",
    padding: "12px 14px",
  };
}
