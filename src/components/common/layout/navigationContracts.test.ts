import { describe, expect, it } from 'vitest';

import { ADMIN_SIDEBAR_NAV_ITEMS, CONTRACTOR_BOTTOM_NAV_ITEMS, CONTRACTOR_SIDEBAR_NAV_ITEMS } from './navigationConfig';

describe('navigation contracts', () => {
  it('includes contractor Home with field-tool links', () => {
    expect(CONTRACTOR_BOTTOM_NAV_ITEMS.map((item) => ({ href: item.href, label: item.label }))).toEqual([
      { href: '/contractor/dashboard', label: 'Home' },
      { href: '/tickets', label: 'Tickets' },
      { href: '/contractor/map', label: 'Map' },
      { href: '/contractor/time', label: 'Time' },
    ]);
  });

  it('includes required admin sidebar primary items', () => {
    expect(ADMIN_SIDEBAR_NAV_ITEMS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: '/admin/dashboard', label: 'Dashboard' }),
        expect.objectContaining({ href: '/admin/contractors', label: 'Contractors' }),
        expect.objectContaining({ href: '/admin/storms', label: 'Storm Events' }),
        expect.objectContaining({ href: '/admin/payroll', label: 'Payroll' }),
      ])
    );
    expect(ADMIN_SIDEBAR_NAV_ITEMS.some((item) => item.href.includes('assessment'))).toBe(false);
  });

  it('keeps contractor assessments inside tickets instead of a sidebar destination', () => {
    expect(CONTRACTOR_SIDEBAR_NAV_ITEMS.some((item) => item.href.includes('assessment'))).toBe(false);
  });

  it('supports badge metadata for reactive navigation signals', () => {
    expect(
      ADMIN_SIDEBAR_NAV_ITEMS.filter((item) => item.signalKey).map((item) => ({
        href: item.href,
        signalKey: item.signalKey,
      }))
    ).toEqual(
      expect.arrayContaining([
        { href: '/admin/dashboard', signalKey: 'reviews' },
        { href: '/tickets', signalKey: 'tickets' },
        { href: '/admin/storms', signalKey: 'storms' },
      ])
    );
  });
});
