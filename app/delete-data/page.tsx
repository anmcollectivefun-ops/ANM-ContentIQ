import type { Metadata } from "next";
import Link from "next/link";

const contactEmail = "kontak@anmcollective.pl";

export const metadata: Metadata = {
  title: "Delete Data - ANM ContentIQ",
  description: "Instructions for requesting deletion of data connected with ANM ContentIQ.",
};

export default function DeleteDataPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f5] px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 flex flex-col gap-5 border-b border-slate-200 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-4" aria-label="ANM ContentIQ home">
            <img src="/ANM_ContentIQ_.JPG" alt="ANM ContentIQ app icon" className="h-14 w-14 rounded-2xl object-cover" />
            <span>
              <strong className="block text-2xl font-black tracking-tight">ANM ContentIQ</strong>
              <small className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                Delete Data
              </small>
            </span>
          </Link>

          <nav className="flex flex-wrap gap-4 text-sm font-semibold text-slate-600">
            <Link href="/contact" className="hover:text-slate-950">Contact</Link>
            <Link href="/privacy" className="hover:text-slate-950">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-950">Terms</Link>
          </nav>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.28em] text-red-600">Data deletion</p>
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">Request deletion of your data</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            You can request deletion of data connected with ANM ContentIQ at any time.
            This includes OAuth platform connections, stored access tokens, imported analytics,
            saved content drafts, and related app records where deletion is legally required.
          </p>

          <div className="mt-8 rounded-2xl border border-red-100 bg-red-50 p-6">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-red-700">How to request deletion</p>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-slate-700">
              <li>
                Send an email to{" "}
                <a href={`mailto:${contactEmail}`} className="font-bold text-red-700 hover:text-red-900">
                  {contactEmail}
                </a>
                .
              </li>
              <li>
                Use the subject line: <strong>ANM ContentIQ Data Deletion Request</strong>.
              </li>
              <li>
                Include the email address used in ANM ContentIQ and the platform account you want removed,
                for example TikTok, Facebook, Instagram, LinkedIn, YouTube, Spotify, or Blog.
              </li>
            </ol>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 p-6">
            <h2 className="text-2xl font-black tracking-tight">What happens next</h2>
            <p className="mt-3 leading-7 text-slate-600">
              After we receive your request, we will verify it and delete or disconnect the relevant
              ANM ContentIQ records. If the request relates to a third-party platform account, you can
              also revoke ANM ContentIQ access directly in that platform's account settings.
            </p>
            <p className="mt-3 leading-7 text-slate-600">
              For Meta app review and automated deletion callbacks, ANM ContentIQ also provides this endpoint:
              {" "}
              <Link href="/api/meta/delete-data" className="font-bold text-blue-700 hover:text-blue-900">
                /api/meta/delete-data
              </Link>
              .
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Link href="/contact" className="rounded-2xl border border-slate-200 p-5 font-bold hover:border-red-300 hover:bg-red-50">
              Contact
            </Link>
            <Link href="/privacy" className="rounded-2xl border border-slate-200 p-5 font-bold hover:border-red-300 hover:bg-red-50">
              Privacy Policy
            </Link>
            <Link href="/terms" className="rounded-2xl border border-slate-200 p-5 font-bold hover:border-red-300 hover:bg-red-50">
              Terms of Service
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
