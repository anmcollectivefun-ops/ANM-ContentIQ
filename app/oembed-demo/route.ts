import { NextRequest, NextResponse } from "next/server";

function getOEmbedEndpoint(targetUrl: string) {
  const lower = targetUrl.toLowerCase();

  if (lower.includes("threads.net")) {
    return "https://graph.facebook.com/v23.0/oembed_post";
  }

  if (lower.includes("instagram.com")) {
    return "https://graph.facebook.com/v23.0/instagram_oembed";
  }

  return "https://graph.facebook.com/v23.0/oembed_post";
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing url parameter",
        example:
          "/api/meta/oembed-test?url=https://www.threads.net/@public_profile/post/public_post_id",
      },
      { status: 400 }
    );
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing META_APP_ID or META_APP_SECRET in environment variables.",
      },
      { status: 500 }
    );
  }

  const accessToken = `${appId}|${appSecret}`;
  const endpointUrl = getOEmbedEndpoint(url);

  const endpoint = new URL(endpointUrl);
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("access_token", accessToken);

  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json();

    return NextResponse.json(
      {
        ok: response.ok,
        status: response.status,
        endpoint: endpointUrl,
        testedUrl: url,
        metaResponse: data,
      },
      { status: response.ok ? 200 : response.status }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error while calling Meta oEmbed API.",
      },
      { status: 500 }
    );
  }
}