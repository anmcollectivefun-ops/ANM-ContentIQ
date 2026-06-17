"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Lang = "pl" | "en";

const copy = {
  en: {
    title: "Set a new password",
    subtitle: "Enter a new password for your ANM ContentIQ account.",
    password: "New password",
    passwordPlaceholder: "minimum 6 characters",
    confirmPassword: "Repeat password",
    confirmPlaceholder: "repeat new password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    processing: "Saving...",
    submit: "Save new password",
    mismatch: "Passwords are not the same.",
    tooShort: "Password must have at least 6 characters.",
    success: "Password has been changed. You can log in now.",
    login: "Go to login",
    loginTitle: "Log in with the new password",
    loginSubtitle: "Use the same email address and the password you just set.",
    email: "Email",
    emailPlaceholder: "your@email.com",
    loginPassword: "Password",
    loginSubmit: "Log in",
    missingSession:
      "This reset link has expired or was already used. Request a new password reset email.",
  },
  pl: {
    title: "Ustaw nowe hasło",
    subtitle: "Wpisz nowe hasło do konta ANM ContentIQ.",
    password: "Nowe hasło",
    passwordPlaceholder: "minimum 6 znaków",
    confirmPassword: "Powtórz hasło",
    confirmPlaceholder: "powtórz nowe hasło",
    showPassword: "Pokaż hasło",
    hidePassword: "Ukryj hasło",
    processing: "Zapisywanie...",
    submit: "Zapisz nowe hasło",
    mismatch: "Hasła nie są takie same.",
    tooShort: "Hasło musi mieć minimum 6 znaków.",
    success: "Hasło zostało zmienione. Możesz się teraz zalogować.",
    login: "Przejdź do logowania",
    loginTitle: "Zaloguj się nowym hasłem",
    loginSubtitle: "Użyj tego samego adresu email i hasła, które właśnie ustawiono.",
    email: "Email",
    emailPlaceholder: "twoj@email.pl",
    loginPassword: "Hasło",
    loginSubmit: "Zaloguj",
    missingSession:
      "Ten link resetujący wygasł albo został już użyty. Poproś o nowy email resetujący hasło.",
  },
};

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const lang: Lang = searchParams.get("lang") === "pl" ? "pl" : "en";
  const t = copy[lang];
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password.length < 6) {
      setMessage(t.tooShort);
      return;
    }

    if (password !== confirmPassword) {
      setMessage(t.mismatch);
      return;
    }

    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setMessage(t.missingSession);
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setSuccess(true);
    setMessage(t.success);
    setLoading(false);
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginMessage("");
    setLoginLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      setLoginMessage(error.message);
      setLoginLoading(false);
      return;
    }

    window.location.href = `/dashboard?lang=${lang}`;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070816] px-6 py-10 text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <Link href={`/?lang=${lang}`} className="inline-block no-underline">
            <img
              src="/ANM_ContentIQ_.JPG"
              alt="ANM ContentIQ app icon"
              className="mx-auto mb-4 h-14 w-14 rounded-2xl"
            />
            <p className="text-2xl font-black text-white">ANM ContentIQ</p>
          </Link>
          <h1 className="mt-6 text-2xl font-black">{t.title}</h1>
          <p className="mt-2 text-sm text-white/55">{t.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-white/70">
              {t.password}
            </label>
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder={t.passwordPlaceholder}
              show={showPassword}
              toggleShow={() => setShowPassword((value) => !value)}
              showLabel={t.showPassword}
              hideLabel={t.hidePassword}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/70">
              {t.confirmPassword}
            </label>
            <PasswordInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder={t.confirmPlaceholder}
              show={showPassword}
              toggleShow={() => setShowPassword((value) => !value)}
              showLabel={t.showPassword}
              hideLabel={t.hidePassword}
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="block w-full rounded-2xl bg-cyan-400 px-5 py-4 text-center font-bold text-[#070816] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t.processing : t.submit}
          </button>
        </form>

        {message && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm text-white/70">
            {message}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-[1.5rem] border border-cyan-300/25 bg-cyan-300/[0.06] p-5">
            <div className="mb-4">
              <h2 className="text-lg font-black text-white">{t.loginTitle}</h2>
              <p className="mt-1 text-sm text-white/55">{t.loginSubtitle}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-white/70">
                  {t.email}
                </label>
                <input
                  type="email"
                  placeholder={t.emailPlaceholder}
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 outline-none placeholder:text-white/30 focus:border-cyan-300"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  {t.loginPassword}
                </label>
                <PasswordInput
                  value={loginPassword}
                  onChange={setLoginPassword}
                  placeholder={t.passwordPlaceholder}
                  show={showPassword}
                  toggleShow={() => setShowPassword((value) => !value)}
                  showLabel={t.showPassword}
                  hideLabel={t.hidePassword}
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="block w-full rounded-2xl bg-cyan-400 px-5 py-4 text-center font-bold text-[#070816] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loginLoading ? t.processing : t.loginSubmit}
              </button>
            </form>

            {loginMessage && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm text-white/70">
                {loginMessage}
              </div>
            )}

            <Link
              href={`/login?lang=${lang}`}
              className="mt-4 block text-center text-xs font-bold text-cyan-300 transition hover:text-white"
            >
              {t.login}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  show,
  toggleShow,
  showLabel,
  hideLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  show: boolean;
  toggleShow: () => void;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        minLength={6}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 pr-12 outline-none placeholder:text-white/30 focus:border-cyan-300"
      />
      <button
        type="button"
        onClick={toggleShow}
        aria-label={show ? hideLabel : showLabel}
        title={show ? hideLabel : showLabel}
        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-white/55 transition hover:bg-white/10 hover:text-white"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
