import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SupportBody = {
  app?: string;
  source?: string;
  workspaceId?: string;
  pageUrl?: string;
  category?: string;
  categoryLabel?: string;
  urgency?: string;
  urgencyLabel?: string;
  area?: string;
  subject?: string;
  message?: string;
  expected?: string;
  steps?: string;
  contactEmail?: string;
  language?: string;
};

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function requiredText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function section(label: string, value?: string) {
  const clean = requiredText(value);
  return clean ? `*${label}:*\n${clean}` : `*${label}:*\n-`;
}

function buildPlainMessage(body: SupportBody, userEmail: string, userId: string) {
  return [
    `ANM ContentIQ - nowe zgłoszenie support`,
    ``,
    `Aplikacja: ${body.app || "ANM ContentIQ"}`,
    `Źródło/formularz: ${body.source || "-"}`,
    `Workspace/projekt: ${body.workspaceId || "-"}`,
    `Strona: ${body.pageUrl || "-"}`,
    `Język: ${body.language || "-"}`,
    ``,
    `Użytkownik Supabase: ${userEmail || "-"}`,
    `User ID: ${userId || "-"}`,
    `Email do odpowiedzi: ${body.contactEmail || "-"}`,
    ``,
    `Kategoria: ${body.categoryLabel || body.category || "-"}`,
    `Pilność: ${body.urgencyLabel || body.urgency || "-"}`,
    `Obszar/platforma: ${body.area || "-"}`,
    ``,
    `Temat: ${body.subject || "-"}`,
    ``,
    `Treść wiadomości:`,
    body.message || "-",
    ``,
    `Co powinno się wydarzyć:`,
    body.expected || "-",
    ``,
    `Kroki / kontekst:`,
    body.steps || "-",
  ].join("\n");
}

function buildSlackText(body: SupportBody, userEmail: string, userId: string) {
  return [
    `:rotating_light: *ANM ContentIQ - nowe zgłoszenie support*`,
    section("Aplikacja", body.app || "ANM ContentIQ"),
    section("Źródło", body.source),
    section("Workspace/projekt", body.workspaceId),
    section("Strona", body.pageUrl),
    section("Użytkownik Supabase", userEmail),
    section("User ID", userId),
    section("Email do odpowiedzi", body.contactEmail),
    section("Kategoria", body.categoryLabel || body.category),
    section("Pilność", body.urgencyLabel || body.urgency),
    section("Obszar/platforma", body.area),
    section("Temat", body.subject),
    section("Treść wiadomości", body.message),
    section("Co powinno się wydarzyć", body.expected),
    section("Kroki / kontekst", body.steps),
  ].join("\n\n");
}

async function sendSlack(text: string) {
  const webhookUrl = env("SLACK_WEBHOOK_URL");
  if (!webhookUrl) return { skipped: true };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook error: ${response.status} ${await response.text()}`);
  }

  return { skipped: false };
}

async function sendEmail(subject: string, text: string, replyTo: string) {
  const apiKey = env("RESEND_API_KEY");
  const to =
    env("CONTENTIQ_SUPPORT_EMAIL_TO") ||
    env("SUPPORT_EMAIL_TO") ||
    "contentiq@anmcollective.fun";
  const from =
    env("CONTENTIQ_EMAIL_FROM") ||
    env("SUPPORT_EMAIL_FROM") ||
    "ANM ContentIQ <contentiq@anmcollective.fun>";

  if (!apiKey || !to) return { skipped: true };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      reply_to: replyTo || undefined,
    }),
  });

  if (!response.ok) {
    throw new Error(`Email send error: ${response.status} ${await response.text()}`);
  }

  return { skipped: false };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = (await request.json().catch(() => null)) as SupportBody | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const subject = requiredText(body.subject);
    const message = requiredText(body.message);
    const contactEmail = requiredText(body.contactEmail);

    if (!subject || !message || !contactEmail) {
      return NextResponse.json(
        { error: "Missing subject, message or reply email." },
        { status: 400 }
      );
    }

    const userEmail = user?.email || "";
    const userId = user?.id || "";
    const plainMessage = buildPlainMessage(body, userEmail, userId);
    const slackMessage = buildSlackText(body, userEmail, userId);
    const emailSubject = `[ANM ContentIQ Support] ${body.area || "App"} - ${subject}`;

    const [slackResult, emailResult] = await Promise.all([
      sendSlack(slackMessage),
      sendEmail(emailSubject, plainMessage, contactEmail),
    ]);

    return NextResponse.json({
      ok: true,
      slackSkipped: slackResult.skipped,
      emailSkipped: emailResult.skipped,
    });
  } catch (error) {
    console.error("Support request error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Support request failed.",
      },
      { status: 500 }
    );
  }
}
