import { describe, expect, it } from 'vitest';
import {
  buildGeofenceFeatureCollection,
  buildGeofencePolygon,
  isRenderableGeofence,
} from './GeofenceCircle';

describe('isRenderableGeofence', () => {
  it('accepts valid geofence values', () => {
    expect(
      isRenderableGeofence({
        center: [-96.797, 32.7767],
        radiusMeters: 500,
      }),
    ).toBe(true);
  });

  it('rejects invalid geofence values', () => {
    expect(isRenderableGeofence(null)).toBe(false);
    expect(isRenderableGeofence({ center: [-96.797, 91], radiusMeters: 500 })).toBe(false);
    expect(isRenderableGeofence({ center: [-96.797, 32.7767], radiusMeters: 0 })).toBe(false);
  });
});

describe('buildGeofencePolygon', () => {
  it('creates a closed polygon ring', () => {
    const polygon = buildGeofencePolygon([-96.797, 32.7767], 500, 16);

    expect(polygon).toHaveLength(17);
    expect(polygon[0]).toEqual(polygon[polygon.length - 1]);
  });
});

describe('buildGeofenceFeatureCollection', () => {
  it('creates polygon feature collection for map rendering', () => {
    const collection = buildGeofenceFeatureCollection(
      {
        center: [-96.797, 32.7767],
        radiusMeters: 300,
      },
      12,
    );

    expect(collection.type).toBe('FeatureCollection');
    expect(collection.features).toHaveLength(1);
    expect(collection.features[0].geometry.type).toBe('Polygon');
    expect(collection.features[0].geometry.coordinates[0]).toHaveLength(13);
  });
});
