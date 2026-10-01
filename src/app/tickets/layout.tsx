'use client';

import { ReactNode } from 'react';
import { AppShell } from '@/components/common/layout/AppShell';
import { useAuth } from '@/components/providers/AuthProvider';
import { isAdminClassRole } from '@/lib/auth/roleGuards';

export default function TicketsLayout({ children }: { children: ReactNode }) {
    const { profile } = useAuth();

    // Dynamically determine user role for the shell
    const userRole: 'admin' | 'contractor' =
        isAdminClassRole(profile?.role) || profile?.role === 'TEAM_LEAD'
            ? 'admin'
            : 'contractor';

    return (
        <AppShell userRole={userRole}>
            {children}
        </AppShell>
    );
}
