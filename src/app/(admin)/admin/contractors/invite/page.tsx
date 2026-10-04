'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Mail, Send, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CompensationFields, emptyCompensationDraft, draftToTerms } from '@/components/features/payroll/CompensationFields';
import { PageHeader } from '@/components/common/layout/PageHeader';

export default function ContractorInvitePage() {
  const [form, setForm] = useState({first_name:'',last_name:'',email:'',phone:''});
  const [compensation, setCompensation] = useState(emptyCompensationDraft);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [duplicate, setDuplicate] = useState(false);
  const send = async (resend = false) => {
    setPending(true); setError(''); setMessage(''); setDuplicate(false);
    try {
      const response = await fetch('/api/admin/contractors/invite', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,resend,compensation:draftToTerms(compensation)})});
      const result = await response.json();
      if (!response.ok) {setDuplicate(response.status === 409 && result.error.includes('Resend')); throw new Error(result.error);}
      setMessage(result.message);
    } catch(error) {setError(error instanceof Error ? error.message : 'Unable to send invitation.');}
    finally {setPending(false);}
  };
  return <div className="space-y-6">
    <PageHeader title="Invite a contractor" description="Send a personal invitation to join the field team." showBackButton backHref="/admin/contractors" />
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="cc-work-panel overflow-hidden"><div className="flex items-center gap-3 border-b p-5 sm:p-6"><span className="flex size-11 items-center justify-center rounded-2xl bg-grid-storm-100 text-grid-navy"><Mail className="size-5" /></span><div><h2 className="font-semibold text-grid-navy">A new connection</h2><p className="text-sm text-grid-body">One contractor per invitation.</p></div></div><form className="space-y-5 p-5 sm:p-6" onSubmit={event => {event.preventDefault(); void send();}}>
        <div className="grid gap-5 sm:grid-cols-2">{(['first_name','last_name'] as const).map(key => <div key={key} className="space-y-2"><Label htmlFor={key}>{key === 'first_name' ? 'First name' : 'Last name'}</Label><Input id={key} required maxLength={80} autoComplete={key === 'first_name' ? 'given-name' : 'family-name'} value={form[key]} disabled={pending} onChange={event => setForm({...form,[key]:event.target.value})} /></div>)}</div>
        <div className="space-y-2"><Label htmlFor="invite-email">Email address</Label><Input id="invite-email" type="email" required autoComplete="email" placeholder="name@company.com" value={form.email} disabled={pending} onChange={event => setForm({...form,email:event.target.value})} /><p className="text-xs text-grid-body">The setup link will be sent to this address.</p></div>
        <div className="space-y-2"><Label htmlFor="invite-phone">Phone <span className="font-normal text-grid-body">(optional)</span></Label><Input id="invite-phone" type="tel" maxLength={30} autoComplete="tel" value={form.phone} disabled={pending} onChange={event => setForm({...form,phone:event.target.value})} /></div>
        <CompensationFields value={compensation} onChange={setCompensation} disabled={pending} />
        {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-grid-danger-ink">{error}{duplicate && <Button type="button" variant="outline" className="mt-3" disabled={pending} onClick={() => send(true)}>Resend invite</Button>}</div>}
        {message && <div role="status" className="flex gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="size-5 shrink-0" /><p>{message}<Link href="/admin/contractors" className="mt-2 block font-semibold underline">View contractors</Link></p></div>}
        <div className="flex flex-wrap items-center gap-3 border-t pt-5"><Button type="submit" disabled={pending || !!message}><Send className="size-4" />{pending ? 'Sending…' : 'Send invitation'}</Button>{message && <Button type="button" variant="outline" onClick={() => {setMessage('');setForm({first_name:'',last_name:'',email:'',phone:''});}}>Invite another person</Button>}</div>
      </form></section>
      <aside className="rounded-3xl bg-gradient-to-br from-grid-navy to-grid-blue p-6 text-white shadow-lg"><ShieldCheck className="size-8 text-grid-lightning" /><h2 className="mt-4 [font-family:var(--font-barlow),sans-serif] text-3xl text-white">Their account.<br />Their password.</h2><p className="mt-4 text-sm leading-6 text-blue-100">The contractor receives an email, opens the secure setup link, and chooses their own password.</p><div className="mt-5 space-y-3 border-t border-white/15 pt-5 text-sm text-blue-100"><p>Access starts in the contractor portal.</p><p>New contractors begin with onboarding pending.</p><p>Assignment eligibility requires approval.</p></div></aside>
    </div>
  </div>;
}
