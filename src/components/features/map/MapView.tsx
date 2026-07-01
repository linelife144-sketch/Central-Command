'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map } from 'mapbox-gl';
import { cn } from '../../../lib/utils';
import { GeofenceCircle } from './GeofenceCircle';
import { RouteOverlay } from './RouteOverlay';
import { type MapTicketMarker, TicketMarkers } from './TicketMarkers';
import type { GeofenceOverlay, LngLatTuple } from './types';

const DEFAULT_STYLE_URL = 'mapbox://styles/mapbox/streets-v12';
export const DEFAULT_MAP_CENTER: LngLatTuple = [-95.7129, 37.0902];
export const DEFAULT_MAP_ZOOM = 4;

interface NormalizedInitialView {
  center: LngLatTuple;
  zoom: number;
}

interface MapViewProps {
  accessToken?: string;
  className?: string;
  styleUrl?: string;
  initialCenter?: LngLatTuple;
  initialZoom?: number;
  tickets?: MapTicketMarker[];
  selectedTicketId?: string;
  onTicketSelect?: (ticket: MapTicketMarker) => void;
  routeCoordinates?: LngLatTuple[];
  geofence?: GeofenceOverlay | null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidCenter(center?: LngLatTuple): center is LngLatTuple {
  if (!center) {
    return false;
  }

  const [longitude, latitude] = center;
  return isFiniteNumber(longitude)
    && longitude >= -180
    && longitude <= 180
    && isFiniteNumber(latitude)
    && latitude >= -90
    && latitude <= 90;
}

export function resolveMapboxToken(accessToken?: string): string | null {
  const resolvedToken = accessToken?.trim() ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? '';
  return resolvedToken.length > 0 ? resolvedToken : null;
}

export function normalizeInitialView(
  initialCenter?: LngLatTuple,
  initialZoom?: number,
): NormalizedInitialView {
  const center = isValidCenter(initialCenter) ? initialCenter : DEFAULT_MAP_CENTER;
  const zoom = isFiniteNumber(initialZoom) && initialZoom >= 1 && initialZoom <= 20
    ? initialZoom
    : DEFAULT_MAP_ZOOM;

  return { center, zoom };
}

export function MapView({
  accessToken,
  className,
  styleUrl = DEFAULT_STYLE_URL,
  initialCenter,
  initialZoom,
  tickets = [],
  selectedTicketId,
  onTicketSelect,
  routeCoordinates,
  geofence,
}: MapViewProps) {
  const token = resolveMapboxToken(accessToken);
  const normalizedView = useMemo(
    () => normalizeInitialView(initialCenter, initialZoom),
    [initialCenter, initialZoom],
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) {
      return;
    }

    let isDisposed = false;

    const initializeMap = async () => {
      try {
        const mapboxModule = await import('mapbox-gl');
        const mapboxgl = mapboxModule.default;

        mapboxgl.accessToken = token;

        const nextMap = new mapboxgl.Map({
          container: containerRef.current as HTMLDivElement,
          style: styleUrl,
          center: normalizedView.center,
          zoom: normalizedView.zoom,
          attributionControl: false,
        });

        nextMap.addControl(new mapboxgl.NavigationControl(), 'top-right');
        nextMap.on('load', () => {
          if (!isDisposed) {
            setMap(nextMap);
          }
        });
        nextMap.on('error', () => {
          if (!isDisposed) {
            setLoadError('Unable to load map tiles right now.');
          }
        });

        mapRef.current = nextMap;
      } catch {
        if (!isDisposed) {
          setLoadError('Unable to initialize map view.');
        }
      }
    };

    void initializeMap();

    return () => {
      isDisposed = true;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      setMap(null);
    };
  }, [normalizedView.center, normalizedView.zoom, styleUrl, token]);

  useEffect(() => {
    const currentMap = mapRef.current;
    if (!currentMap) {
      return;
    }

    currentMap.easeTo({
      center: normalizedView.center,
      zoom: normalizedView.zoom,
      duration: 0,
    });
  }, [normalizedView.center, normalizedView.zoom]);

  if (!token) {
    return (
      <div
        className={cn(
          'flex min-h-[420px] items-center justify-center rounded-lg border border-dashed border-amber-300 bg-amber-50 px-6 py-8 text-center text-sm text-amber-900',
          className,
        )}
        data-testid="map-token-error"
      >
        Map unavailable. Configure `NEXT_PUBLIC_MAPBOX_TOKEN` to enable map rendering.
      </div>
    );
  }

  return (
    <div
      className={cn(
        'storm-surface relative min-h-[420px] overflow-hidden rounded-xl bg-grid-surface',
        className,
      )}
    >
      <div ref={containerRef} className="h-full min-h-[420px] w-full" data-testid="map-canvas" />

      {loadError && (
        <div className="pointer-events-none absolute inset-x-4 top-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {loadError}
        </div>
      )}

      <TicketMarkers
        map={map}
        tickets={tickets}
        selectedTicketId={selectedTicketId}
        onTicketSelect={onTicketSelect}
      />
      <RouteOverlay map={map} coordinates={routeCoordinates} />
      <GeofenceCircle map={map} geofence={geofence ?? null} />
    </div>
  );
}
