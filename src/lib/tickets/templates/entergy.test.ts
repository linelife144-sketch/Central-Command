import { describe, expect, it } from 'vitest';

import { entergyPayloadSchema } from './entergy';

const basePayload = {
  incident_number: '1234567890',
  incident_type: 'LGTS' as const,
  address_line: '123 Main St',
};

describe('entergyPayloadSchema', () => {
  it('rejects incident number values that are not exactly 10 digits', () => {
    const result = entergyPayloadSchema.safeParse({
      ...basePayload,
      incident_number: '12345',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Incident Number must be exactly 10 digits.');
    }
  });

  it('normalizes 12-hour timing values into 24-hour format', () => {
    const result = entergyPayloadSchema.parse({
      ...basePayload,
      calls_start_time: '02/21/2026 1:45 PM',
    });

    expect(result.calls_start_time).toBe('2026-02-21T13:45');
  });

  it('rejects invalid timing values that cannot be normalized', () => {
    const result = entergyPayloadSchema.safeParse({
      ...basePayload,
      calls_start_time: 'not-a-time',
    });

    expect(result.success).toBe(false);
  });

  it('enforces feeder as N plus four digits', () => {
    const result = entergyPayloadSchema.safeParse({
      ...basePayload,
      feeder: 'A1234',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Feeder must start with "N" and 4 digits (for example: N1234).');
    }
  });

  it('normalizes feeder/local office/substation to uppercase', () => {
    const result = entergyPayloadSchema.parse({
      ...basePayload,
      feeder: 'n5303',
      local_office: 'west monroe',
      substation: 'cadeville la',
    });

    expect(result.feeder).toBe('N5303');
    expect(result.local_office).toBe('WEST MONROE');
    expect(result.substation).toBe('CADEVILLE LA');
  });

  it('allows blank optional strings by normalizing them to undefined', () => {
    const result = entergyPayloadSchema.parse({
      ...basePayload,
      feeder: '',
      local_office: '   ',
      substation: '',
      calls_start_time: '',
      ert: '',
    });

    expect(result.feeder).toBeUndefined();
    expect(result.local_office).toBeUndefined();
    expect(result.substation).toBeUndefined();
    expect(result.calls_start_time).toBeUndefined();
    expect(result.ert).toBeUndefined();
  });
});
