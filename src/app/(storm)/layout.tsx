import type { ReactNode } from 'react';
import { AppShell } from '@/components/common/layout/AppShell';
export default function StormLayout({ children }: { children: ReactNode }) {
  return <AppShell userRole="admin">{children}</AppShell>;
}
