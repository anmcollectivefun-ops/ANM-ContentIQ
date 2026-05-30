// app/api/ai/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const SYSTEM_PROMPTS: Record<string, string> = {
  generate: `Jesteś ekspertem content marketingu...`, // twój oryginalny prompt
  analyze: `Jesteś analitykiem content marketingu...`,
  adapt: `Jesteś specjalistą od multi-platform content strategy...`,
  recommend: `Jesteś strategiem content marketingu...`,
  chat: `Jesteś asystentem ANM ContentIQ...`,
};

const JSON_SCHEMAS: Record<string, string> = {
  generate: `Zwróć dokładnie taki JSON...`,
  analyze: `Zwróć dokładnie taki JSON...`,
  adapt: `Zwróć dokładnie taki JSON...`,
  recommend: `Zwróć dokładnie taki JSON...`,
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mode: string = body.mode || "chat";
    const prompt: string = body.prompt || "";
    const platform: string = body.platform || "";
    const contentType: string = body.contentType || "";
    const historicalData: unknown = body.historicalData || null;

    let fullPrompt = prompt;
    if (mode === "generate") {
      fullPrompt = `Platforma: ${platform || "ogólna"}\nTyp contentu: ${contentType || "post"}\nTemat/wytyczne: ${prompt}\n${historicalData ? `Dane historyczne: ${JSON.stringify(historicalData)}` : ""}\n${JSON_SCHEMAS.generate}`;
    } else if (mode === "analyze") {
      fullPrompt = `Platforma: ${platform || "ogólna"}\nTreść do analizy:\n${prompt}\n${JSON_SCHEMAS.analyze}`;
    } else if (mode === "adapt") {
      fullPrompt = `Oryginalna treść:\n${prompt}\n${historicalData ? `Dane o skuteczności platform: ${JSON.stringify(historicalData)}` : ""}\n${JSON_SCHEMAS.adapt}`;
    } else if (mode === "recommend") {
      fullPrompt = `Temat treści: ${prompt}\n${historicalData ? `Dane historyczne z platform: ${JSON.stringify(historicalData)}` : ""}\n${JSON_SCHEMAS.recommend}`;
    }

    const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;

    const response = await openai.chat.completions.create({
      model: "deepseek-reasoner",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: fullPrompt },
      ],
    });

    const rawAnswer = response.choices[0].message.content || "";
    const thinking = (response.choices[0].message as Record<string, unknown>).reasoning_content as string | null;

    let parsedData: unknown = null;
    let parseError: string | null = null;

    if (["generate", "analyze", "adapt", "recommend"].includes(mode)) {
      try {
        const cleaned = rawAnswer.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
        parsedData = JSON.parse(cleaned);
      } catch {
        parseError = "Nie udało się sparsować JSON";
      }
    }

    return NextResponse.json({
      mode,
      answer: rawAnswer,
      data: parsedData,
      thinking,
      parseError,
      usage: { prompt_tokens: response.usage?.prompt_tokens, completion_tokens: response.usage?.completion_tokens },
    });
  } catch (error) {
    return NextResponse.json({ error: "Błąd podczas generowania odpowiedzi", details: String(error) }, { status: 500 });
  }
}