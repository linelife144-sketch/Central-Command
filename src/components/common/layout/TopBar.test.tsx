import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({ usePathname: () => '/admin/storms/create' }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('./TicketNotifications', () => ({ TicketNotifications: () => null }));

import { TopBar } from './TopBar';

describe('TopBar storm name', () => {
  it('centers the current storm name for both portals', () => {
    const { rerender } = render(
      <TopBar onMenuClick={() => undefined} userName="David McCarty" userRole="SUPER_ADMIN" onSignOut={() => undefined} portal="admin" stormName="Helene" />,
    );

    const storm = screen.getByText('Helene');
    expect(storm.closest('.cc-topbar-storm')).not.toBeNull();
    expect(storm.closest('header')?.className).toContain('cc-topbar');
    expect(screen.queryByRole('button', { name: 'Search navigation' })).toBeNull();

    rerender(
      <TopBar onMenuClick={() => undefined} userName="Alex Rivera" userRole="CONTRACTOR" onSignOut={() => undefined} portal="contractor" stormName="Francine" />,
    );
    expect(screen.getByText('Francine').closest('.cc-topbar-storm')).not.toBeNull();
  });
});
