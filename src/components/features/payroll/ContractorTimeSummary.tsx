'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { timeEntryManagementService, type TimeEntryListItem } from '@/lib/services/timeEntryManagementService';
import { formatCurrency, formatDateTime, formatDuration } from '@/lib/utils/formatters';
import { resolveBillableMinutesForEntry } from '@/lib/utils/timeTracking';
import { round2, timeEntryMoney } from '@/lib/utils/payroll';

export interface ContractorTimeSummaryProps {
  contractorId?: string;
  refreshKey?: number;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Unable to load your time entries.';
}

/**
 * Contractor-facing submitted-time panel: total submitted hours, split
 * between approved and pending, a pay estimate from already-stored
 * billable_amount/payroll_amount figures, and the most recent entries
 * with their start/stop times.
 */
export function ContractorTimeSummary({ contractorId, refreshKey = 0 }: ContractorTimeSummaryProps) {
  const [entries, setEntries] = useState<TimeEntryListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    if (!contractorId) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await timeEntryManagementService.listEntries({ contractorId });
      setEntries(result);
    } catch (error) {
      setEntries([]);
      setError(toErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [contractorId]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries, refreshKey]);

  const submitted = useMemo(() => entries.filter(entry => entry.clock_out_at && entry.status !== 'REJECTED'), [entries]);
  const summary = useMemo(() => {
    const money = submitted.map(timeEntryMoney);
    return {
      totalMinutes: submitted.reduce((sum, entry) => sum + resolveBillableMinutesForEntry(entry), 0),
      totalAmount: money.some(value => value.wage === undefined) ? undefined : round2(money.reduce((sum, value) => sum + value.wage!, 0)),
      reimbursement: money.some(value => value.reimbursement === undefined) ? undefined : round2(money.reduce((sum, value) => sum + value.reimbursement!, 0)),
    };
  }, [submitted]);

  const approvedMinutes = useMemo(
    () =>
      submitted
        .filter((entry) => entry.status.toUpperCase() === 'APPROVED')
        .reduce((sum, entry) => sum + (entry.billable_minutes ?? 0), 0),
    [submitted],
  );

  const pendingMinutes = useMemo(
    () =>
      submitted
        .filter((entry) => entry.status.toUpperCase() === 'PENDING')
        .reduce((sum, entry) => sum + (entry.billable_minutes ?? 0), 0),
    [submitted],
  );

  const recentEntries = useMemo(() => entries.slice(0, 5), [entries]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Loading your submitted time…</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3"><CardTitle className="text-base">My Submitted Time</CardTitle><Button variant="outline" size="sm" onClick={() => void loadEntries()}>Refresh totals</Button></div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">Total Submitted</p>
            <p className="font-heading text-2xl font-semibold">{formatDuration(summary.totalMinutes)}</p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">Approved Hours</p>
            <p className="font-heading text-2xl font-semibold text-grid-success-ink">
              {formatDuration(approvedMinutes)}
            </p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">Pending Hours</p>
            <p className="font-heading text-2xl font-semibold text-grid-warning-ink">
              {formatDuration(pendingMinutes)}
            </p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">Submitted Wages</p>
            <p className="font-heading text-2xl font-semibold">{summary.totalAmount === undefined ? 'Awaiting sync' : formatCurrency(summary.totalAmount)}</p>
          </div>
          <div className="rounded-md border border-grid-lightning/40 bg-grid-lightning/10 p-3">
            <p className="text-xs text-muted-foreground">Approved Reimbursement</p>
            <p className="font-heading text-2xl font-semibold">{summary.reimbursement === undefined ? 'Awaiting sync' : formatCurrency(summary.reimbursement)}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Completed shifts awaiting review are included in submitted wages. Rejected shifts are excluded. Vehicle reimbursement is shown separately after approval.</p>

        {recentEntries.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Recent Entries</p>
            {recentEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2 text-xs"
              >
                <span>
                  {formatDateTime(entry.clock_in_at)}
                  {entry.clock_out_at ? ` → ${formatDateTime(entry.clock_out_at)}` : ' (in progress)'}
                </span>
                <span className="font-medium">
                  {timeEntryMoney(entry).wage === undefined ? 'Awaiting sync' : formatCurrency(timeEntryMoney(entry).wage!)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No time entries submitted yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
