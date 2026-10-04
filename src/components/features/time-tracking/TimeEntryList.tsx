'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, CheckCheck, Loader2, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

import { DataTable, type Column } from '@/components/common/data-display/DataTable';
import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type TimeEntryListFilters,
  type TimeEntryListItem,
  timeEntryManagementService,
} from '@/lib/services/timeEntryManagementService';
import { formatCurrency, formatDate, formatDuration } from '@/lib/utils/formatters';
import {
  calculateTimeEntrySummary,
  resolveBillableMinutesForEntry,
  resolveTotalMinutesForEntry,
} from '@/lib/utils/timeTracking';
import { timeEntryMoney } from '@/lib/utils/payroll';
import type { TimeEntryStatus } from '@/types';

import { TimeEntryCard } from './TimeEntryCard';

type StatusFilterValue = TimeEntryStatus | 'ALL';

type ReviewDecision = Extract<TimeEntryStatus, 'APPROVED' | 'REJECTED'>;

export const TIME_REVIEW_FILTER_CONTROL_CLASS =
  'border border-border bg-surface-raised text-grid-navy shadow-none focus-visible:border-border focus-visible:ring-[2px] focus-visible:ring-[#ffc038]';

export function getTimeReviewLayoutMode() {
  return 'operations-grid';
}

export interface TimeEntryListProps {
  mode: 'contractor' | 'admin';
  canEdit?: boolean;
  refreshKey?: number;
  contractorId?: string;
  reviewerId?: string;
}

function toStartOfDayIso(dateValue: string): string | undefined {
  if (!dateValue) {
    return undefined;
  }

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function toEndOfDayIso(dateValue: string): string | undefined {
  if (!dateValue) {
    return undefined;
  }

  const date = new Date(`${dateValue}T23:59:59.999`);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function parseError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unable to process time entries.';
}

function toWorkTypeLabel(workType: string): string {
  return workType
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function TimeEntryList({ mode, contractorId, reviewerId, canEdit = true, refreshKey = 0 }: TimeEntryListProps) {
  const [entries, setEntries] = useState<TimeEntryListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);

  const loadEntries = useCallback(async () => {
    if (mode === 'contractor' && !contractorId) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const filters: TimeEntryListFilters = {
      status: statusFilter,
      from: toStartOfDayIso(fromDate),
      to: toEndOfDayIso(toDate),
    };

    if (mode === 'contractor' && contractorId) {
      filters.contractorId = contractorId;
    }

    try {
      const data = await timeEntryManagementService.listEntries(filters);
      setEntries(data);
    } catch (loadError) {
      setEntries([]);
      setError(parseError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, mode, statusFilter, contractorId, toDate]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries, refreshKey]);

  useEffect(() => {
    setSelectedEntryIds((previous) => previous.filter((id) => entries.some((entry) => entry.id === id)));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return entries;
    }

    return entries.filter((entry) => {
      const searchableValues = [
        entry.id,
        entry.contractor_name,
        entry.contractor_id,
        entry.ticket_number,
        entry.ticket_id,
        entry.work_type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableValues.includes(normalizedSearch);
    });
  }, [entries, searchTerm]);

  const summary = useMemo(() => calculateTimeEntrySummary(filteredEntries), [filteredEntries]);

  const selectedPendingEntries = useMemo(
    () => filteredEntries.filter((entry) => selectedEntryIds.includes(entry.id) && entry.status === 'PENDING'),
    [filteredEntries, selectedEntryIds],
  );

  const updateSelected = useCallback((entryId: string, selected: boolean) => {
    setSelectedEntryIds((current) => {
      if (selected) {
        return current.includes(entryId) ? current : [...current, entryId];
      }

      return current.filter((id) => id !== entryId);
    });
  }, []);

  const reviewEntryInternal = useCallback(
    async (
      entry: TimeEntryListItem,
      decision: ReviewDecision,
      rejectionReason?: string,
    ): Promise<TimeEntryListItem> => {
      if (!reviewerId) {
        throw new Error('You must be signed in as an admin to review time entries.');
      }

      const reviewed = await timeEntryManagementService.reviewEntry({
        entryId: entry.id,
        reviewerId,
        decision,
        rejectionReason,
      });

      const merged: TimeEntryListItem = {
        ...entry,
        ...reviewed,
      };

      setEntries((current) => current.map((item) => (item.id === entry.id ? merged : item)));
      setSelectedEntryIds((current) => current.filter((id) => id !== entry.id));
      return merged;
    },
    [reviewerId],
  );

  const handleSingleDecision = useCallback(
    async (entry: TimeEntryListItem, decision: ReviewDecision) => {
      let rejectionReason: string | undefined;

      if (decision === 'REJECTED') {
        const reason = window.prompt('Rejection reason (required):', entry.rejection_reason ?? '');
        if (reason === null) {
          return;
        }

        rejectionReason = reason.trim();
      }

      setIsSubmitting(true);
      try {
        await reviewEntryInternal(entry, decision, rejectionReason);
        toast.success(decision === 'APPROVED' ? 'Time entry approved.' : 'Time entry rejected.');
      } catch (reviewError) {
        toast.error(parseError(reviewError));
      } finally {
        setIsSubmitting(false);
      }
    },
    [reviewEntryInternal],
  );

  const handleBatchDecision = useCallback(
    async (decision: ReviewDecision) => {
      if (selectedPendingEntries.length === 0) {
        toast.error('Select at least one pending entry.');
        return;
      }

      let rejectionReason: string | undefined;
      if (decision === 'REJECTED') {
        const reason = window.prompt('Rejection reason for selected entries (required):', '');
        if (reason === null) {
          return;
        }

        rejectionReason = reason.trim();
      }

      setIsSubmitting(true);
      let successCount = 0;
      let failureCount = 0;

      for (const entry of selectedPendingEntries) {
        try {
          await reviewEntryInternal(entry, decision, rejectionReason);
          successCount += 1;
        } catch {
          failureCount += 1;
        }
      }

      setIsSubmitting(false);

      if (successCount > 0) {
        toast.success(
          decision === 'APPROVED'
            ? `${successCount} time entr${successCount === 1 ? 'y' : 'ies'} approved.`
            : `${successCount} time entr${successCount === 1 ? 'y' : 'ies'} rejected.`,
        );
      }

      if (failureCount > 0) {
        toast.error(`${failureCount} entr${failureCount === 1 ? 'y failed' : 'ies failed'} to update.`);
      }
    },
    [reviewEntryInternal, selectedPendingEntries],
  );

  const columns = useMemo<Column<TimeEntryListItem>[]>(() => {
    const baseColumns: Column<TimeEntryListItem>[] = [];

    if (mode === 'admin') {
      baseColumns.push({
        key: 'select',
        header: 'Select',
        cell: (entry) => (
          <Checkbox
            checked={selectedEntryIds.includes(entry.id)}
            disabled={entry.status !== 'PENDING' || isSubmitting}
            onCheckedChange={(checked) => updateSelected(entry.id, checked === true)}
            aria-label={`Select ${entry.id}`}
          />
        ),
      });

      baseColumns.push({
        key: 'contractor_name',
        header: 'Contractor',
        cell: (entry) => entry.contractor_name ?? entry.contractor_id,
      });
    }

    baseColumns.push(
      {
        key: 'ticket_number',
        header: 'Ticket',
        cell: (entry) => entry.ticket_number ?? entry.ticket_id ?? '-',
      },
      {
        key: 'date',
        header: 'Date',
        cell: (entry) => formatDate(entry.clock_in_at),
      },
      {
        key: 'work_type',
        header: 'Type',
        cell: (entry) => toWorkTypeLabel(entry.work_type),
      },
      {
        key: 'duration',
        header: 'Duration',
        cell: (entry) => formatDuration(resolveTotalMinutesForEntry(entry)),
      },
      {
        key: 'billable',
        header: 'Billable',
        cell: (entry) => formatDuration(resolveBillableMinutesForEntry(entry)),
      },
      {
        key: 'wages',
        header: 'Wages',
        cell: entry => timeEntryMoney(entry).wage === undefined ? '—' : formatCurrency(timeEntryMoney(entry).wage!),
      },
      {
        key: 'reimbursement', header: 'Approved Reimbursement',
        cell: entry => timeEntryMoney(entry).reimbursement === undefined ? '—' : formatCurrency(timeEntryMoney(entry).reimbursement!),
      },
      {
        key: 'payout', header: 'Total Payout',
        cell: entry => timeEntryMoney(entry).payout === undefined ? '—' : formatCurrency(timeEntryMoney(entry).payout!),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (entry) => (
          <StatusBadge
            status={entry.status}
            variant={entry.status === 'APPROVED' ? 'approved' : entry.status === 'REJECTED' ? 'rejected' : 'pending'}
            size="sm"
          />
        ),
      },
    );

    if (mode === 'admin') {
      baseColumns.push(
        {
          key: 'utility_bill_amount',
          header: 'Utility Bill',
          cell: (entry) =>
            typeof entry.utility_bill_amount === 'number' ? formatCurrency(entry.utility_bill_amount) : '—',
        },
        {
          key: 'margin', header: 'Margin',
          cell: entry => timeEntryMoney(entry).margin === undefined ? '—' : formatCurrency(timeEntryMoney(entry).margin!),
        },
      );
    }

    if (mode === 'admin') {
      baseColumns.push({
        key: 'actions',
        header: 'Actions',
        cell: (entry) => {
          if (entry.status !== 'PENDING') {
            return <span className="text-xs text-muted-foreground">Reviewed</span>;
          }

          return (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={!canEdit || isSubmitting}
                onClick={() => {
                  void handleSingleDecision(entry, 'REJECTED');
                }}
              >
                Reject
              </Button>
              <Button
                size="sm"
                variant="default"
                disabled={!canEdit || isSubmitting}
                onClick={() => {
                  void handleSingleDecision(entry, 'APPROVED');
                }}
              >
                Approve
              </Button>
            </div>
          );
        },
      });
    }

    return baseColumns;
  }, [handleSingleDecision, isSubmitting, canEdit, mode, selectedEntryIds, updateSelected]);

  return (
    <div className="space-y-4 time-review-workbench">
      <Card className="cc-review-card">
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 sm:col-span-2 xl:col-span-2">
              <label htmlFor="time-review-search" className="cc-eyebrow">Search the queue</label>
              <Input id="time-review-search" className={TIME_REVIEW_FILTER_CONTROL_CLASS} value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Contractor, ticket, or work type" />
            </div>
            <div className="space-y-2 sm:col-span-2 xl:col-span-2">
              <span className="cc-eyebrow">Status</span>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilterValue)}>
                <SelectTrigger aria-label="Filter time entries by status" className={`${TIME_REVIEW_FILTER_CONTROL_CLASS} w-full`}><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent><SelectItem value="ALL">All statuses</SelectItem><SelectItem value="PENDING">Pending</SelectItem><SelectItem value="APPROVED">Approved</SelectItem><SelectItem value="REJECTED">Rejected</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-3 sm:col-span-2 xl:col-span-2">
              <div className="min-w-0 space-y-2"><label htmlFor="time-review-from" className="cc-eyebrow">From</label><Input id="time-review-from" className={TIME_REVIEW_FILTER_CONTROL_CLASS} type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></div>
              <div className="min-w-0 space-y-2"><label htmlFor="time-review-to" className="cc-eyebrow">To</label><Input id="time-review-to" className={TIME_REVIEW_FILTER_CONTROL_CLASS} type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></div>
            </div>
            <div className="flex flex-wrap items-end gap-2 sm:col-span-2 xl:col-span-2">
              <Button variant="outline" size="sm" disabled={isLoading} onClick={() => { void loadEntries(); }}>{isLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}Refresh</Button>
              {mode === 'admin' ? <>
                <Button variant="outline" size="sm" disabled={!canEdit || isSubmitting || filteredEntries.every((entry) => entry.status !== 'PENDING')} onClick={() => setSelectedEntryIds(filteredEntries.filter((entry) => entry.status === 'PENDING').map((entry) => entry.id))}><CheckCheck className="size-4" />Select pending</Button>
                <Button variant="ghost" size="sm" disabled={!canEdit || isSubmitting || selectedEntryIds.length === 0} onClick={() => setSelectedEntryIds([])}>Clear selection</Button>
              </> : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <Card className="rounded-[1rem] border border-border">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Entries</p>
                <p className="font-heading text-3xl font-semibold">{summary.entryCount}</p>
              </CardContent>
            </Card>
            <Card className="rounded-[1rem] border border-border">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Total Time</p>
                <p className="font-heading text-3xl font-semibold">{formatDuration(summary.totalMinutes)}</p>
              </CardContent>
            </Card>
            <Card className="rounded-[1rem] border border-border">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Billable Time</p>
                <p className="font-heading text-3xl font-semibold">{formatDuration(summary.billableMinutes)}</p>
              </CardContent>
            </Card>
            <Card className="rounded-[1rem] border border-border">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Billable Amount</p>
                <p className="font-heading text-3xl font-semibold">{formatCurrency(summary.totalAmount)}</p>
              </CardContent>
            </Card>
            <Card className="rounded-[1rem] border border-border">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Pending Review</p>
                <p className="font-heading text-3xl font-semibold">{summary.pendingCount}</p>
              </CardContent>
            </Card>
          </div>

          {mode === 'admin' ? (
            <div className="flex flex-wrap gap-2 border-t pt-3">
              <Button
                variant="default"
                disabled={!canEdit || isSubmitting || selectedPendingEntries.length === 0}
                onClick={() => {
                  void handleBatchDecision('APPROVED');
                }}
              >
                <Check className="mr-2 h-4 w-4" />
                Approve Selected ({selectedPendingEntries.length})
              </Button>
              <Button
                variant="destructive"
                disabled={!canEdit || isSubmitting || selectedPendingEntries.length === 0}
                onClick={() => {
                  void handleBatchDecision('REJECTED');
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Reject Selected ({selectedPendingEntries.length})
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={filteredEntries}
          keyExtractor={(entry) => entry.id}
          isLoading={isLoading}
          emptyMessage="No time entries found for the selected filters."
        />
      </div>

      <div className="space-y-3 md:hidden">
        {isLoading ? (
          <div className="cc-work-panel rounded-xl p-6 text-center text-sm text-muted-foreground">
            Loading time entries...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="cc-work-panel rounded-xl p-6 text-center text-sm text-muted-foreground">
            No time entries found for the selected filters.
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <TimeEntryCard
              key={entry.id}
              entry={entry}
              selected={selectedEntryIds.includes(entry.id)}
              showSelection={mode === 'admin'}
              showReviewActions={mode === 'admin' && canEdit}
              showPayrollDetails={mode === 'admin'}
              reviewBusy={isSubmitting}
              onSelectChange={(selected) => updateSelected(entry.id, selected)}
              onApprove={(selectedEntry) => {
                void handleSingleDecision(selectedEntry, 'APPROVED');
              }}
              onReject={(selectedEntry) => {
                void handleSingleDecision(selectedEntry, 'REJECTED');
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
