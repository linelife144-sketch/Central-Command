'use client';

import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { useAuth } from '@/components/providers/AuthProvider';
import { getContractorTicketStatus, getStaffTicketStatusLabel } from '@/lib/utils/statusUpdateFlow';

interface TicketStatusBadgeProps {
  status: string;
  audienceRole?: 'CONTRACTOR' | 'STAFF';
  reviewStage?: string | null;
  utilitySubmittedAt?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Role-aware ticket status badge. Contractors only see "Open" or "Closed";
 * admins, team leads and executives see the full workflow status.
 */
export function TicketStatusBadge({ status, audienceRole, reviewStage, utilitySubmittedAt, size, className }: TicketStatusBadgeProps) {
  const { profile } = useAuth();

  if (audienceRole === 'CONTRACTOR' || (audienceRole === undefined && profile?.role === 'CONTRACTOR')) {
    const contractorStatus = getContractorTicketStatus(status);
    return (
      <StatusBadge
        status={status}
        displayLabel={contractorStatus}
        variant={contractorStatus === 'CLOSED' ? 'success' : 'info'}
        size={size}
        className={className}
      />
    );
  }

  const normalizedStage = reviewStage?.toUpperCase();
  const label = getStaffTicketStatusLabel(status, reviewStage, utilitySubmittedAt);
  const variant = status === 'APPROVED' || status === 'CLOSED' || normalizedStage === 'UTILITY_SUBMITTED'
    ? 'success'
    : status === 'NEEDS_REWORK'
      ? 'danger'
      : status === 'PENDING_REVIEW'
        ? 'warning'
        : ['ASSIGNED', 'IN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'COMPLETE'].includes(status)
          ? 'info'
          : 'neutral';

  return <StatusBadge status={status} displayLabel={label} variant={variant} size={size} className={className} />;
}
