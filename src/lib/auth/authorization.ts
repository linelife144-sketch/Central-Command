import type { UserRole } from '../../types';
import { isSuperAdminClassRole } from './roleGuards';

export type ManagementAction =
  | 'storm_event_write'
  | 'ticket_entry_write'
  | 'contractor_assignment_write';

function normalizePath(pathname: string): string {
  if (!pathname.startsWith('/')) {
    return `/${pathname}`;
  }

  return pathname;
}

export function getManagementActionForPath(pathname: string): ManagementAction | null {
  const normalizedPath = normalizePath(pathname);

  if (normalizedPath === '/tickets/create') {
    return 'ticket_entry_write';
  }

  if (
    normalizedPath === '/admin/storms/create'
    || normalizedPath === '/storms/create'
    || (normalizedPath.startsWith('/admin/storms/') && normalizedPath.endsWith('/edit'))
    || (normalizedPath.startsWith('/storms/') && normalizedPath.endsWith('/edit'))
  ) {
    return 'storm_event_write';
  }

  return null;
}

export function canPerformManagementAction(
  role: UserRole | string | null | undefined,
  action: ManagementAction
): boolean {
  if (action === 'storm_event_write') {
    return isSuperAdminClassRole(role);
  }

  if (action === 'ticket_entry_write') {
    return isSuperAdminClassRole(role);
  }

  if (action === 'contractor_assignment_write') {
    return isSuperAdminClassRole(role);
  }

  return false;
}
