import { ReactNode } from 'react';
import { AppShell } from '@/components/common/layout/AppShell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell userRole="admin">
      {children}
    </AppShell>
  );
}
