// app/login/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = getSupabase(); // null jeśli brak kluczy

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  async function handleGoogleLogin() {
    if (!supabase) {
      setMessage("Brak konfiguracji Supabase.");
      return;
    }
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  }

  async function handleEmailAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setMessage("Brak konfiguracji Supabase.");
      return;
    }

    setLoading(true);
    setMessage("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      window.location.href = "/dashboard";
      return;
    }

    // Rejestracja
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Konto zostało utworzone. Sprawdź email, jeśli Supabase wymaga potwierdzenia."
    );
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070816] px-6 text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
        {/* ================= LOGO ================= */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <p className="text-2xl font-black">ANM ContentIQ</p>
            <p className="mt-2 text-sm text-white/50">
              Zaloguj się lub utwórz konto
            </p>
          </Link>
        </div>

        {/* ================= MODE SWITCH ================= */}
        <div className="mb-5 grid grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
            className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
              mode === "login"
                ? "bg-cyan-400 text-[#070816]"
                : "text-white/55 hover:text-white"
            }`}
          >
            Logowanie
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("register");
              setMessage("");
            }}
            className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
              mode === "register"
                ? "bg-cyan-400 text-[#070816]"
                : "text-white/55 hover:text-white"
            }`}
          >
            Rejestracja
          </button>
        </div>

        {/* ================= GOOGLE LOGIN ================= */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || !supabase}
          className="mb-5 flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 font-bold text-[#070816] transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#070816] text-sm font-black text-white">
            G
          </span>
          Kontynuuj z Google
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/35">albo</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* ================= EMAIL FORM ================= */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-white/70">Email</label>
            <input
              type="email"
              placeholder="twoj@email.pl"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 outline-none placeholder:text-white/30 focus:border-cyan-300"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/70">Hasło</label>
            <input
              type="password"
              placeholder="minimum 6 znaków"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 outline-none placeholder:text-white/30 focus:border-cyan-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !supabase}
            className="block w-full rounded-2xl bg-cyan-400 px-5 py-4 text-center font-bold text-[#070816] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Przetwarzanie..."
              : mode === "login"
                ? "Zaloguj przez email"
                : "Utwórz konto"}
          </button>
        </form>

        {/* ================= MESSAGE ================= */}
        {message && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm text-white/70">
            {message}
          </div>
        )}
      </div>
    </main>
  );
}