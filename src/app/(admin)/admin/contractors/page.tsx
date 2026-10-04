'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { MetricCard } from '@/components/common/data-display/MetricCard';
import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { DataTable, type Column } from '@/components/common/data-display/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { contractorService, type ContractorListItem } from '@/lib/services/contractorService';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/client';

function statusOf(contractor: ContractorListItem) {
  if (!contractor.profileId && contractor.onboardingStatus !== 'APPROVED') return 'Pending';
  if (!contractor.isActive) return 'Inactive';
  return contractor.onboardingStatus === 'APPROVED' ? 'Active' : 'Pending';
}
const columns: Column<ContractorListItem>[] = [
  { key: 'fullName', header: 'Name', cell: c => <Link className="font-semibold text-grid-navy underline-offset-4 hover:underline" href={`/admin/contractors/${c.id}`}>{c.fullName}</Link> },
  { key: 'businessName', header: 'Business', cell: c => c.businessName },
  { key: 'onboardingStatus', header: 'Status', cell: c => <StatusBadge status={statusOf(c)} size="sm" /> },
  { key: 'assignedTicketCount', header: 'Assigned Tickets', cell: c => c.assignedTicketCount },
  { key: 'alerts', header: 'Alerts', cell: c => c.alerts.join('; ') || '—' },
];
export default function ContractorsListPage() {
  const { profile, can } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['contractors', profile?.id], queryFn: () => contractorService.listContractors(), enabled: Boolean(profile), refetchInterval: 15000, refetchOnWindowFocus: true });
  useEffect(() => {
    if (!profile) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => { if (timer) clearTimeout(timer); timer = setTimeout(() => { void queryClient.invalidateQueries({ queryKey: ['contractors'] }); }, 200); };
    const channel = supabase.channel('admin-contractors-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contractors' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, refresh)
      .subscribe();
    return () => { if (timer) clearTimeout(timer); void supabase.removeChannel(channel); };
  }, [profile, queryClient]);
  const contractors = query.data ?? [];
  const filtered = contractors.filter(c => [c.fullName, c.businessName, c.email].join(' ').toLowerCase().includes(search.toLowerCase()) && (status === 'all' || statusOf(c).toLowerCase() === status))
    .sort((a, b) => Number(!a.isActive) - Number(!b.isActive) || a.fullName.localeCompare(b.fullName));
  function exportCsv() {
    const rows = [['Name','Business','Email','Status','Assigned Tickets'], ...filtered.map(c => [c.fullName,c.businessName,c.email,statusOf(c),String(c.assignedTicketCount)])];
    const content = rows.map(row => row.map(value => '"' + String(value).replace(/"/g,'""').replace(/^[=+@-]/,"'") + '"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'contractors.csv'; anchor.click(); URL.revokeObjectURL(url);
  }
  return <div className="space-y-6">
    <PageHeader title="Contractors" description="Live workforce and assigned ticket counts">{can('admin.contractors.edit') && can('admin.payroll.edit') && <Button asChild><Link href="/admin/contractors/add">Add Contractor</Link></Button>}</PageHeader>
    {query.error && <div role="alert">Unable to load contractors. {query.error instanceof Error ? query.error.message : ''} <Button variant="outline" onClick={() => query.refetch()}>Retry</Button></div>}
    <div className="stagger-children grid grid-cols-2 xl:grid-cols-4 gap-4">
      <MetricCard title="Total" value={query.isPending ? '—' : contractors.length} />
      <MetricCard title="Active" value={query.isPending ? '—' : contractors.filter(c => statusOf(c) === 'Active').length} />
      <MetricCard title="Pending" value={query.isPending ? '—' : contractors.filter(c => statusOf(c) === 'Pending').length} />
    </div>
    <div className="cc-filter-bar flex flex-col sm:flex-row flex-wrap gap-3">
      <Input aria-label="Search contractors" placeholder="Search by name, business, or email..." value={search} onChange={e => setSearch(e.target.value)} className="sm:max-w-xs" />
      <Select value={status} onValueChange={setStatus}><SelectTrigger aria-label="Filter contractors by status" className="w-full sm:w-[170px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
      <Button variant="outline" onClick={() => query.refetch()}>Refresh</Button><Button variant="outline" onClick={exportCsv} disabled={query.isPending || Boolean(query.error)}>Export</Button>
    </div>
    {!query.error && <DataTable columns={columns} data={filtered} keyExtractor={c => c.id} isLoading={query.isPending} emptyMessage="No contractors match your filters." />}
  </div>;
}
