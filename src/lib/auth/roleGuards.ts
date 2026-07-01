import type { UserRole } from '../../types';

const ADMIN_CLASS_ROLES: ReadonlySet<UserRole> = new Set(['CEO', 'SUPER_ADMIN', 'ADMIN']);
const SUPER_ADMIN_CLASS_ROLES: ReadonlySet<UserRole> = new Set(['CEO', 'SUPER_ADMIN']);

export function isAdminClassRole(role: UserRole | string | null | undefined): boolean {
  if (!role) {
    return false;
  }

  return ADMIN_CLASS_ROLES.has(role as UserRole);
}

export function isSuperAdminClassRole(role: UserRole | string | null | undefined): boolean {
  if (!role) {
    return false;
  }

  return SUPER_ADMIN_CLASS_ROLES.has(role as UserRole);
}
