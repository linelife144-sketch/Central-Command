'use client';

import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { useAuth } from '@/components/providers/AuthProvider';
import { isSuperAdminTestingEnabled } from '@/lib/testing/superAdminTesting';

interface AppShellProps {
  children: ReactNode;
  userRole?: 'admin' | 'contractor';
}

export function AppShell({ children, userRole = 'admin' }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, signOut } = useAuth();

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
        />

        {/* Main Content */}
        <main id="main-content" tabIndex={-1} className="cc-main min-w-0 flex-1 outline-none">
          <div className="cc-content mx-auto max-w-[1440px]">
            {isSuperAdminTestingEnabled() && (
              <div role="status" className="mb-4 rounded-lg border border-grid-warning bg-grid-warning-soft px-4 py-3 text-sm text-grid-navy">
                <strong>Super Admin test session.</strong> Tickets and storm events save in this browser.
              </div>
            )}
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Navigation - Mobile */}
      <BottomNav userRole={userRole} onMenuClick={() => setSidebarOpen(true)} />
    </div>
  );
}
