'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, ChartNoAxesCombined, Clock, CloudLightning, FileText, LayoutDashboard, Map, Menu, Receipt, Settings, Ticket, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { BrandMark } from '@/components/common/brand/BrandMark';
import { cn } from '@/lib/utils';
import { mayOpenPath, permissionLanding, type PermissionMap } from '@/lib/auth/permissionCatalog';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  userRole: 'admin' | 'contractor';
  permissions?: PermissionMap;
}

export const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Operations' },
  { href: '/admin/storms', label: 'Storm Events', icon: CloudLightning, group: 'Operations' },
  { href: '/tickets', label: 'Tickets', icon: Ticket, group: 'Operations' },
  { href: '/admin/contractors', label: 'Contractors', icon: Users, group: 'Operations' },
  { href: '/admin/map', label: 'Map View', icon: Map, group: 'Operations' },
  { href: '/admin/time-review', label: 'Time Review', icon: Clock, group: 'Review & reporting' },
  { href: '/admin/expense-review', label: 'Expenses', icon: Receipt, group: 'Review & reporting' },
  { href: '/admin/assessment-review', label: 'Assessments', icon: FileText, group: 'Review & reporting' },
  { href: '/admin/reports', label: 'Reports', icon: ChartNoAxesCombined, group: 'Review & reporting' },
  { href: '/admin/account', label: 'Account', icon: Settings, group: 'Workspace' },
  { href: '/admin/users', label: 'People & access', icon: Users, group: 'Workspace' },
];

export const contractorNavItems = [
  { href: '/tickets', label: 'My Tickets', icon: Ticket, group: 'Field operations' },
  { href: '/contractor/map', label: 'Map', icon: Map, group: 'Field operations' },
  { href: '/contractor/time', label: 'Time Tracking', icon: Clock, group: 'Field operations' },
  { href: '/contractor/expenses', label: 'Expenses', icon: Receipt, group: 'Field operations' },
  { href: '/contractor/assessments/create', label: 'Assessments', icon: FileText, group: 'Field operations' },
  { href: '/contractor/account', label: 'Account', icon: Settings, group: 'Workspace' },
];

export function Sidebar({ isOpen, onClose, userRole, permissions = {} }: SidebarProps) {
  const pathname = usePathname();
  const navItems = userRole === 'admin' ? adminNavItems.filter(item => mayOpenPath(item.href, permissions)) : contractorNavItems;
  const groups = [...new Set(navItems.map(item => item.group))];
  const home = userRole === 'admin' ? permissionLanding(permissions) : '/tickets';

  const content = () => (
    <div className="cc-sidebar flex h-full flex-col">
      <Link href={home} onClick={onClose} className="cc-sidebar-brand">
        <BrandMark tone="light" portalLabel={userRole === 'admin' ? 'Admin Portal' : 'Contractor Portal'} />
      </Link>
      <div className="cc-sidebar-workspace">
        <span className="cc-eyebrow">Your workspace</span>
        <p>Central Command<span className="cc-workspace-dot" aria-hidden="true" /></p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <nav aria-label="Main navigation" className="px-4 pb-5">
          {groups.map(group => (
            <div key={group} className="mb-5">
              <p className="cc-nav-label">{group}</p>
              <div className="space-y-1">
                {navItems.filter(item => item.group === group).map(item => {
                  const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return <Link key={item.href} href={item.href} onClick={onClose} aria-current={active ? 'page' : undefined} className={cn('cc-nav-link group', active && 'is-active')}>
                    <Icon className="size-[18px] shrink-0" />
                    <span>{item.label}</span>
                    {active && <span className="cc-nav-indicator" aria-hidden="true" />}
                  </Link>;
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>
      <div className="cc-sidebar-footer">
        {(userRole === 'contractor' || permissions['admin.storms.view']) && <Link href={userRole === 'admin' ? '/admin/storms' : '/tickets'} onClick={onClose} className="cc-sidebar-callout">
          <CloudLightning className="size-5 text-grid-lightning" />
          <span><strong>{userRole === 'admin' ? 'Storm operations' : 'Ready for the field'}</strong><small>{userRole === 'admin' ? 'View your response workspaces' : 'Your next assignment starts here'}</small></span>
          <ArrowUpRight className="size-4 shrink-0" />
        </Link>}
        <p>GRID ELECTRIC <span>COMMAND / 01</span></p>
      </div>
    </div>
  );

  return <>
    <Sheet open={isOpen} onOpenChange={open => { if (!open) onClose?.(); }}>
      <SheetContent side="left" className="cc-mobile-sidebar w-[min(296px,88vw)] border-white/10 p-0 [&>button]:text-white">
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <SheetDescription className="sr-only">{userRole === 'admin' ? 'Admin' : 'Contractor'} portal navigation</SheetDescription>
        {content()}
      </SheetContent>
    </Sheet>
    <aside className="cc-desktop-sidebar hidden lg:block">{content()}</aside>
    <div className="cc-sidebar-spacer hidden shrink-0 lg:block" />
  </>;
}

export function SidebarTrigger({ onClick }: { onClick: () => void }) {
  return <Button variant="ghost" size="icon" onClick={onClick} className="lg:hidden" aria-label="Open navigation menu"><Menu className="size-5" /></Button>;
}
