'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { DashboardMetrics } from '@/components/features/dashboard/DashboardMetrics';
import { DashboardRecentTickets } from '@/components/features/dashboard/DashboardRecentTickets';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Clock, DollarSign, Plus, Users } from 'lucide-react';

export default function AdminDashboardPage() {
  return <div className="space-y-6">
    <PageHeader title="Dashboard" description="Live overview of tickets, contractor crews, and approvals">
      <Button size="sm" asChild><Link href="/tickets/create"><Plus className="mr-2 h-4 w-4" />New Ticket</Link></Button>
    </PageHeader>
    <DashboardMetrics />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Button className="w-full justify-start" variant="outline" asChild><Link href="/tickets/create"><Plus className="mr-2 h-4 w-4" />Create Ticket</Link></Button>
          <Button className="w-full justify-start" variant="outline" asChild><Link href="/admin/map"><Users className="mr-2 h-4 w-4" />Assign Route</Link></Button>
          <Button className="w-full justify-start" variant="outline" asChild><Link href="/tickets/create?priority=A"><AlertTriangle className="mr-2 h-4 w-4" />Emergency Dispatch</Link></Button>
          <Button className="w-full justify-start" variant="outline" asChild><Link href="/admin/time-review"><Clock className="mr-2 h-4 w-4" />Review Timesheets</Link></Button>
          <Button className="w-full justify-start" variant="outline" asChild><Link href="/admin/invoice-generation"><DollarSign className="mr-2 h-4 w-4" />Generate Invoices</Link></Button>
        </CardContent>
      </Card>
      <DashboardRecentTickets />
    </div>
  </div>;
}
