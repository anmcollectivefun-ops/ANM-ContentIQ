// app/terms/page.tsx
import { LegalBrandHeader } from "@/app/components/LegalBrandHeader";

export const metadata = {
  title: "Terms of Service / Regulamin — ANM ContentIQ",
  description:
    "Terms of Service and Regulamin for ANM ContentIQ operated by ANM Collective Sp. z o.o.",
};

const company = {
  name: "ANM Collective Sp. z o.o.",
  nip: "PL8311649267",
  regon: "5438202920000",
  phone: "572 069 851",
  website: "https://anmcollective.pl",
  appUrl: "https://contentiq.anmcollective.fun",
  email: "kontakt@anmcollective.pl",
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
    otherLangUrl: "/terms?lang=en",
    lastUpdate: "Ostatnia aktualizacja: 31 maja 2026",
    title: "Regulamin",
    subtitle: `ANM ContentIQ — ${company.appUrl}`,
    intro:
      "Niniejszy Regulamin określa zasady korzystania z platformy ANM ContentIQ, prowadzonej przez ANM Collective Sp. z o.o. Platforma umożliwia analizę contentu, łączenie kont social media, porównywanie wyników publikacji, planowanie treści oraz korzystanie z narzędzi AI do tworzenia i optymalizacji contentu.",
    note:
      "ANM ContentIQ jest aplikacją do zarządzania i analizowania contentu z wielu kanałów: Instagram, Facebook, LinkedIn, TikTok, YouTube, Spotify, blogi oraz inne źródła contentowe.",

    providerTitle: "1. Dane usługodawcy",
    providerText: "Usługodawcą i operatorem platformy ANM ContentIQ jest:",

    definitionsTitle: "2. Definicje",
    definitions: [
      "Platforma — aplikacja ANM ContentIQ dostępna pod adresem contentiq.anmcollective.fun.",
      "Użytkownik — osoba korzystająca z ANM ContentIQ, posiadająca konto w aplikacji.",
      "Konto zewnętrzne — konto użytkownika na platformie takiej jak Instagram, Facebook, LinkedIn, TikTok, YouTube, Spotify, blog, WordPress lub inna platforma contentowa.",
      "Integracja — połączenie ANM ContentIQ z kontem zewnętrznym za pomocą OAuth, API lub innego mechanizmu autoryzacji.",
      "AI — funkcje sztucznej inteligencji wykorzystywane do analizy, generowania, adaptowania i rekomendowania treści.",
    ],

    serviceTitle: "3. Opis usługi",
    serviceIntro: "ANM ContentIQ umożliwia w szczególności:",
    serviceItems: [
      "łączenie kont contentowych i social media przez oficjalne API lub inne dostępne integracje;",
      "pobieranie i analizowanie danych o publikacjach, kontach, zasięgach, wyświetleniach, interakcjach, komentarzach, zapisach, kliknięciach i innych metrykach;",
      "prezentowanie wyników z wielu platform w jednym panelu;",
      "porównywanie skuteczności contentu między platformami;",
      "tworzenie, analizowanie i adaptowanie treści z pomocą AI;",
      "generowanie hooków, wariantów postów, opisów, scenariuszy video, artykułów blogowych i outline’ów podcastów;",
      "planowanie publikacji i zarządzanie harmonogramem contentu;",
      "generowanie rekomendacji AI na podstawie wyników historycznych i aktualnych danych użytkownika.",
    ],

    conditionsTitle: "4. Warunki korzystania z platformy",
    conditionsIntro: "Aby korzystać z ANM ContentIQ, użytkownik powinien:",
    conditionsItems: [
      "mieć ukończone 18 lat;",
      "posiadać uprawnienia do kont zewnętrznych, które chce połączyć z platformą;",
      "korzystać z aplikacji zgodnie z prawem, niniejszym Regulaminem oraz regulaminami platform zewnętrznych;",
      "podawać prawdziwe i aktualne dane wymagane do korzystania z usługi;",
      "zabezpieczać dane logowania i nie udostępniać konta osobom nieuprawnionym.",
    ],

    accountTitle: "5. Konto użytkownika",
    accountParagraphs: [
      "Korzystanie z pełnych funkcji ANM ContentIQ może wymagać założenia konta użytkownika i zalogowania się do aplikacji.",
      "Użytkownik odpowiada za zachowanie poufności danych logowania oraz za wszelkie działania wykonywane z jego konta, chyba że doszło do naruszenia bezpieczeństwa niezależnego od użytkownika.",
      "W przypadku podejrzenia nieuprawnionego dostępu do konta użytkownik powinien niezwłocznie skontaktować się z usługodawcą.",
    ],

    oauthTitle: "6. Łączenie kont zewnętrznych i dostęp OAuth",
    oauthParagraphs: [
      "Użytkownik może połączyć ANM ContentIQ z wybranymi kontami zewnętrznymi, takimi jak Facebook, Instagram, LinkedIn, TikTok, YouTube, Spotify, blog lub WordPress.",
      "Połączenie odbywa się przez mechanizmy autoryzacji udostępnione przez daną platformę, w szczególności OAuth. Zakres dostępu zależy od zgód przyznanych przez użytkownika podczas autoryzacji.",
    ],
    oauthItems: [
      "ANM ContentIQ nie przechowuje haseł do kont zewnętrznych.",
      "Użytkownik może odwołać dostęp w dowolnym momencie w aplikacji lub w ustawieniach danej platformy zewnętrznej.",
      "Odłączenie integracji może ograniczyć dostępność części funkcji, takich jak automatyczna synchronizacja danych.",
      "Dostęp do danych jest wykorzystywany wyłącznie w celu świadczenia usług dostępnych w ANM ContentIQ.",
    ],

    externalDataTitle: "7. Dane z platform zewnętrznych",
    externalDataParagraphs: [
      "ANM ContentIQ może pobierać dane z platform zewnętrznych wyłącznie w zakresie udzielonych zgód i zgodnie z zasadami danej platformy.",
      "Może to obejmować dane profilu, strony, kanału lub konta, listę publikacji, filmów, postów, artykułów lub odcinków oraz wyniki publikacji, takie jak zasięg, wyświetlenia, polubienia, komentarze, udostępnienia, zapisy, kliknięcia, czas oglądania lub completion rate.",
    ],
    warning:
      "Dostępność danych zależy od API i regulaminu danej platformy. ANM ContentIQ nie gwarantuje, że każda platforma udostępni wszystkie dane lub wszystkie funkcje.",

    userContentTitle: "8. Content, treści użytkownika i prawa własności",
    userContentParagraphs: [
      "Treści tworzone, wklejane, importowane lub planowane przez użytkownika w ANM ContentIQ pozostają własnością użytkownika lub podmiotu, który posiada do nich prawa.",
      "ANM Collective Sp. z o.o. nie nabywa praw własności do treści użytkownika, danych analitycznych ani materiałów publikowanych na kontach zewnętrznych.",
      "Użytkownik oświadcza, że posiada prawa lub odpowiednie uprawnienia do treści, które dodaje do aplikacji, planuje, publikuje lub analizuje.",
    ],

    aiTitle: "9. Funkcje AI",
    aiParagraphs: [
      "ANM ContentIQ wykorzystuje narzędzia AI do tworzenia, analizowania, adaptowania i rekomendowania treści.",
      "Funkcje AI mogą obejmować generowanie postów, opisów, hooków, CTA, analizę treści przed publikacją, adaptowanie jednej treści na wiele platform, porównywanie skuteczności contentu oraz tworzenie rekomendacji na podstawie wyników publikacji.",
      "Rekomendacje AI mają charakter pomocniczy. Użytkownik samodzielnie decyduje o publikacji, wykorzystaniu lub modyfikacji treści.",
    ],
    aiNote:
      "ANM ContentIQ działa w modelu Content Learning Loop: aplikacja zna treść przygotowaną przed publikacją, a następnie porównuje ją z wynikami pobranymi z platform. Dzięki temu AI może lepiej oceniać, co działa na konkretnych kanałach.",

    publishingTitle: "10. Publikowanie i planowanie treści",
    publishingParagraphs: [
      "Jeżeli dana funkcja zostanie udostępniona, ANM ContentIQ może umożliwiać planowanie lub publikowanie treści na połączonych platformach.",
      "Publikacja treści może następować wyłącznie na podstawie działania użytkownika, jego zgody lub ustawionego przez niego harmonogramu.",
      "Użytkownik odpowiada za zgodność publikowanych treści z prawem, regulaminami platform zewnętrznych oraz prawami osób trzecich.",
    ],

    forbiddenTitle: "11. Zakazane działania",
    forbiddenIntro: "Zabrania się korzystania z ANM ContentIQ w celu:",
    forbiddenItems: [
      "naruszania prawa lub regulaminów platform zewnętrznych;",
      "publikowania treści bez wymaganych praw lub zgód;",
      "naruszania praw autorskich, znaków towarowych lub dóbr osobistych;",
      "rozpowszechniania spamu, treści szkodliwych lub wprowadzających w błąd;",
      "omijania limitów API lub zabezpieczeń platform zewnętrznych;",
      "uzyskiwania nieuprawnionego dostępu do danych innych użytkowników;",
      "zakłócania działania aplikacji lub infrastruktury technicznej.",
    ],

    availabilityTitle: "12. Dostępność usługi",
    availabilityParagraphs: [
      "ANM Collective Sp. z o.o. dokłada starań, aby ANM ContentIQ działało stabilnie i bezpiecznie, jednak nie gwarantuje nieprzerwanej ani bezbłędnej dostępności usługi.",
      "Przerwy w działaniu mogą wynikać z prac technicznych, awarii, aktualizacji, ograniczeń infrastruktury, zmian API platform zewnętrznych lub przyczyn niezależnych od usługodawcy.",
    ],

    externalPlatformsTitle: "13. Platformy zewnętrzne",
    externalPlatformsParagraphs: [
      "ANM ContentIQ korzysta z integracji z platformami zewnętrznymi, takimi jak Meta, Google, YouTube, LinkedIn, TikTok, Spotify, WordPress oraz inne narzędzia contentowe.",
      "Usługodawca nie odpowiada za działanie, dostępność, zmiany API, decyzje moderacyjne, blokady kont, ograniczenia funkcji ani inne działania podejmowane przez platformy zewnętrzne.",
      "Użytkownik zobowiązuje się przestrzegać regulaminów i zasad platform, z którymi łączy ANM ContentIQ.",
    ],

    liabilityTitle: "14. Odpowiedzialność",
    liabilityParagraphs: [
      "ANM ContentIQ jest narzędziem wspierającym analizę i tworzenie contentu. Usługodawca nie gwarantuje określonych wyników biznesowych, marketingowych, sprzedażowych, zasięgowych ani finansowych.",
      "Usługodawca nie odpowiada za decyzje użytkownika podjęte na podstawie rekomendacji AI, wyniki contentowe osiągnięte na platformach zewnętrznych, zmiany algorytmów social media, ograniczenia lub awarie API platform zewnętrznych, treści publikowane przez użytkownika ani skutki naruszenia regulaminów platform zewnętrznych przez użytkownika.",
    ],

    paymentTitle: "15. Opłaty i plany płatne",
    paymentParagraphs: [
      "ANM ContentIQ może być udostępniane bezpłatnie, testowo, w modelu subskrypcyjnym, w modelu SaaS lub na indywidualnie ustalonych warunkach komercyjnych.",
      "Szczegółowe warunki płatności, zakres funkcji, limity i okres rozliczeniowy mogą być określone w osobnej ofercie, cenniku, zamówieniu lub umowie.",
    ],

    suspensionTitle: "16. Zawieszenie lub zakończenie dostępu",
    suspensionIntro:
      "Usługodawca może czasowo ograniczyć, zawiesić lub zakończyć dostęp do konta użytkownika w przypadku:",
    suspensionItems: [
      "naruszenia Regulaminu;",
      "naruszenia prawa lub praw osób trzecich;",
      "działań zagrażających bezpieczeństwu aplikacji;",
      "nadużywania API lub integracji;",
      "braku płatności, jeśli usługa jest płatna.",
    ],

    deletionTitle: "17. Usunięcie konta i danych",
    deletionParagraphs: [
      "Użytkownik może zażądać usunięcia konta i danych w dowolnym momencie, kontaktując się z usługodawcą.",
      "W tytule wiadomości należy wpisać: Usunięcie danych — ANM ContentIQ.",
      "Dane zostaną usunięte w terminie do 30 dni, chyba że obowiązujące przepisy prawa wymagają ich dalszego przechowywania.",
    ],
    deletionPage: "Strona dotycząca usunięcia danych:",

    privacyTitle: "18. Prywatność i dane osobowe",
    privacyParagraph:
      "Zasady przetwarzania danych osobowych opisuje Polityka Prywatności.",

    changesTitle: "19. Zmiany Regulaminu",
    changesParagraph:
      "Regulamin może być aktualizowany w związku z rozwojem aplikacji, zmianami funkcji, zmianami integracji, zmianami API platform zewnętrznych lub zmianami przepisów prawa. O istotnych zmianach użytkownicy zostaną poinformowani w aplikacji lub drogą e-mailową.",

    lawTitle: "20. Prawo właściwe i spory",
    lawParagraph:
      "Regulamin podlega prawu polskiemu. Wszelkie spory będą rozstrzygane przez sąd właściwy zgodnie z obowiązującymi przepisami prawa.",

    contactTitle: "21. Kontakt",
    contactParagraph:
      "W sprawach dotyczących Regulaminu, działania platformy, konta użytkownika, integracji API lub usunięcia danych skontaktuj się z:",

    labels: {
      company: "Nazwa firmy",
      nip: "NIP",
      regon: "REGON",
      phone: "Telefon",
      email: "E-mail",
      website: "Strona internetowa",
      serviceProvider: "Usługodawca",
      home: "ANM ContentIQ",
      privacy: "Polityka prywatności",
      terms: "Regulamin",
    },
  },

  en: {
    langLabel: "🇬🇧",
    otherLang: "🇵🇱",
    otherLangUrl: "/terms?lang=pl",
    lastUpdate: "Last updated: May 31, 2026",
    title: "Terms of Service",
    subtitle: `ANM ContentIQ — ${company.appUrl}`,
    intro:
      "These Terms of Service define the rules for using the ANM ContentIQ platform operated by ANM Collective Sp. z o.o. The platform enables content analysis, social media account integrations, publication performance comparison, content planning and AI-supported content creation and optimization.",
    note:
      "ANM ContentIQ is a platform for managing and analyzing content from multiple channels, including Instagram, Facebook, LinkedIn, TikTok, YouTube, Spotify, blogs and other content sources.",

    providerTitle: "1. Service provider details",
    providerText: "The service provider and operator of ANM ContentIQ is:",

    definitionsTitle: "2. Definitions",
    definitions: [
      "Platform — the ANM ContentIQ application available at contentiq.anmcollective.fun.",
      "User — a person using ANM ContentIQ and having an account in the application.",
      "External account — a user account on a platform such as Instagram, Facebook, LinkedIn, TikTok, YouTube, Spotify, a blog, WordPress or another content platform.",
      "Integration — a connection between ANM ContentIQ and an external account using OAuth, API or another authorization mechanism.",
      "AI — artificial intelligence features used to analyze, generate, adapt and recommend content.",
    ],

    serviceTitle: "3. Service description",
    serviceIntro: "ANM ContentIQ may allow users to:",
    serviceItems: [
      "connect content and social media accounts through official APIs or other available integrations;",
      "retrieve and analyze data about publications, accounts, reach, views, interactions, comments, saves, clicks and other metrics;",
      "display results from multiple platforms in one dashboard;",
      "compare content performance across platforms;",
      "create, analyze and adapt content with AI support;",
      "generate hooks, post variants, descriptions, video scripts, blog article ideas and podcast outlines;",
      "plan publications and manage a content schedule;",
      "generate AI recommendations based on historical and current user data.",
    ],

    conditionsTitle: "4. Conditions of use",
    conditionsIntro: "To use ANM ContentIQ, the user should:",
    conditionsItems: [
      "be at least 18 years old;",
      "have the rights and permissions to connect the external accounts they use with the platform;",
      "use the application in accordance with applicable law, these Terms and the rules of external platforms;",
      "provide true and up-to-date information required to use the service;",
      "protect login credentials and not share the account with unauthorized persons.",
    ],

    accountTitle: "5. User account",
    accountParagraphs: [
      "Using the full functionality of ANM ContentIQ may require creating a user account and logging in to the application.",
      "The user is responsible for keeping login credentials confidential and for actions performed through their account, unless a security breach occurred independently of the user.",
      "If unauthorized access is suspected, the user should contact the service provider immediately.",
    ],

    oauthTitle: "6. External accounts and OAuth access",
    oauthParagraphs: [
      "The user may connect ANM ContentIQ with selected external accounts, such as Facebook, Instagram, LinkedIn, TikTok, YouTube, Spotify, a blog or WordPress.",
      "The connection is made through authorization mechanisms provided by the relevant platform, in particular OAuth. The scope of access depends on the permissions granted by the user during authorization.",
    ],
    oauthItems: [
      "ANM ContentIQ does not store passwords to external accounts.",
      "The user may revoke access at any time in the application or in the settings of the relevant external platform.",
      "Disconnecting an integration may limit the availability of certain features, such as automatic data synchronization.",
      "Data access is used only to provide the services available in ANM ContentIQ.",
    ],

    externalDataTitle: "7. Data from external platforms",
    externalDataParagraphs: [
      "ANM ContentIQ may retrieve data from external platforms only within the scope of permissions granted by the user and in accordance with the rules of the relevant platform.",
      "This may include profile, page, channel or account data, lists of publications, videos, posts, articles or episodes, as well as publication performance data such as reach, views, likes, comments, shares, saves, clicks, watch time or completion rate.",
    ],
    warning:
      "Data availability depends on the API and rules of each external platform. ANM ContentIQ does not guarantee that every platform will provide all data or all features.",

    userContentTitle: "8. User content and ownership rights",
    userContentParagraphs: [
      "Content created, pasted, imported or planned by the user in ANM ContentIQ remains the property of the user or the entity that owns the rights to such content.",
      "ANM Collective Sp. z o.o. does not acquire ownership rights to user content, analytics data or materials published on external accounts.",
      "The user confirms that they have the rights or appropriate permissions to content that they add to the application, plan, publish or analyze.",
    ],

    aiTitle: "9. AI features",
    aiParagraphs: [
      "ANM ContentIQ uses AI tools to create, analyze, adapt and recommend content.",
      "AI features may include generating posts, descriptions, hooks and CTAs, analyzing content before publication, adapting one piece of content for multiple platforms, comparing content performance and creating recommendations based on publication results.",
      "AI recommendations are supportive in nature. The user independently decides whether to publish, use or modify the content.",
    ],
    aiNote:
      "ANM ContentIQ works in a Content Learning Loop model: the application knows the content prepared before publication and then compares it with results retrieved from platforms. This helps AI evaluate what works best on specific channels.",

    publishingTitle: "10. Publishing and content planning",
    publishingParagraphs: [
      "If made available, ANM ContentIQ may allow users to plan or publish content on connected platforms.",
      "Publishing may only take place based on the user's action, consent or schedule set by the user.",
      "The user is responsible for ensuring that published content complies with the law, the rules of external platforms and third-party rights.",
    ],

    forbiddenTitle: "11. Prohibited activities",
    forbiddenIntro: "It is prohibited to use ANM ContentIQ to:",
    forbiddenItems: [
      "violate the law or the rules of external platforms;",
      "publish content without the required rights or permissions;",
      "infringe copyrights, trademarks or personal rights;",
      "distribute spam, harmful or misleading content;",
      "bypass API limits or security mechanisms of external platforms;",
      "gain unauthorized access to other users’ data;",
      "disrupt the application or technical infrastructure.",
    ],

    availabilityTitle: "12. Service availability",
    availabilityParagraphs: [
      "ANM Collective Sp. z o.o. makes efforts to keep ANM ContentIQ stable and secure, but does not guarantee uninterrupted or error-free availability of the service.",
      "Interruptions may result from maintenance, failures, updates, infrastructure limitations, changes to external platform APIs or reasons beyond the service provider’s control.",
    ],

    externalPlatformsTitle: "13. External platforms",
    externalPlatformsParagraphs: [
      "ANM ContentIQ uses integrations with external platforms such as Meta, Google, YouTube, LinkedIn, TikTok, Spotify, WordPress and other content tools.",
      "The service provider is not responsible for the operation, availability, API changes, moderation decisions, account blocks, feature limitations or other actions taken by external platforms.",
      "The user agrees to comply with the rules and terms of the platforms connected to ANM ContentIQ.",
    ],

    liabilityTitle: "14. Liability",
    liabilityParagraphs: [
      "ANM ContentIQ is a tool supporting content analysis and content creation. The service provider does not guarantee any specific business, marketing, sales, reach or financial results.",
      "The service provider is not responsible for user decisions made based on AI recommendations, content results achieved on external platforms, social media algorithm changes, API limitations or failures, content published by the user or consequences of the user violating external platform rules.",
    ],

    paymentTitle: "15. Fees and paid plans",
    paymentParagraphs: [
      "ANM ContentIQ may be provided free of charge, as a test version, in a subscription model, in a SaaS model or on individually agreed commercial terms.",
      "Detailed payment terms, feature scope, limits and billing periods may be specified in a separate offer, price list, order or agreement.",
    ],

    suspensionTitle: "16. Suspension or termination of access",
    suspensionIntro:
      "The service provider may temporarily limit, suspend or terminate access to a user account in the event of:",
    suspensionItems: [
      "violation of these Terms;",
      "violation of the law or third-party rights;",
      "actions threatening the security of the application;",
      "abuse of APIs or integrations;",
      "lack of payment if the service is paid.",
    ],

    deletionTitle: "17. Account and data deletion",
    deletionParagraphs: [
      "The user may request deletion of their account and data at any time by contacting the service provider.",
      "The email subject should be: Data deletion — ANM ContentIQ.",
      "Data will be deleted within 30 days unless applicable law requires further storage.",
    ],
    deletionPage: "Data deletion page:",

    privacyTitle: "18. Privacy and personal data",
    privacyParagraph:
      "The rules for personal data processing are described in the Privacy Policy.",

    changesTitle: "19. Changes to the Terms",
    changesParagraph:
      "These Terms may be updated due to application development, changes in features, changes in integrations, changes in external platform APIs or changes in applicable law. Users will be informed about significant changes in the application or by email.",

    lawTitle: "20. Governing law and disputes",
    lawParagraph:
      "These Terms are governed by Polish law. Any disputes will be resolved by the competent court in accordance with applicable law.",

    contactTitle: "21. Contact",
    contactParagraph:
      "For matters related to these Terms, the platform, user account, API integrations or data deletion, please contact:",

    labels: {
      company: "Company name",
      nip: "Tax ID / NIP",
      regon: "REGON",
      phone: "Phone",
      email: "Email",
      website: "Company website",
      serviceProvider: "Service provider",
      home: "ANM ContentIQ",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
    },
  },
};

export default async function TermsPage({ searchParams }: PageProps) {
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

  .warning {
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

        <h2>{t.providerTitle}</h2>
        <p>{t.providerText}</p>

        <div className="data-grid">
          <div className="data-item">
            <span className="data-label">{t.labels.company}</span>
            <span className="data-value">{company.name}</span>
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

        <h2>{t.definitionsTitle}</h2>
        <ul>
          {t.definitions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2>{t.serviceTitle}</h2>
        <p>{t.serviceIntro}</p>
        <ul>
          {t.serviceItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2>{t.conditionsTitle}</h2>
        <p>{t.conditionsIntro}</p>
        <ul>
          {t.conditionsItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2>{t.accountTitle}</h2>
        {t.accountParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        <h2>{t.oauthTitle}</h2>
        {t.oauthParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <ul>
          {t.oauthItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2>{t.externalDataTitle}</h2>
        {t.externalDataParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <div className="warning">{t.warning}</div>

        <h2>{t.userContentTitle}</h2>
        {t.userContentParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        <h2>{t.aiTitle}</h2>
        {t.aiParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <div className="note">{t.aiNote}</div>

        <h2>{t.publishingTitle}</h2>
        {t.publishingParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        <h2>{t.forbiddenTitle}</h2>
        <p>{t.forbiddenIntro}</p>
        <ul>
          {t.forbiddenItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2>{t.availabilityTitle}</h2>
        {t.availabilityParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        <h2>{t.externalPlatformsTitle}</h2>
        {t.externalPlatformsParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        <h2>{t.liabilityTitle}</h2>
        {t.liabilityParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        <h2>{t.paymentTitle}</h2>
        {t.paymentParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        <h2>{t.suspensionTitle}</h2>
        <p>{t.suspensionIntro}</p>
        <ul>
          {t.suspensionItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

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

        <h2>{t.privacyTitle}</h2>
        <p>{t.privacyParagraph}</p>
        <p>
          <a href={`${company.appUrl}/privacy?lang=${lang}`}>
            {company.appUrl}/privacy?lang={lang}
          </a>
        </p>

        <h2>{t.changesTitle}</h2>
        <p>{t.changesParagraph}</p>

        <h2>{t.lawTitle}</h2>
        <p>{t.lawParagraph}</p>

        <h2>{t.contactTitle}</h2>
        <p>{t.contactParagraph}</p>

        <div className="data-grid">
          <div className="data-item">
            <span className="data-label">{t.labels.serviceProvider}</span>
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
          {company.name} · NIP: {company.nip} · REGON: {company.regon} ·{" "}
          <a href={`mailto:${company.email}`}>{company.email}</a> ·{" "}
          <a href={company.website} target="_blank" rel="noopener noreferrer">
            anmcollective.pl
          </a>{" "}
          · ANM ContentIQ:{" "}
          <a href={company.appUrl} target="_blank" rel="noopener noreferrer">
            contentiq.anmcollective.fun
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