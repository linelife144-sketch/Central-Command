// Login Page

import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/components/features/auth/LoginForm';
import { BrandMark } from '@/components/common/brand/BrandMark';

export const metadata: Metadata = {
  title: 'Sign In - Central Command',
  description: 'Sign in to your Central Command account',
};

export default function LoginPage() {
  return (
    <Card className="w-full">
      <CardHeader className="space-y-2">
        <div className="mb-5 lg:hidden">
          <BrandMark portalLabel="Secure Access" variant="full" />
        </div>
        <CardTitle className="cc-auth-title">Welcome back.</CardTitle>
        <CardDescription>
          Sign in to your Central Command account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LoginForm />
        
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
          <Link 
            href="/forgot-password" 
            className="font-semibold text-grid-navy underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
          <Link 
            href="/magic-link" 
            className="font-semibold text-grid-navy underline-offset-4 hover:underline"
          >
            Use magic link
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
