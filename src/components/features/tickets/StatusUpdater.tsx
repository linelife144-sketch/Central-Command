'use client';

import { useState } from 'react';
import { Ticket, TicketStatus, UserRole } from '@/types';
import { getNextPossibleStatuses } from '@/lib/utils/statusTransitions';
import { ticketService } from '@/lib/services/ticketService';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface StatusUpdaterProps {
  ticket: Ticket;
  userRole: UserRole;
  userId: string;
  onStatusUpdated?: (newStatus: TicketStatus) => void;
}

const statusButtonConfig: Record<TicketStatus, { label: string; variant: 'default' | 'outline' | 'destructive' | 'secondary' }> = {
  IN_ROUTE: { label: 'Start Route', variant: 'default' },
  ON_SITE: { label: 'Mark On Site', variant: 'default' },
  IN_PROGRESS: { label: 'Start Assessment', variant: 'default' },
  COMPLETE: { label: 'Mark Complete', variant: 'default' },
  PENDING_REVIEW: { label: 'Submit for Review', variant: 'default' },
  APPROVED: { label: 'Approve', variant: 'secondary' },
  NEEDS_REWORK: { label: 'Request Rework', variant: 'outline' },
  REJECTED: { label: 'Reject', variant: 'destructive' },
  CLOSED: { label: 'Close Ticket', variant: 'destructive' },
  DRAFT: { label: 'Revert to Draft', variant: 'outline' },
  ASSIGNED: { label: 'Assign', variant: 'default' },
  ARCHIVED: { label: 'Archive', variant: 'outline' },
  EXPIRED: { label: 'Mark Expired', variant: 'destructive' },
};

export function StatusUpdater({ ticket, userRole, userId, onStatusUpdated }: StatusUpdaterProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<TicketStatus | null>(null);
  const [reason, setReason] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const possibleStatuses = getNextPossibleStatuses(ticket.status, userRole);

  const handleStatusClick = (status: TicketStatus) => {
    const negativeStatuses: TicketStatus[] = ['REJECTED', 'NEEDS_REWORK', 'CLOSED'];
    
    if (negativeStatuses.includes(status)) {
      setPendingStatus(status);
      setIsConfirmOpen(true);
    } else {
      performUpdate(status);
    }
  };

  const performUpdate = async (status: TicketStatus, updateReason?: string) => {
    setIsUpdating(true);
    try {
      await ticketService.updateTicketStatus(
        ticket.id, 
        status, 
        userId, 
        userRole, 
        updateReason
      );
      toast.success(`Ticket status updated to ${status.toLowerCase().replace('_', ' ')}`);
      onStatusUpdated?.(status);
      setIsConfirmOpen(false);
      setReason('');
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (possibleStatuses.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {possibleStatuses.map((status) => {
        const config = statusButtonConfig[status] || { label: status, variant: 'outline' };
        return (
          <Button
            key={status}
            variant={config.variant}
            onClick={() => handleStatusClick(status)}
            disabled={isUpdating}
            className="font-semibold"
          >
            {isUpdating && pendingStatus === status && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {config.label}
          </Button>
        );
      })}

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to change the status to {pendingStatus?.toLowerCase().replace('_', ' ')}?
              {['REJECTED', 'NEEDS_REWORK', 'CLOSED'].includes(pendingStatus!) && 
                " This action requires a reason."}
            </DialogDescription>
          </DialogHeader>
          
          {['REJECTED', 'NEEDS_REWORK', 'CLOSED'].includes(pendingStatus!) && (
            <div className="space-y-2 py-4">
              <Label htmlFor="reason">Reason for Change</Label>
              <Textarea 
                id="reason"
                placeholder="Enter details here..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button 
              variant={pendingStatus ? statusButtonConfig[pendingStatus]?.variant : 'default'}
              onClick={() => performUpdate(pendingStatus!, reason)}
              disabled={isUpdating || (['REJECTED', 'NEEDS_REWORK', 'CLOSED'].includes(pendingStatus!) && !reason.trim())}
            >
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
