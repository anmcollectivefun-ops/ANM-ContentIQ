import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const workspaces = [
  {
    id: "anm-collective",
    name: "ANM Collective",
    type: "Firma / SaaS",
    score: "87/100",
    status: "Aktywny",
  },
  {
    id: "creator-planner",
    name: "Creator Planner",
    type: "Influencer",
    score: "82/100",
    status: "W przygotowaniu",
  },
  {
    id: "blog-seo",
    name: "Blog & SEO Hub",
    type: "Content marketing",
    score: "74/100",
    status: "Do rozbudowy",
  },
];

const stats = [
  { label: "Projekty", value: "3" },
  { label: "Zaplanowane publikacje", value: "24" },
  { label: "Aktywne współprace", value: "6" },
  { label: "Rekomendacje AI", value: "18" },
];

export default async function DashboardPage() {
  /* ================= AUTH CHECK ================= */
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /* ================= SIGN OUT ACTION ================= */
  async function signOut() {
    "use server";

    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#070816] text-white">
      {/* ================= TOP BAR ================= */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xl font-black">ANM ContentIQ</p>
            <p className="text-xs text-white/50">Dashboard użytkownika</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-white/10 px-5 py-2 text-sm text-white/70 hover:bg-white/10"
            >
              Landing page
            </Link>

            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full border border-red-400/30 bg-red-400/10 px-5 py-2 text-sm text-red-200 hover:bg-red-400/20"
              >
                Wyloguj
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* ================= WELCOME ================= */}
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
            Witaj w panelu
          </p>

          <h1 className="mt-3 text-4xl font-black">
            Twoje projekty contentowe
          </h1>

          <p className="mt-3 max-w-2xl text-white/60">
            Wybierz projekt, markę albo przestrzeń roboczą, aby przejść do
            właściwej aplikacji ANM ContentIQ.
          </p>

          <p className="mt-3 text-sm text-white/40">
            Zalogowano jako:{" "}
            <span className="text-cyan-300">{user.email}</span>
          </p>
        </div>

        {/* ================= STATS ================= */}
        <div className="grid gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
            >
              <p className="text-sm text-white/50">{stat.label}</p>
              <p className="mt-2 text-3xl font-black">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ================= WORKSPACES ================= */}
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {workspaces.map((workspace) => (
            <Link
              key={workspace.id}
              href={`/app/${workspace.id}`}
              className="group rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 transition hover:border-cyan-300/60 hover:bg-white/[0.07]"
            >
              <div className="mb-8 flex items-center justify-between">
                <span className="rounded-full bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">
                  {workspace.status}
                </span>

                <span className="text-sm text-white/40 group-hover:text-white">
                  Otwórz →
                </span>
              </div>

              <h2 className="text-2xl font-black">{workspace.name}</h2>
              <p className="mt-2 text-sm text-white/50">{workspace.type}</p>

              <div className="mt-6 rounded-2xl bg-white/[0.05] p-4">
                <p className="text-sm text-white/50">Content Score</p>
                <p className="mt-1 text-2xl font-black text-cyan-300">
                  {workspace.score}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}