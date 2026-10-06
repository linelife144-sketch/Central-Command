import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ roster: vi.fn() }));
vi.mock('@/components/providers/AuthProvider',()=>({useAuth:()=>({can:()=>true})}));
vi.mock('@/lib/services/stormRosterService', () => ({ stormRosterService: { listOptions: mocks.roster } }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, disabled, children }: { value: string; onValueChange: (value: string) => void; disabled?: boolean; children: React.ReactNode }) => <select aria-label="Assign To" value={value} disabled={disabled} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => onValueChange(event.target.value)}>{children}</select>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => children,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <option value="">{placeholder}</option>,
  SelectContent: ({ children }: { children: React.ReactNode }) => children,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{children}</option>,
}));
import { TicketAssign } from './TicketAssign';
beforeEach(() => { vi.clearAllMocks(); mocks.roster.mockResolvedValue([{ id: 'crew-1', displayName: 'Storm Crew' }]); });
afterEach(cleanup);
describe('ticket assignment picker', () => {
  it('loads contractor choices before allowing an assignment', async () => {
    const close = vi.fn();
    const changed = vi.fn();
    render(<TicketAssign isOpen onClose={close} onAssign={changed} stormEventId="storm" ticketNumber="123" />);
    await screen.findByRole('option', { name: 'Storm Crew' });
    expect(mocks.roster).toHaveBeenCalledWith();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'crew-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign Ticket' }));
    await waitFor(() => expect(changed).toHaveBeenCalledWith('crew-1'));
    expect(close).toHaveBeenCalledOnce();
  });
  it('shows an unavailable message and disables saving when no contractors are active', async () => {
    mocks.roster.mockResolvedValue([]);
    render(<TicketAssign isOpen onClose={vi.fn()} onAssign={vi.fn()} stormEventId="storm" ticketNumber="123" />);
    expect(await screen.findByText('No active contractors are available.')).toBeTruthy();
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
    render(<TicketAssign isOpen onClose={close} onAssign={vi.fn()} stormEventId="storm" ticketNumber="123" />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(close).toHaveBeenCalledOnce();
  });
});
