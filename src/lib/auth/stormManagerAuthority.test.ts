import { describe, expect, it } from 'vitest';
import { isAdminClassRole, isSuperAdminClassRole } from './roleGuards';
import { resolvePermissions, PERMISSION_KEYS } from './permissionCatalog';
import { getLandingPathForRole } from './roleLanding';
import { getPortalRole } from './portalAccess';
import { canPerformManagementAction } from './authorization';

describe('native Storm Manager authority', () => {
  it.each(['STORM_MANAGER', 'SUPER_ADMIN', 'CEO'])('gives verified %s management authority across all modules', role => {
    expect(isAdminClassRole(role)).toBe(true);
    expect(isSuperAdminClassRole(role)).toBe(true);
    expect(getPortalRole(role)).toBe('admin');
    expect(getLandingPathForRole(role)).toBe('/admin/dashboard');
    const permissions = resolvePermissions(role);
    expect(PERMISSION_KEYS.every(key => permissions[key])).toBe(true);
    for (const action of ['storm_event_write', 'ticket_entry_write', 'contractor_assignment_write'] as const) expect(canPerformManagementAction(role, action, permissions)).toBe(true);
  });
  it('keeps inactive profiles and explicit permission restrictions fail closed', () => {
    expect(PERMISSION_KEYS.every(key => !resolvePermissions('STORM_MANAGER', {}, false)[key])).toBe(true);
    const restricted = resolvePermissions('STORM_MANAGER', { 'admin.payroll.view': 'deny' });
    expect(restricted['admin.payroll.view']).toBe(false);
    expect(restricted['admin.payroll.edit']).toBe(false);
    expect(restricted['admin.tickets.edit']).toBe(true);
  });
  it('does not infer authority from contractor staffing or pay-role information', () => {
    const contractor = { role: 'CONTRACTOR', payRole: 'STORM_MANAGER' };
    expect(isSuperAdminClassRole(contractor.role)).toBe(false);
    expect(getPortalRole(contractor.role)).toBe('contractor');
    expect(PERMISSION_KEYS.every(key => !resolvePermissions(contractor.role, { 'admin.users.edit': 'allow', 'admin.payroll.view': 'allow' })[key])).toBe(true);
    expect(isSuperAdminClassRole('TEAM_LEAD')).toBe(false);
    expect(isSuperAdminClassRole('DRIVER')).toBe(false);
    expect(isSuperAdminClassRole('ADMIN')).toBe(false);
  });
});
