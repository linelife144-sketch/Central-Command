import { describe, expect, it } from 'vitest';

import type { UserRole } from '../../types';
import { getPortalRole, isPortalPathAllowed } from './portalAccess';

describe('getPortalRole', () => {
  it('maps admin-class roles to admin portal', () => {
    const adminRoles: UserRole[] = ['CEO', 'SUPER_ADMIN', 'ADMIN'];

    for (const role of adminRoles) {
      expect(getPortalRole(role)).toBe('admin');
    }
  });

  it('maps contractor to contractor portal', () => {
    expect(getPortalRole('CONTRACTOR')).toBe('contractor');
  });

  it('returns null for unknown role inputs', () => {
    expect(getPortalRole('UNKNOWN_ROLE')).toBeNull();
    expect(getPortalRole(null)).toBeNull();
  });
});

describe('isPortalPathAllowed', () => {
  it('allows admin portal paths for admin users', () => {
    expect(isPortalPathAllowed('/admin/dashboard', 'admin')).toBe(true);
    expect(isPortalPathAllowed('/admin/contractors', 'admin')).toBe(true);
  });

  it('blocks contractor portal paths for admin users', () => {
    expect(isPortalPathAllowed('/contractor/dashboard', 'admin')).toBe(false);
    expect(isPortalPathAllowed('/contractor/dashboard', 'admin')).toBe(false);
  });

  it('allows contractor portal paths for contractors', () => {
    expect(isPortalPathAllowed('/contractor/dashboard', 'contractor')).toBe(true);
    expect(isPortalPathAllowed('/contractor/map', 'contractor')).toBe(true);
    expect(isPortalPathAllowed('/contractor/map', 'contractor')).toBe(true);
  });

  it('blocks admin portal paths for contractors', () => {
    expect(isPortalPathAllowed('/admin/dashboard', 'contractor')).toBe(false);
  });

  it('keeps shared routes available to both portal roles', () => {
    expect(isPortalPathAllowed('/tickets', 'admin')).toBe(true);
    expect(isPortalPathAllowed('/tickets', 'contractor')).toBe(true);
  });
});
