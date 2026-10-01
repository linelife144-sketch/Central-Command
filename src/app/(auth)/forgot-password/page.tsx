// Forgot Password Page

import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ForgotPasswordForm } from '@/components/features/auth/ForgotPasswordForm';
import { BrandMark } from '@/components/common/brand/BrandMark';

export const metadata: Metadata = {
  title: 'Forgot Password - Central Command',
  description: 'Reset your Central Command account password',
};

export default function ForgotPasswordPage() {
  return (
    <Card className="w-full">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <BrandMark portalLabel="Secure Access" variant="full" />
        </div>
        <CardTitle className="text-2xl font-bold">Forgot password?</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a reset link
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ForgotPasswordForm />
        
        <div className="text-center text-sm">
          <Link 
            href="/login" 
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
