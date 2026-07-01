import { describe, expect, it } from 'vitest';

import { buildEntergySpecialInstructions, buildEntergyWorkDescription } from './entergyTicketFormat';

describe('entergyTicketFormat', () => {
  it('builds exact-verbiage incident summary block', () => {
    const text = buildEntergyWorkDescription({
      incidentNumber: '2030168317',
      incidentType: 'LGTS',
      sourceAddress: 'HIGHWAY 144 4555',
      city: 'Calhoun',
      state: 'LA',
      zipCode: '71225',
      calls: 0,
      affectedCustomers: 1,
      durationHours: 13543,
      workOrderId: '9304334',
      deviceName: '9304334',
      deviceType: 'ServicePoint',
      startTime: '2026-01-24T12:16',
      ert: '2026-02-02T22:00',
      network: 'West Monroe',
      feeder: 'N5303',
      localOffice: 'WEST MONROE',
      substation: 'CADEVILLE LA',
      polesDown: 0,
      services: 0,
      transformersDown: 0,
      crossArms: 0,
      conductorSpan: 0,
      treeTrim: 0,
    });

    expect(text).toContain('Entergy Incident Summary Report');
    expect(text).toContain('Incident Number: 2030168317');
    expect(text).toContain('Incident Type: LGTS');
    expect(text).toContain('Affected Customers: 1');
    expect(text).toContain('Work Order ID: 9304334');
    expect(text).toContain('Calls: 0');
    expect(text).toContain('Duration: 13543 h');
    expect(text).toContain('Transformers Down: 0');
    expect(text).toContain('Services: 0');
  });

  it('builds exact-verbiage instruction block with N/A defaults', () => {
    const text = buildEntergySpecialInstructions({
      incidentNumber: '2030168317',
      incidentType: 'LGTS',
      sourceAddress: 'HIGHWAY 144 4555',
      city: 'Calhoun',
      state: 'LA',
      zipCode: '71225',
      calls: 0,
      affectedCustomers: 1,
      durationHours: 13543,
      workOrderId: '9304334',
      deviceName: '9304334',
      deviceType: 'ServicePoint',
      startTime: '2026-01-24T12:16',
      ert: '2026-02-02T22:00',
      network: 'West Monroe',
      feeder: 'N5303',
      localOffice: 'WEST MONROE',
      substation: 'CADEVILLE LA',
      polesDown: 0,
      services: 0,
      transformersDown: 0,
      crossArms: 0,
      conductorSpan: 0,
      treeTrim: 0,
      dispatcherComments: '',
      crewComments: 'Crew on site',
      needScout: undefined,
      firstCustomerComment: 'Customer called about down wire',
    });

    expect(text).toContain('Dispatcher Comments: N/A');
    expect(text).toContain('Crew Comments: Crew on site');
    expect(text).toContain('Need Scout: N/A');
    expect(text).toContain('First Customer Comment: Customer called about down wire');
  });
});
