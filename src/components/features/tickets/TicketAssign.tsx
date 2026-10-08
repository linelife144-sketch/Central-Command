"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { stormRosterService, type StormRosterMember } from '@/lib/services/stormRosterService';

interface TicketAssignProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (contractorId: string) => Promise<void>;
  currentAssigneeId?: string;
  stormEventId?: string;
  ticketNumber: string;
}

export function TicketAssign({ isOpen, onClose, onAssign, currentAssigneeId, stormEventId, ticketNumber }: TicketAssignProps) {
  const [assigneeId, setAssigneeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contractors, setContractors] = useState<StormRosterMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setAssigneeId('');
      setContractors([]);
      setError('');
      setIsLoading(true);
      if (!stormEventId) {
        setIsLoading(false);
        return;
      }
      try {
        const options = await stormRosterService.list(stormEventId);
        if (cancelled) return;
        setContractors(options);
        if (options.some(member => member.contractorId === currentAssigneeId)) setAssigneeId(currentAssigneeId!);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load contractors. Close and try again.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [isOpen, stormEventId, currentAssigneeId]);

  async function handleSubmit() {
    if (isLoading || isSubmitting || !contractors.some(member => member.contractorId === assigneeId)) return;
    setIsSubmitting(true);
    setError('');
    try {
      await onAssign(assigneeId);
      onClose();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : (cause as { message?: string } | null)?.message;
      setError(message || 'Unable to assign this ticket. Please try again.');
    } finally { setIsSubmitting(false); }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSubmitting) onClose(); }}>
      <DialogContent className="sm:max-w-[425px]" onEscapeKeyDown={(event) => { if (isSubmitting) event.preventDefault(); }} onPointerDownOutside={(event) => { if (isSubmitting) event.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>Assign Ticket {ticketNumber}</DialogTitle>
          <DialogDescription>Select from all active contractors.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Label htmlFor="ticket-contractor">Assign To</Label>
          <Select value={assigneeId} onValueChange={setAssigneeId} disabled={isLoading || isSubmitting || contractors.length === 0}>
            <SelectTrigger id="ticket-contractor"><SelectValue placeholder={isLoading ? 'Loading contractors…' : 'Select contractor'} /></SelectTrigger>
            <SelectContent>
              {contractors.map(member => <SelectItem key={member.contractorId} value={member.contractorId}>{member.displayName}</SelectItem>)}
            </SelectContent>
          </Select>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {!isLoading && !error && contractors.length === 0 && (
            <p className="text-sm text-muted-foreground">No contractors assigned to this storm.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading || !assigneeId || isSubmitting}>{isSubmitting ? 'Assigning…' : 'Assign Ticket'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
