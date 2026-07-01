'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  invoiceGenerationService,
  type Tax1099TrackingSummary,
} from '@/lib/services/invoiceGenerationService';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

interface Tax1099TrackingDisplayProps {
  contractorId?: string;
  contractorName?: string;
  taxYear?: number;
}

function parseError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unable to load 1099 tracking.';
}

function createEmptyTracking(contractorId: string, taxYear: number): Tax1099TrackingSummary {
  return {
    contractor_id: contractorId,
    tax_year: taxYear,
    total_payments: 0,
    total_invoices: 0,
    threshold_reached: false,
    form_1099_issued: false,
    form_1099_recipient_copy_sent: false,
    form_1099_irs_filed: false,
  };
}

export function Tax1099TrackingDisplay({
  contractorId,
  contractorName,
  taxYear = new Date().getUTCFullYear(),
}: Tax1099TrackingDisplayProps) {
  const [tracking, setTracking] = useState<Tax1099TrackingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contractorId) {
      setTracking(null);
      setError(null);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    const loadTracking = async () => {
      try {
        const loaded = await invoiceGenerationService.getTax1099Tracking(contractorId, taxYear);
        if (!active) {
          return;
        }

        setTracking(loaded ?? createEmptyTracking(contractorId, taxYear));
      } catch (loadError) {
        if (!active) {
          return;
        }

        setTracking(null);
        setError(parseError(loadError));
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadTracking();

    return () => {
      active = false;
    };
  }, [contractorId, taxYear]);

  if (!contractorId) {
    return (
      <Card>
        <CardContent className="px-4 py-6 text-sm text-slate-500">
          Select a contractor to view 1099 tracking.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading 1099 tracking...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!tracking) {
    return (
      <Card>
        <CardContent className="px-4 py-6 text-sm text-slate-500">
          1099 tracking data unavailable.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          1099 Tracking {contractorName ? `- ${contractorName}` : ''} ({tracking.tax_year})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tracking.threshold_reached ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              IRS 1099 threshold reached.
              {tracking.threshold_reached_at ? ` Threshold hit on ${formatDate(tracking.threshold_reached_at)}.` : ''}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border p-3">
            <p className="text-xs text-slate-500">Total Payments</p>
            <p className="text-lg font-semibold">{formatCurrency(tracking.total_payments)}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-slate-500">Total Invoices</p>
            <p className="text-lg font-semibold">{tracking.total_invoices}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-slate-500">Threshold Status</p>
            <p className="text-lg font-semibold">{tracking.threshold_reached ? 'Reached' : 'Tracking'}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-slate-500">Form 1099 Issued</p>
            <p className="text-lg font-semibold">{tracking.form_1099_issued ? 'Yes' : 'No'}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={tracking.form_1099_issued ? 'secondary' : 'outline'}>
            1099 Issued: {tracking.form_1099_issued ? 'Yes' : 'No'}
          </Badge>
          <Badge variant={tracking.form_1099_recipient_copy_sent ? 'secondary' : 'outline'}>
            Recipient Copy: {tracking.form_1099_recipient_copy_sent ? 'Sent' : 'Pending'}
          </Badge>
          <Badge variant={tracking.form_1099_irs_filed ? 'secondary' : 'outline'}>
            IRS Filed: {tracking.form_1099_irs_filed ? 'Yes' : 'No'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
