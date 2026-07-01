import { describe, expect, it } from 'vitest';

import { canPerformManagementAction, getManagementActionForPath } from './authorization';
import { getPortalRole, isPortalPathAllowed } from './portalAccess';

describe('access control integration', () => {
  it('enforces portal boundaries for contractor roles', () => {
    const contractorPortal = getPortalRole('CONTRACTOR');

    expect(contractorPortal).toBe('contractor');
    expect(isPortalPathAllowed('/contractor/time', contractorPortal)).toBe(true);
    expect(isPortalPathAllowed('/contractor/time', contractorPortal)).toBe(true);
    expect(isPortalPathAllowed('/admin/dashboard', contractorPortal)).toBe(false);
  });

  it('maps management routes to super-admin-only actions', () => {
    const action = getManagementActionForPath('/tickets/create');
    expect(action).toBe('ticket_entry_write');

    expect(canPerformManagementAction('CEO', action!)).toBe(true);
    expect(canPerformManagementAction('SUPER_ADMIN', action!)).toBe(true);
    expect(canPerformManagementAction('ADMIN', action!)).toBe(false);
  });

  it('keeps non-portal routes shared between portal roles', () => {
    expect(isPortalPathAllowed('/tickets', 'admin')).toBe(true);
    expect(isPortalPathAllowed('/tickets', 'contractor')).toBe(true);
  });
});
