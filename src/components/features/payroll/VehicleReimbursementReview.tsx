'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';

import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { VEHICLE_TYPE_LABELS } from '@/lib/config/appConfig';
import { payrollService } from '@/lib/services/payrollService';
import { formatDateTime } from '@/lib/utils/formatters';
import type { VehicleClaim } from '@/types';

export interface VehicleReimbursementReviewProps {
  reviewerId?: string;
  stormEventId?: string;
  canEdit?: boolean;
  onReviewed?: () => void;
}

/**
 * Admin review queue for driver vehicle reimbursement claims. Lists
 * PENDING claims with both required photos visible side by side, declared
 * vs. billed hours, and the server-resolved amount (never recomputed
 * client-side). Approve/reject mirrors the existing time-entry review
 * batch pattern in TimeEntryList.tsx.
 */
export function VehicleReimbursementReview({ reviewerId, stormEventId, canEdit = false, onReviewed }: VehicleReimbursementReviewProps) {
  const [claims, setClaims] = useState<VehicleClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyClaimId, setBusyClaimId] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

  const loadClaims = useCallback(async () => {
    setIsLoading(true);
    try {
      const pending = await payrollService.listVehicleClaims({ status: 'PENDING', ...(stormEventId ? { stormEventId } : {}) });
      setClaims(pending);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load vehicle reimbursement claims.');
    } finally {
      setIsLoading(false);
    }
  }, [stormEventId]);

  useEffect(() => {
    void Promise.resolve().then(loadClaims);
  }, [loadClaims]);

  const handleApprove = async (claim: VehicleClaim) => {
    if (!canEdit) return;
    if (!reviewerId) {
      toast.error('Unable to review without an authenticated reviewer.');
      return;
    }

    setBusyClaimId(claim.id);
    try {
      await payrollService.reviewVehicleClaim({ claimId: claim.id, reviewerId, decision: 'APPROVED' });
      toast.success('Vehicle reimbursement approved.');
      onReviewed?.();
      setClaims((previous) => previous.filter((item) => item.id !== claim.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to approve claim.');
    } finally {
      setBusyClaimId(null);
    }
  };

  const handleReject = async (claim: VehicleClaim) => {
    if (!canEdit) return;
    if (!reviewerId) {
      toast.error('Unable to review without an authenticated reviewer.');
      return;
    }

    const rejectionReason = rejectionReasons[claim.id]?.trim();
    if (!rejectionReason) {
      toast.error('Enter a rejection reason.');
      return;
    }

    setBusyClaimId(claim.id);
    try {
      await payrollService.reviewVehicleClaim({
        claimId: claim.id,
        reviewerId,
        decision: 'REJECTED',
        rejectionReason,
      });
      toast.success('Vehicle reimbursement rejected.');
      onReviewed?.();
      setClaims((previous) => previous.filter((item) => item.id !== claim.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to reject claim.');
    } finally {
      setBusyClaimId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Loading vehicle reimbursements…</CardContent>
      </Card>
    );
  }

  if (claims.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No pending vehicle reimbursement claims.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {claims.map((claim) => (
        <Card key={claim.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-base">{VEHICLE_TYPE_LABELS[claim.vehicle_type]}</CardTitle>
              <div className="flex items-center gap-2">
                {claim.capped ? <Badge variant="warning">Capped</Badge> : null}
                <StatusBadge status={claim.status} variant="pending" size="sm" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <p>
                <span className="font-medium">Declared Hours:</span> {claim.declared_hours.toFixed(2)}h
              </p>
              <p>
                <span className="font-medium">Amount:</span> ${claim.amount.toFixed(2)}
              </p>
              <p>
                <span className="font-medium">Submitted:</span> {formatDateTime(claim.created_at)}
              </p>
            </div>

            <p className="text-xs text-muted-foreground">{claim.notes}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="relative aspect-video overflow-hidden rounded-md border border-border bg-surface-sunken">
                <Image src={claim.vehicle_photo_url} alt="Vehicle photo" fill unoptimized className="object-cover" />
              </div>
              <div className="relative aspect-video overflow-hidden rounded-md border border-border bg-surface-sunken">
                <Image
                  src={claim.license_plate_photo_url}
                  alt="License plate photo"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            </div>

            <Input
              placeholder="Rejection reason (required to reject)"
              value={rejectionReasons[claim.id] ?? ''}
              disabled={!canEdit || (busyClaimId === claim.id)}
              onChange={(event) =>
                setRejectionReasons((previous) => ({ ...previous, [claim.id]: event.target.value }))
              }
            />
          </CardContent>
          <CardFooter className="flex gap-2 pt-0">
            <Button
              size="sm"
              variant="outline"
              disabled={!canEdit || (busyClaimId === claim.id)}
              onClick={() => void handleReject(claim)}
            >
              <X className="mr-1 h-3.5 w-3.5" /> Reject
            </Button>
            <Button size="sm" disabled={!canEdit || (busyClaimId === claim.id)} onClick={() => void handleApprove(claim)}>
              <Check className="mr-1 h-3.5 w-3.5" /> Approve
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
