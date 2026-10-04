import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PERMISSION_KEYS, mayOpenPath, permissionLanding, resolvePermissions } from './permissionCatalog';
import { permissionUpdateSchema, validatePermissionOverrides } from './permissionValidation';

describe('individual staff access', () => {
  it('preserves role defaults and does not add contractor access', () => {
    expect(resolvePermissions('SUPER_ADMIN')['admin.users.edit']).toBe(true);
    expect(resolvePermissions('ADMIN')['admin.time.edit']).toBe(false);
    expect(resolvePermissions('ADMIN')['admin.storms.edit']).toBe(false);
    expect(Object.values(resolvePermissions('CONTRACTOR')).every(value => !value)).toBe(true);
    expect(Object.values(resolvePermissions('ADMIN', {}, false)).every(value => !value)).toBe(true);
  });
  it('keeps modules independent and makes a view deny disable editing', () => {
    const permissions = resolvePermissions('ADMIN', {'admin.dashboard.view':'deny', 'admin.time.view':'deny', 'admin.storms.edit':'allow'});
    expect(permissions['admin.time.edit']).toBe(false);
    expect(permissions['admin.expenses.edit']).toBe(false);
    expect(permissions['admin.storms.edit']).toBe(false);
    expect(permissionLanding(permissions)).toBe('/admin/storms');
    expect(mayOpenPath('/admin/time-review', permissions)).toBe(false);
    expect(mayOpenPath('/admin/account', permissions)).toBe(true);
  });
  it('never grants user administration to an Admin or Contractor', () => {
    expect(resolvePermissions('ADMIN', {'admin.users.edit':'allow','admin.users.view':'allow'})['admin.users.edit']).toBe(false);
  });
  it('covers direct ticket/storm create URLs and rejects unknown input', () => {
    const map = resolvePermissions('ADMIN');
    expect(mayOpenPath('/tickets/create', map)).toBe(false);
    expect(mayOpenPath('/storms/123/tickets/new', map)).toBe(false);
    expect(mayOpenPath('/admin/storms/create', map)).toBe(false);
    expect(permissionUpdateSchema.safeParse({overrides:{'invented.edit':'allow'},version:null}).success).toBe(false);
    expect(validatePermissionOverrides({'admin.time.view':'deny','admin.time.edit':'allow'})).toBeTruthy();
  });
  it('keeps the database permission catalog in sync with the frontend', () => {
    const sql = readFileSync('supabase/admin_user_permissions.sql','utf8');
    const sqlKeys = [...sql.matchAll(/^\('([^']+)',(?:true|false),(?:true|false)\)/gm)].map(match => match[1]);
    expect(sqlKeys).toEqual(PERMISSION_KEYS);
  });
});


it('gates Payroll independently of time review and makes admin wage edits opt-in', () => {
  const permissions = resolvePermissions('ADMIN', { 'admin.time.view': 'deny' });
  expect(mayOpenPath('/admin/payroll', permissions)).toBe(true);
  expect(permissions['admin.payroll.edit']).toBe(false);
  expect(mayOpenPath('/admin/payroll', resolvePermissions('ADMIN', { 'admin.payroll.view': 'deny' }))).toBe(false);
});
