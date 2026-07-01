
'use client';

import { TicketList } from '@/components/features/tickets/TicketList';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { useAuthStore } from '@/stores/authStore';

export default function TicketsPage() {
    const { user } = useAuthStore();

    // Map UserRole to TicketList role format
    const userRole: 'admin' | 'subcontractor' =
        user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'TEAM_LEAD'
            ? 'admin'
            : 'subcontractor';

    return (
        <div className="space-y-6">
            <PageHeader
                title={userRole === 'admin' ? 'Ticket Management' : 'My Tickets'}
                description={userRole === 'admin' ? 'View and manage all service tickets.' : 'View and manage your assigned damage assessment tickets.'}
            />
            {user ? (
                <TicketList userRole={userRole} userId={userRole === 'subcontractor' ? user.id : undefined} />
            ) : (
                <div>Please log in to view tickets.</div>
            )}
        </div>
    );
}
