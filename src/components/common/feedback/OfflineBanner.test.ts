import { describe, expect, it } from 'vitest';

import { readOnlineStatus, shouldRenderOfflineBanner } from './OfflineBanner';

describe('shouldRenderOfflineBanner', () => {
  it('returns true when offline', () => {
    expect(shouldRenderOfflineBanner(false)).toBe(true);
  });

  it('returns false when online', () => {
    expect(shouldRenderOfflineBanner(true)).toBe(false);
  });
});

describe('readOnlineStatus', () => {
  it('defaults to true when navigator is unavailable', () => {
    const originalNavigator = globalThis.navigator;

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    expect(readOnlineStatus()).toBe(true);

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      writable: true,
      value: originalNavigator,
    });
  });

  it('defaults to true when navigator.onLine is not a boolean', () => {
    const originalNavigator = globalThis.navigator;

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      writable: true,
      value: { onLine: undefined },
    });

    expect(readOnlineStatus()).toBe(true);

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      writable: true,
      value: originalNavigator,
    });
  });
});
