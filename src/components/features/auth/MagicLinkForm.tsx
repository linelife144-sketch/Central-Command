'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { getLandingPathForRole } from '@/lib/auth/roleLanding';
import { recordLastLogin } from '@/lib/auth/recordLogin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, ArrowLeft, Mail } from 'lucide-react';

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const otpSchema = z.object({
  token: z
    .string()
    .length(6, 'Code must be exactly 6 digits')
    .regex(/^\d+$/, 'Code must contain digits only'),
});

type EmailFormData = z.infer<typeof emailSchema>;
type OtpFormData = z.infer<typeof otpSchema>;

export function MagicLinkForm() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'otp' | 'sent'>('email');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
  });

  // Step 1: send OTP / magic link
  const onEmailSubmit = async (data: EmailFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          shouldCreateUser: false, // only pre-provisioned accounts may sign in
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes('not found') || signInError.status === 422) {
          throw new Error('No account found with that email address. Contact your administrator.');
        }
        throw signInError;
      }

      setSubmittedEmail(data.email);
      setStep('sent');
    } catch (err: any) {
      setError(err.message || 'Failed to send sign-in link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: verify 6-digit OTP code (used when email template sends a code)
  const onOtpSubmit = async (data: OtpFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: submittedEmail,
        token: data.token,
        type: 'email',
      });

      if (verifyError) throw verifyError;
      if (!verifyData.session) throw new Error('Verification failed. Please try again.');

      // Determine role and redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', verifyData.session.user.id)
        .single();

      void recordLastLogin(verifyData.session.access_token);
      router.replace(getLandingPathForRole((profile as any)?.role ?? null));
    } catch (err: any) {
      setError(err.message || 'Invalid code. Please check your email and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── "Email sent" confirmation screen ────────────────────────────────────────
  if (step === 'sent') {
    return (
      <div className="text-center space-y-5">
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
            <Mail className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Check your email</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            We sent a sign-in link to{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300">{submittedEmail}</span>.
            Click the link to sign in, or enter the 6-digit code below.
          </p>
        </div>

        {/* OTP code entry */}
        <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4 text-left">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="token">6-digit code</Label>
            <Input
              id="token"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              className="text-center text-2xl tracking-[0.4em] font-mono"
              {...otpForm.register('token')}
              disabled={isLoading}
            />
            {otpForm.formState.errors.token && (
              <p className="text-sm text-red-600">{otpForm.formState.errors.token.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              'Verify code'
            )}
          </Button>
        </form>

        <button
          onClick={() => { setStep('email'); setError(null); }}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Use a different email
        </button>
      </div>
    );
  }

  // ── Step 1: email entry ──────────────────────────────────────────────────────
  return (
    <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@company.com"
          {...emailForm.register('email')}
          disabled={isLoading}
        />
        {emailForm.formState.errors.email && (
          <p className="text-sm text-red-600">{emailForm.formState.errors.email.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          'Send sign-in link'
        )}
      </Button>
    </form>
  );
}
