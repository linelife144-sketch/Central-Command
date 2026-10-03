import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ roster: vi.fn(), assign: vi.fn(), updateStatus: vi.fn() }));
vi.mock('@/components/providers/AuthProvider',()=>({useAuth:()=>({can:()=>true})}));
vi.mock('@/lib/services/stormRosterService', () => ({ stormRosterService: { listAssignable: mocks.roster } }));
vi.mock('@/lib/services/ticketService', () => ({ ticketService: { assignTicket: mocks.assign, updateTicketStatus: mocks.updateStatus } }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, disabled, children }: any) => <select aria-label="Assign To" value={value} disabled={disabled} onChange={e => onValueChange(e.target.value)}>{children}</select>,
  SelectTrigger: ({ children }: any) => children,
  SelectValue: ({ placeholder }: any) => <option value="">{placeholder}</option>,
  SelectContent: ({ children }: any) => children,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));
import { TicketAssign } from './TicketAssign';
import { StatusUpdater } from './StatusUpdater';
import type { Ticket } from '@/types';
beforeEach(() => { vi.clearAllMocks(); mocks.roster.mockResolvedValue([{ contractorId: 'crew-1', displayName: 'Storm Crew' }]); });
afterEach(cleanup);
describe('ticket assignment picker', () => {
  it('opens from Assign and waits for contractor selection before updating', async () => {
    const changed = vi.fn();
    mocks.assign.mockResolvedValue({ status: 'ASSIGNED' });
    render(<StatusUpdater ticket={{ id: 'ticket', ticket_number: '123', status: 'DRAFT', storm_event_id: 'storm' } as Ticket} userRole="SUPER_ADMIN" userId="admin" onStatusUpdated={changed} />);
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));
    await screen.findByRole('option', { name: 'Storm Crew' });
    expect(mocks.roster).toHaveBeenCalledWith('storm');
    expect(mocks.updateStatus).not.toHaveBeenCalled();
    expect(mocks.assign).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'crew-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign Ticket' }));
    await waitFor(() => expect(changed).toHaveBeenCalledWith('ASSIGNED'));
    expect(mocks.assign).toHaveBeenCalledWith('ticket', 'crew-1');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
  it('disables saving and links to the storm when its roster is empty', async () => {
    mocks.roster.mockResolvedValue([]);
    render(<TicketAssign isOpen onClose={vi.fn()} onAssign={vi.fn()} stormEventId="storm" ticketNumber="123" />);
    expect((await screen.findByRole('link', { name: 'Manage storm contractors' })).getAttribute('href')).toBe('/admin/storms/storm#storm-contractors');
    expect((screen.getByRole('button', { name: 'Assign Ticket' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('shows a failed save and keeps the picker open', async () => {
    const close = vi.fn();
    render(<TicketAssign isOpen onClose={close} onAssign={async () => { throw new Error('Roster changed. Please try again.'); }} stormEventId="storm" ticketNumber="123" />);
    await screen.findByRole('option', { name: 'Storm Crew' });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'crew-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign Ticket' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Roster changed');
    expect(close).not.toHaveBeenCalled();
  });
  it('cancel does not assign or change ticket status', async () => {
    const close = vi.fn();
    render(<TicketAssign isOpen onClose={close} onAssign={mocks.assign} stormEventId="storm" ticketNumber="123" />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(close).toHaveBeenCalledOnce();
    expect(mocks.assign).not.toHaveBeenCalled();
  });
});
