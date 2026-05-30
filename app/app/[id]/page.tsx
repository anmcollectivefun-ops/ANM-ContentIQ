"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

const tabs = [
  "Dashboard",
  "Content Studio",
  "Kalendarz",
  "AI Analiza",
  "Influencer Planner",
  "Konkurencja",
  "Blog & SEO",
  "Integracje",
  "Ustawienia",
];

const dashboardCards = [
  { label: "Content Score", value: "87/100", note: "+12% miesiąc do miesiąca" },
  { label: "Publikacje", value: "42", note: "w tym miesiącu" },
  { label: "Współprace", value: "6", note: "3 do akceptacji" },
  { label: "Leadów z contentu", value: "18", note: "wykryte przez AI" },
];

const aiInsights = [
  "Posty edukacyjne generują najwyższe zaangażowanie i najwięcej zapisów.",
  "W kalendarzu jest za dużo publikacji sponsorowanych względem organicznych.",
  "Najlepszy potencjał mają krótkie formaty video z konkretnym problemem odbiorcy.",
  "Konkurencja częściej używa case studies — to luka contentowa do wykorzystania.",
];

const plannedPosts = [
  { date: "Poniedziałek", platform: "LinkedIn", title: "5 błędów przy wdrażaniu AI w content marketingu", status: "Szkic" },
  { date: "Wtorek", platform: "Instagram", title: "Reels: kulisy pracy nad kampanią", status: "Do nagrania" },
  { date: "Czwartek", platform: "Blog", title: "Jak analizować skuteczność contentu?", status: "Do SEO" },
  { date: "Piątek", platform: "TikTok", title: "Krótki poradnik dla twórców", status: "Zaplanowane" },
];

const collaborations = [
  { brand: "BeautyLab", scope: "1 Reels + 3 Stories", deadline: "12 czerwca", payment: "2500 zł", status: "W produkcji" },
  { brand: "EduTech", scope: "1 post LinkedIn + newsletter", deadline: "18 czerwca", payment: "1800 zł", status: "Do akceptacji" },
  { brand: "FitHome", scope: "2 TikToki", deadline: "22 czerwca", payment: "3200 zł", status: "Brief" },
];

const integrations = [
  { name: "Instagram / Facebook", status: "Do podłączenia", note: "Meta Graph API" },
  { name: "YouTube", status: "Priorytet", note: "Filmy, Shorts, analityka kanału" },
  { name: "LinkedIn", status: "Planowane", note: "Strony firmowe i B2B content" },
  { name: "TikTok", status: "Później", note: "Tryb półautomatyczny / API" },
  { name: "Blog / WordPress", status: "Planowane", note: "Artykuły, SEO, publikacja" },
  { name: "Google Analytics", status: "Planowane", note: "Ruch, konwersje, źródła" },
];

export default function AppWorkspacePage() {
  const params = useParams();
  const workspaceId = params.id;
  const [activeTab, setActiveTab] = useState("Dashboard");

  return (
    <main className="min-h-screen bg-[#070816] text-white">
      {/* ================= APP SHELL ================= */}
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        {/* ================= SIDEBAR ================= */}
        <aside className="border-r border-white/10 bg-white/[0.03] p-5">
          <Link href="/dashboard" className="mb-8 block">
            <p className="text-xl font-black">ANM ContentIQ</p>
            <p className="text-xs text-white/45">Workspace: {workspaceId}</p>
          </Link>

          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full rounded-2xl px-4 py-3 text-left text-sm transition ${
                  activeTab === tab
                    ? "bg-cyan-400 font-bold text-[#070816]"
                    : "text-white/65 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </aside>

        {/* ================= MAIN CONTENT ================= */}
        <section className="p-6 lg:p-10">
          {/* ================= TOP BAR ================= */}
          <header className="mb-8 flex flex-col justify-between gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
                {activeTab}
              </p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">
                Projekt: {String(workspaceId).replaceAll("-", " ")}
              </h1>
            </div>

            <div className="flex gap-3">
              <button className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-white/70 hover:bg-white/10">
                Eksport raportu
              </button>
              <button className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-[#070816]">
                Nowy content
              </button>
            </div>
          </header>

          {/* ================= DASHBOARD TAB ================= */}
          {activeTab === "Dashboard" && (
            <div className="space-y-8">
              <div className="grid gap-4 md:grid-cols-4">
                {dashboardCards.map((card) => (
                  <div key={card.label} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-sm text-white/50">{card.label}</p>
                    <p className="mt-2 text-3xl font-black">{card.value}</p>
                    <p className="mt-2 text-xs text-cyan-300">{card.note}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                  <h2 className="text-2xl font-black">AI Insights</h2>
                  <div className="mt-5 space-y-3">
                    {aiInsights.map((insight) => (
                      <div key={insight} className="rounded-2xl bg-white/[0.05] p-4 text-sm text-white/70">
                        {insight}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[2rem] border border-cyan-400/20 bg-cyan-400/[0.06] p-6">
                  <h2 className="text-2xl font-black">Najbliższe zadania</h2>
                  <div className="mt-5 space-y-3">
                    {plannedPosts.slice(0, 3).map((post) => (
                      <div key={post.title} className="rounded-2xl bg-white/[0.05] p-4">
                        <p className="text-sm font-bold">{post.title}</p>
                        <p className="mt-1 text-xs text-white/50">{post.date} • {post.platform} • {post.status}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= CONTENT STUDIO TAB ================= */}
          {activeTab === "Content Studio" && (
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                <h2 className="text-2xl font-black">Generator contentu AI</h2>
                <p className="mt-2 text-sm text-white/55">
                  Stwórz post, scenariusz video, opis, blog albo newsletter.
                </p>

                <div className="mt-6 space-y-4">
                  <input className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 outline-none" placeholder="Temat contentu" />
                  <select className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 outline-none">
                    <option>LinkedIn post</option>
                    <option>Instagram caption</option>
                    <option>TikTok/Reels script</option>
                    <option>Artykuł blogowy</option>
                    <option>Newsletter</option>
                  </select>
                  <textarea className="min-h-32 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 outline-none" placeholder="Cel, grupa odbiorców, styl, CTA..." />
                  <button className="w-full rounded-2xl bg-cyan-400 px-5 py-4 font-bold text-[#070816]">
                    Generuj propozycję
                  </button>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                <h2 className="text-2xl font-black">Podgląd treści</h2>
                <div className="mt-5 rounded-3xl bg-[#0e1024] p-6">
                  <p className="text-sm text-cyan-300">Propozycja AI</p>
                  <h3 className="mt-3 text-xl font-bold">
                    5 błędów, przez które content nie sprzedaje
                  </h3>
                  <p className="mt-4 text-sm leading-6 text-white/65">
                    Większość firm publikuje regularnie, ale nadal nie wie, które treści naprawdę działają.
                    Problem nie leży w samej częstotliwości, tylko w braku analizy: tematu, CTA, formatu
                    i jakości komunikatu.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ================= CALENDAR TAB ================= */}
          {activeTab === "Kalendarz" && (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-2xl font-black">Kalendarz publikacji</h2>

              <div className="mt-6 space-y-3">
                {plannedPosts.map((post) => (
                  <div key={post.title} className="grid gap-3 rounded-2xl bg-white/[0.05] p-4 md:grid-cols-[140px_140px_1fr_140px]">
                    <p className="font-bold text-cyan-300">{post.date}</p>
                    <p className="text-white/70">{post.platform}</p>
                    <p>{post.title}</p>
                    <p className="text-sm text-white/50">{post.status}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= AI ANALYTICS TAB ================= */}
          {activeTab === "AI Analiza" && (
            <div className="grid gap-6 lg:grid-cols-3">
              {["Content Score", "Predykcja wyniku", "Rekomendacje"].map((item) => (
                <div key={item} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                  <h2 className="text-xl font-black">{item}</h2>
                  <p className="mt-4 text-4xl font-black text-cyan-300">87%</p>
                  <p className="mt-4 text-sm leading-6 text-white/60">
                    AI ocenia jakość hooka, CTA, styl, dopasowanie do platformy i potencjał zaangażowania.
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ================= INFLUENCER PLANNER TAB ================= */}
          {activeTab === "Influencer Planner" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                {["Briefy", "Deadline’y", "Płatności", "Media Kit"].map((item) => (
                  <div key={item} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-sm text-white/50">{item}</p>
                    <p className="mt-2 text-2xl font-black">Aktywne</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                <h2 className="text-2xl font-black">Współprace</h2>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {collaborations.map((item) => (
                    <div key={item.brand} className="rounded-3xl bg-white/[0.05] p-5">
                      <p className="text-xl font-black">{item.brand}</p>
                      <p className="mt-2 text-sm text-white/60">{item.scope}</p>
                      <p className="mt-4 text-sm text-cyan-300">Deadline: {item.deadline}</p>
                      <p className="mt-1 text-sm text-white/50">Wynagrodzenie: {item.payment}</p>
                      <p className="mt-4 rounded-full bg-white/[0.08] px-4 py-2 text-sm">{item.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= COMPETITORS TAB ================= */}
          {activeTab === "Konkurencja" && (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-2xl font-black">Audyt konkurencji AI</h2>
              <p className="mt-2 max-w-2xl text-sm text-white/55">
                Dodawaj publiczne treści konkurencji, porównuj tematy, formaty, CTA i luki contentowe.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {["Profile konkurencji", "Porównanie treści", "Luki contentowe"].map((item) => (
                  <div key={item} className="rounded-3xl bg-white/[0.05] p-5">
                    <h3 className="text-xl font-bold">{item}</h3>
                    <p className="mt-3 text-sm text-white/55">
                      Analiza publicznych danych i ręcznie dodanych publikacji konkurencji.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= BLOG SEO TAB ================= */}
          {activeTab === "Blog & SEO" && (
            <div className="grid gap-6 lg:grid-cols-2">
              {["Generator artykułu", "SEO Content Score", "Blog → Social", "Social → Blog"].map((item) => (
                <div key={item} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                  <h2 className="text-2xl font-black">{item}</h2>
                  <p className="mt-3 text-sm leading-6 text-white/60">
                    Moduł do tworzenia, analizy i recyklingu treści blogowych w wielu kanałach.
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ================= INTEGRATIONS TAB ================= */}
          {activeTab === "Integracje" && (
            <div className="grid gap-4 md:grid-cols-3">
              {integrations.map((integration) => (
                <div key={integration.name} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                  <p className="text-xl font-black">{integration.name}</p>
                  <p className="mt-2 text-sm text-white/55">{integration.note}</p>
                  <p className="mt-5 inline-flex rounded-full bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">
                    {integration.status}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ================= SETTINGS TAB ================= */}
          {activeTab === "Ustawienia" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                <h2 className="text-2xl font-black">Brand Voice</h2>
                <p className="mt-3 text-sm text-white/60">
                  Ton marki, słowa preferowane, słowa zakazane, persony i styl komunikacji.
                </p>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                <h2 className="text-2xl font-black">Workspace</h2>
                <p className="mt-3 text-sm text-white/60">
                  Ustawienia projektu, członkowie zespołu, role i dostęp do integracji.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}