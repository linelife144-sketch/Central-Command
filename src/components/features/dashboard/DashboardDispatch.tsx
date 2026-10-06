'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users,
  ArrowRight,
  Plus,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Search,
  Filter,
  UserCheck,
  HardHat,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/components/providers/AuthProvider';
import { ticketService } from '@/lib/services/ticketService';
import { ticketAssessmentWorkflow, type DispatchOptions } from '@/lib/services/ticketAssessmentWorkflow';
import { TicketImportanceBadge } from '@/components/features/tickets/TicketImportanceBadge';
import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { GRID_TICKETS_CHANGED_EVENT, GRID_TICKETS_VERSION_KEY, notifyTicketsChanged } from '@/lib/tickets/events';
import { formatAddress } from '@/lib/utils/formatters';
import type { Ticket } from '@/types';

const selectClass = 'min-h-11 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all';

type DispatchFilter = 'ALL' | 'NEEDS_LEAD' | 'NEEDS_CREW' | 'DISPATCHED';

export function DashboardDispatch() {
  const { profile, can } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTicketId = searchParams?.get('dispatchTicketId') || null;

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(initialTicketId);
  const [filter, setFilter] = useState<DispatchFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState<DispatchOptions | null>(null);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Form states for dispatch actions
  const [lead, setLead] = useState('');
  const [crew, setCrew] = useState('');
  const [driver, setDriver] = useState('');
  const [assessor, setAssessor] = useState('');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const isChief = profile?.role === 'CEO' || profile?.role === 'SUPER_ADMIN';
  const canEdit = can('admin.tickets.edit');

  // Load all open / dispatchable tickets
  const loadTickets = useCallback(async () => {
    try {
      setError('');
      const all = await ticketService.getTickets();
      // Filter to tickets eligible for dispatch
      const dispatchable = all.filter(t => ['DRAFT', 'ASSIGNED', 'NEEDS_REWORK'].includes(t.status));
      setTickets(dispatchable);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load tickets for dispatch.');
    } finally {
      setIsLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  // Listen for tickets changed events
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void loadTickets(), 200);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === GRID_TICKETS_VERSION_KEY) schedule();
    };
    window.addEventListener(GRID_TICKETS_CHANGED_EVENT, schedule);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(GRID_TICKETS_CHANGED_EVENT, schedule);
      window.removeEventListener('storage', onStorage);
      if (timer) clearTimeout(timer);
    };
  }, [loadTickets]);

  // Sync selectedTicketId if query param changes or on initial load
  useEffect(() => {
    if (initialTicketId) {
      setSelectedTicketId(initialTicketId);
      // Smoothly scroll to the dispatch section
      const el = document.getElementById('dispatch');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [initialTicketId]);

  // Ensure a ticket is selected if tickets exist and none is currently selected
  useEffect(() => {
    if (!selectedTicketId && tickets.length > 0) {
      // Prioritize tickets awaiting lead, then crew
      const needsLead = tickets.find(t => !t.team_lead_id);
      const needsCrew = tickets.find(t => t.team_lead_id && !t.crew_id);
      const firstCandidate = needsLead || needsCrew || tickets[0];
      setSelectedTicketId(firstCandidate.id);
    } else if (selectedTicketId && !tickets.some(t => t.id === selectedTicketId) && tickets.length > 0) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  const selectedTicket = useMemo(() => {
    return tickets.find(t => t.id === selectedTicketId) || null;
  }, [tickets, selectedTicketId]);

  // Load dispatch options for selected ticket
  const loadOptions = useCallback(async (ticketId: string) => {
    setIsLoadingOptions(true);
    try {
      const opts = await ticketAssessmentWorkflow.options(ticketId);
      setOptions(opts);
    } catch (err) {
      setOptions(null);
      // Not failing hard if ticket is fresh
    } finally {
      setIsLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTicket?.id) {
      void loadOptions(selectedTicket.id);
      // Reset form controls
      setLead(selectedTicket.team_lead_id || '');
      setCrew(selectedTicket.crew_id || '');
      setCreating(false);
      setDriver('');
      setAssessor('');
      setName('');
    } else {
      setOptions(null);
    }
  }, [selectedTicket?.id, selectedTicket?.team_lead_id, selectedTicket?.crew_id, loadOptions]);

  const runAction = async (fn: () => Promise<unknown>, successMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(successMsg);
      notifyTicketsChanged();
      await loadTickets();
      if (selectedTicket?.id) {
        await loadOptions(selectedTicket.id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Dispatch operation failed.');
    } finally {
      setBusy(false);
    }
  };

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (filter === 'NEEDS_LEAD' && t.team_lead_id) return false;
      if (filter === 'NEEDS_CREW' && (!t.team_lead_id || t.crew_id)) return false;
      if (filter === 'DISPATCHED' && !t.crew_id) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = t.ticket_number?.toLowerCase().includes(q);
        const matchesClient = t.utility_client?.toLowerCase().includes(q);
        const matchesAddress = t.address?.toLowerCase().includes(q) || t.city?.toLowerCase().includes(q);
        return matchesNumber || matchesClient || matchesAddress;
      }
      return true;
    });
  }, [tickets, filter, searchQuery]);

  // Counts for filter pills
  const counts = useMemo(() => {
    let needsLead = 0;
    let needsCrew = 0;
    let dispatched = 0;
    tickets.forEach(t => {
      if (!t.team_lead_id) needsLead++;
      else if (!t.crew_id) needsCrew++;
      else dispatched++;
    });
    return { all: tickets.length, needsLead, needsCrew, dispatched };
  }, [tickets]);

  const assignedCrew = options?.crews.find(c => c.id === selectedTicket?.crew_id);
  const assignedTeamLead = options?.teamLeads.find(l => l.id === selectedTicket?.team_lead_id);

  return (
    <section id="dispatch" className="cc-work-panel scroll-mt-24 p-6 transition-all" aria-labelledby="dispatch-heading">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <div className="cc-eyebrow mb-1 flex items-center gap-1.5 text-grid-blue">
            <Users className="size-3.5" />
            Field Operations Dispatch
          </div>
          <h2 id="dispatch-heading" className="font-heading text-2xl font-bold tracking-tight text-grid-navy">
            Team & crew dispatch
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign incoming tickets to active Admin team leads and driver/assessor field crews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void loadTickets();
              if (selectedTicket?.id) void loadOptions(selectedTicket.id);
            }}
            disabled={busy || isLoadingTickets}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`size-3.5 ${busy || isLoadingTickets ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Main Grid: Queue on left, Dispatch Console on right */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Dispatch Queue (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search ticket #, utility, city..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setFilter('ALL')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  filter === 'ALL'
                    ? 'bg-grid-navy text-white shadow-xs'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                All ({counts.all})
              </button>
              <button
                type="button"
                onClick={() => setFilter('NEEDS_LEAD')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  filter === 'NEEDS_LEAD'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
                }`}
              >
                Needs Lead ({counts.needsLead})
              </button>
              <button
                type="button"
                onClick={() => setFilter('NEEDS_CREW')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  filter === 'NEEDS_CREW'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300'
                }`}
              >
                Needs Crew ({counts.needsCrew})
              </button>
              <button
                type="button"
                onClick={() => setFilter('DISPATCHED')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  filter === 'DISPATCHED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                }`}
              >
                Dispatched ({counts.dispatched})
              </button>
            </div>
          </div>

          {/* Ticket Queue List */}
          <div className="max-h-[540px] space-y-2.5 overflow-y-auto pr-1">
            {isLoadingTickets ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading dispatch queue…</div>
            ) : filteredTickets.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No tickets matching this filter.
              </div>
            ) : (
              filteredTickets.map(ticket => {
                const isSelected = ticket.id === selectedTicketId;
                const needsLead = !ticket.team_lead_id;
                const needsCrew = ticket.team_lead_id && !ticket.crew_id;

                return (
                  <div
                    key={ticket.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedTicketId(ticket.id);
                      }
                    }}
                    className={`group cursor-pointer rounded-xl border p-3.5 transition-all ${
                      isSelected
                        ? 'border-grid-blue bg-blue-50/60 shadow-xs ring-1 ring-grid-blue dark:bg-blue-950/30'
                        : 'border-border bg-card hover:border-border-strong hover:bg-accent/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-grid-navy dark:text-slate-100">
                            {ticket.ticket_number}
                          </span>
                          <TicketImportanceBadge isImportant={ticket.is_important} />
                        </div>
                        <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                          {ticket.utility_client} • {formatAddress(ticket.address ?? null, ticket.city ?? null, ticket.state ?? null, ticket.zip_code ?? null)}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        {needsLead ? (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                            Needs Lead
                          </span>
                        ) : needsCrew ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                            Needs Crew
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                            Dispatched
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Dispatch Action Console (7 cols) */}
        <div className="space-y-5 rounded-2xl border border-border/80 bg-background/50 p-5 lg:col-span-7">
          {selectedTicket ? (
            <>
              {/* Selected Ticket Overview */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-heading text-xl font-bold text-grid-navy">
                      Ticket {selectedTicket.ticket_number}
                    </h3>
                    <TicketImportanceBadge isImportant={selectedTicket.is_important} />
                    <StatusBadge status={selectedTicket.status} size="sm" />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedTicket.utility_client} • {formatAddress(selectedTicket.address ?? null, selectedTicket.city ?? null, selectedTicket.state ?? null, selectedTicket.zip_code ?? null)}
                  </p>
                  {selectedTicket.work_description && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground/90 bg-muted/40 rounded-lg p-2.5">
                      {selectedTicket.work_description}
                    </p>
                  )}
                </div>

                <Button variant="ghost" size="sm" asChild className="shrink-0 gap-1 text-xs">
                  <Link href={`/tickets/${selectedTicket.id}`} target="_blank">
                    Ticket details
                    <ExternalLink className="size-3.5" />
                  </Link>
                </Button>
              </div>

              {/* Current Assignment Status */}
              <div className="rounded-xl border bg-card p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-grid-blue" />
                  Current Assignment Status
                </h4>

                <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                  <div className="rounded-lg bg-muted/30 p-2.5">
                    <dt className="text-xs text-muted-foreground">Team Lead</dt>
                    <dd className="mt-1 font-semibold text-grid-navy flex items-center gap-1.5">
                      {assignedTeamLead?.name || (selectedTicket.team_lead_id ? 'Assigned team lead' : (
                        <span className="text-amber-700 dark:text-amber-400 font-normal">Awaiting team lead</span>
                      ))}
                    </dd>
                  </div>

                  <div className="rounded-lg bg-muted/30 p-2.5">
                    <dt className="text-xs text-muted-foreground">Crew</dt>
                    <dd className="mt-1 font-semibold text-grid-navy flex items-center gap-1.5">
                      {assignedCrew?.name || (selectedTicket.crew_id ? 'Assigned crew' : (
                        <span className="text-blue-700 dark:text-blue-400 font-normal">Awaiting crew</span>
                      ))}
                    </dd>
                  </div>

                  {assignedCrew && (
                    <>
                      <div className="rounded-lg bg-muted/20 p-2.5">
                        <dt className="text-xs text-muted-foreground">Driver</dt>
                        <dd className="mt-1 font-medium">{assignedCrew.driverName}</dd>
                      </div>
                      <div className="rounded-lg bg-muted/20 p-2.5">
                        <dt className="text-xs text-muted-foreground">Damage Assessor</dt>
                        <dd className="mt-1 font-medium">{assignedCrew.assessorName}</dd>
                      </div>
                    </>
                  )}
                </dl>
              </div>

              {/* Dispatch Assignment Controls */}
              {canEdit && (
                <fieldset disabled={busy || isLoadingOptions} className="space-y-5 pt-2">
                  {/* Step 1: Pass to Team Lead (Chief only) */}
                  {isChief && (
                    <div className="space-y-2.5 rounded-xl border p-4 bg-card">
                      <Label htmlFor="dispatch-lead" className="font-semibold text-sm">
                        Step 1: Pass to team lead (Admin)
                      </Label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <select
                          id="dispatch-lead"
                          className={selectClass}
                          value={lead}
                          onChange={e => setLead(e.target.value)}
                        >
                          <option value="">Select an active Admin team lead</option>
                          {options?.teamLeads.map(l => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          disabled={!lead || lead === selectedTicket.team_lead_id || busy}
                          onClick={() =>
                            void runAction(
                              () => ticketAssessmentWorkflow.assignLead(selectedTicket.id, lead),
                              'Ticket passed to team lead'
                            )
                          }
                          className="sm:w-auto shrink-0 gap-1.5"
                        >
                          Assign lead
                          <ArrowRight className="size-4" />
                        </Button>
                      </div>
                      {!options?.teamLeads.length && !isLoadingOptions && (
                        <p className="text-xs text-muted-foreground">
                          No active Admin team lead accounts yet. A storm manager must provision a staff account with the Team lead (Admin) role before dispatch.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Step 2: Assign Crew (When lead is assigned) */}
                  {selectedTicket.team_lead_id ? (
                    <div className="space-y-4 rounded-xl border p-4 bg-card">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="dispatch-crew" className="font-semibold text-sm">
                          Step 2: Assign field crew (Driver & Damage Assessor)
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCreating(v => !v)}
                          className="h-8 gap-1 text-xs"
                        >
                          <Plus className="size-3.5" />
                          {creating ? 'Cancel crew setup' : 'Create new crew'}
                        </Button>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <select
                          id="dispatch-crew"
                          className={selectClass}
                          value={crew}
                          onChange={e => setCrew(e.target.value)}
                        >
                          <option value="">Select a driver / assessor crew</option>
                          {options?.crews
                            .filter(c => c.teamLeadId === selectedTicket.team_lead_id)
                            .map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name} · {c.driverName} (Driver) / {c.assessorName} (Assessor)
                              </option>
                            ))}
                        </select>
                        <Button
                          disabled={!crew || crew === selectedTicket.crew_id || busy}
                          onClick={() =>
                            void runAction(
                              () => ticketAssessmentWorkflow.assignCrew(selectedTicket.id, crew),
                              'Ticket assigned to field crew'
                            )
                          }
                          className="sm:w-auto shrink-0 gap-1.5"
                        >
                          Assign crew
                          <ArrowRight className="size-4" />
                        </Button>
                      </div>

                      {/* Crew Creation Form */}
                      {creating && (
                        <div className="mt-3 space-y-3.5 rounded-xl border border-grid-blue/30 bg-grid-shell/80 p-4">
                          <div className="flex items-center gap-2">
                            <HardHat className="size-4 text-grid-blue" />
                            <span className="text-xs font-bold uppercase tracking-wider text-grid-navy">
                              Create New Response Crew
                            </span>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="crew-name" className="text-xs font-medium">Crew Name</Label>
                            <Input
                              id="crew-name"
                              value={name}
                              onChange={e => setName(e.target.value)}
                              maxLength={100}
                              placeholder="e.g. Alpha Unit 01"
                              className="text-sm"
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label htmlFor="crew-driver" className="text-xs font-medium">Driver</Label>
                              <select
                                id="crew-driver"
                                className={selectClass}
                                value={driver}
                                onChange={e => setDriver(e.target.value)}
                              >
                                <option value="">Choose eligible driver</option>
                                {options?.workers
                                  .filter(w => w.role === 'DRIVER' && !options.crews.some(c => c.driverId === w.id))
                                  .map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                  ))}
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="crew-assessor" className="text-xs font-medium">Damage Assessor</Label>
                              <select
                                id="crew-assessor"
                                className={selectClass}
                                value={assessor}
                                onChange={e => setAssessor(e.target.value)}
                              >
                                <option value="">Choose eligible assessor</option>
                                {options?.workers
                                  .filter(w => ['DAMAGE_ASSESSER', 'SR_DAMAGE_ASSESSER'].includes(w.role) && !options.crews.some(c => c.assessorId === w.id))
                                  .map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                  ))}
                              </select>
                            </div>
                          </div>

                          <p className="text-[11px] text-muted-foreground">
                            Both contractors must be active, onboarded, and eligible. Each contractor belongs to one active crew for this storm.
                          </p>

                          <Button
                            disabled={!name.trim() || !driver || !assessor || busy}
                            onClick={() =>
                              void runAction(
                                async () => {
                                  await ticketAssessmentWorkflow.createCrew(
                                    selectedTicket.id,
                                    selectedTicket.team_lead_id!,
                                    driver,
                                    assessor,
                                    name
                                  );
                                  setCreating(false);
                                  setDriver('');
                                  setAssessor('');
                                  setName('');
                                },
                                'Field crew created. Select it above to assign this ticket.'
                              )
                            }
                            className="w-full gap-2"
                          >
                            <Users className="size-4" />
                            Save crew
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground bg-muted/20">
                      Pass this ticket to an Admin team lead first to unlock crew assignment.
                    </div>
                  )}
                </fieldset>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              <Users className="mx-auto size-8 text-muted-foreground/50 mb-2" />
              <p className="font-medium">No ticket selected</p>
              <p className="text-xs mt-1">Select a ticket from the queue on the left to review its team and crew assignment.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
