import Link from "next/link";

const features = [
  {
    title: "AI Content Studio",
    text: "Tworzenie postów, hooków, opisów, scenariuszy video, treści z bloga i gotowych wariantów pod różne platformy.",
  },
  {
    title: "Analityka contentu",
    text: "AI analizuje realne wyniki z podłączonych kont: zasięgi, reakcje, komentarze, CTA i skuteczność publikacji.",
  },
  {
    title: "AI Partner i Strateg",
    text: "Asystent contentowy korzysta z danych aplikacji, brand voice, oferty, szkiców i wyników social mediów.",
  },
  {
    title: "Blog Studio",
    text: "Notatnik pisarza z AI: pomysły, szkice, artykuły, SEO, rozwijanie treści i tworzenie social contentu z wpisów.",
  },
  {
    title: "Oferta i linki marki",
    text: "Produkty, aplikacje, kursy, usługi i landing page jako kontekst dla AI, żeby content prowadził do realnego celu.",
  },
  {
    title: "Kalendarz publikacji",
    text: "Planowanie contentu, blogów, shortów, kampanii i materiałów organicznych z możliwością dalszej pracy w aplikacji.",
  },
];

const platforms = [
  "Instagram",
  "Facebook",
  "LinkedIn",
  "TikTok",
  "YouTube",
  "Blog",
  "Spotify",
  "Newsletter",
];

const audienceCards = [
  {
    id: "business",
    eyebrow: "Dla firm",
    title: "Content, który pracuje na wynik.",
    text: "Analizuj social media, planuj publikacje, opisuj ofertę, twórz treści wokół produktów i sprawdzaj, które kanały naprawdę wspierają sprzedaż.",
  },
  {
    id: "creators",
    eyebrow: "Dla twórców",
    title: "Więcej pomysłów, mniej chaosu.",
    text: "Zapisuj inspiracje, rozwijaj blogi, twórz shorty i korzystaj z AI wtedy, kiedy brakuje pomysłu, słów albo kolejnego kroku.",
  },
];

const quickModules = [
  "Content Studio",
  "Blog Studio",
  "Short Studio",
  "AI Strateg",
  "AI Partner",
  "Brand Voice",
  "Oferta i linki",
  "Integracje",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#1A2233] text-white">
      <style>{`
        :root {
          --ciq-bg: #1A2233;
          --ciq-card: #050505;
          --ciq-card-soft: #0B0B0D;
          --ciq-accent: #8E443D;
          --ciq-ai: #D8B4FE;
          --ciq-muted: #C9CED8;
        }

        html {
          scroll-behavior: smooth;
        }

        .ciq-shell {
          background:
            radial-gradient(circle at top left, rgba(142,68,61,.24), transparent 34%),
            radial-gradient(circle at 78% 12%, rgba(168,85,247,.14), transparent 26%),
            #1A2233;
        }

        .ciq-card {
          background: #050505;
          border: 1px solid rgba(255,255,255,.10);
          box-shadow: 0 24px 60px rgba(0,0,0,.28);
        }

        .ciq-card-soft {
          background: #0B0B0D;
          border: 1px solid rgba(255,255,255,.10);
        }

        .ciq-ai-card {
          background: rgba(109,40,217,.16);
          border: 1px solid rgba(192,132,252,.55);
          box-shadow: 0 0 32px rgba(168,85,247,.22);
        }

        .ciq-hover {
          transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
        }

        .ciq-hover:hover {
          transform: translateY(-3px);
          border-color: rgba(142,68,61,.55);
          box-shadow: 0 28px 70px rgba(0,0,0,.36);
        }

        .ciq-heading {
          font-family: var(--font-heading), "Playfair Display", serif;
          color: #8E443D;
          font-weight: 500;
          letter-spacing: -0.03em;
        }

        .ciq-label {
          font-family: var(--font-label), "Cormorant Garamond", serif;
          letter-spacing: .14em;
          text-transform: uppercase;
          font-weight: 900;
        }

        .ciq-body {
          font-family: var(--font-body), "Montserrat", system-ui, sans-serif;
        }
      `}</style>

      <div className="ciq-shell min-h-screen ciq-body">
        {/* ================= NAVBAR ================= */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#1A2233]/88 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6 py-4">
            <Link href="/" className="flex shrink-0 items-center gap-3 no-underline">
              <img
                src="/ANM_ContentIQ_.JPG"
                alt="ANM ContentIQ app icon"
                className="h-11 w-11 rounded-2xl border border-white/10 object-cover"
              />
              <div>
                <p className="ciq-heading text-[22px] leading-none">ANM ContentIQ</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">
                  AI Content Intelligence
                </p>
              </div>
            </Link>

            <nav className="hidden items-center gap-5 text-xs font-bold text-white/65 lg:flex">
              <a href="#features" className="transition hover:text-[#8E443D]">
                Funkcje
              </a>
              <a href="#creators" className="transition hover:text-[#8E443D]">
                Dla twórców
              </a>
              <a href="#business" className="transition hover:text-[#8E443D]">
                Dla firm
              </a>
              <a href="#integrations" className="transition hover:text-[#8E443D]">
                Integracje
              </a>
              <Link href="/privacy" className="transition hover:text-[#8E443D]">
                Prywatność
              </Link>
              <Link href="/terms" className="transition hover:text-[#8E443D]">
                Regulamin
              </Link>
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="hidden rounded-2xl border border-white/10 bg-black px-4 py-2.5 text-xs font-black text-white no-underline transition hover:border-[#8E443D]/60 md:inline-flex"
              >
                Dashboard
              </Link>

              <Link
                href="/login"
                className="rounded-2xl bg-white px-5 py-2.5 text-xs font-black text-[#050505] no-underline transition hover:opacity-90"
              >
                Zaloguj
              </Link>
            </div>
          </div>
        </header>

        {/* ================= HERO ================= */}
        <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-24">
          <div>
            <div className="ciq-ai-card mb-6 inline-flex rounded-full px-4 py-2 text-sm font-bold text-[#D8B4FE]">
              ✦ AI dla contentu, blogów, social mediów i strategii
            </div>

            <h1 className="ciq-heading max-w-5xl text-5xl leading-[0.95] md:text-7xl">
              Twórz, planuj i analizuj content w jednym centrum AI.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[#C9CED8] md:text-lg">
              ANM ContentIQ łączy Content Studio, Blog Studio, AI Stratega,
              AI Partnera, Brand Voice, ofertę marki, integracje z platformami i
              harmonogram. AI nie działa w próżni — korzysta z danych, które
              tworzysz i synchronizujesz w aplikacji.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/login"
                className="rounded-2xl bg-white px-7 py-4 text-center text-sm font-black text-[#050505] no-underline shadow-lg shadow-black/20 transition hover:opacity-90"
              >
                Rozpocznij pracę →
              </Link>

              <Link
                href="/dashboard"
                className="rounded-2xl border border-white/10 bg-black px-7 py-4 text-center text-sm font-black text-white no-underline transition hover:border-[#8E443D]/60"
              >
                Zobacz dashboard
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {quickModules.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs font-bold text-white/70"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* ================= HERO CARD ================= */}
          <div className="ciq-card rounded-[2rem] p-5">
            <div className="ciq-card-soft rounded-[1.5rem] p-6">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="ciq-label text-xs text-[#D8B4FE]">Content Score</p>
                  <p className="ciq-heading mt-2 text-5xl leading-none">0/100</p>
                </div>

                <span className="rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-4 py-2 text-xs font-black text-[#22c55e]">
                  Czeka na sync
                </span>
              </div>

              <div className="space-y-4">
                {[
                  "Połącz platformy, żeby zobaczyć realne publikacje i wyniki.",
                  "Uruchom synchronizację, żeby pobrać dane z API.",
                  "Gdy nie ma danych, aplikacja pokazuje zera zamiast przykładowych wyników.",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-black p-4">
                    <p className="text-sm leading-6 text-white/75">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-purple-300/40 bg-purple-500/10 p-4">
                <p className="ciq-label mb-2 text-xs text-[#D8B4FE]">AI działa na danych</p>
                <p className="text-sm leading-6 text-white/75">
                  Im więcej podłączonych kont, szkiców, ofert i wpisów blogowych,
                  tym trafniejsze rekomendacje AI w aplikacji.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= FEATURES ================= */}
        <section id="features" className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-10">
            <p className="ciq-label text-sm text-[#8E443D]">Moduły aplikacji</p>
            <h2 className="ciq-heading mt-3 text-4xl leading-tight md:text-5xl">
              Wszystko, czego potrzebuje content team.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#C9CED8]">
              Aplikacja jest centrum pracy nad treściami: od pomysłu, przez blog,
              social media i ofertę, po analizę wyników i plan kolejnych publikacji.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="ciq-card ciq-hover rounded-3xl p-6">
                <h3 className="ciq-heading text-2xl leading-tight">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ================= AUDIENCES ================= */}
        <section className="mx-auto grid max-w-7xl gap-6 px-6 py-16 md:grid-cols-2">
          {audienceCards.map((card) => (
            <div
              key={card.id}
              id={card.id}
              className={card.id === "creators" ? "ciq-ai-card rounded-[2rem] p-8" : "ciq-card rounded-[2rem] p-8"}
            >
              <p className={card.id === "creators" ? "ciq-label text-sm text-[#D8B4FE]" : "ciq-label text-sm text-[#8E443D]"}>
                {card.eyebrow}
              </p>
              <h2 className="ciq-heading mt-3 text-3xl leading-tight md:text-4xl">
                {card.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/65">{card.text}</p>
            </div>
          ))}
        </section>

        {/* ================= BLOG / OFFER ================= */}
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="ciq-card grid gap-8 rounded-[2rem] p-8 md:grid-cols-[0.9fr_1.1fr] md:p-10">
            <div>
              <p className="ciq-label text-sm text-[#8E443D]">Blog jako centrum contentu</p>
              <h2 className="ciq-heading mt-3 text-4xl leading-tight">
                Jeden artykuł może zasilić cały tydzień publikacji.
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#C9CED8]">
                Tworzysz wpis blogowy tam, gdzie lubisz — w WordPressie, HTML albo
                innym narzędziu. ContentIQ może pobrać treść, pomóc ją rozwinąć i
                przygotować wersje pod social media, shorty, LinkedIn, Facebook,
                Instagram albo YouTube.
              </p>
            </div>

            <div className="grid gap-4">
              {[
                "Blog Studio pomaga pisać, poprawiać i rozwijać artykuły.",
                "Biblioteka bloga porządkuje szkice, inspiracje i terminy publikacji.",
                "Oferta i linki marki mówią AI, do czego content ma prowadzić.",
              ].map((item) => (
                <div key={item} className="ciq-card-soft rounded-2xl p-4">
                  <p className="text-sm leading-6 text-white/75">✓ {item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= INTEGRATIONS ================= */}
        <section id="integrations" className="mx-auto max-w-7xl px-6 py-16">
          <p className="ciq-label text-sm text-[#8E443D]">Kanały i integracje</p>
          <h2 className="ciq-heading mt-3 text-4xl leading-tight">
            Dane z platform, kontekst z bloga i oferta w jednym miejscu.
          </h2>

          <div className="mt-7 flex flex-wrap gap-3">
            {platforms.map((platform) => (
              <span
                key={platform}
                className="rounded-full border border-white/10 bg-black px-5 py-3 text-sm font-bold text-white/75"
              >
                {platform}
              </span>
            ))}
          </div>
        </section>

        {/* ================= CTA ================= */}
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="rounded-[2rem] border border-[#8E443D]/50 bg-[#8E443D] p-10 text-white shadow-2xl shadow-black/25 md:p-14">
            <p className="ciq-label text-sm text-white/80">ANM ContentIQ</p>
            <h2 className="mt-3 max-w-3xl font-[var(--font-heading)] text-4xl leading-tight md:text-5xl">
              Zbuduj inteligentne centrum swojego contentu.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-white/80">
              Twórz lepsze treści, porządkuj pomysły, planuj publikacje,
              analizuj wyniki i rozwijaj markę na wielu kanałach.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex rounded-2xl bg-white px-7 py-4 text-sm font-black text-[#050505] no-underline"
              >
                Przejdź do aplikacji →
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex rounded-2xl border border-white/25 px-7 py-4 text-sm font-black text-white no-underline"
              >
                Zobacz dashboard
              </Link>
            </div>
          </div>
        </section>

        <footer className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-white/10 px-6 py-8 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-3">
            <img
              src="/ANM_ContentIQ_.JPG"
              alt="ANM ContentIQ app icon"
              className="h-9 w-9 rounded-xl border border-white/10 object-cover"
            />
            <span>Stworzone z zamiłowaniem do ułatwień przez ANM Collective</span>
          </span>

          <div className="flex flex-wrap gap-5">
            <Link href="/" className="hover:text-white">
              Strona główna
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Polityka prywatności
            </Link>
            <Link href="/terms" className="hover:text-white">
              Regulamin
            </Link>
            <Link href="/contact" className="hover:text-white">
              Contact
            </Link>
            <Link href="/delete-data" className="hover:text-white">
              Delete Data
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
