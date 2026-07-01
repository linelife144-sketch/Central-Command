import Link from 'next/link';
import { ShieldX } from 'lucide-react';

import { BrandMark } from '@/components/common/brand/BrandMark';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForbiddenPage() {
  return (
    <div className="safe-area-pr safe-area-pl relative min-h-screen bg-grid-shell p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-grid-storm-100 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-72 w-72 rounded-full bg-red-100/40 blur-3xl" />
      </div>
      <div className="relative flex min-h-[calc(100vh-2rem)] items-center justify-center">
        <Card className="storm-surface w-full max-w-lg shadow-card">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <BrandMark portalLabel="Secure Access" variant="full" />
          </div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            <ShieldX className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl text-grid-navy">Access Forbidden</CardTitle>
          <CardDescription>
            You do not have permission to view this portal area.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Button asChild className="flex-1">
            <Link href="/tickets">Go to Tickets</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href="/login">Return to Login</Link>
          </Button>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
