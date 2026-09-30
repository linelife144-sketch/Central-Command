'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SidebarTrigger } from './Sidebar';
import { Bell, User, LogOut, Settings } from 'lucide-react';

interface TopBarProps {
  onMenuClick: () => void;
  userName: string;
  userRole: string;
  onSignOut: () => void;
}

export function TopBar({ onMenuClick, userName, userRole, onSignOut }: TopBarProps) {
  const [notifications] = useState(3);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-50 border-b border-border-strong bg-background/85 shadow-elevation-sm backdrop-blur-md transition-shadow duration-300 ease-standard hover:shadow-elevation-md">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          <SidebarTrigger onClick={onMenuClick} />

          {/* Logo - Mobile */}
          <Link href="/" className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-storm rounded-lg flex items-center justify-center shadow-brand">
              <span className="text-white font-bold text-sm">G</span>
            </div>
          </Link>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {notifications > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-grid-danger text-white text-[10px] font-semibold rounded-full flex items-center justify-center shadow-brand ring-2 ring-background">
                {notifications}
              </span>
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="w-8 h-8 ring-1 ring-border shadow-elevation-xs">
                  <AvatarFallback className="from-grid-storm-100 to-grid-storm-50 text-grid-navy text-sm font-semibold">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-foreground">{userName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{userRole.toLowerCase().replace('_', ' ')}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut} className="text-grid-danger-ink focus:bg-grid-danger-soft focus:text-grid-danger-ink">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
