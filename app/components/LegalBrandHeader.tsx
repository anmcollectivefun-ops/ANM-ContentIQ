import Link from "next/link";

export function LegalBrandHeader() {
  return (
    <header className="legal-brand">
      <Link href="/" className="legal-brand__identity" aria-label="ANM ContentIQ - strona główna">
        <img src="/ANM_ContentIQ_.JPG" alt="ANM ContentIQ app icon" className="legal-brand__icon" />
        <span>
          <strong>ANM ContentIQ</strong>
          <small>AI Content Intelligence Platform</small>
        </span>
      </Link>

      <nav className="legal-brand__nav" aria-label="Legal navigation">
        <Link href="/">Strona główna</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/delete-data">Delete Data</Link>
        <Link href="/privacy">Polityka prywatności</Link>
        <Link href="/terms">Regulamin</Link>
      </nav>
    </header>
  );
}
