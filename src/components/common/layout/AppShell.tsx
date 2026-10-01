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
    <div className="min-h-screen bg-grid-shell">
      {/* Top Bar - Desktop */}
      <TopBar
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        userName={profile ? `${profile.first_name} ${profile.last_name}` : 'User'}
        userRole={profile?.role || 'USER'}
        onSignOut={signOut}
      />

      <div className="flex pt-16">
        {/* Sidebar - Desktop */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          userRole={userRole}
        />

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-4rem)] pb-20 lg:pb-8 px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto animate-lift-in">
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
      <BottomNav userRole={userRole} />
    </div>
  );
}
