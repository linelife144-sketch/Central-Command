'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { getLandingPathForRole } from '@/lib/auth/roleLanding';
import { recordLastLogin } from '@/lib/auth/recordLogin';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type Status = 'loading' | 'success' | 'error';

function ConfirmSkeleton() {
  return (
    <div className="min-h-screen bg-grid-shell flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-storm rounded-2xl flex items-center justify-center shadow-brand">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-grid-navy">Confirming your sign-in&hellip;</h1>
          <p className="text-sm text-grid-muted">Verifying your link. You&apos;ll be redirected shortly.</p>
        </div>
      </div>
    </div>
  );
}

function AuthConfirmInner() {
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
      void recordLastLogin(data.session.access_token);

      const landingPath = getLandingPathForRole((profile as any)?.role ?? null);
      setTimeout(() => {
        router.replace(landingPath);
      }, 800);
    };

    confirm();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-grid-shell flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-6">
        {status === 'loading' && (
          <>
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-storm rounded-2xl flex items-center justify-center shadow-brand">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-grid-navy">
                Confirming your sign-in&hellip;
              </h1>
              <p className="text-sm text-grid-muted">
                Verifying your link. You&apos;ll be redirected shortly.
              </p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-grid-success-soft border border-grid-success rounded-2xl flex items-center justify-center shadow-elevation-sm">
                <CheckCircle className="h-8 w-8 text-grid-success-ink" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-grid-navy">
                Signed in successfully
              </h1>
              <p className="text-sm text-grid-muted">
                Redirecting you now&hellip;
              </p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-grid-danger-soft border border-grid-danger rounded-2xl flex items-center justify-center shadow-elevation-sm">
                <XCircle className="h-8 w-8 text-grid-danger-ink" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-grid-navy">
                Confirmation failed
              </h1>
              <p className="text-sm text-grid-muted">
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

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={<ConfirmSkeleton />}>
      <AuthConfirmInner />
    </Suspense>
  );
}
