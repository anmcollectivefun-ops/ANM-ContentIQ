// app/privacy/page.tsx
import { LegalBrandHeader } from "@/app/components/LegalBrandHeader";

export const metadata = {
  title: "Polityka Prywatności — ANM ContentIQ",
  description:
    "Polityka prywatności platformy ANM ContentIQ prowadzonej przez ANM Collective Sp. z o.o.",
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

export default function PrivacyPage() {
  return (
    <main
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "64px 28px 110px",
        fontFamily: "'DM Sans', system-ui, sans-serif",
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
          font-family: 'DM Serif Display', serif;
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

        .legal-brand__icon {
          width: 52px;
          height: 52px;
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

        .legal-brand__nav a,
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

        .legal-brand__nav a:hover,
        .footer-links a:hover {
          border-color: #c9a24e;
          color: #8a6a19;
          text-decoration: none;
        }

        .footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 22px;
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

      <section className="card">
        <div className="chip">Ostatnia aktualizacja: 31 maja 2026</div>

        <h1>Polityka Prywatności</h1>

        <p style={{ fontSize: 17, color: "#475569", marginTop: 0 }}>
          ANM ContentIQ — {company.appUrl}
        </p>

        <p>
          Niniejsza Polityka Prywatności opisuje zasady przetwarzania danych
          osobowych użytkowników platformy ANM ContentIQ, w tym danych
          pozyskiwanych z połączonych kont social media, blogów, kanałów video,
          podcastów oraz innych źródeł contentowych.
        </p>

        <div className="note">
          ANM ContentIQ służy do analizy contentu, porównywania wyników między
          platformami, planowania publikacji, tworzenia treści z pomocą AI oraz
          generowania rekomendacji na podstawie danych użytkownika.
        </div>

        <hr />

        <h2>1. Administrator danych</h2>

        <p>
          Administratorem danych osobowych jest{" "}
          <strong>{company.name}</strong>.
        </p>

        <div className="data-grid">
          <div className="data-item">
            <span className="data-label">Nazwa firmy</span>
            <span className="data-value">{company.name}</span>
          </div>

          <div className="data-item">
            <span className="data-label">Adres</span>
            <span className="data-value">{company.address}</span>
          </div>

          <div className="data-item">
            <span className="data-label">NIP</span>
            <span className="data-value">{company.nip}</span>
          </div>

          <div className="data-item">
            <span className="data-label">REGON</span>
            <span className="data-value">{company.regon}</span>
          </div>

          <div className="data-item">
            <span className="data-label">KRS</span>
            <span className="data-value">{company.krs}</span>
          </div>

          <div className="data-item">
            <span className="data-label">Telefon</span>
            <span className="data-value">{company.phone}</span>
          </div>

          <div className="data-item">
            <span className="data-label">E-mail</span>
            <span className="data-value">
              <a href={`mailto:${company.email}`}>{company.email}</a>
            </span>
          </div>

          <div className="data-item">
            <span className="data-label">Strona</span>
            <span className="data-value">
              <a href={company.website} target="_blank" rel="noopener noreferrer">
                anmcollective.pl
              </a>
            </span>
          </div>
        </div>

        <h2>2. Jakie dane przetwarzamy</h2>

        <p>
          W zależności od sposobu korzystania z ANM ContentIQ możemy
          przetwarzać następujące kategorie danych:
        </p>

        <ul>
          <li>
            dane konta użytkownika, takie jak adres e-mail, imię i nazwisko,
            identyfikator użytkownika oraz informacje podane podczas rejestracji;
          </li>
          <li>
            dane techniczne, takie jak adres IP, typ urządzenia, typ
            przeglądarki, logi systemowe, informacje o błędach i aktywności w
            aplikacji;
          </li>
          <li>
            dane pochodzące z połączonych kont social media i platform
            contentowych, w tym statystyki kont, wyniki publikacji, zasięgi,
            wyświetlenia, reakcje, komentarze, udostępnienia, zapisy,
            kliknięcia, retencję oraz dane analityczne;
          </li>
          <li>
            dane dotyczące treści przygotowanych w aplikacji, takie jak szkice,
            posty, warianty platformowe, harmonogramy publikacji, hooki, opisy,
            artykuły, scenariusze video i podcastów;
          </li>
          <li>
            tokeny OAuth i identyfikatory integracji niezbędne do połączenia z
            zewnętrznymi platformami;
          </li>
          <li>
            dane niezbędne do generowania rekomendacji AI, w tym dane o
            skuteczności treści, wynikach publikacji i preferencjach
            komunikacyjnych użytkownika.
          </li>
        </ul>

        <h2>3. Cele przetwarzania danych</h2>

        <p>Dane przetwarzamy w celu:</p>

        <ul>
          <li>świadczenia usługi ANM ContentIQ;</li>
          <li>umożliwienia logowania i obsługi konta użytkownika;</li>
          <li>łączenia aplikacji z wybranymi platformami zewnętrznymi;</li>
          <li>
            pobierania danych analitycznych z połączonych kont i prezentowania
            ich w panelu użytkownika;
          </li>
          <li>
            porównywania wyników contentu między platformami, takimi jak
            Instagram, Facebook, LinkedIn, TikTok, YouTube, Spotify i blog;
          </li>
          <li>
            tworzenia, analizowania i adaptowania treści przy użyciu narzędzi AI;
          </li>
          <li>
            generowania rekomendacji AI dotyczących skuteczności treści,
            formatów, hooków, tematów i platform;
          </li>
          <li>obsługi zgłoszeń, kontaktu i wsparcia technicznego;</li>
          <li>zapewnienia bezpieczeństwa aplikacji i zapobiegania nadużyciom;</li>
          <li>wypełniania obowiązków prawnych administratora.</li>
        </ul>

        <p>
          Nie sprzedajemy danych osobowych ani danych z połączonych platform
          osobom trzecim.
        </p>

        <h2>4. Podstawa prawna przetwarzania</h2>

        <p>Dane przetwarzamy na podstawie:</p>

        <ul>
          <li>
            art. 6 ust. 1 lit. b RODO — wykonanie umowy lub podjęcie działań
            przed jej zawarciem;
          </li>
          <li>
            art. 6 ust. 1 lit. a RODO — zgoda użytkownika, w szczególności w
            zakresie połączenia kont zewnętrznych przez OAuth;
          </li>
          <li>
            art. 6 ust. 1 lit. f RODO — prawnie uzasadniony interes
            administratora, taki jak bezpieczeństwo, rozwój usługi i obsługa
            zgłoszeń;
          </li>
          <li>
            art. 6 ust. 1 lit. c RODO — wypełnienie obowiązków prawnych.
          </li>
        </ul>

        <h2>5. Dane z platform Meta: Facebook i Instagram</h2>

        <p>
          Po połączeniu konta Facebook lub Instagram ANM ContentIQ może uzyskać
          dostęp do danych udostępnionych przez oficjalne API Meta, w zależności
          od zakresu zgód przyznanych przez użytkownika.
        </p>

        <p>Może to obejmować w szczególności:</p>

        <ul>
          <li>listę stron Facebook, którymi zarządza użytkownik;</li>
          <li>powiązane konta Instagram Business lub Creator;</li>
          <li>
            statystyki publikacji, takie jak zasięg, wyświetlenia, reakcje,
            komentarze, udostępnienia i zapisy;
          </li>
          <li>podstawowe dane konta lub strony wymagane do identyfikacji źródła danych;</li>
          <li>
            dane potrzebne do planowania lub publikowania treści, wyłącznie gdy
            użytkownik świadomie skorzysta z takiej funkcji.
          </li>
        </ul>

        <p>
          Dane z Meta są wykorzystywane wyłącznie do prezentowania analityki w
          panelu użytkownika, porównywania wyników treści oraz generowania
          rekomendacji AI. ANM ContentIQ nie publikuje treści na Facebooku ani
          Instagramie bez działania lub zgody użytkownika.
        </p>

        <p>
          Dostęp do aplikacji możesz odwołać w ustawieniach Facebooka:
          <br />
          <a
            href="https://www.facebook.com/settings?tab=applications"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://www.facebook.com/settings?tab=applications
          </a>
        </p>

        <h2>6. Dane z Google i YouTube</h2>

        <p>
          Po połączeniu konta Google lub YouTube ANM ContentIQ może pobierać
          dane z YouTube Data API i innych usług Google wyłącznie w zakresie
          udzielonych zgód.
        </p>

        <p>Może to obejmować:</p>

        <ul>
          <li>podstawowe informacje o kanale YouTube;</li>
          <li>listę filmów, Shorts i publikacji;</li>
          <li>
            statystyki filmów, takie jak wyświetlenia, polubienia, komentarze,
            czas oglądania, retencja i inne dane analityczne;
          </li>
          <li>dane wymagane do planowania lub publikowania treści, jeśli taka funkcja zostanie włączona.</li>
        </ul>

        <p>
          Dostęp do aplikacji możesz odwołać w ustawieniach bezpieczeństwa
          Google:
          <br />
          <a
            href="https://security.google.com/settings/security/permissions"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://security.google.com/settings/security/permissions
          </a>
        </p>

        <h2>7. Dane z LinkedIn</h2>

        <p>
          Po połączeniu konta LinkedIn ANM ContentIQ może pobierać dane
          dotyczące profilu, strony firmowej, publikacji oraz statystyk
          widocznych i udostępnionych przez LinkedIn API.
        </p>

        <p>
          Nie pobieramy prywatnych wiadomości użytkownika ani danych kontaktów,
          chyba że dana funkcja i zgoda użytkownika wyraźnie obejmowałaby taki
          zakres.
        </p>

        <h2>8. Dane z TikTok</h2>

        <p>
          Po połączeniu TikTok ANM ContentIQ może przetwarzać dane dotyczące
          konta, filmów, wyników publikacji, wyświetleń, interakcji i innych
          metryk udostępnianych przez TikTok API.
        </p>

        <p>
          Dane te służą do analizy skuteczności krótkich form video,
          porównywania wyników z innymi platformami i generowania rekomendacji
          AI.
        </p>

        <h2>9. Dane ze Spotify i podcastów</h2>

        <p>
          Po połączeniu Spotify lub narzędzi podcastowych ANM ContentIQ może
          przetwarzać dane dotyczące odcinków, opisów, statystyk odsłuchań,
          completion rate i innych metryk dostępnych przez API lub integracje.
        </p>

        <h2>10. Dane z blogów, stron internetowych i WordPress</h2>

        <p>
          Po połączeniu bloga, strony internetowej lub WordPress ANM ContentIQ
          może przetwarzać dane dotyczące artykułów, publikacji, statystyk
          wejść, źródeł ruchu, czasu na stronie i wyników SEO.
        </p>

        <h2>11. AI i analiza treści</h2>

        <p>
          ANM ContentIQ wykorzystuje narzędzia AI do generowania, analizowania i
          adaptowania treści oraz tworzenia rekomendacji contentowych.
        </p>

        <p>
          AI może analizować treści przygotowane przez użytkownika w aplikacji,
          wyniki publikacji, dane z połączonych platform oraz wcześniejsze
          skuteczności formatów, tematów i stylów komunikacji.
        </p>

        <div className="note">
          Główna zasada działania ANM ContentIQ polega na tym, że aplikacja zna
          treść przygotowaną przed publikacją, a następnie porównuje ją z
          realnymi wynikami pobranymi z platform. Dzięki temu AI może pomagać w
          określaniu, jaki typ treści działa najlepiej na konkretnej platformie.
        </div>

        <p>
          Dane użytkownika nie są sprzedawane. Dane mogą być przekazywane
          dostawcom usług technicznych i AI wyłącznie w zakresie niezbędnym do
          świadczenia usługi.
        </p>

        <h2>12. Tokeny OAuth i bezpieczeństwo integracji</h2>

        <p>
          W celu połączenia z platformami zewnętrznymi ANM ContentIQ może
          przechowywać tokeny dostępowe OAuth lub inne dane autoryzacyjne.
        </p>

        <p>
          Tokeny są przechowywane w bazie danych i używane wyłącznie do
          synchronizacji danych, odświeżania wyników, obsługi integracji oraz
          wykonywania działań zainicjowanych przez użytkownika.
        </p>

        <p>
          Użytkownik może w dowolnym momencie odłączyć integrację z poziomu
          aplikacji lub przez ustawienia danej platformy zewnętrznej.
        </p>

        <h2>13. Komu możemy udostępniać dane</h2>

        <p>
          Dane mogą być powierzane wyłącznie podmiotom, które pomagają nam
          świadczyć usługę, takim jak:
        </p>

        <ul>
          <li>dostawcy hostingu i infrastruktury aplikacji;</li>
          <li>dostawcy bazy danych i autoryzacji użytkowników;</li>
          <li>dostawcy usług AI;</li>
          <li>dostawcy narzędzi analitycznych i monitorujących błędy;</li>
          <li>platformy zewnętrzne, z którymi użytkownik połączy konto.</li>
        </ul>

        <p>
          Dane nie są udostępniane reklamodawcom ani sprzedawane podmiotom
          trzecim.
        </p>

        <h2>14. Przechowywanie danych</h2>

        <p>
          Dane są przechowywane przez okres korzystania z konta użytkownika oraz
          przez czas wymagany do realizacji obowiązków prawnych, rozliczeniowych
          lub obrony przed roszczeniami.
        </p>

        <p>
          Dane pochodzące z integracji mogą być przechowywane do czasu
          odłączenia integracji, usunięcia konta lub zgłoszenia żądania
          usunięcia danych.
        </p>

        <h2>15. Usuwanie danych</h2>

        <p>
          Użytkownik może zażądać usunięcia danych w dowolnym momencie, pisząc
          na adres:
          <br />
          <a href={`mailto:${company.email}`}>{company.email}</a>
        </p>

        <p>
          W tytule wiadomości wpisz: <strong>Usunięcie danych — ANM ContentIQ</strong>.
        </p>

        <p>
          Dane zostaną usunięte w terminie do 30 dni, chyba że obowiązujące
          przepisy prawa wymagają ich dalszego przechowywania.
        </p>

        <p>
          Formularz lub strona usunięcia danych:
          <br />
          <a href={`${company.appUrl}/delete-data`}>
            {company.appUrl}/delete-data
          </a>
        </p>

        <h2>16. Twoje prawa</h2>

        <p>Masz prawo do:</p>

        <ul>
          <li>dostępu do swoich danych;</li>
          <li>sprostowania danych;</li>
          <li>usunięcia danych;</li>
          <li>ograniczenia przetwarzania;</li>
          <li>przenoszenia danych;</li>
          <li>wniesienia sprzeciwu wobec przetwarzania;</li>
          <li>cofnięcia zgody w dowolnym momencie;</li>
          <li>wniesienia skargi do organu nadzorczego.</li>
        </ul>

        <p>
          W celu realizacji praw skontaktuj się z nami:
          <br />
          <a href={`mailto:${company.email}`}>{company.email}</a>
        </p>

        <h2>17. Cookies</h2>

        <p>
          ANM ContentIQ wykorzystuje pliki cookies i podobne technologie
          niezbędne do działania aplikacji, utrzymania sesji użytkownika,
          bezpieczeństwa logowania oraz zapamiętania preferencji.
        </p>

        <p>
          Nie używamy cookies reklamowych w celu sprzedaży danych użytkownika.
          Jeśli w przyszłości zostaną wdrożone dodatkowe narzędzia analityczne
          lub marketingowe, użytkownik zostanie o tym poinformowany zgodnie z
          obowiązującymi przepisami.
        </p>

        <h2>18. Zabezpieczenia</h2>

        <p>
          Stosujemy środki techniczne i organizacyjne mające na celu ochronę
          danych przed nieuprawnionym dostępem, utratą, zmianą lub
          nieuprawnionym ujawnieniem.
        </p>

        <p>
          Dostęp do danych jest ograniczony do osób i systemów, które potrzebują
          go do świadczenia usługi.
        </p>

        <h2>19. Zmiany Polityki Prywatności</h2>

        <p>
          Polityka Prywatności może być aktualizowana w związku z rozwojem
          aplikacji, zmianami funkcji, integracji lub przepisów prawa.
        </p>

        <p>
          O istotnych zmianach poinformujemy użytkowników w aplikacji lub drogą
          e-mailową.
        </p>

        <h2>20. Kontakt</h2>

        <p>
          W sprawach dotyczących prywatności, danych osobowych, integracji API
          lub usunięcia danych skontaktuj się z:
        </p>

        <div className="data-grid">
          <div className="data-item">
            <span className="data-label">Administrator</span>
            <span className="data-value">{company.name}</span>
          </div>

          <div className="data-item">
            <span className="data-label">E-mail</span>
            <span className="data-value">
              <a href={`mailto:${company.email}`}>{company.email}</a>
            </span>
          </div>

          <div className="data-item">
            <span className="data-label">Telefon</span>
            <span className="data-value">{company.phone}</span>
          </div>

          <div className="data-item">
            <span className="data-label">Strona</span>
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

        <div className="footer-links" aria-label="Najważniejsze linki ANM ContentIQ">
          <a href={company.appUrl}>ANM ContentIQ</a>
          <a href={`${company.appUrl}/privacy`}>Polityka prywatności</a>
          <a href={`${company.appUrl}/terms`}>Regulamin</a>
        </div>
      </section>
    </main>
  );
}
