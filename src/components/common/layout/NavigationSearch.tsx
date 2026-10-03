'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { adminNavItems, contractorNavItems } from './Sidebar';
import { useAuth } from '@/components/providers/AuthProvider';
import { mayOpenPath } from '@/lib/auth/permissionCatalog';

export function NavigationSearch({ portal }: { portal: 'admin' | 'contractor' }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { permissions } = useAuth();
  const items = portal === 'admin' ? adminNavItems.filter(item => mayOpenPath(item.href, permissions)) : contractorNavItems;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen(previous => !previous);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return <>
    <Button variant="ghost" onClick={() => setOpen(true)} className="cc-search-trigger" aria-label="Search navigation">
      <Search className="size-4" />
      <span className="hidden xl:inline">Go to a page…</span>
      <kbd className="hidden xl:inline">⌘ / Ctrl K</kbd>
    </Button>
    <CommandDialog open={open} onOpenChange={setOpen} title="Go to a page" description="Search Central Command navigation">
      <CommandInput placeholder="Where do you want to go?" />
      <CommandList>
        <CommandEmpty>No matching pages.</CommandEmpty>
        <CommandGroup heading={portal === 'admin' ? 'Operations workspace' : 'Field workspace'}>
          {items.map(item => <CommandItem key={item.href} value={item.label} onSelect={() => { setOpen(false); router.push(item.href); }}>
            <item.icon className="mr-2 size-4 text-grid-navy" />{item.label}
          </CommandItem>)}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  </>;
}
