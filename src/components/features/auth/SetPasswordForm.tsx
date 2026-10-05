'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';

import { supabase } from '@/lib/supabase/client';
import { getLandingPathForRole } from '@/lib/auth/roleLanding';
import { getErrorMessage } from '@/lib/utils/errorHandling';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const setPasswordSchema = z.object({
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SetPasswordFormData = z.infer<typeof setPasswordSchema>;

type ProfileSecurityRow = {
  id: string;
  role: string;
  must_reset_password?: boolean;
};

async function getAccessToken(): Promise<string | undefined> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token;
}

export function SetPasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetPasswordFormData>({
    resolver: zodResolver(setPasswordSchema),
  });

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      setIsBootstrapping(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const sessionUser = session?.user;

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        const resolvedUser = sessionUser ?? user;

        if (userError || !resolvedUser) {
          router.push('/login');
          return;
        }

        const accessToken = await getAccessToken();
        const profileResponse = await fetch('/api/auth/profile', {
          cache: 'no-store',
          headers: accessToken
            ? {
              Authorization: `Bearer ${accessToken}`,
            }
            : undefined,
        });
        if (!profileResponse.ok) {
          setError('Unable to load your profile. Please contact an administrator.');
          return;
        }

        const profilePayload = (await profileResponse.json()) as { profile?: ProfileSecurityRow };
        const profile = profilePayload.profile;

        if (!profile) {
          setError('Unable to load your profile. Please contact an administrator.');
          return;
        }

        if (profile.must_reset_password !== true) {
          router.push(getLandingPathForRole(profile.role));
          return;
        }

        if (active) {
          setUserId(resolvedUser.id);
        }
      } catch {
        if (active) {
          setError('Unable to initialize password setup. Please try again.');
        }
      } finally {
        if (active) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [router]);

  const onSubmit = async (data: SetPasswordFormData) => {
    if (!userId) {
      setError('User session not found. Please sign in again.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { session: currentSession },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken = currentSession?.access_token;
      if (!accessToken) {
        const {
          data: { session: refreshedSession },
          error: refreshError,
        } = await supabase.auth.refreshSession();

        if (refreshError || !refreshedSession?.access_token) {
          throw new Error('Your session expired. Please sign in again.');
        }

      }

      const response = await fetch('/api/auth/complete-password-setup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: data.password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to set password.');
      router.replace(result.next);
      router.refresh();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Unable to set your password. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isBootstrapping) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground" role="status">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Preparing account setup...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="password" className="font-semibold text-grid-navy">New password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'password-requirements password-error' : 'password-requirements'}
          placeholder="Enter your new password"
          {...register('password')}
          disabled={isLoading}
        />
        {errors.password && (
          <p id="password-error" role="alert" className="text-sm text-grid-danger-ink">{errors.password.message}</p>
        )}
        <p id="password-requirements" className="text-sm leading-relaxed text-grid-body">
          Must be at least 12 characters with uppercase, lowercase, number, and special character.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="font-semibold text-grid-navy">Confirm password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
          placeholder="Confirm your new password"
          {...register('confirmPassword')}
          disabled={isLoading}
        />
        {errors.confirmPassword && (
          <p id="confirm-password-error" role="alert" className="text-sm text-grid-danger-ink">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button
        type="submit"
        variant="default"
        className="w-full"
        disabled={isLoading || !userId}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Set Password'
        )}
      </Button>
    </form>
  );
}
