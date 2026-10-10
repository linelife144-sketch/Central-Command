 'use client';
import { isAdminClassRole } from '@/lib/auth/roleGuards';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { ticketService } from '@/lib/services/ticketService';
import { stormEventService } from '@/lib/services/stormEventService';
import { getTicketTemplateByUtilityClient, normalizeUtilityClient, type TicketTemplateFieldConfig } from '@/lib/tickets/templates';
import type { Ticket } from '@/types';
export function UtilityTicketDetails({ ticket }: { ticket: Ticket }) {
  const { profile } = useAuth();
  const canOpenStorm = isAdminClassRole(profile?.role);
  const [data, setData] = useState<{ code: string; fields: TicketTemplateFieldConfig[]; payload: Record<string, unknown> } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!ticket.storm_event_id) return;
    let active = true;
    Promise.all([stormEventService.getStormEventById(ticket.storm_event_id), ticketService.getUtilityPayload(ticket.id)])
      .then(([storm, payload]) => {
        if (!storm || !payload || !active) return;
        const template = getTicketTemplateByUtilityClient(normalizeUtilityClient(storm.utilityClient));
        setData({ code: storm.eventCode, fields: (storm.configSnapshot?.field_definitions as TicketTemplateFieldConfig[] | undefined) ?? template.fieldConfig, payload });
      }).catch(error => { if (active) setError(error instanceof Error ? error.message : 'Unable to load utility details.'); });
    return () => { active = false; };
  }, [ticket.id, ticket.storm_event_id]);
  if (error) return <p role="alert">{error}</p>;
  if (!data) return null;
  return <section className="rounded-xl border p-5"><h2 className="mb-4 font-semibold">Utility Ticket Details</h2>
    <div className="font-mono text-grid-blue">{canOpenStorm ? <Link className="underline" href={`/admin/storms/${ticket.storm_event_id}`}>{data.code}</Link> : data.code}</div>
    <dl className="mt-4 grid gap-4 sm:grid-cols-2">{data.fields.filter(field => data.payload[field.fieldKey] !== undefined && data.payload[field.fieldKey] !== '').map(field => {
      const value = data.payload[field.fieldKey];
      return <div key={field.fieldKey}><dt className="text-sm text-grid-muted">{field.label}</dt><dd>{field.enumLabels?.[String(value)] ?? (typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value))}</dd></div>;
    })}</dl></section>;
}
