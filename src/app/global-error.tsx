'use client';

import { AlertOctagon } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body className="safe-area-pr safe-area-pl bg-grid-shell">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="storm-surface w-full max-w-lg rounded-xl p-6 text-center shadow-card">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">
              <AlertOctagon className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-semibold text-grid-navy">Unexpected application error</h1>
            <p className="mt-2 text-sm text-slate-600">
              {error.message || 'Something went wrong while rendering this view.'}
            </p>
            <Button className="mt-5" onClick={reset}>
              Reload View
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}

