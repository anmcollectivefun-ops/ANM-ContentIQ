"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

type Platform =
  | "linkedin"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "blog"
  | "spotify";

type TemplateKind = "content" | "video" | "short" | "creative";
type TemplateSource = "content_drafts" | "short_templates";

interface TemplateDraft {
  id: string;
  title: string | null;
  body: string | null;
  topic: string | null;
  content_type: string | null;
  target_platforms: string[] | null;
  ai_score: number | null;
  ai_feedback: string | null;
  media: DraftMediaItem[] | null;
  created_at: string | null;
}

interface DraftMediaItem {
  kind?: string | null;
  asset_type?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  status?: string | null;
  public_url?: string | null;
  url?: string | null;
  data_url?: string | null;
  preview_text?: string | null;
  source?: string | null;
}

interface ShortTemplateRow {
  id: string;
  workspace_id: string;
  source_upload_id: string | null;
  title: string | null;
  platform: string | null;
  hook: string | null;
  caption: string | null;
  hashtags: string[] | null;
  script: string | null;
  on_screen_text: unknown;
  shots: unknown;
  thumbnail_text: string | null;
  ai_summary: string | null;
  video_storage_path: string | null;
  video_public_url: string | null;
  status: string | null;
  external_platform: string | null;
  external_post_id: string | null;
  external_post_url: string | null;
  published_at: string | null;
  created_at: string | null;
}

interface UnifiedTemplate {
  id: string;
  source: TemplateSource;
  kind: TemplateKind;
  title: string;
  description: string;
  topic: string | null;
  content_type: string | null;
  platforms: string[];
  hashtags: string[];
  ai_score: number | null;
  ai_feedback: string | null;
  image_url: string | null;
  video_url: string | null;
  cover_label: string | null;
  created_at: string | null;
  original: TemplateDraft | ShortTemplateRow;
}

const PLATFORMS: { id: Platform; name: string; color: string; icon: string }[] = [
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2", icon: "LI" },
  { id: "instagram", name: "Instagram", color: "#E1306C", icon: "IG" },
  { id: "tiktok", name: "TikTok", color: "#111827", icon: "TT" },
  { id: "youtube", name: "YouTube", color: "#FF0000", icon: "YT" },
  { id: "facebook", name: "Facebook", color: "#1877F2", icon: "FB" },
  { id: "blog", name: "Blog", color: "#22C55E", icon: "BL" },
  { id: "spotify", name: "Spotify", color: "#1DB954", icon: "SP" },
];

const PLATFORM_ALIASES: Record<Platform, string[]> = {
  linkedin: ["linkedin", "linkedin_video"],
  instagram: ["instagram", "instagram_reels", "reels", "ig"],
  tiktok: ["tiktok"],
  youtube: ["youtube", "youtube_shorts", "shorts"],
  facebook: ["facebook", "facebook_reels", "fb"],
  blog: ["blog", "article"],
  spotify: ["spotify", "podcast"],
};

function safeArray(value: string[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

function normalizePlatform(value: string | null | undefined) {
  return (value || "").toLowerCase().trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getTemplateKindFromDraft(template: TemplateDraft): TemplateKind {
  const type = (template.content_type || "").toLowerCase();

  if (type.startsWith("video studio")) return "video";
  if (type.startsWith("short studio")) return "short";
  if (type.startsWith("creative studio")) return "creative";
  return "content";
}

function platformMatches(template: UnifiedTemplate, platform: Platform) {
  const targets = template.platforms.map((item) => normalizePlatform(item));
  return PLATFORM_ALIASES[platform].some((alias) => targets.includes(alias));
}

function formatDate(value: string | null) {
  if (!value) return "Brak daty";
  return new Date(value).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getNextHourTime() {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date.toTimeString().slice(0, 5);
}

function extractImageUrl(text: string | null | undefined) {
  if (!text) return null;

  const markdown = text.match(/!\[[^\]]*]\((https?:\/\/[^)\s]+\.(?:png|jpe?g|webp|gif)(?:\?[^)]*)?)\)/i);
  if (markdown?.[1]) return markdown[1];

  const plain = text.match(/https?:\/\/[^\s)"']+\.(?:png|jpe?g|webp|gif)(?:\?[^\s)"']*)?/i);
  return plain?.[0] || null;
}

function safeMedia(value: DraftMediaItem[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

function getMediaUrl(item: DraftMediaItem | null | undefined) {
  return item?.public_url || item?.url || item?.data_url || null;
}

function getCoverMedia(template: TemplateDraft) {
  const media = safeMedia(template.media);
  return (
    media.find((item) => item.kind === "cover") ||
    media.find((item) => item.asset_type === "image") ||
    media.find((item) => item.asset_type === "video") ||
    null
  );
}

function extractHashtags(text: string | null | undefined) {
  if (!text) return [];
  return unique((text.match(/#[\p{L}\p{N}_-]+/gu) || []).slice(0, 24));
}

function getSummary(text: string, length = 180) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= length) return clean;
  return `${clean.slice(0, length).trim()}...`;
}

function draftToUnified(template: TemplateDraft): UnifiedTemplate {
  const body = template.body || "";
  const hashtags = extractHashtags(body);
  const platforms = safeArray(template.target_platforms);
  const cover = getCoverMedia(template);
  const coverUrl = getMediaUrl(cover);
  const coverAssetType = (cover?.asset_type || "").toLowerCase();
  const fallbackImageUrl = extractImageUrl(body);

  return {
    id: template.id,
    source: "content_drafts",
    kind: getTemplateKindFromDraft(template),
    title: template.title || template.topic || "Szablon bez tytułu",
    description: body || template.ai_feedback || "",
    topic: template.topic,
    content_type: template.content_type,
    platforms,
    hashtags,
    ai_score: template.ai_score,
    ai_feedback: template.ai_feedback,
    image_url: coverAssetType === "image" ? coverUrl || fallbackImageUrl : fallbackImageUrl,
    video_url: coverAssetType === "video" ? coverUrl : null,
    cover_label: cover?.preview_text || cover?.file_name || null,
    created_at: template.created_at,
    original: template,
  };
}

function shortTemplateToUnified(template: ShortTemplateRow): UnifiedTemplate {
  const body = [
    template.hook ? `Hook:\n${template.hook}` : "",
    template.caption ? `Opis:\n${template.caption}` : "",
    template.script ? `Scenariusz:\n${template.script}` : "",
    template.ai_summary ? `AI:\n${template.ai_summary}` : "",
    template.hashtags?.length ? template.hashtags.join(" ") : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    id: template.id,
    source: "short_templates",
    kind: "short",
    title: template.title || template.thumbnail_text || "Szablon shorta",
    description: body,
    topic: template.title,
    content_type: "Short Studio / video template",
    platforms: template.platform ? [template.platform] : [],
    hashtags: safeArray(template.hashtags).length
      ? safeArray(template.hashtags)
      : extractHashtags(body),
    ai_score: null,
    ai_feedback: template.ai_summary,
    image_url: null,
    video_url: template.video_public_url || null,
    cover_label: template.thumbnail_text || template.title || template.video_storage_path,
    created_at: template.created_at,
    original: template,
  };
}

function makeTemplateBody(template: UnifiedTemplate) {
  const lines = [
    template.title,
    template.description,
    template.hashtags.length ? template.hashtags.join(" ") : "",
  ].filter(Boolean);

  return lines.join("\n\n");
}

function CardShell({ children, css }: { children: ReactNode; css: Record<string, string> }) {
  return (
    <div
      className="template-card"
      style={{
        borderRadius: 16,
        border: `1px solid ${css.border}`,
        background: css.bg,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minHeight: 360,
      }}
    >
      {children}
    </div>
  );
}

export default function Templates({
  dark = true,
  workspaceId,
  onOpenStudio,
  kind = "content",
}: {
  dark?: boolean;
  workspaceId: string;
  onOpenStudio: () => void;
  kind?: TemplateKind;
}) {
  const supabase = createClient();

  const [templates, setTemplates] = useState<UnifiedTemplate[]>([]);
  const [workspaceUuid, setWorkspaceUuid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [detailsOpen, setDetailsOpen] = useState<Record<string, boolean>>({});
  const [scheduleOpen, setScheduleOpen] = useState<Record<string, boolean>>({});
  const [scheduleDate, setScheduleDate] = useState<Record<string, string>>({});
  const [scheduleTime, setScheduleTime] = useState<Record<string, string>>({});

  const css = dark
    ? {
        bg: "#080c14",
        surface: "#0f1520",
        surfaceSoft: "#0b111c",
        text: "#eef2ff",
        muted: "#8190ad",
        border: "#151e30",
        accent: "#818cf8",
        aiBg: "#0C1117",
        aiBorder: "#1E3A4C",
        aiText: "#7DD3FC",
      }
    : {
        bg: "#f8f7f4",
        surface: "#ffffff",
        surfaceSoft: "#f4f6fb",
        text: "#0f172a",
        muted: "#64748b",
        border: "#e8e8e4",
        accent: "#6366f1",
        aiBg: "#F0F9FF",
        aiBorder: "#BAE6FD",
        aiText: "#0284C7",
      };

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadTemplates() {
      setLoading(true);
      setError("");

      try {
        const { data: ws, error: wsError } = await supabase
          .schema("contentiq")
          .from("workspaces")
          .select("id")
          .eq("slug", workspaceId)
          .maybeSingle();

        if (wsError) throw new Error(wsError.message);

        if (!ws?.id) {
          if (!cancelled) {
            setWorkspaceUuid(null);
            setTemplates([]);
          }
          return;
        }

        if (!cancelled) setWorkspaceUuid(ws.id as string);

        const { data: drafts, error: draftsError } = await supabase
          .schema("contentiq")
          .from("content_drafts")
          .select("id,title,body,topic,content_type,target_platforms,ai_score,ai_feedback,media,created_at")
          .eq("workspace_id", ws.id)
          .eq("status", "template")
          .order("created_at", { ascending: false });

        if (draftsError) throw new Error(draftsError.message);

        let shortTemplates: ShortTemplateRow[] = [];

        const shortResult = await supabase
          .schema("contentiq")
          .from("short_templates")
          .select("id,workspace_id,source_upload_id,title,platform,hook,caption,hashtags,script,on_screen_text,shots,thumbnail_text,ai_summary,video_storage_path,video_public_url,status,external_platform,external_post_id,external_post_url,published_at,created_at")
          .eq("workspace_id", ws.id)
          .eq("status", "template_ready")
          .order("created_at", { ascending: false });

        if (!shortResult.error) {
          shortTemplates = (shortResult.data || []) as ShortTemplateRow[];
        }

        const merged = [
          ...((drafts || []) as TemplateDraft[]).map(draftToUnified),
          ...shortTemplates.map(shortTemplateToUnified),
        ];

        if (!cancelled) setTemplates(merged);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, supabase]);

  const visibleTemplates = useMemo(() => {
    return templates.filter((template) => template.kind === kind);
  }, [templates, kind]);

  const grouped = useMemo(() => {
    return PLATFORMS.map((platform) => ({
      platform,
      items: visibleTemplates.filter((template) => platformMatches(template, platform.id)),
    }));
  }, [visibleTemplates]);

  function openInStudio(template: UnifiedTemplate) {
    localStorage.setItem(
      "ciq-content-template",
      JSON.stringify({
        ...template.original,
        source: template.source,
        kind: template.kind,
      })
    );
    onOpenStudio();
  }

  function toggleDetails(id: string) {
    setDetailsOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleSchedule(id: string) {
    setScheduleOpen((prev) => ({ ...prev, [id]: !prev[id] }));
    setScheduleDate((prev) => ({ ...prev, [id]: prev[id] || getTodayDate() }));
    setScheduleTime((prev) => ({ ...prev, [id]: prev[id] || getNextHourTime() }));
  }

  async function createScheduledDraft(template: UnifiedTemplate, platform: Platform) {
    if (!workspaceUuid) throw new Error("Brak workspace.");

    const body = makeTemplateBody(template);

    const { data: draft, error: draftErr } = await supabase
      .schema("contentiq")
      .from("content_drafts")
      .insert({
        workspace_id: workspaceUuid,
        title: template.title,
        body,
        topic: template.topic || template.title,
        content_type: template.content_type || `${kind} template`,
        target_platforms: [platform],
        ai_score: template.ai_score,
        ai_feedback: template.ai_feedback,
        status: "scheduled",
      })
      .select("id")
      .single();

    if (draftErr || !draft?.id) {
      throw new Error(draftErr?.message || "Nie udało się utworzyć zaplanowanego draftu.");
    }

    return draft.id as string;
  }

  async function getConnectionId(platform: Platform) {
    if (!workspaceUuid) throw new Error("Brak workspace.");

    const aliases = PLATFORM_ALIASES[platform];

    const { data: conn, error: connError } = await supabase
      .schema("contentiq")
      .from("platform_connections")
      .select("id")
      .eq("workspace_id", workspaceUuid)
      .in("platform", aliases)
      .eq("connected", true)
      .limit(1)
      .maybeSingle();

    if (connError) throw new Error(connError.message);
    if (!conn?.id) throw new Error(`Brak podłączonego konta dla ${platform}.`);

    return conn.id as string;
  }

  async function scheduleTemplate(template: UnifiedTemplate, platform: Platform, scheduledAt: string) {
    setActionLoadingId(`${template.source}:${template.id}:schedule`);

    try {
      const draftId = await createScheduledDraft(template, platform);
      const connectionId = await getConnectionId(platform);

      const { error: schedErr } = await supabase
        .schema("contentiq")
        .from("scheduled_posts")
        .insert({
          draft_id: draftId,
          connection_id: connectionId,
          platform,
          scheduled_at: scheduledAt,
          status: "scheduled",
        });

      if (schedErr) throw new Error(schedErr.message);

      showToast(`✓ Dodano do harmonogramu: ${new Date(scheduledAt).toLocaleString("pl-PL")}`);
    } catch (err) {
      showToast(`Błąd: ${err instanceof Error ? err.message : String(err)}`, "err");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function scheduleFromInputs(template: UnifiedTemplate, platform: Platform) {
    const date = scheduleDate[template.id] || getTodayDate();
    const time = scheduleTime[template.id] || getNextHourTime();
    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
    await scheduleTemplate(template, platform, scheduledAt);
  }

  async function publishNow(template: UnifiedTemplate, platform: Platform) {
    await scheduleTemplate(template, platform, new Date().toISOString());
  }

  function renderMiniature(template: UnifiedTemplate, platform: Platform) {
    const pColor = PLATFORMS.find((item) => item.id === platform)?.color || css.accent;

    if (template.image_url) {
      return <img src={template.image_url} alt="" style={{ width: "100%", height: 132, objectFit: "cover", display: "block" }} />;
    }

    if (template.video_url) {
      return <video src={template.video_url} muted preload="metadata" style={{ width: "100%", height: 132, objectFit: "cover", background: "#000", display: "block" }} />;
    }

    if (template.cover_label) {
      return (
        <div style={{ height: 132, background: `linear-gradient(135deg, ${pColor}20, ${css.aiBg})`, display: "flex", flexDirection: "column", justifyContent: "center", gap: 7, padding: 16, borderBottom: `1px solid ${css.border}` }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, background: `${pColor}22`, color: pColor, display: "grid", placeItems: "center", fontWeight: 900, fontSize: 12, border: `1px solid ${pColor}44` }}>
            {template.kind === "creative" ? "IMG" : "VID"}
          </div>
          <div style={{ color: css.text, fontSize: 12, fontWeight: 900, lineHeight: 1.35 }}>
            {getSummary(template.cover_label, 58)}
          </div>
          <div style={{ color: css.muted, fontSize: 10 }}>Okładka szablonu</div>
        </div>
      );
    }

    return (
      <div style={{ height: 132, background: `linear-gradient(135deg, ${pColor}26, ${css.aiBg})`, display: "grid", placeItems: "center", borderBottom: `1px solid ${css.border}` }}>
        <div style={{ width: 54, height: 54, borderRadius: 18, background: `${pColor}22`, color: pColor, display: "grid", placeItems: "center", fontWeight: 900, fontSize: 14, border: `1px solid ${pColor}44` }}>
          {template.kind.toUpperCase().slice(0, 2)}
        </div>
      </div>
    );
  }

  function TemplateCard({ template, platform }: { template: UnifiedTemplate; platform: Platform }) {
    const platformInfo = PLATFORMS.find((item) => item.id === platform) || PLATFORMS[0];
    const isDetailsOpen = Boolean(detailsOpen[template.id]);
    const isScheduleOpen = Boolean(scheduleOpen[template.id]);
    const loadingId = actionLoadingId || "";
    const isScheduling = loadingId === `${template.source}:${template.id}:schedule`;

    return (
      <CardShell css={css}>
        {renderMiniature(template, platform)}

        <div style={{ padding: 13, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 900, color: platformInfo.color, background: `${platformInfo.color}18`, padding: "4px 8px", borderRadius: 8 }}>
                {platformInfo.icon}
              </span>
              <span style={{ fontSize: 10, color: css.muted }}>{formatDate(template.created_at)}</span>
            </div>

            <h3 style={{ margin: 0, color: css.text, fontSize: 15, lineHeight: 1.35, fontWeight: 900 }}>{template.title}</h3>

            <div style={{ marginTop: 6, color: css.muted, fontSize: 11, lineHeight: 1.5 }}>
              {template.content_type || template.kind}
              {template.ai_score ? ` · AI ${template.ai_score}/100` : ""}
            </div>
          </div>

          {!isDetailsOpen && <p style={{ margin: 0, color: css.muted, fontSize: 12, lineHeight: 1.6 }}>{getSummary(template.description || "Brak opisu.", 170)}</p>}

          <button type="button" onClick={() => toggleDetails(template.id)} style={{ border: `1px solid ${css.border}`, borderRadius: 11, background: css.surface, color: css.text, padding: "9px 10px", fontSize: 11, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>
            {isDetailsOpen ? "Ukryj szczegóły" : "Pokaż szczegóły"}
          </button>

          {isDetailsOpen && (
            <div style={{ background: css.surface, border: `1px solid ${css.border}`, borderRadius: 12, padding: 11, display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, color: css.accent, textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 4 }}>Tytuł</div>
                <div style={{ fontSize: 13, color: css.text, fontWeight: 800, lineHeight: 1.45 }}>{template.title}</div>
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 900, color: css.accent, textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 4 }}>Hashtagi</div>
                {template.hashtags.length ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {template.hashtags.map((tag) => (
                      <span key={tag} style={{ color: platformInfo.color, background: `${platformInfo.color}18`, borderRadius: 999, padding: "4px 8px", fontSize: 10, fontWeight: 800 }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: css.muted }}>Brak hashtagów.</div>
                )}
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 900, color: css.accent, textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 4 }}>Opis</div>
                <p style={{ margin: 0, color: css.text, fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{template.description || "Brak opisu."}</p>
              </div>
            </div>
          )}

          <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button type="button" onClick={() => toggleSchedule(template.id)} style={{ borderRadius: 11, border: `1px solid ${css.aiBorder}`, background: css.aiBg, color: css.aiText, padding: "9px 10px", fontSize: 11, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>
              Dodaj do harmonogramu
            </button>

            <button type="button" onClick={() => publishNow(template, platform)} disabled={isScheduling} style={{ borderRadius: 11, border: "none", background: platformInfo.color, color: "#fff", padding: "9px 10px", fontSize: 11, fontWeight: 900, cursor: isScheduling ? "not-allowed" : "pointer", opacity: isScheduling ? 0.6 : 1, fontFamily: "inherit" }}>
              Udostępnij teraz
            </button>
          </div>

          {isScheduleOpen && (
            <div style={{ border: `1px solid ${css.border}`, background: css.surface, borderRadius: 12, padding: 10, display: "grid", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 10, color: css.muted, fontWeight: 800 }}>Data</span>
                  <input type="date" value={scheduleDate[template.id] || getTodayDate()} onChange={(event) => setScheduleDate((prev) => ({ ...prev, [template.id]: event.target.value }))} style={{ borderRadius: 10, border: `1px solid ${css.border}`, background: css.bg, color: css.text, padding: 9, fontSize: 12, fontFamily: "inherit" }} />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 10, color: css.muted, fontWeight: 800 }}>Godzina</span>
                  <input type="time" value={scheduleTime[template.id] || getNextHourTime()} onChange={(event) => setScheduleTime((prev) => ({ ...prev, [template.id]: event.target.value }))} style={{ borderRadius: 10, border: `1px solid ${css.border}`, background: css.bg, color: css.text, padding: 9, fontSize: 12, fontFamily: "inherit" }} />
                </label>
              </div>

              <button type="button" onClick={() => scheduleFromInputs(template, platform)} disabled={isScheduling} style={{ borderRadius: 10, border: "none", background: dark ? "#ffffff" : "#111111", color: dark ? "#050505" : "#ffffff", padding: "10px 12px", fontSize: 11, fontWeight: 900, cursor: isScheduling ? "not-allowed" : "pointer", opacity: isScheduling ? 0.6 : 1, fontFamily: "inherit" }}>
                {isScheduling ? "Dodaję..." : "Zapisz termin"}
              </button>
            </div>
          )}

          <button type="button" onClick={() => openInStudio(template)} style={{ border: `1px solid ${css.border}`, borderRadius: 11, background: "transparent", color: css.muted, padding: "8px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
            Otwórz w studio
          </button>
        </div>
      </CardShell>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans','Helvetica Neue',sans-serif", color: css.text }}>
      <style>{`
        .template-card {
          transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
        }
        .template-card:hover {
          transform: translateY(-2px);
          border-color: ${css.aiBorder};
          box-shadow: 0 16px 40px rgba(0,0,0,.18);
        }
        details summary::-webkit-details-marker { display:none; }
        .templates-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        @media(max-width: 1180px) {
          .templates-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media(max-width: 760px) {
          .templates-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 200, padding: "10px 16px", borderRadius: 12, background: toast.type === "ok" ? "#052e16" : "#450a0a", color: toast.type === "ok" ? "#22c55e" : "#fca5a5", border: `1px solid ${toast.type === "ok" ? "#166534" : "#991b1b"}`, fontSize: 13, fontWeight: 800, boxShadow: "0 18px 44px rgba(0,0,0,.35)" }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {loading && <div style={{ padding: 18, borderRadius: 14, background: css.surface, border: `1px solid ${css.border}`, color: css.muted, fontSize: 13 }}>Ładowanie szablonów...</div>}

        {error && <div style={{ padding: 18, borderRadius: 14, background: "#450a0a", border: "1px solid #991b1b", color: "#fca5a5", fontSize: 13 }}>{error}</div>}

        {!loading && !error && visibleTemplates.length === 0 && (
          <div style={{ padding: 18, borderRadius: 14, background: css.surface, border: `1px solid ${css.border}`, color: css.muted, fontSize: 13 }}>
            Nie ma jeszcze zapisanych szablonów dla tej sekcji. Zapisuj je z Content Studio, Short Studio, Video Studio albo Creative Studio.
          </div>
        )}

        {grouped.map(({ platform, items }) => (
          <details key={platform.id} open={items.length > 0} style={{ borderRadius: 16, background: css.surface, border: `1px solid ${css.border}`, overflow: "hidden" }}>
            <summary style={{ listStyle: "none", cursor: "pointer", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: platform.color, background: `${platform.color}18`, padding: "4px 8px", borderRadius: 8 }}>{platform.icon}</span>
                <span style={{ fontSize: 15, fontWeight: 900, color: css.text }}>{platform.name}</span>
              </div>

              <span style={{ fontSize: 11, color: css.muted }}>{items.length} szablonów</span>
            </summary>

            <div style={{ padding: "0 16px 16px" }}>
              {items.length === 0 && <div style={{ fontSize: 12, color: css.muted, padding: "4px 0 2px" }}>Brak szablonów dla tej platformy.</div>}

              {items.length > 0 && (
                <div className="templates-grid">
                  {items.map((template) => (
                    <TemplateCard key={`${template.source}-${template.id}-${platform.id}`} template={template} platform={platform.id} />
                  ))}
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
