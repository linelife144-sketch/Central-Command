'use client';

import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Clock, CloudLightning, FileCheck2, Plus, Route, Zap } from 'lucide-react';
import { DashboardMetrics } from '@/components/features/dashboard/DashboardMetrics';
import { DashboardRecentTickets } from '@/components/features/dashboard/DashboardRecentTickets';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/components/providers/AuthProvider';
import { mayOpenPath } from '@/lib/auth/permissionCatalog';
import { SignalField } from '@/components/common/brand/SignalField';

const quickActions = [
  { href: '/admin/storms', label: 'Storm workspaces', description: 'Coordinate your response', icon: CloudLightning },
  { href: '/admin/map', label: 'Field overview', description: 'View tickets and crew locations', icon: Route },
  { href: '/admin/assessment-review', label: 'Review assessments', description: 'Keep fieldwork moving forward', icon: FileCheck2 },
  { href: '/admin/time-review', label: 'Review timesheets', description: 'Manage submitted crew hours', icon: Clock },
];

export default function AdminDashboardPage() {
  const { can, permissions } = useAuth();
  return <div className="space-y-7">
    <section className="cc-dashboard-hero" aria-labelledby="dashboard-title">
      <SignalField />
      <div className="relative z-10 max-w-xl">
        <div className="cc-eyebrow"><span aria-hidden="true" />Operations overview</div>
        <h1 id="dashboard-title">Every response.<br /><em>One command.</em></h1>
        <p>A clear view of your tickets, contractor crews, and the work that needs your attention.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {can('admin.tickets.edit') && <Button asChild className="cc-gold-button"><Link href="/tickets/create"><Plus className="size-4" />New Ticket</Link></Button>}
          {can('admin.storms.view') && <Button asChild variant="glass" className="border-white/20 text-white hover:bg-white/15 hover:text-white"><Link href="/admin/storms">View storm events<ArrowUpRight className="size-4" /></Link></Button>}
        </div>
      </div>
      <div className="cc-hero-signature" aria-hidden="true"><Zap className="size-5" /><span>GRID / FIELD OPERATIONS</span></div>
    </section>
    <DashboardMetrics />
    <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-3">
      {can('admin.tickets.view') && <DashboardRecentTickets />}
      <Card className="cc-quick-actions">
        <CardHeader><div className="cc-eyebrow mb-1">Keep things moving</div><CardTitle>Quick actions</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {quickActions.filter(action => mayOpenPath(action.href, permissions)).map(action => <Link key={action.href} href={action.href} className="cc-action-link group">
            <span className="cc-action-icon"><action.icon className="size-[18px]" /></span>
            <span className="min-w-0 flex-1"><strong>{action.label}</strong><small>{action.description}</small></span><ArrowRight className="size-4 shrink-0" />
          </Link>)}
          {can('admin.tickets.edit') && <Link href="/tickets/create?important=true" className="cc-dispatch-link"><Zap className="size-4" />Emergency dispatch<ArrowUpRight className="ml-auto size-4" /></Link>}
        </CardContent>
      </Card>
    </div>
  </div>;
}
