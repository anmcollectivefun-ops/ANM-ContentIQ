import { NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenAI, Type } from "@google/genai";
import { requireWorkspace } from "@/lib/engagement/server";

export const runtime = "nodejs";

type AnalyzeVideoBody = {
  upload_id?: string;
  workspace_id?: string;
  storage_path?: string;
  public_url?: string | null;
  signed_url?: string | null;
  file_name?: string;
  mime_type?: string;
  frame_data_urls?: string[];
  ai_provider?: "deepseek" | "gemini";
  custom_user_notes?: string;
  reference_url?: string;
  target_platforms?: string[];
  language?: "pl" | "en";
};

type WorkspaceVideoContext = {
  brand: Record<string, unknown> | null;
  brandVoice: Record<string, unknown> | null;
  platformProfile: Record<string, unknown> | null;
  offers: Record<string, unknown>[];
  links: Record<string, unknown>[];
  creatorMemory: Record<string, unknown> | null;
  learnings: Record<string, unknown>[];
};

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

function cleanJsonAnswer(answer: string) {
  return answer
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseAiJsonAnswer(answer: string) {
  const cleaned = cleanJsonAnswer(answer);

  try {
    return JSON.parse(cleaned);
  } catch {
    const repaired = cleaned
      .replace(/([\[,]\s*)(#[\p{L}\p{N}_-]+)/gu, '$1"$2"')
      .replace(/(#[\p{L}\p{N}_-]+)(\s*[\],])/gu, '"$1"$2')
      .replace(/,\s*([}\]])/g, "$1");

    return JSON.parse(repaired);
  }
}
// Ścisły schemat JSON dla Gemini, gwarantujący 100% zgodności z Twoim frontendem
const geminiResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    visual_summary: { type: Type.STRING },
    transcript: { type: Type.STRING },
    detected_topic: { type: Type.STRING },
    hook: { type: Type.STRING },
    caption: { type: Type.STRING },
    hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
    on_screen_text: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          time: { type: Type.STRING },
          text: { type: Type.STRING },
        },
        required: ["time", "text"],
      },
    },
    platform_recommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          platform: { type: Type.STRING },
          caption: { type: Type.STRING },
          hook: { type: Type.STRING },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
          publishing_notes: { type: Type.STRING },
        },
        required: ["platform", "caption", "hook", "hashtags", "publishing_notes"],
      },
    },
    template_summary: { type: Type.STRING },
  },
  required: [
    "title",
    "visual_summary",
    "transcript",
    "detected_topic",
    "hook",
    "caption",
    "hashtags",
    "on_screen_text",
    "platform_recommendations",
    "template_summary",
  ],
};

function outputSchemaText() {
  return `
Zwróć wyłącznie JSON według struktury:
{
  "title": "tytuł filmu",
  "visual_summary": "opis tego, co widać",
  "transcript": "tekst lub opis wypowiedzi",
  "detected_topic": "główny temat",
  "hook": "najmocniejszy hook",
  "caption": "opis posta",
  "hashtags": ["#tag1"],
  "on_screen_text": [{ "time": "0-2s", "text": "tekst" }],
  "platform_recommendations": [{ "platform": "tiktok", "caption": "...", "hook": "...", "hashtags": [], "publishing_notes": "..." }],
  "template_summary": "opis szablonu"
}
  `.trim();
}

function fallbackAnalysis(fileName: string, hasFrames: boolean) {
  const title = fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ");

  return {
    title: title || "Short video",
    visual_summary: hasFrames
      ? "Klatki zostały przesłane, ale wystąpił błąd konfiguracji lub limitów API. Upewnij się, że klucze API są poprawne."
      : "Analiza robocza przygotowana na podstawie metadanych pliku. Nie udało się pobrać klatek z video.",
    transcript: "",
    detected_topic: title || "short video",
    hook: "Zatrzymaj uwagę w pierwszych 2 sekundach najmocniejszym kadrem z filmu.",
    caption: "Opisz w sugestiach, jaki cel ma mie? post, a AI przygotuje gotow? tre?? publikacji z CTA i hashtagami.",
    hashtags: ["#short", "#video", "#content"],
    on_screen_text: [{ time: "0-2s", text: "Najmocniejszy hook filmu" }],
    platform_recommendations: [
      {
        platform: "tiktok",
        caption: "Masz gotowy film? Zamie? go w post, kt?ry m?wi odbiorcy, co zyska i dlaczego warto klikn?? link lub zostawi? reakcj?.",
        hook: "Zobacz to przed publikacją kolejnego shorta.",
        hashtags: ["#tiktok", "#short", "#content"],
        publishing_notes: "Postaw na szybkie cięcie i jasny tekst na ekranie.",
      },
      {
        platform: "instagram_reels",
        caption: "Poka? warto?? filmu w pierwszym zdaniu, dodaj prosty CTA i zach?? do zapisania albo sprawdzenia linku.",
        hook: "Ten kadr może zatrzymać scrollowanie.",
        hashtags: ["#reels", "#instagram", "#content"],
        publishing_notes: "Dodaj estetyczną okładkę i 2-3 czytelne napisy.",
      },
      {
        platform: "youtube_shorts",
        caption: "U?yj opisu jak mini landing page: problem, korzy??, co dalej i jasne wezwanie do dzia?ania.",
        hook: "Najważniejsza rzecz w tym shortcie.",
        hashtags: ["#shorts", "#youtube", "#video"],
        publishing_notes: "Tytuł powinien jasno mówić, co widz dostaje.",
      },
    ],
    template_summary: "Szablon shorta z uploadowanego filmu, gotowy do dopracowania.",
  };
}

function getDataUrlParts(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    data: match[2],
  };
}

function compactJson(value: unknown) {
  return JSON.stringify(value ?? null, null, 2);
}

async function loadWorkspaceVideoContext(
  body: AnalyzeVideoBody
): Promise<WorkspaceVideoContext> {
  if (!body.workspace_id) {
    return {
      brand: null,
      brandVoice: null,
      platformProfile: null,
      offers: [],
      links: [],
      creatorMemory: null,
      learnings: [],
    };
  }

  const { supabase, workspace } = await requireWorkspace(body.workspace_id);
  const targetPlatform = body.target_platforms?.[0]?.trim().toLowerCase() || "";

  const [
    brandResult,
    brandVoiceResult,
    offersResult,
    creatorMemoryResult,
    learningsResult,
    connectionsResult,
  ] = await Promise.all([
    supabase
      .schema("contentiq")
      .from("brand_profiles")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("is_default", { ascending: false })
      .limit(1),
    supabase
      .schema("contentiq")
      .from("brand_voice")
      .select("*")
      .eq("workspace_id", workspace.id)
      .limit(1),
    supabase
      .schema("contentiq")
      .from("brand_offers")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("status", "active")
      .order("is_primary", { ascending: false })
      .limit(8),
    supabase
      .schema("contentiq")
      .from("creator_style_profiles")
      .select("*")
      .eq("workspace_id", workspace.id)
      .limit(1),
    supabase
      .schema("contentiq")
      .from("ai_learnings")
      .select("type,platform,insight,evidence,confidence")
      .eq("workspace_id", workspace.id)
      .eq("dismissed", false)
      .order("confidence", { ascending: false })
      .limit(12),
    supabase
      .schema("contentiq")
      .from("platform_connections")
      .select("id,platform")
      .eq("workspace_id", workspace.id),
  ]);

  const brand =
    ((brandResult.data || [])[0] as Record<string, unknown> | undefined) || null;
  const connectionIds = (connectionsResult.data || []).map((row) => row.id);

  const [platformProfileResult, linksResult] = await Promise.all([
    brand?.id && targetPlatform
      ? supabase
          .schema("contentiq")
          .from("brand_platform_profiles")
          .select("*")
          .eq("brand_profile_id", String(brand.id))
          .eq("platform", targetPlatform)
          .limit(1)
      : Promise.resolve({ data: [] }),
    connectionIds.length
      ? supabase
          .schema("contentiq")
          .from("manual_links")
          .select("type,url,title,connection_id,created_at")
          .in("connection_id", connectionIds)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    brand,
    brandVoice:
      ((brandVoiceResult.data || [])[0] as
        | Record<string, unknown>
        | undefined) || null,
    platformProfile:
      ((platformProfileResult.data || [])[0] as
        | Record<string, unknown>
        | undefined) || null,
    offers: (offersResult.data || []) as Record<string, unknown>[],
    links: (linksResult.data || []) as Record<string, unknown>[],
    creatorMemory:
      ((creatorMemoryResult.data || [])[0] as
        | Record<string, unknown>
        | undefined) || null,
    learnings: (learningsResult.data || []) as Record<string, unknown>[],
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTemporaryGeminiError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  return (
    message.includes("503") ||
    message.includes("UNAVAILABLE") ||
    lower.includes("high demand") ||
    lower.includes("try again later") ||
    lower.includes("temporarily")
  );
}

export function buildVideoAnalysisPromptGemini(
  body: AnalyzeVideoBody,
  workspaceContext: WorkspaceVideoContext
) {
  const language = body.language === "en" ? "English" : "Polish";
  const platforms =
    body.target_platforms?.filter(Boolean).join(", ") ||
    "TikTok, Instagram Reels, YouTube Shorts";
  const notes = body.custom_user_notes?.trim();
  const referenceUrl = body.reference_url?.trim();

  return `
You are an outstanding video marketing expert, social media strategist and specialist in the algorithms of ${platforms}.

You receive representative frames from the video "${body.file_name}" (${body.mime_type}).
Write the entire response in ${language}.

YOUR ROLE:
Do not produce a dry inventory of objects visible in the frames. Analyze what the video communicates, what value it offers, who should watch it and how to package it to maximize click-through rate, retention and meaningful engagement.

TARGET PLATFORMS:
${platforms}

${notes ? `USER'S MARKETING BRIEF — treat this as the main business direction:\n${notes}\n` : ""}
${referenceUrl ? `REFERENCE URL / CTA DESTINATION:\n${referenceUrl}\nUse it only as supplied context. Do not claim that you opened or verified its contents.\n` : ""}

REAL BRAND CONTEXT FROM ANM CONTENTIQ:
Brand profile:
${compactJson(workspaceContext.brand)}

General Brand Voice:
${compactJson(workspaceContext.brandVoice)}

Platform-specific Brand Voice:
${compactJson(workspaceContext.platformProfile)}

Active products and offers:
${compactJson(workspaceContext.offers)}

Saved brand, product and reference links:
${compactJson(workspaceContext.links)}

Creator style memory:
${compactJson(workspaceContext.creatorMemory)}

Previous AI learnings backed by workspace data:
${compactJson(workspaceContext.learnings)}

Use this context to identify the actual product, audience, tone, CTA and content angle.
Prefer the primary active offer when the video and the user's brief support it.
Never force an unrelated offer into the caption.
Never invent a URL. Use only a link present above or supplied by the user.

ANALYSIS PRIORITIES:
1. Read visible subtitles, overlays, product names and screen text first. They are the strongest source of meaning.
2. Use frames as supporting context for emotion, pace, credibility, product and visual hook.
3. Identify the core audience value: education, entertainment, relatability, transformation, controversy or proof.
4. Create a thumb-stopping hook for the first two seconds that also works without sound.
5. Write a complete social media caption, not a technical description of the recording.
6. The caption must provide value, create curiosity and finish with a concrete CTA aligned with the user's brief.
7. Select precise hashtags that tell the algorithm what niche and audience the video belongs to. Prefer relevance over generic popularity.
8. Give separate, materially different recommendations for every target platform.

TRUTHFULNESS:
- Never invent spoken words.
- In "transcript", include only text that can be read with reasonable confidence from the supplied frames.
- If there is not enough readable text, return an empty transcript and base the marketing proposal on the user's brief and visual context.
- Never invent performance data, trends, platform rules, audience numbers or the contents of the reference URL.
- If the brief and frames are insufficient to identify the offer, keep the caption useful but explicitly neutral rather than fabricating a product.

FIELD RULES:
- "title": magnetic, specific, maximum 60 characters.
- "visual_summary": short marketing assessment of the video's impact on the viewer; do not list physical objects.
- "detected_topic": clear niche/topic for recommendation systems.
- "hook": one strong sentence for 0-2 seconds.
- "caption": publication-ready copy with natural formatting, value, curiosity and CTA.
- "hashtags": 8-15 relevant tags; do not add invented statistics about hashtag volume.
- "on_screen_text": concise overlay suggestions with timing.
- "platform_recommendations": one entry per target platform, adapted to that platform's audience behavior and format.
- "template_summary": explain the repeatable mechanism and one way to turn it into a series.

Return only a valid JSON object matching the supplied response schema. No markdown and no additional text.
  `.trim();
}

async function analyzeWithGemini(
  body: AnalyzeVideoBody,
  frames: string[],
  workspaceContext: WorkspaceVideoContext
) {
  const apiKey =
    process.env.GOOGLE_GENAI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || "";

  if (!apiKey) {
    throw new Error(
      "Brak GOOGLE_GENAI_API_KEY lub GEMINI_API_KEY w zmiennych środowiskowych."
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const frameParts = frames
    .map(getDataUrlParts)
    .filter((item): item is { mimeType: string; data: string } => Boolean(item));

  if (frameParts.length === 0) {
    throw new Error(
      "Nie udało się odczytać klatek filmu. Odtwórz podgląd i spróbuj ponownie."
    );
  }

  const contents = [
    {
      role: "user",
      parts: [
        { text: buildVideoAnalysisPromptGemini(body, workspaceContext) },
        ...frameParts.map((frame) => ({
          inlineData: {
            mimeType: frame.mimeType,
            data: frame.data,
          },
        })),
      ],
    },
  ];

  const configuredModel = process.env.GEMINI_VIDEO_ANALYSIS_MODEL?.trim();
  const fallbackModels = (process.env.GEMINI_VIDEO_ANALYSIS_FALLBACK_MODELS || "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  const models = Array.from(
    new Set([
      configuredModel || "gemini-2.5-flash",
      ...fallbackModels,
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash",
    ])
  );

  let lastError: unknown = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            responseMimeType: "application/json",
            responseSchema: geminiResponseSchema,
          },
        });

        const text = response.text;
        if (!text) throw new Error("Model Gemini zwr?ci? pust? odpowied?.");

        return parseAiJsonAnswer(text);
      } catch (error) {
        lastError = error;
        if (!isTemporaryGeminiError(error)) throw error;
        await sleep(1200 + attempt * 1800);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
async function analyzeWithDeepSeek(
  body: AnalyzeVideoBody,
  frames: string[],
  workspaceContext: WorkspaceVideoContext
) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const userContext = [
    body.custom_user_notes?.trim()
      ? `Dodatkowe sugestie użytkownika: ${body.custom_user_notes.trim()}`
      : "",
    body.reference_url?.trim()
      ? `Link referencyjny lub kontekstowy: ${body.reference_url.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (!apiKey) {
    console.warn("Brak klucza API dla DeepSeek. Uruchamiam fallback.");
    return fallbackAnalysis(body.file_name || "short video", frames.length > 0);
  }

  const openai = new OpenAI({
    baseURL: "https://api.deepseek.com/v1", // Upewnij się, że używasz poprawnego base URL dla OpenAI SDK
    apiKey,
  });

  const response = await openai.chat.completions.create({
    model: process.env.DEEPSEEK_VIDEO_ANALYSIS_MODEL?.trim() || "deepseek-chat",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Jeste? strategiem short video. Nie widzisz obraz?w, wi?c nie udawaj analizy klatek. Odpowiadasz wy??cznie poprawnym obiektem JSON po polsku. Wszystkie hashtagi musz? by? stringami w tablicy, np. [\"#wesele\", \"#event\"]. Bez markdown i bez tekstu poza JSON.",
      },
      {
        role: "user",
        content: `
Przygotuj strategię short video na podstawie metadanych pliku. Ten tryb nie ma analizy obrazu.

Dane pliku:
- file_name: ${body.file_name}
- mime_type: ${body.mime_type}
- liczba przesłanych klatek: ${frames.length}

W visual_summary jasno napisz, że DeepSeek nie analizuje klatek, i zaproponuj użytkownikowi przełączenie na Gemini w celu wykonania OCR napisów i analizy wizualnej.

${userContext ? `${userContext}\n\n` : ""}${outputSchemaText()}

Kontekst marki i oferty z aplikacji:
${compactJson(workspaceContext)}
        `.trim(),
      },
    ],
  });

  const answer = response.choices[0]?.message?.content || "";
  return parseAiJsonAnswer(answer);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AnalyzeVideoBody;

    if (!body.upload_id) {
      return NextResponse.json({ error: "Brak upload_id." }, { status: 400 });
    }
    if (!body.workspace_id) {
      return NextResponse.json({ error: "Brak workspace_id." }, { status: 400 });
    }
    if (!body.storage_path) {
      return NextResponse.json({ error: "Brak storage_path." }, { status: 400 });
    }
    if (!body.file_name) {
      return NextResponse.json({ error: "Brak file_name." }, { status: 400 });
    }
    if (!body.mime_type || !ALLOWED_VIDEO_TYPES.has(body.mime_type)) {
      return NextResponse.json(
        { error: "Zły format pliku. Dozwolone: video/mp4, video/quicktime, video/webm." },
        { status: 400 }
      );
    }

    const frames = Array.isArray(body.frame_data_urls)
      ? body.frame_data_urls.filter((item) => item.startsWith("data:image/")).slice(0, 8)
      : [];

    const provider = body.ai_provider === "deepseek" ? "deepseek" : "gemini";
    const workspaceContext = await loadWorkspaceVideoContext(body);
    const parsed =
      provider === "deepseek"
        ? await analyzeWithDeepSeek(body, frames, workspaceContext)
        : await analyzeWithGemini(body, frames, workspaceContext);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Short video analysis error:", error);

    return NextResponse.json(
      {
        error: "Błąd AI podczas analizy filmu.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
