import { describe, expect, it } from 'vitest';

import { normalizeDateTimeLocal24 } from './dateTime';

describe('normalizeDateTimeLocal24', () => {
  it('keeps valid 24-hour datetime-local values unchanged', () => {
    expect(normalizeDateTimeLocal24('2026-02-21T13:45')).toBe('2026-02-21T13:45');
  });

  it('normalizes 12-hour strings into 24-hour datetime-local values', () => {
    expect(normalizeDateTimeLocal24('02/21/2026 1:45 PM')).toBe('2026-02-21T13:45');
  });

  it('normalizes second precision values to minute precision', () => {
    expect(normalizeDateTimeLocal24('2026-02-21T13:45:59')).toBe('2026-02-21T13:45');
  });

  it('returns empty string for invalid input values', () => {
    expect(normalizeDateTimeLocal24('not-a-date')).toBe('');
  });
});
