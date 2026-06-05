// app/terms/page.tsx
import { LegalBrandHeader } from "@/app/components/LegalBrandHeader";

export const metadata = {
  title: "Regulamin — ANM ContentIQ",
  description:
    "Regulamin korzystania z platformy ANM ContentIQ prowadzonej przez ANM Collective Sp. z o.o.",
};

const company = {
  name: "ANM Collective Sp. z o.o.",
  nip: "PL8311649267",
  regon: "5438202920000",
  phone: "572 059 851",
  website: "https://anmcollective.pl",
  appUrl: "https://contentiq.anmcollective.fun",
  email: "kontakt@anmcollective.pl",
};

export default function TermsPage() {
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

        <h1>Regulamin</h1>

        <p style={{ fontSize: 17, color: "#475569", marginTop: 0 }}>
          ANM ContentIQ — {company.appUrl}
        </p>

        <p>
          Niniejszy Regulamin określa zasady korzystania z platformy ANM
          ContentIQ, prowadzonej przez {company.name}. Platforma umożliwia
          analizę contentu, łączenie kont social media, porównywanie wyników
          publikacji, planowanie treści oraz korzystanie z narzędzi AI do
          tworzenia i optymalizacji contentu.
        </p>

        <div className="note">
          ANM ContentIQ jest jedną aplikacją do zarządzania i analizowania
          contentu z wielu kanałów: Instagram, Facebook, LinkedIn, TikTok,
          YouTube, Spotify, blogi oraz inne źródła contentowe.
        </div>

        <hr />

        <h2>1. Dane usługodawcy</h2>

        <p>Usługodawcą i operatorem platformy ANM ContentIQ jest:</p>

        <div className="data-grid">
          <div className="data-item">
            <span className="data-label">Nazwa firmy</span>
            <span className="data-value">{company.name}</span>
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
            <span className="data-label">Strona internetowa</span>
            <span className="data-value">
              <a href={company.website} target="_blank" rel="noopener noreferrer">
                anmcollective.pl
              </a>
            </span>
          </div>
        </div>

        <h2>2. Definicje</h2>

        <ul>
          <li>
            <strong>Platforma</strong> — aplikacja ANM ContentIQ dostępna pod
            adresem {company.appUrl}.
          </li>
          <li>
            <strong>Użytkownik</strong> — osoba korzystająca z ANM ContentIQ,
            posiadająca konto w aplikacji.
          </li>
          <li>
            <strong>Konto zewnętrzne</strong> — konto użytkownika na platformie
            takiej jak Instagram, Facebook, LinkedIn, TikTok, YouTube, Spotify,
            blog, WordPress lub inna platforma contentowa.
          </li>
          <li>
            <strong>Integracja</strong> — połączenie ANM ContentIQ z kontem
            zewnętrznym za pomocą OAuth, API lub innego mechanizmu autoryzacji.
          </li>
          <li>
            <strong>AI</strong> — funkcje sztucznej inteligencji wykorzystywane
            do analizy, generowania, adaptowania i rekomendowania treści.
          </li>
        </ul>

        <h2>3. Opis usługi</h2>

        <p>ANM ContentIQ umożliwia w szczególności:</p>

        <ul>
          <li>
            łączenie kont contentowych i social media przez oficjalne API lub
            inne dostępne integracje;
          </li>
          <li>
            pobieranie i analizowanie danych o publikacjach, kontach, zasięgach,
            wyświetleniach, interakcjach, komentarzach, zapisach i innych
            metrykach;
          </li>
          <li>
            prezentowanie wyników z wielu platform w jednym panelu;
          </li>
          <li>
            porównywanie skuteczności contentu między platformami;
          </li>
          <li>
            tworzenie, analizowanie i adaptowanie treści z pomocą AI;
          </li>
          <li>
            generowanie hooków, wariantów postów, opisów, scenariuszy video,
            artykułów blogowych i outline’ów podcastów;
          </li>
          <li>
            planowanie publikacji i zarządzanie harmonogramem contentu;
          </li>
          <li>
            generowanie rekomendacji AI na podstawie wyników historycznych i
            aktualnych danych użytkownika.
          </li>
        </ul>

        <h2>4. Warunki korzystania z platformy</h2>

        <p>Aby korzystać z ANM ContentIQ, użytkownik powinien:</p>

        <ul>
          <li>mieć ukończone 18 lat;</li>
          <li>
            posiadać uprawnienia do kont zewnętrznych, które chce połączyć z
            platformą;
          </li>
          <li>
            korzystać z aplikacji zgodnie z prawem, niniejszym Regulaminem oraz
            regulaminami platform zewnętrznych;
          </li>
          <li>
            podawać prawdziwe i aktualne dane wymagane do korzystania z usługi;
          </li>
          <li>
            zabezpieczać dane logowania i nie udostępniać konta osobom
            nieuprawnionym.
          </li>
        </ul>

        <h2>5. Konto użytkownika</h2>

        <p>
          Korzystanie z pełnych funkcji ANM ContentIQ może wymagać założenia
          konta użytkownika i zalogowania się do aplikacji.
        </p>

        <p>
          Użytkownik odpowiada za zachowanie poufności danych logowania oraz za
          wszelkie działania wykonywane z jego konta, chyba że doszło do
          naruszenia bezpieczeństwa niezależnego od użytkownika.
        </p>

        <p>
          W przypadku podejrzenia nieuprawnionego dostępu do konta użytkownik
          powinien niezwłocznie skontaktować się z usługodawcą.
        </p>

        <h2>6. Łączenie kont zewnętrznych i dostęp OAuth</h2>

        <p>
          Użytkownik może połączyć ANM ContentIQ z wybranymi kontami
          zewnętrznymi, takimi jak Facebook, Instagram, LinkedIn, TikTok,
          YouTube, Spotify, blog lub WordPress.
        </p>

        <p>
          Połączenie odbywa się przez mechanizmy autoryzacji udostępnione przez
          daną platformę, w szczególności OAuth. Zakres dostępu zależy od zgód
          przyznanych przez użytkownika podczas autoryzacji.
        </p>

        <ul>
          <li>ANM ContentIQ nie przechowuje haseł do kont zewnętrznych.</li>
          <li>
            Użytkownik może odwołać dostęp w dowolnym momencie w aplikacji lub w
            ustawieniach danej platformy zewnętrznej.
          </li>
          <li>
            Odłączenie integracji może ograniczyć dostępność części funkcji,
            takich jak automatyczna synchronizacja danych.
          </li>
          <li>
            Dostęp do danych jest wykorzystywany wyłącznie w celu świadczenia
            usług dostępnych w ANM ContentIQ.
          </li>
        </ul>

        <h2>7. Dane z platform zewnętrznych</h2>

        <p>
          ANM ContentIQ może pobierać dane z platform zewnętrznych wyłącznie w
          zakresie udzielonych zgód i zgodnie z zasadami danej platformy.
        </p>

        <p>Może to obejmować w szczególności:</p>

        <ul>
          <li>dane profilu, strony, kanału lub konta;</li>
          <li>listę publikacji, filmów, postów, artykułów lub odcinków;</li>
          <li>
            wyniki publikacji, takie jak zasięg, wyświetlenia, polubienia,
            komentarze, udostępnienia, zapisy, kliknięcia, czas oglądania lub
            completion rate;
          </li>
          <li>
            dane niezbędne do planowania, tworzenia lub publikowania treści,
            jeśli dana funkcja jest dostępna i użytkownik z niej korzysta.
          </li>
        </ul>

        <div className="warning">
          Dostępność danych zależy od API i regulaminu danej platformy. ANM
          ContentIQ nie gwarantuje, że każda platforma udostępni wszystkie dane
          lub wszystkie funkcje.
        </div>

        <h2>8. Content, treści użytkownika i prawa własności</h2>

        <p>
          Treści tworzone, wklejane, importowane lub planowane przez użytkownika
          w ANM ContentIQ pozostają własnością użytkownika lub podmiotu, który
          posiada do nich prawa.
        </p>

        <p>
          ANM Collective Sp. z o.o. nie nabywa praw własności do treści
          użytkownika, danych analitycznych ani materiałów publikowanych na
          kontach zewnętrznych.
        </p>

        <p>
          Użytkownik oświadcza, że posiada prawa lub odpowiednie uprawnienia do
          treści, które dodaje do aplikacji, planuje, publikuje lub analizuje.
        </p>

        <h2>9. Funkcje AI</h2>

        <p>
          ANM ContentIQ wykorzystuje narzędzia AI do tworzenia, analizowania,
          adaptowania i rekomendowania treści.
        </p>

        <p>Funkcje AI mogą obejmować między innymi:</p>

        <ul>
          <li>generowanie postów, opisów, hooków i CTA;</li>
          <li>analizę treści przed publikacją;</li>
          <li>adaptowanie jednej treści na wiele platform;</li>
          <li>porównywanie skuteczności contentu między platformami;</li>
          <li>tworzenie rekomendacji na podstawie wyników publikacji;</li>
          <li>
            wskazywanie, jaki styl, temat lub format ma największy potencjał na
            konkretnej platformie.
          </li>
        </ul>

        <div className="note">
          ANM ContentIQ działa w modelu Content Learning Loop: aplikacja zna
          treść przygotowaną przed publikacją, a następnie porównuje ją z
          wynikami pobranymi z platform. Dzięki temu AI może lepiej oceniać, co
          działa na konkretnych kanałach.
        </div>

        <p>
          Rekomendacje AI mają charakter pomocniczy. Użytkownik samodzielnie
          decyduje o publikacji, wykorzystaniu lub modyfikacji treści.
        </p>

        <h2>10. Publikowanie i planowanie treści</h2>

        <p>
          Jeżeli dana funkcja zostanie udostępniona, ANM ContentIQ może
          umożliwiać planowanie lub publikowanie treści na połączonych
          platformach.
        </p>

        <p>
          Publikacja treści może następować wyłącznie na podstawie działania
          użytkownika, jego zgody lub ustawionego przez niego harmonogramu.
        </p>

        <p>
          Użytkownik odpowiada za zgodność publikowanych treści z prawem,
          regulaminami platform zewnętrznych oraz prawami osób trzecich.
        </p>

        <h2>11. Zakazane działania</h2>

        <p>Zabrania się korzystania z ANM ContentIQ w celu:</p>

        <ul>
          <li>naruszania prawa lub regulaminów platform zewnętrznych;</li>
          <li>publikowania treści bez wymaganych praw lub zgód;</li>
          <li>naruszania praw autorskich, znaków towarowych lub dóbr osobistych;</li>
          <li>rozpowszechniania spamu, treści szkodliwych lub wprowadzających w błąd;</li>
          <li>omijania limitów API lub zabezpieczeń platform zewnętrznych;</li>
          <li>uzyskiwania nieuprawnionego dostępu do danych innych użytkowników;</li>
          <li>zakłócania działania aplikacji lub infrastruktury technicznej.</li>
        </ul>

        <h2>12. Dostępność usługi</h2>

        <p>
          ANM Collective Sp. z o.o. dokłada starań, aby ANM ContentIQ działało
          stabilnie i bezpiecznie, jednak nie gwarantuje nieprzerwanej ani
          bezbłędnej dostępności usługi.
        </p>

        <p>
          Przerwy w działaniu mogą wynikać z prac technicznych, awarii,
          aktualizacji, ograniczeń infrastruktury, zmian API platform
          zewnętrznych lub przyczyn niezależnych od usługodawcy.
        </p>

        <h2>13. Platformy zewnętrzne</h2>

        <p>
          ANM ContentIQ korzysta z integracji z platformami zewnętrznymi, takimi
          jak Meta, Google, YouTube, LinkedIn, TikTok, Spotify, WordPress oraz
          inne narzędzia contentowe.
        </p>

        <p>
          Usługodawca nie odpowiada za działanie, dostępność, zmiany API,
          decyzje moderacyjne, blokady kont, ograniczenia funkcji ani inne
          działania podejmowane przez platformy zewnętrzne.
        </p>

        <p>
          Użytkownik zobowiązuje się przestrzegać regulaminów i zasad platform,
          z którymi łączy ANM ContentIQ.
        </p>

        <h2>14. Odpowiedzialność</h2>

        <p>
          ANM ContentIQ jest narzędziem wspierającym analizę i tworzenie
          contentu. Usługodawca nie gwarantuje określonych wyników biznesowych,
          marketingowych, sprzedażowych, zasięgowych ani finansowych.
        </p>

        <p>Usługodawca nie odpowiada za:</p>

        <ul>
          <li>decyzje użytkownika podjęte na podstawie rekomendacji AI;</li>
          <li>wyniki contentowe osiągnięte na platformach zewnętrznych;</li>
          <li>zmiany algorytmów social media;</li>
          <li>ograniczenia lub awarie API platform zewnętrznych;</li>
          <li>treści publikowane przez użytkownika;</li>
          <li>skutki naruszenia regulaminów platform zewnętrznych przez użytkownika.</li>
        </ul>

        <h2>15. Opłaty i plany płatne</h2>

        <p>
          ANM ContentIQ może być udostępniane bezpłatnie, testowo, w modelu
          subskrypcyjnym, w modelu SaaS lub na indywidualnie ustalonych warunkach
          komercyjnych.
        </p>

        <p>
          Szczegółowe warunki płatności, zakres funkcji, limity i okres
          rozliczeniowy mogą być określone w osobnej ofercie, cenniku,
          zamówieniu lub umowie.
        </p>

        <h2>16. Zawieszenie lub zakończenie dostępu</h2>

        <p>
          Usługodawca może czasowo ograniczyć, zawiesić lub zakończyć dostęp do
          konta użytkownika w przypadku:
        </p>

        <ul>
          <li>naruszenia Regulaminu;</li>
          <li>naruszenia prawa lub praw osób trzecich;</li>
          <li>działań zagrażających bezpieczeństwu aplikacji;</li>
          <li>nadużywania API lub integracji;</li>
          <li>braku płatności, jeśli usługa jest płatna.</li>
        </ul>

        <h2>17. Usunięcie konta i danych</h2>

        <p>
          Użytkownik może zażądać usunięcia konta i danych w dowolnym momencie,
          kontaktując się z usługodawcą:
          <br />
          <a href={`mailto:${company.email}`}>{company.email}</a>
        </p>

        <p>
          W tytule wiadomości należy wpisać:{" "}
          <strong>Usunięcie danych — ANM ContentIQ</strong>.
        </p>

        <p>
          Dane zostaną usunięte w terminie do 30 dni, chyba że obowiązujące
          przepisy prawa wymagają ich dalszego przechowywania.
        </p>

        <p>
          Strona dotycząca usunięcia danych:
          <br />
          <a href={`${company.appUrl}/delete-data`}>
            {company.appUrl}/delete-data
          </a>
        </p>

        <h2>18. Prywatność i dane osobowe</h2>

        <p>
          Zasady przetwarzania danych osobowych opisuje Polityka Prywatności:
          <br />
          <a href={`${company.appUrl}/privacy`}>
            {company.appUrl}/privacy
          </a>
        </p>

        <p>
          Korzystając z ANM ContentIQ, użytkownik potwierdza zapoznanie się z
          Polityką Prywatności.
        </p>

        <h2>19. Zmiany Regulaminu</h2>

        <p>
          Regulamin może być aktualizowany w związku z rozwojem aplikacji,
          zmianami funkcji, zmianami integracji, zmianami API platform
          zewnętrznych lub zmianami przepisów prawa.
        </p>

        <p>
          O istotnych zmianach użytkownicy zostaną poinformowani w aplikacji lub
          drogą e-mailową.
        </p>

        <h2>20. Prawo właściwe i spory</h2>

        <p>
          Regulamin podlega prawu polskiemu. Wszelkie spory będą rozstrzygane
          przez sąd właściwy zgodnie z obowiązującymi przepisami prawa.
        </p>

        <h2>21. Kontakt</h2>

        <p>
          W sprawach dotyczących Regulaminu, działania platformy, konta
          użytkownika, integracji API lub usunięcia danych skontaktuj się z:
        </p>

        <div className="data-grid">
          <div className="data-item">
            <span className="data-label">Usługodawca</span>
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

        <div className="footer-links" aria-label="Najważniejsze linki ANM ContentIQ">
          <a href={company.appUrl}>ANM ContentIQ</a>
          <a href={`${company.appUrl}/privacy`}>Polityka prywatności</a>
          <a href={`${company.appUrl}/terms`}>Regulamin</a>
        </div>
      </section>
    </main>
  );
}
