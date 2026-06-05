"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Platform =
  | "linkedin"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "blog"
  | "spotify";

type InspirationKind = "content" | "video" | "short" | "creative";

interface InspirationRow {
  id: string;
  workspace_id: string;
  source_kind: InspirationKind;
  source_studio: string | null;
  title: string | null;
  description: string | null;
  body: string | null;
  platforms: string[] | null;
  hashtags: string[] | null;
  image_url: string | null;
  ai_score: number | null;
  ai_feedback: string | null;
  status: string | null;
  created_at: string | null;
}

interface EditState {
  id: string;
  title: string;
  description: string;
  body: string;
  hashtagsText: string;
  image_url: string;
  platforms: string[];
}

const IMAGE_BUCKET = "contentiq-inspiration-images";

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
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
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

function getSummary(text: string, length = 180) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= length) return clean;
  return `${clean.slice(0, length).trim()}...`;
}

function parseHashtags(value: string) {
  return unique(
    value
      .split(/[\s,]+/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
  );
}

function extractHashtags(text: string | null | undefined) {
  if (!text) return [];
  return unique((text.match(/#[\p{L}\p{N}_-]+/gu) || []).slice(0, 32));
}

function platformMatches(item: InspirationRow, platform: Platform) {
  const targets = safeArray(item.platforms).map(normalizePlatform);
  return PLATFORM_ALIASES[platform].some((alias) => targets.includes(alias));
}

function makeTemplateBody(item: InspirationRow) {
  return [
    item.description || "",
    item.body || "",
    safeArray(item.hashtags).join(" "),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function makeDraftMedia(item: InspirationRow) {
  return item.image_url
    ? [
        {
          kind: "cover",
          asset_type: "image",
          public_url: item.image_url,
          url: item.image_url,
          preview_text: item.title || item.description || "Okładka inspiracji",
          source: item.source_studio || item.source_kind,
          status: "active",
        },
      ]
    : [];
}

function safeFileName(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  const extension = dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
  const base = dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName;

  return `${base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "inspiration"}${extension}`;
}

export default function Inspirations({
  dark = true,
  workspaceId,
  kind = "content",
  onOpenStudio,
}: {
  dark?: boolean;
  workspaceId: string;
  kind?: InspirationKind;
  onOpenStudio?: () => void;
}) {
  const supabase = createClient();

  const [workspaceUuid, setWorkspaceUuid] = useState<string | null>(null);
  const [items, setItems] = useState<InspirationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const [detailsOpen, setDetailsOpen] = useState<Record<string, boolean>>({});
  const [scheduleOpen, setScheduleOpen] = useState<Record<string, boolean>>({});
  const [scheduleDate, setScheduleDate] = useState<Record<string, string>>({});
  const [scheduleTime, setScheduleTime] = useState<Record<string, string>>({});
  const [editState, setEditState] = useState<EditState | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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

    async function loadInspirations() {
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
            setItems([]);
          }
          return;
        }

        if (!cancelled) setWorkspaceUuid(ws.id as string);

        const { data, error: listError } = await supabase
          .schema("contentiq")
          .from("inspirations")
          .select("id,workspace_id,source_kind,source_studio,title,description,body,platforms,hashtags,image_url,ai_score,ai_feedback,status,created_at")
          .eq("workspace_id", ws.id)
          .eq("source_kind", kind)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (listError) throw new Error(listError.message);

        if (!cancelled) setItems((data || []) as InspirationRow[]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInspirations();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, kind, supabase]);

  const grouped = useMemo(() => {
    return PLATFORMS.map((platform) => ({
      platform,
      items: items.filter((item) => platformMatches(item, platform.id)),
    }));
  }, [items]);

  async function getCurrentUserId() {
    const { data: auth, error: authError } = await supabase.auth.getUser();

    if (authError) throw new Error(authError.message);
    if (!auth.user) throw new Error("Brak aktywnej sesji.");

    return auth.user.id;
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

  function toggleDetails(id: string) {
    setDetailsOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleSchedule(id: string) {
    setScheduleOpen((prev) => ({ ...prev, [id]: !prev[id] }));
    setScheduleDate((prev) => ({ ...prev, [id]: prev[id] || getTodayDate() }));
    setScheduleTime((prev) => ({ ...prev, [id]: prev[id] || getNextHourTime() }));
  }

  function openEdit(item: InspirationRow) {
    setEditState({
      id: item.id,
      title: item.title || "",
      description: item.description || "",
      body: item.body || "",
      hashtagsText: safeArray(item.hashtags).join(" "),
      image_url: item.image_url || "",
      platforms: safeArray(item.platforms),
    });
  }

  async function uploadImage(file: File) {
    if (!workspaceUuid || !editState) return;

    setUploadingImage(true);

    try {
      const userId = await getCurrentUserId();
      const path = `${userId}/${workspaceUuid}/${Date.now()}-${safeFileName(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);

      setEditState((prev) =>
        prev
          ? {
              ...prev,
              image_url: data.publicUrl,
            }
          : prev
      );

      showToast("✓ Dodano zdjęcie");
    } catch (err) {
      showToast(`Błąd zdjęcia: ${err instanceof Error ? err.message : String(err)}`, "err");
    } finally {
      setUploadingImage(false);
    }
  }

  async function saveEdit() {
    if (!editState) return;

    setActionLoadingId(`${editState.id}:edit`);

    try {
      const hashtags = parseHashtags(editState.hashtagsText);

      const { error: updateError } = await supabase
        .schema("contentiq")
        .from("inspirations")
        .update({
          title: editState.title,
          description: editState.description,
          body: editState.body,
          hashtags,
          image_url: editState.image_url || null,
          platforms: editState.platforms,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editState.id);

      if (updateError) throw new Error(updateError.message);

      setItems((prev) =>
        prev.map((item) =>
          item.id === editState.id
            ? {
                ...item,
                title: editState.title,
                description: editState.description,
                body: editState.body,
                hashtags,
                image_url: editState.image_url || null,
                platforms: editState.platforms,
              }
            : item
        )
      );

      setEditState(null);
      showToast("✓ Zapisano zmiany");
    } catch (err) {
      showToast(`Błąd edycji: ${err instanceof Error ? err.message : String(err)}`, "err");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function deleteInspiration(item: InspirationRow) {
    const confirmed = window.confirm("Usunąć tę inspirację z bazy?");
    if (!confirmed) return;

    setActionLoadingId(`${item.id}:delete`);

    try {
      const { error: deleteError } = await supabase
        .schema("contentiq")
        .from("inspirations")
        .delete()
        .eq("id", item.id);

      if (deleteError) throw new Error(deleteError.message);

      setItems((prev) => prev.filter((row) => row.id !== item.id));
      showToast("✓ Usunięto inspirację z bazy");
    } catch (err) {
      showToast(`Błąd usuwania: ${err instanceof Error ? err.message : String(err)}`, "err");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function addAsTemplate(item: InspirationRow, platform: Platform) {
    if (!workspaceUuid) return;

    setActionLoadingId(`${item.id}:template`);

    try {
      const body = makeTemplateBody(item);

      const { error: insertError } = await supabase
        .schema("contentiq")
        .from("content_drafts")
        .insert({
          workspace_id: workspaceUuid,
          title: item.title || "Szablon z inspiracji",
          body,
          topic: item.title,
          content_type: `${item.source_studio || item.source_kind} / inspiration template`,
          target_platforms: [platform],
          ai_score: item.ai_score,
          ai_feedback: item.ai_feedback,
          status: "template",
          media: makeDraftMedia(item),
        });

      if (insertError) throw new Error(insertError.message);

      showToast("✓ Dodano inspirację jako szablon");
    } catch (err) {
      showToast(`Błąd szablonu: ${err instanceof Error ? err.message : String(err)}`, "err");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function createScheduledDraft(item: InspirationRow, platform: Platform) {
    if (!workspaceUuid) throw new Error("Brak workspace.");

    const body = makeTemplateBody(item);

    const { data: draft, error: draftErr } = await supabase
      .schema("contentiq")
      .from("content_drafts")
      .insert({
        workspace_id: workspaceUuid,
        title: item.title || "Inspiracja do publikacji",
        body,
        topic: item.title,
        content_type: `${item.source_studio || item.source_kind} / inspiration`,
        target_platforms: [platform],
        ai_score: item.ai_score,
        ai_feedback: item.ai_feedback,
        status: "scheduled",
        media: makeDraftMedia(item),
      })
      .select("id")
      .single();

    if (draftErr || !draft?.id) {
      throw new Error(draftErr?.message || "Nie udało się utworzyć draftu.");
    }

    return draft.id as string;
  }

  async function scheduleInspiration(item: InspirationRow, platform: Platform, scheduledAt: string) {
    setActionLoadingId(`${item.id}:schedule`);

    try {
      const draftId = await createScheduledDraft(item, platform);
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
      showToast(`Błąd harmonogramu: ${err instanceof Error ? err.message : String(err)}`, "err");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function scheduleFromInputs(item: InspirationRow, platform: Platform) {
    const date = scheduleDate[item.id] || getTodayDate();
    const time = scheduleTime[item.id] || getNextHourTime();
    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

    await scheduleInspiration(item, platform, scheduledAt);
  }

  async function publishNow(item: InspirationRow, platform: Platform) {
    await scheduleInspiration(item, platform, new Date().toISOString());
  }

  function printInspiration(item: InspirationRow) {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      showToast("Nie udało się otworzyć okna drukowania.", "err");
      return;
    }

    const title = item.title || "Inspiracja";
    const body = makeTemplateBody(item).replace(/</g, "&lt;").replace(/>/g, "&gt;");

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; line-height: 1.55; color: #111827; }
            h1 { margin: 0 0 16px; font-size: 28px; }
            img { max-width: 100%; border-radius: 12px; margin: 0 0 20px; }
            pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; }
            .meta { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          </style>
        </head>
        <body>
          ${item.image_url ? `<img src="${item.image_url}" alt="">` : ""}
          <h1>${title}</h1>
          <div class="meta">${item.source_studio || item.source_kind} • ${safeArray(item.platforms).join(", ")}</div>
          <pre>${body}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function openInStudio(item: InspirationRow) {
    localStorage.setItem(
      "ciq-inspiration-edit",
      JSON.stringify({
        id: item.id,
        source_kind: item.source_kind,
        source_studio: item.source_studio,
        title: item.title,
        description: item.description,
        body: item.body,
        platforms: item.platforms,
        hashtags: item.hashtags,
        image_url: item.image_url,
      })
    );

    onOpenStudio?.();
  }

  function renderMiniature(item: InspirationRow, platform: Platform) {
    const platformInfo = PLATFORMS.find((p) => p.id === platform) || PLATFORMS[0];

    if (item.image_url) {
      return (
        <img
          src={item.image_url}
          alt=""
          style={{
            width: "100%",
            height: 132,
            objectFit: "cover",
            display: "block",
          }}
        />
      );
    }

    return (
      <div
        style={{
          height: 132,
          background: `linear-gradient(135deg, ${platformInfo.color}26, ${css.aiBg})`,
          display: "grid",
          placeItems: "center",
          borderBottom: `1px solid ${css.border}`,
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 18,
            background: `${platformInfo.color}22`,
            color: platformInfo.color,
            display: "grid",
            placeItems: "center",
            fontWeight: 900,
            fontSize: 14,
            border: `1px solid ${platformInfo.color}44`,
          }}
        >
          {item.source_kind.toUpperCase().slice(0, 2)}
        </div>
      </div>
    );
  }

  function InspirationCard({
    item,
    platform,
  }: {
    item: InspirationRow;
    platform: Platform;
  }) {
    const platformInfo = PLATFORMS.find((p) => p.id === platform) || PLATFORMS[0];
    const isDetailsOpen = Boolean(detailsOpen[item.id]);
    const isScheduleOpen = Boolean(scheduleOpen[item.id]);
    const isBusy = Boolean(actionLoadingId?.startsWith(`${item.id}:`));

    const hashtags = safeArray(item.hashtags).length
      ? safeArray(item.hashtags)
      : extractHashtags(`${item.description || ""}\n${item.body || ""}`);

    return (
      <div
        className="inspiration-card"
        style={{
          borderRadius: 16,
          border: `1px solid ${css.border}`,
          background: css.bg,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 390,
        }}
      >
        {renderMiniature(item, platform)}

        <div style={{ padding: 13, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  color: platformInfo.color,
                  background: `${platformInfo.color}18`,
                  padding: "4px 8px",
                  borderRadius: 8,
                }}
              >
                {platformInfo.icon}
              </span>

              <span style={{ fontSize: 10, color: css.muted }}>
                {formatDate(item.created_at)}
              </span>
            </div>

            <h3 style={{ margin: 0, color: css.text, fontSize: 15, lineHeight: 1.35, fontWeight: 900 }}>
              {item.title || "Inspiracja bez tytułu"}
            </h3>

            <div style={{ marginTop: 6, color: css.muted, fontSize: 11, lineHeight: 1.5 }}>
              {item.source_studio || item.source_kind}
              {item.ai_score ? ` · AI ${item.ai_score}/100` : ""}
            </div>
          </div>

          {!isDetailsOpen && (
            <p style={{ margin: 0, color: css.muted, fontSize: 12, lineHeight: 1.6 }}>
              {getSummary(item.description || item.body || "Brak opisu.", 170)}
            </p>
          )}

          <button
            type="button"
            onClick={() => toggleDetails(item.id)}
            style={{
              border: `1px solid ${css.border}`,
              borderRadius: 11,
              background: css.surface,
              color: css.text,
              padding: "9px 10px",
              fontSize: 11,
              fontWeight: 900,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {isDetailsOpen ? "Ukryj szczegóły" : "Pokaż szczegóły"}
          </button>

          {isDetailsOpen && (
            <div
              style={{
                background: css.surface,
                border: `1px solid ${css.border}`,
                borderRadius: 12,
                padding: 11,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, color: css.accent, textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 4 }}>
                  Tytuł
                </div>
                <div style={{ fontSize: 13, color: css.text, fontWeight: 800, lineHeight: 1.45 }}>
                  {item.title || "Inspiracja bez tytułu"}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 900, color: css.accent, textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 4 }}>
                  Hashtagi
                </div>

                {hashtags.length ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {hashtags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          color: platformInfo.color,
                          background: `${platformInfo.color}18`,
                          borderRadius: 999,
                          padding: "4px 8px",
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: css.muted }}>Brak hashtagów.</div>
                )}
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 900, color: css.accent, textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 4 }}>
                  Opis
                </div>
                <p style={{ margin: 0, color: css.text, fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {[item.description, item.body].filter(Boolean).join("\n\n") || "Brak opisu."}
                </p>
              </div>
            </div>
          )}

          <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              type="button"
              onClick={() => addAsTemplate(item, platform)}
              disabled={isBusy}
              style={{
                borderRadius: 11,
                border: `1px solid ${css.aiBorder}`,
                background: css.aiBg,
                color: css.aiText,
                padding: "9px 10px",
                fontSize: 11,
                fontWeight: 900,
                cursor: isBusy ? "not-allowed" : "pointer",
                opacity: isBusy ? 0.6 : 1,
                fontFamily: "inherit",
              }}
            >
              Dodaj jako szablon
            </button>

            <button
              type="button"
              onClick={() => toggleSchedule(item.id)}
              style={{
                borderRadius: 11,
                border: `1px solid ${css.border}`,
                background: css.surface,
                color: css.text,
                padding: "9px 10px",
                fontSize: 11,
                fontWeight: 900,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Harmonogram
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
            <button
              type="button"
              onClick={() => publishNow(item, platform)}
              disabled={isBusy}
              style={{
                borderRadius: 11,
                border: "none",
                background: platformInfo.color,
                color: "#fff",
                padding: "9px 10px",
                fontSize: 11,
                fontWeight: 900,
                cursor: isBusy ? "not-allowed" : "pointer",
                opacity: isBusy ? 0.6 : 1,
                fontFamily: "inherit",
              }}
            >
              Publikuj teraz
            </button>

            <button
              type="button"
              onClick={() => openEdit(item)}
              disabled={isBusy}
              style={{
                borderRadius: 11,
                border: `1px solid ${css.border}`,
                background: "transparent",
                color: css.muted,
                padding: "9px 10px",
                fontSize: 11,
                fontWeight: 900,
                cursor: isBusy ? "not-allowed" : "pointer",
                opacity: isBusy ? 0.6 : 1,
                fontFamily: "inherit",
              }}
            >
              Edytuj
            </button>

            <button
              type="button"
              onClick={() => printInspiration(item)}
              disabled={isBusy}
              style={{
                borderRadius: 11,
                border: `1px solid ${css.border}`,
                background: "transparent",
                color: css.muted,
                padding: "9px 10px",
                fontSize: 11,
                fontWeight: 900,
                cursor: isBusy ? "not-allowed" : "pointer",
                opacity: isBusy ? 0.6 : 1,
                fontFamily: "inherit",
              }}
            >
              Drukuj
            </button>

            <button
              type="button"
              onClick={() => deleteInspiration(item)}
              disabled={isBusy}
              style={{
                borderRadius: 11,
                border: "1px solid #ef444460",
                background: "#ef444414",
                color: "#ef4444",
                padding: "9px 10px",
                fontSize: 11,
                fontWeight: 900,
                cursor: isBusy ? "not-allowed" : "pointer",
                opacity: isBusy ? 0.6 : 1,
                fontFamily: "inherit",
              }}
            >
              Usuń
            </button>
          </div>

          {isScheduleOpen && (
            <div style={{ border: `1px solid ${css.border}`, background: css.surface, borderRadius: 12, padding: 10, display: "grid", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 10, color: css.muted, fontWeight: 800 }}>Data</span>
                  <input
                    type="date"
                    value={scheduleDate[item.id] || getTodayDate()}
                    onChange={(event) =>
                      setScheduleDate((prev) => ({ ...prev, [item.id]: event.target.value }))
                    }
                    style={{
                      borderRadius: 10,
                      border: `1px solid ${css.border}`,
                      background: css.bg,
                      color: css.text,
                      padding: 9,
                      fontSize: 12,
                      fontFamily: "inherit",
                    }}
                  />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 10, color: css.muted, fontWeight: 800 }}>Godzina</span>
                  <input
                    type="time"
                    value={scheduleTime[item.id] || getNextHourTime()}
                    onChange={(event) =>
                      setScheduleTime((prev) => ({ ...prev, [item.id]: event.target.value }))
                    }
                    style={{
                      borderRadius: 10,
                      border: `1px solid ${css.border}`,
                      background: css.bg,
                      color: css.text,
                      padding: 9,
                      fontSize: 12,
                      fontFamily: "inherit",
                    }}
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => scheduleFromInputs(item, platform)}
                disabled={isBusy}
                style={{
                  borderRadius: 10,
                  border: "none",
                  background: dark ? "#ffffff" : "#111111",
                  color: dark ? "#050505" : "#ffffff",
                  padding: "10px 12px",
                  fontSize: 11,
                  fontWeight: 900,
                  cursor: isBusy ? "not-allowed" : "pointer",
                  opacity: isBusy ? 0.6 : 1,
                  fontFamily: "inherit",
                }}
              >
                Zapisz termin
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => openInStudio(item)}
            style={{
              border: `1px solid ${css.border}`,
              borderRadius: 11,
              background: "transparent",
              color: css.muted,
              padding: "8px 10px",
              fontSize: 11,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Otwórz w studio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans','Helvetica Neue',sans-serif", color: css.text }}>
      <style>{`
        .inspiration-card {
          transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
        }
        .inspiration-card:hover {
          transform: translateY(-2px);
          border-color: ${css.aiBorder};
          box-shadow: 0 16px 40px rgba(0,0,0,.18);
        }
        details summary::-webkit-details-marker { display:none; }
        .inspiration-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        @media(max-width: 1180px) {
          .inspiration-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media(max-width: 760px) {
          .inspiration-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 200,
            padding: "10px 16px",
            borderRadius: 12,
            background: toast.type === "ok" ? "#052e16" : "#450a0a",
            color: toast.type === "ok" ? "#22c55e" : "#fca5a5",
            border: `1px solid ${toast.type === "ok" ? "#166534" : "#991b1b"}`,
            fontSize: 13,
            fontWeight: 800,
            boxShadow: "0 18px 44px rgba(0,0,0,.35)",
          }}
        >
          {toast.msg}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {loading && (
          <div style={{ padding: 18, borderRadius: 14, background: css.surface, border: `1px solid ${css.border}`, color: css.muted, fontSize: 13 }}>
            Ładowanie inspiracji...
          </div>
        )}

        {error && (
          <div style={{ padding: 18, borderRadius: 14, background: "#450a0a", border: "1px solid #991b1b", color: "#fca5a5", fontSize: 13 }}>
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div style={{ padding: 18, borderRadius: 14, background: css.surface, border: `1px solid ${css.border}`, color: css.muted, fontSize: 13 }}>
            Nie ma jeszcze inspiracji w tej sekcji. Propozycje wygenerowane w Content Studio, Short Studio, Video Studio i Creative Studio zapisuj tutaj jako inspiracje.
          </div>
        )}

        {grouped.map(({ platform, items: platformItems }) => (
          <details
            key={platform.id}
            open={platformItems.length > 0}
            style={{
              borderRadius: 16,
              background: css.surface,
              border: `1px solid ${css.border}`,
              overflow: "hidden",
            }}
          >
            <summary
              style={{
                listStyle: "none",
                cursor: "pointer",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 900,
                    color: platform.color,
                    background: `${platform.color}18`,
                    padding: "4px 8px",
                    borderRadius: 8,
                  }}
                >
                  {platform.icon}
                </span>
                <span style={{ fontSize: 15, fontWeight: 900, color: css.text }}>
                  {platform.name}
                </span>
              </div>

              <span style={{ fontSize: 11, color: css.muted }}>
                {platformItems.length} inspiracji
              </span>
            </summary>

            <div style={{ padding: "0 16px 16px" }}>
              {platformItems.length === 0 && (
                <div style={{ fontSize: 12, color: css.muted, padding: "4px 0 2px" }}>
                  Brak inspiracji dla tej platformy.
                </div>
              )}

              {platformItems.length > 0 && (
                <div className="inspiration-grid">
                  {platformItems.map((item) => (
                    <InspirationCard
                      key={`${item.id}-${platform.id}`}
                      item={item}
                      platform={platform.id}
                    />
                  ))}
                </div>
              )}
            </div>
          </details>
        ))}
      </div>

      {editState && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(0,0,0,.64)",
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "min(760px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: css.surface,
              border: `1px solid ${css.border}`,
              borderRadius: 18,
              padding: 18,
              boxShadow: "0 24px 70px rgba(0,0,0,.35)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, color: css.aiText, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>
                  Edycja inspiracji
                </div>
                <h3 style={{ margin: 0, color: css.text, fontSize: 22 }}>
                  Zmień treść, hashtagi i zdjęcie
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setEditState(null)}
                style={{
                  border: `1px solid ${css.border}`,
                  background: css.bg,
                  color: css.text,
                  borderRadius: 10,
                  padding: "8px 10px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 900,
                }}
              >
                Zamknij
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, color: css.muted, fontWeight: 900 }}>Tytuł</span>
                <input
                  value={editState.title}
                  onChange={(event) =>
                    setEditState((prev) => (prev ? { ...prev, title: event.target.value } : prev))
                  }
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${css.border}`,
                    background: css.bg,
                    color: css.text,
                    padding: 11,
                    fontFamily: "inherit",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, color: css.muted, fontWeight: 900 }}>Krótki opis</span>
                <textarea
                  value={editState.description}
                  onChange={(event) =>
                    setEditState((prev) => (prev ? { ...prev, description: event.target.value } : prev))
                  }
                  style={{
                    minHeight: 90,
                    borderRadius: 12,
                    border: `1px solid ${css.border}`,
                    background: css.bg,
                    color: css.text,
                    padding: 11,
                    fontFamily: "inherit",
                    lineHeight: 1.6,
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, color: css.muted, fontWeight: 900 }}>Pełna treść / scenariusz</span>
                <textarea
                  value={editState.body}
                  onChange={(event) =>
                    setEditState((prev) => (prev ? { ...prev, body: event.target.value } : prev))
                  }
                  style={{
                    minHeight: 160,
                    borderRadius: 12,
                    border: `1px solid ${css.border}`,
                    background: css.bg,
                    color: css.text,
                    padding: 11,
                    fontFamily: "inherit",
                    lineHeight: 1.6,
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, color: css.muted, fontWeight: 900 }}>Hashtagi</span>
                <input
                  value={editState.hashtagsText}
                  onChange={(event) =>
                    setEditState((prev) => (prev ? { ...prev, hashtagsText: event.target.value } : prev))
                  }
                  placeholder="#content #ai #marketing"
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${css.border}`,
                    background: css.bg,
                    color: css.text,
                    padding: 11,
                    fontFamily: "inherit",
                  }}
                />
              </label>

              <div style={{ display: "grid", gap: 8 }}>
                <span style={{ fontSize: 11, color: css.muted, fontWeight: 900 }}>Platformy</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {PLATFORMS.map((platform) => {
                    const active = editState.platforms.includes(platform.id);

                    return (
                      <button
                        key={platform.id}
                        type="button"
                        onClick={() =>
                          setEditState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  platforms: active
                                    ? prev.platforms.filter((item) => item !== platform.id)
                                    : [...prev.platforms, platform.id],
                                }
                              : prev
                          )
                        }
                        style={{
                          borderRadius: 10,
                          border: `1px solid ${active ? platform.color : css.border}`,
                          background: active ? `${platform.color}18` : css.bg,
                          color: active ? platform.color : css.muted,
                          padding: "8px 10px",
                          fontSize: 11,
                          fontWeight: 900,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        {platform.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <span style={{ fontSize: 11, color: css.muted, fontWeight: 900 }}>Zdjęcie / miniatura</span>

                {editState.image_url && (
                  <img
                    src={editState.image_url}
                    alt=""
                    style={{
                      width: "100%",
                      maxHeight: 220,
                      objectFit: "cover",
                      borderRadius: 12,
                      border: `1px solid ${css.border}`,
                    }}
                  />
                )}

                <input
                  value={editState.image_url}
                  onChange={(event) =>
                    setEditState((prev) => (prev ? { ...prev, image_url: event.target.value } : prev))
                  }
                  placeholder="URL zdjęcia"
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${css.border}`,
                    background: css.bg,
                    color: css.text,
                    padding: 11,
                    fontFamily: "inherit",
                  }}
                />

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadImage(file);
                  }}
                  style={{
                    borderRadius: 12,
                    border: `1px dashed ${css.border}`,
                    background: css.bg,
                    color: css.text,
                    padding: 11,
                    fontFamily: "inherit",
                  }}
                />

                {uploadingImage && (
                  <div style={{ color: css.muted, fontSize: 12 }}>Uploaduję zdjęcie...</div>
                )}
              </div>

              <button
                type="button"
                onClick={saveEdit}
                disabled={actionLoadingId === `${editState.id}:edit`}
                style={{
                  border: "none",
                  borderRadius: 12,
                  background: dark ? "#ffffff" : "#111111",
                  color: dark ? "#050505" : "#ffffff",
                  padding: "12px 14px",
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: actionLoadingId === `${editState.id}:edit` ? "not-allowed" : "pointer",
                  opacity: actionLoadingId === `${editState.id}:edit` ? 0.6 : 1,
                  fontFamily: "inherit",
                }}
              >
                Zapisz zmiany
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
