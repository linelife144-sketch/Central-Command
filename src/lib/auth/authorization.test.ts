import { describe, expect, it } from 'vitest';

import type { UserRole } from '../../types';
import {
  canPerformManagementAction,
  getManagementActionForPath,
  type ManagementAction,
} from './authorization';

describe('canPerformManagementAction', () => {
  const superAdminActions: ManagementAction[] = [
    'storm_event_write',
    'ticket_entry_write',
    'contractor_assignment_write',
  ];

  it('allows CEO and super admin for all management actions', () => {
    for (const role of ['CEO', 'SUPER_ADMIN'] as const) {
      for (const action of superAdminActions) {
        expect(canPerformManagementAction(role, action)).toBe(true);
      }
    }
  });

  it('blocks non-super-admin roles for management actions', () => {
    const blockedRoles: UserRole[] = ['ADMIN', 'CONTRACTOR'];

    for (const role of blockedRoles) {
      for (const action of superAdminActions) {
        expect(canPerformManagementAction(role, action)).toBe(false);
      }
    }
  });
});

describe('getManagementActionForPath', () => {
  it('maps ticket-entry write paths', () => {
    expect(getManagementActionForPath('/tickets/create')).toBe('ticket_entry_write');
  });

  it('does not map deprecated onboarding approval path', () => {
    expect(getManagementActionForPath('/admin/contractors/approval')).toBeNull();
  });

  it('maps storm event write paths', () => {
    expect(getManagementActionForPath('/admin/storms/create')).toBe('storm_event_write');
    expect(getManagementActionForPath('/storms/create')).toBe('storm_event_write');
    expect(getManagementActionForPath('/admin/storms/storm-1/edit')).toBe('storm_event_write');
    expect(getManagementActionForPath('/storms/storm-1/edit')).toBe('storm_event_write');
  });

  it('returns null for non-management paths', () => {
    expect(getManagementActionForPath('/tickets')).toBeNull();
    expect(getManagementActionForPath('/admin/dashboard')).toBeNull();
  });
});
