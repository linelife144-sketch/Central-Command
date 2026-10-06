'use client';

import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { useAuth } from '@/components/providers/AuthProvider';
import { isSuperAdminTestingEnabled } from '@/lib/testing/superAdminTesting';
import { usePathname } from 'next/navigation';
import { mayOpenPath } from '@/lib/auth/permissionCatalog';

interface AppShellProps {
  children: ReactNode;
  userRole?: 'admin' | 'contractor';
}

export function AppShell({ children, userRole = 'admin' }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, signOut, permissions, isLoading } = useAuth();
  const pathname = usePathname();
  const allowed = userRole === 'contractor' || mayOpenPath(pathname, permissions, profile?.role);

  return (
    <div className="cc-shell min-h-screen bg-grid-shell">
      <a href="#main-content" className="cc-skip-link">Skip to content</a>
      {/* Top Bar - Desktop */}
      <TopBar
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        userName={profile ? `${profile.first_name} ${profile.last_name}` : 'User'}
        userRole={profile?.role || 'USER'}
        onSignOut={signOut}
        portal={userRole}
      />

      <div className="cc-shell-body flex">
        {/* Sidebar - Desktop */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          userRole={userRole}
          permissions={permissions}
        />

        {/* Main Content */}
        <main id="main-content" tabIndex={-1} className="cc-main min-w-0 flex-1 outline-none">
          <div className="cc-content mx-auto max-w-[1440px]">
            {isSuperAdminTestingEnabled() && (
              <div role="status" className="mb-4 rounded-lg border border-grid-warning bg-grid-warning-soft px-4 py-3 text-sm text-grid-navy">
                <strong>Super Admin test session.</strong> Tickets and storm events save in this browser.
              </div>
            )}
            {isLoading ? <p role="status" className="p-6 text-grid-body">Loading your workspace…</p> : allowed ? children : <div role="alert" className="cc-work-panel p-6 text-grid-navy">You do not have access to this module. Choose an available page from navigation.</div>}
          </div>
        </main>
      </div>

      {/* Bottom Navigation - Mobile */}
      <BottomNav userRole={userRole} permissions={permissions} onMenuClick={() => setSidebarOpen(true)} />
    </div>
  );
}
