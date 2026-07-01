import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_BACKGROUND_SYNC_TAGS,
  isBackgroundSyncSupported,
  isServiceWorkerSupported,
  registerBackgroundSyncTags,
  registerGridServiceWorker,
} from './serviceWorker';

type ServiceWorkerNavigatorLike = {
  serviceWorker?: {
    register: (scriptUrl: string) => Promise<ServiceWorkerRegistration>;
  };
};

function withNavigator(navigatorMock: ServiceWorkerNavigatorLike) {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value: navigatorMock as unknown as Navigator,
  });
}

describe('isServiceWorkerSupported', () => {
  beforeEach(() => {
    withNavigator({} as ServiceWorkerNavigatorLike);
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: {},
    });
  });

  it('returns false when service workers are unavailable', () => {
    expect(isServiceWorkerSupported()).toBe(false);
  });

  it('returns true when service workers are available', () => {
    withNavigator({
      serviceWorker: {
        register: vi.fn(),
      },
    });

    expect(isServiceWorkerSupported()).toBe(true);
  });
});

describe('registerGridServiceWorker', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: {},
    });
  });

  it('registers the service worker when supported', async () => {
    const registration = {} as ServiceWorkerRegistration;
    const register = vi.fn().mockResolvedValue(registration);

    withNavigator({
      serviceWorker: { register },
    });

    const result = await registerGridServiceWorker('/sw.js');

    expect(result).toBe(registration);
    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it('returns null when service workers are unsupported', async () => {
    withNavigator({} as ServiceWorkerNavigatorLike);
    await expect(registerGridServiceWorker('/sw.js')).resolves.toBeNull();
  });
});

describe('background sync helpers', () => {
  it('detects background sync support on registrations', () => {
    const supportedRegistration = {
      sync: { register: vi.fn() },
    } as unknown as ServiceWorkerRegistration;
    const unsupportedRegistration = {} as ServiceWorkerRegistration;

    expect(isBackgroundSyncSupported(supportedRegistration)).toBe(true);
    expect(isBackgroundSyncSupported(unsupportedRegistration)).toBe(false);
  });

  it('registers all configured background sync tags', async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    const registration = {
      sync: { register },
    } as unknown as ServiceWorkerRegistration;

    const result = await registerBackgroundSyncTags(registration);

    expect(result).toEqual([...DEFAULT_BACKGROUND_SYNC_TAGS]);
    expect(register).toHaveBeenCalledTimes(DEFAULT_BACKGROUND_SYNC_TAGS.length);
  });

  it('returns empty list when sync is not supported', async () => {
    const registration = {} as ServiceWorkerRegistration;
    const result = await registerBackgroundSyncTags(registration);
    expect(result).toEqual([]);
  });
});
