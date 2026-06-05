"use client";

// app/components/AIChat.tsx
// AI Chat który zna dane z Supabase — posty, wyniki, brand voice

import { useEffect, useRef, useState } from "react";
import { Wand2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

const QUICK_PROMPTS = [
  "Dlaczego moje ostatnie posty mają niski zasięg?",
  "Jakie formaty treści działają u mnie najlepiej?",
  "Zaproponuj 5 tematów na następny tydzień",
  "Który kanał powinienem teraz rozwijać najbardziej?",
  "Jak poprawić mój hook żeby zatrzymał uwagę?",
  "Porównaj moje wyniki z ostatniego miesiąca",
];

export default function AIChat({
  dark = true,
  workspaceId,
}: {
  dark?: boolean;
  workspaceId: string;
}) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<string>("");
  const [contextLoaded, setContextLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const css = dark
    ? {
        bg: "#1A2233",
        surface: "#070707",
        text: "#FFFFFF",
        muted: "#C9CED8",
        border: "rgba(255,255,255,0.10)",
        accent: "#8E443D",
        userBg: "rgba(142,68,61,0.24)",
        aiBg: "rgba(109, 40, 217, 0.16)",
        aiBorder: "rgba(192, 132, 252, 0.55)",
        aiText: "#D8B4FE",
        aiGlow: "0 0 28px rgba(168, 85, 247, 0.28)",
      }
    : {
        bg: "#FFFFFF",
        surface: "#B5937A",
        text: "#231F20",
        muted: "#5F5A57",
        border: "rgba(35,31,32,0.14)",
        accent: "#231F20",
        userBg: "rgba(181,147,122,0.28)",
        aiBg: "rgba(124, 58, 237, 0.10)",
        aiBorder: "rgba(124, 58, 237, 0.34)",
        aiText: "#6D28D9",
        aiGlow: "0 0 26px rgba(124, 58, 237, 0.18)",
      };

  // Pobierz kontekst z Supabase
  async function loadContext() {
    try {
      const { data: ws } = await supabase.schema("contentiq").from("workspaces").select("id,name").eq("slug", workspaceId).single();
      if (!ws?.id) return;

      const [{ data: connections }, { data: posts }, { data: manualLinks }, { data: bv }, { data: drafts }] = await Promise.all([
        supabase.schema("contentiq").from("platform_connections").select("id,platform,account_name,last_synced_at,connected").eq("workspace_id", ws.id).eq("connected", true),
        supabase.schema("contentiq").from("posts").select("title,post_type,published_at,reach,impressions,likes,comments,shares,saves,ai_score").in("connection_id",
          (await supabase.schema("contentiq").from("platform_connections").select("id").eq("workspace_id", ws.id)).data?.map(c => c.id) || []
        ).order("published_at", { ascending: false }).limit(30),
        supabase.schema("contentiq").from("manual_links").select("connection_id,type,url,title,created_at").in("connection_id",
          (await supabase.schema("contentiq").from("platform_connections").select("id").eq("workspace_id", ws.id)).data?.map(c => c.id) || []
        ).order("created_at", { ascending: false }).limit(50),
        supabase.schema("contentiq").from("brand_voice").select("*").eq("workspace_id", ws.id).single(),
        supabase.schema("contentiq").from("content_drafts").select("title,content_type,ai_score,status,created_at").eq("workspace_id", ws.id).order("created_at", { ascending: false }).limit(10),
      ]);

      const connectionName = new Map((connections || []).map(c => [c.id, `${c.platform}: ${c.account_name || c.platform}`]));

      const ctx = `
WORKSPACE: ${ws.name}

PODŁĄCZONE PLATFORMY:
${(connections || []).map(c => `- ${c.platform}: ${c.account_name} (ostatni sync: ${c.last_synced_at ? new Date(c.last_synced_at).toLocaleDateString("pl") : "nigdy"})`).join("\n")}

OSTATNIE POSTY (${(posts || []).length} rekordów):
${(posts || []).slice(0, 15).map(p => `- [${p.post_type || "post"}] "${p.title?.slice(0, 60) || "bez tytułu"}" | reach: ${p.reach || 0} | likes: ${p.likes || 0} | comments: ${p.comments || 0} | AI score: ${p.ai_score || 0} | data: ${p.published_at ? new Date(p.published_at).toLocaleDateString("pl") : "?"}`).join("\n")}

RECZNE LINKI (${(manualLinks || []).length}):
${(manualLinks || []).map(l => `- ${connectionName.get(l.connection_id) || l.connection_id} | ${l.type === "account" ? "profil" : "post"} | ${l.title || "bez tytulu"} | ${l.url}`).join("\n")}

${bv.data ? `BRAND VOICE:
- Ton: ${bv.data.tone || "nieokreślony"}
- Styl: ${bv.data.style || "nieokreślony"}
- Grupa docelowa: ${bv.data.target_audience || "nieokreślona"}
- Wartości marki: ${bv.data.brand_values || "nieokreślone"}
- Słowa klucze: ${(bv.data.keywords || []).join(", ") || "brak"}
- Unikane słowa: ${(bv.data.avoid_words || []).join(", ") || "brak"}` : "BRAND VOICE: Nie skonfigurowany"}

OSTATNIE SZKICE (${(drafts || []).length}):
${(drafts || []).map(d => `- "${d.title}" [${d.content_type || "?"}] status: ${d.status} | AI score: ${d.ai_score || 0}`).join("\n")}
`.trim();

      setContext(ctx);
      setContextLoaded(true);
    } catch (e) {
      console.error("Context load error:", e);
      setContextLoaded(true);
    }
  }

  useEffect(() => {
    loadContext();
    setMessages([{
      role: "assistant",
      content: "Cześć! Jestem Twoim AI asystentem ContentIQ. Znam Twoje posty, wyniki i Brand Voice. Możesz mnie zapytać o analizę wyników, pomysły na content, porównanie platform lub co tylko chcesz wiedzieć o swojej strategii contentowej.",
      ts: Date.now(),
    }]);
  }, [workspaceId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput("");
    const userMsg: Message = { role: "user", content: msg, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-8).map(m => `${m.role}: ${m.content}`).join("\n\n");
      const fullPrompt = `
Kontekst z Supabase:
${context || "Dane sa ladowane albo jeszcze ich nie ma."}

Historia rozmowy:
${history || "Brak historii."}

Pytanie uzytkownika:
${msg}

Odpowiadaj po polsku. Bazuj tylko na realnych danych z kontekstu. Jesli danych brakuje, powiedz to wprost i zaproponuj nastepny krok.
`.trim();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          prompt: fullPrompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details || "Nie udalo sie uzyskac odpowiedzi AI.");
      }

      const reply = data.answer || "Przepraszam, nie udalo sie uzyskac odpowiedzi.";
      setMessages(prev => [...prev, { role: "assistant", content: reply, ts: Date.now() }]);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setMessages(prev => [...prev, { role: "assistant", content: `Blad polaczenia: ${message}`, ts: Date.now() }]);
    }

    setLoading(false);
  }
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div style={{ fontFamily: "var(--font-body)", color: css.text, display: "flex", flexDirection: "column", height: "calc(100vh - 180px)", minHeight: 500 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Serif+Display&display=swap');
        *{box-sizing:border-box}
        .ai-btn{transition:opacity .15s,transform .15s;cursor:pointer;font-family:inherit}
        .ai-btn:hover{opacity:.82}
        .ai-btn:active{transform:scale(.97)}
        textarea{resize:none;font-family:inherit;outline:none}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .msg{animation:fadeUp .25s ease forwards}
        @keyframes bounce{0%,80%,100%{transform:scale(.7);opacity:.5}40%{transform:scale(1);opacity:1}}
        .dot{animation:bounce 1.2s ease-in-out infinite}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:${css.border};border-radius:4px}
      `}</style>

      {/* Header */}
      <div style={{ padding: "0 0 16px", borderBottom: `1px solid ${css.border}`, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: css.accent + "20", border: `1px solid ${css.accent}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✦</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: css.text }}>AI Asystent ContentIQ</div>
            <div style={{ fontSize: 11, color: contextLoaded ? "#22c55e" : css.muted }}>
              {contextLoaded ? `✓ Zna Twoje dane (${context.split("\n").length} linii kontekstu)` : "Ładowanie danych..."}
            </div>
          </div>
        </div>
        <button className="ai-btn" onClick={() => setMessages([{
          role: "assistant",
          content: "Nowa rozmowa rozpoczęta. W czym mogę pomóc?",
          ts: Date.now(),
        }])}
          style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${css.border}`, background: "transparent", color: css.muted, fontSize: 11 }}>
          Nowa rozmowa
        </button>
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: css.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Szybkie pytania</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {QUICK_PROMPTS.map(p => (
              <button key={p} className="ai-btn" onClick={() => send(p)}
                style={{ padding: "6px 12px", borderRadius: 20, border: `1px solid ${css.border}`, background: css.surface, color: css.muted, fontSize: 11, textAlign: "left" }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 4 }}>
        {messages.map((msg, i) => (
          <div key={i} className="msg" style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>
            {msg.role === "assistant" && (
              <div style={{ width: 28, height: 28, borderRadius: 8, background: css.aiBg, border: `1px solid ${css.aiBorder}`, boxShadow: css.aiGlow, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                <Wand2 size={15} color={css.aiText} />
              </div>
            )}
            <div style={{
              maxWidth: "75%", padding: "12px 14px", borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              background: msg.role === "user" ? css.userBg : css.aiBg,
              border: `1px solid ${msg.role === "user" ? css.accent + "40" : css.aiBorder}`,
              boxShadow: msg.role === "user" ? "none" : css.aiGlow,
              fontSize: 13, lineHeight: 1.7, color: css.text, whiteSpace: "pre-wrap",
            }}>
              {msg.content}
              <div style={{ fontSize: 10, color: css.muted, marginTop: 6, textAlign: msg.role === "user" ? "right" : "left" }}>
                {new Date(msg.ts).toLocaleTimeString("pl", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="msg" style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: css.accent + "20", border: `1px solid ${css.accent}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>✦</div>
            <div style={{ padding: "14px 16px", borderRadius: "14px 14px 14px 4px", background: css.surface, border: `1px solid ${css.border}`, display: "flex", gap: 4, alignItems: "center" }}>
              {[0,1,2].map(i => (
                <div key={i} className="dot" style={{ width: 6, height: 6, borderRadius: "50%", background: css.accent, animationDelay: `${i*0.2}s` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ paddingTop: 16, borderTop: `1px solid ${css.border}`, marginTop: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Zapytaj o swoje wyniki, poproś o pomysły na content, analizę strategii... (Enter = wyślij, Shift+Enter = nowa linia)"
            rows={2}
            style={{ flex: 1, padding: "11px 14px", borderRadius: 12, border: `1px solid ${css.border}`, background: css.surface, color: css.text, fontSize: 13, lineHeight: 1.6 }}
            onFocus={e => e.target.style.borderColor = css.accent}
            onBlur={e => e.target.style.borderColor = css.border}
          />
          <button className="ai-btn" onClick={() => send()} disabled={loading || !input.trim()}
            style={{ padding: "11px 18px", borderRadius: 12, background: dark ? "#fff" : "#0f172a", color: dark ? "#0f172a" : "#fff", border: "none", fontSize: 13, fontWeight: 800, opacity: loading || !input.trim() ? 0.4 : 1, flexShrink: 0 }}>
            ✦ Wyślij
          </button>
        </div>
        <div style={{ fontSize: 10, color: css.muted, marginTop: 6, textAlign: "center" }}>
          AI ma dostęp do Twoich postów i wyników z Supabase — odpowiedzi bazują na realnych danych
        </div>
      </div>
    </div>
  );
}

