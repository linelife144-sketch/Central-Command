import { describe, expect, it } from 'vitest';
import { getContractorTicketStatus, getFieldStatusTransition, getStaffTicketStatusLabel, isFieldStatusFlowStep } from './statusUpdateFlow';

describe('getFieldStatusTransition', () => {
  it('returns ASSIGNED -> IN_ROUTE transition', () => {
    expect(getFieldStatusTransition('ASSIGNED')).toEqual({
      currentStatus: 'ASSIGNED',
      nextStatus: 'IN_ROUTE',
      actionLabel: 'Start Ticket',
      requiresGeofence: false,
    });
  });

  it.each(['IN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'NEEDS_REWORK'])('does not create a contractor status transition from %s', status => {
    expect(getFieldStatusTransition(status as 'IN_ROUTE')).toBeNull();
  });

  it('returns null when no field transition is available', () => {
    expect(getFieldStatusTransition('COMPLETE')).toBeNull();
    expect(getFieldStatusTransition('PENDING_REVIEW')).toBeNull();
    expect(getFieldStatusTransition('IN_PROGRESS')).toBeNull();
  });
});

describe('contractor and staff status labels', () => {
  it.each(['ASSIGNED', 'IN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'COMPLETE', 'NEEDS_REWORK'])('keeps %s open until submission or approval', status => {
    expect(getContractorTicketStatus(status)).toBe('OPEN');
  });

  it.each(['PENDING_REVIEW', 'APPROVED', 'CLOSED', 'ARCHIVED', 'EXPIRED'])('projects %s as closed for contractors', status => {
    expect(getContractorTicketStatus(status)).toBe('CLOSED');
  });

  it('simplifies legacy staff statuses while retaining review stages', () => {
    expect(getStaffTicketStatusLabel('COMPLETE')).toBe('On site');
    expect(getStaffTicketStatusLabel('IN_PROGRESS')).toBe('On site');
    expect(getStaffTicketStatusLabel('PENDING_REVIEW', 'TEAM_LEAD_REVIEW')).toBe('Review · team lead');
    expect(getStaffTicketStatusLabel('PENDING_REVIEW', 'FINAL_REVIEW')).toBe('Final review · CEO / Super Admin');
    expect(getStaffTicketStatusLabel('CLOSED', 'UTILITY_SUBMITTED')).toBe('Submitted to utility');
    expect(getStaffTicketStatusLabel('CLOSED', null, '2026-10-06T12:00:00Z')).toBe('Submitted to utility');
  });
});

describe('isFieldStatusFlowStep', () => {
  it('returns true for field workflow statuses', () => {
    expect(isFieldStatusFlowStep('ASSIGNED')).toBe(true);
    expect(isFieldStatusFlowStep('IN_ROUTE')).toBe(true);
    expect(isFieldStatusFlowStep('ON_SITE')).toBe(true);
    expect(isFieldStatusFlowStep('COMPLETE')).toBe(true);
  });

  it('returns false for non-field workflow statuses', () => {
    expect(isFieldStatusFlowStep('DRAFT')).toBe(false);
    expect(isFieldStatusFlowStep('APPROVED')).toBe(false);
  });
});
