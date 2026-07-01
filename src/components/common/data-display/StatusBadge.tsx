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
  variant?: StatusVariant;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles: Record<StatusVariant, string> = {
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400',
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
    case 'APPROVED':
    case 'COMPLETE':
    case 'CLOSED':
      return 'success';
    
    case 'PENDING_REVIEW':
    case 'IN_PROGRESS':
    case 'ASSIGNED':
      return 'warning';
    
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
  variant,
  className,
  size = 'md' 
}: StatusBadgeProps) {
  const determinedVariant = variant || getVariantFromStatus(status);
  
  // Format the status string for display (e.g., PENDING_REVIEW -> Pending Review)
  const displayStatus = status
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold',
        variantStyles[determinedVariant],
        sizeStyles[size],
        className
      )}
    >
      <span className={cn(
        'w-1.5 h-1.5 rounded-full mr-1.5',
        determinedVariant === 'success' && 'bg-green-500',
        determinedVariant === 'warning' && 'bg-amber-500',
        determinedVariant === 'danger' && 'bg-red-500',
        determinedVariant === 'info' && 'bg-blue-500',
        determinedVariant === 'neutral' && 'bg-slate-400',
        determinedVariant === 'default' && 'bg-slate-400',
      )} />
      {displayStatus}
    </span>
  );
}
