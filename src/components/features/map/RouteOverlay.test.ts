import { describe, expect, it } from 'vitest';
import { buildRouteFeatureCollection, hasRenderableRoute } from './RouteOverlay';

describe('hasRenderableRoute', () => {
  it('returns true only when two or more valid coordinates are provided', () => {
    expect(hasRenderableRoute([[-96.8, 32.8], [-96.9, 32.9]])).toBe(true);
    expect(hasRenderableRoute([[-96.8, 32.8]])).toBe(false);
    expect(hasRenderableRoute([[400, 32.8], [-96.9, 32.9]])).toBe(false);
  });
});

describe('buildRouteFeatureCollection', () => {
  it('creates a line feature collection from route coordinates', () => {
    const coordinates: [number, number][] = [
      [-96.8, 32.8],
      [-96.9, 32.9],
      [-97.0, 33.0],
    ];

    const featureCollection = buildRouteFeatureCollection(coordinates);
    expect(featureCollection.type).toBe('FeatureCollection');
    expect(featureCollection.features).toHaveLength(1);
    expect(featureCollection.features[0].geometry.type).toBe('LineString');
    expect(featureCollection.features[0].geometry.coordinates).toEqual(coordinates);
  });
});
