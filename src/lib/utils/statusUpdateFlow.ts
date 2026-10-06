import type { TicketStatus } from '@/types';

export interface FieldStatusTransition {
  currentStatus: TicketStatus;
  nextStatus: TicketStatus;
  actionLabel: string;
  requiresGeofence: boolean;
}

const FIELD_STATUS_TRANSITIONS: Record<string, Omit<FieldStatusTransition, 'currentStatus'>> = {
  ASSIGNED: {
    nextStatus: 'IN_ROUTE',
    actionLabel: 'Start Ticket',
    requiresGeofence: false,
  },
  IN_ROUTE: {
    nextStatus: 'ON_SITE',
    actionLabel: 'Mark On Site',
    requiresGeofence: true,
  },
  NEEDS_REWORK: {
    nextStatus: 'IN_PROGRESS',
    actionLabel: 'Begin corrections',
    requiresGeofence: true,
  },
  ON_SITE: {
    nextStatus: 'IN_PROGRESS',
    actionLabel: 'Begin assessment',
    requiresGeofence: true,
  },
};

export function getFieldStatusTransition(currentStatus: TicketStatus): FieldStatusTransition | null {
  const transition = FIELD_STATUS_TRANSITIONS[currentStatus];
  if (!transition) {
    return null;
  }

  return {
    currentStatus,
    ...transition,
  };
}

export function isFieldStatusFlowStep(status: TicketStatus): boolean {
  return status === 'ASSIGNED' || status === 'IN_ROUTE' || status === 'ON_SITE' || status === 'COMPLETE';
}

export type ContractorTicketStatus = 'OPEN' | 'COMPLETE';

/**
 * Contractors only ever see "Open" or "Complete". Every in-flight step
 * (assigned, en route, on site, in progress, under review, rework) is "Open";
 * a ticket becomes "Complete" after final approval by the CEO or storm manager.
 */
export function getContractorTicketStatus(status: string): ContractorTicketStatus {
  return ['APPROVED', 'CLOSED', 'ARCHIVED'].includes(status) ? 'COMPLETE' : 'OPEN';
}
