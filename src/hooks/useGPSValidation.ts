'use client';

import { useCallback, useMemo, useState } from 'react';
import type { GPSWorkflowTarget, GPSWorkflowValidationResult } from '@/lib/utils/gpsWorkflow';
import { validateGPSWorkflow } from '@/lib/utils/gpsWorkflow';

export type GPSValidationStatus = 'idle' | 'loading' | 'ready' | 'unsupported' | 'error';

export interface GPSValidationState {
  reading: {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
  };
  validation: GPSWorkflowValidationResult;
  status: GPSValidationStatus;
  errorMessage: string | null;
  lastUpdatedAt: string | null;
}

export interface UseGPSValidationOptions {
  target?: GPSWorkflowTarget;
  minAccuracyMeters?: number;
  enableHighAccuracy?: boolean;
  timeoutMs?: number;
  maximumAgeMs?: number;
}

export function useGPSValidation({
  target,
  minAccuracyMeters = 100,
  enableHighAccuracy = true,
  timeoutMs = 15000,
  maximumAgeMs = 10000,
}: UseGPSValidationOptions = {}) {
  const [state, setState] = useState<GPSValidationState>({
    reading: {
      latitude: null,
      longitude: null,
      accuracy: null,
    },
    validation: {
      gpsValid: false,
    },
    status: 'idle',
    errorMessage: null,
    lastUpdatedAt: null,
  });

  const refreshAndValidate = useCallback(async (): Promise<GPSValidationState> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const unsupportedState: GPSValidationState = {
        reading: {
          latitude: null,
          longitude: null,
          accuracy: null,
        },
        validation: {
          gpsValid: false,
          gpsError: 'Geolocation is not supported in this browser.',
        },
        status: 'unsupported',
        errorMessage: 'Geolocation is not supported in this browser.',
        lastUpdatedAt: new Date().toISOString(),
      };

      setState((previous) => ({
        ...previous,
        ...unsupportedState,
      }));

      return unsupportedState;
    }

    setState((previous) => ({
      ...previous,
      status: 'loading',
      errorMessage: null,
    }));

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy,
            timeout: timeoutMs,
            maximumAge: maximumAgeMs,
          },
        );
      });

      const reading = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      const validation = validateGPSWorkflow(reading, target, minAccuracyMeters);
      const readyState: GPSValidationState = {
        reading,
        validation,
        status: 'ready',
        errorMessage: validation.gpsError ?? null,
        lastUpdatedAt: new Date(position.timestamp).toISOString(),
      };

      setState(readyState);
      return readyState;
    } catch (error) {
      const nextState: GPSValidationState = {
        reading: {
          latitude: null,
          longitude: null,
          accuracy: null,
        },
        validation: {
          gpsValid: false,
          gpsError: error instanceof Error ? error.message : 'Unable to read current GPS location.',
        },
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unable to read current GPS location.',
        lastUpdatedAt: new Date().toISOString(),
      };

      setState(nextState);
      return nextState;
    }
  }, [enableHighAccuracy, maximumAgeMs, minAccuracyMeters, target, timeoutMs]);

  const refresh = useCallback(() => {
    void refreshAndValidate();
  }, [refreshAndValidate]);

  const isWithinGeofence = useMemo(() => state.validation.withinGeofence === true, [state.validation.withinGeofence]);

  return {
    ...state,
    isWithinGeofence,
    refreshAndValidate,
    refresh,
  };
}
