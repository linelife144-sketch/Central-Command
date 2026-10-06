'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Loader2, MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useGPSValidation } from '@/hooks/useGPSValidation';
import { APP_CONFIG } from '@/lib/config/appConfig';
import { ticketService } from '@/lib/services/ticketService';
import { ticketAssessmentWorkflow } from '@/lib/services/ticketAssessmentWorkflow';
import { getFieldStatusTransition } from '@/lib/utils/statusUpdateFlow';
import { formatAddress } from '@/lib/utils/formatters';
import type { Ticket, TicketStatus, UserRole } from '@/types';

interface StatusUpdateFlowProps {
  ticket: Ticket & { field_progress_pending?: boolean; field_progress_error?: string };
  userId: string;
  contractorId: string | null;
  canEditAssessment: boolean;
  userRole: UserRole;
  onStatusUpdated?: (newStatus: TicketStatus) => void | Promise<void>;
  openNavigation?: (url: string) => void;
}

export function getNavigationUrl(ticket: Ticket, environment: Pick<Navigator, 'userAgent' | 'platform'> = {
  userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
  platform: typeof navigator === 'undefined' ? '' : navigator.platform,
}): string {
  const address = formatAddress(ticket.address, ticket.city ?? null, ticket.state ?? null, ticket.zip_code ?? null);
  const appleDevice = /iPhone|iPad|iPod|Macintosh|Mac OS/.test(environment.userAgent) || /Mac|iPhone|iPad|iPod/.test(environment.platform);
  if (appleDevice) {
    const params = new URLSearchParams({ daddr: address, dirflg: 'd' });
    if (!address.trim() && typeof ticket.latitude === 'number' && typeof ticket.longitude === 'number') params.set('daddr', `${ticket.latitude},${ticket.longitude}`);
    return `https://maps.apple.com/?${params.toString()}`;
  }

  const destination = address.trim() || (typeof ticket.latitude === 'number' && typeof ticket.longitude === 'number' ? `${ticket.latitude},${ticket.longitude}` : '');
  const params = new URLSearchParams({ api: '1', destination, travelmode: 'driving', dir_action: 'navigate' });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function StatusUpdateFlow({ ticket, userId, contractorId, canEditAssessment, userRole, onStatusUpdated, openNavigation }: StatusUpdateFlowProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [arrivalHint, setArrivalHint] = useState('');
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const autoCheckInFlight = useRef(false);
  const startInFlight = useRef(false);
  const transition = useMemo(() => getFieldStatusTransition(ticket.status), [ticket.status]);
  const geofenceTarget = useMemo(() => {
    if (typeof ticket.latitude !== 'number' || typeof ticket.longitude !== 'number') return undefined;
    return {
      latitude: ticket.latitude,
      longitude: ticket.longitude,
      radiusMeters: ticket.geofence_radius_meters && ticket.geofence_radius_meters > 0
        ? ticket.geofence_radius_meters
        : APP_CONFIG.GEOFENCE_RADIUS_METERS,
    };
  }, [ticket.geofence_radius_meters, ticket.latitude, ticket.longitude]);
  const gpsValidation = useGPSValidation({ target: geofenceTarget, minAccuracyMeters: APP_CONFIG.MIN_GPS_ACCURACY_METERS });
  const isEnRoute = ticket.status === 'IN_ROUTE';
  const navigationUrl = useMemo(() => getNavigationUrl(ticket), [ticket]);
  const { refreshAndValidate } = gpsValidation;
  const offlinePending = Boolean(ticket.field_progress_pending);
  const missingGeofenceHint = isEnRoute && !geofenceTarget
    ? 'Ticket coordinates are missing, so arrival cannot be verified. Ask your team lead to update the ticket location.'
    : '';
  const visibleArrivalHint = arrivalHint || ticket.field_progress_error || missingGeofenceHint;

  useEffect(() => {
    if (!canEditAssessment || !['ON_SITE', 'IN_PROGRESS', 'COMPLETE', 'NEEDS_REWORK'].includes(ticket.status)) {
      void Promise.resolve().then(() => setHasSavedDraft(false));
      return;
    }
    let active = true;
    void ticketAssessmentWorkflow.loadDraft(ticket.id, userId).then(draft => {
      if (active) setHasSavedDraft(Boolean(draft));
    }).catch(() => {
      if (active) setHasSavedDraft(false);
    });
    return () => { active = false; };
  }, [canEditAssessment, ticket.id, ticket.status, userId]);

  const checkArrival = useCallback(async () => {
    if (autoCheckInFlight.current || !geofenceTarget || !contractorId) return;
    autoCheckInFlight.current = true;
    try {
      const snapshot = await refreshAndValidate();
      if (snapshot.status === 'unsupported' || snapshot.status === 'error' || !snapshot.validation.gpsValid) {
        setArrivalHint('Location needs attention. Turn on device location and return here to retry.');
        return;
      }
      if (snapshot.validation.withinGeofence !== true
        || snapshot.reading.latitude === null || snapshot.reading.longitude === null
        || snapshot.reading.accuracy === null) {
        setArrivalHint('Arrival will update when your device confirms you are at the ticket address.');
        return;
      }

      await ticketService.updateTicketStatus(ticket.id, 'ON_SITE', userId, userRole, undefined, {
        latitude: snapshot.reading.latitude,
        longitude: snapshot.reading.longitude,
        accuracy: snapshot.reading.accuracy,
        capturedAt: snapshot.lastUpdatedAt ?? undefined,
      }, { contractorId });
      setArrivalHint('');
      await onStatusUpdated?.('ON_SITE');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to confirm arrival yet.';
      setArrivalHint(message);
    } finally {
      autoCheckInFlight.current = false;
    }
  }, [contractorId, geofenceTarget, onStatusUpdated, refreshAndValidate, ticket.id, userId, userRole]);

  useEffect(() => {
    if (!isEnRoute) return;
    if (!geofenceTarget) return;
    const checkWhenVisible = () => {
      if (!document.hidden) void checkArrival();
    };
    checkWhenVisible();
    const interval = window.setInterval(checkWhenVisible, 30000);
    document.addEventListener('visibilitychange', checkWhenVisible);
    window.addEventListener('focus', checkWhenVisible);
    window.addEventListener('pageshow', checkWhenVisible);
    window.addEventListener('online', checkWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', checkWhenVisible);
      window.removeEventListener('focus', checkWhenVisible);
      window.removeEventListener('pageshow', checkWhenVisible);
      window.removeEventListener('online', checkWhenVisible);
    };
  }, [checkArrival, geofenceTarget, isEnRoute]);

  const canStart = Boolean(transition && ticket.crew_id && ticket.team_lead_id && ticket.assigned_driver_id && ticket.assigned_to && contractorId);

  const handleStart = async () => {
    if (!transition || !canStart || startInFlight.current) return;
    startInFlight.current = true;
    setIsSubmitting(true);
    setArrivalHint('');
    try {
      const gps = await gpsValidation.refreshAndValidate();
      if (!gps.validation.gpsValid || gps.reading.latitude === null || gps.reading.longitude === null || gps.reading.accuracy === null) {
        throw new Error(gps.errorMessage ?? gps.validation.gpsError ?? 'Allow location access and retry Start.');
      }
      await ticketService.updateTicketStatus(ticket.id, 'IN_ROUTE', userId, userRole, undefined, {
        latitude: gps.reading.latitude,
        longitude: gps.reading.longitude,
        accuracy: gps.reading.accuracy,
        capturedAt: gps.lastUpdatedAt ?? undefined,
      }, { contractorId: contractorId! });
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      toast.success(offline ? 'Start saved on this device. It will sync when you reconnect.' : 'Ticket started. Opening navigation.');
      await onStatusUpdated?.('IN_ROUTE');
      (openNavigation ?? (url => window.location.assign(url)))(navigationUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to start this ticket.');
    } finally {
      startInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  // COMPLETE is retained for tickets created under the legacy workflow. Until
  // they have a submitted assessment, contractors still need to finish them.
  const canOpenAssessment = ['ON_SITE', 'IN_PROGRESS', 'COMPLETE'].includes(ticket.status) && canEditAssessment;
  const isCorrections = ticket.status === 'NEEDS_REWORK' && canEditAssessment;

  return (
    <section id="field-actions" aria-labelledby="field-actions-title" className="cc-work-panel overflow-hidden border-t-4 border-t-grid-blue p-5 shadow-card sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-grid-blue"><MapPin className="size-4" aria-hidden="true" /> Field work</div>
        <h2 id="field-actions-title" className="mt-2 font-heading text-xl font-semibold text-grid-navy">
          {isCorrections ? 'Corrections requested' : ticket.status === 'ASSIGNED' ? 'Ready when you are' : isEnRoute ? 'En route to the site' : canOpenAssessment ? 'At the ticket location' : 'Ticket actions'}
        </h2>
        {offlinePending && <p role="status" className="mt-1 text-sm text-amber-800">Saved on this device · waiting to sync</p>}
        {visibleArrivalHint && <p role="status" className="mt-1 max-w-2xl text-sm text-muted-foreground">{visibleArrivalHint}</p>}
        {!canStart && ticket.status === 'ASSIGNED' && <p className="mt-1 text-sm text-muted-foreground">A team lead, driver, and assessor must be assigned before you can start.</p>}
        {isEnRoute && !arrivalHint && <p className="mt-1 text-sm text-muted-foreground">Arrival is checked automatically when you return to this ticket.</p>}
        {ticket.status === 'ON_SITE' && !canEditAssessment && <p className="mt-1 text-sm text-muted-foreground">The assigned assessor can open the assessment from this ticket.</p>}
        {!transition && !isEnRoute && !canOpenAssessment && !isCorrections && ticket.status !== 'ON_SITE' && (
          <p className="mt-1 text-sm text-muted-foreground">Contact your team lead for the next step on this ticket.</p>
        )}
      </div>
      <div className="mt-4 flex shrink-0 flex-wrap gap-3 sm:mt-0 sm:justify-end">
        {transition && <Button variant="accent" size="lg" onClick={() => void handleStart()} disabled={!canStart || isSubmitting || gpsValidation.status === 'loading'}>
          {isSubmitting || gpsValidation.status === 'loading' ? <Loader2 className="size-4 animate-spin" /> : <Navigation className="size-4" />}
          Start
        </Button>}
        {isEnRoute && <Button asChild variant="outline" size="lg"><a href={navigationUrl}><ArrowUpRight className="size-4" />Open navigation</a></Button>}
        {canOpenAssessment && <Button asChild variant="accent" size="lg"><Link href={`/tickets/${ticket.id}/assessment`}><MapPin className="size-4" />{hasSavedDraft ? 'Continue assessment' : 'Open assessment'}</Link></Button>}
        {isCorrections && <Button asChild variant="accent" size="lg"><Link href={`/tickets/${ticket.id}/assessment`}><MapPin className="size-4" />Correct assessment</Link></Button>}
      </div>
    </section>
  );
}
