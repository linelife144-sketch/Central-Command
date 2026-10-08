'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
import { APP_CONFIG } from '@/lib/config/appConfig';
import { payrollService } from '@/lib/services/payrollService';
import { contractorService } from '@/lib/services/contractorService';
import { stormEventService, type StormEventSummary } from '@/lib/services/stormEventService';
import { ContractorPayrollTable } from './ContractorPayrollTable';
import { PayrollSummaryCards } from './PayrollSummaryCards';
import { StormCompensationRateEditor } from './StormCompensationRateEditor';
import { VehicleReimbursementReview } from './VehicleReimbursementReview';
import type { PayrollSummary } from '@/types';

export interface PayrollDashboardProps {
  reviewerId?: string;
  canEdit?: boolean;
  canViewStorms?: boolean;
  includeFinancial?: boolean;
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildDefaultPeriod(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - APP_CONFIG.PAYROLL_PERIOD_DEFAULT_DAYS);

  return { from: toDateInputValue(from), to: toDateInputValue(to) };
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

function toErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Unable to load payroll data.';
}

const ALL_STORMS_VALUE = 'ALL';

/**
 * Admin "Payroll & Profit" dashboard: period/storm filters, top-line
 * totals, per-contractor payroll/billing/margin table, CSV export, the
 * role/storm wage editors, and the vehicle reimbursement review queue —
 * everything an admin needs to see what's owed, what's billable, and the
 * resulting margin, in one place.
 */
export function PayrollDashboard({ reviewerId, canEdit = false, canViewStorms = true, includeFinancial = false }: PayrollDashboardProps) {
  const defaultPeriod = useMemo(() => buildDefaultPeriod(), []);
  const [from, setFrom] = useState(defaultPeriod.from);
  const [to, setTo] = useState(defaultPeriod.to);
  const [stormEventId, setStormEventId] = useState<string>(ALL_STORMS_VALUE);
  const [stormEvents, setStormEvents] = useState<StormEventSummary[]>([]);

  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  // Active contractors on the roster — independent of the payroll period.
  const [activeContractorCount, setActiveContractorCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canViewStorms) return;
    void stormEventService.listStormEvents().then(setStormEvents).catch(() => setStormEvents([]));
  }, [canViewStorms]);

  useEffect(() => {
    void contractorService.listContractors({ activeOnly: true })
      .then((contractors) => setActiveContractorCount(contractors.length))
      .catch(() => setActiveContractorCount(null));
  }, []);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await payrollService.getPayrollSummary({
        includeFinancial,
        from: new Date(`${from}T00:00:00`).toISOString(),
        to: new Date(`${to}T23:59:59.999`).toISOString(),
        stormEventId: stormEventId === ALL_STORMS_VALUE ? undefined : stormEventId,
      });
      setSummary(result);
    } catch (loadError) {
      setSummary(null);
      setError(toErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [from, to, stormEventId, includeFinancial]);

  useEffect(() => {
    void Promise.resolve().then(loadSummary);
    const timer = window.setInterval(() => { void loadSummary(); }, 30000);
    const refreshed = () => { void loadSummary(); };
    window.addEventListener('time-entries-synced', refreshed);
    return () => { window.clearInterval(timer); window.removeEventListener('time-entries-synced', refreshed); };
  }, [loadSummary]);

  const handleExport = async () => {
    if (!summary) {
      return;
    }

    setIsExporting(true);
    try {
      const artifact = payrollService.createPayrollCsvExport(summary);
      downloadArtifact(artifact.content, artifact.mimeType, artifact.fileName);
    } catch (exportError) {
      toast.error(toErrorMessage(exportError));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payroll Period</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="payroll-from">From</Label>
              <Input id="payroll-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payroll-to">To</Label>
              <Input id="payroll-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payroll-storm">Storm Event</Label>
              <Select value={stormEventId} onValueChange={setStormEventId}>
                <SelectTrigger id="payroll-storm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STORMS_VALUE}>All Storms</SelectItem>
                  {stormEvents.map((storm) => (
                    <SelectItem key={storm.id} value={storm.id}>
                      {storm.eventCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Button variant="outline" onClick={() => void loadSummary()} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Refresh
              </Button>
              <Button variant="outline" disabled={!summary || isExporting} onClick={() => void handleExport()}>
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <p className="text-sm text-muted-foreground">Totals include completed shifts awaiting review. Rejected shifts are excluded; vehicle reimbursement counts after approval.</p>
      <PayrollSummaryCards includeFinancial={includeFinancial} totals={summary?.totals ?? null} isLoading={isLoading} activeContractorCount={activeContractorCount} />

      <Card>
        <CardHeader>
          <CardTitle>{includeFinancial ? 'Contractor Payroll & Margin' : 'Contractor Payroll'}</CardTitle>
        </CardHeader>
        <CardContent>
          <ContractorPayrollTable includeFinancial={includeFinancial} rows={summary?.rows ?? []} isLoading={isLoading} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle Reimbursement Review</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleReimbursementReview reviewerId={reviewerId} canEdit={canEdit} onReviewed={() => void loadSummary()} />
        </CardContent>
      </Card>

      {stormEventId === ALL_STORMS_VALUE ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Select a storm to view or edit its compensation rates. Rates are stored separately for each storm.
          </CardContent>
        </Card>
      ) : (
        <StormCompensationRateEditor
          key={stormEventId}
          stormEventId={stormEventId}
          canEdit={canEdit}
          isClosed={stormEvents.find((storm) => storm.id === stormEventId)?.status === 'CLOSED'}
        />
      )}
    </div>
  );
}
