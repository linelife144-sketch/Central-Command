// Central Command - Formatting Utilities

import { format, formatDistanceToNow, parseISO } from 'date-fns';

// Date formatters
export function formatDate(date: string | Date | null, formatStr: string = 'MMM dd, yyyy'): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, formatStr);
  } catch {
    return '-';
  }
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'MMM dd, yyyy h:mm a');
  } catch {
    return '-';
  }
}

export function formatTime(date: string | Date | null): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'h:mm a');
  } catch {
    return '-';
  }
}

export function formatRelativeTime(date: string | Date | null): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return '-';
  }
}

// Currency formatters
export function formatCurrency(amount: number | null, currency: string = 'USD'): string {
  if (amount === null || amount === undefined) return '-';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyCompact(amount: number | null): string {
  if (amount === null || amount === undefined) return '-';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

// Number formatters
export function formatNumber(num: number | null, decimals: number = 0): string {
  if (num === null || num === undefined) return '-';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatPercent(num: number | null, decimals: number = 1): string {
  if (num === null || num === undefined) return '-';
  
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num / 100);
}

// Duration formatters
export function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return '-';
  
  const totalSeconds = Math.max(0, Math.round(minutes * 60));
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (!hours && !mins && !seconds) return '0m';
  return [hours ? `${hours}h` : '', mins ? `${mins}m` : '', seconds ? `${seconds}s` : ''].filter(Boolean).join(' ');
}

export function formatDurationDecimal(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return '-';
  
  return (minutes / 60).toFixed(2) + 'h';
}

// Phone number formatter
export function formatPhone(phone: string | null): string {
  if (!phone) return '-';
  
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

// Address formatter
export function formatAddress(
  address: string | null,
  city: string | null,
  state: string | null,
  zip: string | null
): string {
  const parts = [address, city, state, zip].filter(Boolean);
  if (parts.length === 0) return '-';
  
  if (city && state) {
    const cityState = zip ? `${city}, ${state} ${zip}` : `${city}, ${state}`;
    return address ? `${address}, ${cityState}` : cityState;
  }
  
  return parts.join(', ');
}

// GPS coordinate formatter
export function formatCoordinates(lat: number | null, lng: number | null): string {
  if (lat === null || lng === null) return '-';
  
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  
  return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lng).toFixed(6)}° ${lngDir}`;
}

// File size formatter
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '-';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  if (i === 0) return `${bytes} B`;
  
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// Status badge helpers
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Ticket statuses
    DRAFT: 'gray',
    ASSIGNED: 'blue',
    REJECTED: 'red',
    IN_ROUTE: 'cyan',
    ON_SITE: 'green',
    IN_PROGRESS: 'yellow',
    COMPLETE: 'green',
    PENDING_REVIEW: 'orange',
    APPROVED: 'green',
    NEEDS_REWORK: 'red',
    CLOSED: 'gray',
    EXPIRED: 'red',
    
    // Expense/Invoice statuses
    SUBMITTED: 'blue',
    UNDER_REVIEW: 'yellow',
    PAID: 'green',
    VOID: 'red',
    
    // Time entry statuses
    PENDING: 'yellow',
    
    // Sync statuses
    SYNCED: 'green',
    FAILED: 'red',
    CONFLICT: 'orange',
  };
  
  return colors[status] || 'gray';
}

