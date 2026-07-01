'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCheck, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { DataTable, type Column } from '@/components/common/data-display/DataTable';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  invoiceGenerationService,
  type InvoiceGenerationCandidate,
} from '@/lib/services/invoiceGenerationService';
import { formatCurrency } from '@/lib/utils/formatters';

import { Tax1099TrackingDisplay } from './Tax1099TrackingDisplay';

interface InvoiceGeneratorProps {
  generatedBy?: string;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDefaultPeriod(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  return {
    start: toDateInputValue(start),
    end: toDateInputValue(end),
  };
}

function parseError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unable to generate invoices.';
}

export function InvoiceGenerator({ generatedBy }: InvoiceGeneratorProps) {
  const period = useMemo(() => getDefaultPeriod(), []);
  const [billingStart, setBillingStart] = useState(period.start);
  const [billingEnd, setBillingEnd] = useState(period.end);
  const [searchTerm, setSearchTerm] = useState('');

  const [candidates, setCandidates] = useState<InvoiceGenerationCandidate[]>([]);
  const [selectedContractorIds, setSelectedContractorIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCandidates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loaded = await invoiceGenerationService.listGenerationCandidates({
        billingPeriodStart: billingStart,
        billingPeriodEnd: billingEnd,
      });

      setCandidates(loaded);
    } catch (loadError) {
      setCandidates([]);
      setError(parseError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [billingEnd, billingStart]);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  useEffect(() => {
    setSelectedContractorIds((current) =>
      current.filter((id) => candidates.some((candidate) => candidate.contractor_id === id)),
    );
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return candidates;
    }

    return candidates.filter((candidate) => {
      const searchable = [
        candidate.contractor_id,
        candidate.contractor_name,
        ...candidate.time_entries.map((entry) => entry.ticket_number),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [candidates, searchTerm]);

  const selectedCandidates = useMemo(
    () => candidates.filter((candidate) => selectedContractorIds.includes(candidate.contractor_id)),
    [candidates, selectedContractorIds],
  );

  const summary = useMemo(() => {
    return selectedCandidates.reduce(
      (accumulator, candidate) => ({
        contractorCount: accumulator.contractorCount + 1,
        timeEntryCount: accumulator.timeEntryCount + candidate.time_entry_count,
        expenseReportCount: accumulator.expenseReportCount + candidate.expense_report_count,
        subtotalTime: accumulator.subtotalTime + candidate.subtotal_time,
        subtotalExpenses: accumulator.subtotalExpenses + candidate.subtotal_expenses,
        totalAmount: accumulator.totalAmount + candidate.total_amount,
      }),
      {
        contractorCount: 0,
        timeEntryCount: 0,
        expenseReportCount: 0,
        subtotalTime: 0,
        subtotalExpenses: 0,
        totalAmount: 0,
      },
    );
  }, [selectedCandidates]);

  const firstSelectedCandidate = selectedCandidates[0];

  const toggleSelected = useCallback((contractorId: string, checked: boolean) => {
    setSelectedContractorIds((current) => {
      if (checked) {
        return current.includes(contractorId) ? current : [...current, contractorId];
      }

      return current.filter((id) => id !== contractorId);
    });
  }, []);

  const toggleSelectAllFiltered = useCallback((checked: boolean) => {
    if (!checked) {
      setSelectedContractorIds((current) =>
        current.filter((id) => !filteredCandidates.some((candidate) => candidate.contractor_id === id)),
      );
      return;
    }

    const filteredIds = filteredCandidates.map((candidate) => candidate.contractor_id);
    setSelectedContractorIds((current) => Array.from(new Set([...current, ...filteredIds])));
  }, [filteredCandidates]);

  const allFilteredSelected =
    filteredCandidates.length > 0 &&
    filteredCandidates.every((candidate) => selectedContractorIds.includes(candidate.contractor_id));

  const handleGenerateInvoices = async () => {
    if (selectedContractorIds.length === 0) {
      toast.error('Select at least one contractor before generating invoices.');
      return;
    }

    setIsGenerating(true);

    try {
      const result = await invoiceGenerationService.generateInvoices({
        billingPeriodStart: billingStart,
        billingPeriodEnd: billingEnd,
        contractorIds: selectedContractorIds,
        generatedBy,
      });

      toast.success(`Generated ${result.invoice_count} invoice${result.invoice_count === 1 ? '' : 's'}.`);
      setSelectedContractorIds([]);
      await loadCandidates();
    } catch (generateError) {
      toast.error(parseError(generateError));
    } finally {
      setIsGenerating(false);
    }
  };

  const columns = useMemo<Column<InvoiceGenerationCandidate>[]>(
    () => [
      {
        key: 'select',
        header: '',
        width: '48px',
        cell: (candidate) => (
          <Checkbox
            checked={selectedContractorIds.includes(candidate.contractor_id)}
            onCheckedChange={(checked) => toggleSelected(candidate.contractor_id, checked === true)}
          />
        ),
      },
      {
        key: 'contractor',
        header: 'Contractor',
        cell: (candidate) => candidate.contractor_name ?? candidate.contractor_id,
      },
      {
        key: 'time',
        header: 'Time',
        cell: (candidate) => (
          <div>
            <p className="font-medium">{formatCurrency(candidate.subtotal_time)}</p>
            <p className="text-xs text-slate-500">{candidate.time_entry_count} entries</p>
          </div>
        ),
      },
      {
        key: 'expenses',
        header: 'Expenses',
        cell: (candidate) => (
          <div>
            <p className="font-medium">{formatCurrency(candidate.subtotal_expenses)}</p>
            <p className="text-xs text-slate-500">{candidate.expense_report_count} reports</p>
          </div>
        ),
      },
      {
        key: 'total',
        header: 'Total',
        cell: (candidate) => <p className="font-semibold">{formatCurrency(candidate.total_amount)}</p>,
      },
      {
        key: 'ytd',
        header: 'Projected 1099',
        cell: (candidate) => (
          <div className="space-y-1">
            <p className="font-medium">{formatCurrency(candidate.projected_ytd_payments)}</p>
            {candidate.threshold_warning ? <Badge variant="destructive">Threshold</Badge> : null}
          </div>
        ),
      },
    ],
    [selectedContractorIds, toggleSelected],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-3 lg:grid-cols-4">
            <Input type="date" value={billingStart} onChange={(event) => setBillingStart(event.target.value)} />
            <Input type="date" value={billingEnd} onChange={(event) => setBillingEnd(event.target.value)} />
            <Input
              placeholder="Search contractor or ticket"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <Button
              variant="outline"
              disabled={isLoading}
              onClick={() => {
                void loadCandidates();
              }}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-grid-surface bg-grid-surface px-3 py-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={(checked) => toggleSelectAllFiltered(checked === true)}
              />
              Select all filtered
            </label>
            <Button disabled={isGenerating || selectedContractorIds.length === 0} onClick={handleGenerateInvoices}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Generate {selectedContractorIds.length} Invoice{selectedContractorIds.length === 1 ? '' : 's'}
                </>
              )}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">Selected Subs</p>
                <p className="text-lg font-semibold">{summary.contractorCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">Time Entries</p>
                <p className="text-lg font-semibold">{summary.timeEntryCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">Expense Reports</p>
                <p className="text-lg font-semibold">{summary.expenseReportCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">Subtotal (Time)</p>
                <p className="text-lg font-semibold">{formatCurrency(summary.subtotalTime)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-lg font-semibold">{formatCurrency(summary.totalAmount)}</p>
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
          data={filteredCandidates}
          keyExtractor={(candidate) => candidate.contractor_id}
          isLoading={isLoading}
          emptyMessage="No approved billable entries found in this billing period."
        />
      </div>

      <div className="space-y-3 md:hidden">
        {isLoading ? (
          <div className="storm-surface rounded-xl px-4 py-6 text-sm text-slate-500">Loading candidates...</div>
        ) : filteredCandidates.length === 0 ? (
          <div className="storm-surface rounded-xl px-4 py-6 text-sm text-slate-500">
            No approved billable entries found in this billing period.
          </div>
        ) : (
          filteredCandidates.map((candidate) => {
            const selected = selectedContractorIds.includes(candidate.contractor_id);

            return (
              <Card key={candidate.contractor_id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{candidate.contractor_name ?? candidate.contractor_id}</p>
                      <p className="text-xs text-slate-500">
                        {candidate.time_entry_count} time • {candidate.expense_report_count} expense reports
                      </p>
                    </div>
                    <Checkbox checked={selected} onCheckedChange={(checked) => toggleSelected(candidate.contractor_id, checked === true)} />
                  </div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <p className="text-sm font-semibold">{formatCurrency(candidate.total_amount)}</p>
                    {candidate.threshold_warning ? <Badge variant="destructive">1099 Threshold</Badge> : null}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Tax1099TrackingDisplay
        contractorId={firstSelectedCandidate?.contractor_id}
        contractorName={firstSelectedCandidate?.contractor_name}
        taxYear={billingEnd ? Number(billingEnd.slice(0, 4)) : undefined}
      />
    </div>
  );
}
