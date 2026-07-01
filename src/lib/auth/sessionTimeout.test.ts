import { describe, expect, it } from 'vitest';

import { isSessionExpired, MAX_INACTIVITY_MS } from './sessionTimeout';

describe('isSessionExpired', () => {
  const now = 1_700_000_000_000;

  it('returns false when no activity timestamp exists', () => {
    expect(isSessionExpired(undefined, now)).toBe(false);
    expect(isSessionExpired(null, now)).toBe(false);
    expect(isSessionExpired('', now)).toBe(false);
  });

  it('returns false when timestamp is invalid', () => {
    expect(isSessionExpired('invalid', now)).toBe(false);
  });

  it('returns false when inactivity is within 24 hours', () => {
    const withinWindow = String(now - MAX_INACTIVITY_MS + 1);
    expect(isSessionExpired(withinWindow, now)).toBe(false);
  });

  it('returns true when inactivity exceeds 24 hours', () => {
    const expired = String(now - MAX_INACTIVITY_MS - 1);
    expect(isSessionExpired(expired, now)).toBe(true);
  });
});
