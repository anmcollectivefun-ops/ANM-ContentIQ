import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

type GenerateImageBody = {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: "1:1" | "4:5" | "9:16" | "16:9";
  providerMode?: "anm" | "own";
  userApiKey?: string;
};

function normalizeAspectRatio(format?: string) {
  if (format === "4:5") return "4:5";
  if (format === "9:16") return "9:16";
  if (format === "16:9") return "16:9";
  return "1:1";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateImageBody;

    const prompt = body.prompt?.trim();
    const negativePrompt = body.negativePrompt?.trim() || "";
    const aspectRatio = normalizeAspectRatio(body.aspectRatio);

    if (!prompt) {
      return NextResponse.json(
        { error: "Brak promptu do wygenerowania obrazu." },
        { status: 400 }
      );
    }

    const apiKey =
      body.providerMode === "own" && body.userApiKey
        ? body.userApiKey
        : process.env.GOOGLE_GENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Brak klucza Google API." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    const finalPrompt = `
Wygeneruj grafikę contentową zgodnie z opisem.

PROMPT:
${prompt}

NEGATIVE PROMPT:
${negativePrompt || "brak"}

Wymagania:
- estetyczna grafika do social media,
- wysoka jakość,
- czytelna kompozycja,
- bez zniekształconych twarzy i dłoni,
- jeśli pojawia się tekst, powinien być możliwie czytelny,
- dopasuj kompozycję do formatu ${aspectRatio}.
`.trim();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: finalPrompt,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    const parts: Array<{
      text?: string;
      inlineData?: {
        data?: string;
        mimeType?: string;
      };
    }> = response.candidates?.[0]?.content?.parts || [];

    const images = parts
      .filter((part) => part.inlineData?.data)
      .map((part, index) => {
        const mimeType = part.inlineData?.mimeType || "image/png";
        const base64 = part.inlineData?.data || "";

        return {
          id: `image-${index + 1}`,
          mimeType,
          base64,
          dataUrl: `data:${mimeType};base64,${base64}`,
        };
      });

    const text = parts
      .filter((part) => part.text)
      .map((part) => part.text)
      .join("\n");

    if (images.length === 0) {
      return NextResponse.json(
        {
          error: "Google nie zwrócił obrazu.",
          text,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      provider: "google",
      model: "gemini-2.5-flash-image",
      aspectRatio,
      text,
      images,
    });
  } catch (error) {
    console.error("generate-image error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nieznany błąd generowania obrazu.",
      },
      { status: 500 }
    );
  }
}
