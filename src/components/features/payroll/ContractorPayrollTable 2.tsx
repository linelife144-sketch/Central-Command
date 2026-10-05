'use client';

import { DataTable, type Column } from '@/components/common/data-display/DataTable';
import { ROLE_LABELS } from '@/lib/config/appConfig';
import { formatCurrency, formatNumber } from '@/lib/utils/formatters';
import type { ContractorPayrollRow } from '@/types';

export interface ContractorPayrollTableProps {
  rows: ContractorPayrollRow[];
  isLoading?: boolean;
  includeFinancial?: boolean;
}

/**
 * Per-contractor payroll/billing/margin table on the admin payroll
 * dashboard. A contractor with zero entries renders "—" rather than
 * "$0.00" so an unworked period is never confused with a $0 wage.
 */
export function ContractorPayrollTable({ rows, isLoading = false, includeFinancial = false }: ContractorPayrollTableProps) {
  const columns: Column<ContractorPayrollRow>[] = [
    { key: 'contractorName', header: 'Contractor', cell: (row) => row.contractorName },
    { key: 'role', header: 'Role', cell: (row) => ROLE_LABELS[row.role] },
    {
      key: 'billableMinutes',
      header: 'Billable Hours',
      cell: (row) => (row.entryCount === 0 ? '—' : (row.billableMinutes / 60).toFixed(1)),
    },
    {
      key: 'taxablePayroll',
      header: 'Taxable Payroll',
      cell: (row) => (row.entryCount === 0 ? '—' : formatCurrency(row.taxablePayroll)),
    },
    {
      key: 'reimbursementTotal',
      header: 'Vehicle Reimbursement',
      cell: (row) => (row.entryCount === 0 && row.pendingVehicleClaims === 0 ? '—' : formatCurrency(row.reimbursementTotal)),
    },
    {
      key: 'totalPayout',
      header: 'Total Payout',
      cell: (row) => (row.entryCount === 0 ? '—' : formatCurrency(row.totalPayout)),
    },
    {
      key: 'utilityBillAmount',
      header: 'Utility Bill',
      cell: (row) => (row.entryCount === 0 ? '—' : formatCurrency(row.utilityBillAmount ?? 0)),
    },
    {
      key: 'marginAmount',
      header: 'Margin',
      cell: (row) =>
        row.entryCount === 0 ? (
          '—'
        ) : (
          <span className={(row.marginAmount ?? 0) < 0 ? 'text-grid-danger-ink' : 'text-grid-success-ink'}>
            {formatCurrency(row.marginAmount ?? 0)}
          </span>
        ),
    },
    {
      key: 'pendingEntries',
      header: 'Pending',
      cell: (row) => formatNumber(row.pendingEntries + row.pendingVehicleClaims),
    },
  ];

  return (
    <DataTable
      columns={columns.filter(column => includeFinancial || !['utilityBillAmount','marginAmount'].includes(String(column.key)))}
      data={rows}
      keyExtractor={(row) => row.contractorId}
      isLoading={isLoading}
      emptyMessage="No payroll activity for the selected period."
    />
  );
}
