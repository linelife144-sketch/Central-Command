// Magic Link Page

import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MagicLinkForm } from '@/components/features/auth/MagicLinkForm';
import { BrandMark } from '@/components/common/brand/BrandMark';

export const metadata: Metadata = {
  title: 'Magic Link - Central Command',
  description: 'Sign in with a magic link sent to your email',
};

export default function MagicLinkPage() {
  return (
    <Card className="w-full">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <BrandMark portalLabel="Secure Access" variant="full" />
        </div>
        <CardTitle className="text-2xl font-bold">Sign in with magic link</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a magic link to sign in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <MagicLinkForm />
        
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
