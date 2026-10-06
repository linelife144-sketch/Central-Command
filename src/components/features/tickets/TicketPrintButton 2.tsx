'use client';
import { useState } from 'react';
import { Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { canPrintTicket, loadTicketReport, printTicketReport } from '@/lib/services/ticketReportService';
import type { Ticket } from '@/types';
export function TicketPrintButton({ ticket, assigneeName }: { ticket: Ticket; assigneeName?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!canPrintTicket(ticket)) return null;
  const print = async () => {
    setBusy(true); setError('');
    try { await printTicketReport(await loadTicketReport(ticket.id, assigneeName)); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to prepare the ticket report.'); }
    finally { setBusy(false); }
  };
  return <div className="min-w-0"><Button variant="outline" disabled={busy} onClick={() => void print()}>{busy ? <Loader2 className="animate-spin" /> : <Printer />}{busy ? 'Preparing ticket…' : 'Print / Save PDF'}</Button><p className="mt-1 text-xs text-muted-foreground">Choose a printer or Save as PDF in the print dialog.</p>{error && <p role="alert" className="mt-2 max-w-sm text-sm text-destructive">{error}</p>}</div>;
}
