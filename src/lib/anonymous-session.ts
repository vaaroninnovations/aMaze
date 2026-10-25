const STORAGE_KEY = "amaze.anonymous-session";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getAnonymousSessionId(): string {
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing && UUID_PATTERN.test(existing)) return existing;

  const sessionId = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, sessionId);
  return sessionId;
}
