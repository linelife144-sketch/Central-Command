'use client';

import { Check, Clock, MapPin, X } from 'lucide-react';

import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency, formatDate, formatDateTime, formatDuration } from '@/lib/utils/formatters';
import {
  resolveBillableMinutesForEntry,
  resolveTotalMinutesForEntry,
} from '@/lib/utils/timeTracking';
import { timeEntryMoney } from '@/lib/utils/payroll';
import type { TimeEntryListItem } from '@/lib/services/timeEntryManagementService';

export interface TimeEntryCardProps {
  entry: TimeEntryListItem;
  selected?: boolean;
  showSelection?: boolean;
  showReviewActions?: boolean;
  /** Admin-only payroll/utility-bill rows, sourced from the server-trigger-written snapshot fields. */
  showPayrollDetails?: boolean;
  reviewBusy?: boolean;
  onSelectChange?: (selected: boolean) => void;
  onApprove?: (entry: TimeEntryListItem) => void;
  onReject?: (entry: TimeEntryListItem) => void;
}

function toWorkTypeLabel(workType: string): string {
  return workType
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function TimeEntryCard({
  entry,
  selected = false,
  showSelection = false,
  showReviewActions = false,
  showPayrollDetails = false,
  reviewBusy = false,
  onSelectChange,
  onApprove,
  onReject,
}: TimeEntryCardProps) {
  const totalMinutes = resolveTotalMinutesForEntry(entry);
  const billableMinutes = resolveBillableMinutesForEntry(entry);
  const money = timeEntryMoney(entry);
  const moneyLabel = (amount?: number) => amount === undefined ? '—' : formatCurrency(amount);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">
              {entry.contractor_name ?? 'Contractor'}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {entry.ticket_number ? `Ticket ${entry.ticket_number}` : entry.ticket_id ?? 'No ticket linked'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {showSelection ? (
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onSelectChange?.(checked === true)}
                aria-label={`Select time entry ${entry.id}`}
              />
            ) : null}
            <StatusBadge
              status={entry.status}
              variant={entry.status === 'APPROVED' ? 'approved' : entry.status === 'REJECTED' ? 'rejected' : 'pending'}
              size="sm"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <p><span className="font-medium">Date:</span> {formatDate(entry.clock_in_at)}</p>
          <p><span className="font-medium">Type:</span> {toWorkTypeLabel(entry.work_type)}</p>
          <p><span className="font-medium">Clock In:</span> {formatDateTime(entry.clock_in_at)}</p>
          <p><span className="font-medium">Clock Out:</span> {formatDateTime(entry.clock_out_at ?? null)}</p>
          <p className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium">Duration:</span> {formatDuration(totalMinutes)}
          </p>
          <p><span className="font-medium">Billable:</span> {formatDuration(billableMinutes)}</p>
          <p><span className="font-medium">Wages:</span> {moneyLabel(money.wage)}</p>
          <p className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            <span className="font-medium">Sync:</span> {entry.sync_status}
          </p>
          <p><span className="font-medium">Approved reimbursement:</span> {moneyLabel(money.reimbursement)}</p>
          <p><span className="font-medium">Total payout:</span> {moneyLabel(money.payout)}</p>
          {entry.vehicle_claim_status === 'PENDING' && <p className="text-grid-warning-ink">Vehicle claim awaiting review</p>}
          {showPayrollDetails && <p><span className="font-medium">Margin:</span> {moneyLabel(money.margin)}</p>}
          {showPayrollDetails && typeof entry.utility_bill_amount === 'number' ? (
            <p><span className="font-medium">Utility Bill:</span> {formatCurrency(entry.utility_bill_amount)}</p>
          ) : null}
        </div>

        {entry.rejection_reason ? (
          <div className="rounded-md border border-grid-danger/25 bg-grid-danger-soft p-2 text-xs text-grid-danger-ink">
            <span className="font-medium">Rejection reason:</span> {entry.rejection_reason}
          </div>
        ) : null}
      </CardContent>

      {showReviewActions && entry.status === 'PENDING' ? (
        <CardFooter className="flex gap-2 pt-0">
          <Button
            size="sm"
            variant="outline"
            disabled={reviewBusy}
            onClick={() => onReject?.(entry)}
          >
            <X className="mr-1 h-3.5 w-3.5" /> Reject
          </Button>
          <Button
            size="sm"
            disabled={reviewBusy}
            onClick={() => onApprove?.(entry)}
          >
            <Check className="mr-1 h-3.5 w-3.5" /> Approve
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
