'use client';

import { useEffect } from 'react';
import type { GeoJSONSource, Map } from 'mapbox-gl';
import type { LngLatTuple } from './types';

interface RouteOverlayProps {
  map: Map | null;
  coordinates?: LngLatTuple[];
  sourceId?: string;
  layerId?: string;
  lineColor?: string;
  lineWidth?: number;
}

interface RouteFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'LineString';
      coordinates: LngLatTuple[];
    };
    properties: {
      name: string;
    };
  }>;
}

export function hasRenderableRoute(coordinates?: LngLatTuple[]): boolean {
  if (!coordinates || coordinates.length < 2) {
    return false;
  }

  return coordinates.every(
    ([longitude, latitude]) => Number.isFinite(longitude)
      && longitude >= -180
      && longitude <= 180
      && Number.isFinite(latitude)
      && latitude >= -90
      && latitude <= 90,
  );
}

export function buildRouteFeatureCollection(coordinates: LngLatTuple[]): RouteFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates,
        },
        properties: {
          name: 'Ticket Route',
        },
      },
    ],
  };
}

function removeLayerAndSource(map: Map, layerId: string, sourceId: string) {
  if (map.getLayer(layerId)) {
    map.removeLayer(layerId);
  }

  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
}

export function RouteOverlay({
  map,
  coordinates,
  sourceId = 'route-overlay-source',
  layerId = 'route-overlay-layer',
  lineColor = '#1D4ED8',
  lineWidth = 4,
}: RouteOverlayProps) {
  useEffect(() => {
    if (!map) {
      return;
    }

    let cancelled = false;

    const renderRoute = () => {
      if (cancelled) {
        return;
      }

      if (!hasRenderableRoute(coordinates)) {
        removeLayerAndSource(map, layerId, sourceId);
        return;
      }

      if (map.getLayer(layerId) && map.getSource(sourceId)) {
        const existingSource = map.getSource(sourceId) as GeoJSONSource | undefined;
        if (existingSource) {
          existingSource.setData(
            buildRouteFeatureCollection(coordinates as LngLatTuple[]) as unknown as GeoJSON.FeatureCollection,
          );
        }
        return;
      }

      removeLayerAndSource(map, layerId, sourceId);

      map.addSource(sourceId, {
        type: 'geojson',
        data: buildRouteFeatureCollection(coordinates as LngLatTuple[]) as unknown as GeoJSON.FeatureCollection,
      });

      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': lineColor,
          'line-width': lineWidth,
          'line-opacity': 0.8,
        },
      });
    };

    if (map.isStyleLoaded()) {
      renderRoute();
    } else {
      map.once('load', renderRoute);
    }

    return () => {
      cancelled = true;
      map.off('load', renderRoute);
      removeLayerAndSource(map, layerId, sourceId);
    };
  }, [coordinates, layerId, lineColor, lineWidth, map, sourceId]);

  return null;
}
