'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { MetricCard } from '@/components/common/data-display/MetricCard';
import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ContractorPayrollEditor } from '@/components/features/payroll';
import { contractorService } from '@/lib/services/contractorService';
import { formatDate } from '@/lib/utils/formatters';
import { useAuth } from '@/components/providers/AuthProvider';

export default function ContractorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, can } = useAuth();
  const query = useQuery({ queryKey: ['contractor', id, profile?.id], queryFn: () => contractorService.getContractorById(id), enabled: Boolean(id && profile), refetchInterval: 15000 });
  if (query.isPending) return <p>Loading contractor…</p>;
  if (query.error) return <div role="alert">Unable to load contractor. <Button onClick={() => query.refetch()}>Retry</Button></div>;
  const c = query.data;
  if (!c) return <div><PageHeader title="Contractor not found" showBackButton backHref="/admin/contractors" /></div>;
  return <div className="space-y-6">
    <PageHeader title={c.fullName} description={c.businessName} showBackButton backHref="/admin/contractors"><Button variant="outline" onClick={() => query.refetch()}>Refresh</Button></PageHeader>
    <div className="grid grid-cols-2 gap-4"><MetricCard title="Assigned Tickets" value={c.assignedTicketCount} /><MetricCard title="Total Tickets" value={c.totalTicketCount} /></div>
    <Card><CardHeader><CardTitle>Contractor account</CardTitle></CardHeader><CardContent className="space-y-3">
      <StatusBadge status={!c.profileId ? 'Pending' : !c.isActive ? 'Inactive' : c.onboardingStatus === 'APPROVED' ? 'Active' : 'Pending'} />
      {(profile?.role === 'SUPER_ADMIN' || profile?.role === 'CEO') && c.profileId && c.profileId !== profile.id && <div><Button variant="outline" onClick={async () => { try { await contractorService.setContractorActive(c.profileId!, !c.isActive); await query.refetch(); } catch (e) { window.alert(e instanceof Error ? e.message : 'Unable to update status.'); } }}>{c.isActive ? 'Mark inactive' : 'Reactivate'}</Button></div>}
      <p>Email: {c.email}</p><p>Phone: {c.phone || 'Not provided'}</p><p>Location: {[c.city,c.state].filter(Boolean).join(', ') || 'Not provided'}</p>
      <p>Business type: {c.businessType || 'Not provided'}</p><p>Onboarding: {c.onboardingStatus}</p><p>Joined: {formatDate(c.createdAt)}</p>
      {!c.eligibleForAssignment && <p>Assignment eligibility: {c.eligibilityReason || 'Not eligible'}</p>}
    </CardContent></Card>
    {can('admin.payroll.view') && <ContractorPayrollEditor contractorId={c.id} currentRole={c.role} canEdit={can('admin.payroll.edit')} canChangeRole={profile?.role === 'SUPER_ADMIN' || profile?.role === 'CEO'} onRoleChanged={() => query.refetch()} />}
    <Card><CardHeader><CardTitle>Recent assigned tickets</CardTitle></CardHeader><CardContent>{c.recentTickets.length ? <ul className="space-y-3">{c.recentTickets.map(ticket => <li key={ticket.id} className="flex flex-wrap gap-3 items-center"><Link className="text-grid-blue underline" href={`/tickets/${ticket.id}`}>{ticket.ticketNumber}</Link><StatusBadge status={ticket.status} /><span>{ticket.utilityClient}{ticket.isImportant ? ' · Important' : ''}</span></li>)}</ul> : <p>No assigned tickets.</p>}</CardContent></Card>
  </div>;
}
