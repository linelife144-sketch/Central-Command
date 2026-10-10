import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ count: null as number | null }));
vi.mock('@/lib/supabase/client', () => ({ supabase: {} }));
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'person' }), useRouter: () => ({ back: vi.fn() }) }));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => ({ profile: { id: 'reader', role: 'STORM_MANAGER' }, can: () => false }) }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ isPending: false, error: null, refetch: vi.fn(), data: { id: 'person', fullName: 'Planned Worker', businessName: 'Company', profileId: null, isActive: true, recentTickets: [], assignedTicketCount: mocks.count, totalTicketCount: mocks.count, createdAt: '2026-10-09' } }) }));
vi.mock('@/components/features/payroll', () => ({ ContractorPayrollEditor: () => null }));
import ContractorDetailPage from './page';
afterEach(cleanup);
it('shows hidden ticket history as unavailable rather than no assigned work', () => {
  mocks.count = null;
  render(<ContractorDetailPage />);
  expect(screen.queryByText('No assigned tickets.')).toBeNull();
  expect(screen.getByText(/Ticket history is unavailable/i)).toBeTruthy();
});
it('retains a genuine empty history when ticket access is verified', () => {
  mocks.count = 0;
  render(<ContractorDetailPage />);
  expect(screen.getByText('No assigned tickets.')).toBeTruthy();
});
