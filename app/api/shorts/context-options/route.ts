import { NextRequest, NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/engagement/server";

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId")?.trim();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "Missing workspaceId" },
        { status: 400 }
      );
    }

    const { supabase, workspace } = await requireWorkspace(workspaceId);
    const [
      { data: offers, error: offersError },
      { data: connections },
      { data: contentTemplates, error: contentTemplatesError },
      { data: shortTemplates, error: shortTemplatesError },
    ] =
      await Promise.all([
        supabase
          .schema("contentiq")
          .from("brand_offers")
          .select(
            "id,name,offer_type,url,short_description,is_primary,status"
          )
          .eq("workspace_id", workspace.id)
          .eq("status", "active")
          .order("is_primary", { ascending: false })
          .order("updated_at", { ascending: false }),
        supabase
          .schema("contentiq")
          .from("platform_connections")
          .select("id,platform")
          .eq("workspace_id", workspace.id),
        supabase
          .schema("contentiq")
          .from("content_drafts")
          .select("id,title,topic,content_type,target_platforms,created_at")
          .eq("workspace_id", workspace.id)
          .eq("status", "template")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .schema("contentiq")
          .from("short_templates")
          .select("id,title,platform,hook,created_at")
          .eq("workspace_id", workspace.id)
          .eq("status", "template_ready")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

    if (offersError) throw new Error(offersError.message);
    if (contentTemplatesError) throw new Error(contentTemplatesError.message);
    if (shortTemplatesError) throw new Error(shortTemplatesError.message);

    const connectionRows = connections || [];
    const connectionIds = connectionRows.map((row) => row.id);
    const platformByConnection = new Map(
      connectionRows.map((row) => [row.id, row.platform])
    );

    let links: Record<string, unknown>[] = [];
    if (connectionIds.length > 0) {
      const { data, error } = await supabase
        .schema("contentiq")
        .from("manual_links")
        .select("id,type,url,title,connection_id,created_at")
        .in("connection_id", connectionIds)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw new Error(error.message);
      links = (data || []) as Record<string, unknown>[];
    }

    return NextResponse.json({
      options: [
        ...(offers || []).map((offer) => ({
          id: offer.id,
          kind: "offer",
          label: offer.name,
          subtitle:
            offer.short_description ||
            offer.offer_type ||
            "Oferta / produkt",
          url: offer.url || null,
          primary: Boolean(offer.is_primary),
        })),
        ...links.map((link) => ({
          id: String(link.id),
          kind: "link",
          label:
            String(link.title || "").trim() ||
            String(link.url || "").trim() ||
            "Zapisany link",
          subtitle: `${platformByConnection.get(String(link.connection_id)) || "platforma"} · ${
            link.type === "account" ? "profil" : "post / strona"
          }`,
          url: String(link.url || "").trim() || null,
          primary: false,
        })),
        ...(contentTemplates || []).map((template) => ({
          id: `content_drafts:${template.id}`,
          kind: "template",
          label:
            template.title ||
            template.topic ||
            "Szablon contentu bez tytułu",
          subtitle: [
            template.content_type || "content",
            Array.isArray(template.target_platforms)
              ? template.target_platforms.join(", ")
              : "",
          ]
            .filter(Boolean)
            .join(" · "),
          url: null,
          primary: false,
        })),
        ...(shortTemplates || []).map((template) => ({
          id: `short_templates:${template.id}`,
          kind: "template",
          label: template.title || template.hook || "Szablon shorta",
          subtitle: [template.platform || "short", "szablon video"]
            .filter(Boolean)
            .join(" · "),
          url: null,
          primary: false,
        })),
      ],
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
