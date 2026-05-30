// app/api/ai/route.ts
// DeepSeek R1 — silnik AI dla ANM ContentIQ
// Obsługuje: generowanie contentu, analizę, scoring, dopasowanie platform

import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// ─── SYSTEM PROMPTS dla każdego trybu ───────────────────────────────────────

const SYSTEM_PROMPTS: Record<string, string> = {

  // Generowanie treści pod konkretną platformę
  generate: `Jesteś ekspertem content marketingu specjalizującym się w tworzeniu treści dla marek B2B i twórców.
Tworzysz content dopasowany do konkretnej platformy, grupy odbiorców i celu komunikacji.
Zawsze odpowiadasz w języku polskim, chyba że użytkownik poprosi inaczej.
Odpowiadaj wyłącznie w formacie JSON zgodnym ze schematem który otrzymasz.`,

  // Analiza istniejącego posta i wynik AI
  analyze: `Jesteś analitykiem content marketingu. Analizujesz treści pod kątem:
- Siły hooka (pierwsze zdanie/sekunda)
- Jakości CTA (call to action)
- Dopasowania do platformy
- Potencjału zaangażowania
- Stylu i tonu komunikacji
Oceniasz w skali 0-100 i dajesz konkretne wskazówki poprawy.
Odpowiadaj wyłącznie w formacie JSON zgodnym ze schematem który otrzymasz.`,

  // Dopasowanie treści do różnych platform
  adapt: `Jesteś specjalistą od multi-platform content strategy.
Wiesz dokładnie jak ta sama treść powinna być zmodyfikowana dla:
- LinkedIn: ekspercki ton, dłuższe posty, statystyki, case studies, B2B
- Instagram: wizualność, emocje, krótsze opisy, hashtagi, CTA do Stories
- TikTok: hook w 1-2 sekundy, dynamika, trend-aware, krótki opis, dźwięk
- YouTube: SEO w tytule, retencja, wartość edukacyjna, thumbnail idea
- Facebook: społeczność, storytelling, grupy, zasięg organiczny spada
- Blog: SEO, długa forma, nagłówki H2/H3, meta description, linkowanie
Odpowiadaj wyłącznie w formacie JSON zgodnym ze schematem który otrzymasz.`,

  // Rekomendacje na podstawie danych historycznych
  recommend: `Jesteś strategiem content marketingu który analizuje dane z wielu platform.
Na podstawie historycznych wyników postów identyfikujesz wzorce:
- Co działa, a co nie działa na danej platformie
- Jakie formaty, tematy i style przynoszą najlepsze wyniki
- Gdzie dana treść ma największy potencjał
- Jak poprawić przyszłe publikacje
Dajesz konkretne, actionable rekomendacje oparte na danych.
Odpowiadaj wyłącznie w formacie JSON zgodnym ze schematem który otrzymasz.`,

  // Ogólny czat AI
  chat: `Jesteś asystentem ANM ContentIQ — platformy do zarządzania contentem.
Pomagasz użytkownikom z: strategią contentową, analizą wyników, tworzeniem treści,
planowaniem publikacji i optymalizacją pod platformy social media.
Odpowiadaj po polsku, konkretnie i pomocnie.`,
};

// ─── SCHEMATY JSON dla każdego trybu ────────────────────────────────────────

const JSON_SCHEMAS: Record<string, string> = {

  generate: `Zwróć dokładnie taki JSON (bez markdown, bez komentarzy):
{
  "title": "tytuł lub temat treści",
  "hook": "pierwsze zdanie — musi zatrzymać uwagę",
  "body": "główna treść posta",
  "cta": "call to action",
  "hashtags": ["hashtag1", "hashtag2"],
  "estimated_score": 85,
  "platform_notes": "krótka uwaga o dopasowaniu do platformy"
}`,

  analyze: `Zwróć dokładnie taki JSON (bez markdown, bez komentarzy):
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

  adapt: `Zwróć dokładnie taki JSON (bez markdown, bez komentarzy):
{
  "platforms": {
    "linkedin": {
      "body": "wersja na LinkedIn",
      "hashtags": ["hashtag"],
      "score": 88,
      "notes": "dlaczego ta wersja działa na LinkedIn"
    },
    "instagram": {
      "body": "wersja na Instagram",
      "hashtags": ["hashtag"],
      "score": 74,
      "notes": "dlaczego ta wersja działa na Instagram"
    },
    "tiktok": {
      "body": "hook i opis na TikTok",
      "hashtags": ["hashtag"],
      "score": 61,
      "notes": "dlaczego ta wersja działa na TikTok"
    }
  }
}`,

  recommend: `Zwróć dokładnie taki JSON (bez markdown, bez komentarzy):
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
  "content_patterns": "wzorce które działają na podstawie danych"
}`,
};

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Tryby: generate | analyze | adapt | recommend | chat
    const mode: string = body.mode || "chat";
    const prompt: string = body.prompt || "";

    // Dodatkowy kontekst (opcjonalny)
    const platform: string = body.platform || "";
    const contentType: string = body.contentType || "";
    const historicalData: unknown = body.historicalData || null;

    // Buduj pełny prompt użytkownika
    let fullPrompt = prompt;

    if (mode === "generate") {
      fullPrompt = `
Platforma: ${platform || "ogólna"}
Typ contentu: ${contentType || "post"}
Temat/wytyczne: ${prompt}

${historicalData ? `Dane historyczne (co działało wcześniej): ${JSON.stringify(historicalData)}` : ""}

${JSON_SCHEMAS.generate}
      `.trim();
    }

    if (mode === "analyze") {
      fullPrompt = `
Platforma: ${platform || "ogólna"}
Treść do analizy:
${prompt}

${JSON_SCHEMAS.analyze}
      `.trim();
    }

    if (mode === "adapt") {
      fullPrompt = `
Oryginalna treść do adaptacji:
${prompt}

${historicalData ? `Dane o skuteczności platform: ${JSON.stringify(historicalData)}` : ""}

${JSON_SCHEMAS.adapt}
      `.trim();
    }

    if (mode === "recommend") {
      fullPrompt = `
Temat treści: ${prompt}
${historicalData ? `Dane historyczne z platform: ${JSON.stringify(historicalData)}` : ""}

${JSON_SCHEMAS.recommend}
      `.trim();
    }

    const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;

    // ── Wywołanie DeepSeek R1 ─────────────────────────────────────────────
    const response = await openai.chat.completions.create({
      model: "deepseek-reasoner",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: fullPrompt },
      ],
    });

    const rawAnswer = response.choices[0].message.content || "";
    const thinking = (response.choices[0].message as Record<string, unknown>).reasoning_content as string | null;

    // ── Parsowanie JSON dla trybów strukturalnych ─────────────────────────
    let parsedData: unknown = null;
    let parseError: string | null = null;

    if (["generate", "analyze", "adapt", "recommend"].includes(mode)) {
      try {
        // Usuń ewentualne markdown backticks które model mógł dodać
        const cleaned = rawAnswer
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
        parsedData = JSON.parse(cleaned);
      } catch {
        parseError = "Nie udało się sparsować JSON — surowa odpowiedź w polu 'answer'";
      }
    }

    return NextResponse.json({
      mode,
      answer: rawAnswer,          // surowa odpowiedź tekstowa
      data: parsedData,           // sparsowany JSON (dla trybów strukturalnych)
      thinking,                   // proces myślowy R1 (opcjonalnie pokazać w UI)
      parseError,                 // błąd parsowania jeśli wystąpił
      usage: {
        prompt_tokens: response.usage?.prompt_tokens,
        completion_tokens: response.usage?.completion_tokens,
      },
    });

  } catch (error) {
    console.error("Błąd DeepSeek:", error);
    return NextResponse.json(
      { error: "Błąd podczas generowania odpowiedzi", details: String(error) },
      { status: 500 }
    );
  }
}