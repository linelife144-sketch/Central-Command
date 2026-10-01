
'use client';

import { TicketList } from '@/components/features/tickets/TicketList';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { useAuth } from '@/components/providers/AuthProvider';
import { useContractorId } from '@/hooks/useContractorId';
import { isAdminClassRole } from '@/lib/auth/roleGuards';

export default function TicketsPage() {
    const { profile: user } = useAuth();

    const { contractorId, isLoading: resolvingContractor } = useContractorId(user?.role === 'CONTRACTOR' ? user.id : undefined);

    // Map UserRole to TicketList role format
    const userRole: 'admin' | 'contractor' =
        isAdminClassRole(user?.role) || user?.role === 'TEAM_LEAD'
            ? 'admin'
            : 'contractor';

    return (
        <div className="space-y-6">
            <PageHeader
                title={userRole === 'admin' ? 'Ticket Management' : 'My Tickets'}
                description={userRole === 'admin' ? 'View and manage all service tickets.' : 'View and manage your assigned damage assessment tickets.'}
            />
            {userRole === 'contractor' && resolvingContractor ? <p>Loading contractor account…</p> : user && (userRole === 'admin' || contractorId) ? (
                <TicketList userRole={userRole} userId={userRole === 'contractor' ? contractorId : undefined} />
            ) : (
                <div>Please log in to view tickets.</div>
            )}
        </div>
    );
}
