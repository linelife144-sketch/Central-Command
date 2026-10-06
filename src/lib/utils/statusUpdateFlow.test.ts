import { describe, expect, it } from 'vitest';
import { getFieldStatusTransition, isFieldStatusFlowStep } from './statusUpdateFlow';

describe('getFieldStatusTransition', () => {
  it('returns ASSIGNED -> IN_ROUTE transition', () => {
    expect(getFieldStatusTransition('ASSIGNED')).toEqual({
      currentStatus: 'ASSIGNED',
      nextStatus: 'IN_ROUTE',
      actionLabel: 'Start Ticket',
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

  it('starts the assessment on site with a geofence requirement', () => {
    expect(getFieldStatusTransition('ON_SITE')).toEqual({
      currentStatus: 'ON_SITE',
      nextStatus: 'IN_PROGRESS',
      actionLabel: 'Begin assessment',
      requiresGeofence: true,
    });
  });

  it('starts returned corrections with a geofence requirement', () => {
    expect(getFieldStatusTransition('NEEDS_REWORK')).toEqual({
      currentStatus: 'NEEDS_REWORK',
      nextStatus: 'IN_PROGRESS',
      actionLabel: 'Begin corrections',
      requiresGeofence: true,
    });
  });

  it('returns null when no field transition is available', () => {
    expect(getFieldStatusTransition('COMPLETE')).toBeNull();
    expect(getFieldStatusTransition('PENDING_REVIEW')).toBeNull();
    expect(getFieldStatusTransition('IN_PROGRESS')).toBeNull();
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
