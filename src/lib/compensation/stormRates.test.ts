import { describe, expect, it } from 'vitest';

import { CONTRACTOR_ROLES, parseStormRoleRates } from './stormRates';

describe('parseStormRoleRates', () => {
  it('requires and returns one hourly pay and utility bill rate for every role', () => {
    const parsed = parseStormRoleRates({
      STORM_MANAGER: { payRate: '115.00', billRate: '210' },
      TEAM_LEAD: { payRate: '105', billRate: '195.50' },
      SR_DAMAGE_ASSESSER: { payRate: '95', billRate: '180' },
      DAMAGE_ASSESSER: { payRate: '85', billRate: '165' },
      DRIVER: { payRate: '65', billRate: '135' },
    });

    expect(Object.keys(parsed)).toEqual(CONTRACTOR_ROLES);
    expect(parsed.DRIVER).toEqual({ payRate: 65, billRate: 135 });
  });

  it('rejects an incomplete role card', () => {
    expect(() => parseStormRoleRates({
      STORM_MANAGER: { payRate: '115', billRate: '210' },
    })).toThrow('Enter both rates for every contractor role.');
  });

  it.each(['-1', '1.001', 'NaN'])('rejects invalid hourly rate %s', (value) => {
    expect(() => parseStormRoleRates({
      STORM_MANAGER: { payRate: value, billRate: '1' },
      TEAM_LEAD: { payRate: '1', billRate: '1' },
      SR_DAMAGE_ASSESSER: { payRate: '1', billRate: '1' },
      DAMAGE_ASSESSER: { payRate: '1', billRate: '1' },
      DRIVER: { payRate: '1', billRate: '1' },
    })).toThrow('Rates must be nonnegative amounts with no more than two decimal places.');
  });

  it('accepts a zero rate and preserves cents', () => {
    const parsed = parseStormRoleRates({
      STORM_MANAGER: { payRate: '0', billRate: '1.25' },
      TEAM_LEAD: { payRate: '1', billRate: '1' },
      SR_DAMAGE_ASSESSER: { payRate: '1', billRate: '1' },
      DAMAGE_ASSESSER: { payRate: '1', billRate: '1' },
      DRIVER: { payRate: '1', billRate: '1' },
    });

    expect(parsed.STORM_MANAGER).toEqual({ payRate: 0, billRate: 1.25 });
  });
});
