import { Metadata } from 'next';

import { BrandMark } from '@/components/common/brand/BrandMark';
import { SetPasswordForm } from '@/components/features/auth/SetPasswordForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Set Password - Grid Electric Services',
  description: 'Set your permanent account password',
};

export default function SetPasswordPage() {
  return (
    <Card className="storm-surface w-full shadow-card">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <BrandMark portalLabel="Secure Access" variant="full" />
        </div>
        <CardTitle className="text-2xl font-bold text-grid-navy">Set your password</CardTitle>
        <CardDescription>
          You need to set a permanent password before accessing the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SetPasswordForm />
      </CardContent>
    </Card>
  );
}
