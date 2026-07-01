import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  normalizeInitialView,
  resolveMapboxToken,
} from './MapView';

describe('resolveMapboxToken', () => {
  it('returns explicit token input when provided', () => {
    expect(resolveMapboxToken('pk.test-token')).toBe('pk.test-token');
  });

  it('returns null when token is missing or empty', () => {
    expect(resolveMapboxToken(undefined)).toBeNull();
    expect(resolveMapboxToken('   ')).toBeNull();
  });
});

describe('normalizeInitialView', () => {
  it('returns defaults for invalid inputs', () => {
    const normalized = normalizeInitialView([200, 91], -1);
    expect(normalized.center).toEqual(DEFAULT_MAP_CENTER);
    expect(normalized.zoom).toBe(DEFAULT_MAP_ZOOM);
  });

  it('keeps valid center and zoom values', () => {
    const normalized = normalizeInitialView([-96.8, 32.7], 9);
    expect(normalized.center).toEqual([-96.8, 32.7]);
    expect(normalized.zoom).toBe(9);
  });
});
