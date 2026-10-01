'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { stormEventService, type StormEventSummary } from '@/lib/services/stormEventService';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { Button } from '@/components/ui/button';

export function StormTicketStart() {
  const router = useRouter(); const query = useSearchParams();
  const [storms, setStorms] = useState<StormEventSummary[]>([]);
  const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    stormEventService.listStormEvents().then(events => {
      if (!active) return;
      setStorms(events);
      const selected = query.get('storm_event_id');
      if (selected && events.some(event => event.id === selected)) {
        const priority = query.get('priority');
        router.replace(`/storms/${selected}/tickets/new${priority ? `?priority=${encodeURIComponent(priority)}` : ''}`);
      }
    }).catch(error => { if (active) setError(error instanceof Error ? error.message : 'Unable to load storms.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, router]);
  return <div className="mx-auto max-w-3xl space-y-6">
    <PageHeader title="Select a Storm Event" description="Every ticket belongs to a storm. Its utility sets the ticket form and equipment names." backHref="/tickets" />
    {error && <p role="alert">{error}</p>}
    {loading ? <p>Loading storm events...</p> : storms.length === 0 ? <div className="storm-surface rounded-xl p-6"><p className="mb-4">Create your first storm event before adding tickets or contractors.</p><Button asChild variant="storm"><Link href="/admin/storms/create">Create Storm Event</Link></Button></div> :
      storms.map(event => <Link key={event.id} href={`/storms/${event.id}/tickets/new${query.get('priority') ? `?priority=${encodeURIComponent(query.get('priority')!)}` : ''}`} className="storm-surface block rounded-xl border p-5 hover:border-grid-blue">
        <span className="font-mono text-sm text-grid-blue">{event.eventCode}</span><h2 className="mt-1 text-lg font-semibold">{event.name}</h2><p className="text-sm text-grid-muted">{event.utilityClient} · {event.status}</p>
      </Link>)}
  </div>;
}
