import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AspectRatio = "1:1" | "4:5" | "9:16" | "16:9";

type GenerateImageBody = {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: AspectRatio;
  providerMode?: "anm" | "own" | "huggingface";
  userApiKey?: string;
};

function normalizeAspectRatio(format?: string): AspectRatio {
  if (format === "4:5") return "4:5";
  if (format === "9:16") return "9:16";
  if (format === "16:9") return "16:9";
  return "1:1";
}

function aspectRatioHint(format: AspectRatio) {
  if (format === "4:5") return "vertical 4:5 social media post";
  if (format === "9:16") return "vertical 9:16 story, reel or short cover";
  if (format === "16:9") return "wide 16:9 video thumbnail";
  return "square 1:1 social media post";
}

function getGoogleImageModel() {
  return process.env.GOOGLE_GENAI_IMAGE_MODEL?.trim() || "imagen-3.0-generate-002";
}

function getHuggingFaceModel() {
  return process.env.HF_IMAGE_MODEL?.trim() || "black-forest-labs/FLUX.1-schnell";
}

function getGoogleApiKey(body: GenerateImageBody) {
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
        "Google odrzucił generowanie obrazu z powodu limitu quota. Włącz billing albo zwiększ limit dla modelu graficznego w Google AI Studio / Google Cloud. Możesz też wybrać darmowy provider Hugging Face.",
      raw,
    };
  }

  if (raw.includes("API_KEY_INVALID") || raw.toLowerCase().includes("api key")) {
    return {
      status: 401,
      message:
        "Klucz Google API jest nieprawidłowy albo nie ma dostępu do Google AI API. Sprawdź GOOGLE_GENAI_API_KEY lub użyj własnego klucza.",
      raw,
    };
  }

  return {
    status: 500,
    message: raw || "Nieznany błąd generowania obrazu.",
    raw,
  };
}

function normalizeHuggingFaceError(status: number, raw: string) {
  if (status === 401 || status === 403) {
    return "Hugging Face odrzucił token. Sprawdź HF_TOKEN w zmiennych środowiskowych.";
  }

  if (status === 429) {
    return "Hugging Face zwrócił limit zapytań. Spróbuj ponownie później albo użyj innego tokenu.";
  }

  if (status === 503 || raw.toLowerCase().includes("currently loading")) {
    return "Model Hugging Face jeszcze się ładuje. To normalny zimny start. Odczekaj kilkanaście sekund i kliknij Generuj HF ponownie.";
  }

  return `Hugging Face error (${status}): ${raw}`;
}

async function generateWithHuggingFace(prompt: string, negativePrompt: string, aspectRatio: AspectRatio) {
  const hfToken = process.env.HF_TOKEN?.trim() || process.env.HUGGINGFACE_API_TOKEN?.trim() || "";

  if (!hfToken) {
    return NextResponse.json(
      { error: "Brak HF_TOKEN. Dodaj darmowy token Hugging Face w zmiennych środowiskowych." },
      { status: 500 }
    );
  }

  const model = getHuggingFaceModel();
  const modelUrl = `https://api-inference.huggingface.co/models/${model}`;
  const finalPrompt = [
    prompt,
    `Aspect ratio: ${aspectRatioHint(aspectRatio)}.`,
    negativePrompt ? `Avoid: ${negativePrompt}.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  let response: Response;
  try {
    response = await fetch(modelUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        inputs: finalPrompt,
        options: {
          wait_for_model: false,
        },
      }),
    });
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        error: isAbort
          ? "Hugging Face nie odpowiedział w 25 sekund. To najpewniej zimny start modelu. Spróbuj ponownie za chwilę."
          : `Hugging Face request failed: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: isAbort ? 503 : 502 }
    );
  } finally {
    clearTimeout(timeout);
  }

  const contentType = response.headers.get("content-type") || "image/png";

  if (!response.ok) {
    const errText = await response.text();
    return NextResponse.json(
      { error: normalizeHuggingFaceError(response.status, errText), rawError: errText },
      { status: response.status }
    );
  }

  if (contentType.includes("application/json")) {
    const json = await response.json().catch(() => null);
    const message = json?.error || json?.message || "Hugging Face nie zwrócił obrazu.";
    return NextResponse.json({ error: message, rawError: JSON.stringify(json) }, { status: 502 });
  }

  const arrayBuffer = await response.arrayBuffer();
  if (!arrayBuffer.byteLength) {
    return NextResponse.json(
      {
        error:
          "Hugging Face zwrócił pusty obraz. To może być zimny start albo chwilowy problem modelu. Spróbuj ponownie za chwilę.",
      },
      { status: 502 }
    );
  }

  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = contentType.includes("image/") ? contentType.split(";")[0] : "image/png";

  return NextResponse.json({
    ok: true,
    provider: "huggingface",
    model,
    aspectRatio,
    text: "Wygenerowano obraz przez Hugging Face.",
    images: [
      {
        id: `image-${Date.now()}`,
        mimeType,
        base64,
        dataUrl: `data:${mimeType};base64,${base64}`,
      },
    ],
  });
}

async function generateWithGoogle(body: GenerateImageBody, prompt: string, negativePrompt: string, aspectRatio: AspectRatio) {
  const apiKey = getGoogleApiKey(body);
  const model = getGoogleImageModel();

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

  const response = await ai.models.generateImages({
    model,
    prompt: finalPrompt,
    config: {
      numberOfImages: 1,
      outputMimeType: "image/png",
      aspectRatio,
    },
  });

  const images = (response.generatedImages || []).map((img, index) => {
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
    return NextResponse.json({ error: "Google nie zwrócił obrazu." }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    provider: "google",
    model,
    aspectRatio,
    text: `Wygenerowano obraz przez Google AI, format ${aspectRatio}.`,
    images,
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateImageBody;
    const prompt = body.prompt?.trim();
    const negativePrompt = body.negativePrompt?.trim() || "";
    const aspectRatio = normalizeAspectRatio(body.aspectRatio);

    if (!prompt) {
      return NextResponse.json({ error: "Brak promptu do wygenerowania obrazu." }, { status: 400 });
    }

    if (body.providerMode === "huggingface") {
      return generateWithHuggingFace(prompt, negativePrompt, aspectRatio);
    }

    return generateWithGoogle(body, prompt, negativePrompt, aspectRatio);
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
