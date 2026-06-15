"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, Copy, Edit3, FileText, Image as ImageIcon, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useContentIQLanguage } from "@/lib/contentiq-language";

type SourceKind = "inspiration" | "draft" | "template" | "manual";
type ScheduleStatus = "planned" | "published" | "missed" | "cancelled";

type BlogInspiration = {
  id: string;
  title: string | null;
  description: string | null;
  body: string | null;
  platforms: string[] | null;
  hashtags: string[] | null;
  ai_score: number | null;
  ai_feedback: string | null;
  created_at: string | null;
};

type BlogDraft = {
  id: string;
  title: string | null;
  body: string | null;
  topic: string | null;
  content_type: string | null;
  target_platforms: string[] | null;
  ai_score: number | null;
  ai_feedback: string | null;
  status: string | null;
  media: unknown;
  created_at: string | null;
  updated_at?: string | null;
};

type BlogScheduleItem = {
  id: string;
  workspace_id: string;
  source_kind: SourceKind;
  source_id: string | null;
  title: string;
  body: string | null;
  image_url: string | null;
  scheduled_at: string;
  status: ScheduleStatus;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type EditorState = {
  open: boolean;
  sourceKind: SourceKind;
  sourceId?: string;
  title: string;
  body: string;
  notes: string;
  imageUrl: string;
  date: string;
  time: string;
};

type LocalImage = { file: File; previewUrl: string };

const STORAGE_BUCKET = "content-temp-media";
const EMPTY_EDITOR: EditorState = { open: false, sourceKind: "manual", title: "", body: "", notes: "", imageUrl: "", date: "", time: "09:00" };

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => String(v || "").trim()).filter(Boolean) : [];
}
function includesBlog(value: unknown) {
  return asArray(value).some((v) => v.toLowerCase() === "blog");
}
function looksBlog(...values: unknown[]) {
  const text = values.map((v) => String(v || "").toLowerCase()).join(" ");
  return text.includes("blog") || text.includes("artykuł") || text.includes("wpis") || text.includes("article");
}
function dateFromIso(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}
function timeFromIso(value?: string | null) {
  if (!value) return "09:00";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "09:00";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function makeIso(date: string, time: string) {
  if (!date) return "";
  return new Date(`${date}T${time || "09:00"}:00`).toISOString();
}
function fmt(value?: string | null) {
  if (!value) return "Brak daty";
  try {
    return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch { return value; }
}
function fmtDay(value?: string | null) {
  if (!value) return "Brak daty";
  try {
    return new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "2-digit", month: "long" }).format(new Date(value));
  } catch { return value; }
}
function safeFileName(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9._-]/g, "").slice(0, 100);
}
function getDraftImageUrl(draft: BlogDraft) {
  if (!Array.isArray(draft.media)) return "";
  const first = draft.media.find((m: any) => m?.asset_type === "image" || m?.kind === "cover") as any;
  return first?.public_url || first?.url || first?.image_url || "";
}
function getScoreColor(score?: number | null) {
  const s = Number(score || 0);
  if (s >= 80) return "#22c55e";
  if (s >= 60) return "#f59e0b";
  if (s > 0) return "#ef4444";
  return "#94a3b8";
}
function Label({ children, color }: { children: React.ReactNode; color: string }) {
  return <div style={{ color, fontFamily: "var(--font-label)", fontSize: 11, fontWeight: 900, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8 }}>{children}</div>;
}

export default function BlogLibrary({ dark = true, workspaceId = "contentiq" }: { dark?: boolean; workspaceId?: string }) {
  const { text } = useContentIQLanguage();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const css = dark ? {
    bg: "#1A2233", surface: "#050505", surfaceSoft: "#0B0B0D", text: "#FFFFFF", muted: "#C9CED8", border: "rgba(255,255,255,0.10)", accent: "#8E443D", accentSoft: "rgba(142,68,61,.18)", accentBorder: "rgba(142,68,61,.55)", heading: "#8E443D", aiText: "#D8B4FE", aiBorder: "rgba(192,132,252,.55)", aiBg: "rgba(109,40,217,.16)", aiGlow: "0 0 28px rgba(168,85,247,.24)"
  } : {
    bg: "#FFFFFF", surface: "#B5937A", surfaceSoft: "#F7F2EF", text: "#231F20", muted: "#5F5A57", border: "rgba(35,31,32,0.14)", accent: "#231F20", accentSoft: "rgba(181,147,122,.22)", accentBorder: "rgba(35,31,32,.24)", heading: "#231F20", aiText: "#6D28D9", aiBorder: "rgba(124,58,237,.34)", aiBg: "rgba(124,58,237,.10)", aiGlow: "0 0 26px rgba(124,58,237,.16)"
  };

  const [workspaceUuid, setWorkspaceUuid] = useState("");
  const [inspirations, setInspirations] = useState<BlogInspiration[]>([]);
  const [drafts, setDrafts] = useState<BlogDraft[]>([]);
  const [schedules, setSchedules] = useState<BlogScheduleItem[]>([]);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);
  const [localImage, setLocalImage] = useState<LocalImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const draftsOnly = useMemo(() => drafts.filter((d) => ["draft", "blog_draft", "in_progress", null, undefined].includes(d.status as any)), [drafts]);
  const templatesOnly = useMemo(() => drafts.filter((d) => ["template", "ready", "published_ready"].includes(d.status || "")), [drafts]);
  const scheduleGroups = useMemo(() => {
    const map = new Map<string, BlogScheduleItem[]>();
    [...schedules].sort((a,b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()).forEach((item) => {
      const key = dateFromIso(item.scheduled_at) || "bez-daty";
      map.set(key, [...(map.get(key) || []), item]);
    });
    return Array.from(map.entries());
  }, [schedules]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }
  async function getCurrentUserId() {
    const { data: auth, error } = await supabase.auth.getUser();
    if (error) throw new Error(error.message);
    if (!auth.user) throw new Error("Brak aktywnej sesji.");
    return auth.user.id;
  }
  async function getOrCreateWorkspaceUuid() {
    const { data: existing, error } = await supabase.schema("contentiq").from("workspaces").select("id").eq("slug", workspaceId).maybeSingle();
    if (error) throw new Error(error.message);
    if (existing?.id) { setWorkspaceUuid(existing.id as string); return existing.id as string; }
    const userId = await getCurrentUserId();
    const { data: created, error: createError } = await supabase.schema("contentiq").from("workspaces").insert({ user_id: userId, name: "ANM ContentIQ", type: "Content", slug: workspaceId }).select("id").single();
    if (createError || !created?.id) throw new Error(createError?.message || "Nie udało się utworzyć workspace.");
    setWorkspaceUuid(created.id as string);
    return created.id as string;
  }

  async function load() {
    setLoading(true); setError("");
    try {
      const wsId = await getOrCreateWorkspaceUuid();
      const [ins, dr, sch] = await Promise.all([
        supabase.schema("contentiq").from("inspirations").select("id,title,description,body,platforms,hashtags,ai_score,ai_feedback,created_at").eq("workspace_id", wsId).order("created_at", { ascending: false }).limit(200),
        supabase.schema("contentiq").from("content_drafts").select("id,title,body,topic,content_type,target_platforms,ai_score,ai_feedback,status,media,created_at,updated_at").eq("workspace_id", wsId).order("created_at", { ascending: false }).limit(200),
        supabase.schema("contentiq").from("blog_schedule").select("*").eq("workspace_id", wsId).order("scheduled_at", { ascending: true }).limit(200),
      ]);
      if (ins.error) throw new Error(ins.error.message);
      if (dr.error) throw new Error(dr.error.message);
      if (sch.error) throw new Error(sch.error.message);
      setInspirations(((ins.data || []) as BlogInspiration[]).filter((i) => includesBlog(i.platforms) || looksBlog(i.title, i.description, i.body, i.ai_feedback)));
      setDrafts(((dr.data || []) as BlogDraft[]).filter((d) => includesBlog(d.target_platforms) || looksBlog(d.title, d.topic, d.content_type, d.body)));
      setSchedules((sch.data || []) as BlogScheduleItem[]);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [workspaceId]);
  useEffect(() => () => { if (localImage) URL.revokeObjectURL(localImage.previewUrl); }, [localImage]);

  function openEditorFromInspiration(item: BlogInspiration) {
    setLocalImage(null); setEditor({ open: true, sourceKind: "inspiration", sourceId: item.id, title: item.title || "Inspiracja blogowa", body: item.body || item.description || "", notes: item.ai_feedback || "", imageUrl: "", date: "", time: "09:00" });
  }
  function openEditorFromDraft(item: BlogDraft) {
    setLocalImage(null); setEditor({ open: true, sourceKind: item.status === "template" ? "template" : "draft", sourceId: item.id, title: item.title || item.topic || "Szkic blogowy", body: item.body || "", notes: item.ai_feedback || "", imageUrl: getDraftImageUrl(item), date: "", time: "09:00" });
  }
  function openEditorFromSchedule(item: BlogScheduleItem) {
    setLocalImage(null); setEditor({ open: true, sourceKind: item.source_kind, sourceId: item.source_id || item.id, title: item.title, body: item.body || "", notes: item.notes || "", imageUrl: item.image_url || "", date: dateFromIso(item.scheduled_at), time: timeFromIso(item.scheduled_at) });
  }
  function openManualEditor() { setLocalImage(null); setEditor({ ...EMPTY_EDITOR, open: true }); }

  async function uploadImageIfNeeded(wsId: string, draftId: string) {
    if (!localImage) return editor.imageUrl || "";
    const fileName = safeFileName(localImage.file.name || "blog-cover");
    const path = `${wsId}/blog/${draftId}/${Date.now()}-${fileName}`;
    const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, localImage.file, { contentType: localImage.file.type || "image/jpeg", upsert: false });
    if (uploadError) throw new Error(uploadError.message);
    const { data: publicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    const publicUrl = publicData.publicUrl || "";
    await supabase.schema("contentiq").from("media_assets").insert({ workspace_id: wsId, draft_id: draftId, storage_bucket: STORAGE_BUCKET, storage_path: path, file_name: localImage.file.name, mime_type: localImage.file.type || "image/jpeg", file_size: localImage.file.size, asset_type: "image", status: "temporary", expires_at: new Date(Date.now() + 1000*60*60*24*90).toISOString() });
    return publicUrl;
  }

  async function saveAsInspiration() {
    setSaving(true); setError("");
    try {
      const wsId = workspaceUuid || await getOrCreateWorkspaceUuid();
      if (!editor.title.trim() && !editor.body.trim()) throw new Error("Dodaj tytuł albo treść inspiracji.");
      if (editor.sourceKind === "inspiration" && editor.sourceId) {
        const { error } = await supabase.schema("contentiq").from("inspirations").update({ title: editor.title || "Inspiracja blogowa", description: editor.body.slice(0, 240), body: editor.body, ai_feedback: editor.notes, platforms: ["blog"], status: "active" }).eq("id", editor.sourceId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.schema("contentiq").from("inspirations").insert({ workspace_id: wsId, source_kind: "blog", source_studio: "Blog Studio", title: editor.title || "Inspiracja blogowa", description: editor.body.slice(0, 240), body: editor.body, platforms: ["blog"], hashtags: [], ai_feedback: editor.notes, status: "active" });
        if (error) throw new Error(error.message);
      }
      await load(); showToast("✓ Zapisano jako inspirację blogową");
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }

  async function saveAsDraft(status: "draft" | "template" = "draft") {
    setSaving(true); setError("");
    try {
      const wsId = workspaceUuid || await getOrCreateWorkspaceUuid();
      if (!editor.title.trim() && !editor.body.trim()) throw new Error("Dodaj tytuł albo treść szkicu.");
      const basePayload = { workspace_id: wsId, title: editor.title || "Szkic wpisu blogowego", body: editor.body, topic: editor.title || editor.body.slice(0, 120), content_type: "Blog Studio / artykuł blogowy", target_platforms: ["blog"], ai_feedback: editor.notes, status, media: editor.imageUrl ? [{ kind: "cover", asset_type: "image", public_url: editor.imageUrl, url: editor.imageUrl, status: "temporary" }] : [] };
      let draftId = editor.sourceKind !== "inspiration" ? editor.sourceId : undefined;
      if (draftId && (editor.sourceKind === "draft" || editor.sourceKind === "template")) {
        const { error } = await supabase.schema("contentiq").from("content_drafts").update(basePayload).eq("id", draftId);
        if (error) throw new Error(error.message);
      } else {
        const { data, error } = await supabase.schema("contentiq").from("content_drafts").insert(basePayload).select("id").single();
        if (error) throw new Error(error.message);
        draftId = data?.id as string;
      }
      if (draftId && localImage) {
        const imageUrl = await uploadImageIfNeeded(wsId, draftId);
        const { error } = await supabase.schema("contentiq").from("content_drafts").update({ media: [{ kind: "cover", asset_type: "image", public_url: imageUrl, url: imageUrl, status: "temporary" }] }).eq("id", draftId);
        if (error) throw new Error(error.message);
      }
      await load(); showToast(status === "template" ? "✓ Zapisano jako gotowy szablon" : "✓ Zapisano jako szkic");
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }

  async function addToSchedule() {
    setSaving(true); setError("");
    try {
      const wsId = workspaceUuid || await getOrCreateWorkspaceUuid();
      const scheduledAt = makeIso(editor.date, editor.time);
      if (!scheduledAt) throw new Error("Wybierz datę publikacji na blogu.");
      if (!editor.title.trim()) throw new Error("Dodaj tytuł wpisu.");
      const { error } = await supabase.schema("contentiq").from("blog_schedule").insert({ workspace_id: wsId, source_kind: editor.sourceKind, source_id: editor.sourceId || null, title: editor.title, body: editor.body || null, image_url: editor.imageUrl || null, scheduled_at: scheduledAt, status: "planned", notes: editor.notes || null });
      if (error) throw new Error(error.message);
      await load(); showToast("✓ Dodano do harmonogramu bloga");
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }

  async function updateSchedule(item: BlogScheduleItem, patch: Partial<BlogScheduleItem>) {
    try {
      const { error } = await supabase.schema("contentiq").from("blog_schedule").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", item.id);
      if (error) throw new Error(error.message);
      await load(); showToast("✓ Harmonogram zaktualizowany");
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }
  async function deleteSchedule(item: BlogScheduleItem) {
    if (!window.confirm(`Czy na pewno chcesz usunąć z harmonogramu wpis „${item.title}”?`)) return;
    const { error } = await supabase.schema("contentiq").from("blog_schedule").delete().eq("id", item.id);
    if (error) setError(error.message); else { await load(); showToast("✓ Usunięto z harmonogramu"); }
  }
  async function deleteInspiration(item: BlogInspiration) {
    if (!window.confirm(`Czy na pewno chcesz usunąć inspirację „${item.title || "Bez tytułu"}”? Tej operacji nie można cofnąć.`)) return;
    await supabase.schema("contentiq").from("blog_schedule").delete().eq("source_kind", "inspiration").eq("source_id", item.id);
    const { error } = await supabase.schema("contentiq").from("inspirations").delete().eq("id", item.id);
    if (error) setError(error.message); else { await load(); showToast("✓ Inspiracja usunięta"); }
  }
  async function deleteDraft(item: BlogDraft) {
    if (!window.confirm(`Czy na pewno chcesz usunąć szkic lub szablon „${item.title || item.topic || "Bez tytułu"}”? Tej operacji nie można cofnąć.`)) return;
    await supabase.schema("contentiq").from("blog_schedule").delete().in("source_kind", ["draft", "template"]).eq("source_id", item.id);
    const { error } = await supabase.schema("contentiq").from("content_drafts").delete().eq("id", item.id);
    if (error) setError(error.message); else { await load(); showToast("✓ Szkic/szablon usunięty"); }
  }

  function openInBlogStudio() {
    localStorage.setItem("ciq-blog-studio-draft", JSON.stringify({ title: editor.title, body: editor.body, notes: editor.notes }));
    showToast("✓ Wpis przekazany do Blog Studio");
  }
  function copy(text: string) { void navigator.clipboard.writeText(text); showToast("✓ Skopiowano"); }
  function Empty({ title, text }: { title: string; text: string }) {
    return <div style={{ border: `1px dashed ${css.border}`, background: css.surface, borderRadius: 18, padding: 24, textAlign: "center", color: css.muted }}><FileText size={28} style={{ opacity: .45, marginBottom: 10 }} /><div style={{ color: css.heading, fontFamily: "var(--font-heading)", fontSize: 22, marginBottom: 6 }}>{title}</div><div style={{ fontSize: 12, lineHeight: 1.65 }}>{text}</div></div>;
  }
  function Btn({ children, onClick, danger, accent, disabled }: { children: React.ReactNode; onClick: () => void; danger?: boolean; accent?: boolean; disabled?: boolean }) {
    return <button type="button" onClick={onClick} disabled={disabled} style={{ borderRadius: 12, border: `1px solid ${danger ? "#ef444455" : accent ? css.accentBorder : css.border}`, background: danger ? "#ef444414" : accent ? css.accentSoft : css.surfaceSoft, color: danger ? "#ef4444" : accent ? css.accent : css.text, padding: "8px 10px", fontSize: 11, fontWeight: 900, fontFamily: "var(--font-body)", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .55 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}>{children}</button>;
  }
  function Card({ title, body, score, createdAt, badge, imageUrl, onEdit, onDelete, onSchedule, onTemplate, onInspiration }: { title: string; body: string; score?: number | null; createdAt?: string | null; badge: string; imageUrl?: string; onEdit: () => void; onDelete: () => void; onSchedule?: () => void; onTemplate?: () => void; onInspiration?: () => void }) {
    return <article style={{ borderRadius: 20, border: `1px solid ${css.border}`, background: css.surface, overflow: "hidden", display: "grid", gridTemplateColumns: imageUrl ? "140px 1fr" : "1fr", minHeight: 150 }}>
      {imageUrl && <img src={imageUrl} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />}
      <div style={{ padding: 15, display: "grid", gap: 9 }}>
        <div><span style={{ borderRadius: 999, background: css.accentSoft, color: css.accent, padding: "4px 8px", fontSize: 10, fontWeight: 900 }}>{badge}</span>{typeof score === "number" && score > 0 && <span style={{ marginLeft: 7, color: getScoreColor(score), fontSize: 10, fontWeight: 900 }}>AI {score}/100</span>}</div>
        <h3 style={{ margin: 0, color: css.heading, fontFamily: "var(--font-heading)", fontSize: 24, lineHeight: 1.05, fontWeight: 500 }}>{title || "Wpis bez tytułu"}</h3>
        <div style={{ color: css.muted, fontSize: 11 }}>{createdAt ? fmt(createdAt) : "Brak daty utworzenia"}</div>
        <p style={{ margin: 0, color: css.text, fontSize: 12, lineHeight: 1.65, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", whiteSpace: "pre-wrap" }}>{body || "Brak treści."}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          <Btn onClick={onEdit} accent><Edit3 size={13} />Edytuj</Btn><Btn onClick={() => copy(body)}><Copy size={13} />Kopiuj</Btn>{onInspiration && <Btn onClick={onInspiration}><Save size={13} />Inspiracja</Btn>}{onTemplate && <Btn onClick={onTemplate}><CheckCircle2 size={13} />Szablon</Btn>}{onSchedule && <Btn onClick={onSchedule}><CalendarDays size={13} />Termin</Btn>}<Btn onClick={onDelete} danger><Trash2 size={13} />Usuń</Btn>
        </div>
      </div>
    </article>;
  }

  if (loading) return <div style={{ color: css.muted, fontFamily: "var(--font-body)", padding: 50, textAlign: "center" }}>{text("Ładowanie biblioteki bloga...", "Loading blog library...")}</div>;

  return <div style={{ fontFamily: "var(--font-body)", color: css.text, display: "grid", gap: 20 }}>
    <style>{`*{box-sizing:border-box}.bloglib-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.bloglib-editor-grid{display:grid;grid-template-columns:minmax(0,1fr)280px;gap:14px}@media(max-width:980px){.bloglib-grid,.bloglib-editor-grid{grid-template-columns:1fr}}`}</style>
    {toast && <div style={{ position: "fixed", top: 20, right: 20, zIndex: 300, background: "#052e16", color: "#22c55e", border: "1px solid #166534", borderRadius: 12, padding: "10px 16px", fontSize: 13, fontWeight: 800 }}>{toast}</div>}
    <section style={{ background: css.surface, border: `1px solid ${css.border}`, borderRadius: 24, padding: 20, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", right: 20, top: 4, color: css.accent, opacity: .05, fontFamily: "var(--font-heading)", fontSize: 118 }}>Blog</div>
      <div style={{ position: "relative", zIndex: 1 }}><p style={{ margin: "0 0 7px", color: css.accent, fontFamily: "var(--font-label)", fontSize: 12, fontWeight: 900, letterSpacing: ".12em", textTransform: "uppercase" }}>Blog Library</p><h2 style={{ margin: "0 0 10px", color: css.heading, fontFamily: "var(--font-heading)", fontSize: 32, lineHeight: 1.04, fontWeight: 500 }}>{text("Harmonogram, szkice i inspiracje wpisów blogowych", "Blog schedule, drafts and post inspirations")}</h2><p style={{ margin: 0, color: css.muted, fontSize: 13, lineHeight: 1.75, maxWidth: 920 }}>{text("Na górze widzisz terminy publikacji, niżej szkice i gotowe szablony, a na końcu inspiracje, które można rozwinąć w Blog Studio.", "Publishing dates appear first, followed by drafts, ready-made templates and inspirations you can develop in Blog Studio.")}</p></div>
    </section>
    <div className="bloglib-grid">{[{l:"Zaplanowane wpisy",v:schedules.length,t:"terminy do ręcznego oznaczenia jako wystawione",i:<CalendarDays size={18}/>},{l:"Szkice i szablony",v:drafts.length,t:"robocze lub gotowe materiały do przeniesienia na blog",i:<FileText size={18}/>},{l:"Inspiracje blogowe",v:inspirations.length,t:"pomysły, które mogą stać się pełnym artykułem",i:<Save size={18}/>}].map((it)=><div key={it.l} style={{background:css.surface,border:`1px solid ${css.border}`,borderRadius:20,padding:16}}><div style={{color:css.accent,marginBottom:9}}>{it.i}</div><div style={{color:css.heading,fontFamily:"var(--font-heading)",fontSize:32,lineHeight:1}}>{it.v}</div><div style={{color:css.text,fontSize:12,fontWeight:900,marginTop:7}}>{it.l}</div><div style={{color:css.muted,fontSize:11,lineHeight:1.55,marginTop:4}}>{it.t}</div></div>)}</div>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><button type="button" onClick={openManualEditor} style={{borderRadius:15,border:`1px solid ${css.aiBorder}`,background:css.aiBg,color:css.aiText,boxShadow:css.aiGlow,padding:"12px 15px",cursor:"pointer",fontFamily:"var(--font-body)",fontSize:12,fontWeight:900,display:"inline-flex",alignItems:"center",gap:8}}><Plus size={15}/>{text("Dodaj wpis ręcznie", "Add post manually")}</button><button type="button" onClick={()=>void load()} style={{borderRadius:15,border:`1px solid ${css.border}`,background:css.surface,color:css.text,padding:"12px 15px",cursor:"pointer",fontFamily:"var(--font-body)",fontSize:12,fontWeight:900}}>{text("Odśwież bibliotekę", "Refresh library")}</button></div>
    {error && <div style={{borderRadius:14,background:"#ef444414",border:"1px solid #ef444440",color:"#ef4444",padding:12,fontSize:12,lineHeight:1.65}}>{error}</div>}

    <section style={{display:"grid",gap:12}}><Label color={css.accent}>1 / Harmonogram bloga</Label>{scheduleGroups.length===0&&<Empty title="Brak zaplanowanych wpisów" text="Dodaj termin z poziomu szkicu, inspiracji albo ręcznie. Harmonogram nie publikuje automatycznie."/>}{scheduleGroups.map(([date,items])=><div key={date} style={{background:css.surface,border:`1px solid ${css.border}`,borderRadius:22,padding:15,display:"grid",gap:10}}><div style={{color:css.heading,fontFamily:"var(--font-heading)",fontSize:25}}>{fmtDay(date)}</div>{items.map((item)=><div key={item.id} style={{background:css.surfaceSoft,border:`1px solid ${css.border}`,borderLeft:`4px solid ${item.status==="published"?"#22c55e":item.status==="missed"?"#ef4444":css.accent}`,borderRadius:16,padding:12,display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:12,alignItems:"center"}}><div><div style={{color:css.muted,fontSize:11,marginBottom:4}}><Clock size={12} style={{verticalAlign:"-2px",marginRight:4}}/>{fmt(item.scheduled_at)} · {item.status}</div><div style={{color:css.text,fontSize:14,fontWeight:900,lineHeight:1.35}}>{item.title}</div>{item.notes&&<div style={{color:css.muted,fontSize:11,lineHeight:1.5,marginTop:4}}>{item.notes}</div>}</div><div style={{display:"flex",gap:7,flexWrap:"wrap",justifyContent:"flex-end"}}><Btn onClick={()=>updateSchedule(item,{status:item.status==="published"?"planned":"published"})} accent={item.status!=="published"}><CheckCircle2 size={13}/>{item.status==="published"?"Cofnij":"Wystawione"}</Btn><Btn onClick={()=>updateSchedule(item,{status:item.status==="missed"?"planned":"missed"})}><X size={13}/>Nie wystawione</Btn><Btn onClick={()=>openEditorFromSchedule(item)}><Edit3 size={13}/>Zmień datę</Btn><Btn onClick={()=>deleteSchedule(item)} danger><Trash2 size={13}/>Usuń</Btn></div></div>)}</div>)}</section>

    <section style={{display:"grid",gap:12}}><Label color={css.accent}>2 / Szkice i gotowe szablony bloga</Label>{drafts.length===0&&<Empty title="Brak szkiców blogowych" text="Zapisuj szkice z Blog Studio albo przenieś inspirację do szkicu."/>}{templatesOnly.length>0&&<><Label color={css.aiText}>Gotowe szablony</Label>{templatesOnly.map((item)=><Card key={item.id} title={item.title||item.topic||"Szablon blogowy"} body={item.body||""} score={item.ai_score} createdAt={item.created_at} badge="szablon" imageUrl={getDraftImageUrl(item)} onEdit={()=>openEditorFromDraft(item)} onDelete={()=>deleteDraft(item)} onSchedule={()=>openEditorFromDraft(item)} onInspiration={()=>{openEditorFromDraft(item);setTimeout(()=>void saveAsInspiration(),50)}} />)}</>}{draftsOnly.length>0&&<><Label color={css.muted}>Szkice robocze</Label>{draftsOnly.map((item)=><Card key={item.id} title={item.title||item.topic||"Szkic blogowy"} body={item.body||""} score={item.ai_score} createdAt={item.created_at} badge="szkic" imageUrl={getDraftImageUrl(item)} onEdit={()=>openEditorFromDraft(item)} onDelete={()=>deleteDraft(item)} onSchedule={()=>openEditorFromDraft(item)} onTemplate={()=>{openEditorFromDraft(item);setTimeout(()=>void saveAsDraft("template"),50)}} onInspiration={()=>{openEditorFromDraft(item);setTimeout(()=>void saveAsInspiration(),50)}} />)}</>}</section>

    <section style={{display:"grid",gap:12}}><Label color={css.accent}>3 / Inspiracje blogowe</Label>{inspirations.length===0&&<Empty title="Brak inspiracji blogowych" text="Inspiracje są miejscem na pomysły, zalążki tematów i notatki."/>}{inspirations.map((item)=><Card key={item.id} title={item.title||"Inspiracja blogowa"} body={item.body||item.description||""} score={item.ai_score} createdAt={item.created_at} badge="inspiracja" onEdit={()=>openEditorFromInspiration(item)} onDelete={()=>deleteInspiration(item)} onSchedule={()=>openEditorFromInspiration(item)} onTemplate={()=>{openEditorFromInspiration(item);setTimeout(()=>void saveAsDraft("template"),50)}} />)}</section>

    {editor.open&&<div style={{position:"fixed",inset:0,zIndex:250,background:"rgba(0,0,0,.68)",display:"grid",placeItems:"center",padding:18}}><div style={{width:"min(1100px,96vw)",maxHeight:"92vh",overflow:"auto",background:css.bg,border:`1px solid ${css.border}`,borderRadius:24,padding:18,boxShadow:"0 30px 80px rgba(0,0,0,.42)"}}><div style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:14}}><div><Label color={css.accent}>Edycja wpisu blogowego</Label><h3 style={{margin:0,color:css.heading,fontFamily:"var(--font-heading)",fontSize:28,lineHeight:1.05}}>{editor.title||"Nowy wpis blogowy"}</h3></div><button type="button" onClick={()=>setEditor(EMPTY_EDITOR)} style={{width:38,height:38,borderRadius:12,border:`1px solid ${css.border}`,background:css.surface,color:css.text,cursor:"pointer"}}>✕</button></div><div className="bloglib-editor-grid"><div style={{display:"grid",gap:12}}><label><Label color={css.muted}>Tytuł</Label><input value={editor.title} onChange={(e)=>setEditor(c=>({...c,title:e.target.value}))} placeholder="Tytuł wpisu blogowego" style={{width:"100%",borderRadius:14,border:`1px solid ${css.border}`,background:css.surface,color:css.text,padding:"12px 13px",fontFamily:"var(--font-body)",outline:"none"}}/></label><label><Label color={css.muted}>Treść / notatka</Label><textarea value={editor.body} onChange={(e)=>setEditor(c=>({...c,body:e.target.value}))} placeholder="Treść szkicu, notatki albo gotowego wpisu..." rows={16} style={{width:"100%",borderRadius:16,border:`1px solid ${css.border}`,background:css.surface,color:css.text,padding:14,fontFamily:"var(--font-body)",fontSize:13,lineHeight:1.75,outline:"none",resize:"vertical"}}/></label><label><Label color={css.muted}>Notatki / wskazówki</Label><textarea value={editor.notes} onChange={(e)=>setEditor(c=>({...c,notes:e.target.value}))} placeholder="Np. CTA, do jakiej oferty prowadzi wpis, co poprawić w Blog Studio." rows={4} style={{width:"100%",borderRadius:14,border:`1px solid ${css.border}`,background:css.surface,color:css.text,padding:12,fontFamily:"var(--font-body)",fontSize:12,lineHeight:1.6,outline:"none",resize:"vertical"}}/></label></div><aside style={{display:"grid",gap:12,alignContent:"start"}}><div style={{background:css.surface,border:`1px solid ${css.border}`,borderRadius:18,padding:14,display:"grid",gap:10}}><Label color={css.accent}>Okładka wpisu</Label>{(localImage?.previewUrl||editor.imageUrl)?<img src={localImage?.previewUrl||editor.imageUrl} alt="Okładka" style={{width:"100%",height:150,objectFit:"cover",borderRadius:14,border:`1px solid ${css.border}`}}/>:<div style={{height:150,borderRadius:14,border:`1px dashed ${css.border}`,display:"grid",placeItems:"center",color:css.muted}}><ImageIcon size={26}/></div>}<input ref={fileRef} type="file" accept="image/*" onChange={(e)=>{const file=e.target.files?.[0]; if(!file)return; if(localImage) URL.revokeObjectURL(localImage.previewUrl); setLocalImage({file,previewUrl:URL.createObjectURL(file)});}} style={{display:"none"}}/><Btn onClick={()=>fileRef.current?.click()} accent><Upload size={13}/>Dodaj / zmień zdjęcie</Btn><input value={editor.imageUrl} onChange={(e)=>setEditor(c=>({...c,imageUrl:e.target.value}))} placeholder="albo wklej URL zdjęcia" style={{width:"100%",borderRadius:12,border:`1px solid ${css.border}`,background:css.surfaceSoft,color:css.text,padding:"9px 10px",fontFamily:"var(--font-body)",fontSize:12,outline:"none"}}/></div><div style={{background:css.surface,border:`1px solid ${css.border}`,borderRadius:18,padding:14,display:"grid",gap:10}}><Label color={css.accent}>Termin na blog</Label><input type="date" value={editor.date} onChange={(e)=>setEditor(c=>({...c,date:e.target.value}))} style={{width:"100%",borderRadius:12,border:`1px solid ${css.border}`,background:css.surfaceSoft,color:css.text,padding:"9px 10px",fontFamily:"var(--font-body)",outline:"none"}}/><input type="time" value={editor.time} onChange={(e)=>setEditor(c=>({...c,time:e.target.value}))} style={{width:"100%",borderRadius:12,border:`1px solid ${css.border}`,background:css.surfaceSoft,color:css.text,padding:"9px 10px",fontFamily:"var(--font-body)",outline:"none"}}/><Btn onClick={addToSchedule} disabled={saving} accent><CalendarDays size={13}/>Dodaj do harmonogramu</Btn></div><div style={{background:css.surface,border:`1px solid ${css.aiBorder}`,boxShadow:css.aiGlow,borderRadius:18,padding:14,display:"grid",gap:9}}><Label color={css.aiText}>Co dalej?</Label><Btn onClick={openInBlogStudio} accent><Edit3 size={13}/>Otwórz w Blog Studio</Btn><Btn onClick={saveAsInspiration} disabled={saving}><Save size={13}/>Zapisz jako inspirację</Btn><Btn onClick={()=>saveAsDraft("draft")} disabled={saving}><FileText size={13}/>Zapisz jako szkic</Btn><Btn onClick={()=>saveAsDraft("template")} disabled={saving} accent><CheckCircle2 size={13}/>Zapisz jako szablon</Btn></div></aside></div></div></div>}
  </div>;
}
