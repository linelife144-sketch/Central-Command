'use client';

import { useEffect, type ReactNode } from 'react';

import {
  registerBackgroundSyncTags,
  registerGridServiceWorker,
  isServiceWorkerSupported,
} from '@/lib/pwa/serviceWorker';

const DEV_RUNTIME_RECOVERY_KEY = 'grid-dev-runtime-recovery-attempted';

function isEventLikeReason(reason: unknown): boolean {
  return reason instanceof Event || String(reason) === '[object Event]';
}

async function clearGridCaches(): Promise<void> {
  if (!('caches' in window)) {
    return;
  }

  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.startsWith('grid-electric-'))
      .map((key) => caches.delete(key)),
  );
}

async function unregisterAllServiceWorkers(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

function recoverDevRuntime(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  if (sessionStorage.getItem(DEV_RUNTIME_RECOVERY_KEY) === '1') {
    return;
  }

  sessionStorage.setItem(DEV_RUNTIME_RECOVERY_KEY, '1');
  window.location.reload();
}

export function ServiceWorkerProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!isServiceWorkerSupported()) {
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      // Dev mode: prevent stale cached app bundles from masking recent code changes.
      void unregisterAllServiceWorkers().catch(() => null);
      void clearGridCaches().catch(() => null);

      const handleWindowError = (event: Event) => {
        const errorEvent = event as ErrorEvent;
        const isScriptTarget =
          typeof HTMLScriptElement !== 'undefined'
          && errorEvent.target instanceof HTMLScriptElement;
        const eventShapedError =
          isEventLikeReason(errorEvent.error)
          || errorEvent.message === '[object Event]';

        if (!isScriptTarget && !eventShapedError) {
          return;
        }

        event.preventDefault();
        void unregisterAllServiceWorkers()
          .then(() => clearGridCaches())
          .finally(() => recoverDevRuntime());
      };

      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        if (!isEventLikeReason(event.reason)) {
          return;
        }

        event.preventDefault();
        void unregisterAllServiceWorkers()
          .then(() => clearGridCaches())
          .finally(() => recoverDevRuntime());
      };

      window.addEventListener('error', handleWindowError, true);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('error', handleWindowError, true);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }

    let isMounted = true;

    const registerWorker = async () => {
      try {
        const registration = await registerGridServiceWorker('/sw.js');
        if (!registration || !isMounted) {
          return;
        }

        await registerBackgroundSyncTags(registration);
      } catch {
        // Offline sync remains optional; avoid noisy console overlays for non-critical failures.
      }
    };

    void registerWorker();

    const handleOnline = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registerBackgroundSyncTags(registration);
      } catch {
        // Ignore transient sync registration failures.
      }
    };

    window.addEventListener('online', handleOnline);

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return <>{children}</>;
}
