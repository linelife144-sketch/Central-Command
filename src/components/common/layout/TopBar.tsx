'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SidebarTrigger, adminNavItems, contractorNavItems } from './Sidebar';
import { NavigationSearch } from './NavigationSearch';

interface TopBarProps {
  onMenuClick: () => void;
  userName: string;
  userRole: string;
  onSignOut: () => void;
  portal: 'admin' | 'contractor';
}

export function TopBar({ onMenuClick, userName, userRole, onSignOut, portal }: TopBarProps) {
  const pathname = usePathname();
  const items = portal === 'admin' ? adminNavItems : contractorNavItems;
  const page = items.find(item => pathname === item.href || pathname?.startsWith(`${item.href}/`));
  const accountHref = portal === 'admin' ? '/admin/account' : '/contractor/account';
  const initials = userName.split(' ').filter(Boolean).map(name => name[0]).join('').toUpperCase().slice(0, 2);

  return <header className="cc-topbar">
    <div className="flex min-w-0 items-center gap-3">
      <SidebarTrigger onClick={onMenuClick} />
      <div className="cc-breadcrumb">
        <span className="hidden sm:inline">{portal === 'admin' ? 'Operations' : 'Field workspace'}</span>
        <ChevronRight className="hidden size-3.5 text-muted-foreground/50 sm:block" />
        <strong>{page?.label || 'Central Command'}</strong>
      </div>
    </div>
    <div className="flex shrink-0 items-center gap-2 sm:gap-4">
      <NavigationSearch portal={portal} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="cc-user-trigger" aria-label={`Open account menu for ${userName}`}>
            <Avatar className="size-9"><AvatarFallback className="cc-user-avatar">{initials}</AvatarFallback></Avatar>
            <div className="hidden text-left sm:block"><p className="text-xs font-bold text-grid-navy">{userName}</p><p className="mt-0.5 text-[10px] capitalize text-muted-foreground">{userRole.toLowerCase().replaceAll('_', ' ')}</p></div>
            <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My workspace</DropdownMenuLabel><DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link href={accountHref}><Settings className="mr-2 size-4" />Account settings</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSignOut} className="text-grid-danger-ink focus:bg-grid-danger-soft focus:text-grid-danger-ink"><LogOut className="mr-2 size-4" />Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>;
}
