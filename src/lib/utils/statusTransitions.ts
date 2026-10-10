import { isAdminClassRole } from '@/lib/auth/roleGuards';
import { TicketStatus, UserRole } from "@/types";

/**
 * Validates if a status transition is allowed based on the user's role.
 * 
 * @param current - The current status of the ticket
 * @param next - The desired next status
 * @param role - The role of the user attempting the transition
 * @returns boolean - True if the transition is valid, false otherwise
 */
export function isValidTransition(
  current: TicketStatus,
  next: TicketStatus,
  role: UserRole
): boolean {
  // If no change, it's valid
  if (current === next) return true;

  // Admin Transitions
  if (isAdminClassRole(role)) {
    switch (current) {
      case 'DRAFT':
        return ['ASSIGNED', 'CLOSED'].includes(next);
      case 'ASSIGNED':
        return ['CLOSED'].includes(next);
      case 'PENDING_REVIEW':
        return ['APPROVED', 'NEEDS_REWORK', 'CLOSED'].includes(next);
      case 'APPROVED':
        return ['CLOSED', 'ARCHIVED'].includes(next);
      case 'CLOSED':
        return ['ARCHIVED'].includes(next);
      default:
        // Admin can usually force close any ticket
        if (next === 'CLOSED') return true;
        return false;
    }
  }

  // Contractors use Start and GPS arrival. Assessment save/submit owns all later changes.
  if (role === 'CONTRACTOR') {
    switch (current) {
      case 'ASSIGNED':
        return next === 'IN_ROUTE';
      case 'IN_ROUTE':
        return next === 'ON_SITE';
      default:
        return false;
    }
  }

  return false;
}

/**
 * Returns the list of next possible statuses for a given role and current status.
 */
export function getNextPossibleStatuses(
  current: TicketStatus,
  role: UserRole
): TicketStatus[] {
  const allStatuses: TicketStatus[] = [
    'DRAFT', 'ASSIGNED', 'IN_ROUTE', 'ON_SITE', 
    'IN_PROGRESS', 'COMPLETE', 'PENDING_REVIEW', 'APPROVED', 
    'NEEDS_REWORK', 'CLOSED', 'ARCHIVED', 'EXPIRED'
  ];

  return allStatuses.filter(status => isValidTransition(current, status, role) && status !== current);
}
