import type { UserRole } from '../../types';

const ADMIN_CLASS_ROLES: ReadonlySet<UserRole> = new Set(['CEO', 'STORM_MANAGER', 'SUPER_ADMIN', 'ADMIN']);
const SUPER_ADMIN_CLASS_ROLES: ReadonlySet<UserRole> = new Set(['CEO', 'STORM_MANAGER', 'SUPER_ADMIN']);

// SUPER_ADMIN remains a compatible stored profile token during transition.
// Call these predicates with verified profiles.role, never a contractor pay role.
export function isStormManagerRole(role: string | null | undefined): boolean {
  return role === 'STORM_MANAGER' || role === 'SUPER_ADMIN';
}

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
