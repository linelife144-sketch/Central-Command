'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { US_STATES } from '@/lib/constants/states';
import { contractorOnboardingSchema, type ContractorOnboardingDetails } from '@/lib/auth/contractorOnboardingValidation';

type Setup = { contractor: Partial<ContractorOnboardingDetails> & { id: string; onboarding_completed_at: string | null } };
const initial: ContractorOnboardingDetails = { first_name: '', last_name: '', address_line1: '', address_line2: '', city: '', state: '', zip_code: '', vehicle_registration_photo_path: null };

export function ContractorOnboardingForm() {
  const router = useRouter();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [details, setDetails] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch('/api/contractor/onboarding', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load your contractor details.');
        if (data.contractor.onboarding_completed_at) { router.replace('/contractor/time'); return; }
        if (alive) {
          const loadedState = (data.contractor.state ?? initial.state ?? '').trim().toUpperCase();
          setSetup(data);
          setDetails({
            ...initial,
            ...Object.fromEntries(Object.keys(initial).map(k => [k, data.contractor[k] ?? initial[k as keyof typeof initial]])),
            state: loadedState,
          });
        }
      } catch (err) { if (alive) setError(err instanceof Error ? err.message : 'Unable to load onboarding.'); }
    }
    void load(); return () => { alive = false; };
  }, [router]);

  function field(name: keyof ContractorOnboardingDetails, label: string, autoComplete: string, optional = false) {
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>{label}{optional ? ' (optional)' : ''}</Label>
        <Input
          id={name}
          autoComplete={autoComplete}
          required={!optional}
          value={details[name] ?? ''}
          maxLength={name === 'zip_code' ? 10 : name.includes('name') ? 80 : name === 'city' ? 100 : 255}
          onChange={e => setDetails(d => ({ ...d, [name]: e.target.value }))}
          disabled={busy}
        />
      </div>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!setup) return;
    setBusy(true);
    setError('');
    try {
      const parsed = contractorOnboardingSchema.parse(details);
      const response = await fetch('/api/contractor/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to complete onboarding.');
      router.replace(result.next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error && 'issues' in err ? 'Check your names and full starting address.' : err instanceof Error ? err.message : 'Unable to save onboarding.');
    } finally {
      setBusy(false);
    }
  }

  if (!setup) return <div className="cc-work-panel p-6">{error ? <p role="alert">{error}</p> : <p role="status">Loading your details…</p>}</div>;
  const currentUpperState = details.state ? details.state.toUpperCase() : '';

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-grid-danger-ink">{error}</p>}
      <section className="cc-work-panel space-y-5 p-6">
        <h2 className="text-xl font-bold text-grid-navy">Your name</h2>
        <p className="text-sm text-muted-foreground">Check the name your administrator entered. You can edit it here.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {field('first_name', 'First name', 'given-name')}
          {field('last_name', 'Last name', 'family-name')}
        </div>
      </section>
      <section className="cc-work-panel space-y-5 p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold text-grid-navy">
          <MapPin className="size-5 text-grid-blue" />
          Starting location
        </h2>
        <p className="text-sm text-muted-foreground">Enter the full street address where you will start from.</p>
        {field('address_line1', 'Street address', 'address-line1')}
        {field('address_line2', 'Apartment, suite, or unit', 'address-line2', true)}
        <div className="grid gap-4 sm:grid-cols-3">
          {field('city', 'City', 'address-level2')}
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Select disabled={busy} value={currentUpperState || undefined} onValueChange={value => setDetails(d => ({ ...d, state: value }))}>
              <SelectTrigger id="state" className="w-full">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map(s => (
                  <SelectItem key={s.code} value={s.code}>{s.code} - {s.name}</SelectItem>
                ))}
                {currentUpperState && !US_STATES.some(s => s.code === currentUpperState) && (
                  <SelectItem value={currentUpperState}>{currentUpperState}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          {field('zip_code', 'ZIP code', 'postal-code')}
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Your details are saved when you finish. An internet connection is required.</p>
        <Button type="submit" disabled={busy} className="h-12">
          {busy ? <><Loader2 className="size-4 animate-spin" />Saving…</> : <>Finish setup<ArrowRight className="size-4" /></>}
        </Button>
      </div>
    </form>
  );
}
