'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ticketAssessmentWorkflow } from '@/lib/services/ticketAssessmentWorkflow';
import { TicketFieldActionButton } from '@/components/features/tickets/TicketFieldActionButton';
import { formatAddress } from '@/lib/utils/formatters';
import type { Ticket, TicketStatus, UserRole } from '@/types';

interface StatusUpdateFlowProps {
  ticket: Ticket & { field_progress_pending?: boolean; field_progress_error?: string };
  userId: string;
  contractorId: string | null;
  canEditAssessment: boolean;
  /** Accepted for compatibility with older callers; field-stage authorization is server enforced. */
  userRole?: UserRole;
  onStatusUpdated?: (newStatus: TicketStatus) => void | Promise<void>;
  startLabel?: string;
  /** Accepted for compatibility; Start now opens Ticket work instead of launching navigation. */
  openNavigation?: (url: string) => void;
}

export function getNavigationUrl(ticket: Ticket, environment: Pick<Navigator, 'userAgent' | 'platform'> = {
  userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
  platform: typeof navigator === 'undefined' ? '' : navigator.platform,
}): string {
  const address = formatAddress(ticket.address, ticket.city ?? null, ticket.state ?? null, ticket.zip_code ?? null);
  const appleDevice = /iPhone|iPad|iPod|Macintosh|Mac OS/.test(environment.userAgent) || /Mac|iPhone|iPad|iPod/.test(environment.platform);
  if (appleDevice) {
    const params = new URLSearchParams({ daddr: address, dirflg: 'd' });
    if (!address.trim() && typeof ticket.latitude === 'number' && typeof ticket.longitude === 'number') params.set('daddr', `${ticket.latitude},${ticket.longitude}`);
    return `https://maps.apple.com/?${params.toString()}`;
  }

  const destination = address.trim() || (typeof ticket.latitude === 'number' && typeof ticket.longitude === 'number' ? `${ticket.latitude},${ticket.longitude}` : '');
  const params = new URLSearchParams({ api: '1', destination, travelmode: 'driving', dir_action: 'navigate' });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function StatusUpdateFlow({ ticket, userId, contractorId, canEditAssessment, onStatusUpdated, startLabel = 'Start' }: StatusUpdateFlowProps) {
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const isEnRoute = ticket.status === 'IN_ROUTE';
  const navigationUrl = useMemo(() => getNavigationUrl(ticket), [ticket]);
  const offlinePending = Boolean(ticket.field_progress_pending);

  useEffect(() => {
    if (!canEditAssessment || !['ON_SITE', 'IN_PROGRESS', 'COMPLETE', 'NEEDS_REWORK'].includes(ticket.status)) {
      void Promise.resolve().then(() => setHasSavedDraft(false));
      return;
    }
    let active = true;
    void ticketAssessmentWorkflow.loadDraft(ticket.id, userId).then(draft => {
      if (active) setHasSavedDraft(Boolean(draft));
    }).catch(() => {
      if (active) setHasSavedDraft(false);
    });
    return () => { active = false; };
  }, [canEditAssessment, ticket.id, ticket.status, userId]);

  // COMPLETE is retained for tickets created under the legacy workflow. Until
  // they have a submitted assessment, contractors still need to finish them.
  const canOpenAssessment = ['ON_SITE', 'IN_PROGRESS', 'COMPLETE'].includes(ticket.status) && canEditAssessment;
  const isCorrections = ticket.status === 'NEEDS_REWORK' && canEditAssessment;

  return (
    <section id="field-actions" aria-labelledby="field-actions-title" className="cc-work-panel overflow-hidden border-t-4 border-t-grid-blue p-5 shadow-card sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-grid-blue"><MapPin className="size-4" aria-hidden="true" /> Field work</div>
        <h2 id="field-actions-title" className="mt-2 font-heading text-xl font-semibold text-grid-navy">
          {isCorrections ? 'Corrections requested' : ticket.status === 'ASSIGNED' ? 'Ready when you are' : isEnRoute ? 'En route to the site' : canOpenAssessment ? 'At the ticket location' : 'Ticket actions'}
        </h2>
        {offlinePending && <p role="status" className="mt-1 text-sm text-amber-800">Saved on this device · waiting to sync</p>}
        {ticket.field_progress_error && <p role="alert" className="mt-1 max-w-2xl text-sm text-destructive">{ticket.field_progress_error}</p>}
        {ticket.status === 'ASSIGNED' && (!ticket.crew_id || !ticket.team_lead_id || !ticket.assigned_driver_id || !ticket.assigned_to || !contractorId) && <p className="mt-1 text-sm text-muted-foreground">A team lead, driver, and assessor must be assigned before you can start.</p>}
        {isEnRoute && <p className="mt-1 text-sm text-muted-foreground">Open the field checklist when you begin your on-site assessment to record arrival.</p>}
        {ticket.status === 'ON_SITE' && !canEditAssessment && <p className="mt-1 text-sm text-muted-foreground">The assigned assessor can open the assessment from this ticket.</p>}
        {ticket.status !== 'ASSIGNED' && !isEnRoute && !canOpenAssessment && !isCorrections && ticket.status !== 'ON_SITE' && (
          <p className="mt-1 text-sm text-muted-foreground">Contact your team lead for the next step on this ticket.</p>
        )}
      </div>
      <div className="mt-4 flex shrink-0 flex-wrap gap-3 sm:mt-0 sm:justify-end">
        {ticket.status === 'ASSIGNED' && <TicketFieldActionButton ticket={ticket} actorProfileId={userId} contractorId={contractorId} startLabel={startLabel} size="lg" navigateAfterStart={false} onTicketUpdated={saved => onStatusUpdated?.(saved.status)} />}
        {isEnRoute && <Button asChild variant="outline" size="lg"><a href={navigationUrl}><ArrowUpRight className="size-4" />Open navigation</a></Button>}
        {canOpenAssessment && <Button asChild variant="accent" size="lg"><Link href={`/tickets/${ticket.id}/assessment`}><MapPin className="size-4" />{hasSavedDraft ? 'Continue assessment' : 'Open assessment'}</Link></Button>}
        {isCorrections && <Button asChild variant="accent" size="lg"><Link href={`/tickets/${ticket.id}/assessment`}><MapPin className="size-4" />Correct assessment</Link></Button>}
      </div>
    </section>
  );
}
