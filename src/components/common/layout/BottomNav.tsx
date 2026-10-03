'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, LayoutDashboard, Map, Menu, Ticket, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mayOpenPath, type PermissionMap } from '@/lib/auth/permissionCatalog';

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/tickets', label: 'Tickets', icon: Ticket },
  { href: '/admin/contractors', label: 'Crews', icon: Users },
  { href: '/admin/map', label: 'Map', icon: Map },
];
const contractorNavItems = [
  { href: '/tickets', label: 'Tickets', icon: Ticket },
  { href: '/contractor/map', label: 'Map', icon: Map },
  { href: '/contractor/time', label: 'Time', icon: Clock },
];

export function BottomNav({ userRole, onMenuClick, permissions = {} }: { userRole: 'admin' | 'contractor'; onMenuClick: () => void; permissions?: PermissionMap }) {
  const pathname = usePathname();
  const items = userRole === 'admin' ? adminNavItems.filter(item => mayOpenPath(item.href, permissions)) : contractorNavItems;
  return <nav aria-label="Mobile navigation" className="cc-bottom-nav lg:hidden">
    <div className="flex h-16 items-center">
      {items.map(item => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={cn('cc-bottom-link', active && 'is-active')}>
          <span className="cc-bottom-icon"><item.icon className="size-5" /></span><span>{item.label}</span>
        </Link>;
      })}
      <button type="button" onClick={onMenuClick} className="cc-bottom-link" aria-label="Open more navigation"><span className="cc-bottom-icon"><Menu className="size-5" /></span><span>More</span></button>
    </div>
  </nav>;
}
