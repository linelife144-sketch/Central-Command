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
  return ['ASSIGNED', 'IN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'COMPLETE'].includes(status);
}

export type ContractorTicketStatus = 'OPEN' | 'CLOSED';

/**
 * Contractors only see whether they still have an action to take. Review and
 * approval stages are closed from their view; returned corrections reopen it.
 */
export function getContractorTicketStatus(status: string): ContractorTicketStatus {
  return ['PENDING_REVIEW', 'APPROVED', 'CLOSED', 'ARCHIVED', 'EXPIRED'].includes(status) ? 'CLOSED' : 'OPEN';
}

export function getStaffTicketStatusLabel(status: string, reviewStage?: string | null, utilitySubmittedAt?: string | null): string {
  const normalizedStage = reviewStage?.toUpperCase();
  if (utilitySubmittedAt || normalizedStage === 'UTILITY_SUBMITTED') return 'Submitted to utility';
  if (status === 'PENDING_REVIEW' && normalizedStage === 'FINAL_REVIEW') return 'Final review · CEO / Super Admin';
  if (status === 'PENDING_REVIEW') return 'Review · team lead';
  if (status === 'NEEDS_REWORK') return 'Corrections';
  if (status === 'IN_PROGRESS' || status === 'COMPLETE' || status === 'ON_SITE') return 'On site';
  if (status === 'IN_ROUTE') return 'En route';
  return status.toLowerCase().split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
