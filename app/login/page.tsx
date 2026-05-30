import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070816] px-6 text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
        {/* ================= LOGO ================= */}
        <div className="mb-8 text-center">
          <p className="text-2xl font-black">ANM ContentIQ</p>
          <p className="mt-2 text-sm text-white/50">Zaloguj się do swojego centrum contentu</p>
        </div>

        {/* ================= LOGIN FORM ================= */}
        <form className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-white/70">Email</label>
            <input
              type="email"
              placeholder="twoj@email.pl"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 outline-none placeholder:text-white/30 focus:border-cyan-300"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/70">Hasło</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 outline-none placeholder:text-white/30 focus:border-cyan-300"
            />
          </div>

          <Link
            href="/dashboard"
            className="block w-full rounded-2xl bg-cyan-400 px-5 py-4 text-center font-bold text-[#070816]"
          >
            Wejdź do dashboardu
          </Link>
        </form>

        {/* ================= FOOTER ================= */}
        <div className="mt-6 text-center text-sm text-white/45">
          Logowanie Supabase/Auth dodamy później.
        </div>
      </div>
    </main>
  );
}