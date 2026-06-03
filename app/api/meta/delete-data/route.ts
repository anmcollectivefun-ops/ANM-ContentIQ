import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_SITE_URL = "https://contentiq.anmcollective.fun";
const APP_NAME = "ANM ContentIQ";
const SUPPORT_EMAIL = "asystentkanamiare@gmail.com";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function verifySignature(signature: string, payload: string) {
  const secret = process.env.META_APP_SECRET?.trim();

  if (!secret) {
    return false;
  }

  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return signatureBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

function parseSignedRequest(signedRequest: string) {
  const [signature, payload] = signedRequest.split(".");

  if (!signature || !payload) {
    return { verified: false, data: null };
  }

  try {
    return {
      verified: verifySignature(signature, payload),
      data: JSON.parse(base64UrlDecode(payload)) as Record<string, unknown>,
    };
  } catch {
    return { verified: false, data: null };
  }
}

async function getSignedRequest(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    return typeof body?.signed_request === "string" ? body.signed_request : "";
  }

  const formData = await req.formData().catch(() => null);
  const value = formData?.get("signed_request");
  return typeof value === "string" ? value : "";
}

function deletionResponse(confirmationCode: string) {
  const url = `${siteUrl()}/api/meta/delete-data?code=${encodeURIComponent(confirmationCode)}`;

  return NextResponse.json({
    url,
    confirmation_code: confirmationCode,
  });
}

export async function POST(req: NextRequest) {
  const signedRequest = await getSignedRequest(req);
  const parsed = signedRequest ? parseSignedRequest(signedRequest) : { verified: false, data: null };
  const metaUserId = typeof parsed.data?.user_id === "string" ? parsed.data.user_id : "unknown";
  const confirmationCode = `meta-delete-${metaUserId}-${crypto.randomUUID()}`;

  return deletionResponse(confirmationCode);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  return new NextResponse(`<!doctype html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${APP_NAME} - Meta Data Deletion</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #07090d; color: #f8fafc; }
      main { max-width: 760px; margin: 0 auto; padding: 48px 20px; line-height: 1.65; }
      img { width: 72px; height: 72px; border-radius: 18px; object-fit: cover; }
      h1 { margin: 22px 0 10px; font-size: 32px; }
      a { color: #8cc7ff; }
      .box { margin-top: 22px; padding: 18px; border: 1px solid #263244; border-radius: 12px; background: #0f1724; }
      code { color: #86efac; }
    </style>
  </head>
  <body>
    <main>
      <img src="/ANM_ContentIQ_.JPG" alt="${APP_NAME} logo" />
      <h1>Meta Data Deletion</h1>
      <p>
        This endpoint is used by Meta to process data deletion requests for ${APP_NAME}.
        If you want your Facebook or Instagram connection data removed from ANM ContentIQ,
        send a request to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.
      </p>
      <div class="box">
        <strong>Data deletion request URL:</strong><br />
        <code>${siteUrl()}/api/meta/delete-data</code>
      </div>
      ${code ? `<div class="box"><strong>Confirmation code:</strong><br /><code>${code}</code></div>` : ""}
      <p>
        After receiving a valid request, ANM ContentIQ removes or disconnects related
        Facebook and Instagram integration data where it can be matched to the requesting user.
      </p>
      <p>
        Legal pages: <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms of Service</a>.
      </p>
    </main>
  </body>
</html>`, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
