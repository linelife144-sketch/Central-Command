import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Ticket } from '@/types';
import { TicketList } from './TicketList';

const mocks = vi.hoisted(() => {
  const channel = { on: vi.fn(), subscribe: vi.fn() };
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockReturnValue(channel);
  return {
    getTickets: vi.fn(),
    getTicketsByAssignee: vi.fn(),
    getUtilityPayloadsByTicketIds: vi.fn(),
    setTicketDisabled: vi.fn(),
    can: vi.fn(),
    profile: { id: 'staff-1', role: 'ADMIN' },
    channel,
  };
});

vi.mock('@/lib/services/ticketService', () => ({ ticketService: {
  getTickets: mocks.getTickets,
  getTicketsByAssignee: mocks.getTicketsByAssignee,
  getUtilityPayloadsByTicketIds: mocks.getUtilityPayloadsByTicketIds,
  setTicketDisabled: mocks.setTicketDisabled,
} }));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => ({ can: mocks.can, profile: mocks.profile }) }));
vi.mock('@/lib/supabase/client', () => ({ supabase: {
  channel: vi.fn(() => mocks.channel),
  removeChannel: vi.fn(),
} }));
vi.mock('@/components/features/tickets/TicketFilters', () => ({ TicketFilters: () => null }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const activeTicket = {
  id: 'active-id', ticket_number: 'T-100', status: 'ASSIGNED', is_deleted: false,
  is_important: false, address: '100 Main St', city: 'Baton Rouge', state: 'LA', zip_code: '70801',
  geofence_radius_meters: 500, created_at: '2026-10-01T12:00:00Z', updated_at: '2026-10-01T12:00:00Z',
  utility_client: 'Entergy', created_by: 'staff-1',
} as Ticket;

const disabledTicket = {
  ...activeTicket, id: 'disabled-id', ticket_number: 'T-200', is_deleted: true,
} as Ticket;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.profile.id = 'staff-1';
  mocks.profile.role = 'ADMIN';
  mocks.can.mockImplementation((key: string) => key === 'admin.tickets.edit');
  mocks.getTickets.mockResolvedValue([activeTicket, disabledTicket]);
  mocks.getTicketsByAssignee.mockResolvedValue([activeTicket, disabledTicket]);
  mocks.getUtilityPayloadsByTicketIds.mockResolvedValue({});
  mocks.setTicketDisabled.mockImplementation(async (id: string, disabled: boolean) => ({
    ...(id === activeTicket.id ? activeTicket : disabledTicket), is_deleted: disabled,
  }));
});

describe('TicketList disable controls', () => {
  it('requires confirmation, disables the selected ticket, and exposes the disabled queue', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<TicketList userRole="admin" />);

    const disableAction = await screen.findAllByRole('button', { name: 'Disable ticket T-100' });
    fireEvent.click(disableAction[0]);

    await waitFor(() => expect(mocks.setTicketDisabled).toHaveBeenCalledWith('active-id', true));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('T-100'));

    fireEvent.click(screen.getByRole('button', { name: /disabled tickets/i }));
    expect(await screen.findAllByText('T-200')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Restore ticket T-200' })).toHaveLength(2);
  }, 15000);

  it('does not disable a ticket when the confirmation is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<TicketList userRole="admin" />);

    fireEvent.click((await screen.findAllByRole('button', { name: 'Disable ticket T-100' }))[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(mocks.setTicketDisabled).not.toHaveBeenCalled();
  });

  it('restores a disabled ticket from the disabled queue', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<TicketList userRole="admin" />);
    fireEvent.click(await screen.findByRole('button', { name: /disabled tickets/i }));
    fireEvent.click((await screen.findAllByRole('button', { name: 'Restore ticket T-200' }))[0]);

    await waitFor(() => expect(mocks.setTicketDisabled).toHaveBeenCalledWith('disabled-id', false));
  });

  it('hides disable controls from contractors and excludes disabled tickets', async () => {
    mocks.profile.role = 'CONTRACTOR';
    mocks.can.mockReturnValue(false);
    render(<TicketList userRole="contractor" userId="contractor-1" />);

    expect(await screen.findAllByText('T-100')).toHaveLength(2);
    expect(screen.queryByText('T-200')).toBeNull();
    expect(screen.queryByRole('button', { name: /disable ticket/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /disabled tickets/i })).toBeNull();
  });
});
