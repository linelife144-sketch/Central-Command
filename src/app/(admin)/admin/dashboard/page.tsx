'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { MetricCard } from '@/components/common/data-display/MetricCard';
import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { DataTable, Column } from '@/components/common/data-display/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Ticket, 
  Users, 
  Clock, 
  DollarSign, 
  AlertTriangle,
  RefreshCw,
  Plus,
  MapPin,
} from 'lucide-react';

// Mock data - will be replaced with Supabase queries
const mockMetrics = {
  activeTickets: 47,
  fieldCrews: 12,
  pendingReviews: 23,
  revenueMTD: '$284,500',
};

interface Ticket {
  id: string;
  ticketNumber: string;
  address: string;
  status: string;
  assignedTo: string;
  dueTime: string;
}

const mockTickets: Ticket[] = [
  { id: '1', ticketNumber: 'GES-260245', address: '1234 Main St, Tampa', status: 'In Route', assignedTo: 'J. Smith', dueTime: '2:00 PM' },
  { id: '2', ticketNumber: 'GES-260244', address: '5678 Oak Ave, Orlando', status: 'On Site', assignedTo: 'M. Johnson', dueTime: '2:30 PM' },
  { id: '3', ticketNumber: 'GES-260243', address: '9012 Pine Rd, Miami', status: 'Pending Review', assignedTo: 'A. Davis', dueTime: '3:00 PM' },
  { id: '4', ticketNumber: 'GES-260242', address: '3456 Elm St, Tampa', status: 'Unassigned', assignedTo: '-', dueTime: '4:00 PM' },
  { id: '5', ticketNumber: 'GES-260241', address: '7890 Maple Dr, Jacksonville', status: 'Complete', assignedTo: 'R. Wilson', dueTime: '-' },
];

const alertItems = [
  { type: 'warning', message: '3 Insurance policies expiring soon', action: 'View' },
  { type: 'danger', message: '1 Credential expired', action: 'View' },
  { type: 'info', message: '5 Timesheets pending review', action: 'Review' },
];

const ticketColumns: Column<Ticket>[] = [
  {
    key: 'ticketNumber',
    header: 'Ticket #',
    cell: (ticket) => <span className="font-medium">{ticket.ticketNumber}</span>,
  },
  {
    key: 'address',
    header: 'Location',
    cell: (ticket) => ticket.address,
  },
  {
    key: 'status',
    header: 'Status',
    cell: (ticket) => <StatusBadge status={ticket.status} size="sm" />,
  },
  {
    key: 'assignedTo',
    header: 'Assigned',
    cell: (ticket) => ticket.assignedTo,
  },
  {
    key: 'dueTime',
    header: 'Due',
    cell: (ticket) => ticket.dueTime,
  },
];

export default function AdminDashboardPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of operations and key metrics"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />
          Refresh
        </Button>
        <Button size="sm" asChild>
          <Link href="/tickets/create">
            <Plus className="w-4 h-4 mr-2" />
            New Ticket
          </Link>
        </Button>
      </PageHeader>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Tickets"
          value={mockMetrics.activeTickets}
          icon={<Ticket className="w-4 h-4 text-blue-600" />}
          trend="up"
          trendValue="12%"
          description="vs last week"
        />
        <MetricCard
          title="Field Crews"
          value={mockMetrics.fieldCrews}
          icon={<Users className="w-4 h-4 text-green-600" />}
          description="8 on site"
        />
        <MetricCard
          title="Pending Reviews"
          value={mockMetrics.pendingReviews}
          icon={<Clock className="w-4 h-4 text-yellow-600" />}
          description="15 time, 8 expense"
          variant="warning"
        />
        <MetricCard
          title="Revenue (MTD)"
          value={mockMetrics.revenueMTD}
          icon={<DollarSign className="w-4 h-4 text-purple-600" />}
          trend="up"
          trendValue="8%"
          description="vs last month"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Activity / Map */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today&apos;s Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">Interactive map view coming soon</p>
                <div className="flex justify-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>In Route (5)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                    <span>On Site (8)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span>Pending (12)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-slate-300" />
                    <span>Unassigned (22)</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/tickets/create">
                <Plus className="w-4 h-4 mr-2" />
                Create Ticket
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/admin/map">
                <Users className="w-4 h-4 mr-2" />
                Assign Route
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/tickets/create?priority=A">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Emergency Dispatch
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/admin/time-review">
                <Clock className="w-4 h-4 mr-2" />
                Review Timesheets
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/admin/invoice-generation">
                <DollarSign className="w-4 h-4 mr-2" />
                Generate Invoices
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Tickets</CardTitle>
            <Button variant="ghost" size="sm">View All</Button>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={ticketColumns}
              data={mockTickets}
              keyExtractor={(ticket) => ticket.id}
              onRowClick={(ticket) => console.log('Clicked:', ticket.ticketNumber)}
            />
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertItems.map((alert, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg',
                  alert.type === 'warning' && 'bg-yellow-50 dark:bg-yellow-900/20',
                  alert.type === 'danger' && 'bg-red-50 dark:bg-red-900/20',
                  alert.type === 'info' && 'bg-blue-50 dark:bg-blue-900/20'
                )}
              >
                <AlertTriangle className={cn(
                  'w-5 h-5 flex-shrink-0',
                  alert.type === 'warning' && 'text-yellow-600',
                  alert.type === 'danger' && 'text-red-600',
                  alert.type === 'info' && 'text-blue-600'
                )} />
                <div className="flex-1">
                  <p className="text-sm">{alert.message}</p>
                  <Button variant="link" size="sm" className="h-auto p-0 mt-1">
                    {alert.action}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper function
import { cn } from '@/lib/utils';
