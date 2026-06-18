"use client";

import { useMemo, useState } from "react";
import { HelpCircle, Send, X } from "lucide-react";

type Lang = "pl" | "en";

type SupportWidgetProps = {
  lang?: Lang;
  workspaceId?: string;
  source?: string;
  userEmail?: string;
};

const copy = {
  pl: {
    button: "Support",
    title: "Kontakt z pomocą",
    intro:
      "Opisz sprawę możliwie konkretnie. Wiadomość trafi do supportu razem z informacją, z jakiej aplikacji, projektu i strony została wysłana.",
    category: "Czego dotyczy zgłoszenie?",
    urgency: "Pilność",
    area: "Obszar / platforma",
    subject: "Krótki temat",
    subjectPlaceholder: "Np. Nie mogę połączyć Instagrama",
    message: "Opisz problem albo pytanie",
    messagePlaceholder:
      "Co się stało? Co próbowałaś zrobić? Jaki komunikat widzisz?",
    expected: "Co powinno się wydarzyć?",
    expectedPlaceholder: "Np. konto powinno zostać połączone i widoczne w integracjach",
    steps: "Kroki do odtworzenia / dodatkowy kontekst",
    stepsPlaceholder: "Np. Dashboard → Integracje → Instagram → Połącz",
    contactEmail: "Email do odpowiedzi",
    send: "Wyślij zgłoszenie",
    sending: "Wysyłanie...",
    close: "Zamknij",
    sent: "Zgłoszenie zostało wysłane. Dzięki, mamy komplet informacji.",
    required: "Uzupełnij temat, treść i email do odpowiedzi.",
    error: "Nie udało się wysłać zgłoszenia.",
    categories: [
      ["technical_problem", "Mam problem techniczny"],
      ["payment", "Płatność, faktura lub subskrypcja"],
      ["integration", "Integracja z platformą"],
      ["publishing", "Publikacja lub harmonogram"],
      ["ai", "AI, generowanie lub limity"],
      ["account", "Konto, logowanie lub dostęp"],
      ["data", "Dane, analityka lub synchronizacja"],
      ["feature", "Pytanie o funkcję / pomysł"],
      ["other", "Inna sprawa"],
    ],
    urgencies: [
      ["low", "Niska - pytanie lub sugestia"],
      ["normal", "Normalna - potrzebuję pomocy"],
      ["high", "Wysoka - blokuje pracę"],
      ["critical", "Krytyczna - aplikacja nie działa"],
    ],
    areas: [
      "Cała aplikacja",
      "Dashboard",
      "Content Studio",
      "Blog Studio",
      "Video Studio",
      "Short Studio",
      "Creative Studio",
      "Harmonogram",
      "Integracje",
      "Instagram",
      "Facebook",
      "LinkedIn",
      "TikTok",
      "YouTube",
      "Blog / WordPress",
      "Spotify",
      "Płatności",
      "Logowanie",
    ],
  },
  en: {
    button: "Support",
    title: "Contact support",
    intro:
      "Describe the case as clearly as possible. The message will include app, project and page context.",
    category: "What is this about?",
    urgency: "Urgency",
    area: "Area / platform",
    subject: "Short subject",
    subjectPlaceholder: "E.g. I cannot connect Instagram",
    message: "Describe the problem or question",
    messagePlaceholder: "What happened? What did you try? What message do you see?",
    expected: "What should happen?",
    expectedPlaceholder: "E.g. the account should connect and appear in integrations",
    steps: "Steps to reproduce / extra context",
    stepsPlaceholder: "E.g. Dashboard → Integrations → Instagram → Connect",
    contactEmail: "Reply email",
    send: "Send request",
    sending: "Sending...",
    close: "Close",
    sent: "Support request sent. Thanks, we have the full context.",
    required: "Fill in subject, message and reply email.",
    error: "Could not send support request.",
    categories: [
      ["technical_problem", "Technical problem"],
      ["payment", "Payment, invoice or subscription"],
      ["integration", "Platform integration"],
      ["publishing", "Publishing or schedule"],
      ["ai", "AI, generation or limits"],
      ["account", "Account, login or access"],
      ["data", "Data, analytics or sync"],
      ["feature", "Feature question / idea"],
      ["other", "Other"],
    ],
    urgencies: [
      ["low", "Low - question or suggestion"],
      ["normal", "Normal - I need help"],
      ["high", "High - blocks work"],
      ["critical", "Critical - app is not working"],
    ],
    areas: [
      "Whole app",
      "Dashboard",
      "Content Studio",
      "Blog Studio",
      "Video Studio",
      "Short Studio",
      "Creative Studio",
      "Schedule",
      "Integrations",
      "Instagram",
      "Facebook",
      "LinkedIn",
      "TikTok",
      "YouTube",
      "Blog / WordPress",
      "Spotify",
      "Payments",
      "Login",
    ],
  },
};

export default function SupportWidget({
  lang = "pl",
  workspaceId = "",
  source = "ANM ContentIQ",
  userEmail = "",
}: SupportWidgetProps) {
  const t = copy[lang] || copy.pl;
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(t.categories[0][0]);
  const [urgency, setUrgency] = useState("normal");
  const [area, setArea] = useState(t.areas[0]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [expected, setExpected] = useState("");
  const [steps, setSteps] = useState("");
  const [contactEmail, setContactEmail] = useState(userEmail);
  const [status, setStatus] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  const pageUrl = useMemo(
    () => (typeof window !== "undefined" ? window.location.href : ""),
    []
  );

  async function submit() {
    setStatus(null);

    if (!subject.trim() || !message.trim() || !contactEmail.trim()) {
      setStatus({ type: "error", text: t.required });
      return;
    }

    setSending(true);

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app: "ANM ContentIQ",
          source,
          workspaceId,
          pageUrl,
          category,
          categoryLabel:
            t.categories.find(([value]) => value === category)?.[1] || category,
          urgency,
          urgencyLabel:
            t.urgencies.find(([value]) => value === urgency)?.[1] || urgency,
          area,
          subject,
          message,
          expected,
          steps,
          contactEmail,
          language: lang,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.error) {
        throw new Error(data?.error || t.error);
      }

      setStatus({ type: "ok", text: t.sent });
      setSubject("");
      setMessage("");
      setExpected("");
      setSteps("");
    } catch (error) {
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : t.error,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          right: 22,
          bottom: 22,
          zIndex: 120,
          border: "1px solid rgba(34,211,238,.45)",
          background: "#050505",
          color: "#fff",
          borderRadius: 999,
          padding: "13px 16px",
          display: "inline-flex",
          alignItems: "center",
          gap: 9,
          fontSize: 13,
          fontWeight: 900,
          boxShadow: "0 18px 48px rgba(0,0,0,.38)",
          cursor: "pointer",
        }}
      >
        <HelpCircle size={18} />
        {t.button}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 130,
            background: "rgba(0,0,0,.66)",
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            style={{
              width: "min(860px, 100%)",
              maxHeight: "92vh",
              overflow: "auto",
              borderRadius: 24,
              border: "1px solid rgba(255,255,255,.14)",
              background: "#0B0B0D",
              color: "#fff",
              boxShadow: "0 28px 80px rgba(0,0,0,.48)",
            }}
          >
            <div
              style={{
                padding: 22,
                borderBottom: "1px solid rgba(255,255,255,.10)",
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "flex-start",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 28, lineHeight: 1.05 }}>
                  {t.title}
                </h2>
                <p style={{ margin: "9px 0 0", color: "rgba(255,255,255,.68)", lineHeight: 1.55 }}>
                  {t.intro}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.close}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,.14)",
                  background: "rgba(255,255,255,.06)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 22, display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label={t.category}>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
                    {t.categories.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </Field>

                <Field label={t.urgency}>
                  <select value={urgency} onChange={(e) => setUrgency(e.target.value)} style={inputStyle}>
                    {t.urgencies.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label={t.area}>
                  <select value={area} onChange={(e) => setArea(e.target.value)} style={inputStyle}>
                    {t.areas.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </Field>

                <Field label={t.contactEmail}>
                  <input
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    type="email"
                    placeholder="email@example.com"
                    style={inputStyle}
                  />
                </Field>
              </div>

              <Field label={t.subject}>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t.subjectPlaceholder}
                  style={inputStyle}
                />
              </Field>

              <Field label={t.message}>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t.messagePlaceholder}
                  rows={6}
                  style={textareaStyle}
                />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label={t.expected}>
                  <textarea
                    value={expected}
                    onChange={(e) => setExpected(e.target.value)}
                    placeholder={t.expectedPlaceholder}
                    rows={4}
                    style={textareaStyle}
                  />
                </Field>

                <Field label={t.steps}>
                  <textarea
                    value={steps}
                    onChange={(e) => setSteps(e.target.value)}
                    placeholder={t.stepsPlaceholder}
                    rows={4}
                    style={textareaStyle}
                  />
                </Field>
              </div>

              {status && (
                <div
                  style={{
                    borderRadius: 14,
                    padding: "12px 14px",
                    border:
                      status.type === "ok"
                        ? "1px solid rgba(34,197,94,.35)"
                        : "1px solid rgba(239,68,68,.45)",
                    background:
                      status.type === "ok"
                        ? "rgba(34,197,94,.12)"
                        : "rgba(239,68,68,.12)",
                    color: status.type === "ok" ? "#86efac" : "#fca5a5",
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {status.text}
                </div>
              )}

              <button
                type="button"
                onClick={() => void submit()}
                disabled={sending}
                style={{
                  border: "none",
                  borderRadius: 16,
                  background: "#22d3ee",
                  color: "#050505",
                  padding: "14px 16px",
                  fontSize: 14,
                  fontWeight: 950,
                  display: "inline-flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 9,
                  cursor: sending ? "not-allowed" : "pointer",
                  opacity: sending ? 0.7 : 1,
                }}
              >
                <Send size={17} />
                {sending ? t.sending : t.send}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 7 }}>
      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.62)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,.14)",
  background: "rgba(255,255,255,.06)",
  color: "#fff",
  padding: "12px 13px",
  outline: "none",
  font: "inherit",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  lineHeight: 1.55,
};
