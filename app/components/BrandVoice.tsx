"use client";

// app/components/BrandVoice.tsx
// Ustawienia Brand Voice — ton, styl, grupa docelowa, słowa klucze

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface BrandVoiceData {
  id?: string;
  tone: string;
  style: string;
  target_audience: string;
  keywords: string[];
  avoid_words: string[];
  example_posts: string[];
  brand_values: string;
  cta_style: string;
}

const TONE_OPTIONS = ["Ekspercki", "Luźny / przyjazny", "Narracyjny", "Motywacyjny", "Profesjonalny B2B", "Edukacyjny", "Humorystyczny"];
const STYLE_OPTIONS = ["Krótkie posty z hakami", "Długie artykuły eksperckie", "Storytelling", "Listy i poradniki", "Case studies", "Behind the scenes", "Dane i statystyki"];

const EMPTY: BrandVoiceData = {
  tone: "",
  style: "",
  target_audience: "",
  keywords: [],
  avoid_words: [],
  example_posts: [],
  brand_values: "",
  cta_style: "",
};

export default function BrandVoice({
  dark = true,
  workspaceId,
}: {
  dark?: boolean;
  workspaceId: string;
}) {
  const supabase = createClient();
  const [data, setData] = useState<BrandVoiceData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [newAvoid, setNewAvoid] = useState("");
  const [newExample, setNewExample] = useState("");

  const css = dark
    ? { bg: "#060d18", surface: "#0d1829", text: "#e8f0ff", muted: "#4a6480", border: "#1a2740", accent: "#818cf8", input: "#080e1a" }
    : { bg: "#f0f4f8", surface: "#ffffff", text: "#0f172a", muted: "#64748b", border: "#e2e8f0", accent: "#6366f1", input: "#f8fafc" };

  async function getWsId() {
    const { data: ws } = await supabase.schema("contentiq").from("workspaces").select("id").eq("slug", workspaceId).single();
    return ws?.id as string | undefined;
  }

  async function load() {
    setLoading(true);
    const wsId = await getWsId();
    if (!wsId) { setLoading(false); return; }
    const { data: bv } = await supabase.schema("contentiq").from("brand_voice").select("*").eq("workspace_id", wsId).single();
    if (bv) setData(bv as BrandVoiceData);
    setLoading(false);
  }

  useEffect(() => { load(); }, [workspaceId]);

  async function save() {
    setSaving(true);
    setError("");
    const wsId = await getWsId();
    if (!wsId) {
      setError("Nie znaleziono workspace.");
      setSaving(false);
      return;
    }

    const { id, ...values } = data;
    const payload = { ...values, workspace_id: wsId, updated_at: new Date().toISOString() };
    if (data.id) {
      const { error: updateError } = await supabase.schema("contentiq").from("brand_voice").update(payload).eq("id", data.id);
      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { data: created, error: insertError } = await supabase.schema("contentiq").from("brand_voice").insert(payload).select("id").single();
      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }
      if (created?.id) setData(d => ({ ...d, id: created.id }));
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function addTag(field: "keywords" | "avoid_words", value: string, setter: (v: string) => void) {
    if (!value.trim()) return;
    setData(d => ({ ...d, [field]: [...d[field], value.trim()] }));
    setter("");
  }

  function removeTag(field: "keywords" | "avoid_words", index: number) {
    setData(d => ({ ...d, [field]: d[field].filter((_, i) => i !== index) }));
  }

  function addExample() {
    if (!newExample.trim()) return;
    setData(d => ({ ...d, example_posts: [...d.example_posts, newExample.trim()] }));
    setNewExample("");
  }

  function removeExample(index: number) {
    setData(d => ({ ...d, example_posts: d.example_posts.filter((_, i) => i !== index) }));
  }

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: `1px solid ${css.border}`, background: css.input,
    color: css.text, fontSize: 13, fontFamily: "inherit", outline: "none",
  } as React.CSSProperties;

  const tagStyle = (color: string) => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
    background: color + "20", color, border: `1px solid ${color}40`,
  } as React.CSSProperties);

  if (loading) return (
    <div style={{ textAlign: "center", padding: 60, color: css.muted, fontSize: 13 }}>Ładowanie Brand Voice...</div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans','Helvetica Neue',sans-serif", color: css.text, maxWidth: 760 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Serif+Display&display=swap');
        *{box-sizing:border-box}
        .bv-input:focus{border-color:${css.accent}!important}
        .bv-btn{transition:opacity .15s,transform .15s;cursor:pointer;font-family:inherit}
        .bv-btn:hover{opacity:.82}
        .bv-option{transition:all .15s;cursor:pointer}
        .bv-option:hover{border-color:${css.accent}!important}
        textarea{resize:vertical;font-family:inherit}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fade{animation:fadeUp .3s ease forwards}
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }} className="fade">
        <div style={{ fontSize: 10, fontWeight: 700, color: css.accent, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8 }}>✦ AI Personalizacja</div>
        <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, fontWeight: 400, color: css.text, marginBottom: 8, letterSpacing: "-0.02em" }}>Brand Voice</h2>
        <p style={{ fontSize: 13, color: css.muted, lineHeight: 1.7 }}>
          Opisz styl swojej marki — AI będzie automatycznie uwzględniać te ustawienia podczas generowania treści w Content Studio.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Ton komunikacji */}
        <div className="fade" style={{ padding: 20, borderRadius: 14, background: css.surface, border: `1px solid ${css.border}` }}>
          <Label color={css.accent}>Ton komunikacji</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {TONE_OPTIONS.map(t => (
              <button key={t} className="bv-option bv-btn"
                onClick={() => setData(d => ({ ...d, tone: t }))}
                style={{ padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${data.tone === t ? css.accent : css.border}`, background: data.tone === t ? css.accent + "20" : "transparent", color: data.tone === t ? css.accent : css.muted, fontSize: 12, fontWeight: data.tone === t ? 700 : 400 }}>
                {t}
              </button>
            ))}
          </div>
          {data.tone === "" && <div style={{ fontSize: 11, color: css.muted, marginTop: 8 }}>Nie wybrano — AI użyje domyślnego tonu</div>}
        </div>

        {/* Styl treści */}
        <div className="fade" style={{ padding: 20, borderRadius: 14, background: css.surface, border: `1px solid ${css.border}` }}>
          <Label color={css.accent}>Preferowany styl treści</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {STYLE_OPTIONS.map(s => (
              <button key={s} className="bv-option bv-btn"
                onClick={() => setData(d => ({ ...d, style: s }))}
                style={{ padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${data.style === s ? "#f59e0b" : css.border}`, background: data.style === s ? "#f59e0b20" : "transparent", color: data.style === s ? "#f59e0b" : css.muted, fontSize: 12, fontWeight: data.style === s ? 700 : 400 }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Grupa docelowa */}
        <div className="fade" style={{ padding: 20, borderRadius: 14, background: css.surface, border: `1px solid ${css.border}` }}>
          <Label color={css.accent}>Grupa docelowa</Label>
          <textarea className="bv-input"
            value={data.target_audience}
            onChange={e => setData(d => ({ ...d, target_audience: e.target.value }))}
            placeholder="np. Przedsiębiorcy i managerowie 30-45 lat, zainteresowani AI, marketingiem i automatyzacją biznesu. Prowadzą firmy 5-50 osób."
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }} />
        </div>

        {/* Wartości marki */}
        <div className="fade" style={{ padding: 20, borderRadius: 14, background: css.surface, border: `1px solid ${css.border}` }}>
          <Label color={css.accent}>Wartości i DNA marki</Label>
          <textarea className="bv-input"
            value={data.brand_values}
            onChange={e => setData(d => ({ ...d, brand_values: e.target.value }))}
            placeholder="np. Autentyczność, praktyczność, dzielenie się wiedzą. Nie sprzedajemy — edukujemy. Pokazujemy zakulisowo jak budujemy firmę."
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }} />
        </div>

        {/* CTA style */}
        <div className="fade" style={{ padding: 20, borderRadius: 14, background: css.surface, border: `1px solid ${css.border}` }}>
          <Label color={css.accent}>Styl CTA (wezwanie do działania)</Label>
          <input className="bv-input"
            value={data.cta_style}
            onChange={e => setData(d => ({ ...d, cta_style: e.target.value }))}
            placeholder='np. "Napisz mi w komentarzu", "Zapisz post", "Obserwuj żeby nie przegapić kolejnych"'
            style={inputStyle} />
        </div>

        {/* Słowa klucze */}
        <div className="fade" style={{ padding: 20, borderRadius: 14, background: css.surface, border: `1px solid ${css.border}` }}>
          <Label color="#22c55e">Słowa i frazy które lubisz używać</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {data.keywords.map((k, i) => (
              <span key={i} style={tagStyle("#22c55e")}>
                {k}
                <button onClick={() => removeTag("keywords", i)} style={{ background: "none", border: "none", color: "#22c55e", cursor: "pointer", fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="bv-input" value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTag("keywords", newKeyword, setNewKeyword)}
              placeholder='np. "growth mindset", "automatyzacja", "real talk" — Enter żeby dodać'
              style={{ ...inputStyle, flex: 1 }} />
            <button className="bv-btn" onClick={() => addTag("keywords", newKeyword, setNewKeyword)}
              style={{ padding: "10px 14px", borderRadius: 10, background: "#22c55e20", border: "1px solid #22c55e40", color: "#22c55e", fontSize: 12, fontWeight: 600 }}>
              + Dodaj
            </button>
          </div>
        </div>

        {/* Słowa do unikania */}
        <div className="fade" style={{ padding: 20, borderRadius: 14, background: css.surface, border: `1px solid ${css.border}` }}>
          <Label color="#ef4444">Słowa i frazy których unikasz</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {data.avoid_words.map((k, i) => (
              <span key={i} style={tagStyle("#ef4444")}>
                {k}
                <button onClick={() => removeTag("avoid_words", i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="bv-input" value={newAvoid} onChange={e => setNewAvoid(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTag("avoid_words", newAvoid, setNewAvoid)}
              placeholder='np. "synergii", "ekosystem", "wdrażamy" — Enter żeby dodać'
              style={{ ...inputStyle, flex: 1 }} />
            <button className="bv-btn" onClick={() => addTag("avoid_words", newAvoid, setNewAvoid)}
              style={{ padding: "10px 14px", borderRadius: 10, background: "#ef444420", border: "1px solid #ef444440", color: "#ef4444", fontSize: 12, fontWeight: 600 }}>
              + Dodaj
            </button>
          </div>
        </div>

        {/* Przykłady postów */}
        <div className="fade" style={{ padding: 20, borderRadius: 14, background: css.surface, border: `1px solid ${css.border}` }}>
          <Label color={css.accent}>Przykłady Twoich najlepszych postów</Label>
          <p style={{ fontSize: 12, color: css.muted, marginBottom: 12, lineHeight: 1.6 }}>
            Wklej treść postów które najbardziej Ci się udały. AI będzie się wzorować na tym stylu.
          </p>
          {data.example_posts.map((ex, i) => (
            <div key={i} style={{ position: "relative", marginBottom: 8 }}>
              <div style={{ padding: "10px 36px 10px 12px", borderRadius: 10, background: css.input, border: `1px solid ${css.border}`, fontSize: 12, color: css.muted, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {ex.slice(0, 200)}{ex.length > 200 ? "..." : ""}
              </div>
              <button onClick={() => removeExample(i)}
                style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>
          ))}
          {data.example_posts.length < 5 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea className="bv-input" value={newExample} onChange={e => setNewExample(e.target.value)}
                placeholder="Wklej treść przykładowego posta..."
                rows={4}
                style={{ ...inputStyle, resize: "vertical" }} />
              <button className="bv-btn" onClick={addExample} disabled={!newExample.trim()}
                style={{ padding: "9px", borderRadius: 10, background: css.accent + "20", border: `1px solid ${css.accent}40`, color: css.accent, fontSize: 12, fontWeight: 600, opacity: !newExample.trim() ? 0.5 : 1 }}>
                + Dodaj przykład ({data.example_posts.length}/5)
              </button>
            </div>
          )}
        </div>

        {/* Save button */}
        <button className="bv-btn fade" onClick={save} disabled={saving}
          style={{ padding: "14px", borderRadius: 14, background: saved ? "#22c55e" : dark ? "#fff" : "#0f172a", color: saved ? "#fff" : dark ? "#0f172a" : "#fff", border: "none", fontSize: 14, fontWeight: 800, opacity: saving ? 0.6 : 1 }}>
          {saving ? "Zapisuję..." : saved ? "✓ Brand Voice zapisany" : "Zapisz Brand Voice"}
        </button>

        {saved && (
          <div style={{ padding: "12px 16px", borderRadius: 10, background: "#052e16", border: "1px solid #166534", color: "#22c55e", fontSize: 13 }}>
            ✓ Brand Voice zapisany — Content Studio będzie teraz uwzględniać Twój styl przy każdym generowaniu treści.
          </div>
        )}
        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 10, background: "#450a0a", border: "1px solid #991b1b", color: "#fca5a5", fontSize: 13 }}>
            {error}
          </div>
        )}      </div>
    </div>
  );
}

function Label({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color, marginBottom: 12 }}>
      {children}
    </div>
  );
}

