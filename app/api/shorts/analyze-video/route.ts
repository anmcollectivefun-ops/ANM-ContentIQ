import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

type AnalyzeVideoBody = {
  upload_id?: string;
  workspace_id?: string;
  storage_path?: string;
  public_url?: string | null;
  signed_url?: string | null;
  file_name?: string;
  mime_type?: string;
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

function fallbackAnalysis(fileName: string) {
  const title = fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ");

  return {
    title: title || "Short video",
    visual_summary:
      "Analiza robocza przygotowana na podstawie metadanych pliku. Do pełnej analizy obrazu i transkrypcji podłącz provider multimodalny video.",
    transcript: "",
    detected_topic: title || "short video",
    hook: "Zatrzymaj uwagę w pierwszych 2 sekundach najmocniejszym kadrem z filmu.",
    caption:
      "Nowy short z materiału video. Doprecyzuj opis po obejrzeniu filmu i dopasuj go do wybranej platformy.",
    hashtags: ["#short", "#video", "#content"],
    on_screen_text: [
      {
        time: "0-2s",
        text: "Najmocniejszy hook filmu",
      },
    ],
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

    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return NextResponse.json(fallbackAnalysis(body.file_name));
    }

    const openai = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey,
    });

    const videoUrl = body.signed_url || body.public_url || "";
    const prompt = `
Przygotuj analizę short video dla aplikacji ANM ContentIQ.

WAŻNE:
- Masz dostęp do metadanych i URL pliku, ale nie zakładaj, że widzisz realne klatki filmu.
- Jeśli nie możesz realnie potwierdzić obrazu lub transkrypcji, napisz to uczciwie w visual_summary/transcript.
- Przygotuj użyteczne opisy, hooki i warianty publikacyjne, które użytkownik może poprawić po obejrzeniu filmu.

Dane pliku:
- upload_id: ${body.upload_id}
- workspace_id: ${body.workspace_id}
- storage_path: ${body.storage_path}
- file_name: ${body.file_name}
- mime_type: ${body.mime_type}
- url: ${videoUrl || "brak"}

Zwróć wyłącznie JSON:
{
  "title": "tytuł filmu",
  "visual_summary": "co AI widzi w filmie albo uczciwa informacja, że analiza wizualna wymaga providera video",
  "transcript": "transkrypcja lub opis wypowiedzi, jeśli dostępne",
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

    const response = await openai.chat.completions.create({
      model: "deepseek-reasoner",
      messages: [
        {
          role: "system",
          content:
            "Jesteś strategiem short video. Odpowiadasz wyłącznie poprawnym JSON-em po polsku.",
        },
        { role: "user", content: prompt },
      ],
    });

    const answer = response.choices[0]?.message?.content || "";
    const parsed = JSON.parse(cleanJsonAnswer(answer));

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
