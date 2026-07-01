'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { MapView } from '@/components/features/map/MapView';
import { isValidLngLat, type MapTicketMarker } from '@/components/features/map/TicketMarkers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { optimizeRoute, type RouteStop } from '@/lib/services/routeOptimizationService';
import { ticketService } from '@/lib/services/ticketService';
import { formatDate } from '@/lib/utils/formatters';
import type { Ticket } from '@/types';
import type { GeofenceOverlay, LngLatTuple } from '@/components/features/map/types';
import { toast } from 'sonner';

function toMapTicket(ticket: Ticket): MapTicketMarker {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticket_number,
    latitude: ticket.latitude,
    longitude: ticket.longitude,
    status: ticket.status,
    priority: ticket.priority,
    geofenceRadiusMeters: ticket.geofence_radius_meters,
  };
}

function getTicketCenter(ticket: MapTicketMarker | undefined): LngLatTuple | null {
  if (!ticket || !isValidLngLat(ticket.longitude, ticket.latitude)) {
    return null;
  }

  return [ticket.longitude as number, ticket.latitude as number];
}

export default function AdminMapPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | undefined>();
  const [routeEnabled, setRouteEnabled] = useState(false);

  useEffect(() => {
    let active = true;

    const loadTickets = async () => {
      setIsLoading(true);
      try {
        const data = await ticketService.getTickets();
        if (active) {
          setTickets(data);
        }
      } catch {
        if (active) {
          toast.error('Failed to load tickets for map view.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadTickets();

    return () => {
      active = false;
    };
  }, []);

  const mapTickets = useMemo(() => tickets.map(toMapTicket), [tickets]);

  const selectedTicket = useMemo(
    () => mapTickets.find((ticket) => ticket.id === selectedTicketId),
    [mapTickets, selectedTicketId],
  );

  useEffect(() => {
    if (selectedTicketId) {
      return;
    }

    const firstWithCoordinates = mapTickets.find((ticket) => isValidLngLat(ticket.longitude, ticket.latitude));
    if (firstWithCoordinates) {
      setSelectedTicketId(firstWithCoordinates.id);
    }
  }, [mapTickets, selectedTicketId]);

  const routeStops = useMemo<RouteStop[]>(
    () => mapTickets
      .filter((ticket) => isValidLngLat(ticket.longitude, ticket.latitude))
      .map((ticket) => ({
        id: ticket.id,
        label: ticket.ticketNumber,
        latitude: ticket.latitude as number,
        longitude: ticket.longitude as number,
      })),
    [mapTickets],
  );

  const selectedCenter = useMemo(() => getTicketCenter(selectedTicket), [selectedTicket]);

  const optimizedRoute = useMemo(
    () => optimizeRoute(
      routeStops,
      selectedCenter ? { latitude: selectedCenter[1], longitude: selectedCenter[0] } : undefined,
    ),
    [routeStops, selectedCenter],
  );

  const routeCoordinates = useMemo(
    () => (routeEnabled ? optimizedRoute.routeCoordinates as LngLatTuple[] : undefined),
    [optimizedRoute.routeCoordinates, routeEnabled],
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
    if (selectedCenter) {
      return selectedCenter;
    }

    const firstTicket = mapTickets.find((ticket) => isValidLngLat(ticket.longitude, ticket.latitude));
    if (firstTicket) {
      return [firstTicket.longitude as number, firstTicket.latitude as number] as LngLatTuple;
    }

    return undefined;
  }, [mapTickets, selectedCenter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Map View"
        description="Visualize tickets, route overlays, and geofence boundaries."
      >
        <Button
          variant="storm"
          onClick={() => setRouteEnabled((current) => !current)}
          disabled={optimizedRoute.orderedStops.length < 2}
        >
          {routeEnabled ? 'Hide Route' : 'Optimize Route'}
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="storm-surface rounded-xl px-4 py-6 text-sm text-grid-muted">Loading map data...</div>
      ) : (
        <MapView
          className="h-[60vh]"
          initialCenter={initialCenter}
          initialZoom={11}
          tickets={mapTickets}
          selectedTicketId={selectedTicketId}
          onTicketSelect={(ticket) => setSelectedTicketId(ticket.id)}
          routeCoordinates={routeCoordinates}
          geofence={geofence}
        />
      )}

      <Card className="storm-surface">
        <CardHeader>
          <CardTitle className="text-lg text-grid-navy">Selected Ticket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {selectedTicket ? (
            <>
              <p className="font-medium">{selectedTicket.ticketNumber}</p>
              <p>Status: {selectedTicket.status ?? 'UNKNOWN'}</p>
              <p>Priority: {selectedTicket.priority ?? 'UNKNOWN'}</p>
              <p>Radius: {selectedTicket.geofenceRadiusMeters ?? 500}m</p>
              <p>Last Updated: {formatDate(tickets.find((ticket) => ticket.id === selectedTicket.id)?.updated_at ?? null)}</p>
            </>
          ) : (
            <p className="text-grid-muted">No ticket with valid coordinates is currently selected.</p>
          )}
        </CardContent>
      </Card>

      <Card className="storm-surface">
        <CardHeader>
          <CardTitle className="text-lg text-grid-navy">Route View</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {optimizedRoute.orderedStops.length < 2 ? (
            <p className="text-grid-muted">
              At least two geocoded tickets are required to generate an optimized route.
            </p>
          ) : !routeEnabled ? (
            <p className="text-grid-muted">
              Route optimization is available. Click <span className="font-medium">Optimize Route</span> to render sequence.
            </p>
          ) : (
            <>
              <p>
                Optimized Stops: <span className="font-medium">{optimizedRoute.orderedStops.length}</span>
              </p>
              <p>
                Estimated Distance:{' '}
                <span className="font-medium">
                  {(optimizedRoute.totalDistanceMeters / 1609.34).toFixed(2)} miles
                </span>
              </p>
              <ol className="list-decimal pl-5 space-y-1">
                {optimizedRoute.orderedStops.map((stop) => (
                  <li key={stop.id}>
                    {stop.label ?? stop.id}
                  </li>
                ))}
              </ol>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
