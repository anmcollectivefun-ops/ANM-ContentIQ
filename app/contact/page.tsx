import type { Metadata } from "next";
import Link from "next/link";

const contactEmail = "kontak@anmcollective.pl";

export const metadata: Metadata = {
  title: "Contact - ANM ContentIQ",
  description: "Contact page for ANM ContentIQ support, privacy, app verification, and data deletion requests.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f5] px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 flex flex-col gap-5 border-b border-slate-200 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-4" aria-label="ANM ContentIQ home">
            <img src="/ANM_ContentIQ_.JPG" alt="ANM ContentIQ app icon" className="h-14 w-14 rounded-2xl object-cover" />
            <span>
              <strong className="block text-2xl font-black tracking-tight">ANM ContentIQ</strong>
              <small className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                Contact
              </small>
            </span>
          </Link>

          <nav className="flex flex-wrap gap-4 text-sm font-semibold text-slate-600">
            <Link href="/privacy" className="hover:text-slate-950">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-950">Terms</Link>
            <Link href="/delete-data" className="hover:text-slate-950">Delete Data</Link>
          </nav>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.28em] text-blue-600">Support</p>
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">Contact ANM ContentIQ</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Use this page to contact ANM ContentIQ about app support, platform integrations,
            privacy questions, data deletion requests, or developer platform verification.
          </p>

          <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-6">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-700">Email</p>
            <a href={`mailto:${contactEmail}`} className="mt-2 inline-flex text-2xl font-black text-blue-700 hover:text-blue-900">
              {contactEmail}
            </a>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              We usually respond to support and verification messages as soon as possible.
              For privacy or deletion requests, include the email address used in the app and
              the platform account involved, if applicable.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Link href="/privacy" className="rounded-2xl border border-slate-200 p-5 font-bold hover:border-blue-300 hover:bg-blue-50">
              Privacy Policy
            </Link>
            <Link href="/terms" className="rounded-2xl border border-slate-200 p-5 font-bold hover:border-blue-300 hover:bg-blue-50">
              Terms of Service
            </Link>
            <Link href="/delete-data" className="rounded-2xl border border-slate-200 p-5 font-bold hover:border-blue-300 hover:bg-blue-50">
              Delete Data
            </Link>
          </div>
        </section>

        <footer className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>ANM ContentIQ by ANM Collective</span>
          <Link href="/" className="font-semibold text-slate-700 hover:text-slate-950">Back to home</Link>
        </footer>
      </div>
    </main>
  );
}
