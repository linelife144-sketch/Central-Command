'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, CircleCheck, Clock, CloudLightning, FileCheck2, MapPin, Radio, Receipt, RefreshCw, Ticket, Users, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/common/data-display/MetricCard';
import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { TicketStatusBadge } from '@/components/features/tickets/TicketStatusBadge';
import { DashboardDispatch } from '@/components/features/dashboard/DashboardDispatch';
import { SignalField } from '@/components/common/brand/SignalField';
import { useAuth } from '@/components/providers/AuthProvider';
import { formatCurrency, formatDateTime, formatDuration } from '@/lib/utils/formatters';
import type { ContractorDashboardData } from '@/lib/services/contractorDashboardService';
import styles from './dashboard.module.css';

const actions = [
  { href: '#dispatch', label: 'Team & crew', description: 'See the crew assigned to your tickets', icon: Users },
  { href: '/contractor/time', label: 'Time tracking', description: 'Clock in, clock out, and review your hours', icon: Clock },
  { href: '/contractor/map', label: 'Field map', description: 'Find your assigned work in the field', icon: MapPin },
  { href: '/contractor/expenses/create', label: 'Add an expense', description: 'Capture a receipt and submit your costs', icon: Receipt },
  { href: '/tickets', label: 'Assess a ticket', description: 'Open an assigned ticket to record damage', icon: FileCheck2 },
];

function LoadingPanel() {
  return <p role="status" className="py-8 text-center text-sm text-muted-foreground">Loading your summary…</p>;
}

export default function ContractorDashboardPage() {
  const { profile } = useAuth();
  const profileId = profile?.id;
  const [result, setResult] = useState<{ profileId: string; data: ContractorDashboardData }>();
  const [failure, setFailure] = useState<{ profileId: string; message: string }>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const data = result?.profileId === profileId ? result?.data : undefined;
  const error = failure?.profileId === profileId ? failure?.message : '';
  const loading = !data && !error;

  useEffect(() => {
    if (!profileId) return;
    const controller = new AbortController();
    async function load() {
      setRefreshing(true);
      try {
        const response = await fetch('/api/contractor/dashboard', { cache: 'no-store', signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) setResult(undefined);
          throw new Error(payload.error || 'Unable to load your dashboard.');
        }
        if (!controller.signal.aborted) { setResult({ profileId: profileId!, data: payload }); setFailure(undefined); }
      } catch (cause) {
        if (!controller.signal.aborted) setFailure({ profileId: profileId!, message: !navigator.onLine
          ? 'Reconnect to refresh your dashboard. Your field tools are still available from the links below.'
          : cause instanceof Error ? cause.message : 'Unable to load your dashboard.' });
      } finally {
        if (!controller.signal.aborted) setRefreshing(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [profileId, refreshKey]);

  useEffect(() => {
    const refresh = () => { if (navigator.onLine && document.visibilityState === 'visible') setRefreshKey(key => key + 1); };
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('time-entries-synced', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); window.removeEventListener('time-entries-synced', refresh); };
  }, []);

  const value = (available: boolean, formatted: string | number) => loading ? '…' : available ? formatted : 'Unavailable';
  const firstName = data?.firstName || profile?.first_name;
  const activeShift = data?.time?.active;
  const corrections = [
    { count: data?.tickets?.needsRework ?? 0, label: 'ticket(s) need rework', href: '/tickets' },
    { count: data?.time?.rejectedCount ?? 0, label: 'recent time entry/entries need correction', href: '/contractor/time' },
    { count: data?.expenses?.rejectedCount ?? 0, label: 'expense report(s) need correction', href: '/contractor/expenses' },
  ].filter(item => item.count > 0);

  return <div className="space-y-6 sm:space-y-7">
    <section className={styles.hero} aria-labelledby="contractor-dashboard-title">
      <SignalField className={styles.signal} />
      <div className={styles.welcome}>
        <div className="cc-eyebrow"><span aria-hidden="true" />Your field dashboard</div>
        <h1 id="contractor-dashboard-title">Welcome{firstName ? ',' : ' back.'}<br />{firstName ? <em>{firstName}.</em> : <em>Ready for what’s next.</em>}</h1>
        <p>Your assignments, hours, and expenses. A clear view of the work ahead.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="cc-gold-button"><Link href="/tickets"><Ticket className="size-4" />My tickets<ArrowUpRight className="size-4" /></Link></Button>
          <Button asChild variant="glass" className="border-white/20 text-white hover:bg-white/15 hover:text-white"><Link href="/contractor/time"><Clock className="size-4" />Open time clock</Link></Button>
        </div>
      </div>
      <div className={styles.shift}>
        <div className={styles.shiftHeading}><Radio className="size-4" />Shift status</div>
        <div className={styles.shiftTitle}>{loading ? 'Loading…' : !data?.time ? 'Status unavailable' : activeShift ? 'On the clock.' : 'Ready when you are.'}</div>
        <p>{activeShift ? `Clocked in ${formatDateTime(activeShift.clock_in_at)}.` : data?.time ? 'Start your next shift from Time Tracking when you are ready to begin.' : 'Refresh your dashboard to see your current shift.'}</p>
        <Link href="/contractor/time">{activeShift ? 'View active shift' : 'Go to time tracking'}<ArrowRight className="size-4" /></Link>
      </div>
    </section>

    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="cc-section-heading">Your work at a glance</h2><p className="mt-1 text-xs text-muted-foreground">Time and wages cover completed shifts from the last 7 days.</p></div>
      <Button variant="ghost" size="sm" disabled={refreshing || !profileId} onClick={() => setRefreshKey(key => key + 1)} aria-label="Refresh contractor dashboard"><RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh</Button>
    </div>
    {error && <div role="alert" className="rounded-xl border border-grid-danger/20 bg-grid-danger-soft p-4 text-sm text-grid-danger-ink">{error}{data && <span className="mt-1 block text-xs">Showing the last successful refresh.</span>}</div>}
    {data?.unavailable.length ? <div role="status" className="rounded-xl border border-grid-warning/25 bg-grid-warning-soft p-4 text-sm text-grid-warning-ink">Some data could not be loaded: {data.unavailable.join(', ')}. Use Refresh to try again.</div> : null}
    <div className="stagger-children grid grid-cols-2 gap-3 xl:grid-cols-4 sm:gap-4">
      <MetricCard title="Open tickets" value={value(!!data?.tickets, data?.tickets?.open ?? 0)} description="Currently assigned to you" icon={<Ticket className="size-4" />} variant="accent" />
      <MetricCard title="Submitted hours" value={value(!!data?.time, formatDuration(data?.time?.minutes ?? 0))} description="Completed shifts · last 7 days" icon={<Clock className="size-4" />} />
      <MetricCard title="Submitted wages" value={value(!!data?.time, data?.time?.wages === null ? 'Awaiting calculation' : formatCurrency(data?.time?.wages ?? 0))} description="Includes time awaiting review" icon={<Wallet className="size-4" />} />
      <MetricCard title="Expenses in review" value={value(!!data?.expenses, formatCurrency(data?.expenses?.pendingAmount ?? 0))} description="Submitted and under review" icon={<Receipt className="size-4" />} variant="warning" />
    </div>
    {corrections.length > 0 && <div className={styles.attention} aria-label="Items needing your attention"><span className="font-semibold">Needs your attention</span>{corrections.map(item => <Link key={item.href} href={item.href}>{item.count} {item.label}<ArrowUpRight className="size-3.5" /></Link>)}</div>}

    <div className="grid min-w-0 gap-6 xl:grid-cols-3">
      <Card className="min-w-0 xl:col-span-2">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3 sm:flex-row">
          <div><div className="cc-eyebrow mb-2"><span aria-hidden="true" />Your next move</div><CardTitle>Assigned work</CardTitle><p className="mt-2 text-xs text-muted-foreground">Important tickets first, then the nearest due dates.</p></div>
          <Button variant="ghost" size="sm" asChild><Link href="/tickets">View all<ArrowUpRight className="size-4" /></Link></Button>
        </CardHeader>
        <CardContent>
          {loading ? <LoadingPanel /> : !data?.tickets ? <p className="py-8 text-sm text-muted-foreground">Your assigned work could not be loaded.</p> : data.tickets.recent.length ? <div className="divide-y divide-border">
            {data.tickets.recent.map(ticket => <Link key={ticket.id} href={`/tickets/${ticket.id}`} className={styles.ticket}>
              <span className={styles.ticketIcon}><Ticket className="size-4" /></span>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-grid-navy">#{ticket.ticket_number}</strong>{ticket.is_important && <span className={styles.important}>Important</span>}<TicketStatusBadge status={ticket.status} audienceRole="CONTRACTOR" size="sm" /></div><p className="mt-1.5 text-sm text-grid-navy">{[ticket.address, ticket.city, ticket.state].filter(Boolean).join(', ') || 'Location not provided'}</p><p className="mt-1 text-xs text-muted-foreground">{ticket.utility_client}{ticket.due_date ? ` · Due ${formatDateTime(ticket.due_date)}` : ' · No due date set'}</p></div>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>)}
          </div> : <div className={styles.empty}><div className={styles.emptyIcon}><CircleCheck className="size-7" /></div><h3>No open assignments.</h3><p>{data.tickets.closed ? 'Your assigned work is closed. New tickets will appear here when your team assigns work to you.' : 'You’re set up and ready. Tickets will appear here when your team assigns work to you.'}</p><Button asChild variant="outline" size="sm"><Link href="/tickets">View my tickets<ArrowRight className="size-4" /></Link></Button></div>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><div className="cc-eyebrow mb-2"><span aria-hidden="true" />Field tools</div><CardTitle>Quick actions</CardTitle></CardHeader>
        <CardContent>{actions.map(action => <Link key={action.href} href={action.href} className="cc-action-link group"><span className="cc-action-icon"><action.icon className="size-[18px]" /></span><span className="min-w-0 flex-1"><strong>{action.label}</strong><small>{action.description}</small></span><ArrowRight className="size-4 shrink-0" /></Link>)}</CardContent>
      </Card>
      <Card className="min-w-0 xl:col-span-2">
        <CardHeader><div className="cc-eyebrow mb-2"><span aria-hidden="true" />The bigger picture</div><CardTitle>Your storm work</CardTitle><p className="mt-2 text-xs text-muted-foreground">Storms with open tickets assigned to you.</p></CardHeader>
        <CardContent>{loading ? <LoadingPanel /> : !data?.storms ? <p className="text-sm text-muted-foreground">Storm details could not be loaded.</p> : data.storms.length ? <div className="grid gap-3 sm:grid-cols-2">{data.storms.map(storm => <div key={storm.id} className={styles.storm}><CloudLightning className="size-5 shrink-0 text-grid-blue" /><div className="min-w-0 flex-1"><h3 className="text-sm font-bold text-grid-navy">{storm.name}</h3><p className="mt-1 text-xs text-muted-foreground">{[storm.utility_client, storm.region].filter(Boolean).join(' · ')}</p><div className="mt-3 flex flex-wrap items-center gap-2"><StatusBadge status={storm.status} size="sm" /><span className="text-xs font-semibold text-grid-navy">{storm.openTickets} open {storm.openTickets === 1 ? 'ticket' : 'tickets'}</span></div></div></div>)}</div> : <p className="rounded-xl border border-dashed border-border bg-surface-sunken px-5 py-6 text-sm leading-relaxed text-muted-foreground">Your storm work will appear here when storm tickets are assigned to you.</p>}</CardContent>
      </Card>
      <Card>
        <CardHeader><div className="cc-eyebrow mb-2"><span aria-hidden="true" />Keep it moving</div><CardTitle>Review snapshot</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Link href="/contractor/time" className={styles.reviewRow}><span>Time entries in review<small>Completed in the last 7 days</small></span><strong>{value(!!data?.time, data?.time?.pendingCount ?? 0)}</strong></Link>
          <Link href="/contractor/expenses" className={styles.reviewRow}><span>Expense reports in review<small>All submitted reports</small></span><strong>{value(!!data?.expenses, data?.expenses?.pendingCount ?? 0)}</strong></Link>
          <Link href="/contractor/expenses" className={styles.reviewRow}><span>Approved expenses<small>Approved reports awaiting payment</small></span><strong>{value(!!data?.expenses, formatCurrency(data?.expenses?.approvedAmount ?? 0))}</strong></Link>
          {!!data?.expenses?.draftCount && <Link href="/contractor/expenses" className="cc-dispatch-link"><Receipt className="size-4" />{data.expenses.draftCount} draft expense {data.expenses.draftCount === 1 ? 'report' : 'reports'}<ArrowUpRight className="ml-auto size-4" /></Link>}
          <p className="text-xs leading-relaxed text-muted-foreground">Wages and approved expenses are review totals. Payment is handled separately.</p>
        </CardContent>
      </Card>
    </div>
    <Suspense fallback={<p role="status" className="py-8 text-center text-sm text-muted-foreground">Loading your team and crew…</p>}>
      <DashboardDispatch
        tickets={data?.dispatchTickets}
        isLoading={loading}
        isUnavailable={Boolean(data && !data.dispatchTickets)}
      />
    </Suspense>
    {data && <p className="text-right text-[11px] text-muted-foreground" aria-live="polite">Last refreshed {formatDateTime(data.generatedAt)} · Refreshes every minute while you’re here</p>}
  </div>;
}
