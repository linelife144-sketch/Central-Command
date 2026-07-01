import { describe, expect, it } from 'vitest';

import { formatDateTime, formatTime } from './formatters';

describe('time formatters', () => {
  it('uses 12-hour format with AM/PM for time-only values', () => {
    const result = formatTime(new Date('2026-02-21T17:05:00Z'));
    expect(result).toMatch(/^(1[0-2]|0?[1-9]):[0-5][0-9]\s(AM|PM)$/i);
  });

  it('uses 12-hour format with AM/PM for date-time values', () => {
    const result = formatDateTime(new Date('2026-02-21T17:05:00Z'));
    expect(result).toMatch(/(1[0-2]|0?[1-9]):[0-5][0-9]\s(AM|PM)$/i);
  });
});
