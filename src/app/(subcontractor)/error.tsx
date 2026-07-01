'use client';

import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ContractorErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ContractorError({ error, reset }: ContractorErrorProps) {
  return (
    <div className="storm-surface mx-auto max-w-xl rounded-xl p-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-semibold text-grid-navy">Contractor workspace temporarily unavailable</h2>
      <p className="mt-2 text-sm text-slate-600">
        {error.message || 'We could not load this contractor segment right now.'}
      </p>
      <Button className="mt-5" onClick={reset}>
        Try Again
      </Button>
    </div>
  );
}

