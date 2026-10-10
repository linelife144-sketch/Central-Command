'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/components/providers/AuthProvider';
import { PERMISSION_MODULES } from '@/lib/auth/permissionCatalog';
import { cn } from '@/lib/utils';

interface AccessLevelsSectionProps {
  className?: string;
}

const ROLE_DEFINITIONS: ReadonlyArray<{ label: string; summary: string }> = [
  { label: 'CEO', summary: 'Full access, including people and access' },
  { label: 'STORM_MANAGER', summary: 'Full access, including people and access' },
  {
    label: 'ADMIN',
    summary: 'Tickets and assessments, unless a Super Admin grants more',
  },
];

export function AccessLevelsSection({ className }: AccessLevelsSectionProps) {
  const { can } = useAuth();

  if (!can('admin.users.view')) {
    return null;
  }

  const moduleRows = PERMISSION_MODULES.filter((module) => module.id !== 'assignments');
  const groups = Array.from(new Set(moduleRows.map((module) => module.group)));

  return (
    <Card className={cn('flex h-full flex-col', className)}>
      <CardHeader className="pb-0">
        <div className="cc-eyebrow mb-1">
          <ShieldCheck className="size-3.5 text-grid-lightning" aria-hidden="true" />
          Administration
        </div>
        <CardTitle>Access levels</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3 pb-0">
        <p className="text-sm text-muted-foreground">
          Set what each role can open. Changes are per person, on their access page.
        </p>

        <div className="space-y-1.5 text-sm">
          {ROLE_DEFINITIONS.map((role) => (
            <div key={role.label} className="flex flex-wrap justify-between gap-x-2">
              <span className="font-medium text-[#0a1733]">{role.label}</span>
              <span className="text-muted-foreground">{role.summary}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Field roles do not open the admin console.
        </p>

        <div className="space-y-2 border-t pt-2">
          {moduleRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No modules are configured.</p>
          ) : (
            groups.map((group) => (
              <div key={group} className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group}
                </p>
                <ul className="space-y-1 text-sm">
                  {moduleRows
                    .filter((module) => module.group === group)
                    .map((module) => (
                      <li key={module.id} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <span className="text-[#0a1733]">{module.label}</span>
                        <span className="flex items-center gap-1">
                          <Badge variant="outline">View</Badge>
                          {module.editable && <Badge variant="outline">Edit</Badge>}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-1 pt-4">
        <Button asChild variant="ghost" size="sm" className="px-2">
          <Link href="/admin/users">
            Manage people and access
            <ShieldCheck className="size-4" />
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          Open a person to set their access levels.
        </p>
      </CardFooter>
    </Card>
  );
}
