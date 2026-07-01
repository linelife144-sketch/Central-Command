'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2, RefreshCw } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  dashboardReportingService,
  type DashboardReportData,
  type DashboardReportInput,
  type ReportExportFormat,
} from '@/lib/services/dashboardReportingService';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/lib/utils/formatters';

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildDefaultDates(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);

  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unable to load report data.';
}

function downloadArtifact(content: string | Uint8Array, mimeType: string, fileName: string): void {
  let blob: Blob;
  if (typeof content === 'string') {
    blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  } else {
    const copied = new Uint8Array(content.byteLength);
    copied.set(content);
    blob = new Blob([copied.buffer], { type: mimeType });
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function amountToPercent(value: number, maxValue: number): number {
  if (maxValue <= 0 || value <= 0) {
    return 0;
  }

  return Math.max((value / maxValue) * 100, 5);
}

export function ReportsDashboard() {
  const defaults = useMemo(() => buildDefaultDates(), []);

  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [groupBy, setGroupBy] = useState<DashboardReportInput['groupBy']>('week');

  const [report, setReport] = useState<DashboardReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState<ReportExportFormat | null>(null);

  const loadReport = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const nextReport = await dashboardReportingService.getReport({
        startDate,
        endDate,
        groupBy,
      });
      setReport(nextReport);
    } catch (loadError) {
      setReport(null);
      setError(toErrorMessage(loadError));
    } finally {
      if (mode === 'refresh') {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [endDate, groupBy, startDate]);

  useEffect(() => {
    void loadReport('initial');
  }, [loadReport]);

  const chartMax = useMemo(() => {
    if (!report || report.series.length === 0) {
      return 0;
    }

    return Math.max(
      ...report.series.map((point) =>
        Math.max(point.approved_time_amount, point.approved_expense_amount, point.invoiced_amount),
      ),
    );
  }, [report]);

  const handleExport = useCallback(
    async (format: ReportExportFormat) => {
      if (!report) {
        return;
      }

      setIsExporting(format);
      try {
        const artifact = dashboardReportingService.createReportExport(report, format);
        downloadArtifact(artifact.content, artifact.mimeType, artifact.fileName);
      } finally {
        setIsExporting(null);
      }
    },
    [report],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="report-start-date">Start date</Label>
              <Input
                className="storm-contrast-field"
                id="report-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-end-date">End date</Label>
              <Input
                className="storm-contrast-field"
                id="report-end-date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-group-by">Group by</Label>
              <Select value={groupBy} onValueChange={(value) => setGroupBy(value as DashboardReportInput['groupBy'])}>
                <SelectTrigger className="storm-contrast-field" id="report-group-by">
                  <SelectValue placeholder="Grouping" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button
                className="flex-1"
                variant="storm"
                disabled={isRefreshing || isLoading}
                onClick={() => {
                  void loadReport('refresh');
                }}
              >
                {isRefreshing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="storm"
              disabled={!report || isExporting !== null}
              onClick={() => {
                void handleExport('CSV');
              }}
            >
              {isExporting === 'CSV' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export CSV
            </Button>
            <Button
              variant="storm"
              disabled={!report || isExporting !== null}
              onClick={() => {
                void handleExport('EXCEL');
              }}
            >
              {isExporting === 'EXCEL' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              )}
              Export Excel
            </Button>
            <Button
              variant="storm"
              disabled={!report || isExporting !== null}
              onClick={() => {
                void handleExport('PDF');
              }}
            >
              {isExporting === 'PDF' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-slate-500">Tickets Created</p>
            <p className="text-lg font-semibold">
              {report ? formatNumber(report.totals.tickets_created) : isLoading ? '...' : '0'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-slate-500">Approved Time</p>
            <p className="text-lg font-semibold">
              {report ? formatCurrency(report.totals.approved_time_amount) : isLoading ? '...' : formatCurrency(0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-slate-500">Approved Expenses</p>
            <p className="text-lg font-semibold">
              {report ? formatCurrency(report.totals.approved_expense_amount) : isLoading ? '...' : formatCurrency(0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-slate-500">Invoiced Amount</p>
            <p className="text-lg font-semibold">
              {report ? formatCurrency(report.totals.invoiced_amount) : isLoading ? '...' : formatCurrency(0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-slate-500">Pending Reviews</p>
            <p className="text-lg font-semibold">
              {report ? formatNumber(report.totals.pending_reviews) : isLoading ? '...' : '0'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Financial Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {!report || report.series.length === 0 ? (
            <div className="rounded-md border border-grid-surface bg-grid-surface px-4 py-8 text-center text-sm text-slate-500">
              {isLoading ? 'Loading chart data...' : 'No report data available for the selected range.'}
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded bg-blue-500" />
                  Approved Time
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded bg-emerald-500" />
                  Approved Expenses
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded bg-indigo-500" />
                  Invoiced
                </span>
              </div>
              <div className="overflow-x-auto">
                <div className="flex min-w-[640px] items-end gap-3 pb-2">
                  {report.series.map((point) => (
                    <div key={point.bucket_start} className="flex min-w-[72px] flex-1 flex-col items-center gap-2">
                      <div className="flex h-44 w-full items-end justify-center gap-1 rounded-md border bg-slate-50 px-2 py-2">
                        <div
                          className={cn('w-3 rounded-sm bg-blue-500 transition-all')}
                          style={{
                            height: `${amountToPercent(point.approved_time_amount, chartMax)}%`,
                          }}
                          title={`Approved Time: ${formatCurrency(point.approved_time_amount)}`}
                        />
                        <div
                          className={cn('w-3 rounded-sm bg-emerald-500 transition-all')}
                          style={{
                            height: `${amountToPercent(point.approved_expense_amount, chartMax)}%`,
                          }}
                          title={`Approved Expense: ${formatCurrency(point.approved_expense_amount)}`}
                        />
                        <div
                          className={cn('w-3 rounded-sm bg-indigo-500 transition-all')}
                          style={{
                            height: `${amountToPercent(point.invoiced_amount, chartMax)}%`,
                          }}
                          title={`Invoiced: ${formatCurrency(point.invoiced_amount)}`}
                        />
                      </div>
                      <p className="text-center text-[11px] text-slate-600">{point.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contractor Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {!report || report.contractors.length === 0 ? (
            <div className="rounded-md border border-grid-surface bg-grid-surface px-4 py-8 text-center text-sm text-slate-500">
              {isLoading ? 'Loading contractor data...' : 'No contractor activity found for this range.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contractor</TableHead>
                  <TableHead className="text-right">Approved Time</TableHead>
                  <TableHead className="text-right">Approved Expenses</TableHead>
                  <TableHead className="text-right">Invoiced</TableHead>
                  <TableHead className="text-right">Pending Reviews</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.contractors.map((row) => (
                  <TableRow key={row.contractor_id}>
                    <TableCell className="font-medium">{row.contractor_name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.approved_time_amount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.approved_expense_amount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.invoiced_amount)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.pending_reviews)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
