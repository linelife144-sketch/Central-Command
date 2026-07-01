import { describe, expect, it } from 'vitest';
import {
  buildTicketFeatureCollection,
  getRenderableTickets,
  isValidLngLat,
  type MapTicketMarker,
} from './TicketMarkers';

const tickets: MapTicketMarker[] = [
  {
    id: 'a1',
    ticketNumber: 'GES-001',
    latitude: 32.7767,
    longitude: -96.797,
    status: 'ASSIGNED',
    priority: 'A',
  },
  {
    id: 'a2',
    ticketNumber: 'GES-002',
    latitude: 999,
    longitude: -96.7,
    status: 'DRAFT',
    priority: 'B',
  },
];

describe('isValidLngLat', () => {
  it('returns true for valid coordinate pairs', () => {
    expect(isValidLngLat(-96.797, 32.7767)).toBe(true);
  });

  it('returns false for invalid coordinate pairs', () => {
    expect(isValidLngLat(181, 32.7767)).toBe(false);
    expect(isValidLngLat(-96.797, -91)).toBe(false);
    expect(isValidLngLat(undefined, 32.7767)).toBe(false);
  });
});

describe('getRenderableTickets', () => {
  it('filters out tickets with invalid coordinates', () => {
    const filtered = getRenderableTickets(tickets);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('a1');
  });
});

describe('buildTicketFeatureCollection', () => {
  it('creates a geojson feature collection for map layers', () => {
    const filtered = getRenderableTickets(tickets);
    const featureCollection = buildTicketFeatureCollection(filtered);

    expect(featureCollection.type).toBe('FeatureCollection');
    expect(featureCollection.features).toHaveLength(1);
    expect(featureCollection.features[0].geometry.coordinates).toEqual([-96.797, 32.7767]);
    expect(featureCollection.features[0].properties.id).toBe('a1');
  });
});
