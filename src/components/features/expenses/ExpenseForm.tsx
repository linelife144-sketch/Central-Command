'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ticketService } from '@/lib/services/ticketService';
import {
  expenseSubmissionService,
  type ExpenseListItem,
} from '@/lib/services/expenseSubmissionService';
import { EXPENSE_CATEGORIES } from '@/lib/config/appConfig';
import type { Ticket } from '@/types';
import { calculateMileageExpense } from '@/lib/utils/expenseProcessing';

import {
  ExpenseItemForm,
  type ExpenseItemDraft,
  type ExpenseTicketOption,
} from './ExpenseItemForm';

interface ExpenseFormProps {
  contractorId?: string;
  onSaved?: (expenseItem: ExpenseListItem) => void;
}

function toDateInputValue(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function createInitialDraft(): ExpenseItemDraft {
  return {
    category: EXPENSE_CATEGORIES.FUEL,
    description: '',
    amount: '',
    expenseDate: toDateInputValue(),
    mileageStart: '',
    mileageEnd: '',
    fromLocation: '',
    toLocation: '',
    ticketId: '',
    billableToClient: false,
    receiptFile: null,
  };
}

function mapTicketsToOptions(tickets: Ticket[]): ExpenseTicketOption[] {
  return tickets.map((ticket) => ({
    id: ticket.id,
    ticketNumber: ticket.ticket_number,
  }));
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}

export function ExpenseForm({ contractorId, onSaved }: ExpenseFormProps) {
  const [draft, setDraft] = useState<ExpenseItemDraft>(() => createInitialDraft());
  const [ticketOptions, setTicketOptions] = useState<ExpenseTicketOption[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!contractorId) {
      setTicketOptions([]);
      setIsLoadingTickets(false);
      return;
    }

    let active = true;
    setIsLoadingTickets(true);

    const loadTickets = async () => {
      try {
        const tickets = await ticketService.getTicketsByAssignee(contractorId);
        if (active) {
          setTicketOptions(mapTicketsToOptions(tickets));
        }
      } catch {
        if (active) {
          setTicketOptions([]);
          toast.error('Unable to load assigned tickets. You can still save without a ticket link.');
        }
      } finally {
        if (active) {
          setIsLoadingTickets(false);
        }
      }
    };

    void loadTickets();

    return () => {
      active = false;
    };
  }, [contractorId]);

  const canSubmit = useMemo(() => {
    return Boolean(contractorId) && !isSubmitting;
  }, [isSubmitting, contractorId]);

  const handleSaveExpense = async () => {
    if (!contractorId) {
      toast.error('Missing contractor profile. Please sign in again.');
      return;
    }

    const mileageStart = parseOptionalNumber(draft.mileageStart);
    const mileageEnd = parseOptionalNumber(draft.mileageEnd);
    const mileageSummary = calculateMileageExpense({
      mileageStart,
      mileageEnd,
    });

    const parsedAmount =
      draft.category === 'MILEAGE' && mileageSummary.isValid && mileageSummary.calculatedAmount > 0
        ? mileageSummary.calculatedAmount
        : Number(draft.amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error(
        draft.category === 'MILEAGE'
          ? 'Mileage requires valid odometer values that result in a positive amount.'
          : 'Enter a valid amount greater than zero.',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await expenseSubmissionService.createExpenseItem({
        contractorId,
        category: draft.category,
        description: draft.description,
        amount: parsedAmount,
        expenseDate: draft.expenseDate,
        receiptFile: draft.receiptFile,
        mileageStart,
        mileageEnd,
        fromLocation: draft.fromLocation || undefined,
        toLocation: draft.toLocation || undefined,
        ticketId: draft.ticketId || undefined,
        billableToClient: draft.billableToClient,
      });

      toast.success('Expense saved.');
      setDraft(createInitialDraft());
      onSaved?.(created);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">New Expense</CardTitle>
        <CardDescription>
          Log a reimbursable expense and attach receipt evidence for review.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!contractorId ? (
          <Alert variant="destructive">
            <AlertDescription>
              Contractor context is unavailable. Re-authenticate before creating expenses.
            </AlertDescription>
          </Alert>
        ) : null}

        {isLoadingTickets ? (
          <div className="rounded-md border bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Loading related tickets...
          </div>
        ) : null}

        <ExpenseItemForm
          value={draft}
          onChange={setDraft}
          ticketOptions={ticketOptions}
          disabled={!canSubmit}
        />

        <div className="flex justify-end border-t pt-4">
          <Button type="button" disabled={!canSubmit} onClick={handleSaveExpense}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Expense
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
