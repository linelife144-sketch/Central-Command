// Login Page

import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/components/features/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Sign In - Central Command',
  description: 'Sign in to your Central Command account',
};

export default function LoginPage() {
  return (
    <Card className="w-full">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">G</span>
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
        <CardDescription>
          Sign in to your Central Command account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LoginForm />
        
        <div className="flex items-center justify-between text-sm">
          <Link 
            href="/forgot-password" 
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Forgot password?
          </Link>
          <Link 
            href="/magic-link" 
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Use magic link
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
