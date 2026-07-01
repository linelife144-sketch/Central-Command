import Link from 'next/link';
import { SearchX } from 'lucide-react';

import { BrandMark } from '@/components/common/brand/BrandMark';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="safe-area-pr safe-area-pl flex min-h-screen items-center justify-center bg-grid-shell p-4">
      <div className="storm-surface w-full max-w-lg rounded-xl p-6 text-center shadow-card">
        <div className="mb-5 flex justify-center">
          <BrandMark portalLabel="Secure Access" variant="full" />
        </div>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-grid-storm-100 text-grid-navy">
          <SearchX className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold text-grid-navy">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          The route you requested is not available in this workspace.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild className="flex-1">
            <Link href="/tickets">Open Tickets</Link>
          </Button>
          <Button asChild className="flex-1" variant="outline">
            <Link href="/login">Return to Login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

