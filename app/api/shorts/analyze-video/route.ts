import { NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenAI, Type } from "@google/genai";

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

function buildVideoAnalysisPrompt(body: AnalyzeVideoBody) {
  const userContext = [
    body.custom_user_notes?.trim()
      ? `Dodatkowe sugestie u?ytkownika: ${body.custom_user_notes.trim()}`
      : "",
    body.reference_url?.trim()
      ? `Link referencyjny lub kontekstowy: ${body.reference_url.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `
Przeanalizuj short video dla aplikacji ANM ContentIQ na podstawie klatek obrazu, napis?w widocznych na ekranie i sugestii u?ytkownika.

Dane pliku:
- upload_id: ${body.upload_id}
- file_name: ${body.file_name}
- mime_type: ${body.mime_type}
${userContext ? `\n${userContext}` : ""}

Najwa?niejsza zasada:
Pole "caption" NIE jest opisem technicznym filmu. To ma by? gotowy tekst posta do publikacji pod filmem.
Ma zach?ca? odbiorc? do klikni?cia, zapisania, komentarza, wej?cia w link albo wykonania akcji wskazanej w sugestiach u?ytkownika.

?r?d?a tre?ci:
- Najpierw czytaj napisy i tekst na ekranie. To jest g??wny sens filmu.
- Klatki wykorzystuj tylko jako kontekst pomocniczy: klimat, osoby, produkt, ekran, miejsce.
- Je?eli napisy s? urwane, odtw?rz sens ostro?nie i napisz w "transcript", co uda?o si? odczyta?.
- Je?eli u?ytkownik poda? sugestie, potraktuj je jako brief marketingowy i dopasuj do nich hook, caption, CTA oraz hashtagi.

Co zwr?ci?:
- "visual_summary": kr?tka notatka techniczna dla u?ytkownika, co wida? w filmie. Nie u?ywaj jej jako posta.
- "transcript": odczytane napisy / tekst z filmu.
- "detected_topic": temat biznesowy/contentowy, nie opis kadru.
- "hook": mocne zdanie otwieraj?ce post.
- "caption": gotowy opis posta: naturalny, marketingowy, zach?caj?cy, z CTA. Je?li jest link referencyjny, wspomnij o klikni?ciu/sprawdzeniu linku.
- "hashtags": praktyczne hashtagi pod publikacj?.
- "platform_recommendations": osobne wersje caption/hook pod TikTok, Instagram Reels, YouTube Shorts, Facebook Reels i LinkedIn Video.

Przyk?ad r??nicy:
?le: "Wideo pokazuje dwie osoby przy biurku i tablet graficzny."
Dobrze: "Planujesz event, wesele albo 18. urodziny? ANM Collective tworzy narz?dzie, kt?re pomaga ogarn?? zaproszenia, harmonogram i komunikacj? w jednym miejscu. Sprawd?, jak ?atwiej zaplanowa? wydarzenie bez chaosu."
  `.trim();
}

async function analyzeWithGemini(body: AnalyzeVideoBody, frames: string[]) {
  const apiKey =
    process.env.GOOGLE_GENAI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || "";

  if (!apiKey) {
    console.warn("Brak klucza API dla Gemini. Uruchamiam fallback.");
    return fallbackAnalysis(body.file_name || "short video", frames.length > 0);
  }

  const ai = new GoogleGenAI({ apiKey });
  const frameParts = frames
    .map(getDataUrlParts)
    .filter((item): item is { mimeType: string; data: string } => Boolean(item));

  if (frameParts.length === 0) {
    return fallbackAnalysis(body.file_name || "short video", false);
  }

  // Przygotowanie zawartości w nowym formacie płaskiej tablicy dla SDK @google/genai
  const contents = [
    buildVideoAnalysisPrompt(body),
    ...frameParts.map((frame) => ({
      inlineData: {
        mimeType: frame.mimeType,
        data: frame.data,
      },
    })),
  ];

  // Używamy darmowego i ultraszybkiego modelu multimodalnego gemini-2.5-flash
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_VIDEO_ANALYSIS_MODEL?.trim() || "gemini-2.5-flash",
    contents: contents,
    config: {
      // Wymuszenie czystego formatu JSON dopasowanego bezpośrednio do interfejsu
      responseMimeType: "application/json",
      responseSchema: geminiResponseSchema,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Model Gemini zwr?ci? pust? odpowied?.");
  
  return JSON.parse(text);
}

async function analyzeWithDeepSeek(body: AnalyzeVideoBody, frames: string[]) {
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
    model: "deepseek-reasoner",
    messages: [
      {
        role: "system",
        content:
          "Jesteś strategiem short video. Nie widzisz obrazów, więc nie udawaj analizy klatek. Odpowiadasz wyłącznie poprawnym obiektem JSON po polsku, bez żadnego formatowania markdown.",
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
        `.trim(),
      },
    ],
  });

  const answer = response.choices[0]?.message?.content || "";
  return JSON.parse(cleanJsonAnswer(answer));
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
      ? body.frame_data_urls.filter((item) => item.startsWith("data:image/")).slice(0, 4)
      : [];

    const provider = body.ai_provider === "deepseek" ? "deepseek" : "gemini";
    const parsed =
      provider === "deepseek"
        ? await analyzeWithDeepSeek(body, frames)
        : await analyzeWithGemini(body, frames);

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
