'use client';

import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { useAuth } from '@/components/providers/AuthProvider';
import { getContractorTicketStatus } from '@/lib/utils/statusUpdateFlow';

interface TicketStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Role-aware ticket status badge. Contractors only see "Open" or "Complete";
 * admins, team leads and executives see the full workflow status.
 */
export function TicketStatusBadge({ status, size, className }: TicketStatusBadgeProps) {
  const { profile } = useAuth();

  if (profile?.role === 'CONTRACTOR') {
    const contractorStatus = getContractorTicketStatus(status);
    return (
      <StatusBadge
        status={contractorStatus}
        variant={contractorStatus === 'COMPLETE' ? 'success' : 'info'}
        size={size}
        className={className}
      />
    );
  }

  return <StatusBadge status={status} size={size} className={className} />;
}
