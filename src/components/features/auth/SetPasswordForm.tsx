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
  const [profileRole, setProfileRole] = useState<string | null>(null);
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
          setProfileRole(profile.role);
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

      let accessToken = currentSession?.access_token;
      if (!accessToken) {
        const {
          data: { session: refreshedSession },
          error: refreshError,
        } = await supabase.auth.refreshSession();

        if (refreshError || !refreshedSession?.access_token) {
          throw new Error('Your session expired. Please sign in again.');
        }

        accessToken = refreshedSession.access_token;
      }

      const { error: passwordError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (passwordError) {
        throw passwordError;
      }

      const profileResponse = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken
            ? {
              Authorization: `Bearer ${accessToken}`,
            }
            : {}),
        },
        body: JSON.stringify({
          must_reset_password: false,
        }),
      });

      if (!profileResponse.ok) {
        const body = await profileResponse.text();
        throw new Error(body || 'Password updated but profile sync failed. Please contact an administrator.');
      }

      const profilePayload = (await profileResponse.json()) as { applied?: boolean };
      if (profilePayload.applied === false) {
        throw new Error('Password updated but reset flag was not applied. Please contact an administrator.');
      }

      router.push(getLandingPathForRole(profileRole));
      router.refresh();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Unable to set your password. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isBootstrapping) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Preparing account setup...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Enter your new password"
          {...register('password')}
          disabled={isLoading}
        />
        {errors.password && (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        )}
        <p className="text-xs text-slate-500">
          Must be at least 12 characters with uppercase, lowercase, number, and special character.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirm your new password"
          {...register('confirmPassword')}
          disabled={isLoading}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button
        type="submit"
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
