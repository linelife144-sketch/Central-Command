'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase/client';
import { getLandingPathForRole } from '@/lib/auth/roleLanding';
import { recordLastLogin } from '@/lib/auth/recordLogin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  useEffect(() => { setIsReady(true); }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        throw signInError;
      }

      // Fetch user profile to determine correct role-specific portal redirect
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      const user = session?.user;

      let redirectPath = '/login';
      if (user) {
        const { data: profile } = (await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single());

        redirectPath = getLandingPathForRole(profile?.role ?? null);
        void recordLastLogin(session?.access_token);
      }

      // Capture optional query parameter redirect
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const redirectParam = params.get('redirect');
        if (redirectParam) {
          redirectPath = redirectParam;
        }
      }

      router.push(redirectPath);
      router.refresh();
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : null) || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          placeholder="name@company.com"
          {...register('email')}
          disabled={isLoading || !isReady}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-grid-danger-ink">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative"><Input
          id="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          className="pr-12"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'password-error' : undefined}
          placeholder="Enter your password"
          {...register('password')}
          disabled={isLoading || !isReady}
        /><button type="button" className="cc-password-toggle" disabled={isLoading || !isReady} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(previous => !previous)}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div>
        {errors.password && (
          <p id="password-error" className="text-sm text-grid-danger-ink">{errors.password.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full h-12"
        disabled={isLoading || !isReady}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          <>Sign in<ArrowRight className="ml-auto size-4" /></>
        )}
      </Button>
    </form>
  );
}
