// app/api/chat/route.ts
// DeepSeek R1 — silnik AI dla ANM ContentIQ
// Obsługuje: generowanie contentu, analizę, adaptację, rekomendacje i kreator hooków

import { NextResponse } from "next/server";
import OpenAI from "openai";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type AiMode =
  | "generate"
  | "analyze"
  | "adapt"
  | "recommend"
  | "hooks"
  | "strategy"
  | "chat";

type RequestBody = {
  mode?: AiMode;
  prompt?: string;
  platform?: string;
  platforms?: string[];
  contentType?: string;
  historicalData?: unknown;
};

// ─── SYSTEM PROMPTS ──────────────────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<AiMode, string> = {
  generate: `Jesteś ekspertem content marketingu specjalizującym się w tworzeniu treści dla marek B2B, firm, twórców i influencerów.
Tworzysz content dopasowany do konkretnej platformy, grupy odbiorców, celu komunikacji i formatu.
Zawsze odpowiadasz w języku polskim, chyba że użytkownik poprosi inaczej.
Odpowiadaj wyłącznie w formacie JSON zgodnym ze schematem, który otrzymasz.`,

  analyze: `Jesteś analitykiem content marketingu. Analizujesz treści pod kątem:
- siły hooka,
- jakości CTA,
- dopasowania do platformy,
- potencjału zaangażowania,
- stylu i tonu komunikacji,
- czytelności,
- potencjału sprzedażowego.
Oceniasz w skali 0-100 i dajesz konkretne wskazówki poprawy.
Odpowiadaj wyłącznie w formacie JSON zgodnym ze schematem, który otrzymasz.`,

  adapt: `Jesteś specjalistą od multi-platform content strategy.
Dopasowujesz jedną treść do różnych platform:
- LinkedIn: ekspercki ton, case studies, statystyki, B2B, konkretne wnioski.
- Instagram: wizualność, emocje, krótsze opisy, Reels, karuzele, hashtagi.
- TikTok: hook w 1-2 sekundy, dynamika, krótka forma, prosty komunikat.
- YouTube: SEO w tytule, retencja, wartość edukacyjna, pomysł na miniaturę.
- Facebook: społeczność, storytelling, grupy, rozmowa z odbiorcą.
- Blog: SEO, długa forma, nagłówki H2/H3, meta description, FAQ.
- Spotify: outline odcinka, tytuł, opis, segmenty, CTA.
Odpowiadaj wyłącznie w formacie JSON zgodnym ze schematem, który otrzymasz.`,

  recommend: `Jesteś strategiem content marketingu, który analizuje dane z wielu platform.
Na podstawie historycznych wyników postów identyfikujesz:
- co działa, a co nie działa na danej platformie,
- jakie formaty, tematy i style przynoszą najlepsze wyniki,
- gdzie dana treść ma największy potencjał,
- jak poprawić przyszłe publikacje.
Dajesz konkretne, praktyczne rekomendacje oparte na danych.
Odpowiadaj wyłącznie w formacie JSON zgodnym ze schematem, który otrzymasz.`,

  hooks: `Jesteś ekspertem od hooków do content marketingu.
Tworzysz mocne pierwsze zdania, otwarcia video, nagłówki i intro dopasowane do platformy.
Każdy hook ma zatrzymać uwagę odbiorcy w pierwszych sekundach.
Uwzględniasz różnice między LinkedIn, Instagramem, TikTokiem, YouTube, Facebookiem, blogiem i Spotify.
Tworzysz różne typy hooków: problemowy, liczbowy, pytanie, kontrowersyjny, case study, błąd, obietnica, storytelling.
Odpowiadaj wyłącznie w formacie JSON zgodnym ze schematem, który otrzymasz.`,

  strategy: `Jesteś AI Strategiem ContentIQ. Tworzysz miesięczne strategie contentu dla konkretnego workspace użytkownika.
Korzystasz z danych aplikacji: opublikowanych postów, metryk, inspiracji, szablonów, harmonogramu i podłączonych platform.
Nie zgadujesz wyników. Jeżeli danych brakuje, wpisujesz to w missing_data i jasno zaznaczasz założenia.
Strategia ma być praktyczna: daty, godziny, platformy, rodzaje treści, tytuły, kąty komunikacji, formaty i powody decyzji.
Plan ma pomagać twórcy działać codziennie, dlatego uwzględnia dzisiejsze powiadomienie i alerty strategiczne.
Odpowiadaj wyłącznie w formacie JSON zgodnym ze schematem, który otrzymasz.`,

  chat: `Jesteś asystentem ANM ContentIQ — platformy do zarządzania contentem.
Pomagasz użytkownikom z tworzeniem treści, strategią contentową, analizą wyników, planowaniem publikacji i optymalizacją pod platformy social media.
Odpowiadaj po polsku, konkretnie i pomocnie.`,
};

// ─── JSON SCHEMAS ────────────────────────────────────────────────────────────

const JSON_SCHEMAS: Record<Exclude<AiMode, "chat">, string> = {
  generate: `Zwróć dokładnie taki JSON, bez markdown i bez komentarzy:
{
  "title": "tytuł lub temat treści",
  "hook": "pierwsze zdanie — musi zatrzymać uwagę",
  "body": "główna treść posta",
  "cta": "call to action",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "estimated_score": 85,
  "platform_notes": "krótka uwaga o dopasowaniu do platformy"
}`,

  analyze: `Zwróć dokładnie taki JSON, bez markdown i bez komentarzy:
{
  "score": 78,
  "hook_quality": 65,
  "cta_quality": 80,
  "platform_fit": 90,
  "engagement_potential": 72,
  "strengths": ["mocna strona 1", "mocna strona 2"],
  "weaknesses": ["słaba strona 1", "słaba strona 2"],
  "improvements": ["konkretna zmiana 1", "konkretna zmiana 2"],
  "rewritten_hook": "poprawiona wersja hooka"
}`,

  adapt: `Zwróć dokładnie taki JSON, bez markdown i bez komentarzy:
{
  "platforms": {
    "linkedin": {
      "body": "wersja na LinkedIn",
      "hashtags": ["#hashtag"],
      "score": 88,
      "notes": "dlaczego ta wersja działa na LinkedIn"
    },
    "instagram": {
      "body": "wersja na Instagram",
      "hashtags": ["#hashtag"],
      "score": 74,
      "notes": "dlaczego ta wersja działa na Instagram"
    },
    "tiktok": {
      "body": "hook i opis na TikTok",
      "hashtags": ["#hashtag"],
      "score": 61,
      "notes": "dlaczego ta wersja działa na TikTok"
    },
    "youtube": {
      "body": "tytuł, opis i pomysł na Shorts lub film",
      "hashtags": ["#hashtag"],
      "score": 80,
      "notes": "dlaczego ta wersja działa na YouTube"
    },
    "facebook": {
      "body": "wersja na Facebook",
      "hashtags": ["#hashtag"],
      "score": 70,
      "notes": "dlaczego ta wersja działa na Facebook"
    },
    "blog": {
      "body": "struktura artykułu blogowego z nagłówkami",
      "hashtags": [],
      "score": 84,
      "notes": "dlaczego ta wersja działa jako blog"
    },
    "spotify": {
      "body": "outline odcinka podcastu",
      "hashtags": [],
      "score": 76,
      "notes": "dlaczego ta wersja działa jako podcast"
    }
  }
}`,

  recommend: `Zwróć dokładnie taki JSON, bez markdown i bez komentarzy:
{
  "top_platform": "linkedin",
  "top_platform_reason": "dlaczego ta platforma jest najlepsza dla tej treści",
  "avoid_platform": "tiktok",
  "avoid_reason": "dlaczego ta platforma nie zadziała",
  "recommendations": [
    {
      "priority": "high",
      "action": "konkretna akcja do podjęcia",
      "expected_impact": "oczekiwany efekt"
    }
  ],
  "content_patterns": "wzorce, które działają na podstawie danych"
}`,

  hooks: `Zwróć dokładnie taki JSON, bez markdown i bez komentarzy:
{
  "hooks": [
    {
      "text": "treść hooka",
      "type": "problemowy",
      "score": 91,
      "best_for": "linkedin",
      "note": "dlaczego ten hook może zadziałać"
    }
  ],
  "ai_summary": "krótkie podsumowanie, jaki kierunek hooków będzie najlepszy"
}`,

  strategy: `Zwróć dokładnie taki JSON, bez markdown i bez komentarzy:
{
  "strategy_name": "nazwa strategii",
  "period_start": "YYYY-MM-DD",
  "period_end": "YYYY-MM-DD",
  "main_goal": "główny cel strategii",
  "positioning": "pozycjonowanie marki na ten okres",
  "ai_summary": "krótkie podsumowanie strategii",
  "content_pillars": [
    {
      "name": "filar contentu",
      "description": "opis filaru",
      "platforms": ["linkedin", "instagram"]
    }
  ],
  "platform_distribution": [
    {
      "platform": "linkedin",
      "posts_per_month": 8,
      "cadence": "2 razy w tygodniu",
      "best_days": ["wtorek", "czwartek"],
      "best_hours": ["09:00", "12:00"],
      "reasoning": "dlaczego taka częstotliwość i platforma"
    }
  ],
  "weekly_plan": [
    {
      "week": 1,
      "date": "YYYY-MM-DD",
      "time": "09:00",
      "platform": "linkedin",
      "content_kind": "content",
      "title": "tytuł publikacji",
      "angle": "kąt komunikacji",
      "format": "format",
      "description": "co dokładnie opublikować",
      "source_recommendation": "na jakich danych lub założeniach opiera się sugestia",
      "status": "planned"
    }
  ],
  "today_notification": "komunikat dla twórcy na dziś",
  "strategy_alerts": ["ważna sugestia strategiczna"],
  "assumptions": ["założenie AI, jeśli brakuje danych"],
  "missing_data": ["dane, których brakuje do większej pewności"]
}`,
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function cleanJsonAnswer(answer: string) {
  return answer
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function buildPrompt({
  mode,
  prompt,
  platform,
  platforms,
  contentType,
  historicalData,
}: {
  mode: AiMode;
  prompt: string;
  platform: string;
  platforms: string[];
  contentType: string;
  historicalData: unknown;
}) {
  if (mode === "generate") {
    return `
Platforma: ${platform || "ogólna"}
Typ contentu: ${contentType || "post"}
Temat / wytyczne:
${prompt}

${
  historicalData
    ? `Dane historyczne — co działało wcześniej:
${JSON.stringify(historicalData)}`
    : ""
}

${JSON_SCHEMAS.generate}
    `.trim();
  }

  if (mode === "analyze") {
    return `
Platforma: ${platform || "ogólna"}
Treść do analizy:
${prompt}

${JSON_SCHEMAS.analyze}
    `.trim();
  }

  if (mode === "adapt") {
    return `
Platformy docelowe: ${
      platforms.length > 0
        ? platforms.join(", ")
        : "linkedin, instagram, tiktok"
    }

Oryginalna treść do adaptacji:
${prompt}

${
  historicalData
    ? `Dane o skuteczności platform:
${JSON.stringify(historicalData)}`
    : ""
}

Wynik JSON powinien zawierać tylko platformy docelowe wskazane powyżej.

${JSON_SCHEMAS.adapt}
    `.trim();
  }

  if (mode === "recommend") {
    return `
Temat treści:
${prompt}

${
  historicalData
    ? `Dane historyczne z platform:
${JSON.stringify(historicalData)}`
    : ""
}

${JSON_SCHEMAS.recommend}
    `.trim();
  }

  if (mode === "hooks") {
    return `
Platforma docelowa: ${platform || "ogólna"}
Typ contentu: ${contentType || "post"}
Temat / wytyczne:
${prompt}

Wygeneruj 10 różnych hooków.
Uwzględnij różne typy:
- problemowy,
- liczbowy,
- pytanie,
- kontrowersyjny,
- case study,
- błąd,
- obietnica,
- storytelling.

Każdy hook oceń w skali 0-100.
Dopasuj hooki do platformy i wyjaśnij krótko, dlaczego mogą zadziałać.

${historicalData ? `Dane historyczne:
${JSON.stringify(historicalData)}` : ""}

${JSON_SCHEMAS.hooks}
    `.trim();
  }

  if (mode === "strategy") {
    return `
Brief użytkownika:
${prompt}

Dane z aplikacji ContentIQ:
${historicalData ? JSON.stringify(historicalData) : "{}"}

Wymagania:
- utwórz plan na minimum 20 i maksimum 40 pozycji,
- plan obejmuje 4 tygodnie,
- wpisy w weekly_plan muszą mieć daty z okresu strategii,
- używaj tylko platform przekazanych w danych lub briefie,
- jeżeli dane o wynikach są puste, oprzyj decyzje na szablonach, inspiracjach i briefie, ale wpisz brak metryk w missing_data.

${JSON_SCHEMAS.strategy}
    `.trim();
  }

  return prompt;
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;

    const mode: AiMode = body.mode || "chat";
    const prompt = body.prompt || "";
    const platform = body.platform || "";
    const platforms = Array.isArray(body.platforms) ? body.platforms : [];
    const contentType = body.contentType || "";
    const historicalData = body.historicalData || null;

    if (!prompt.trim()) {
      return NextResponse.json(
        { error: "Brakuje treści promptu." },
        { status: 400 }
      );
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Brakuje zmiennej środowiskowej DEEPSEEK_API_KEY." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey,
    });

    const fullPrompt = buildPrompt({
      mode,
      prompt,
      platform,
      platforms,
      contentType,
      historicalData,
    });

    const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;

    const response = await openai.chat.completions.create({
      model: "deepseek-reasoner",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: fullPrompt },
      ],
    });

    const message = response.choices[0]?.message;
    const rawAnswer = message?.content || "";

    let parsedData: unknown = null;
    let parseError: string | null = null;

    if (["generate", "analyze", "adapt", "recommend", "hooks", "strategy"].includes(mode)) {
      try {
        const cleaned = cleanJsonAnswer(rawAnswer);
        parsedData = JSON.parse(cleaned);
      } catch {
        parseError =
          "Nie udało się sparsować JSON — surowa odpowiedź jest w polu answer.";
      }
    }

    return NextResponse.json({
      mode,
      answer: rawAnswer,
      data: parsedData,
      parseError,
      usage: {
        prompt_tokens: response.usage?.prompt_tokens ?? null,
        completion_tokens: response.usage?.completion_tokens ?? null,
        total_tokens: response.usage?.total_tokens ?? null,
      },
    });
  } catch (error) {
    console.error("Błąd DeepSeek:", error);

    return NextResponse.json(
      {
        error: "Błąd podczas generowania odpowiedzi AI.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
