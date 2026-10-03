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
    <Card className="w-full text-grid-navy">
      <CardHeader className="space-y-2">
        <div className="mb-5 lg:hidden">
          <BrandMark portalLabel="Secure Access" variant="full" tone="dark" />
        </div>
        <CardTitle role="heading" aria-level={2} className="cc-auth-title text-grid-navy">Set your password</CardTitle>
        <CardDescription className="text-sm leading-relaxed text-grid-body">
          You need to set a permanent password before accessing the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SetPasswordForm />
      </CardContent>
    </Card>
  );
}
