export type PublishResult = {
  ok: boolean;
  platform: string;
  externalPostId?: string | null;
  externalPostUrl?: string | null;
  warning?: string | null;
  error?: string;
};

export async function publishScheduledPost(
  workspaceId: string,
  scheduledPostId: string
): Promise<PublishResult> {
  const response = await fetch("/api/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceId, scheduledPostId }),
  });

  const payload = (await response.json().catch(() => null)) as PublishResult | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || `Publishing failed (${response.status})`);
  }

  return payload;
}
