'use client';

import { useEffect, useState } from 'react';

export function readOnlineStatus(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean') {
    return true;
  }

  return navigator.onLine;
}

export function shouldRenderOfflineBanner(isOnline: boolean): boolean {
  return !isOnline;
}

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(readOnlineStatus);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.style.setProperty(
      '--offline-banner-height',
      isOnline ? '0px' : 'calc(2.5rem + var(--safe-area-top))',
    );

    return () => {
      document.documentElement.style.setProperty('--offline-banner-height', '0px');
    };
  }, [isOnline]);

  if (!shouldRenderOfflineBanner(isOnline)) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="safe-area-pt fixed top-0 left-0 right-0 z-[60] border-b border-grid-warning bg-grid-warning-soft px-4 py-2 text-sm font-medium text-grid-navy shadow-sm"
      role="status"
    >
      You are offline. Changes will be queued and synced when connection is restored.
    </div>
  );
}
