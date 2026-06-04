import Link from "next/link";

const features = [
  {
    title: "AI Content Studio",
    text: "Tworzenie postów, hooków, opisów, scenariuszy video, blogów i newsletterów.",
  },
  {
    title: "Analityka contentu",
    text: "AI analizuje treść, zasięgi, reakcje, komentarze, CTA i skuteczność publikacji.",
  },
  {
    title: "Influencer Planner",
    text: "Współprace, briefy, deadline’y, media kit, kalkulator stawek i raporty dla marek.",
  },
  {
    title: "Blog & SEO",
    text: "Generator artykułów, SEO score, blog na social media i social media na blog.",
  },
  {
    title: "Konkurencja",
    text: "Audyt publicznych treści konkurencji, porównanie komunikacji i luki contentowe.",
  },
  {
    title: "Kalendarz publikacji",
    text: "Planowanie contentu, kampanii, publikacji sponsorowanych i materiałów organicznych.",
  },
];

const platforms = [
  "Instagram",
  "Facebook",
  "LinkedIn",
  "TikTok",
  "YouTube",
  "Blog",
  "Newsletter",
  "Google Analytics",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#070816] text-white">
      {/* ================= NAVBAR ================= */}
      <header className="border-b border-white/10 bg-[#070816]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <img src="/ANM_ContentIQ_.JPG" alt="ANM ContentIQ app icon" className="h-11 w-11 rounded-xl" />
            <div>
              <p className="text-xl font-bold tracking-tight">ANM ContentIQ</p>
              <p className="text-xs text-white/50">AI Content Intelligence Platform</p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
            <a href="#features" className="hover:text-white">Funkcje</a>
            <a href="#creators" className="hover:text-white">Dla influencerów</a>
            <a href="#business" className="hover:text-white">Dla firm</a>
            <Link href="/privacy" className="hover:text-white">Polityka prywatności</Link>
            <Link href="/terms" className="hover:text-white">Regulamin</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
            <Link href="/delete-data" className="hover:text-white">Delete Data</Link>
            <Link href="/login" className="rounded-full bg-white px-5 py-2 font-semibold text-[#070816]">
              Zaloguj
            </Link>
          </nav>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <div className="mb-6 inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
            AI dla contentu, social mediów, blogów i influencerów
          </div>

          <h1 className="max-w-4xl text-5xl font-black tracking-tight md:text-7xl">
            Twórz, planuj, publikuj i analizuj content z pomocą AI.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
            ANM ContentIQ to centrum zarządzania contentem dla firm, twórców i marek osobistych.
            Łączy Content Studio, analitykę AI, kalendarz publikacji, Influencer Planner,
            blogi, SEO i analizę konkurencji w jednym miejscu.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/login"
              className="rounded-2xl bg-cyan-400 px-7 py-4 text-center font-bold text-[#070816] shadow-lg shadow-cyan-400/20"
            >
              Rozpocznij
            </Link>

            <Link
              href="/dashboard"
              className="rounded-2xl border border-white/15 px-7 py-4 text-center font-bold text-white hover:bg-white/10"
            >
              Zobacz dashboard
            </Link>
          </div>
        </div>

        {/* ================= HERO CARD ================= */}
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl">
          <div className="rounded-[1.5rem] bg-[#0e1024] p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50">Content Score</p>
                <p className="text-4xl font-black text-cyan-300">0/100</p>
              </div>
              <span className="rounded-full bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300">
                Czeka na sync
              </span>
            </div>

            <div className="space-y-4">
              {[
                "Połącz platformy, żeby zobaczyć realne publikacje.",
                "Uruchom synchronizację, żeby pobrać wyniki z API.",
                "Gdy nie ma danych, aplikacja pokazuje zera zamiast przykładowych wyników.",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm text-white/75">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
            Moduły aplikacji
          </p>
          <h2 className="mt-3 text-4xl font-black">Wszystko, czego potrzebuje content team.</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h3 className="text-xl font-bold">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/65">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= AUDIENCES ================= */}
      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-16 md:grid-cols-2">
        <div id="business" className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">Dla firm</p>
          <h2 className="mt-3 text-3xl font-black">Content, który pracuje na wyniki.</h2>
          <p className="mt-4 text-white/65">
            Analizuj wyniki social mediów, blogów i kampanii. Planuj publikacje,
            twórz raporty, porównuj się z konkurencją i wykrywaj leady z contentu.
          </p>
        </div>

        <div id="creators" className="rounded-[2rem] border border-fuchsia-400/20 bg-fuchsia-400/[0.06] p-8">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-fuchsia-300">Dla influencerów</p>
          <h2 className="mt-3 text-3xl font-black">Od briefu do raportu.</h2>
          <p className="mt-4 text-white/65">
            Zarządzaj współpracami, deadline’ami, publikacjami, płatnościami,
            media kitem i raportami kampanii w jednym plannerze AI.
          </p>
        </div>
      </section>

      {/* ================= INTEGRATIONS ================= */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-3xl font-black">Kanały i integracje</h2>

        <div className="mt-6 flex flex-wrap gap-3">
          {platforms.map((platform) => (
            <span key={platform} className="rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm text-white/75">
              {platform}
            </span>
          ))}
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-[2rem] bg-cyan-400 p-10 text-[#070816] md:p-14">
          <h2 className="text-4xl font-black">Zbuduj inteligentne centrum swojego contentu.</h2>
          <p className="mt-4 max-w-2xl text-lg text-[#070816]/75">
            ANM ContentIQ pomaga tworzyć lepsze treści, planować publikacje,
            analizować wyniki i rozwijać markę na wielu kanałach.
          </p>

          <Link
            href="/login"
            className="mt-8 inline-flex rounded-2xl bg-[#070816] px-7 py-4 font-bold text-white"
          >
            Przejdź do aplikacji
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 border-t border-white/10 px-6 py-8 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-3">
          <img src="/ANM_ContentIQ_.JPG" alt="ANM ContentIQ app icon" className="h-9 w-9 rounded-lg" />
          ANM ContentIQ
        </span>
        <div className="flex gap-5">
          <Link href="/" className="hover:text-white">Strona główna</Link>
          <Link href="/privacy" className="hover:text-white">Polityka prywatności</Link>
          <Link href="/terms" className="hover:text-white">Regulamin</Link>
          <Link href="/contact" className="hover:text-white">Contact</Link>
          <Link href="/delete-data" className="hover:text-white">Delete Data</Link>
        </div>
      </footer>
    </main>
  );
}
