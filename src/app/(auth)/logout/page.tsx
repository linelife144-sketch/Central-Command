// Logout Page — force-ends the current Supabase session and returns to /login.

import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoutHandler } from '@/components/features/auth/LogoutHandler';
import { BrandMark } from '@/components/common/brand/BrandMark';

export const metadata: Metadata = {
  title: 'Signing Out - Central Command',
  description: 'Ending your Central Command session',
};

export default function LogoutPage() {
  return (
    <Card className="w-full">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <BrandMark portalLabel="Secure Access" variant="full" />
        </div>
        <CardTitle className="text-2xl font-bold">Signing out</CardTitle>
        <CardDescription>
          Ending your session securely
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LogoutHandler />
      </CardContent>
    </Card>
  );
}
