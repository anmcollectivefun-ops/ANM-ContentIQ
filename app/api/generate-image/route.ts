import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

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

// 1. POPRAWKA: Zmiana domyślnego modelu na oficjalny model graficzny Imagen 3
function getImageModel() {
  return process.env.GOOGLE_GENAI_IMAGE_MODEL?.trim() || "imagen-3.0-generate-002";
}

function getApiKey(body: GenerateImageBody) {
  if (body.providerMode === "own" && body.userApiKey?.trim()) {
    return body.userApiKey.trim();
  }

  return process.env.GOOGLE_GENAI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || "";
}

function normalizeGoogleError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);

  if (raw.includes("RESOURCE_EXHAUSTED") || raw.includes("Quota exceeded") || raw.includes("429")) {
    return {
      status: 429,
      message:
        "Google AI Studio odrzucił generowanie obrazu z powodu limitu quota. Włącz billing albo zwiększ limit dla modelu Imagen 3 w Google AI Studio / Google Cloud. Możesz też użyć własnego API key z aktywnym limitem.",
      raw,
    };
  }

  if (raw.includes("API_KEY_INVALID") || raw.toLowerCase().includes("api key")) {
    return {
      status: 401,
      message:
        "Klucz Google API jest nieprawidłowy albo nie ma dostępu do Gemini API. Sprawdź GOOGLE_GENAI_API_KEY lub użyj własnego klucza.",
      raw,
    };
  }

  return {
    status: 500,
    message: raw || "Nieznany błąd generowania obrazu.",
    raw,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateImageBody;
    const prompt = body.prompt?.trim();
    const negativePrompt = body.negativePrompt?.trim() || "";
    const aspectRatio = normalizeAspectRatio(body.aspectRatio);
    const model = getImageModel();
    const apiKey = getApiKey(body);

    if (!prompt) {
      return NextResponse.json(
        { error: "Brak promptu do wygenerowania obrazu." },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Brak klucza Google API. Dodaj GOOGLE_GENAI_API_KEY w zmiennych środowiskowych albo użyj własnego API key w Creative Studio.",
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const finalPrompt = `
Wygeneruj grafikę contentową zgodnie z opisem.
PROMPT: ${prompt}
${negativePrompt ? `NEGATIVE PROMPT: ${negativePrompt}` : ""}
`.trim();

    // 2. POPRAWKA: Zmiana metody z generateContent na dedykowane generateImages
    const response = await ai.models.generateImages({
      model,
      prompt: finalPrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: "image/png",
        aspectRatio: aspectRatio, // Przekazujemy format bezpośrednio do konfiguracji Imagen 3
      },
    });

    // 3. POPRAWKA: Dostosowanie parsowania odpowiedzi do struktury zwracanej przez generateImages
    const generatedImages = response.generatedImages || [];

    const images = generatedImages.map((img, index) => {
      const mimeType = "image/png";
      const base64 = img.image?.imageBytes || "";

      return {
        id: `image-${index + 1}`,
        mimeType,
        base64,
        dataUrl: `data:${mimeType};base64,${base64}`,
      };
    });

    if (images.length === 0) {
      return NextResponse.json(
        {
          error: "Google nie zwrócił obrazu.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      provider: "google",
      model,
      aspectRatio,
      text: `Wygenerowano pomyślnie format ${aspectRatio}`,
      images,
    });
  } catch (error) {
    console.error("generate-image error:", error);
    const normalized = normalizeGoogleError(error);

    return NextResponse.json(
      {
        error: normalized.message,
        rawError: normalized.raw,
      },
      { status: normalized.status }
    );
  }
}