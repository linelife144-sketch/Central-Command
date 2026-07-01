export const DEFAULT_BACKGROUND_SYNC_TAGS = [
  'sync-tickets',
  'sync-time-entries',
  'sync-assessments',
  'sync-expenses',
  'sync-photos',
] as const;

export type BackgroundSyncTag = (typeof DEFAULT_BACKGROUND_SYNC_TAGS)[number];

interface BackgroundSyncManagerLike {
  register: (tag: string) => Promise<void>;
}

interface SyncCapableRegistration extends ServiceWorkerRegistration {
  sync?: BackgroundSyncManagerLike;
}

export function isServiceWorkerSupported(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

export function isBackgroundSyncSupported(
  registration: ServiceWorkerRegistration,
): registration is SyncCapableRegistration {
  const syncValue = (registration as SyncCapableRegistration).sync;
  return typeof syncValue?.register === 'function';
}

export async function registerGridServiceWorker(
  scriptUrl = '/sw.js',
): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  return navigator.serviceWorker.register(scriptUrl);
}

export async function registerBackgroundSyncTags(
  registration: ServiceWorkerRegistration,
  tags: readonly string[] = DEFAULT_BACKGROUND_SYNC_TAGS,
): Promise<string[]> {
  if (!isBackgroundSyncSupported(registration)) {
    return [];
  }

  const successfulTags: string[] = [];

  for (const tag of tags) {
    try {
      await registration.sync?.register(tag);
      successfulTags.push(tag);
    } catch {
      // Background sync registration can fail in unsupported/private contexts.
    }
  }

  return successfulTags;
}
