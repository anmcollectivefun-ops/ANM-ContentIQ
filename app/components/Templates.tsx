"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Platform =
  | "linkedin"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "blog"
  | "spotify";

interface TemplateDraft {
  id: string;
  title: string | null;
  body: string | null;
  topic: string | null;
  content_type: string | null;
  target_platforms: string[] | null;
  ai_score: number | null;
  ai_feedback: string | null;
  created_at: string | null;
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

function safeArray(value: string[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

function formatDate(value: string | null) {
  if (!value) return "Brak daty";
  return new Date(value).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function Templates({
  dark = true,
  workspaceId,
  onOpenStudio,
}: {
  dark?: boolean;
  workspaceId: string;
  onOpenStudio: () => void;
}) {
  const supabase = createClient();
  const [templates, setTemplates] = useState<TemplateDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const css = dark
    ? {
        bg: "#080c14",
        surface: "#0f1520",
        text: "#eef2ff",
        muted: "#8190ad",
        border: "#151e30",
        accent: "#818cf8",
      }
    : {
        bg: "#f8f7f4",
        surface: "#ffffff",
        text: "#0f172a",
        muted: "#64748b",
        border: "#e8e8e4",
        accent: "#6366f1",
      };

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
          .single();

        if (wsError || !ws?.id) {
          if (!cancelled) setTemplates([]);
          return;
        }

        const { data, error: listError } = await supabase
          .schema("contentiq")
          .from("content_drafts")
          .select("id,title,body,topic,content_type,target_platforms,ai_score,ai_feedback,created_at")
          .eq("workspace_id", ws.id)
          .eq("status", "template")
          .order("created_at", { ascending: false });

        if (listError) throw new Error(listError.message);
        if (!cancelled) setTemplates((data || []) as TemplateDraft[]);
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
  }, [workspaceId]);

  const grouped = useMemo(() => {
    return PLATFORMS.map((platform) => ({
      platform,
      items: templates.filter((template) =>
        safeArray(template.target_platforms).includes(platform.id)
      ),
    }));
  }, [templates]);

  function openInStudio(template: TemplateDraft) {
    localStorage.setItem("ciq-content-template", JSON.stringify(template));
    onOpenStudio();
  }

  return (
    <div style={{ fontFamily: "'DM Sans','Helvetica Neue',sans-serif", color: css.text }}>
      <style>{`
        .template-row { transition: border-color .15s ease, transform .15s ease; }
        .template-row:hover { transform: translateY(-1px); }
        details summary::-webkit-details-marker { display:none; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {loading && (
          <div style={{ padding: 18, borderRadius: 14, background: css.surface, border: `1px solid ${css.border}`, color: css.muted, fontSize: 13 }}>
            Ładowanie szablonów...
          </div>
        )}

        {error && (
          <div style={{ padding: 18, borderRadius: 14, background: "#450a0a", border: "1px solid #991b1b", color: "#fca5a5", fontSize: 13 }}>
            {error}
          </div>
        )}

        {!loading && !error && templates.length === 0 && (
          <div style={{ padding: 18, borderRadius: 14, background: css.surface, border: `1px solid ${css.border}`, color: css.muted, fontSize: 13 }}>
            Nie ma jeszcze zapisanych szablonów. W Content Studio wygeneruj treść i kliknij “Zapisz szablon”.
          </div>
        )}

        {grouped.map(({ platform, items }) => (
          <details
            key={platform.id}
            open={items.length > 0}
            style={{
              borderRadius: 14,
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
                <span style={{ fontSize: 15, fontWeight: 800, color: css.text }}>
                  {platform.name}
                </span>
              </div>

              <span style={{ fontSize: 11, color: css.muted }}>
                {items.length} szablonów
              </span>
            </summary>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px 16px" }}>
              {items.length === 0 && (
                <div style={{ fontSize: 12, color: css.muted, padding: "4px 0 2px" }}>
                  Brak szablonów dla tej platformy.
                </div>
              )}

              {items.map((template) => (
                <div
                  key={template.id}
                  className="template-row"
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${css.border}`,
                    background: css.bg,
                    padding: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: css.text, marginBottom: 4 }}>
                        {template.title || "Szablon bez tytułu"}
                      </div>
                      <div style={{ fontSize: 11, color: css.muted }}>
                        {template.content_type || "Content"} · {formatDate(template.created_at)}
                        {template.ai_score ? ` · AI ${template.ai_score}/100` : ""}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openInStudio(template)}
                      style={{
                        border: "none",
                        borderRadius: 10,
                        background: platform.color,
                        color: "#fff",
                        padding: "8px 10px",
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Użyj
                    </button>
                  </div>

                  {template.body && (
                    <p style={{ margin: "9px 0 0", color: css.muted, fontSize: 12, lineHeight: 1.6 }}>
                      {template.body.slice(0, 220)}
                      {template.body.length > 220 ? "..." : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
