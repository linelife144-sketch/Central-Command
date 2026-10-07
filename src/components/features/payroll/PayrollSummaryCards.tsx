'use client';

import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatNumber } from '@/lib/utils/formatters';
import type { PayrollTotals } from '@/types';

export interface PayrollSummaryCardsProps {
  totals: PayrollTotals | null;
  isLoading?: boolean;
  includeFinancial?: boolean;
  /** Active contractors on the roster. Independent of the payroll period. */
  activeContractorCount?: number | null;
}

function CardValue({ children }: { children: React.ReactNode }) {
  return <p className="font-heading text-3xl font-semibold text-grid-navy">{children}</p>;
}

/**
 * Top-line totals row for the admin payroll dashboard: hours, taxable
 * payroll, vehicle reimbursements, total payout, utility billing, and
 * margin — mirrors ReportsDashboard's metric-card row pattern.
 */
export function PayrollSummaryCards({ totals, isLoading = false, includeFinancial = false, activeContractorCount = null }: PayrollSummaryCardsProps) {
  const placeholder = isLoading ? '…' : '—';

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Billable Hours</p>
          <CardValue>{totals ? (totals.billableMinutes / 60).toFixed(1) : placeholder}</CardValue>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Taxable Payroll</p>
          <CardValue>{totals ? formatCurrency(totals.taxablePayroll) : placeholder}</CardValue>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Vehicle Reimbursement</p>
          <CardValue>{totals ? formatCurrency(totals.reimbursementTotal) : placeholder}</CardValue>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Total Payout</p>
          <CardValue>{totals ? formatCurrency(totals.totalPayout) : placeholder}</CardValue>
        </CardContent>
      </Card>
      {includeFinancial && <>
      <Card>
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Utility Billing</p>
          <CardValue>{totals ? formatCurrency((totals.utilityBillAmount ?? 0)) : placeholder}</CardValue>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Margin</p>
          <p
            className={`font-heading text-3xl font-semibold ${
              totals && (totals.marginAmount ?? 0) < 0 ? 'text-grid-danger-ink' : 'text-grid-success-ink'
            }`}
          >
            {totals ? formatCurrency((totals.marginAmount ?? 0)) : placeholder}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Margin %</p>
          <CardValue>{totals ? `${(totals.marginPercent ?? 0).toFixed(1)}%` : placeholder}</CardValue>
        </CardContent>
      </Card>
      </>}
      {(['submittedWages','approvedWages','approvedPayout'] as const).map((key, index) => <Card key={key}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{['Submitted wages','Approved wages','Approved payout'][index]}</p><CardValue>{totals ? formatCurrency(totals[key] ?? 0) : placeholder}</CardValue></CardContent></Card>)}
      <Card>
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Contractors</p>
          <CardValue>{activeContractorCount !== null ? formatNumber(activeContractorCount) : placeholder}</CardValue>
        </CardContent>
      </Card>
    </div>
  );
}
