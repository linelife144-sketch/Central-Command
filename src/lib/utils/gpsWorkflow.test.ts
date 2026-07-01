import { describe, expect, it } from 'vitest';
import { validateGPSWorkflow } from './gpsWorkflow';

describe('validateGPSWorkflow', () => {
  it('fails when GPS reading is missing', () => {
    const result = validateGPSWorkflow({
      latitude: null,
      longitude: null,
      accuracy: null,
    });

    expect(result.gpsValid).toBe(false);
    expect(result.gpsError).toBeDefined();
  });

  it('fails when accuracy threshold is exceeded', () => {
    const result = validateGPSWorkflow(
      {
        latitude: 32.7767,
        longitude: -96.797,
        accuracy: 180,
      },
      undefined,
      100,
    );

    expect(result.gpsValid).toBe(false);
    expect(result.gpsError).toContain('accuracy');
  });

  it('validates geofence and returns within=true for nearby coordinate', () => {
    const result = validateGPSWorkflow(
      {
        latitude: 32.7767,
        longitude: -96.797,
        accuracy: 15,
      },
      {
        latitude: 32.7768,
        longitude: -96.7971,
        radiusMeters: 500,
      },
    );

    expect(result.gpsValid).toBe(true);
    expect(result.withinGeofence).toBe(true);
    expect(result.distanceMeters).toBeTypeOf('number');
  });

  it('validates geofence and returns within=false for distant coordinate', () => {
    const result = validateGPSWorkflow(
      {
        latitude: 32.7767,
        longitude: -96.797,
        accuracy: 10,
      },
      {
        latitude: 32.9,
        longitude: -96.7,
        radiusMeters: 500,
      },
    );

    expect(result.gpsValid).toBe(true);
    expect(result.withinGeofence).toBe(false);
    expect((result.distanceMeters ?? 0) > 500).toBe(true);
  });
});
