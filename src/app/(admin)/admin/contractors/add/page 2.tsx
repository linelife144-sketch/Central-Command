'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, UserPlus, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CompensationFields, emptyCompensationDraft, draftToTerms } from '@/components/features/payroll/CompensationFields';
import { formatContractorPhone } from '@/lib/auth/contractorAddValidation';
import { PageHeader } from '@/components/common/layout/PageHeader';

export default function ContractorAddPage() {
  const [form, setForm] = useState({first_name:'',last_name:'',email:'',phone:''});
  const [compensation, setCompensation] = useState(emptyCompensationDraft);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const add = async () => {
    setPending(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/admin/contractors/add', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,compensation:draftToTerms(compensation)})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(result.message);
    } catch(error) {setError(error instanceof Error ? error.message : 'Unable to add contractor.');}
    finally {setPending(false);}
  };
  return <div className="space-y-6">
    <PageHeader title="Add a contractor" description="Save contractor details and compensation for onboarding." showBackButton backHref="/admin/contractors" />
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="cc-work-panel overflow-hidden"><div className="flex items-center gap-3 border-b p-5 sm:p-6"><span className="flex size-11 items-center justify-center rounded-2xl bg-grid-storm-100 text-grid-navy"><UserPlus className="size-5" /></span><div><h2 className="font-semibold text-grid-navy">Contractor details</h2><p className="text-sm text-grid-body">Add one contractor at a time.</p></div></div><form className="space-y-5 p-5 sm:p-6" onSubmit={event => {event.preventDefault(); void add();}}>
        <div className="grid gap-5 sm:grid-cols-2">{(['first_name','last_name'] as const).map(key => <div key={key} className="space-y-2"><Label htmlFor={key}>{key === 'first_name' ? 'First name' : 'Last name'}</Label><Input id={key} required maxLength={80} autoComplete={key === 'first_name' ? 'given-name' : 'family-name'} value={form[key]} disabled={pending} onChange={event => setForm({...form,[key]:event.target.value})} /></div>)}</div>
        <div className="space-y-2"><Label htmlFor="contractor-email">Email address</Label><Input id="contractor-email" type="email" required autoComplete="email" placeholder="name@company.com" value={form.email} disabled={pending} onChange={event => setForm({...form,email:event.target.value})} /><p className="text-xs text-grid-body">Used as the contractor’s contact email.</p></div>
        <div className="space-y-2"><Label htmlFor="contractor-phone">Phone <span className="font-normal text-grid-body">(optional)</span></Label><Input id="contractor-phone" type="tel" maxLength={14} placeholder="(318) 555-0123" autoComplete="tel" value={form.phone} disabled={pending} onChange={event => setForm({...form,phone:formatContractorPhone(event.target.value)})} /></div>
        <CompensationFields value={compensation} onChange={setCompensation} disabled={pending} />
        {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-grid-danger-ink">{error}</div>}
        {message && <div role="status" className="flex gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="size-5 shrink-0" /><p>{message}<Link href="/admin/contractors" className="mt-2 block font-semibold underline">View contractors</Link></p></div>}
        <div className="flex flex-wrap items-center gap-3 border-t pt-5"><Button type="submit" disabled={pending || !!message}><UserPlus className="size-4" />{pending ? 'Adding…' : 'Add contractor'}</Button>{message && <Button type="button" variant="outline" onClick={() => {setMessage('');setForm({first_name:'',last_name:'',email:'',phone:''});setCompensation(emptyCompensationDraft());}}>Add another contractor</Button>}</div>
      </form></section>
      <aside className="rounded-3xl bg-gradient-to-br from-grid-navy to-grid-blue p-6 text-white shadow-lg"><ShieldCheck className="size-8 text-grid-lightning" /><h2 className="mt-4 [font-family:var(--font-barlow),sans-serif] text-3xl text-white">Ready for<br />onboarding.</h2><p className="mt-4 text-sm leading-6 text-blue-100">Save their details and pay agreement now. No invitation email is sent.</p><div className="mt-5 space-y-3 border-t border-white/15 pt-5 text-sm text-blue-100"><p>Contractors set up their account from the login screen.</p><p>Their email must be verified before choosing a password.</p><p>Active contractors can join storm rosters.</p></div></aside>
    </div>
  </div>;
}
