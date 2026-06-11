import { NextRequest, NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/engagement/server";
import {
  calculatePerformanceScore,
  getMetricEngagement,
  getMetricReach,
} from "@/lib/performanceScore";

type Platform =
  | "linkedin"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "blog"
  | "spotify";

type ConnectionRow = {
  id: string;
  platform?: string | null;
};

type PostRow = {
  id?: string;
  connection_id?: string | null;
  title?: string | null;
  content?: string | null;
  post_type?: string | null;
  reach?: number | null;
  impressions?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  clicks?: number | null;
  ai_score?: number | null;
  published_at?: string | null;
};

const PLATFORMS = new Set<Platform>([
  "linkedin",
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "blog",
  "spotify",
]);

function asNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(asText).filter(Boolean);
}

function platformOf(value: unknown): Platform {
  const normalized = asText(value).toLowerCase() as Platform;
  return PLATFORMS.has(normalized) ? normalized : "facebook";
}

function postLabel(post: PostRow) {
  return (
    asText(post.title) ||
    asText(post.content).slice(0, 110) ||
    "Publikacja bez tytułu"
  );
}

function postFormat(post: PostRow) {
  return asText(post.post_type) || "post";
}

function engagementRate(post: PostRow) {
  const reach = getMetricReach(post);
  if (reach <= 0) return 0;
  return Number(((getMetricEngagement(post) / reach) * 100).toFixed(2));
}

function unique(values: string[], limit = 6) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(
    0,
    limit
  );
}

function summarizeBrand(
  profile: Record<string, unknown> | null,
  voice: Record<string, unknown> | null
) {
  const parts = [
    asText(profile?.brand_description),
    asText(profile?.target_audience)
      ? `Grupa docelowa: ${asText(profile?.target_audience)}`
      : "",
    asText(profile?.brand_values)
      ? `Wartości: ${asText(profile?.brand_values)}`
      : "",
    asText(voice?.tone) ? `Ton: ${asText(voice?.tone)}` : "",
    asText(voice?.style) ? `Styl: ${asText(voice?.style)}` : "",
  ];

  const keywords = unique([
    ...asStringArray(profile?.keywords),
    ...asStringArray(voice?.keywords),
  ]);
  if (keywords.length) parts.push(`Słowa kluczowe: ${keywords.join(", ")}`);

  return parts.filter(Boolean).join("\n");
}

function summarizeOffers(rows: Record<string, unknown>[]) {
  return rows
    .slice(0, 4)
    .map((offer) => {
      const name = asText(offer.name);
      const description =
        asText(offer.short_description) || asText(offer.full_description);
      const benefits = asStringArray(offer.benefits).slice(0, 3).join(", ");
      const cta = asStringArray(offer.cta_options).slice(0, 2).join(" / ");

      return [
        name,
        description,
        benefits ? `Korzyści: ${benefits}` : "",
        cta ? `CTA: ${cta}` : "",
      ]
        .filter(Boolean)
        .join(" — ");
    })
    .filter(Boolean)
    .join("\n");
}

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId")?.trim();
    const requestedPlatform = platformOf(
      request.nextUrl.searchParams.get("platform")
    );

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Missing workspaceId" },
        { status: 400 }
      );
    }

    const { supabase, workspace } = await requireWorkspace(workspaceId);

    const [
      connectionsResult,
      brandProfilesResult,
      brandVoiceResult,
      offersResult,
      learningsResult,
    ] = await Promise.all([
      supabase
        .schema("contentiq")
        .from("platform_connections")
        .select("*")
        .eq("workspace_id", workspace.id)
        .eq("connected", true),
      supabase
        .schema("contentiq")
        .from("brand_profiles")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("is_default", { ascending: false })
        .limit(1),
      supabase
        .schema("contentiq")
        .from("brand_voice")
        .select("*")
        .eq("workspace_id", workspace.id)
        .limit(1),
      supabase
        .schema("contentiq")
        .from("brand_offers")
        .select("*")
        .eq("workspace_id", workspace.id)
        .eq("status", "active")
        .order("is_primary", { ascending: false })
        .limit(6),
      supabase
        .schema("contentiq")
        .from("ai_learnings")
        .select("*")
        .eq("workspace_id", workspace.id)
        .eq("dismissed", false)
        .order("confidence", { ascending: false })
        .limit(8),
    ]);

    const connections = (connectionsResult.data || []) as ConnectionRow[];
    const connectionPlatforms = new Map(
      connections.map((connection) => [
        connection.id,
        platformOf(connection.platform),
      ])
    );
    const connectionIds = connections.map((connection) => connection.id);

    let posts: PostRow[] = [];
    if (connectionIds.length > 0) {
      const postsResult = await supabase
        .schema("contentiq")
        .from("posts")
        .select("*")
        .in("connection_id", connectionIds)
        .order("published_at", { ascending: false })
        .limit(500);

      if (postsResult.error) {
        return NextResponse.json(
          { error: postsResult.error.message },
          { status: 500 }
        );
      }
      posts = (postsResult.data || []) as PostRow[];
    }

    const enriched = posts.map((post) => {
      const platform =
        connectionPlatforms.get(post.connection_id || "") || "facebook";
      return {
        post,
        platform,
        reach: getMetricReach(post),
        engagement: getMetricEngagement(post),
        engagementRate: engagementRate(post),
        score: calculatePerformanceScore(post),
      };
    });

    const relevant = enriched.filter(
      (item) => item.platform === requestedPlatform
    );
    const rankingPool = relevant.length > 0 ? relevant : enriched;

    const bestByViews = [...rankingPool].sort(
      (a, b) => b.reach - a.reach
    )[0];
    const bestByEngagement = [...rankingPool].sort(
      (a, b) =>
        b.engagementRate - a.engagementRate ||
        b.engagement - a.engagement
    )[0];
    const mostCommented = [...rankingPool].sort(
      (a, b) => asNumber(b.post.comments) - asNumber(a.post.comments)
    )[0];

    const formatStats = new Map<
      string,
      { count: number; score: number; reach: number }
    >();
    for (const item of rankingPool) {
      const format = postFormat(item.post);
      const current = formatStats.get(format) || {
        count: 0,
        score: 0,
        reach: 0,
      };
      current.count += 1;
      current.score += item.score;
      current.reach += item.reach;
      formatStats.set(format, current);
    }

    const winningFormats = [...formatStats.entries()]
      .sort(([, a], [, b]) => {
        const averageA = a.score / Math.max(a.count, 1);
        const averageB = b.score / Math.max(b.count, 1);
        return averageB - averageA || b.reach - a.reach;
      })
      .slice(0, 5)
      .map(([format]) => format);

    const strongestPosts = [...rankingPool]
      .sort((a, b) => b.score - a.score || b.reach - a.reach)
      .slice(0, 6);
    const winningTopics = unique(
      strongestPosts.map((item) => postLabel(item.post)),
      5
    );

    const brandProfile =
      ((brandProfilesResult.data || [])[0] as Record<string, unknown>) || null;
    const brandVoice =
      ((brandVoiceResult.data || [])[0] as Record<string, unknown>) || null;
    const offers = (offersResult.data || []) as Record<string, unknown>[];
    const learnings = (learningsResult.data || []) as Record<string, unknown>[];
    const brandSummary = summarizeBrand(brandProfile, brandVoice);
    const offerSummary = summarizeOffers(offers);

    const recommendedActions = unique(
      [
        bestByViews
          ? `Rozwiń temat „${postLabel(bestByViews.post)}”, bo uzyskał najwyższy zasięg (${bestByViews.reach}).`
          : "",
        bestByEngagement
          ? `Przetestuj ponownie format ${postFormat(bestByEngagement.post)}, który osiągnął najwyższe zaangażowanie (${bestByEngagement.engagementRate}%).`
          : "",
        mostCommented && asNumber(mostCommented.post.comments) > 0
          ? `Zbuduj kolejną publikację wokół rozmowy rozpoczętej przez „${postLabel(mostCommented.post)}” (${asNumber(mostCommented.post.comments)} komentarzy).`
          : "",
        ...learnings
          .map((learning) => asText(learning.insight))
          .filter(Boolean),
        posts.length === 0
          ? "Najpierw zsynchronizuj publikacje. Bez wyników AI nie będzie udawać, że zna preferencje odbiorców."
          : "",
      ],
      6
    );

    const contentOpportunities = [];
    if (bestByViews) {
      contentOpportunities.push({
        title: `Rozwinięcie najlepszego tematu: ${postLabel(bestByViews.post)}`,
        reason: "Ten kierunek ma największe potwierdzenie w realnym zasięgu.",
        platform: bestByViews.platform,
        format: postFormat(bestByViews.post),
        evidence: [
          `Zasięg lub wyświetlenia: ${bestByViews.reach}`,
          `Wynik skuteczności: ${bestByViews.score}/100`,
        ],
      });
    }
    if (
      bestByEngagement &&
      bestByEngagement.post.id !== bestByViews?.post.id
    ) {
      contentOpportunities.push({
        title: `Nowy wariant treści: ${postLabel(bestByEngagement.post)}`,
        reason:
          "Ta publikacja najlepiej zamieniała uwagę odbiorców w reakcje.",
        platform: bestByEngagement.platform,
        format: postFormat(bestByEngagement.post),
        evidence: [
          `Engagement rate: ${bestByEngagement.engagementRate}%`,
          `Łączne interakcje: ${bestByEngagement.engagement}`,
        ],
      });
    }
    if (mostCommented && asNumber(mostCommented.post.comments) > 0) {
      contentOpportunities.push({
        title: `Odpowiedź na zainteresowanie: ${postLabel(mostCommented.post)}`,
        reason:
          "To temat, który wywołał najwięcej rozmów i nadaje się do kontynuacji.",
        platform: mostCommented.platform,
        format: postFormat(mostCommented.post),
        evidence: [
          `Komentarze: ${asNumber(mostCommented.post.comments)}`,
          `Zasięg lub wyświetlenia: ${mostCommented.reach}`,
        ],
      });
    }

    const primaryOffer = offers[0];
    if (primaryOffer && contentOpportunities.length < 4) {
      const offerName = asText(primaryOffer.name);
      contentOpportunities.push({
        title: `Połącz działający format z ofertą: ${offerName}`,
        reason:
          "AI może przełożyć najlepszy format z danych na treść prowadzącą do aktywnej oferty.",
        platform: requestedPlatform,
        format: winningFormats[0] || "post",
        evidence: [
          winningFormats[0]
            ? `Najmocniejszy format: ${winningFormats[0]}`
            : "Brak dominującego formatu — potrzebny test",
          `Aktywna oferta: ${offerName}`,
        ],
      });
    }

    const commentsInMetrics = posts.reduce(
      (sum, post) => sum + asNumber(post.comments),
      0
    );

    return NextResponse.json({
      context: {
        hasData: posts.length > 0,
        postsAnalyzed: posts.length,
        commentsAnalyzed: commentsInMetrics,
        bestPostByViews: bestByViews
          ? {
              title: postLabel(bestByViews.post),
              views: bestByViews.reach,
              platform: bestByViews.platform,
              format: postFormat(bestByViews.post),
            }
          : undefined,
        bestPostByEngagement: bestByEngagement
          ? {
              title: postLabel(bestByEngagement.post),
              engagementRate: bestByEngagement.engagementRate,
              platform: bestByEngagement.platform,
              format: postFormat(bestByEngagement.post),
            }
          : undefined,
        mostCommentedPost: mostCommented
          ? {
              title: postLabel(mostCommented.post),
              comments: asNumber(mostCommented.post.comments),
              platform: mostCommented.platform,
              format: postFormat(mostCommented.post),
            }
          : undefined,
        winningFormats,
        winningTopics,
        commonCommentTopics: [],
        audienceQuestions: [],
        recommendedTone:
          asText(brandVoice?.tone) ||
          asText(brandProfile?.source_notes) ||
          "",
        recommendedActions,
        brandVoice: brandSummary,
        offerSummary,
        contentOpportunities: contentOpportunities.slice(0, 4),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message },
      {
        status:
          message === "Unauthorized"
            ? 401
            : message === "Workspace not found"
              ? 404
              : 500,
      }
    );
  }
}
