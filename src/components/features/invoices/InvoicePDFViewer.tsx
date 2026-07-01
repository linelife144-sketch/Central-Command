'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  invoiceGenerationService,
  type InvoiceDetails,
} from '@/lib/services/invoiceGenerationService';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

interface InvoicePDFViewerProps {
  invoiceId?: string;
  invoiceDetails?: InvoiceDetails;
}

function parseError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unable to load invoice details.';
}

export function InvoicePDFViewer({ invoiceId, invoiceDetails }: InvoicePDFViewerProps) {
  const [details, setDetails] = useState<InvoiceDetails | null>(invoiceDetails ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invoiceDetails) {
      setDetails(invoiceDetails);
      setError(null);
      return;
    }

    if (!invoiceId) {
      setDetails(null);
      setError(null);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    const loadDetails = async () => {
      try {
        const loaded = await invoiceGenerationService.getInvoiceDetails(invoiceId);
        if (!active) {
          return;
        }

        setDetails(loaded);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setDetails(null);
        setError(parseError(loadError));
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadDetails();

    return () => {
      active = false;
    };
  }, [invoiceDetails, invoiceId]);

  if (!invoiceId && !invoiceDetails) {
    return (
      <Card>
        <CardContent className="px-4 py-6 text-sm text-slate-500">
          Select an invoice to preview PDF details.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading invoice preview...
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

  if (!details) {
    return (
      <Card>
        <CardContent className="px-4 py-6 text-sm text-slate-500">
          Invoice details are unavailable.
        </CardContent>
      </Card>
    );
  }

  const { invoice, line_items: lineItems } = details;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Invoice PDF Viewer</CardTitle>
          {invoice.pdf_url ? (
            <Button asChild variant="outline" size="sm">
              <Link href={invoice.pdf_url} target="_blank">
                <FileText className="mr-2 h-4 w-4" />
                Open PDF
              </Link>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Invoice Number</p>
              <p className="text-sm font-semibold">{invoice.invoice_number}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Billing Period</p>
              <p className="text-sm font-semibold">
                {formatDate(invoice.billing_period_start)} - {formatDate(invoice.billing_period_end)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <p className="text-sm font-semibold">{invoice.status}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Amount</p>
              <p className="text-sm font-semibold">{formatCurrency(invoice.total_amount)}</p>
            </div>
          </div>

          {invoice.pdf_url ? (
            <div className="overflow-hidden rounded-md border">
              <iframe title={`Invoice ${invoice.invoice_number}`} src={invoice.pdf_url} className="h-[560px] w-full" />
            </div>
          ) : (
            <div className="rounded-md border border-grid-surface bg-grid-surface px-4 py-3 text-sm text-slate-600">
              PDF file has not been generated for this invoice yet. Using line-item preview below.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Line Item Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-slate-500">
                      No line items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  lineItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.item_type}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.quantity ?? '-'}</TableCell>
                      <TableCell>{item.rate !== undefined ? formatCurrency(item.rate) : '-'}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
