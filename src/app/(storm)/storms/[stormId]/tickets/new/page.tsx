import { Suspense } from 'react';

import { TicketNewClientPage } from './ticket-new-client-page';

interface TicketNewPageProps {
  params: Promise<{ stormId: string }>;
}

export default async function TicketNewPage({ params }: TicketNewPageProps) {
  const { stormId } = await params;

  return (
    <Suspense fallback={<div className="storm-surface rounded-xl border-[rgba(255,192,56,0.75)] p-4 text-sm text-blue-100 shadow-[0_12px_28px_rgba(0,20,80,0.3)]">Loading ticket form...</div>}>
      <TicketNewClientPage stormId={stormId} />
    </Suspense>
  );
}
