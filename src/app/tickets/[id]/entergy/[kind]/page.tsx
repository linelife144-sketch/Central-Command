'use client';

import { isSuperAdminClassRole } from '@/lib/auth/roleGuards';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { EntergyForm } from '@/components/features/assessments/EntergyForm';
import { useAuth } from '@/components/providers/AuthProvider';
import { useContractorId } from '@/hooks/useContractorId';
import { entergyForms } from '@/lib/schemas/entergyForms';
import { ticketService } from '@/lib/services/ticketService';
import type { Ticket } from '@/types';

export default function EntergyTicketFormPage() {
  const { id, kind } = useParams<{ id: string; kind: string }>();
  const router = useRouter(); const { profile, can } = useAuth();
  const { contractorId } = useContractorId(profile?.role === 'CONTRACTOR' ? profile.id : undefined);
  const [ticket, setTicket] = useState<Ticket | null>(null); const [error, setError] = useState('');
  useEffect(() => { let active=true; void ticketService.getTicketById(id).then(t=>{if(active)setTicket(t);}).catch(e=>{if(active)setError(e.message ?? 'Unable to load this ticket.');});return()=>{active=false;}; },[id]);
  if (kind !== 'cleanup' && kind !== 'damage') return <p role="alert">Choose the clean-up or damage assessment form from your ticket.</p>;
  const chief = isSuperAdminClassRole(profile?.role);
  const allowed = profile && ticket?.assigned_to && ticket.utility_client.toUpperCase()==='ENTERGY' && ((chief && can('admin.assessments.edit')) || profile.role === 'CONTRACTOR' && contractorId === ticket.assigned_to);
  return <div className="space-y-6"><PageHeader title={entergyForms[kind].title} description={ticket ? `Entergy · ${ticket.ticket_number}` : 'Entergy ticket form'} showBackButton backHref={`/tickets/${id}/work`}/>{error?<p role="alert">{error}</p>:!ticket||!profile?<p role="status">Loading your ticket…</p>:!allowed?<p role="alert">Only the assigned damage assessor or an authorized storm manager can fill out this ticket’s Entergy forms.</p>:!['ON_SITE','IN_PROGRESS','NEEDS_REWORK'].includes(ticket.status)?<p role="status">The assigned crew must confirm arrival before filling out this form. Return to Ticket work to begin travel and verify arrival.</p>:<EntergyForm key={`${profile.id}:${id}:${kind}`} kind={kind} ticket={ticket} actorProfileId={profile.id} onSaved={()=>router.push(`/tickets/${id}/work#entergy-forms`)}/>}</div>;
}
