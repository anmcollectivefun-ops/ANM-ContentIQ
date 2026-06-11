"use client";

import { useEffect, useMemo, useState } from "react";
import { useContentIQLanguage } from "@/lib/contentiq-language";

type PlatformId =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "blog"
  | "spotify";

type ActionType = "reply" | "new-comment" | "ai-suggestion";

type EngagementStudioProps = {
  dark?: boolean;
  workspaceId: string;
};

type ConnectedAccount = {
  id: string;
  platform: PlatformId;
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
  externalAccountId?: string | null;
  connected: boolean;
  lastSyncAt?: string | null;
  capabilities: {
    canReadPosts: boolean;
    canReadComments: boolean;
    canReplyToComments: boolean;
    canCreateComment: boolean;
    canModerateComments: boolean;
    canUseAiSuggestions: boolean;
  };
};

type SocialPost = {
  id: string;
  platform: PlatformId;
  accountId: string;
  externalPostId: string;
  title?: string | null;
  content: string;
  mediaUrl?: string | null;
  permalink?: string | null;
  publishedAt?: string | null;
  metrics?: {
    reach?: number | null;
    impressions?: number | null;
    likes?: number | null;
    comments?: number | null;
    shares?: number | null;
    engagementRate?: number | null;
  };
};

type SocialComment = {
  id: string;
  platform: PlatformId;
  accountId: string;
  postId: string;
  externalCommentId: string;
  authorName: string;
  authorUsername?: string | null;
  authorAvatarUrl?: string | null;
  text: string;
  createdAt?: string | null;
  parentCommentId?: string | null;
  status?: "new" | "answered" | "hidden" | "flagged" | "drafted";
  sentiment?: "positive" | "neutral" | "question" | "negative" | null;
};

type ApiState = "idle" | "loading" | "success" | "error";

const platformLabels: Record<PlatformId, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  blog: "Blog",
  spotify: "Spotify",
};

const platformShortLabels: Record<PlatformId, string> = {
  facebook: "FB",
  instagram: "IG",
  tiktok: "TT",
  youtube: "YT",
  linkedin: "IN",
  blog: "BLOG",
  spotify: "SP",
};

const orderedPlatforms: PlatformId[] = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "linkedin",
  "blog",
  "spotify",
];

function formatDate(
  value: string | null | undefined,
  locale = "pl-PL",
  emptyLabel = "Brak daty"
) {
  if (!value) return emptyLabel;

  try {
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatNumber(value?: number | null) {
  if (typeof value !== "number") return "—";
  return new Intl.NumberFormat("pl-PL").format(value);
}

function sentimentLabel(
  sentiment: SocialComment["sentiment"] | undefined,
  text: (polish: string, english: string) => string
) {
  if (sentiment === "positive") return text("Pozytywny", "Positive");
  if (sentiment === "question") return text("Pytanie", "Question");
  if (sentiment === "negative") return text("Wymaga uwagi", "Needs attention");
  if (sentiment === "neutral") return text("Neutralny", "Neutral");
  return text("Nieoznaczony", "Unclassified");
}

async function safeJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.error ||
      data?.message ||
      `Błąd API: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return data as T;
}

export default function EngagementStudio({
  dark = true,
  workspaceId,
}: EngagementStudioProps) {
  const { lang, locale, text } = useContentIQLanguage();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [comments, setComments] = useState<SocialComment[]>([]);

  const [accountsState, setAccountsState] = useState<ApiState>("idle");
  const [postsState, setPostsState] = useState<ApiState>("idle");
  const [commentsState, setCommentsState] = useState<ApiState>("idle");
  const [aiState, setAiState] = useState<ApiState>("idle");
  const [publishState, setPublishState] = useState<ApiState>("idle");

  const [error, setError] = useState<string | null>(null);

  const [activePlatform, setActivePlatform] = useState<PlatformId>("facebook");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [selectedCommentId, setSelectedCommentId] = useState<string>("");

  const [action, setAction] = useState<ActionType>("reply");
  const [aiDraft, setAiDraft] = useState("");
  const [manualPrompt, setManualPrompt] = useState("");
  const [aiProvider, setAiProvider] = useState<"deepseek" | "gemini">("deepseek");

  const wrapperClass = dark
    ? "rounded-3xl border border-white/10 bg-[#111827]/90 p-5 text-white shadow-2xl shadow-black/30"
    : "rounded-3xl border border-stone-200 bg-white p-5 text-[#231F20] shadow-xl shadow-stone-200/70";

  const cardClass = dark
    ? "rounded-2xl border border-white/10 bg-black/30 p-4"
    : "rounded-2xl border border-stone-200 bg-stone-50 p-4";

  const mutedClass = dark ? "text-white/60" : "text-stone-500";

  const passiveButtonClass = dark
    ? "border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-100";

  const activeButtonClass = dark
    ? "border-[#B86ADF]/70 bg-[#B86ADF]/20 text-white shadow-lg shadow-[#B86ADF]/20"
    : "border-[#8E443D] bg-[#8E443D]/10 text-[#231F20]";

  const selectedAccount = useMemo(() => {
    return accounts.find((account) => account.id === selectedAccountId) ?? null;
  }, [accounts, selectedAccountId]);

  const selectedPost = useMemo(() => {
    return posts.find((post) => post.id === selectedPostId) ?? null;
  }, [posts, selectedPostId]);

  const selectedComment = useMemo(() => {
    return comments.find((comment) => comment.id === selectedCommentId) ?? null;
  }, [comments, selectedCommentId]);

  const platformAccounts = useMemo(() => {
    return accounts.filter((account) => account.platform === activePlatform);
  }, [accounts, activePlatform]);

  const availablePlatforms = useMemo(() => {
    return orderedPlatforms.map((platform) => {
      const connectedCount = accounts.filter(
        (account) => account.platform === platform && account.connected
      ).length;

      return {
        id: platform,
        label: platformLabels[platform],
        shortLabel: platformShortLabels[platform],
        connectedCount,
      };
    });
  }, [accounts]);

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      if (!workspaceId) return;

      setAccountsState("loading");
      setError(null);

      try {
        const data = await safeJson<{ accounts: ConnectedAccount[] }>(
          await fetch(
            `/api/engagement/accounts?workspaceId=${encodeURIComponent(
              workspaceId
            )}`,
            { cache: "no-store" }
          )
        );

        if (cancelled) return;

        setAccounts(data.accounts ?? []);
        setAccountsState("success");

        const firstConnected =
          data.accounts?.find((account) => account.connected) ??
          data.accounts?.[0];

        if (firstConnected) {
          setActivePlatform(firstConnected.platform);
          setSelectedAccountId(firstConnected.id);
        }
      } catch (err) {
        if (cancelled) return;
        setAccountsState("error");
        setError(err instanceof Error ? err.message : text("Nie udało się pobrać kont.", "Could not load accounts."));
      }
    }

    loadAccounts();

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  useEffect(() => {
    let cancelled = false;

    async function loadPosts() {
      if (!workspaceId || !selectedAccountId) return;

      setPostsState("loading");
      setPosts([]);
      setComments([]);
      setSelectedPostId("");
      setSelectedCommentId("");
      setAiDraft("");
      setError(null);

      try {
        const data = await safeJson<{ posts: SocialPost[] }>(
          await fetch(
            `/api/engagement/posts?workspaceId=${encodeURIComponent(
              workspaceId
            )}&accountId=${encodeURIComponent(selectedAccountId)}`,
            { cache: "no-store" }
          )
        );

        if (cancelled) return;

        setPosts(data.posts ?? []);
        setPostsState("success");

        if (data.posts?.[0]) {
          setSelectedPostId(data.posts[0].id);
        }
      } catch (err) {
        if (cancelled) return;
        setPostsState("error");
        setError(err instanceof Error ? err.message : text("Nie udało się pobrać postów.", "Could not load posts."));
      }
    }

    loadPosts();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, selectedAccountId]);

  useEffect(() => {
    if (!selectedPostId) return;
    loadComments(selectedPostId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPostId]);

  async function loadComments(postId: string) {
    if (!workspaceId || !selectedAccount || !postId) return;

    if (!selectedAccount.capabilities.canReadComments) {
      setComments([]);
      setSelectedCommentId("");
      return;
    }

    setCommentsState("loading");
    setComments([]);
    setSelectedCommentId("");
    setAiDraft("");
    setError(null);

    try {
      const data = await safeJson<{ comments: SocialComment[] }>(
        await fetch(
          `/api/engagement/comments?workspaceId=${encodeURIComponent(
            workspaceId
          )}&accountId=${encodeURIComponent(
            selectedAccount.id
          )}&postId=${encodeURIComponent(postId)}`,
          { cache: "no-store" }
        )
      );

      setComments(data.comments ?? []);
      setCommentsState("success");

      if (data.comments?.[0]) {
        setSelectedCommentId(data.comments[0].id);
      }
    } catch (err) {
      setCommentsState("error");
      setError(err instanceof Error ? err.message : text("Nie udało się pobrać komentarzy.", "Could not load comments."));
    }
  }

  async function handleSyncAccount() {
    if (!workspaceId || !selectedAccount) return;

    setPostsState("loading");
    setError(null);

    try {
      await safeJson<{ ok: boolean }>(
        await fetch("/api/engagement/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            accountId: selectedAccount.id,
            platform: selectedAccount.platform,
          }),
        })
      );

      const data = await safeJson<{ posts: SocialPost[] }>(
        await fetch(
          `/api/engagement/posts?workspaceId=${encodeURIComponent(
            workspaceId
          )}&accountId=${encodeURIComponent(selectedAccount.id)}`,
          { cache: "no-store" }
        )
      );

      setPosts(data.posts ?? []);
      setPostsState("success");

      if (data.posts?.[0]) {
        setSelectedPostId(data.posts[0].id);
      }
    } catch (err) {
      setPostsState("error");
      setError(err instanceof Error ? err.message : text("Synchronizacja nie powiodła się.", "Synchronization failed."));
    }
  }

  async function handleGenerateAiDraft() {
    if (!workspaceId || !selectedAccount || !selectedPost) return;

    if (!selectedAccount.capabilities.canUseAiSuggestions) {
      setError(text("Ta platforma nie ma aktywnych sugestii AI dla komentarzy.", "AI comment suggestions are not active for this platform."));
      return;
    }

    if (action === "reply" && !selectedComment) {
      setError(text("Wybierz komentarz, aby wygenerować odpowiedź AI.", "Select a comment to generate an AI reply."));
      return;
    }

    setAiState("loading");
    setError(null);

    try {
      const data = await safeJson<{ draft: string }>(
        await fetch("/api/engagement/ai-suggestion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            platform: selectedAccount.platform,
            accountId: selectedAccount.id,
            postId: selectedPost.id,
            commentId: selectedComment?.id ?? null,
            commentText: selectedComment?.text ?? null,
            action,
            userPrompt: manualPrompt || null,
            provider: aiProvider,
            language: lang,
          }),
        })
      );

      setAiDraft(data.draft ?? "");
      setAiState("success");
    } catch (err) {
      setAiState("error");
      setError(err instanceof Error ? err.message : text("AI nie wygenerowało odpowiedzi.", "AI did not generate a response."));
    }
  }

  async function handlePublish() {
    if (!workspaceId || !selectedAccount || !selectedPost || !aiDraft.trim()) return;

    setPublishState("loading");
    setError(null);

    try {
      if (action === "reply") {
        if (!selectedComment) {
          throw new Error(text("Wybierz komentarz, na który chcesz odpowiedzieć.", "Select the comment you want to reply to."));
        }

        if (!selectedAccount.capabilities.canReplyToComments) {
          throw new Error(text("Ta platforma nie obsługuje jeszcze odpowiedzi na komentarze.", "This platform does not support comment replies yet."));
        }

        await safeJson<{ ok: boolean }>(
          await fetch("/api/engagement/reply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workspaceId,
              platform: selectedAccount.platform,
              accountId: selectedAccount.id,
              postId: selectedPost.id,
              commentId: selectedComment.id,
              externalCommentId: selectedComment.externalCommentId,
              text: aiDraft.trim(),
            }),
          })
        );
      }

      if (action === "new-comment" || action === "ai-suggestion") {
        if (!selectedAccount.capabilities.canCreateComment) {
          throw new Error(text("Ta platforma nie obsługuje jeszcze dodawania komentarzy.", "This platform does not support new comments yet."));
        }

        await safeJson<{ ok: boolean }>(
          await fetch("/api/engagement/comment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workspaceId,
              platform: selectedAccount.platform,
              accountId: selectedAccount.id,
              postId: selectedPost.id,
              externalPostId: selectedPost.externalPostId,
              text: aiDraft.trim(),
            }),
          })
        );
      }

      setPublishState("success");
      await loadComments(selectedPost.id);
    } catch (err) {
      setPublishState("error");
      setError(err instanceof Error ? err.message : text("Nie udało się opublikować.", "Publishing failed."));
    }
  }

  function handlePlatformChange(platform: PlatformId) {
    setActivePlatform(platform);
    setPosts([]);
    setComments([]);
    setSelectedPostId("");
    setSelectedCommentId("");
    setAiDraft("");
    setManualPrompt("");
    setError(null);

    const firstAccount = accounts.find(
      (account) => account.platform === platform && account.connected
    );

    setSelectedAccountId(firstAccount?.id ?? "");
  }

  const canPublishCurrentAction =
    selectedAccount &&
    selectedPost &&
    aiDraft.trim().length > 0 &&
    ((action === "reply" &&
      selectedComment &&
      selectedAccount.capabilities.canReplyToComments) ||
      ((action === "new-comment" || action === "ai-suggestion") &&
        selectedAccount.capabilities.canCreateComment));

  return (
    <section className={wrapperClass}>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div
            className={`mb-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              dark
                ? "bg-[#B86ADF]/15 text-[#E9C6FF]"
                : "bg-[#8E443D]/10 text-[#8E443D]"
            }`}
          >
            AI Engagement Studio
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">
            {text("Komentarze i zaangażowanie", "Comments and engagement")}
          </h2>

          <p className={`mt-2 max-w-3xl text-sm leading-6 ${mutedClass}`}>
            {text(
              "Pobieraj komentarze z połączonych platform, odpowiadaj na konkretne komentarze i dodawaj komentarze pod własnymi postami. AI przygotowuje szkic, ale publikacja następuje dopiero po ręcznym zatwierdzeniu.",
              "Import comments from connected platforms, reply to selected comments and add new comments under your own posts. AI prepares a draft, but nothing is published without your approval."
            )}
          </p>
        </div>

        <div className={`rounded-2xl px-4 py-3 text-xs ${dark ? "bg-white/5 text-white/70" : "bg-stone-100 text-stone-600"}`}>
          Workspace: {workspaceId}
        </div>
      </div>

      {error && (
        <div
          className={`mb-4 rounded-2xl border p-4 text-sm ${
            dark
              ? "border-red-400/30 bg-red-500/10 text-red-100"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {error}
        </div>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {availablePlatforms.map((platform) => {
          const active = platform.id === activePlatform;

          return (
            <button
              key={platform.id}
              type="button"
              onClick={() => handlePlatformChange(platform.id)}
              className={`rounded-2xl border p-3 text-left transition ${
                active ? activeButtonClass : passiveButtonClass
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{platform.label}</span>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                    platform.connectedCount > 0
                      ? dark
                        ? "bg-emerald-400/15 text-emerald-200"
                        : "bg-emerald-100 text-emerald-700"
                      : dark
                        ? "bg-white/10 text-white/50"
                        : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {platform.connectedCount > 0
                    ? text(`${platform.connectedCount} konto`, `${platform.connectedCount} account`)
                    : text("Brak konta", "No account")}
                </span>
              </div>

              <p className={`text-xs leading-5 ${active ? "" : mutedClass}`}>
                {platform.connectedCount > 0
                  ? text("Gotowe do pracy na danych z konta.", "Ready to work with account data.")
                  : text("Podłącz konto w integracjach.", "Connect an account in Integrations.")}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1fr_1fr_1fr]">
        <div className={cardClass}>
          <div className="mb-4">
            <h3 className="font-semibold">{text("Konto", "Account")}</h3>
            <p className={`text-xs ${mutedClass}`}>
              {text("Wybierz połączone konto platformy.", "Select a connected platform account.")}
            </p>
          </div>

          {accountsState === "loading" && (
            <p className={`text-sm ${mutedClass}`}>{text("Ładowanie kont...", "Loading accounts...")}</p>
          )}

          {platformAccounts.length === 0 && accountsState !== "loading" && (
            <div className={`rounded-2xl border border-dashed p-4 text-sm leading-6 ${mutedClass}`}>
              {text(
                `Brak połączonego konta dla platformy ${platformLabels[activePlatform]}. Podłącz konto w integracjach, a ten moduł automatycznie zacznie pobierać posty i komentarze.`,
                `No connected ${platformLabels[activePlatform]} account. Connect it in Integrations and this module will start importing posts and comments.`
              )}
            </div>
          )}

          <div className="space-y-3">
            {platformAccounts.map((account) => {
              const active = account.id === selectedAccountId;

              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => {
                    setSelectedAccountId(account.id);
                    setAiDraft("");
                    setManualPrompt("");
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    active ? activeButtonClass : passiveButtonClass
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {account.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={account.avatarUrl}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${
                          dark ? "bg-white/10" : "bg-stone-200"
                        }`}
                      >
                        {platformShortLabels[account.platform]}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{account.name}</p>
                      <p className={`truncate text-xs ${mutedClass}`}>
                        {account.username || platformLabels[account.platform]}
                      </p>
                    </div>
                  </div>

                  <div className={`mt-3 text-xs ${mutedClass}`}>
                    {text("Ostatnia synchronizacja", "Last synchronization")}: {formatDate(account.lastSyncAt, locale, text("Brak daty", "No date"))}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleSyncAccount}
            disabled={!selectedAccount || postsState === "loading"}
            className={`mt-4 w-full rounded-2xl px-4 py-3 text-sm font-bold transition ${
              selectedAccount
                ? "bg-[#8E443D] text-white hover:brightness-110"
                : dark
                  ? "bg-white/10 text-white/40"
                  : "bg-stone-200 text-stone-500"
            }`}
          >
            {postsState === "loading" ? text("Synchronizacja...", "Synchronizing...") : text("Synchronizuj dane", "Synchronize data")}
          </button>
        </div>

        <div className={cardClass}>
          <div className="mb-4">
            <h3 className="font-semibold">{text("Posty", "Posts")}</h3>
            <p className={`text-xs ${mutedClass}`}>
              {text("Wybierz post, dla którego chcesz pobrać komentarze.", "Select the post whose comments you want to import.")}
            </p>
          </div>

          {postsState === "loading" && (
            <p className={`text-sm ${mutedClass}`}>{text("Ładowanie postów...", "Loading posts...")}</p>
          )}

          {posts.length === 0 && postsState !== "loading" && (
            <div className={`rounded-2xl border border-dashed p-4 text-sm leading-6 ${mutedClass}`}>
              {text(
                "Brak pobranych postów. Kliknij synchronizację albo sprawdź integrację konta.",
                "No imported posts. Run synchronization or check the account integration."
              )}
            </div>
          )}

          <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
            {posts.map((post) => {
              const active = post.id === selectedPostId;

              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => {
                    setSelectedPostId(post.id);
                    setAiDraft("");
                    setManualPrompt("");
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    active
                      ? dark
                        ? "border-[#8E443D] bg-[#8E443D]/15"
                        : "border-[#8E443D] bg-[#8E443D]/10"
                      : dark
                        ? "border-white/10 bg-white/5 hover:bg-white/10"
                        : "border-stone-200 bg-white hover:bg-stone-100"
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h4 className="line-clamp-2 text-sm font-semibold">
                      {post.title || post.content || text("Post bez tytułu", "Untitled post")}
                    </h4>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${dark ? "bg-white/10 text-white/60" : "bg-stone-100 text-stone-600"}`}>
                      {platformShortLabels[post.platform]}
                    </span>
                  </div>

                  <p className={`mb-3 line-clamp-3 text-xs leading-5 ${mutedClass}`}>
                    {post.content}
                  </p>

                  <div className={`grid grid-cols-2 gap-2 text-xs ${mutedClass}`}>
                    <span>{text("Zasięg", "Reach")}: {formatNumber(post.metrics?.reach)}</span>
                    <span>{text("Polub.", "Likes")}: {formatNumber(post.metrics?.likes)}</span>
                    <span>{text("Koment.", "Comments")}: {formatNumber(post.metrics?.comments)}</span>
                    <span>Eng.: {post.metrics?.engagementRate ?? "—"}%</span>
                  </div>

                  <p className={`mt-3 text-xs ${mutedClass}`}>
                    {formatDate(post.publishedAt, locale, text("Brak daty", "No date"))}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className={cardClass}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">{text("Komentarze", "Comments")}</h3>
              <p className={`text-xs ${mutedClass}`}>
                {text("Wybierz komentarz albo dodaj nowy pod postem.", "Select a comment or add a new one under the post.")}
              </p>
            </div>

            <button
              type="button"
              onClick={() => selectedPost && loadComments(selectedPost.id)}
              disabled={!selectedPost || commentsState === "loading"}
              className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                selectedPost
                  ? "bg-[#8E443D] text-white"
                  : dark
                    ? "bg-white/10 text-white/40"
                    : "bg-stone-200 text-stone-500"
              }`}
            >
              {commentsState === "loading" ? text("Pobieram...", "Loading...") : text("Odśwież", "Refresh")}
            </button>
          </div>

          {selectedAccount && !selectedAccount.capabilities.canReadComments && (
            <div className={`rounded-2xl border border-dashed p-4 text-sm leading-6 ${mutedClass}`}>
              {text(
                "API tej platformy nie udostępnia jeszcze komentarzy dla tego połączenia lub brakuje wymaganych uprawnień.",
                "This platform API does not expose comments for this connection yet, or the required permissions are missing."
              )}
            </div>
          )}

          {commentsState === "loading" && (
            <p className={`text-sm ${mutedClass}`}>{text("Ładowanie komentarzy...", "Loading comments...")}</p>
          )}

          {comments.length === 0 &&
            commentsState !== "loading" &&
            selectedAccount?.capabilities.canReadComments && (
              <div className={`rounded-2xl border border-dashed p-4 text-sm leading-6 ${mutedClass}`}>
                {text(
                  "Brak komentarzy dla wybranego posta albo platforma nie zwróciła żadnych komentarzy.",
                  "The selected post has no comments, or the platform returned none."
                )}
              </div>
            )}

          <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
            {comments.map((comment) => {
              const active = comment.id === selectedCommentId;

              return (
                <button
                  key={comment.id}
                  type="button"
                  onClick={() => {
                    setSelectedCommentId(comment.id);
                    setAction("reply");
                    setAiDraft("");
                    setManualPrompt("");
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    active
                      ? dark
                        ? "border-[#B86ADF]/70 bg-[#B86ADF]/15"
                        : "border-[#8E443D] bg-[#8E443D]/10"
                      : dark
                        ? "border-white/10 bg-white/5 hover:bg-white/10"
                        : "border-stone-200 bg-white hover:bg-stone-100"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {comment.authorName}
                      </p>
                      <p className={`truncate text-xs ${mutedClass}`}>
                        {comment.authorUsername || formatDate(comment.createdAt, locale, text("Brak daty", "No date"))}
                      </p>
                    </div>

                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${dark ? "bg-white/10 text-white/60" : "bg-stone-100 text-stone-600"}`}>
                      {sentimentLabel(comment.sentiment, text)}
                    </span>
                  </div>

                  <p className="text-sm leading-6">{comment.text}</p>

                  <p className={`mt-3 text-xs ${mutedClass}`}>
                    {text("Status", "Status")}: {comment.status || "new"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className={cardClass}>
          <div className="mb-4">
            <h3 className="font-semibold">{text("Akcja i AI", "Action and AI")}</h3>
            <p className={`text-xs ${mutedClass}`}>
              {text(
                "Wybierz akcję. AI może przygotować treść automatycznie z kontekstu.",
                "Choose an action. AI can prepare a draft automatically from the context."
              )}
            </p>
          </div>

          <div className="mb-4 grid gap-2">
            {[
              {
                id: "reply" as ActionType,
                label: text("Odpowiedz na wybrany komentarz", "Reply to the selected comment"),
              },
              {
                id: "new-comment" as ActionType,
                label: text("Dodaj nowy komentarz pod postem", "Add a new comment under the post"),
              },
              {
                id: "ai-suggestion" as ActionType,
                label: text("Wygeneruj sugestię komentarza", "Generate a comment suggestion"),
              },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setAction(item.id);
                  setAiDraft("");
                }}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  action === item.id ? activeButtonClass : passiveButtonClass
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            {(["deepseek", "gemini"] as const).map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => setAiProvider(provider)}
                className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                  aiProvider === provider ? activeButtonClass : passiveButtonClass
                }`}
              >
                {provider === "deepseek" ? "DeepSeek" : "Gemini"}
              </button>
            ))}
          </div>

          <label className="mb-2 block text-sm font-semibold">
            {text("Dodatkowa instrukcja dla AI", "Additional instruction for AI")}
          </label>

          <textarea
            value={manualPrompt}
            onChange={(event) => setManualPrompt(event.target.value)}
            placeholder={text(
              "Opcjonalnie: np. odpowiedz krótko, zaproś do kontaktu, użyj ciepłego tonu...",
              "Optional: e.g. keep it short, invite them to contact us, use a warm tone..."
            )}
            className={`mb-4 min-h-24 w-full resize-none rounded-2xl border p-3 text-sm leading-6 outline-none ${
              dark
                ? "border-white/10 bg-black/30 text-white placeholder:text-white/30"
                : "border-stone-200 bg-white text-[#231F20]"
            }`}
          />

          <button
            type="button"
            onClick={handleGenerateAiDraft}
            disabled={!selectedPost || aiState === "loading"}
            className={`mb-4 w-full rounded-2xl px-4 py-3 text-sm font-bold transition ${
              selectedPost
                ? dark
                  ? "bg-[#B86ADF] text-white hover:brightness-110"
                  : "bg-[#8E443D] text-white hover:brightness-110"
                : dark
                  ? "bg-white/10 text-white/40"
                  : "bg-stone-200 text-stone-500"
            }`}
          >
            {aiState === "loading" ? text("AI generuje...", "AI is generating...") : text("Wygeneruj treść AI", "Generate AI draft")}
          </button>

          <label className="mb-2 block text-sm font-semibold">
            {text("Treść do zatwierdzenia", "Draft for approval")}
          </label>

          <textarea
            value={aiDraft}
            onChange={(event) => setAiDraft(event.target.value)}
            placeholder={text(
              "Tutaj pojawi się odpowiedź AI albo wpisz własną treść komentarza...",
              "The AI reply will appear here, or write your own comment..."
            )}
            className={`min-h-44 w-full resize-none rounded-2xl border p-3 text-sm leading-6 outline-none ${
              dark
                ? "border-[#B86ADF]/30 bg-[#B86ADF]/10 text-white placeholder:text-white/30"
                : "border-[#8E443D]/20 bg-[#8E443D]/10 text-[#231F20]"
            }`}
          />

          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={handlePublish}
              disabled={!canPublishCurrentAction || publishState === "loading"}
              className={`w-full rounded-2xl px-4 py-3 text-sm font-bold transition ${
                canPublishCurrentAction
                  ? "bg-[#8E443D] text-white hover:brightness-110"
                  : dark
                    ? "bg-white/10 text-white/40"
                    : "bg-stone-200 text-stone-500"
              }`}
            >
              {publishState === "loading"
                ? text("Publikuję...", "Publishing...")
                : text("Zatwierdź i opublikuj", "Approve and publish")}
            </button>

            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(aiDraft)}
              disabled={!aiDraft.trim()}
              className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold ${passiveButtonClass}`}
            >
              {text("Kopiuj szkic", "Copy draft")}
            </button>
          </div>

          <p className={`mt-4 text-xs leading-5 ${mutedClass}`}>
            {text(
              "AI nie publikuje automatycznie. Użytkownik wybiera post, komentarz i akcję, edytuje treść, a następnie zatwierdza publikację.",
              "AI never publishes automatically. You choose the post, comment and action, edit the draft and approve publication."
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
