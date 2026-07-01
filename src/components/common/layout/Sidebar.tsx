'use client';

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
  userRole: 'admin' | 'subcontractor';
}

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/storms/create', label: 'Storm Events', icon: CloudLightning },
  { href: '/tickets', label: 'Tickets', icon: Ticket },
  { href: '/admin/contractors', label: 'Users', icon: Users },
  { href: '/admin/time-review', label: 'Time Review', icon: Clock },
  { href: '/admin/expense-review', label: 'Expenses', icon: Receipt },
  { href: '/admin/assessment-review', label: 'Assessments', icon: FileText },
  { href: '/admin/invoice-generation', label: 'Invoices', icon: FileText },
  { href: '/admin/reports', label: 'Reports', icon: FileText },
  { href: '/admin/map', label: 'Map View', icon: Map },
  { href: '/admin/account', label: 'Account', icon: Settings },
];

const subcontractorNavItems = [
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
  const navItems = userRole === 'admin' ? adminNavItems : subcontractorNavItems;

  const renderNavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
          <span className="text-white font-bold text-lg">G</span>
        </div>
        <div>
          <span className="font-bold text-slate-900 dark:text-white">Grid Electric</span>
          <span className="text-xs text-slate-500 block">{userRole === 'admin' ? 'Admin Portal' : 'Contractor Portal'}</span>
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
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="text-xs text-slate-500 text-center">
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
      <aside className="hidden lg:block w-64 fixed left-0 top-16 bottom-0 bg-white dark:bg-slate-800 border-r z-10">
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
