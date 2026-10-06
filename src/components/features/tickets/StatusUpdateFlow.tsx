'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGPSValidation } from '@/hooks/useGPSValidation';
import { APP_CONFIG } from '@/lib/config/appConfig';
import { ticketService } from '@/lib/services/ticketService';
import { getFieldStatusTransition } from '@/lib/utils/statusUpdateFlow';
import type { Ticket, TicketStatus, UserRole } from '@/types';

interface StatusUpdateFlowProps {
  ticket: Ticket;
  userId: string;
  userRole: UserRole;
  onStatusUpdated?: (newStatus: TicketStatus) => void | Promise<void>;
}

function formatWorkflowStatus(status: TicketStatus): string {
  return status.replace(/_/g, ' ');
}

export function StatusUpdateFlow({ ticket, userId, userRole, onStatusUpdated }: StatusUpdateFlowProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const transition = useMemo(() => getFieldStatusTransition(ticket.status), [ticket.status]);
  const geofenceTarget = useMemo(() => {
    if (typeof ticket.latitude !== 'number' || typeof ticket.longitude !== 'number') {
      return undefined;
    }

    return {
      latitude: ticket.latitude,
      longitude: ticket.longitude,
      radiusMeters: ticket.geofence_radius_meters || APP_CONFIG.GEOFENCE_RADIUS_METERS,
    };
  }, [ticket.geofence_radius_meters, ticket.latitude, ticket.longitude]);

  const gpsValidation = useGPSValidation({
    target: geofenceTarget,
    minAccuracyMeters: APP_CONFIG.MIN_GPS_ACCURACY_METERS,
  });

  const isEnRoute = ticket.status === 'IN_ROUTE';
  // IN_ROUTE → ON_SITE is automatic (GPS proximity), so no manual step is offered.
  const manualTransition = isEnRoute ? null : transition;
  const autoCheckInFlight = useRef(false);
  const { refreshAndValidate } = gpsValidation;

  const checkArrival = useCallback(async () => {
    if (autoCheckInFlight.current || !geofenceTarget) return;
    autoCheckInFlight.current = true;
    try {
      const snapshot = await refreshAndValidate();
      if (
        snapshot.status === 'ready'
        && snapshot.validation.gpsValid
        && snapshot.validation.withinGeofence === true
        && snapshot.reading.latitude !== null
        && snapshot.reading.longitude !== null
      ) {
        await ticketService.updateTicketStatus(ticket.id, 'ON_SITE', userId, userRole, undefined, {
          latitude: snapshot.reading.latitude,
          longitude: snapshot.reading.longitude,
          accuracy: snapshot.reading.accuracy ?? APP_CONFIG.MAX_GPS_ACCURACY_METERS,
        });
        await onStatusUpdated?.('ON_SITE');
      }
    } catch {
      // Silent: the next poll retries; the contractor never sees a status error here.
    } finally {
      autoCheckInFlight.current = false;
    }
  }, [geofenceTarget, onStatusUpdated, refreshAndValidate, ticket.id, userId, userRole]);

  useEffect(() => {
    if (!isEnRoute || !geofenceTarget) return;
    void checkArrival();
    const interval = window.setInterval(() => void checkArrival(), 30000);
    return () => window.clearInterval(interval);
  }, [checkArrival, geofenceTarget, isEnRoute]);

  const canAttemptTransition = Boolean(
    manualTransition
    && ticket.crew_id && ticket.team_lead_id && ticket.assigned_driver_id
    && (!manualTransition.requiresGeofence || geofenceTarget),
  );

  const handleStatusUpdate = async () => {
    if (!transition) {
      return;
    }

    setIsSubmitting(true);
    try {
      const gpsSnapshot = await gpsValidation.refreshAndValidate();
      if (gpsSnapshot.status === 'unsupported' || gpsSnapshot.status === 'error') {
        throw new Error(gpsSnapshot.errorMessage ?? 'Unable to capture GPS location.');
      }

      if (!gpsSnapshot.validation.gpsValid) {
        throw new Error(gpsSnapshot.validation.gpsError ?? 'GPS validation failed.');
      }

      if (transition.requiresGeofence && gpsSnapshot.validation.withinGeofence !== true) {
        const radius = geofenceTarget?.radiusMeters ?? APP_CONFIG.GEOFENCE_RADIUS_METERS;
        const distance = gpsSnapshot.validation.distanceMeters;
        throw new Error(
          distance
            ? `Outside geofence (${distance}m away). Must be within ${radius}m of the ticket location.`
            : `Must be within ${radius}m of the ticket location.`,
        );
      }

      if (gpsSnapshot.reading.latitude === null || gpsSnapshot.reading.longitude === null) {
        throw new Error('GPS coordinates were unavailable. Please retry.');
      }

      await ticketService.updateTicketStatus(
        ticket.id,
        transition.nextStatus,
        userId,
        userRole,
        undefined,
        {
          latitude: gpsSnapshot.reading.latitude,
          longitude: gpsSnapshot.reading.longitude,
          accuracy: gpsSnapshot.reading.accuracy ?? APP_CONFIG.MAX_GPS_ACCURACY_METERS,
        },
      );

      toast.success(transition.nextStatus === 'IN_ROUTE' ? 'Ticket started.' : `Ticket status updated to ${formatWorkflowStatus(transition.nextStatus).toLowerCase()}.`);
      await onStatusUpdated?.(transition.nextStatus);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update ticket status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Field Status Flow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!ticket.crew_id && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">A storm manager must assign the team lead and driver/assessor crew before fieldwork starts.</p>}
        {isEnRoute ? (
          <p className="text-slate-600">
            Ticket started. Your status updates automatically when you arrive at the site.
          </p>
        ) : !manualTransition ? (
          <p className="text-slate-500">
            Review or complete the assessment from the ticket.
          </p>
        ) : (
          <>
            <p className="text-slate-600">
              GPS validation is required before status updates.
              {manualTransition.requiresGeofence ? ' Geofence check is required for this step.' : ''}
            </p>
            {manualTransition.requiresGeofence && !geofenceTarget && (
              <p className="text-amber-700">
                Ticket coordinates are required to validate geofence for this status change.
              </p>
            )}
            <Button
              onClick={handleStatusUpdate}
              disabled={!canAttemptTransition || isSubmitting || gpsValidation.status === 'loading'}
              className="w-full sm:w-auto"
            >
              {(isSubmitting || gpsValidation.status === 'loading') && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {manualTransition.actionLabel}
            </Button>
          </>
        )}

        {['ON_SITE','IN_PROGRESS','NEEDS_REWORK'].includes(ticket.status) && <Button asChild variant="accent"><Link href={`/tickets/${ticket.id}#assessment`}>Open ticket assessment</Link></Button>}
        {gpsValidation.status === 'ready' && (
          <p className="text-slate-600">
            Latest GPS check:{' '}
            {gpsValidation.reading.accuracy !== null
              ? `${Math.round(gpsValidation.reading.accuracy)}m accuracy`
              : 'accuracy unavailable'}
            {gpsValidation.validation.distanceMeters !== undefined
              ? `, ${gpsValidation.validation.distanceMeters}m from site`
              : ''}
            .
          </p>
        )}
      </CardContent>
    </Card>
  );
}
