'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Ticket,
  Users,
  Clock,
  Map,
} from 'lucide-react';

interface BottomNavProps {
  userRole: 'admin' | 'contractor';
}

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tickets', label: 'Tickets', icon: Ticket },
  { href: '/admin/contractors', label: 'Crews', icon: Users },
  { href: '/admin/map', label: 'Map', icon: Map },
];

const contractorNavItems = [
  { href: '/tickets', label: 'Tickets', icon: Ticket },
  { href: '/contractor/map', label: 'Map', icon: Map },
  { href: '/contractor/time', label: 'Time', icon: Clock },
];

export function BottomNav({ userRole }: BottomNavProps) {
  const pathname = usePathname();
  const navItems = userRole === 'admin' ? adminNavItems : contractorNavItems;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border-strong bg-background/90 shadow-elevation-lg backdrop-blur-md safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors duration-200 ease-standard',
                isActive
                  ? 'text-grid-brand-ink'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 h-0.5 w-8 rounded-b-full bg-grid-blue"
                />
              )}
              <span
                className={cn(
                  'flex h-7 w-12 items-center justify-center rounded-full transition-[background-color,transform] duration-200 ease-emphasized',
                  isActive ? 'bg-grid-blue-soft shadow-elevation-xs' : 'hover:bg-accent'
                )}
              >
                <Icon className={cn('w-5 h-5', isActive && 'text-grid-blue')} />
              </span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
