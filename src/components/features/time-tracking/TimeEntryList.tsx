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
  calculateBillableAmount,
  calculateTimeEntrySummary,
  resolveBillableMinutesForEntry,
  resolveTotalMinutesForEntry,
} from '@/lib/utils/timeTracking';
import type { TimeEntryStatus } from '@/types';

import { TimeEntryCard } from './TimeEntryCard';

type StatusFilterValue = TimeEntryStatus | 'ALL';

type ReviewDecision = Extract<TimeEntryStatus, 'APPROVED' | 'REJECTED'>;

export const TIME_REVIEW_FILTER_CONTROL_CLASS =
  'border-2 border-[#ffc038] bg-[#031a4a]/85 text-blue-50 shadow-none focus-visible:border-[#ffc038] focus-visible:ring-[2px] focus-visible:ring-[#ffc038]';

export function getTimeReviewLayoutMode() {
  return 'operations-grid';
}

export interface TimeEntryListProps {
  mode: 'contractor' | 'admin';
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

export function TimeEntryList({ mode, contractorId, reviewerId }: TimeEntryListProps) {
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
  }, [loadEntries]);

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
        key: 'amount',
        header: 'Amount',
        cell: (entry) => {
          const billableMinutes = resolveBillableMinutesForEntry(entry);
          const amount = entry.billable_amount ?? calculateBillableAmount(billableMinutes, entry.work_type_rate);
          return formatCurrency(amount);
        },
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
      baseColumns.push({
        key: 'actions',
        header: 'Actions',
        cell: (entry) => {
          if (entry.status !== 'PENDING') {
            return <span className="text-xs text-blue-100">Reviewed</span>;
          }

          return (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={isSubmitting}
                onClick={() => {
                  void handleSingleDecision(entry, 'REJECTED');
                }}
              >
                Reject
              </Button>
              <Button
                size="sm"
                variant="storm"
                disabled={isSubmitting}
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
  }, [handleSingleDecision, isSubmitting, mode, selectedEntryIds, updateSelected]);

  return (
    <div className="space-y-4 time-review-workbench">
      <Card className="border-2 border-[#ffc038] bg-transparent">
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr_0.8fr]">
            <section className="space-y-3 rounded-[1.35rem] border-2 border-[#ffc038] bg-[linear-gradient(145deg,rgba(255,192,56,0.24)_0%,rgba(255,192,56,0.08)_100%)] p-4 shadow-[0_12px_26px_rgba(0,18,72,0.24)]">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-[#ffe39f] uppercase">Search + Scope</p>
              <Input
                className={TIME_REVIEW_FILTER_CONTROL_CLASS}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search contractor, ticket, work type"
              />
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-md border-2 border-[#ffc038] bg-[#031742]/70 px-3 py-2">
                  <p className="text-xs text-blue-100">Visible</p>
                  <p className="text-lg font-semibold text-blue-50">{filteredEntries.length}</p>
                </div>
                <div className="rounded-md border-2 border-[#ffc038] bg-[#031742]/70 px-3 py-2">
                  <p className="text-xs text-blue-100">Selected</p>
                  <p className="text-lg font-semibold text-blue-50">{selectedEntryIds.length}</p>
                </div>
                <div className="rounded-md border-2 border-[#ffc038] bg-[#031742]/70 px-3 py-2">
                  <p className="text-xs text-blue-100">Pending</p>
                  <p className="text-lg font-semibold text-blue-50">{summary.pendingCount}</p>
                </div>
              </div>
            </section>

            <section className="grid gap-3">
              <div className="rounded-[1.1rem] border-2 border-[#ffc038] bg-white/8 p-3">
                <p className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-blue-100 uppercase">Status Lane</p>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as StatusFilterValue)}
                >
                  <SelectTrigger className={TIME_REVIEW_FILTER_CONTROL_CLASS}>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 rounded-[1.1rem] border-2 border-[#ffc038] bg-white/8 p-3">
                <p className="text-[11px] font-semibold tracking-[0.12em] text-blue-100 uppercase">Date Window</p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold tracking-[0.12em] text-blue-100 uppercase">From</p>
                    <Input
                      className={TIME_REVIEW_FILTER_CONTROL_CLASS}
                      type="date"
                      value={fromDate}
                      onChange={(event) => setFromDate(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold tracking-[0.12em] text-blue-100 uppercase">To</p>
                    <Input
                      className={TIME_REVIEW_FILTER_CONTROL_CLASS}
                      type="date"
                      value={toDate}
                      onChange={(event) => setToDate(event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            <aside className="space-y-3 rounded-[1.2rem] border-2 border-[#ffc038] bg-[linear-gradient(145deg,#001445_0%,#00286a_58%,#0b4ea1_100%)] p-4 shadow-[0_14px_26px_rgba(0,20,80,0.34)]">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-[#ffe39f] uppercase">Action Rail</p>
              <Button
                variant="storm"
                className="w-full justify-start"
                disabled={isLoading}
                onClick={() => {
                  void loadEntries();
                }}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh Queue
              </Button>

              {mode === 'admin' ? (
                <>
                  <Button
                    variant="storm"
                    className="w-full justify-start"
                    disabled={isSubmitting || filteredEntries.every((entry) => entry.status !== 'PENDING')}
                    onClick={() => {
                      const pendingIds = filteredEntries
                        .filter((entry) => entry.status === 'PENDING')
                        .map((entry) => entry.id);
                      setSelectedEntryIds(pendingIds);
                    }}
                  >
                    <CheckCheck className="mr-2 h-4 w-4" />
                    Select Visible Pending
                  </Button>
                  <Button
                    variant="storm"
                    className="w-full justify-start"
                    disabled={isSubmitting || selectedEntryIds.length === 0}
                    onClick={() => setSelectedEntryIds([])}
                  >
                    Clear Selection
                  </Button>
                </>
              ) : null}
            </aside>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-12">
            <Card className="rounded-[1rem] border-2 border-[#ffc038] sm:col-span-2 lg:col-span-2 2xl:col-span-4">
              <CardContent className="p-3">
                <p className="text-xs text-blue-100">Entries</p>
                <p className="text-lg font-semibold">{summary.entryCount}</p>
              </CardContent>
            </Card>
            <Card className="rounded-[1rem] border-2 border-[#ffc038] 2xl:col-span-2">
              <CardContent className="p-3">
                <p className="text-xs text-blue-100">Total Time</p>
                <p className="text-lg font-semibold">{formatDuration(summary.totalMinutes)}</p>
              </CardContent>
            </Card>
            <Card className="rounded-[1rem] border-2 border-[#ffc038] 2xl:col-span-2">
              <CardContent className="p-3">
                <p className="text-xs text-blue-100">Billable Time</p>
                <p className="text-lg font-semibold">{formatDuration(summary.billableMinutes)}</p>
              </CardContent>
            </Card>
            <Card className="rounded-[1rem] border-2 border-[#ffc038] 2xl:col-span-2">
              <CardContent className="p-3">
                <p className="text-xs text-blue-100">Billable Amount</p>
                <p className="text-lg font-semibold">{formatCurrency(summary.totalAmount)}</p>
              </CardContent>
            </Card>
            <Card className="rounded-[1rem] border-2 border-[#ffc038] 2xl:col-span-2">
              <CardContent className="p-3">
                <p className="text-xs text-blue-100">Pending Review</p>
                <p className="text-lg font-semibold">{summary.pendingCount}</p>
              </CardContent>
            </Card>
          </div>

          {mode === 'admin' ? (
            <div className="flex flex-wrap gap-2 border-t pt-3">
              <Button
                variant="storm"
                disabled={isSubmitting || selectedPendingEntries.length === 0}
                onClick={() => {
                  void handleBatchDecision('APPROVED');
                }}
              >
                <Check className="mr-2 h-4 w-4" />
                Approve Selected ({selectedPendingEntries.length})
              </Button>
              <Button
                variant="destructive"
                disabled={isSubmitting || selectedPendingEntries.length === 0}
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
          <div className="storm-surface rounded-xl p-6 text-center text-sm text-blue-100">
            Loading time entries...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="storm-surface rounded-xl p-6 text-center text-sm text-blue-100">
            No time entries found for the selected filters.
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <TimeEntryCard
              key={entry.id}
              entry={entry}
              selected={selectedEntryIds.includes(entry.id)}
              showSelection={mode === 'admin'}
              showReviewActions={mode === 'admin'}
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
