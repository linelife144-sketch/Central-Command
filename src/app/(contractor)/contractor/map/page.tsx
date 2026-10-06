'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { MapView } from '@/components/features/map/MapView';
import { isValidLngLat, type MapTicketMarker } from '@/components/features/map/TicketMarkers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/components/providers/AuthProvider';
import { useContractorId } from '@/hooks/useContractorId';
import { ticketService } from '@/lib/services/ticketService';
import type { Ticket } from '@/types';
import type { GeofenceOverlay, LngLatTuple } from '@/components/features/map/types';
import { toast } from 'sonner';
import { getContractorTicketDisplayStatus } from '@/lib/utils/statusUpdateFlow';
import { supabase } from '@/lib/supabase/client';
import { GRID_TICKETS_CHANGED_EVENT } from '@/lib/tickets/events';

function toMapTicket(ticket: Ticket): MapTicketMarker {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticket_number,
    latitude: ticket.latitude,
    longitude: ticket.longitude,
    status: getContractorTicketDisplayStatus(ticket.status),
    isImportant: ticket.is_important,
    geofenceRadiusMeters: ticket.geofence_radius_meters,
  };
}

function getTicketCenter(ticket: MapTicketMarker | undefined): LngLatTuple | null {
  if (!ticket || !isValidLngLat(ticket.longitude, ticket.latitude)) {
    return null;
  }

  return [ticket.longitude as number, ticket.latitude as number];
}

export default function ContractorMapPage() {
  const { profile, isLoading: isAuthLoading } = useAuth();
  const { contractorId, isLoading: isResolvingContractorId } = useContractorId(profile?.id);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const isLoading = isAuthLoading || isResolvingContractorId || Boolean(contractorId && isLoadingTickets);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | undefined>();
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false);

  const fetchAssignedTickets = useCallback(
    async (assigneeId: string) => ticketService.getTicketsByAssignee(assigneeId),
    [],
  );

  useEffect(() => {
    if (!contractorId) {
      return;
    }

    let active = true;

    const loadTicketsForMap = async () => {
      setIsLoadingTickets(true);
      try {
        const data = await fetchAssignedTickets(contractorId);
        if (active) {
          setTickets(data);
          setSelectedTicketId((currentId) => currentId && data.some((ticket) => ticket.id === currentId)
            ? currentId
            : data.find((ticket) => isValidLngLat(ticket.longitude, ticket.latitude))?.id);
        }
      } catch {
        if (active) {
          toast.error('Failed to load assigned tickets for map view.');
        }
      } finally {
        if (active) {
          setIsLoadingTickets(false);
        }
      }
    };

    const refresh = () => {
      if (navigator.onLine) void loadTicketsForMap();
    };

    void Promise.resolve().then(loadTicketsForMap);
    window.addEventListener(GRID_TICKETS_CHANGED_EVENT, refresh);
    window.addEventListener('online', refresh);
    const channel = supabase.channel(`contractor-map-${contractorId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets' }, refresh)
      .subscribe();

    return () => {
      active = false;
      window.removeEventListener(GRID_TICKETS_CHANGED_EVENT, refresh);
      window.removeEventListener('online', refresh);
      void supabase.removeChannel(channel);
    };
  }, [fetchAssignedTickets, contractorId]);

  const mapTickets = useMemo(() => tickets.map(toMapTicket), [tickets]);

  const selectedTicket = useMemo(
    () => mapTickets.find((ticket) => ticket.id === selectedTicketId)
      ?? mapTickets.find((ticket) => isValidLngLat(ticket.longitude, ticket.latitude)),
    [mapTickets, selectedTicketId],
  );

  const geofence = useMemo<GeofenceOverlay | null>(() => {
    const center = getTicketCenter(selectedTicket);
    if (!center) {
      return null;
    }

    return {
      center,
      radiusMeters: selectedTicket?.geofenceRadiusMeters ?? 500,
    };
  }, [selectedTicket]);

  const initialCenter = useMemo(() => {
    const selectedCenter = getTicketCenter(selectedTicket);
    if (selectedCenter) {
      return selectedCenter;
    }

    const firstTicket = mapTickets.find((ticket) => isValidLngLat(ticket.longitude, ticket.latitude));
    if (firstTicket) {
      return [firstTicket.longitude as number, firstTicket.latitude as number] as LngLatTuple;
    }

    return undefined;
  }, [mapTickets, selectedTicket]);

  const hasCoordinateTickets = mapTickets.some((ticket) => isValidLngLat(ticket.longitude, ticket.latitude));
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Map"
        description="View assigned ticket locations. Opening the field checklist records arrival."
      >
        <Button
          variant="outline"
          onClick={() => setIsMobileMapOpen(true)}
          disabled={!hasCoordinateTickets}
          className="sm:hidden"
        >
          Full Screen Map
        </Button>
      </PageHeader>

      {isAuthLoading || isResolvingContractorId || isLoading ? (
        <div className="storm-surface rounded-xl px-4 py-6 text-sm text-slate-500">Loading assigned map data...</div>
      ) : hasCoordinateTickets ? (
        <MapView
          className="h-[60vh]"
          initialCenter={initialCenter}
          initialZoom={12}
          tickets={mapTickets}
          selectedTicketId={selectedTicketId}
          onTicketSelect={(ticket) => setSelectedTicketId(ticket.id)}
          geofence={geofence}
        />
      ) : (
        <div className="storm-surface rounded-xl px-4 py-6 text-sm text-slate-500">
          No assigned tickets with coordinates are available yet.
        </div>
      )}

      <Card className="storm-surface">
        <CardHeader>
          <CardTitle className="text-lg text-grid-navy">Selected Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {selectedTicket ? (
            <>
              <p className="font-medium">{selectedTicket.ticketNumber}</p>
              <p>Status: {selectedTicket.status ?? 'Open'}</p>
              <p>Important: {selectedTicket.isImportant ? 'Yes' : 'No'}</p>
              <p>Geofence Radius: {selectedTicket.geofenceRadiusMeters ?? 500}m</p>
            </>
          ) : (
            <p className="text-slate-500">Select a ticket marker to view assignment details.</p>
          )}
        </CardContent>
      </Card>

      {isMobileMapOpen && hasCoordinateTickets && (
        <div className="fixed inset-0 z-50 bg-grid-surface sm:hidden">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Full-Screen Map</p>
                <p className="text-xs text-slate-500">Assigned tickets, route context, and geofence.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsMobileMapOpen(false)}>
                Close
              </Button>
            </div>
            <MapView
              className="h-full min-h-0 rounded-none border-0"
              initialCenter={initialCenter}
              initialZoom={12}
              tickets={mapTickets}
              selectedTicketId={selectedTicketId}
              onTicketSelect={(ticket) => setSelectedTicketId(ticket.id)}
              geofence={geofence}
            />
          </div>
        </div>
      )}
    </div>
  );
}
