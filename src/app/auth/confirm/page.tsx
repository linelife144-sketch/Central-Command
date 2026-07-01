'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type Status = 'loading' | 'success' | 'error';

export default function AuthConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type') as 'email' | 'signup' | 'invite' | 'recovery' | null;

    if (!tokenHash || !type) {
      setErrorMessage('Invalid confirmation link. Please request a new one.');
      setStatus('error');
      return;
    }

    const confirm = async () => {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });

      if (error || !data.session) {
        setErrorMessage(
          error?.message === 'Token has expired or is invalid'
            ? 'This link has expired or already been used. Please request a new one.'
            : error?.message || 'Confirmation failed. Please try again.'
        );
        setStatus('error');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.session.user.id)
        .single();

      setStatus('success');

      const role = (profile as any)?.role;
      const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'CEO';

      setTimeout(() => {
        router.replace(isAdmin ? '/admin/dashboard' : '/contractor/time');
      }, 800);
    };

    confirm();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-6">
        {status === 'loading' && (
          <>
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                Confirming your sign-in&hellip;
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Verifying your link. You&apos;ll be redirected shortly.
              </p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                Signed in successfully
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Redirecting you now&hellip;
              </p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                Confirmation failed
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {errorMessage}
              </p>
            </div>
            <Button asChild className="w-full">
              <Link href="/magic-link">Request a new link</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
