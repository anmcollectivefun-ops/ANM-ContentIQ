// app/page.tsx
import Link from "next/link";

type Lang = "pl" | "en";

type PageProps = {
  searchParams?: Promise<{
    lang?: string;
  }>;
};

const content = {
  pl: {
    nav: {
      features: "Funkcje",
      creators: "Dla twórców",
      business: "Dla firm",
      integrations: "Integracje",
      privacy: "Prywatność",
      terms: "Regulamin",
      dashboard: "Dashboard",
      login: "Zaloguj",
      langOther: "EN",
      langOtherHref: "/?lang=en",
    },

    heroBadge: "✦ AI dla contentu, blogów, social mediów i strategii",
    heroTitle: "Twórz, planuj i analizuj content w jednym centrum AI.",
    heroText:
      "ANM ContentIQ łączy Content Studio, Blog Studio, AI Stratega, AI Partnera, Brand Voice, ofertę marki, integracje z platformami i harmonogram. AI nie działa w próżni — korzysta z danych, które tworzysz i synchronizujesz w aplikacji.",
    heroPrimary: "Rozpocznij pracę →",
    heroSecondary: "Zobacz dashboard",

    quickModules: [
      "Content Studio",
      "Blog Studio",
      "Short Studio",
      "AI Strateg",
      "AI Partner",
      "Brand Voice",
      "Oferta i linki",
      "Integracje",
    ],

    scoreLabel: "Content Score",
    scoreStatus: "Czeka na sync",
    scoreItems: [
      "Połącz platformy, żeby zobaczyć realne publikacje i wyniki.",
      "Uruchom synchronizację, żeby pobrać dane z API.",
      "Gdy nie ma danych, aplikacja pokazuje zera zamiast przykładowych wyników.",
    ],
    aiDataLabel: "AI działa na danych",
    aiDataText:
      "Im więcej podłączonych kont, szkiców, ofert i wpisów blogowych, tym trafniejsze rekomendacje AI w aplikacji.",

    featuresEyebrow: "Moduły aplikacji",
    featuresTitle: "Wszystko, czego potrzebuje content team.",
    featuresText:
      "Aplikacja jest centrum pracy nad treściami: od pomysłu, przez blog, social media i ofertę, po analizę wyników i plan kolejnych publikacji.",
    features: [
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
    ],

    audienceCards: [
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
    ],

    blogEyebrow: "Blog jako centrum contentu",
    blogTitle: "Jeden artykuł może zasilić cały tydzień publikacji.",
    blogText:
      "Tworzysz wpis blogowy tam, gdzie lubisz — w WordPressie, HTML albo innym narzędziu. ContentIQ może pobrać treść, pomóc ją rozwinąć i przygotować wersje pod social media, shorty, LinkedIn, Facebook, Instagram albo YouTube.",
    blogItems: [
      "Blog Studio pomaga pisać, poprawiać i rozwijać artykuły.",
      "Biblioteka bloga porządkuje szkice, inspiracje i terminy publikacji.",
      "Oferta i linki marki mówią AI, do czego content ma prowadzić.",
    ],

    integrationsEyebrow: "Kanały i integracje",
    integrationsTitle:
      "Dane z platform, kontekst z bloga i oferta w jednym miejscu.",
    platforms: [
      "Instagram",
      "Facebook",
      "LinkedIn",
      "TikTok",
      "YouTube",
      "Blog",
      "Spotify",
      "Newsletter",
    ],

    ctaEyebrow: "ANM ContentIQ",
    ctaTitle: "Zbuduj inteligentne centrum swojego contentu.",
    ctaText:
      "Twórz lepsze treści, porządkuj pomysły, planuj publikacje, analizuj wyniki i rozwijaj markę na wielu kanałach.",
    ctaPrimary: "Przejdź do aplikacji →",
    ctaSecondary: "Zobacz dashboard",

    footerMadeBy: "Stworzone z zamiłowaniem do ułatwień przez ANM Collective",
    footerHome: "Strona główna",
    footerPrivacy: "Polityka prywatności",
    footerTerms: "Regulamin",
    footerContact: "Contact",
    footerDeleteData: "Delete Data",
  },

  en: {
    nav: {
      features: "Features",
      creators: "For creators",
      business: "For businesses",
      integrations: "Integrations",
      privacy: "Privacy",
      terms: "Terms",
      dashboard: "Dashboard",
      login: "Log in",
      langOther: "PL",
      langOtherHref: "/?lang=pl",
    },

    heroBadge: "✦ AI for content, blogs, social media and strategy",
    heroTitle: "Create, plan and analyze content in one AI center.",
    heroText:
      "ANM ContentIQ combines Content Studio, Blog Studio, AI Strategist, AI Partner, Brand Voice, brand offers, platform integrations and a publishing schedule. AI does not work in isolation — it uses the data you create and synchronize in the application.",
    heroPrimary: "Start working →",
    heroSecondary: "View dashboard",

    quickModules: [
      "Content Studio",
      "Blog Studio",
      "Short Studio",
      "AI Strategist",
      "AI Partner",
      "Brand Voice",
      "Offers and links",
      "Integrations",
    ],

    scoreLabel: "Content Score",
    scoreStatus: "Waiting for sync",
    scoreItems: [
      "Connect platforms to see real publications and performance data.",
      "Run synchronization to retrieve data from APIs.",
      "When there is no data, the application shows zeros instead of sample results.",
    ],
    aiDataLabel: "AI works on data",
    aiDataText:
      "The more connected accounts, drafts, offers and blog posts you add, the more accurate AI recommendations become.",

    featuresEyebrow: "Application modules",
    featuresTitle: "Everything a content team needs.",
    featuresText:
      "The application is a content workflow center: from ideas, blogs, social media and offers to performance analysis and planning the next publications.",
    features: [
      {
        title: "AI Content Studio",
        text: "Create posts, hooks, captions, video scripts, blog-based content and ready-to-use variants for different platforms.",
      },
      {
        title: "Content analytics",
        text: "AI analyzes real results from connected accounts: reach, reactions, comments, CTAs and publication effectiveness.",
      },
      {
        title: "AI Partner and Strategist",
        text: "The content assistant uses application data, brand voice, offers, drafts and social media results.",
      },
      {
        title: "Blog Studio",
        text: "An AI writing workspace for ideas, drafts, articles, SEO, content expansion and turning blog posts into social content.",
      },
      {
        title: "Brand offers and links",
        text: "Products, applications, courses, services and landing pages become AI context, so content leads to a real business goal.",
      },
      {
        title: "Publishing calendar",
        text: "Plan content, blogs, short videos, campaigns and organic materials with the option to continue work inside the app.",
      },
    ],

    audienceCards: [
      {
        id: "business",
        eyebrow: "For businesses",
        title: "Content that supports results.",
        text: "Analyze social media, plan publications, describe your offer, create content around products and see which channels truly support sales.",
      },
      {
        id: "creators",
        eyebrow: "For creators",
        title: "More ideas, less chaos.",
        text: "Save inspirations, develop blogs, create short-form videos and use AI when you need ideas, wording or the next step.",
      },
    ],

    blogEyebrow: "Blog as a content center",
    blogTitle: "One article can power a full week of publications.",
    blogText:
      "Create a blog post wherever you prefer — in WordPress, HTML or another tool. ContentIQ can retrieve the content, help expand it and prepare versions for social media, shorts, LinkedIn, Facebook, Instagram or YouTube.",
    blogItems: [
      "Blog Studio helps write, improve and expand articles.",
      "The blog library organizes drafts, inspirations and publishing dates.",
      "Brand offers and links tell AI what the content should lead to.",
    ],

    integrationsEyebrow: "Channels and integrations",
    integrationsTitle:
      "Platform data, blog context and offers in one place.",
    platforms: [
      "Instagram",
      "Facebook",
      "LinkedIn",
      "TikTok",
      "YouTube",
      "Blog",
      "Spotify",
      "Newsletter",
    ],

    ctaEyebrow: "ANM ContentIQ",
    ctaTitle: "Build an intelligent center for your content.",
    ctaText:
      "Create better content, organize ideas, plan publications, analyze results and grow your brand across multiple channels.",
    ctaPrimary: "Go to application →",
    ctaSecondary: "View dashboard",

    footerMadeBy: "Created with care for easier workflows by ANM Collective",
    footerHome: "Home",
    footerPrivacy: "Privacy Policy",
    footerTerms: "Terms of Service",
    footerContact: "Contact",
    footerDeleteData: "Delete Data",
  },
};

export default async function LandingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const lang: Lang = params?.lang === "en" ? "en" : "pl";
  const t = content[lang];

  const privacyHref = `/privacy?lang=${lang}`;
  const termsHref = `/terms?lang=${lang}`;

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
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#1A2233]/88 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6 py-4">
            <Link href={`/?lang=${lang}`} className="flex shrink-0 items-center gap-3 no-underline">
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
                {t.nav.features}
              </a>
              <a href="#creators" className="transition hover:text-[#8E443D]">
                {t.nav.creators}
              </a>
              <a href="#business" className="transition hover:text-[#8E443D]">
                {t.nav.business}
              </a>
              <a href="#integrations" className="transition hover:text-[#8E443D]">
                {t.nav.integrations}
              </a>
              <Link href={privacyHref} className="transition hover:text-[#8E443D]">
                {t.nav.privacy}
              </Link>
              <Link href={termsHref} className="transition hover:text-[#8E443D]">
                {t.nav.terms}
              </Link>
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href={t.nav.langOtherHref}
                className="rounded-2xl border border-white/10 bg-black px-4 py-2.5 text-xs font-black text-white no-underline transition hover:border-[#8E443D]/60"
              >
                {t.nav.langOther}
              </Link>

              <Link
                href="/dashboard"
                className="hidden rounded-2xl border border-white/10 bg-black px-4 py-2.5 text-xs font-black text-white no-underline transition hover:border-[#8E443D]/60 md:inline-flex"
              >
                {t.nav.dashboard}
              </Link>

              <Link
                href="/login"
                className="rounded-2xl bg-white px-5 py-2.5 text-xs font-black text-[#050505] no-underline transition hover:opacity-90"
              >
                {t.nav.login}
              </Link>
            </div>
          </div>
        </header>

        <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-24">
          <div>
            <div className="ciq-ai-card mb-6 inline-flex rounded-full px-4 py-2 text-sm font-bold text-[#D8B4FE]">
              {t.heroBadge}
            </div>

            <h1 className="ciq-heading max-w-5xl text-5xl leading-[0.95] md:text-7xl">
              {t.heroTitle}
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[#C9CED8] md:text-lg">
              {t.heroText}
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/login"
                className="rounded-2xl bg-white px-7 py-4 text-center text-sm font-black text-[#050505] no-underline shadow-lg shadow-black/20 transition hover:opacity-90"
              >
                {t.heroPrimary}
              </Link>

              <Link
                href="/dashboard"
                className="rounded-2xl border border-white/10 bg-black px-7 py-4 text-center text-sm font-black text-white no-underline transition hover:border-[#8E443D]/60"
              >
                {t.heroSecondary}
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {t.quickModules.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs font-bold text-white/70"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="ciq-card rounded-[2rem] p-5">
            <div className="ciq-card-soft rounded-[1.5rem] p-6">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="ciq-label text-xs text-[#D8B4FE]">{t.scoreLabel}</p>
                  <p className="ciq-heading mt-2 text-5xl leading-none">0/100</p>
                </div>

                <span className="rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-4 py-2 text-xs font-black text-[#22c55e]">
                  {t.scoreStatus}
                </span>
              </div>

              <div className="space-y-4">
                {t.scoreItems.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-black p-4">
                    <p className="text-sm leading-6 text-white/75">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-purple-300/40 bg-purple-500/10 p-4">
                <p className="ciq-label mb-2 text-xs text-[#D8B4FE]">{t.aiDataLabel}</p>
                <p className="text-sm leading-6 text-white/75">{t.aiDataText}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-10">
            <p className="ciq-label text-sm text-[#8E443D]">{t.featuresEyebrow}</p>
            <h2 className="ciq-heading mt-3 text-4xl leading-tight md:text-5xl">
              {t.featuresTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#C9CED8]">
              {t.featuresText}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {t.features.map((feature) => (
              <div key={feature.title} className="ciq-card ciq-hover rounded-3xl p-6">
                <h3 className="ciq-heading text-2xl leading-tight">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-6 px-6 py-16 md:grid-cols-2">
          {t.audienceCards.map((card) => (
            <div
              key={card.id}
              id={card.id}
              className={
                card.id === "creators"
                  ? "ciq-ai-card rounded-[2rem] p-8"
                  : "ciq-card rounded-[2rem] p-8"
              }
            >
              <p
                className={
                  card.id === "creators"
                    ? "ciq-label text-sm text-[#D8B4FE]"
                    : "ciq-label text-sm text-[#8E443D]"
                }
              >
                {card.eyebrow}
              </p>
              <h2 className="ciq-heading mt-3 text-3xl leading-tight md:text-4xl">
                {card.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/65">{card.text}</p>
            </div>
          ))}
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="ciq-card grid gap-8 rounded-[2rem] p-8 md:grid-cols-[0.9fr_1.1fr] md:p-10">
            <div>
              <p className="ciq-label text-sm text-[#8E443D]">{t.blogEyebrow}</p>
              <h2 className="ciq-heading mt-3 text-4xl leading-tight">
                {t.blogTitle}
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#C9CED8]">
                {t.blogText}
              </p>
            </div>

            <div className="grid gap-4">
              {t.blogItems.map((item) => (
                <div key={item} className="ciq-card-soft rounded-2xl p-4">
                  <p className="text-sm leading-6 text-white/75">✓ {item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="integrations" className="mx-auto max-w-7xl px-6 py-16">
          <p className="ciq-label text-sm text-[#8E443D]">{t.integrationsEyebrow}</p>
          <h2 className="ciq-heading mt-3 text-4xl leading-tight">
            {t.integrationsTitle}
          </h2>

          <div className="mt-7 flex flex-wrap gap-3">
            {t.platforms.map((platform) => (
              <span
                key={platform}
                className="rounded-full border border-white/10 bg-black px-5 py-3 text-sm font-bold text-white/75"
              >
                {platform}
              </span>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="rounded-[2rem] border border-[#8E443D]/50 bg-[#8E443D] p-10 text-white shadow-2xl shadow-black/25 md:p-14">
            <p className="ciq-label text-sm text-white/80">{t.ctaEyebrow}</p>
            <h2 className="mt-3 max-w-3xl font-[var(--font-heading)] text-4xl leading-tight md:text-5xl">
              {t.ctaTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-white/80">
              {t.ctaText}
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex rounded-2xl bg-white px-7 py-4 text-sm font-black text-[#050505] no-underline"
              >
                {t.ctaPrimary}
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex rounded-2xl border border-white/25 px-7 py-4 text-sm font-black text-white no-underline"
              >
                {t.ctaSecondary}
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
            <span>{t.footerMadeBy}</span>
          </span>

          <div className="flex flex-wrap gap-5">
            <Link href={`/?lang=${lang}`} className="hover:text-white">
              {t.footerHome}
            </Link>
            <Link href={privacyHref} className="hover:text-white">
              {t.footerPrivacy}
            </Link>
            <Link href={termsHref} className="hover:text-white">
              {t.footerTerms}
            </Link>
            <Link href="/contact" className="hover:text-white">
              {t.footerContact}
            </Link>
            <Link href="/delete-data" className="hover:text-white">
              {t.footerDeleteData}
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}