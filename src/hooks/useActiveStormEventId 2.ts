'use client';

import { useEffect, useState } from 'react';

import { ticketService } from '@/lib/services/ticketService';
import { getErrorLogContext, isAuthOrPermissionError } from '@/lib/utils/errorHandling';

const CLOSED_TICKET_STATUSES = new Set(['CLOSED', 'ARCHIVED', 'EXPIRED']);

interface UseActiveStormEventIdResult {
  stormEventId: string | undefined;
  isLoading: boolean;
}

/**
 * Resolves the storm event a contractor should clock time against: the
 * storm_event_id of their most recently updated non-closed assigned
 * ticket. time_entries.storm_event_id is required by a database CHECK
 * constraint (time_entries_storm_event_required, added by an earlier,
 * unrelated storm-first-workflow migration) — TimeClock previously never
 * supplied one, so online clock-in could not have succeeded. This hook
 * closes that gap using data the contractor is already allowed to read
 * (RLS: tickets_select_assigned).
 */
export function useActiveStormEventId(contractorId?: string): UseActiveStormEventIdResult {
  const [stormEventId, setStormEventId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!contractorId) {
      setStormEventId(undefined);
      setIsLoading(false);
      return;
    }

    let active = true;

    const resolve = async () => {
      setIsLoading(true);
      try {
        const tickets = await ticketService.getTicketsByAssignee(contractorId);
        const openTickets = tickets
          .filter((ticket) => ticket.storm_event_id && !CLOSED_TICKET_STATUSES.has(ticket.status.toUpperCase()))
          .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at));

        if (active) {
          setStormEventId(openTickets[0]?.storm_event_id ?? undefined);
        }
      } catch (error) {
        if (!isAuthOrPermissionError(error)) {
          console.warn('Failed to resolve active storm event:', getErrorLogContext(error));
        }
        if (active) {
          setStormEventId(undefined);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void resolve();

    return () => {
      active = false;
    };
  }, [contractorId]);

  return { stormEventId, isLoading };
}
