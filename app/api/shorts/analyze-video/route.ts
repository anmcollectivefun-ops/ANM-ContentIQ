import { NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

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

function outputSchema() {
  return `
Zwróć wyłącznie JSON:
{
  "title": "tytuł filmu",
  "visual_summary": "konkretny opis tego, co widać na przesłanych klatkach",
  "transcript": "tekst widoczny na ekranie lub opis wypowiedzi, jeśli można go wywnioskować",
  "detected_topic": "główny temat",
  "hook": "najmocniejszy hook",
  "caption": "opis posta",
  "hashtags": ["#tag1", "#tag2"],
  "on_screen_text": [
    { "time": "0-2s", "text": "tekst na ekranie" }
  ],
  "platform_recommendations": [
    {
      "platform": "tiktok",
      "caption": "opis pod TikTok",
      "hook": "hook pod TikTok",
      "hashtags": ["#tag"],
      "publishing_notes": "krótka wskazówka"
    },
    {
      "platform": "instagram_reels",
      "caption": "opis pod Instagram Reels",
      "hook": "hook pod Reels",
      "hashtags": ["#tag"],
      "publishing_notes": "krótka wskazówka"
    },
    {
      "platform": "youtube_shorts",
      "caption": "opis pod YouTube Shorts",
      "hook": "hook pod Shorts",
      "hashtags": ["#tag"],
      "publishing_notes": "krótka wskazówka"
    },
    {
      "platform": "facebook_reels",
      "caption": "opis pod Facebook Reels",
      "hook": "hook pod Facebook Reels",
      "hashtags": ["#tag"],
      "publishing_notes": "krótka wskazówka"
    },
    {
      "platform": "linkedin_video",
      "caption": "opis pod LinkedIn Video",
      "hook": "hook pod LinkedIn",
      "hashtags": ["#tag"],
      "publishing_notes": "krótka wskazówka"
    }
  ],
  "template_summary": "krótki opis do zapisania jako szablon"
}
  `.trim();
}

function fallbackAnalysis(fileName: string, hasFrames: boolean) {
  const title = fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ");

  return {
    title: title || "Short video",
    visual_summary: hasFrames
      ? "Klatki zostały przesłane, ale na serwerze nie ma skonfigurowanego OPENAI_API_KEY dla analizy vision. Ustaw ten klucz w Vercel, żeby AI realnie opisywało obraz."
      : "Analiza robocza przygotowana na podstawie metadanych pliku. Nie udało się pobrać klatek z video.",
    transcript: "",
    detected_topic: title || "short video",
    hook: "Zatrzymaj uwagę w pierwszych 2 sekundach najmocniejszym kadrem z filmu.",
    caption:
      "Nowy short z materiału video. Doprecyzuj opis po obejrzeniu filmu i dopasuj go do wybranej platformy.",
    hashtags: ["#short", "#video", "#content"],
    on_screen_text: [{ time: "0-2s", text: "Najmocniejszy hook filmu" }],
    platform_recommendations: [
      {
        platform: "tiktok",
        caption: "Krótki, naturalny opis z mocnym początkiem.",
        hook: "Zobacz to przed publikacją kolejnego shorta.",
        hashtags: ["#tiktok", "#short", "#content"],
        publishing_notes: "Postaw na szybkie cięcie i jasny tekst na ekranie.",
      },
      {
        platform: "instagram_reels",
        caption: "Opis pod Reels z akcentem na zapisanie i udostępnienie.",
        hook: "Ten kadr może zatrzymać scrollowanie.",
        hashtags: ["#reels", "#instagram", "#content"],
        publishing_notes: "Dodaj estetyczną okładkę i 2-3 czytelne napisy.",
      },
      {
        platform: "youtube_shorts",
        caption: "Opis pod YouTube Shorts z prostym tytułem i wartością.",
        hook: "Najważniejsza rzecz w tym shortcie.",
        hashtags: ["#shorts", "#youtube", "#video"],
        publishing_notes: "Tytuł powinien jasno mówić, co widz dostaje.",
      },
    ],
    template_summary:
      "Szablon shorta z uploadowanego filmu, gotowy do dopracowania i wariantowania pod platformy.",
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
  return `
Przeanalizuj short video dla aplikacji ANM ContentIQ na podstawie przesłanych klatek.

Dane pliku:
- upload_id: ${body.upload_id}
- file_name: ${body.file_name}
- mime_type: ${body.mime_type}

Zasady:
- Opisz tylko to, co realnie widać na klatkach.
- Wyciągnij napisy i tekst na ekranie, jeśli są widoczne.
- Jeśli widać fragment twarzy, przedmiot, planner, biurko, aplikację, ręce, napisy albo kolory, nazwij je konkretnie.
- Nie pisz, że nie masz dostępu do klatek, jeśli klatki są przesłane.
- Przygotuj opis i warianty publikacyjne dla shortów.

${outputSchema()}
  `.trim();
}

async function analyzeWithGemini(body: AnalyzeVideoBody, frames: string[]) {
  const apiKey =
    process.env.GOOGLE_GENAI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || "";

  if (!apiKey) {
    return fallbackAnalysis(body.file_name || "short video", frames.length > 0);
  }

  const ai = new GoogleGenAI({ apiKey });
  const frameParts = frames
    .map(getDataUrlParts)
    .filter((item): item is { mimeType: string; data: string } => Boolean(item));

  if (frameParts.length === 0) {
    return fallbackAnalysis(body.file_name || "short video", false);
  }

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_VIDEO_ANALYSIS_MODEL?.trim() || "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: buildVideoAnalysisPrompt(body) },
          ...frameParts.map((frame) => ({
            inlineData: {
              mimeType: frame.mimeType,
              data: frame.data,
            },
          })),
        ],
      },
    ],
  });

  const text = response.text || "";
  return JSON.parse(cleanJsonAnswer(text));
}

async function analyzeWithDeepSeek(body: AnalyzeVideoBody, frames: string[]) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return fallbackAnalysis(body.file_name || "short video", frames.length > 0);
  }

  const openai = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey,
  });

  const response = await openai.chat.completions.create({
    model: "deepseek-reasoner",
    messages: [
      {
        role: "system",
        content:
          "Jesteś strategiem short video. Nie widzisz obrazów, więc nie udawaj analizy klatek. Odpowiadasz wyłącznie poprawnym JSON-em po polsku.",
      },
      {
        role: "user",
        content: `
Przygotuj strategię short video na podstawie metadanych pliku. Ten tryb nie ma analizy obrazu.

Dane pliku:
- file_name: ${body.file_name}
- mime_type: ${body.mime_type}
- liczba przesłanych klatek: ${frames.length}

W visual_summary jasno napisz, że DeepSeek nie analizuje klatek, i zaproponuj użycie Gemini dla OCR napisów i obrazu.

${outputSchema()}
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
