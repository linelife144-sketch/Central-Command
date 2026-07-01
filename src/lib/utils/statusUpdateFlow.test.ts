import { describe, expect, it } from 'vitest';
import { getFieldStatusTransition, isFieldStatusFlowStep } from './statusUpdateFlow';

describe('getFieldStatusTransition', () => {
  it('returns ASSIGNED -> IN_ROUTE transition', () => {
    expect(getFieldStatusTransition('ASSIGNED')).toEqual({
      currentStatus: 'ASSIGNED',
      nextStatus: 'IN_ROUTE',
      actionLabel: 'Start Route',
      requiresGeofence: false,
    });
  });

  it('returns IN_ROUTE -> ON_SITE transition with geofence requirement', () => {
    expect(getFieldStatusTransition('IN_ROUTE')).toEqual({
      currentStatus: 'IN_ROUTE',
      nextStatus: 'ON_SITE',
      actionLabel: 'Mark On Site',
      requiresGeofence: true,
    });
  });

  it('returns ON_SITE -> COMPLETE transition with geofence requirement', () => {
    expect(getFieldStatusTransition('ON_SITE')).toEqual({
      currentStatus: 'ON_SITE',
      nextStatus: 'COMPLETE',
      actionLabel: 'Mark Complete',
      requiresGeofence: true,
    });
  });

  it('returns null when no field transition is available', () => {
    expect(getFieldStatusTransition('COMPLETE')).toBeNull();
    expect(getFieldStatusTransition('PENDING_REVIEW')).toBeNull();
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
