'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ticketFieldProgressWorkflow } from '@/lib/services/ticketFieldProgressWorkflow';
import type { Ticket } from '@/types';

interface TicketFieldActionButtonProps {
  ticket: Ticket & { field_progress_pending?: boolean; field_progress_error?: string };
  actorProfileId: string;
  contractorId: string | null;
  startLabel?: string;
  continueLabel?: string;
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  navigateAfterStart?: boolean;
  onTicketUpdated?: (ticket: Ticket) => void | Promise<void>;
}

export function TicketFieldActionButton({
  ticket,
  actorProfileId,
  contractorId,
  startLabel = 'Start',
  continueLabel = 'Continue work',
  size = 'default',
  className,
  navigateAfterStart = true,
  onTicketUpdated,
}: TicketFieldActionButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlight = useRef(false);
  const href = `/tickets/${ticket.id}/work`;
  const canStart = Boolean(
    contractorId
      && ticket.crew_id
      && ticket.team_lead_id
      && ticket.assigned_to
      && ticket.assigned_driver_id
      && (ticket.assigned_to === contractorId || ticket.assigned_driver_id === contractorId),
  );

  // REJECTED is an open legacy contractor state in existing records. Let the
  // contractor enter Ticket work, but leave its status untouched until staff
  // reassigns it to the guarded ASSIGNED field workflow.
  if (String(ticket.status) === 'REJECTED') {
    return (
      <Button asChild variant="accent" size={size} className={className}>
        <Link href={href}>
          {startLabel}<ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </Button>
    );
  }

  if (ticket.status !== 'ASSIGNED') {
    if (['PENDING_REVIEW', 'APPROVED', 'CLOSED', 'ARCHIVED', 'EXPIRED'].includes(ticket.status)) return null;
    return (
      <div className="flex flex-col items-start gap-1">
        <Button asChild variant="outline" size={size} className={className}>
          <Link href={href}>
            {continueLabel}<ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
        {ticket.field_progress_pending && <p role="status" className="text-xs font-medium text-amber-800">Waiting to sync</p>}
        {ticket.field_progress_error && <p role="alert" className="max-w-64 text-xs text-destructive">{ticket.field_progress_error}</p>}
      </div>
    );
  }

  const start = async () => {
    if (!contractorId || !canStart || inFlight.current) return;
    inFlight.current = true;
    setIsSubmitting(true);
    try {
      const result = await ticketFieldProgressWorkflow.recordAction({
        ticket,
        actorProfileId,
        contractorId,
        action: 'START',
      });
      await onTicketUpdated?.(result.ticket);
      toast.success(result.offline
        ? 'Start saved on this device. Waiting to sync.'
        : 'Ticket is en route.');
      if (navigateAfterStart && window.location.pathname !== href) router.push(href);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to start this ticket.');
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="accent"
        size={size}
        className={className}
        onClick={() => void start()}
        disabled={!canStart || isSubmitting}
        aria-label={`${startLabel} ticket ${ticket.ticket_number}`}
      >
        {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Navigation className="size-4" aria-hidden="true" />}
        {isSubmitting ? 'Starting…' : startLabel}
      </Button>
      {ticket.field_progress_pending && <p role="status" className="text-xs font-medium text-amber-800">Waiting to sync</p>}
      {ticket.field_progress_error && <p role="alert" className="max-w-64 text-xs text-destructive">{ticket.field_progress_error}</p>}
    </div>
  );
}
