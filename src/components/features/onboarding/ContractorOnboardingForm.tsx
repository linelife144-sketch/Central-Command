'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Car, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase/client';
import { contractorOnboardingSchema, REGISTRATION_BUCKET, type ContractorOnboardingDetails } from '@/lib/auth/contractorOnboardingValidation';

type Setup = { contractor: Partial<ContractorOnboardingDetails> & { id: string; onboarding_completed_at: string | null }; driverRequired: boolean };
const initial: ContractorOnboardingDetails = { first_name: '', last_name: '', address_line1: '', address_line2: '', city: '', state: '', zip_code: '', vehicle_registration_photo_path: null };
export function ContractorOnboardingForm() {
  const router = useRouter();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [details, setDetails] = useState(initial);
  const [file, setFile] = useState<File | null>(null);
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
        if (alive) { setSetup(data); setDetails({ ...initial, ...Object.fromEntries(Object.keys(initial).map(k => [k, data.contractor[k] ?? initial[k as keyof typeof initial]])) }); }
      } catch (err) { if (alive) setError(err instanceof Error ? err.message : 'Unable to load onboarding.'); }
    }
    void load(); return () => { alive = false; };
  }, [router]);
  function field(name: keyof ContractorOnboardingDetails, label: string, autoComplete: string, optional = false) {
    return <div className="space-y-2"><Label htmlFor={name}>{label}{optional ? ' (optional)' : ''}</Label><Input id={name} autoComplete={autoComplete} required={!optional} value={details[name] ?? ''} maxLength={name === 'state' ? 2 : name === 'zip_code' ? 10 : name.includes('name') ? 80 : name === 'city' ? 100 : 255} onChange={e => setDetails(d => ({ ...d, [name]: e.target.value }))} disabled={busy} /></div>;
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!setup) return; setBusy(true); setError('');
    try {
      const parsed = contractorOnboardingSchema.parse(details);
      if (setup.driverRequired && !file && !parsed.vehicle_registration_photo_path) throw new Error('Upload a vehicle registration tag photo to continue.');
      let path = parsed.vehicle_registration_photo_path;
      if (setup.driverRequired && file) {
        const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
        const extension = extensions[file.type];
        if (!extension || file.size > 10485760 || !file.size) throw new Error('Choose a JPG, PNG, or WebP photo up to 10 MB.');
        path = `${setup.contractor.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from(REGISTRATION_BUCKET).upload(path, file, { upsert: false, contentType: file.type });
        if (uploadError) throw new Error('Unable to upload your photo. Please try again.');
        // Retain the uploaded path if completion must be retried.
        setDetails(d => ({ ...d, vehicle_registration_photo_path: path })); setFile(null);
      }
      const response = await fetch('/api/contractor/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...parsed, vehicle_registration_photo_path: setup.driverRequired ? path : null }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to complete onboarding.');
      router.replace(result.next); router.refresh();
    } catch (err) { setError(err instanceof Error && 'issues' in err ? 'Check your names and full starting address.' : err instanceof Error ? err.message : 'Unable to save onboarding.'); }
    finally { setBusy(false); }
  }
  if (!setup) return <div className="cc-work-panel p-6">{error ? <p role="alert">{error}</p> : <p role="status">Loading your details…</p>}</div>;
  return <form onSubmit={submit} className="space-y-6">
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-grid-danger-ink">{error}</p>}
    <section className="cc-work-panel space-y-5 p-6"><h2 className="text-xl font-bold text-grid-navy">Your name</h2><p className="text-sm text-muted-foreground">Check the name your administrator entered. You can edit it here.</p><div className="grid gap-4 sm:grid-cols-2">{field('first_name', 'First name', 'given-name')}{field('last_name', 'Last name', 'family-name')}</div></section>
    <section className="cc-work-panel space-y-5 p-6"><h2 className="flex items-center gap-2 text-xl font-bold text-grid-navy"><MapPin className="size-5 text-grid-blue" />Starting location</h2><p className="text-sm text-muted-foreground">Enter the full street address where you will start from.</p>{field('address_line1', 'Street address', 'address-line1')}{field('address_line2', 'Apartment, suite, or unit', 'address-line2', true)}<div className="grid gap-4 sm:grid-cols-3">{field('city', 'City', 'address-level2')}{field('state', 'State', 'address-level1')}{field('zip_code', 'ZIP code', 'postal-code')}</div></section>
    {setup.driverRequired && <section className="cc-work-panel space-y-4 p-6"><h2 className="flex items-center gap-2 text-xl font-bold text-grid-navy"><Car className="size-5 text-grid-blue" />Vehicle registration tag</h2><p className="text-sm text-muted-foreground">Your administrator enabled your driver flag. Upload a clear photo of your vehicle registration tag to finish setup.</p><Label htmlFor="registration-photo">Registration tag photo</Label><Input id="registration-photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy} required={!details.vehicle_registration_photo_path} onChange={e => setFile(e.target.files?.[0] ?? null)} /><p className="text-xs text-muted-foreground">JPG, PNG, or WebP · Up to 10 MB · Private to you and authorized account administrators</p>{details.vehicle_registration_photo_path && <p role="status" className="text-sm text-grid-blue">Photo uploaded.</p>}</section>}
    <div className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-muted-foreground">Your details are saved when you finish. An internet connection is required.</p><Button type="submit" disabled={busy} className="h-12">{busy ? <><Loader2 className="size-4 animate-spin" />Saving…</> : <>Finish setup<ArrowRight className="size-4" /></>}</Button></div>
  </form>;
}
