'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase/client';
import { SETUP_ACCOUNT_MESSAGE } from '@/lib/auth/contractorOnboardingValidation';

export function SetupAccountForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function requestEmail(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/setup-account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase() }) });
      if (!response.ok) throw new Error('Unable to request account setup. Please try again.');
      setSent(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to request account setup.'); }
    finally { setBusy(false); }
  }
  async function verify(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const { error: verifyError, data } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
      if (verifyError || !data.session) throw new Error('This verification code is invalid or expired. Request a new email and try again.');
      router.push('/set-password'); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to verify email.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5">
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-grid-danger-ink">{error}</p>}
    {!sent ? <form onSubmit={requestEmail} className="space-y-5">
      <div className="space-y-2"><Label htmlFor="setup-email">Contractor email</Label><Input id="setup-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} disabled={busy} placeholder="The email provided to your administrator" /></div>
      <Button type="submit" className="h-12 w-full" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <>Verify email<ArrowRight className="ml-auto size-4" /></>}</Button>
    </form> : <>
      <div className="rounded-2xl border border-grid-blue/20 bg-grid-blue/5 p-4"><MailCheck className="mb-2 size-6 text-grid-blue" /><p role="status" className="text-sm leading-6">{SETUP_ACCOUNT_MESSAGE}</p></div>
      <p className="text-sm text-muted-foreground">Open the verification link in your email. If the email includes a verification code, you can enter it here instead.</p>
      <form onSubmit={verify} className="space-y-3"><Label htmlFor="setup-code">Verification code</Label><Input id="setup-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} onChange={e => setCode(e.target.value)} disabled={busy} /><Button type="submit" className="w-full" disabled={busy}>{busy ? 'Verifying…' : 'Continue to password setup'}</Button></form>
      <Button variant="ghost" disabled={busy} onClick={() => { setSent(false); setCode(''); setError(''); }}>Use a different email or request again</Button>
    </>}
  </div>;
}
