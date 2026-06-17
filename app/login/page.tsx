"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Lang = "pl" | "en";
type Mode = "login" | "register";

const copy = {
  en: {
    otherFlag: "🇵🇱",
    otherHref: "/login?lang=pl",
    switchLabel: "Switch to Polish",
    subtitle: "Log in or create an account",
    loginTab: "Log in",
    registerTab: "Register",
    googleLogin: "Continue with Google",
    googleRegister: "Register with Google",
    or: "or",
    email: "Email",
    emailPlaceholder: "your@email.com",
    password: "Password",
    passwordPlaceholder: "minimum 6 characters",
    showPassword: "Show password",
    hidePassword: "Hide password",
    forgotPassword: "Forgot password?",
    resetEmailMissing: "Enter your email address first.",
    resetEmailSent: "Password reset email has been sent. Check your inbox.",
    processing: "Processing...",
    loginSubmit: "Log in with email",
    registerSubmit: "Create account",
    accountCreated:
      "Account created. Check your email if Supabase requires confirmation.",
    acceptPrefix: "I accept the",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    and: "and",
    consentError:
      "To create an account, you need to accept the Privacy Policy and Terms of Service.",
    footerPrivacy: "Privacy Policy",
    footerTerms: "Terms of Service",
  },
  pl: {
    otherFlag: "🇬🇧",
    otherHref: "/login?lang=en",
    switchLabel: "Switch to English",
    subtitle: "Zaloguj się lub utwórz konto",
    loginTab: "Logowanie",
    registerTab: "Rejestracja",
    googleLogin: "Kontynuuj z Google",
    googleRegister: "Zarejestruj z Google",
    or: "albo",
    email: "Email",
    emailPlaceholder: "twoj@email.pl",
    password: "Hasło",
    passwordPlaceholder: "minimum 6 znaków",
    showPassword: "Pokaż hasło",
    hidePassword: "Ukryj hasło",
    forgotPassword: "Zapomniałam hasła?",
    resetEmailMissing: "Najpierw wpisz adres email.",
    resetEmailSent: "Email do resetu hasła został wysłany. Sprawdź skrzynkę.",
    processing: "Przetwarzanie...",
    loginSubmit: "Zaloguj przez email",
    registerSubmit: "Utwórz konto",
    accountCreated:
      "Konto zostało utworzone. Sprawdź email, jeśli Supabase wymaga potwierdzenia.",
    acceptPrefix: "Akceptuję",
    privacy: "Politykę prywatności",
    terms: "Regulamin",
    and: "oraz",
    consentError:
      "Aby utworzyć konto, zaakceptuj Politykę prywatności i Regulamin.",
    footerPrivacy: "Polityka prywatności",
    footerTerms: "Regulamin",
  },
};

function GoogleLogo() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.197l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.565l.003-.002 6.19 5.238C36.971 39.199 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z"
      />
    </svg>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const lang: Lang = searchParams.get("lang") === "pl" ? "pl" : "en";
  const t = copy[lang];

  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const privacyHref = `/privacy?lang=${lang}`;
  const termsHref = `/terms?lang=${lang}`;

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  function registrationConsentMissing() {
    return mode === "register" && (!acceptedPrivacy || !acceptedTerms);
  }

  async function handleGoogleLogin() {
    setMessage("");

    if (registrationConsentMissing()) {
      setMessage(t.consentError);
      return;
    }

    setLoading(true);

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

  async function handlePasswordReset() {
    setMessage("");

    if (!email.trim()) {
      setMessage(t.resetEmailMissing);
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${siteUrl}/auth/callback?next=/login?lang=${lang}`,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(t.resetEmailSent);
    setLoading(false);
  }

  async function handleEmailAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");

    if (registrationConsentMissing()) {
      setMessage(t.consentError);
      return;
    }

    setLoading(true);

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

      window.location.href = `/dashboard?lang=${lang}`;
      return;
    }

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

    setMessage(t.accountCreated);
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070816] px-6 py-10 text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
        <div className="mb-5 flex justify-end">
          <Link
            href={t.otherHref}
            aria-label={t.switchLabel}
            className="inline-flex min-h-10 min-w-12 items-center justify-center rounded-2xl border border-white/10 bg-black px-4 py-2 text-xl no-underline transition hover:border-[#8E443D]/60"
          >
            {t.otherFlag}
          </Link>
        </div>

        {/* ================= LOGO ================= */}
        <div className="mb-8 text-center">
          <Link href={`/?lang=${lang}`} className="inline-block no-underline">
            <img
              src="/ANM_ContentIQ_.JPG"
              alt="ANM ContentIQ app icon"
              className="mx-auto mb-4 h-14 w-14 rounded-2xl"
            />
            <p className="text-2xl font-black text-white">ANM ContentIQ</p>
            <p className="mt-2 text-sm text-white/50">{t.subtitle}</p>
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
            {t.loginTab}
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
            {t.registerTab}
          </button>
        </div>

        {/* ================= GOOGLE LOGIN ================= */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mb-5 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white px-5 py-4 font-black text-[#070816] shadow-lg shadow-black/20 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
            <GoogleLogo />
          </span>
          {mode === "login" ? t.googleLogin : t.googleRegister}
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/35">{t.or}</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* ================= EMAIL FORM ================= */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-white/70">
              {t.email}
            </label>
            <input
              type="email"
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 outline-none placeholder:text-white/30 focus:border-cyan-300"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-sm text-white/70">
                {t.password}
              </label>

              {mode === "login" && (
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={loading}
                  className="text-xs font-bold text-cyan-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t.forgotPassword}
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t.passwordPlaceholder}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 pr-12 outline-none placeholder:text-white/30 focus:border-cyan-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? t.hidePassword : t.showPassword}
                title={showPassword ? t.hidePassword : t.showPassword}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-white/55 transition hover:bg-white/10 hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {mode === "register" && (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-white/70">
                <input
                  type="checkbox"
                  checked={acceptedPrivacy}
                  onChange={(event) => setAcceptedPrivacy(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 accent-cyan-400"
                />
                <span>
                  {t.acceptPrefix}{" "}
                  <Link
                    href={privacyHref}
                    className="font-bold text-cyan-300 hover:text-white"
                  >
                    {t.privacy}
                  </Link>
                  .
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-white/70">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 accent-cyan-400"
                />
                <span>
                  {t.acceptPrefix}{" "}
                  <Link
                    href={termsHref}
                    className="font-bold text-cyan-300 hover:text-white"
                  >
                    {t.terms}
                  </Link>
                  .
                </span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="block w-full rounded-2xl bg-cyan-400 px-5 py-4 text-center font-bold text-[#070816] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? t.processing
              : mode === "login"
                ? t.loginSubmit
                : t.registerSubmit}
          </button>
        </form>

        {/* ================= MESSAGE ================= */}
        {message && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm text-white/70">
            {message}
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-white/45">
          <Link href={privacyHref} className="hover:text-white">
            {t.footerPrivacy}
          </Link>
          <Link href={termsHref} className="hover:text-white">
            {t.footerTerms}
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
