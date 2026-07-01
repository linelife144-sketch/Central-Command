'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { MetricCard } from '@/components/common/data-display/MetricCard';
import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { DataTable, Column } from '@/components/common/data-display/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, UserCheck, UserPlus, UserX, AlertTriangle } from 'lucide-react';

interface Subcontractor {
  id: string;
  name: string;
  status: string;
  eligible: boolean;
  tickets: number;
  ytdEarnings: string;
  alerts?: string;
}

const mockSubcontractors: Subcontractor[] = [
  { id: '1', name: 'John Smith', status: 'Active', eligible: true, tickets: 12, ytdEarnings: '$45,230', alerts: undefined },
  { id: '2', name: 'Maria Johnson', status: 'Active', eligible: true, tickets: 8, ytdEarnings: '$38,150', alerts: undefined },
  { id: '3', name: 'David Chen', status: 'Active', eligible: true, tickets: 15, ytdEarnings: '$52,400', alerts: 'Insurance expiring' },
  { id: '4', name: 'Sarah Williams', status: 'Pending', eligible: false, tickets: 0, ytdEarnings: '-', alerts: undefined },
  { id: '5', name: 'Michael Brown', status: 'Active', eligible: true, tickets: 10, ytdEarnings: '$41,800', alerts: undefined },
  { id: '6', name: 'Lisa Davis', status: 'Inactive', eligible: false, tickets: 0, ytdEarnings: '$12,500', alerts: 'Credential expired' },
  { id: '7', name: 'Robert Wilson', status: 'Active', eligible: true, tickets: 6, ytdEarnings: '$28,900', alerts: undefined },
];

const columns: Column<Subcontractor>[] = [
  {
    key: 'name',
    header: 'Name',
    cell: (sub) => (
      <Link
        href={`/admin/contractors/${sub.id}`}
        className="font-medium text-blue-600 hover:text-blue-800"
      >
        {sub.name}
      </Link>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    cell: (sub) => <StatusBadge status={sub.status} size="sm" />,
  },
  {
    key: 'eligible',
    header: 'Eligible',
    cell: (sub) => (
      <span className={sub.eligible ? 'text-green-600' : 'text-slate-400'}>
        {sub.eligible ? '✓ Yes' : '✗ No'}
      </span>
    ),
  },
  {
    key: 'tickets',
    header: 'Tickets',
    cell: (sub) => sub.tickets,
  },
  {
    key: 'ytdEarnings',
    header: 'YTD Earnings',
    cell: (sub) => sub.ytdEarnings,
  },
  {
    key: 'alerts',
    header: 'Alerts',
    cell: (sub) => sub.alerts ? (
      <span className="flex items-center gap-1 text-yellow-600 text-sm">
        <AlertTriangle className="w-4 h-4" />
        {sub.alerts}
      </span>
    ) : (
      <span className="text-slate-400">-</span>
    ),
  },
];

export default function SubcontractorsListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Calculate metrics
  const totalCount = mockSubcontractors.length;
  const activeCount = mockSubcontractors.filter(s => s.status === 'Active').length;
  const pendingCount = mockSubcontractors.filter(s => s.status === 'Pending').length;
  const expiringCount = mockSubcontractors.filter(s => s.alerts?.includes('expiring')).length;

  // Filter data
  const filteredData = mockSubcontractors.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subcontractors"
        description="Manage your workforce and view performance metrics"
      >
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Subcontractor
        </Button>
      </PageHeader>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total"
          value={totalCount}
          icon={<Users className="w-4 h-4 text-blue-600" />}
        />
        <MetricCard
          title="Active"
          value={activeCount}
          icon={<UserCheck className="w-4 h-4 text-green-600" />}
        />
        <MetricCard
          title="Pending"
          value={pendingCount}
          icon={<UserX className="w-4 h-4 text-slate-600" />}
          variant="default"
        />
        <MetricCard
          title="Expiring"
          value={expiringCount}
          icon={<AlertTriangle className="w-4 h-4 text-red-600" />}
          variant="danger"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:max-w-xs">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="sm:ml-auto">
          Export
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        keyExtractor={(sub) => sub.id}
        onRowClick={(sub) => console.log('Clicked:', sub.name)}
      />
    </div>
  );
}
