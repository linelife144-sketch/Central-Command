export const SESSION_ACTIVITY_COOKIE = 'ges_last_activity_at';
export const MAX_INACTIVITY_MS = 24 * 60 * 60 * 1000;

export function getActivityCookieValue(now = Date.now()): string {
  return String(now);
}

export function isSessionExpired(
  lastActivityTimestamp: string | null | undefined,
  now = Date.now(),
  maxInactivityMs = MAX_INACTIVITY_MS
): boolean {
  if (!lastActivityTimestamp) {
    return false;
  }

  const parsedTimestamp = Number(lastActivityTimestamp);
  if (!Number.isFinite(parsedTimestamp)) {
    return false;
  }

  return now - parsedTimestamp > maxInactivityMs;
}
