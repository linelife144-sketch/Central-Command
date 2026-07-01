'use client';

import { ReactNode } from 'react';
import { AppShell } from '@/components/common/layout/AppShell';
import { useAuth } from '@/components/providers/AuthProvider';

export default function TicketsLayout({ children }: { children: ReactNode }) {
    const { profile } = useAuth();

    // Dynamically determine user role for the shell
    const userRole: 'admin' | 'subcontractor' =
        profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN' || profile?.role === 'TEAM_LEAD'
            ? 'admin'
            : 'subcontractor';

    return (
        <AppShell userRole={userRole}>
            {children}
        </AppShell>
    );
}
