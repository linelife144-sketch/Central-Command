'use client';

import { cn } from '@/lib/utils';

type StatusVariant = 
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'active'
  | 'inactive'
  | 'pending'
  | 'approved'
  | 'rejected';

interface StatusBadgeProps {
  status: string;
  displayLabel?: string;
  variant?: StatusVariant;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles: Record<StatusVariant, string> = {
  default: 'bg-muted text-muted-foreground border-border-strong',
  success: 'bg-grid-success-soft text-grid-success-ink border-grid-success',
  warning: 'bg-grid-warning-soft text-grid-warning-ink border-grid-warning',
  danger: 'bg-grid-danger-soft text-grid-danger-ink border-grid-danger',
  info: 'bg-grid-info-soft text-grid-info-ink border-grid-info',
  neutral: 'bg-muted text-muted-foreground border-border-strong',
  active: 'bg-grid-success-soft text-grid-success-ink border-grid-success',
  inactive: 'bg-grid-danger-soft text-grid-danger-ink border-grid-danger',
  pending: 'bg-grid-warning-soft text-grid-warning-ink border-grid-warning',
  approved: 'bg-grid-success-soft text-grid-success-ink border-grid-success',
  rejected: 'bg-grid-danger-soft text-grid-danger-ink border-grid-danger',
};

const dotStyles: Record<StatusVariant, string> = {
  default: 'bg-grid-gray-400',
  success: 'bg-grid-success',
  warning: 'bg-grid-warning',
  danger: 'bg-grid-danger',
  info: 'bg-grid-info',
  neutral: 'bg-grid-gray-400',
  active: 'bg-grid-success',
  inactive: 'bg-grid-danger',
  pending: 'bg-grid-warning',
  approved: 'bg-grid-success',
  rejected: 'bg-grid-danger',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

// Auto-determine variant based on status text
function getVariantFromStatus(status: string): StatusVariant {
  const s = status.toUpperCase();
  
  switch (s) {
    case 'ACTIVE':
    case 'APPROVED':
    case 'COMPLETE':
    case 'CLOSED':
      return 'success';
    
    case 'PENDING':
    case 'PENDING_REVIEW':
    case 'IN_PROGRESS':
    case 'ASSIGNED':
      return 'warning';
    
    case 'INACTIVE':
    case 'REJECTED':
    case 'NEEDS_REWORK':
    case 'EXPIRED':
      return 'danger';
    
    case 'IN_ROUTE':
    case 'ON_SITE':
      return 'info';
    
    case 'DRAFT':
    case 'ARCHIVED':
      return 'neutral';
    
    default:
      return 'default';
  }
}

export function StatusBadge({ 
  status, 
  displayLabel,
  variant,
  className,
  size = 'md' 
}: StatusBadgeProps) {
  const determinedVariant = variant || getVariantFromStatus(status);
  
  // Format the status string for display (e.g., PENDING_REVIEW -> Pending Review)
  const displayStatus = displayLabel ?? status
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-semibold shadow-elevation-xs',
        variantStyles[determinedVariant],
        sizeStyles[size],
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'w-1.5 h-1.5 rounded-full mr-1.5 shrink-0',
          dotStyles[determinedVariant]
        )}
      />
      {displayStatus}
    </span>
  );
}
