'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Ticket,
  Users,
  Clock,
  Receipt,
  Map,
} from 'lucide-react';

interface BottomNavProps {
  userRole: 'admin' | 'subcontractor';
}

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tickets', label: 'Tickets', icon: Ticket },
  { href: '/admin/contractors', label: 'Crews', icon: Users },
  { href: '/admin/map', label: 'Map', icon: Map },
];

const subcontractorNavItems = [
  { href: '/tickets', label: 'Tickets', icon: Ticket },
  { href: '/contractor/map', label: 'Map', icon: Map },
  { href: '/contractor/time', label: 'Time', icon: Clock },
];

export function BottomNav({ userRole }: BottomNavProps) {
  const pathname = usePathname();
  const navItems = userRole === 'admin' ? adminNavItems : subcontractorNavItems;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t z-40 safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1',
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
