export interface ExpenseSummaryItem {
  amount: number;
  expense_date: string;
  report_status: string;
}

export interface ExpenseSummary {
  itemCount: number;
  totalAmount: number;
  currentMonthAmount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

function safeAmount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

function toMonthKey(dateValue: string): string | null {
  const parsed = Date.parse(dateValue);
  if (Number.isNaN(parsed)) {
    return null;
  }

  const date = new Date(parsed);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function calculateExpenseSummary(
  items: ExpenseSummaryItem[],
  now: Date = new Date(),
): ExpenseSummary {
  const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  return items.reduce<ExpenseSummary>(
    (summary, item) => {
      const amount = safeAmount(item.amount);
      const status = item.report_status.toUpperCase();
      const monthKey = toMonthKey(item.expense_date);

      return {
        itemCount: summary.itemCount + 1,
        totalAmount: Number((summary.totalAmount + amount).toFixed(2)),
        currentMonthAmount: Number(
          (summary.currentMonthAmount + (monthKey === currentMonthKey ? amount : 0)).toFixed(2),
        ),
        pendingCount: summary.pendingCount + (status === 'DRAFT' || status === 'UNDER_REVIEW' ? 1 : 0),
        approvedCount: summary.approvedCount + (status === 'APPROVED' ? 1 : 0),
        rejectedCount: summary.rejectedCount + (status === 'REJECTED' ? 1 : 0),
      };
    },
    {
      itemCount: 0,
      totalAmount: 0,
      currentMonthAmount: 0,
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
    },
  );
}
