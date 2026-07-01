'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Loader2, RefreshCw } from 'lucide-react';

import { DataTable, type Column } from '@/components/common/data-display/DataTable';
import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  invoiceGenerationService,
  type InvoiceListItem as InvoiceListItemType,
} from '@/lib/services/invoiceGenerationService';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import type { InvoiceStatus } from '@/types';

import { InvoicePDFViewer } from './InvoicePDFViewer';
import { Tax1099TrackingDisplay } from './Tax1099TrackingDisplay';

type StatusFilterValue = InvoiceStatus | 'ALL';

interface InvoiceListProps {
  contractorId?: string;
}

function parseError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unable to load invoices.';
}

function toStartOfDayIso(dateValue: string): string | undefined {
  if (!dateValue) {
    return undefined;
  }

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString().slice(0, 10);
}

function toEndOfDayIso(dateValue: string): string | undefined {
  if (!dateValue) {
    return undefined;
  }

  const date = new Date(`${dateValue}T23:59:59.999`);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString().slice(0, 10);
}

function toStatusVariant(status: InvoiceStatus): 'pending' | 'approved' | 'rejected' | 'info' {
  if (status === 'PAID' || status === 'APPROVED') {
    return 'approved';
  }

  if (status === 'VOID') {
    return 'rejected';
  }

  if (status === 'SUBMITTED' || status === 'UNDER_REVIEW') {
    return 'info';
  }

  return 'pending';
}

export function InvoiceList({ contractorId }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<InvoiceListItemType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | undefined>();

  const loadInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await invoiceGenerationService.listInvoices({
        contractorId,
        status: statusFilter,
        from: toStartOfDayIso(fromDate),
        to: toEndOfDayIso(toDate),
      });

      setInvoices(data);
    } catch (loadError) {
      setInvoices([]);
      setError(parseError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, statusFilter, contractorId, toDate]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    if (!selectedInvoiceId) {
      return;
    }

    const stillExists = invoices.some((invoice) => invoice.id === selectedInvoiceId);
    if (!stillExists) {
      setSelectedInvoiceId(undefined);
    }
  }, [invoices, selectedInvoiceId]);

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return invoices;
    }

    return invoices.filter((invoice) => {
      const searchable = [
        invoice.invoice_number,
        invoice.contractor_name,
        invoice.contractor_id,
        invoice.payment_reference,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [invoices, searchTerm]);

  const summary = useMemo(() => {
    const currentYear = new Date().getUTCFullYear();

    return filteredInvoices.reduce(
      (accumulator, invoice) => {
        const invoiceYear = Number(invoice.billing_period_end.slice(0, 4));

        return {
          count: accumulator.count + 1,
          totalAmount: accumulator.totalAmount + invoice.total_amount,
          paidAmount: accumulator.paidAmount + (invoice.status === 'PAID' ? invoice.total_amount : 0),
          yearToDateAmount:
            accumulator.yearToDateAmount + (invoiceYear === currentYear ? invoice.total_amount : 0),
        };
      },
      {
        count: 0,
        totalAmount: 0,
        paidAmount: 0,
        yearToDateAmount: 0,
      },
    );
  }, [filteredInvoices]);

  const columns = useMemo<Column<InvoiceListItemType>[]>(
    () => [
      {
        key: 'invoice_number',
        header: 'Invoice',
        cell: (invoice) => invoice.invoice_number,
      },
      {
        key: 'period',
        header: 'Billing Period',
        cell: (invoice) => `${formatDate(invoice.billing_period_start)} - ${formatDate(invoice.billing_period_end)}`,
      },
      {
        key: 'line_items',
        header: 'Line Items',
        cell: (invoice) => String(invoice.line_item_count),
      },
      {
        key: 'total',
        header: 'Total',
        cell: (invoice) => formatCurrency(invoice.total_amount),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (invoice) => (
          <StatusBadge status={invoice.status} variant={toStatusVariant(invoice.status)} size="sm" />
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        cell: (invoice) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedInvoiceId(invoice.id);
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            View PDF
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-3 lg:grid-cols-5">
            <Input
              placeholder="Search invoice number or payment ref"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilterValue)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="VOID">Void</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            <Button
              variant="outline"
              disabled={isLoading}
              onClick={() => {
                void loadInvoices();
              }}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">Invoices</p>
                <p className="text-lg font-semibold">{summary.count}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">Total Amount</p>
                <p className="text-lg font-semibold">{formatCurrency(summary.totalAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">Paid Amount</p>
                <p className="text-lg font-semibold">{formatCurrency(summary.paidAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">Year-to-Date</p>
                <p className="text-lg font-semibold">{formatCurrency(summary.yearToDateAmount)}</p>
              </CardContent>
            </Card>
          </div>
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
          data={filteredInvoices}
          keyExtractor={(invoice) => invoice.id}
          isLoading={isLoading}
          emptyMessage="No invoices found for selected filters."
        />
      </div>

      <div className="space-y-3 md:hidden">
        {isLoading ? (
          <div className="storm-surface rounded-xl px-4 py-6 text-sm text-slate-500">Loading invoices...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="storm-surface rounded-xl px-4 py-6 text-sm text-slate-500">
            No invoices found for selected filters.
          </div>
        ) : (
          filteredInvoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{invoice.invoice_number}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(invoice.billing_period_start)} - {formatDate(invoice.billing_period_end)}
                    </p>
                  </div>
                  <StatusBadge status={invoice.status} variant={toStatusVariant(invoice.status)} size="sm" />
                </div>

                <div className="flex items-center justify-between border-t pt-2">
                  <p className="text-sm font-semibold">{formatCurrency(invoice.total_amount)}</p>
                  <Button size="sm" variant="outline" onClick={() => setSelectedInvoiceId(invoice.id)}>
                    View PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Tax1099TrackingDisplay contractorId={contractorId} />

      {selectedInvoiceId ? <InvoicePDFViewer invoiceId={selectedInvoiceId} /> : null}
    </div>
  );
}
