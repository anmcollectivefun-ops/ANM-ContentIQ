// app/privacy/page.tsx
import { LegalBrandHeader } from "@/app/components/LegalBrandHeader";

export const metadata = {
  title: "Privacy Policy / Polityka Prywatności — ANM ContentIQ",
  description:
    "Privacy Policy and Polityka Prywatności for ANM ContentIQ operated by ANM Collective Sp. z o.o.",
};

const company = {
  name: "ANM Collective Sp. z o.o.",
  address: "Włodzimierz 5a, 98-105 Wodzierady, Polska",
  nip: "PL8311649267",
  regon: "54382029200000",
  krs: "0001219850",
  phone: "572 069 851",
  email: "kontakt@anmcollective.pl",
  website: "https://anmcollective.pl",
  appUrl: "https://contentiq.anmcollective.fun",
};

type Lang = "pl" | "en";

type PageProps = {
  searchParams?: Promise<{
    lang?: string;
  }>;
};

const content = {
  pl: {
    langLabel: "🇵🇱",
    otherLang: "🇬🇧",
    otherLangUrl: "/privacy?lang=en",
    lastUpdate: "Ostatnia aktualizacja: 31 maja 2026",
    title: "Polityka Prywatności",
    subtitle: `ANM ContentIQ — ${company.appUrl}`,
    intro:
      "Niniejsza Polityka Prywatności opisuje zasady przetwarzania danych osobowych użytkowników platformy ANM ContentIQ, w tym danych pozyskiwanych z połączonych kont social media, blogów, kanałów video, podcastów oraz innych źródeł contentowych.",
    note:
      "ANM ContentIQ służy do analizy contentu, porównywania wyników między platformami, planowania publikacji, tworzenia treści z pomocą AI oraz generowania rekomendacji na podstawie danych użytkownika.",

    controllerTitle: "1. Administrator danych",
    controllerText: "Administratorem danych osobowych jest",

    processedDataTitle: "2. Jakie dane przetwarzamy",
    processedDataIntro:
      "W zależności od sposobu korzystania z ANM ContentIQ możemy przetwarzać następujące kategorie danych:",
    processedDataItems: [
      "dane konta użytkownika, takie jak adres e-mail, imię i nazwisko, identyfikator użytkownika oraz informacje podane podczas rejestracji;",
      "dane techniczne, takie jak adres IP, typ urządzenia, typ przeglądarki, logi systemowe, informacje o błędach i aktywności w aplikacji;",
      "dane pochodzące z połączonych kont social media i platform contentowych, w tym statystyki kont, wyniki publikacji, zasięgi, wyświetlenia, reakcje, komentarze, udostępnienia, zapisy, kliknięcia, retencję oraz dane analityczne;",
      "dane dotyczące treści przygotowanych w aplikacji, takie jak szkice, posty, warianty platformowe, harmonogramy publikacji, hooki, opisy, artykuły, scenariusze video i podcastów;",
      "tokeny OAuth i identyfikatory integracji niezbędne do połączenia z zewnętrznymi platformami;",
      "dane niezbędne do generowania rekomendacji AI, w tym dane o skuteczności treści, wynikach publikacji i preferencjach komunikacyjnych użytkownika.",
    ],

    purposesTitle: "3. Cele przetwarzania danych",
    purposesIntro: "Dane przetwarzamy w celu:",
    purposesItems: [
      "świadczenia usługi ANM ContentIQ;",
      "umożliwienia logowania i obsługi konta użytkownika;",
      "łączenia aplikacji z wybranymi platformami zewnętrznymi;",
      "pobierania danych analitycznych z połączonych kont i prezentowania ich w panelu użytkownika;",
      "porównywania wyników contentu między platformami, takimi jak Instagram, Facebook, LinkedIn, TikTok, YouTube, Spotify i blog;",
      "tworzenia, analizowania i adaptowania treści przy użyciu narzędzi AI;",
      "generowania rekomendacji AI dotyczących skuteczności treści, formatów, hooków, tematów i platform;",
      "obsługi zgłoszeń, kontaktu i wsparcia technicznego;",
      "zapewnienia bezpieczeństwa aplikacji i zapobiegania nadużyciom;",
      "wypełniania obowiązków prawnych administratora.",
    ],
    noSale:
      "Nie sprzedajemy danych osobowych ani danych z połączonych platform osobom trzecim.",

    legalBasisTitle: "4. Podstawa prawna przetwarzania",
    legalBasisIntro: "Dane przetwarzamy na podstawie:",
    legalBasisItems: [
      "art. 6 ust. 1 lit. b RODO — wykonanie umowy lub podjęcie działań przed jej zawarciem;",
      "art. 6 ust. 1 lit. a RODO — zgoda użytkownika, w szczególności w zakresie połączenia kont zewnętrznych przez OAuth;",
      "art. 6 ust. 1 lit. f RODO — prawnie uzasadniony interes administratora, taki jak bezpieczeństwo, rozwój usługi i obsługa zgłoszeń;",
      "art. 6 ust. 1 lit. c RODO — wypełnienie obowiązków prawnych.",
    ],

    metaTitle: "5. Dane z platform Meta: Facebook i Instagram",
    metaParagraphs: [
      "Po połączeniu konta Facebook lub Instagram ANM ContentIQ może uzyskać dostęp do danych udostępnionych przez oficjalne API Meta, w zależności od zakresu zgód przyznanych przez użytkownika.",
      "Może to obejmować listę stron Facebook, którymi zarządza użytkownik, powiązane konta Instagram Business lub Creator, statystyki publikacji, podstawowe dane konta lub strony oraz dane potrzebne do planowania lub publikowania treści, wyłącznie gdy użytkownik świadomie skorzysta z takiej funkcji.",
      "Dane z Meta są wykorzystywane wyłącznie do prezentowania analityki w panelu użytkownika, porównywania wyników treści oraz generowania rekomendacji AI. ANM ContentIQ nie publikuje treści na Facebooku ani Instagramie bez działania lub zgody użytkownika.",
    ],
    revokeMeta: "Dostęp do aplikacji możesz odwołać w ustawieniach Facebooka:",

    googleTitle: "6. Dane z Google i YouTube",
    googleParagraphs: [
      "Po połączeniu konta Google lub YouTube ANM ContentIQ może pobierać dane z YouTube Data API i innych usług Google wyłącznie w zakresie udzielonych zgód.",
      "Może to obejmować podstawowe informacje o kanale YouTube, listę filmów, Shorts i publikacji, statystyki filmów, takie jak wyświetlenia, polubienia, komentarze, czas oglądania, retencja i inne dane analityczne oraz dane wymagane do planowania lub publikowania treści, jeśli taka funkcja zostanie włączona.",
    ],
    revokeGoogle:
      "Dostęp do aplikacji możesz odwołać w ustawieniach bezpieczeństwa Google:",

    linkedinTitle: "7. Dane z LinkedIn",
    linkedinParagraphs: [
      "Po połączeniu konta LinkedIn ANM ContentIQ może pobierać dane dotyczące profilu, strony firmowej, publikacji oraz statystyk widocznych i udostępnionych przez LinkedIn API.",
      "Nie pobieramy prywatnych wiadomości użytkownika ani danych kontaktów, chyba że dana funkcja i zgoda użytkownika wyraźnie obejmowałaby taki zakres.",
    ],

    tiktokTitle: "8. Dane z TikTok",
    tiktokParagraphs: [
      "Po połączeniu TikTok ANM ContentIQ może przetwarzać dane dotyczące konta, filmów, wyników publikacji, wyświetleń, interakcji i innych metryk udostępnianych przez TikTok API.",
      "Dane te służą do analizy skuteczności krótkich form video, porównywania wyników z innymi platformami i generowania rekomendacji AI.",
      "ANM ContentIQ nie publikuje treści na TikToku bez działania, zgody lub harmonogramu ustawionego przez użytkownika.",
    ],

    spotifyTitle: "9. Dane ze Spotify i podcastów",
    spotifyParagraph:
      "Po połączeniu Spotify lub narzędzi podcastowych ANM ContentIQ może przetwarzać dane dotyczące odcinków, opisów, statystyk odsłuchań, completion rate i innych metryk dostępnych przez API lub integracje.",

    blogTitle: "10. Dane z blogów, stron internetowych i WordPress",
    blogParagraph:
      "Po połączeniu bloga, strony internetowej lub WordPress ANM ContentIQ może przetwarzać dane dotyczące artykułów, publikacji, statystyk wejść, źródeł ruchu, czasu na stronie i wyników SEO.",

    aiTitle: "11. AI i analiza treści",
    aiParagraphs: [
      "ANM ContentIQ wykorzystuje narzędzia AI do generowania, analizowania i adaptowania treści oraz tworzenia rekomendacji contentowych.",
      "AI może analizować treści przygotowane przez użytkownika w aplikacji, wyniki publikacji, dane z połączonych platform oraz wcześniejsze skuteczności formatów, tematów i stylów komunikacji.",
    ],
    aiNote:
      "Główna zasada działania ANM ContentIQ polega na tym, że aplikacja zna treść przygotowaną przed publikacją, a następnie porównuje ją z realnymi wynikami pobranymi z platform. Dzięki temu AI może pomagać w określaniu, jaki typ treści działa najlepiej na konkretnej platformie.",
    aiNoSale:
      "Dane użytkownika nie są sprzedawane. Dane mogą być przekazywane dostawcom usług technicznych i AI wyłącznie w zakresie niezbędnym do świadczenia usługi.",

    oauthTitle: "12. Tokeny OAuth i bezpieczeństwo integracji",
    oauthParagraphs: [
      "W celu połączenia z platformami zewnętrznymi ANM ContentIQ może przechowywać tokeny dostępowe OAuth lub inne dane autoryzacyjne.",
      "Tokeny są przechowywane w bazie danych i używane wyłącznie do synchronizacji danych, odświeżania wyników, obsługi integracji oraz wykonywania działań zainicjowanych przez użytkownika.",
      "Użytkownik może w dowolnym momencie odłączyć integrację z poziomu aplikacji lub przez ustawienia danej platformy zewnętrznej.",
    ],

    sharingTitle: "13. Komu możemy udostępniać dane",
    sharingIntro:
      "Dane mogą być powierzane wyłącznie podmiotom, które pomagają nam świadczyć usługę, takim jak:",
    sharingItems: [
      "dostawcy hostingu i infrastruktury aplikacji;",
      "dostawcy bazy danych i autoryzacji użytkowników;",
      "dostawcy usług AI;",
      "dostawcy narzędzi analitycznych i monitorujących błędy;",
      "platformy zewnętrzne, z którymi użytkownik połączy konto.",
    ],
    sharingNoAds:
      "Dane nie są udostępniane reklamodawcom ani sprzedawane podmiotom trzecim.",

    storageTitle: "14. Przechowywanie danych",
    storageParagraphs: [
      "Dane są przechowywane przez okres korzystania z konta użytkownika oraz przez czas wymagany do realizacji obowiązków prawnych, rozliczeniowych lub obrony przed roszczeniami.",
      "Dane pochodzące z integracji mogą być przechowywane do czasu odłączenia integracji, usunięcia konta lub zgłoszenia żądania usunięcia danych.",
    ],

    deletionTitle: "15. Usuwanie danych",
    deletionParagraphs: [
      "Użytkownik może zażądać usunięcia danych w dowolnym momencie, pisząc na adres e-mail administratora.",
      "W tytule wiadomości wpisz: Usunięcie danych — ANM ContentIQ.",
      "Dane zostaną usunięte w terminie do 30 dni, chyba że obowiązujące przepisy prawa wymagają ich dalszego przechowywania.",
    ],
    deletionPage: "Formularz lub strona usunięcia danych:",

    rightsTitle: "16. Twoje prawa",
    rightsIntro: "Masz prawo do:",
    rightsItems: [
      "dostępu do swoich danych;",
      "sprostowania danych;",
      "usunięcia danych;",
      "ograniczenia przetwarzania;",
      "przenoszenia danych;",
      "wniesienia sprzeciwu wobec przetwarzania;",
      "cofnięcia zgody w dowolnym momencie;",
      "wniesienia skargi do organu nadzorczego.",
    ],
    rightsContact: "W celu realizacji praw skontaktuj się z nami:",

    cookiesTitle: "17. Cookies",
    cookiesParagraphs: [
      "ANM ContentIQ wykorzystuje pliki cookies i podobne technologie niezbędne do działania aplikacji, utrzymania sesji użytkownika, bezpieczeństwa logowania oraz zapamiętania preferencji.",
      "Nie używamy cookies reklamowych w celu sprzedaży danych użytkownika. Jeśli w przyszłości zostaną wdrożone dodatkowe narzędzia analityczne lub marketingowe, użytkownik zostanie o tym poinformowany zgodnie z obowiązującymi przepisami.",
    ],

    securityTitle: "18. Zabezpieczenia",
    securityParagraphs: [
      "Stosujemy środki techniczne i organizacyjne mające na celu ochronę danych przed nieuprawnionym dostępem, utratą, zmianą lub nieuprawnionym ujawnieniem.",
      "Dostęp do danych jest ograniczony do osób i systemów, które potrzebują go do świadczenia usługi.",
    ],

    changesTitle: "19. Zmiany Polityki Prywatności",
    changesParagraphs: [
      "Polityka Prywatności może być aktualizowana w związku z rozwojem aplikacji, zmianami funkcji, integracji lub przepisów prawa.",
      "O istotnych zmianach poinformujemy użytkowników w aplikacji lub drogą e-mailową.",
    ],

    contactTitle: "20. Kontakt",
    contactParagraph:
      "W sprawach dotyczących prywatności, danych osobowych, integracji API lub usunięcia danych skontaktuj się z:",

    labels: {
      company: "Nazwa firmy",
      address: "Adres",
      nip: "NIP",
      regon: "REGON",
      krs: "KRS",
      phone: "Telefon",
      email: "E-mail",
      website: "Strona",
      administrator: "Administrator",
      home: "ANM ContentIQ",
      privacy: "Polityka prywatności",
      terms: "Regulamin",
    },
  },

  en: {
    langLabel: "🇬🇧",
    otherLang: "🇵🇱",
    otherLangUrl: "/privacy?lang=pl",
    lastUpdate: "Last updated: May 31, 2026",
    title: "Privacy Policy",
    subtitle: `ANM ContentIQ — ${company.appUrl}`,
    intro:
      "This Privacy Policy describes how personal data of ANM ContentIQ users is processed, including data obtained from connected social media accounts, blogs, video channels, podcasts and other content sources.",
    note:
      "ANM ContentIQ is used to analyze content, compare performance across platforms, plan publications, create AI-supported content and generate recommendations based on user data.",

    controllerTitle: "1. Data controller",
    controllerText: "The controller of personal data is",

    processedDataTitle: "2. What data we process",
    processedDataIntro:
      "Depending on how ANM ContentIQ is used, we may process the following categories of data:",
    processedDataItems: [
      "user account data, such as email address, first and last name, user identifier and information provided during registration;",
      "technical data, such as IP address, device type, browser type, system logs, error information and activity in the application;",
      "data from connected social media accounts and content platforms, including account statistics, publication results, reach, views, reactions, comments, shares, saves, clicks, retention and analytics data;",
      "data related to content prepared in the application, such as drafts, posts, platform variants, publication schedules, hooks, descriptions, articles, video scripts and podcast scripts;",
      "OAuth tokens and integration identifiers necessary to connect with external platforms;",
      "data necessary to generate AI recommendations, including content performance data, publication results and user communication preferences.",
    ],

    purposesTitle: "3. Purposes of data processing",
    purposesIntro: "We process data for the following purposes:",
    purposesItems: [
      "providing the ANM ContentIQ service;",
      "enabling login and user account management;",
      "connecting the application with selected external platforms;",
      "retrieving analytics data from connected accounts and presenting it in the user dashboard;",
      "comparing content performance across platforms such as Instagram, Facebook, LinkedIn, TikTok, YouTube, Spotify and blogs;",
      "creating, analyzing and adapting content using AI tools;",
      "generating AI recommendations about content effectiveness, formats, hooks, topics and platforms;",
      "handling requests, communication and technical support;",
      "ensuring application security and preventing abuse;",
      "fulfilling the controller’s legal obligations.",
    ],
    noSale:
      "We do not sell personal data or data from connected platforms to third parties.",

    legalBasisTitle: "4. Legal basis for processing",
    legalBasisIntro: "We process data on the basis of:",
    legalBasisItems: [
      "Article 6(1)(b) GDPR — performance of a contract or taking steps prior to entering into a contract;",
      "Article 6(1)(a) GDPR — user consent, especially for connecting external accounts via OAuth;",
      "Article 6(1)(f) GDPR — the controller’s legitimate interest, such as security, service development and handling requests;",
      "Article 6(1)(c) GDPR — compliance with legal obligations.",
    ],

    metaTitle: "5. Data from Meta platforms: Facebook and Instagram",
    metaParagraphs: [
      "After connecting a Facebook or Instagram account, ANM ContentIQ may access data made available through the official Meta API, depending on the scope of permissions granted by the user.",
      "This may include Facebook Pages managed by the user, connected Instagram Business or Creator accounts, publication statistics, basic account or page data and data needed for content planning or publishing only when the user knowingly uses such a feature.",
      "Meta data is used only to display analytics in the user dashboard, compare content results and generate AI recommendations. ANM ContentIQ does not publish content on Facebook or Instagram without the user’s action or consent.",
    ],
    revokeMeta: "You can revoke application access in Facebook settings:",

    googleTitle: "6. Data from Google and YouTube",
    googleParagraphs: [
      "After connecting a Google or YouTube account, ANM ContentIQ may retrieve data from the YouTube Data API and other Google services only within the scope of permissions granted by the user.",
      "This may include basic YouTube channel information, lists of videos, Shorts and publications, video statistics such as views, likes, comments, watch time, retention and other analytics data, as well as data required for planning or publishing content if such a feature is enabled.",
    ],
    revokeGoogle: "You can revoke application access in Google security settings:",

    linkedinTitle: "7. Data from LinkedIn",
    linkedinParagraphs: [
      "After connecting a LinkedIn account, ANM ContentIQ may retrieve data related to the profile, company page, publications and statistics visible and made available through the LinkedIn API.",
      "We do not collect private user messages or contact data unless a specific feature and user consent explicitly cover such scope.",
    ],

    tiktokTitle: "8. Data from TikTok",
    tiktokParagraphs: [
      "After connecting TikTok, ANM ContentIQ may process data related to the account, videos, publication results, views, interactions and other metrics made available by the TikTok API.",
      "This data is used to analyze short-form video performance, compare results with other platforms and generate AI recommendations.",
      "ANM ContentIQ does not publish content on TikTok without the user’s action, consent or schedule set by the user.",
    ],

    spotifyTitle: "9. Data from Spotify and podcasts",
    spotifyParagraph:
      "After connecting Spotify or podcast tools, ANM ContentIQ may process data related to episodes, descriptions, listening statistics, completion rate and other metrics available through APIs or integrations.",

    blogTitle: "10. Data from blogs, websites and WordPress",
    blogParagraph:
      "After connecting a blog, website or WordPress, ANM ContentIQ may process data related to articles, publications, visit statistics, traffic sources, time on page and SEO results.",

    aiTitle: "11. AI and content analysis",
    aiParagraphs: [
      "ANM ContentIQ uses AI tools to generate, analyze and adapt content and to create content recommendations.",
      "AI may analyze content prepared by the user in the application, publication results, data from connected platforms and previous performance of formats, topics and communication styles.",
    ],
    aiNote:
      "The core principle of ANM ContentIQ is that the application knows the content prepared before publication and then compares it with real results retrieved from platforms. This allows AI to help determine what type of content works best on a specific platform.",
    aiNoSale:
      "User data is not sold. Data may be shared with technical and AI service providers only to the extent necessary to provide the service.",

    oauthTitle: "12. OAuth tokens and integration security",
    oauthParagraphs: [
      "To connect with external platforms, ANM ContentIQ may store OAuth access tokens or other authorization data.",
      "Tokens are stored in the database and used only to synchronize data, refresh results, support integrations and perform actions initiated by the user.",
      "The user may disconnect an integration at any time from within the application or through the settings of the relevant external platform.",
    ],

    sharingTitle: "13. Who we may share data with",
    sharingIntro:
      "Data may be entrusted only to entities that help us provide the service, such as:",
    sharingItems: [
      "hosting and application infrastructure providers;",
      "database and user authentication providers;",
      "AI service providers;",
      "analytics and error monitoring tool providers;",
      "external platforms connected by the user.",
    ],
    sharingNoAds:
      "Data is not shared with advertisers and is not sold to third parties.",

    storageTitle: "14. Data retention",
    storageParagraphs: [
      "Data is stored for the period of using the user account and for the time required to fulfill legal, accounting or claim-related obligations.",
      "Data from integrations may be stored until the integration is disconnected, the account is deleted or a data deletion request is submitted.",
    ],

    deletionTitle: "15. Data deletion",
    deletionParagraphs: [
      "The user may request data deletion at any time by contacting the controller by email.",
      "The email subject should be: Data deletion — ANM ContentIQ.",
      "Data will be deleted within 30 days unless applicable law requires further storage.",
    ],
    deletionPage: "Data deletion form or page:",

    rightsTitle: "16. Your rights",
    rightsIntro: "You have the right to:",
    rightsItems: [
      "access your data;",
      "rectify your data;",
      "delete your data;",
      "restrict processing;",
      "data portability;",
      "object to processing;",
      "withdraw consent at any time;",
      "lodge a complaint with a supervisory authority.",
    ],
    rightsContact: "To exercise your rights, contact us:",

    cookiesTitle: "17. Cookies",
    cookiesParagraphs: [
      "ANM ContentIQ uses cookies and similar technologies necessary for the application to work, to maintain the user session, secure login and remember preferences.",
      "We do not use advertising cookies to sell user data. If additional analytics or marketing tools are implemented in the future, users will be informed in accordance with applicable law.",
    ],

    securityTitle: "18. Security measures",
    securityParagraphs: [
      "We use technical and organizational measures to protect data against unauthorized access, loss, modification or unauthorized disclosure.",
      "Access to data is limited to persons and systems that need it to provide the service.",
    ],

    changesTitle: "19. Changes to this Privacy Policy",
    changesParagraphs: [
      "This Privacy Policy may be updated due to application development, changes in features, integrations or legal requirements.",
      "Users will be informed about significant changes in the application or by email.",
    ],

    contactTitle: "20. Contact",
    contactParagraph:
      "For matters related to privacy, personal data, API integrations or data deletion, please contact:",

    labels: {
      company: "Company name",
      address: "Address",
      nip: "Tax ID / NIP",
      regon: "REGON",
      krs: "KRS",
      phone: "Phone",
      email: "Email",
      website: "Website",
      administrator: "Controller",
      home: "ANM ContentIQ",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
    },
  },
};

export default async function PrivacyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const lang: Lang = params?.lang === "pl" ? "pl" : "en";
  const t = content[lang];

  return (
    <main
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "64px 28px 110px",
        fontFamily: "var(--font-body)",
        color: "#111827",
        lineHeight: 1.8,
      }}
    >
      <style>{`
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Serif+Display&display=swap');

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    background: #f7f7f7;
  }

  h1, h2, h3 {
    font-family: var(--font-heading);
    color: #0f172a;
    letter-spacing: -0.02em;
  }

  h1 {
    font-size: 42px;
    line-height: 1.05;
    margin: 0 0 10px;
  }

  h2 {
    font-size: 25px;
    margin: 42px 0 14px;
  }

  h3 {
    font-size: 20px;
    margin: 28px 0 10px;
  }

  p, li {
    font-size: 15px;
    color: #334155;
    margin-bottom: 12px;
  }

  ul {
    padding-left: 22px;
    margin-top: 8px;
  }

  a {
    color: #2563eb;
    text-decoration: none;
    font-weight: 600;
  }

  a:hover {
    text-decoration: underline;
  }

  hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 34px 0;
  }

  .language-switch {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin: 0 0 18px;
  }

  .language-switch a,
  .language-switch span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 42px;
    min-height: 38px;
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 20px;
    font-weight: 800;
    text-decoration: none;
  }

  .language-switch span {
    background: #111827;
    color: #ffffff;
  }

  .language-switch a {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    color: #0f172a;
  }

  .language-switch a:hover {
    border-color: #c9a24e;
    color: #8a6a19;
    text-decoration: none;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #111827;
    color: #ffffff;
    padding: 6px 13px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 22px;
  }

  .card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 22px;
    padding: 24px;
    box-shadow: 0 18px 50px rgba(15, 23, 42, 0.06);
  }

  .data-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 16px;
  }

  .data-item {
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 13px 14px;
  }

  .data-label {
    display: block;
    color: #64748b;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 4px;
  }

  .data-value {
    color: #0f172a;
    font-size: 14px;
    font-weight: 700;
  }

  .note {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #1e3a8a;
    border-radius: 16px;
    padding: 15px 16px;
    margin: 18px 0;
    font-size: 14px;
    line-height: 1.7;
  }

  .danger {
    background: #fff7ed;
    border: 1px solid #fed7aa;
    color: #7c2d12;
    border-radius: 16px;
    padding: 15px 16px;
    margin: 18px 0;
    font-size: 14px;
    line-height: 1.7;
  }

  .footer {
    color: #64748b;
    font-size: 13px;
    margin-top: 34px;
  }

  .footer-links {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 22px;
  }

  .footer-links a {
    display: inline-flex;
    align-items: center;
    min-height: 34px;
    color: #0f172a;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 800;
    text-decoration: none;
  }

  .footer-links a:hover {
    border-color: #c9a24e;
    color: #8a6a19;
    text-decoration: none;
  }

  /* LEGAL HEADER — logo + kafelki nawigacji */
  .legal-brand {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 22px;
  }

  .legal-brand__identity {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    color: #0f172a;
    text-decoration: none;
  }

  .legal-brand__identity:hover {
    text-decoration: none;
  }

  .legal-brand__icon,
  .legal-brand__identity img {
    width: 52px !important;
    height: 52px !important;
    max-width: 52px !important;
    max-height: 52px !important;
    min-width: 52px !important;
    min-height: 52px !important;
    object-fit: cover;
    border-radius: 14px;
    box-shadow: 0 10px 24px rgba(201, 162, 78, 0.2);
  }

  .legal-brand__identity strong {
    display: block;
    font-size: 18px;
    color: #0f172a;
    line-height: 1.1;
  }

  .legal-brand__identity small {
    display: block;
    margin-top: 4px;
    color: #64748b;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .legal-brand__nav {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 12px;
  }

  .legal-brand__nav a {
    display: inline-flex;
    align-items: center;
    min-height: 34px;
    color: #0f172a;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 800;
    text-decoration: none;
  }

  .legal-brand__nav a:hover {
    border-color: #c9a24e;
    color: #8a6a19;
    text-decoration: none;
  }

  @media (max-width: 720px) {
    main {
      padding: 42px 18px 80px !important;
    }

    h1 {
      font-size: 34px;
    }

    .data-grid {
      grid-template-columns: 1fr;
    }

    .language-switch {
      justify-content: flex-start;
    }

    .legal-brand {
      align-items: flex-start;
      flex-direction: column;
    }

    .legal-brand__nav {
      justify-content: flex-start;
    }
  }
`}</style>

      <LegalBrandHeader />

      <div className="language-switch" aria-label="Language switch">
        <span>{t.langLabel}</span>
        <a href={t.otherLangUrl}>{t.otherLang}</a>
      </div>

      <section className="card">
        <div className="chip">{t.lastUpdate}</div>

        <h1>{t.title}</h1>

        <p style={{ fontSize: 17, color: "#475569", marginTop: 0 }}>
          {t.subtitle}
        </p>

        <p>{t.intro}</p>

        <div className="note">{t.note}</div>

        <hr />

        <h2>{t.controllerTitle}</h2>

        <p>
          {t.controllerText} <strong>{company.name}</strong>.
        </p>

        <div className="data-grid">
          <div className="data-item">
            <span className="data-label">{t.labels.company}</span>
            <span className="data-value">{company.name}</span>
          </div>

          <div className="data-item">
            <span className="data-label">{t.labels.address}</span>
            <span className="data-value">{company.address}</span>
          </div>

          <div className="data-item">
            <span className="data-label">{t.labels.nip}</span>
            <span className="data-value">{company.nip}</span>
          </div>

          <div className="data-item">
            <span className="data-label">{t.labels.regon}</span>
            <span className="data-value">{company.regon}</span>
          </div>

          <div className="data-item">
            <span className="data-label">{t.labels.krs}</span>
            <span className="data-value">{company.krs}</span>
          </div>

          <div className="data-item">
            <span className="data-label">{t.labels.phone}</span>
            <span className="data-value">{company.phone}</span>
          </div>

          <div className="data-item">
            <span className="data-label">{t.labels.email}</span>
            <span className="data-value">
              <a href={`mailto:${company.email}`}>{company.email}</a>
            </span>
          </div>

          <div className="data-item">
            <span className="data-label">{t.labels.website}</span>
            <span className="data-value">
              <a href={company.website} target="_blank" rel="noopener noreferrer">
                anmcollective.pl
              </a>
            </span>
          </div>
        </div>

        <h2>{t.processedDataTitle}</h2>
        <p>{t.processedDataIntro}</p>
        <ul>
          {t.processedDataItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2>{t.purposesTitle}</h2>
        <p>{t.purposesIntro}</p>
        <ul>
          {t.purposesItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>{t.noSale}</p>

        <h2>{t.legalBasisTitle}</h2>
        <p>{t.legalBasisIntro}</p>
        <ul>
          {t.legalBasisItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2>{t.metaTitle}</h2>
        {t.metaParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <p>
          {t.revokeMeta}
          <br />
          <a
            href="https://www.facebook.com/settings?tab=applications"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://www.facebook.com/settings?tab=applications
          </a>
        </p>

        <h2>{t.googleTitle}</h2>
        {t.googleParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <p>
          {t.revokeGoogle}
          <br />
          <a
            href="https://security.google.com/settings/security/permissions"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://security.google.com/settings/security/permissions
          </a>
        </p>

        <h2>{t.linkedinTitle}</h2>
        {t.linkedinParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        <h2>{t.tiktokTitle}</h2>
        {t.tiktokParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        <h2>{t.spotifyTitle}</h2>
        <p>{t.spotifyParagraph}</p>

        <h2>{t.blogTitle}</h2>
        <p>{t.blogParagraph}</p>

        <h2>{t.aiTitle}</h2>
        {t.aiParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <div className="note">{t.aiNote}</div>
        <p>{t.aiNoSale}</p>

        <h2>{t.oauthTitle}</h2>
        {t.oauthParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        <h2>{t.sharingTitle}</h2>
        <p>{t.sharingIntro}</p>
        <ul>
          {t.sharingItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>{t.sharingNoAds}</p>

        <h2>{t.storageTitle}</h2>
        {t.storageParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        <h2>{t.deletionTitle}</h2>
        {t.deletionParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <p>
          {t.deletionPage}
          <br />
          <a href={`${company.appUrl}/delete-data`}>
            {company.appUrl}/delete-data
          </a>
        </p>

        <h2>{t.rightsTitle}</h2>
        <p>{t.rightsIntro}</p>
        <ul>
          {t.rightsItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>
          {t.rightsContact}
          <br />
          <a href={`mailto:${company.email}`}>{company.email}</a>
        </p>

        <h2>{t.cookiesTitle}</h2>
        {t.cookiesParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        <h2>{t.securityTitle}</h2>
        {t.securityParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        <h2>{t.changesTitle}</h2>
        {t.changesParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        <h2>{t.contactTitle}</h2>
        <p>{t.contactParagraph}</p>

        <div className="data-grid">
          <div className="data-item">
            <span className="data-label">{t.labels.administrator}</span>
            <span className="data-value">{company.name}</span>
          </div>

          <div className="data-item">
            <span className="data-label">{t.labels.email}</span>
            <span className="data-value">
              <a href={`mailto:${company.email}`}>{company.email}</a>
            </span>
          </div>

          <div className="data-item">
            <span className="data-label">{t.labels.phone}</span>
            <span className="data-value">{company.phone}</span>
          </div>

          <div className="data-item">
            <span className="data-label">{t.labels.website}</span>
            <span className="data-value">
              <a href={company.website} target="_blank" rel="noopener noreferrer">
                anmcollective.pl
              </a>
            </span>
          </div>
        </div>

        <hr />

        <p className="footer">
          {company.name} · {company.address} · NIP: {company.nip} · REGON:{" "}
          {company.regon} · KRS: {company.krs} ·{" "}
          <a href={`mailto:${company.email}`}>{company.email}</a> ·{" "}
          <a href={company.website} target="_blank" rel="noopener noreferrer">
            anmcollective.pl
          </a>
        </p>

        <div className="footer-links" aria-label="Important ANM ContentIQ links">
          <a href={`${company.appUrl}/?lang=${lang}`}>{t.labels.home}</a>
          <a href={`${company.appUrl}/privacy?lang=${lang}`}>
            {t.labels.privacy}
          </a>
          <a href={`${company.appUrl}/terms?lang=${lang}`}>{t.labels.terms}</a>
        </div>
      </section>
    </main>
  );
}