import { ReactNode } from 'react';
import { AppShell } from '@/components/common/layout/AppShell';

export default function ContractorLayout({ children }: { children: ReactNode }) {
    return (
        <AppShell userRole="contractor">
            {children}
        </AppShell>
    );
}
