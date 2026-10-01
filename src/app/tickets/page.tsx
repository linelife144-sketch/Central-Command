
'use client';

import { TicketList } from '@/components/features/tickets/TicketList';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { useAuth } from '@/components/providers/AuthProvider';
import { isAdminClassRole } from '@/lib/auth/roleGuards';

export default function TicketsPage() {
    const { profile: user } = useAuth();

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
            {user ? (
                <TicketList userRole={userRole} userId={userRole === 'contractor' ? user.id : undefined} />
            ) : (
                <div>Please log in to view tickets.</div>
            )}
        </div>
    );
}
