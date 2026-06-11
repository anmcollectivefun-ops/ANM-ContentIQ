import Link from "next/link";

type Lang = "en" | "pl";

type PageProps = {
  searchParams?: {
    lang?: string;
  };
};

const copy = {
  en: {
    otherFlag: "🇵🇱",
    otherHref: "/oembed-demo?lang=pl",
    switchLabel: "Switch to Polish",
    privacyHref: "/privacy",
    termsHref: "/terms",
    backHome: "Back to website",
    eyebrow: "Meta App Review Demo",
    title: "oEmbed previews for public social content",
    intro:
      "ANM ContentIQ uses oEmbed Read to display embedded previews of public Facebook, Instagram or Threads content inside a user's private content workspace. Users can paste public post URLs and save those examples as research, inspiration and planning material for their own original content.",
    step1Title: "1. User pastes a public URL",
    step1Text:
      "The user adds a public Facebook, Instagram or Threads post URL to their private workspace.",
    step2Title: "2. ContentIQ displays a preview",
    step2Text:
      "The app uses oEmbed to show a public embedded preview without accessing private content.",
    step3Title: "3. User plans original content",
    step3Text:
      "The preview is used for inspiration, research, format comparison and content planning.",
    testTitle: "Example test area",
    testText:
      "In the production workspace, this area displays the embedded preview returned by oEmbed for a public post URL provided by the user. For review purposes, this page explains the user flow and the intended use of the permission.",
    placeholderTitle: "Public post preview placeholder",
    placeholderText:
      "A reviewer can test this use case by providing a public Threads, Facebook or Instagram post URL. The app will use oEmbed only to display the public preview inside the user's workspace.",
    apiTitle: "API test endpoint",
    apiText:
      "The application also includes a server-side test endpoint that calls Meta oEmbed with the app credentials stored securely in environment variables.",
    apiExample:
      "/api/meta/oembed-test?url=https://www.threads.net/@public_profile/post/public_post_id",
    notDoTitle: "What ANM ContentIQ does not do",
    notDo: [
      "It does not access private content.",
      "It does not scrape private user data.",
      "It does not republish embedded content automatically.",
      "It does not post anything without user action.",
      "It does not use oEmbed to identify private users.",
    ],
    footer: "ANM ContentIQ by ANM Collective sp. z o.o.",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
  },
  pl: {
    otherFlag: "🇬🇧",
    otherHref: "/oembed-demo",
    switchLabel: "Switch to English",
    privacyHref: "/privacy?lang=pl",
    termsHref: "/terms?lang=pl",
    backHome: "Wróć na stronę",
    eyebrow: "Demo dla Meta App Review",
    title: "Podgląd publicznych treści social media przez oEmbed",
    intro:
      "ANM ContentIQ używa oEmbed Read do wyświetlania osadzonych podglądów publicznych treści z Facebooka, Instagrama lub Threads w prywatnym workspace użytkownika. Użytkownik może wkleić publiczny link do posta i zapisać taki przykład jako research, inspirację oraz materiał do planowania własnych, oryginalnych treści.",
    step1Title: "1. Użytkownik wkleja publiczny URL",
    step1Text:
      "Użytkownik dodaje publiczny link do posta z Facebooka, Instagrama lub Threads do swojego prywatnego workspace.",
    step2Title: "2. ContentIQ pokazuje podgląd",
    step2Text:
      "Aplikacja używa oEmbed, żeby pokazać publiczny podgląd osadzonego posta bez dostępu do prywatnych treści.",
    step3Title: "3. Użytkownik planuje własny content",
    step3Text:
      "Podgląd służy jako inspiracja, research, porównanie formatów i pomoc w planowaniu treści.",
    testTitle: "Obszar testowy",
    testText:
      "W produkcyjnym workspace w tym miejscu aplikacja wyświetla osadzony podgląd zwrócony przez oEmbed dla publicznego linku podanego przez użytkownika. Na potrzeby recenzji ta strona pokazuje przepływ użytkownika i cel użycia uprawnienia.",
    placeholderTitle: "Miejsce na publiczny podgląd posta",
    placeholderText:
      "Recenzent może przetestować ten przypadek, podając publiczny link do posta z Threads, Facebooka lub Instagrama. Aplikacja używa oEmbed wyłącznie do pokazania publicznego podglądu w workspace użytkownika.",
    apiTitle: "Endpoint testowy API",
    apiText:
      "Aplikacja zawiera również serwerowy endpoint testowy, który wywołuje Meta oEmbed z użyciem danych aplikacji zapisanych bezpiecznie w zmiennych środowiskowych.",
    apiExample:
      "/api/meta/oembed-test?url=https://www.threads.net/@public_profile/post/public_post_id",
    notDoTitle: "Czego ANM ContentIQ nie robi",
    notDo: [
      "Nie uzyskuje dostępu do prywatnych treści.",
      "Nie scrapuje prywatnych danych użytkowników.",
      "Nie publikuje automatycznie osadzonych treści.",
      "Nie publikuje niczego bez działania użytkownika.",
      "Nie używa oEmbed do identyfikowania prywatnych użytkowników.",
    ],
    footer: "ANM ContentIQ by ANM Collective sp. z o.o.",
    privacy: "Polityka prywatności",
    terms: "Regulamin",
  },
};

export const metadata = {
  title: "oEmbed Demo — ANM ContentIQ",
  description:
    "Demo page showing how ANM ContentIQ uses oEmbed previews for public social content.",
};

export default function OEmbedDemoPage({ searchParams }: PageProps) {
  const lang: Lang = searchParams?.lang === "pl" ? "pl" : "en";
  const t = copy[lang];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0B1020",
        color: "#ffffff",
        padding: "48px 22px",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          display: "grid",
          gap: 24,
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 18,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href={`/${lang === "pl" ? "?lang=pl" : ""}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              color: "#ffffff",
              textDecoration: "none",
            }}
          >
            <img
              src="/ANM_ContentIQ_.JPG"
              alt="ANM ContentIQ"
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                objectFit: "cover",
              }}
            />

            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                ANM ContentIQ
              </div>

              <div
                style={{
                  marginTop: 5,
                  color: "rgba(255,255,255,.56)",
                  fontSize: 12,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                }}
              >
                oEmbed demo
              </div>
            </div>
          </Link>

          <nav
            style={{
              display: "inline-flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href={t.otherHref}
              aria-label={t.switchLabel}
              style={{
                display: "inline-flex",
                minWidth: 44,
                minHeight: 38,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.14)",
                background: "rgba(255,255,255,.06)",
                color: "#ffffff",
                textDecoration: "none",
                fontSize: 20,
              }}
            >
              {t.otherFlag}
            </Link>

            <Link
              href={t.privacyHref}
              style={{
                color: "rgba(255,255,255,.72)",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {t.privacy}
            </Link>
          </nav>
        </header>

        <section
          style={{
            background: "rgba(255,255,255,.055)",
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: 28,
            padding: 28,
            boxShadow: "0 24px 80px rgba(0,0,0,.35)",
          }}
        >
          <p
            style={{
              margin: "0 0 10px",
              color: "#D8B4FE",
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: ".12em",
              textTransform: "uppercase",
            }}
          >
            {t.eyebrow}
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(34px, 6vw, 58px)",
              lineHeight: 0.98,
              maxWidth: 780,
            }}
          >
            {t.title}
          </h1>

          <p
            style={{
              margin: "18px 0 0",
              color: "rgba(255,255,255,.72)",
              fontSize: 16,
              lineHeight: 1.75,
              maxWidth: 820,
            }}
          >
            {t.intro}
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 14,
          }}
        >
          {[
            {
              title: t.step1Title,
              text: t.step1Text,
            },
            {
              title: t.step2Title,
              text: t.step2Text,
            },
            {
              title: t.step3Title,
              text: t.step3Text,
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: "rgba(255,255,255,.045)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 22,
                padding: 20,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  lineHeight: 1.2,
                }}
              >
                {item.title}
              </h2>

              <p
                style={{
                  margin: "10px 0 0",
                  color: "rgba(255,255,255,.68)",
                  fontSize: 13,
                  lineHeight: 1.65,
                }}
              >
                {item.text}
              </p>
            </div>
          ))}
        </section>

        <section
          style={{
            background: "rgba(255,255,255,.055)",
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: 28,
            padding: 24,
          }}
        >
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: 26,
            }}
          >
            {t.testTitle}
          </h2>

          <p
            style={{
              margin: "0 0 18px",
              color: "rgba(255,255,255,.68)",
              lineHeight: 1.7,
            }}
          >
            {t.testText}
          </p>

          <div
            style={{
              border: "1px dashed rgba(216,180,254,.55)",
              borderRadius: 22,
              padding: 22,
              background: "rgba(216,180,254,.08)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#D8B4FE",
                fontWeight: 900,
              }}
            >
              {t.placeholderTitle}
            </p>

            <p
              style={{
                margin: "10px 0 0",
                color: "rgba(255,255,255,.72)",
                lineHeight: 1.7,
              }}
            >
              {t.placeholderText}
            </p>
          </div>
        </section>

        <section
          style={{
            background: "rgba(34,197,94,.08)",
            border: "1px solid rgba(34,197,94,.28)",
            borderRadius: 24,
            padding: 22,
          }}
        >
          <h2
            style={{
              margin: "0 0 10px",
              color: "#86EFAC",
              fontSize: 22,
            }}
          >
            {t.apiTitle}
          </h2>

          <p
            style={{
              margin: "0 0 14px",
              color: "rgba(255,255,255,.72)",
              lineHeight: 1.7,
            }}
          >
            {t.apiText}
          </p>

          <code
            style={{
              display: "block",
              whiteSpace: "normal",
              wordBreak: "break-word",
              background: "rgba(0,0,0,.24)",
              border: "1px solid rgba(255,255,255,.1)",
              borderRadius: 14,
              padding: 14,
              color: "#BBF7D0",
              fontSize: 13,
            }}
          >
            {t.apiExample}
          </code>
        </section>

        <section
          style={{
            background: "rgba(239,68,68,.08)",
            border: "1px solid rgba(239,68,68,.28)",
            borderRadius: 24,
            padding: 22,
          }}
        >
          <h2
            style={{
              margin: "0 0 10px",
              color: "#FCA5A5",
              fontSize: 22,
            }}
          >
            {t.notDoTitle}
          </h2>

          <ul
            style={{
              margin: 0,
              paddingLeft: 20,
              color: "rgba(255,255,255,.72)",
              lineHeight: 1.8,
            }}
          >
            {t.notDo.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <footer
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            paddingTop: 12,
            color: "rgba(255,255,255,.52)",
            fontSize: 13,
          }}
        >
          <span>{t.footer}</span>

          <span style={{ display: "inline-flex", gap: 14 }}>
            <Link
              href={t.privacyHref}
              style={{ color: "rgba(255,255,255,.72)", textDecoration: "none" }}
            >
              {t.privacy}
            </Link>

            <Link
              href={t.termsHref}
              style={{ color: "rgba(255,255,255,.72)", textDecoration: "none" }}
            >
              {t.terms}
            </Link>
          </span>
        </footer>
      </div>
    </main>
  );
}