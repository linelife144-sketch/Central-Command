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
    actionLabel: 'Start Route',
    requiresGeofence: false,
  },
  IN_ROUTE: {
    nextStatus: 'ON_SITE',
    actionLabel: 'Mark On Site',
    requiresGeofence: true,
  },
  ON_SITE: {
    nextStatus: 'COMPLETE',
    actionLabel: 'Mark Complete',
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
