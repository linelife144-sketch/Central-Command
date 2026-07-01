import { describe, expect, it } from 'vitest';
import {
  haversineDistanceMeters,
  isValidRouteStop,
  optimizeRoute,
  type RouteStop,
} from './routeOptimizationService';

describe('haversineDistanceMeters', () => {
  it('returns ~0 for identical points', () => {
    const distance = haversineDistanceMeters(
      { latitude: 32.7767, longitude: -96.797 },
      { latitude: 32.7767, longitude: -96.797 },
    );

    expect(distance).toBeLessThan(0.1);
  });

  it('returns positive distance for distinct points', () => {
    const distance = haversineDistanceMeters(
      { latitude: 32.7767, longitude: -96.797 },
      { latitude: 32.781, longitude: -96.81 },
    );

    expect(distance).toBeGreaterThan(0);
  });
});

describe('isValidRouteStop', () => {
  it('accepts valid route stops', () => {
    expect(
      isValidRouteStop({
        id: 'a1',
        latitude: 32.7767,
        longitude: -96.797,
      }),
    ).toBe(true);
  });

  it('rejects invalid route stops', () => {
    expect(
      isValidRouteStop({
        id: '',
        latitude: 32.7767,
        longitude: -96.797,
      }),
    ).toBe(false);
    expect(
      isValidRouteStop({
        id: 'a2',
        latitude: 120,
        longitude: -96.797,
      }),
    ).toBe(false);
  });
});

describe('optimizeRoute', () => {
  const stops: RouteStop[] = [
    { id: 'A', latitude: 32.7767, longitude: -96.797 },
    { id: 'B', latitude: 32.78, longitude: -96.80 },
    { id: 'C', latitude: 32.79, longitude: -96.82 },
  ];

  it('returns empty route for empty input', () => {
    const result = optimizeRoute([]);
    expect(result.orderedStops).toEqual([]);
    expect(result.routeCoordinates).toEqual([]);
    expect(result.totalDistanceMeters).toBe(0);
  });

  it('returns single-stop route with zero distance', () => {
    const result = optimizeRoute([stops[0]]);
    expect(result.orderedStops).toHaveLength(1);
    expect(result.totalDistanceMeters).toBe(0);
  });

  it('produces deterministic nearest-neighbor order', () => {
    const result = optimizeRoute(stops, { latitude: 32.7767, longitude: -96.797 });
    expect(result.orderedStops.map((stop) => stop.id)).toEqual(['A', 'B', 'C']);
    expect(result.routeCoordinates).toHaveLength(3);
    expect(result.totalDistanceMeters).toBeGreaterThan(0);
  });
});
