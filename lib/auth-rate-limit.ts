const attempts = new Map<string, { count: number; resetAt: number }>();

export function allowAuthRequest(key: string, limit = 4, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export function requestKey(request: Request, action: string, email: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${action}:${forwarded || "unknown"}:${email.toLowerCase()}`;
}
