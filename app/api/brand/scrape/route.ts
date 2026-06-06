// app/api/brand/scrape/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ScrapeBody = {
  url?: string;
};

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

function isBlockedHost(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getMatch(html: string, regex: RegExp) {
  return html.match(regex)?.[1]?.replace(/\s+/g, " ").trim() || "";
}

function getAllMatches(html: string, regex: RegExp, limit = 8) {
  return Array.from(html.matchAll(regex))
    .map((match) => stripHtml(match[1] || ""))
    .filter(Boolean)
    .slice(0, limit);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as ScrapeBody | null;
    const rawUrl = body?.url || "";
    const normalized = normalizeUrl(rawUrl);

    if (!normalized) {
      return NextResponse.json({ error: "Brak adresu strony." }, { status: 400 });
    }

    let url: URL;
    try {
      url = new URL(normalized);
    } catch {
      return NextResponse.json({ error: "Nieprawidłowy adres URL." }, { status: 400 });
    }

    if (!["http:", "https:"].includes(url.protocol) || isBlockedHost(url.hostname)) {
      return NextResponse.json({ error: "Ten adres nie może zostać pobrany." }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "ANM-ContentIQ-BrandBot/1.0",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Nie udało się pobrać strony. Status: ${response.status}` },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return NextResponse.json(
        { error: "Adres nie zwrócił strony HTML." },
        { status: 415 }
      );
    }

    const html = await response.text();
    const title = getMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const description =
      getMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i) ||
      getMatch(html, /<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["'][^>]*>/i) ||
      getMatch(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i);

    const h1 = getAllMatches(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi, 5);
    const h2 = getAllMatches(html, /<h2[^>]*>([\s\S]*?)<\/h2>/gi, 10);
    const cleanText = stripHtml(html).slice(0, 4000);

    const sourceNotes = [
      title ? `Tytuł strony: ${title}` : "",
      description ? `Opis meta: ${description}` : "",
      h1.length ? `Nagłówki H1: ${h1.join(" | ")}` : "",
      h2.length ? `Wybrane H2: ${h2.join(" | ")}` : "",
      cleanText ? `Fragment treści strony: ${cleanText.slice(0, 1800)}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return NextResponse.json({
      ok: true,
      url: url.toString(),
      title,
      description,
      h1,
      h2,
      source_notes: sourceNotes,
    });
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        error: isAbort
          ? "Strona zbyt długo nie odpowiadała. Spróbuj ponownie albo wpisz opis marki ręcznie."
          : error instanceof Error
            ? error.message
            : String(error),
      },
      { status: isAbort ? 504 : 500 }
    );
  }
}
