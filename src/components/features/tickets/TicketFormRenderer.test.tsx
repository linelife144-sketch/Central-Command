import { SUPER_ADMIN_TEST_PROFILE } from '@/lib/testing/superAdminTesting';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { TicketFormRenderer } from './TicketFormRenderer';
import { getTicketTemplateByUtilityClient } from '@/lib/tickets/templates';
import { stormEventService } from '@/lib/services/stormEventService';
import { ticketIntakeService } from '@/lib/services/ticketIntakeService';
import { localTestStore } from '@/lib/testing/localTestStore';
import { CONTRACTOR_ROLES } from '@/lib/compensation/stormRates';

const TEST_ROLE_RATES = Object.fromEntries(CONTRACTOR_ROLES.map((role) => [role, { payRate: 25, billRate: 50 }])) as never;

const remote = vi.hoisted(() => ({ from: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ supabase: { from: remote.from, rpc: remote.rpc, auth: { getUser: remote.getUser } } }));

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('NEXT_PUBLIC_ENABLE_SUPER_ADMIN_TESTING', 'true');
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  window.localStorage.clear(); vi.clearAllMocks();
  remote.from.mockImplementation(() => { throw new Error('Unexpected remote data access'); });
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('storm utility ticket workflow', () => {
  it('submits the Entergy form with blank optional counts and common defaults', async () => {
    const submit = vi.fn<(values: Record<string, unknown>) => Promise<void>>(async () => {});
    render(createElement(TicketFormRenderer, {
      storm: { id: 'test-storm', name: 'Test Storm', eventCode: 'EVENT-001', utilityClient: 'ENTERGY', state: 'Louisiana' },
      template: getTicketTemplateByUtilityClient('ENTERGY'), onSubmitTicket: submit, onRunOcr: () => {},
    }));
    expect(screen.getByText('Transformers Down')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Incident Number/), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByLabelText(/^Address/), { target: { value: '100 Test Street' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(submit.mock.calls[0]?.[0]).toMatchObject({ incident_number: '1234567890', is_important: false, status: 'DRAFT' });
  });

  it('keeps typed fields when equivalent template props are recreated', () => {
    const template = getTicketTemplateByUtilityClient('ENTERGY');
    const props = { storm: { id: 's', name: 'QA', eventCode: 'QA', utilityClient: 'ENTERGY', state: 'Louisiana' }, template, onSubmitTicket: vi.fn(async () => {}), onRunOcr: () => {} };
    const view = render(createElement(TicketFormRenderer, props));
    fireEvent.change(screen.getByLabelText(/Incident Number/), { target: { value: '2026100101' } });
    fireEvent.change(screen.getByLabelText(/^Address/), { target: { value: '100 QA Test Lane' } });
    view.rerender(createElement(TicketFormRenderer, { ...props, template: { ...template } }));
    expect((screen.getByLabelText(/Incident Number/) as HTMLInputElement).value).toBe('2026100101');
    expect((screen.getByLabelText(/^Address/) as HTMLInputElement).value).toBe('100 QA Test Lane');
  });

  it('saves utility payloads locally and rejects templates from another utility', async () => {
    const storm = await stormEventService.createStormEvent({ name: 'Entergy storm', utilityClient: 'Entergy', responsibleManagerId: SUPER_ADMIN_TEST_PROFILE.id, roleRates: TEST_ROLE_RATES });
    const common = { status: 'DRAFT', is_important: true, source_type: 'MANUAL' } as const;
    const payload = { incident_number: '1234567890', incident_type: 'XFMR', address_line: '100 Test Street' };
    const created = await ticketIntakeService.createUtilityTicket({ stormEventId: storm.id, stormUtilityClient: 'Entergy', template: getTicketTemplateByUtilityClient('ENTERGY'), common, payload });
    expect(localTestStore.getPayload(created.id)).toMatchObject(payload);
    await expect(ticketIntakeService.createUtilityTicket({ stormEventId: storm.id, stormUtilityClient: 'FPL', template: getTicketTemplateByUtilityClient('FPL'), common, payload: {} })).rejects.toThrow('parent storm');
    expect(remote.from).not.toHaveBeenCalled(); expect(remote.getUser).not.toHaveBeenCalled(); expect(remote.rpc).not.toHaveBeenCalled();
  });

  it('preserves the existing free-text device field', () => {
    const entergy = getTicketTemplateByUtilityClient('ENTERGY');
    expect(entergy.schema.safeParse({ incident_number:'1234567890',incident_type:'XFMR',address_line:'Test',device_type:'Test device' }).success).toBe(true);
    expect(entergy.fieldConfig.find(field => field.fieldKey === 'device_type')?.controlType).toBe('text');
    expect(getTicketTemplateByUtilityClient('FPL').fieldConfig.some(field => field.fieldKey === 'equipment_type')).toBe(false);
  });
});
