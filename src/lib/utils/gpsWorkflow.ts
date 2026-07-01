import { validateGeofence, validateGPS } from './validators';

export interface GPSWorkflowReading {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
}

export interface GPSWorkflowTarget {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
}

export interface GPSWorkflowValidationResult {
  gpsValid: boolean;
  gpsError?: string;
  withinGeofence?: boolean;
  distanceMeters?: number;
}

export function validateGPSWorkflow(
  reading: GPSWorkflowReading,
  target?: GPSWorkflowTarget,
  minAccuracyMeters = 100,
): GPSWorkflowValidationResult {
  const gpsValidation = validateGPS(
    reading.latitude,
    reading.longitude,
    reading.accuracy,
    minAccuracyMeters,
  );

  if (!gpsValidation.valid) {
    return {
      gpsValid: false,
      gpsError: gpsValidation.error,
    };
  }

  if (!target || reading.latitude === null || reading.longitude === null) {
    return {
      gpsValid: true,
    };
  }

  const geofenceValidation = validateGeofence(
    reading.latitude,
    reading.longitude,
    target.latitude,
    target.longitude,
    target.radiusMeters ?? 500,
  );

  return {
    gpsValid: true,
    withinGeofence: geofenceValidation.within,
    distanceMeters: geofenceValidation.distance,
  };
}
