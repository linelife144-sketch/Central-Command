'use client';

import { useEffect, useMemo } from 'react';
import type { GeoJSONSource, Map, MapLayerMouseEvent } from 'mapbox-gl';

export interface MapTicketMarker {
  id: string;
  ticketNumber: string;
  latitude?: number | null;
  longitude?: number | null;
  status?: string;
  priority?: string;
  geofenceRadiusMeters?: number;
}

interface TicketMarkersProps {
  map: Map | null;
  tickets: MapTicketMarker[];
  onTicketSelect?: (ticket: MapTicketMarker) => void;
  selectedTicketId?: string;
  sourceId?: string;
  markerLayerId?: string;
  selectedMarkerLayerId?: string;
}

interface TicketFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Point';
      coordinates: [number, number];
    };
    properties: {
      id: string;
      ticketNumber: string;
      status: string;
      priority: string;
    };
  }>;
}

export function isValidLngLat(longitude?: number | null, latitude?: number | null): boolean {
  return typeof longitude === 'number'
    && Number.isFinite(longitude)
    && longitude >= -180
    && longitude <= 180
    && typeof latitude === 'number'
    && Number.isFinite(latitude)
    && latitude >= -90
    && latitude <= 90;
}

export function getRenderableTickets(tickets: MapTicketMarker[]): MapTicketMarker[] {
  return tickets.filter((ticket) => isValidLngLat(ticket.longitude, ticket.latitude));
}

export function buildTicketFeatureCollection(tickets: MapTicketMarker[]): TicketFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: tickets.map((ticket) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [ticket.longitude as number, ticket.latitude as number],
      },
      properties: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status ?? 'UNKNOWN',
        priority: ticket.priority ?? 'UNKNOWN',
      },
    })),
  };
}

function removeLayerIfPresent(map: Map, layerId: string) {
  if (map.getLayer(layerId)) {
    map.removeLayer(layerId);
  }
}

function removeSourceIfPresent(map: Map, sourceId: string) {
  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
}

export function TicketMarkers({
  map,
  tickets,
  onTicketSelect,
  selectedTicketId,
  sourceId = 'ticket-markers-source',
  markerLayerId = 'ticket-markers-layer',
  selectedMarkerLayerId = 'ticket-markers-selected-layer',
}: TicketMarkersProps) {
  const renderableTickets = useMemo(() => getRenderableTickets(tickets), [tickets]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const handleMarkerClick = (event: MapLayerMouseEvent) => {
      if (!onTicketSelect) {
        return;
      }

      const clickedTicketId = event.features?.[0]?.properties?.id;
      if (typeof clickedTicketId !== 'string') {
        return;
      }

      const clickedTicket = renderableTickets.find((ticket) => ticket.id === clickedTicketId);
      if (clickedTicket) {
        onTicketSelect(clickedTicket);
      }
    };

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    let cancelled = false;

    const renderMarkers = () => {
      if (cancelled) {
        return;
      }

      removeLayerIfPresent(map, selectedMarkerLayerId);
      removeLayerIfPresent(map, markerLayerId);
      removeSourceIfPresent(map, sourceId);

      if (renderableTickets.length === 0) {
        return;
      }

      map.addSource(sourceId, {
        type: 'geojson',
        data: buildTicketFeatureCollection(renderableTickets) as unknown as GeoJSON.FeatureCollection,
      });

      map.addLayer({
        id: markerLayerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': 8,
          'circle-color': '#2563EB',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      map.addLayer({
        id: selectedMarkerLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['==', ['get', 'id'], selectedTicketId ?? ''],
        paint: {
          'circle-radius': 11,
          'circle-color': '#F59E0B',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#1E293B',
        },
      });

      const source = map.getSource(sourceId) as GeoJSONSource | undefined;
      if (source) {
        source.setData(buildTicketFeatureCollection(renderableTickets) as unknown as GeoJSON.FeatureCollection);
      }

      map.on('click', markerLayerId, handleMarkerClick);
      map.on('mouseenter', markerLayerId, handleMouseEnter);
      map.on('mouseleave', markerLayerId, handleMouseLeave);
    };

    if (map.isStyleLoaded()) {
      renderMarkers();
    } else {
      map.once('load', renderMarkers);
    }

    return () => {
      cancelled = true;
      map.off('load', renderMarkers);
      map.off('click', markerLayerId, handleMarkerClick);
      map.off('mouseenter', markerLayerId, handleMouseEnter);
      map.off('mouseleave', markerLayerId, handleMouseLeave);
      map.getCanvas().style.cursor = '';
      removeLayerIfPresent(map, selectedMarkerLayerId);
      removeLayerIfPresent(map, markerLayerId);
      removeSourceIfPresent(map, sourceId);
    };
  }, [
    map,
    markerLayerId,
    onTicketSelect,
    renderableTickets,
    selectedMarkerLayerId,
    selectedTicketId,
    sourceId,
  ]);

  return null;
}
