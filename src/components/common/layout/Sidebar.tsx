'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  CloudLightning,
  Ticket,
  Users,
  Clock,
  Receipt,
  FileText,
  Settings,
  Map,
  Menu,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  userRole: 'admin' | 'contractor';
}

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/storms/create', label: 'Storm Events', icon: CloudLightning },
  { href: '/tickets', label: 'Tickets', icon: Ticket },
  { href: '/admin/contractors', label: 'Contractors', icon: Users },
  { href: '/admin/time-review', label: 'Time Review', icon: Clock },
  { href: '/admin/expense-review', label: 'Expenses', icon: Receipt },
  { href: '/admin/assessment-review', label: 'Assessments', icon: FileText },
  { href: '/admin/invoice-generation', label: 'Invoices', icon: FileText },
  { href: '/admin/reports', label: 'Reports', icon: FileText },
  { href: '/admin/map', label: 'Map View', icon: Map },
  { href: '/admin/account', label: 'Account', icon: Settings },
];

const contractorNavItems = [
  { href: '/tickets', label: 'My Tickets', icon: Ticket },
  { href: '/contractor/map', label: 'Map', icon: Map },
  { href: '/contractor/time', label: 'Time Tracking', icon: Clock },
  { href: '/contractor/expenses', label: 'Expenses', icon: Receipt },
  { href: '/contractor/assessments/create', label: 'Assessments', icon: FileText },
  { href: '/contractor/invoices', label: 'Invoices', icon: FileText },
  { href: '/contractor/account', label: 'Account', icon: Users },
];

export function Sidebar({ isOpen, onClose, userRole }: SidebarProps) {
  const pathname = usePathname();
  const navItems = userRole === 'admin' ? adminNavItems : contractorNavItems;

  const renderNavContent = () => (
    <div className="flex flex-col h-full bg-surface-raised">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-border-strong">
        <Image
          alt="Grid Electric storm mark"
          className="w-8 h-8 object-contain rounded-lg mr-3"
          height={32}
          priority
          src="/icons/grid-ge-storm-icon-clean.svg"
          width={32}
        />
        <div>
          <span className="font-bold text-grid-navy">Grid Electric</span>
          <span className="text-xs text-muted-foreground block">{userRole === 'admin' ? 'Admin Portal' : 'Contractor Portal'}</span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-[background-color,color,box-shadow,transform] duration-200 ease-standard',
                  isActive
                    ? 'bg-grid-blue-soft text-grid-brand-ink shadow-elevation-xs border border-accent-hairline'
                    : 'text-muted-foreground border border-transparent hover:bg-accent hover:text-foreground hover:shadow-elevation-xs hover:-translate-y-px'
                )}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-grid-blue"
                  />
                )}
                <Icon className={cn('w-5 h-5 shrink-0 transition-transform duration-200 ease-emphasized group-hover:scale-110', isActive && 'text-grid-blue')} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border-strong">
        <div className="text-xs text-muted-foreground text-center">
          Central Command v1.0
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SheetDescription className="sr-only">
            {userRole === 'admin' ? 'Admin' : 'Contractor'} portal navigation
          </SheetDescription>
          {renderNavContent()}
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 fixed left-0 top-16 bottom-0 border-r border-border-strong z-10 shadow-elevation-sm">
        {renderNavContent()}
      </aside>

      {/* Spacer for desktop */}
      <div className="hidden lg:block w-64 flex-shrink-0" />
    </>
  );
}

export function SidebarTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="lg:hidden"
    >
      <Menu className="w-5 h-5" />
    </Button>
  );
}
