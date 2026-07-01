import { ReactNode } from 'react';
import { AppShell } from '@/components/common/layout/AppShell';

export default function SubcontractorLayout({ children }: { children: ReactNode }) {
    return (
        <AppShell userRole="subcontractor">
            {children}
        </AppShell>
    );
}
