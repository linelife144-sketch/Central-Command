import type { UserRole } from '../../types';
import { isAdminClassRole } from './roleGuards';

export function getLandingPathForRole(role: UserRole | string | null | undefined): string {
  if (!role) {
    return '/login';
  }

  if (role === 'CONTRACTOR') {
    return '/contractor/time';
  }

  if (isAdminClassRole(role)) {
    return '/admin/dashboard';
  }

  return '/login';
}
