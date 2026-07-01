'use client';

import { useEffect } from 'react';
import type { GeoJSONSource, Map } from 'mapbox-gl';
import type { GeofenceOverlay, LngLatTuple } from './types';

const EARTH_RADIUS_METERS = 6_378_137;

interface GeofenceCircleProps {
  map: Map | null;
  geofence: GeofenceOverlay | null;
  steps?: number;
  sourceId?: string;
  fillLayerId?: string;
  lineLayerId?: string;
  fillColor?: string;
  lineColor?: string;
}

interface GeofenceFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Polygon';
      coordinates: LngLatTuple[][];
    };
    properties: {
      radiusMeters: number;
    };
  }>;
}

export function isRenderableGeofence(geofence: GeofenceOverlay | null): geofence is GeofenceOverlay {
  if (!geofence) {
    return false;
  }

  const [longitude, latitude] = geofence.center;

  return Number.isFinite(longitude)
    && longitude >= -180
    && longitude <= 180
    && Number.isFinite(latitude)
    && latitude >= -90
    && latitude <= 90
    && Number.isFinite(geofence.radiusMeters)
    && geofence.radiusMeters > 0;
}

export function buildGeofencePolygon(
  center: LngLatTuple,
  radiusMeters: number,
  steps = 64,
): LngLatTuple[] {
  const [centerLongitude, centerLatitude] = center;
  const latitudeRadians = (centerLatitude * Math.PI) / 180;
  const cosLatitude = Math.max(Math.cos(latitudeRadians), 1e-12);

  const coordinates: LngLatTuple[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * (2 * Math.PI);
    const x = radiusMeters * Math.cos(angle);
    const y = radiusMeters * Math.sin(angle);

    const offsetLongitude = (x / (EARTH_RADIUS_METERS * cosLatitude)) * (180 / Math.PI);
    const offsetLatitude = (y / EARTH_RADIUS_METERS) * (180 / Math.PI);

    coordinates.push([centerLongitude + offsetLongitude, centerLatitude + offsetLatitude]);
  }

  return coordinates;
}

export function buildGeofenceFeatureCollection(
  geofence: GeofenceOverlay,
  steps = 64,
): GeofenceFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [buildGeofencePolygon(geofence.center, geofence.radiusMeters, steps)],
        },
        properties: {
          radiusMeters: geofence.radiusMeters,
        },
      },
    ],
  };
}

function removeGeofenceLayers(map: Map, fillLayerId: string, lineLayerId: string, sourceId: string) {
  if (map.getLayer(fillLayerId)) {
    map.removeLayer(fillLayerId);
  }

  if (map.getLayer(lineLayerId)) {
    map.removeLayer(lineLayerId);
  }

  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
}

export function GeofenceCircle({
  map,
  geofence,
  steps = 64,
  sourceId = 'geofence-circle-source',
  fillLayerId = 'geofence-circle-fill-layer',
  lineLayerId = 'geofence-circle-line-layer',
  fillColor = '#3B82F6',
  lineColor = '#1E40AF',
}: GeofenceCircleProps) {
  useEffect(() => {
    if (!map) {
      return;
    }

    let cancelled = false;

    const renderGeofence = () => {
      if (cancelled) {
        return;
      }

      if (!isRenderableGeofence(geofence)) {
        removeGeofenceLayers(map, fillLayerId, lineLayerId, sourceId);
        return;
      }

      const data = buildGeofenceFeatureCollection(geofence, steps);

      if (map.getLayer(fillLayerId) && map.getLayer(lineLayerId) && map.getSource(sourceId)) {
        const existingSource = map.getSource(sourceId) as GeoJSONSource | undefined;
        if (existingSource) {
          existingSource.setData(data as unknown as GeoJSON.FeatureCollection);
        }
        return;
      }

      removeGeofenceLayers(map, fillLayerId, lineLayerId, sourceId);

      map.addSource(sourceId, {
        type: 'geojson',
        data: data as unknown as GeoJSON.FeatureCollection,
      });

      map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': fillColor,
          'fill-opacity': 0.14,
        },
      });

      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': lineColor,
          'line-width': 2,
          'line-opacity': 0.85,
        },
      });
    };

    if (map.isStyleLoaded()) {
      renderGeofence();
    } else {
      map.once('load', renderGeofence);
    }

    return () => {
      cancelled = true;
      map.off('load', renderGeofence);
      removeGeofenceLayers(map, fillLayerId, lineLayerId, sourceId);
    };
  }, [fillColor, fillLayerId, geofence, lineColor, lineLayerId, map, sourceId, steps]);

  return null;
}
