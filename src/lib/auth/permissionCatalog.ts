import { isAdminClassRole, isSuperAdminClassRole } from './roleGuards';

export const PERMISSION_MODULES = [
  { id: 'dashboard', label: 'Dashboard', description: 'Operations overview and summary cards.', group: 'Operations', path: '/admin/dashboard', editable: false },
  { id: 'storms', label: 'Storm events', description: 'View storm workspaces; create and change storm events.', group: 'Operations', path: '/admin/storms', editable: true },
  { id: 'tickets', label: 'Tickets', description: 'View tickets; create, update, and assign tickets.', group: 'Operations', path: '/tickets', editable: true },
  { id: 'contractors', label: 'Contractors', description: 'View contractor records; approve onboarding and eligibility.', group: 'Operations', path: '/admin/contractors', editable: true },
  { id: 'assignments', label: 'Crew assignments', description: 'View and change the contractor roster inside a storm.', group: 'Operations', path: '/admin/storms', editable: true },
  { id: 'map', label: 'Map', description: 'Open the field map. Ticket visibility follows ticket access.', group: 'Operations', path: '/admin/map', editable: false },
  { id: 'time', label: 'Time review', description: 'View timesheets; approve or reject submitted time.', group: 'Review & reporting', path: '/admin/time-review', editable: true },
  { id: 'expenses', label: 'Expenses', description: 'View expense reports; approve or reject expenses.', group: 'Review & reporting', path: '/admin/expense-review', editable: true },
  { id: 'assessments', label: 'Assessments', description: 'View damage assessments; approve or request rework.', group: 'Review & reporting', path: '/admin/assessment-review', editable: true },
  { id: 'payroll', label: 'Payroll & profit', description: 'View payroll, vehicle reimbursements, billing, and margins; manage rates and review claims.', group: 'Review & reporting', path: '/admin/payroll', editable: true },
  { id: 'reports', label: 'Reports', description: 'Open reports. Results include only modules this person can view.', group: 'Review & reporting', path: '/admin/reports', editable: false },
  { id: 'users', label: 'User administration', description: 'View staff access; change permissions and send contractor invitations. Super Admin only.', group: 'Administration', path: '/admin/users', editable: true },
] as const;

export type PermissionModuleId = typeof PERMISSION_MODULES[number]['id'];
export type PermissionKey = `admin.${PermissionModuleId}.${'view' | 'edit'}`;
export type PermissionEffect = 'allow' | 'deny';
export type PermissionOverrides = Partial<Record<PermissionKey, PermissionEffect>>;
export type PermissionMap = Partial<Record<PermissionKey, boolean>>;
export const PERMISSION_KEYS: PermissionKey[] = PERMISSION_MODULES.flatMap(module => [
  `admin.${module.id}.view` as PermissionKey,
  ...(module.editable ? [`admin.${module.id}.edit` as PermissionKey] : []),
]);
export function isPermissionKey(key: string): key is PermissionKey {
  return PERMISSION_KEYS.includes(key as PermissionKey);
}
export function roleDefault(role: string | null | undefined, key: PermissionKey): boolean {
  if (!isAdminClassRole(role)) return false;
  if (key.startsWith('admin.users.')) return isSuperAdminClassRole(role);
  if (isSuperAdminClassRole(role)) return true;
  if (key.endsWith('.view')) return true;
  return false;
}
export function resolvePermissions(role: string | null | undefined, overrides: PermissionOverrides = {}, active = true): PermissionMap {
  const result: PermissionMap = {};
  for (const key of PERMISSION_KEYS) {
    result[key] = active && isAdminClassRole(role) && (key.startsWith('admin.users.') ? isSuperAdminClassRole(role) : true) && (!key.endsWith('.edit') || isSuperAdminClassRole(role))
      && (overrides[key] ? overrides[key] === 'allow' : roleDefault(role, key));
  }
  for (const key of PERMISSION_KEYS.filter(key => key.endsWith('.edit'))) {
    result[key] = !!result[key] && !!result[key.replace(/\.edit$/, '.view') as PermissionKey];
  }
  return result;
}
export function permissionForPath(pathname: string): PermissionKey | null {
  if (pathname === '/admin/account' || pathname.startsWith('/admin/account/')) return null;
  if (pathname.startsWith('/admin/users')) return 'admin.users.view';
  if (pathname.startsWith('/admin/contractors/add') || pathname.startsWith('/admin/contractors/invite')) return 'admin.contractors.edit';
  if (pathname === '/tickets/create' || /^\/storms\/[^/]+\/tickets\/new/.test(pathname)) return 'admin.tickets.edit';
  if (pathname === '/tickets' || pathname.startsWith('/tickets/')) return 'admin.tickets.view';
  if (pathname === '/admin/storms/create' || /\/storms\/.*\/edit$/.test(pathname)) return 'admin.storms.edit';
  if (pathname.startsWith('/storms/')) return 'admin.storms.view';
  const area = PERMISSION_MODULES.find(module => module.id !== 'assignments' && (pathname === module.path || pathname.startsWith(`${module.path}/`)));
  return area ? `admin.${area.id}.view` : null;
}
export function mayOpenPath(path: string, permissions: PermissionMap): boolean {
  const key = permissionForPath(path);
  return key === null || permissions[key] === true;
}
export function permissionLanding(permissions: PermissionMap): string {
  return PERMISSION_MODULES.find(module => module.id !== 'assignments' && permissions[`admin.${module.id}.view`])?.path ?? '/admin/account';
}
