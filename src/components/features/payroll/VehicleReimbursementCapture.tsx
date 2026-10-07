'use client';

import { useEffect, useMemo, useState } from 'react';
import { Car } from 'lucide-react';
import { toast } from 'sonner';

import { PhotoCapture } from '@/components/common/forms/PhotoCapture';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { VEHICLE_TYPE_LABELS } from '@/lib/config/appConfig';
import { payrollService } from '@/lib/services/payrollService';

import type { VehicleType } from '@/types';
import type { VehicleClaimShift } from '@/lib/db/dexie';

export interface VehicleReimbursementCaptureProps {
  /** A closed (clocked-out) time entry — the claim can only be finalized once billableMinutes is known. */
  entry: VehicleClaimShift;
  contractorId: string;
  onSubmitted?: () => void;
  enabled?: boolean;
}

/**
 * Driver-only post-clock-out capture: vehicle type, declared hours, notes,
 * and two required photos (vehicle + license plate). The server-side
 * trigger (private.compute_vehicle_claim_amount) only resolves an amount
 * once time_entries.clock_out_at is set, so this is deliberately a
 * post-shift action rather than a clock-in gate.
 */
export function VehicleReimbursementCapture({ entry, contractorId, onSubmitted, enabled = true }: VehicleReimbursementCaptureProps) {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  useEffect(() => {
    const connected = () => setOnline(true);
    const disconnected = () => setOnline(false);
    window.addEventListener('online', connected); window.addEventListener('offline', disconnected);
    return () => { window.removeEventListener('online', connected); window.removeEventListener('offline', disconnected); };
  }, []);
  const [vehicleType, setVehicleType] = useState<VehicleType>('PERSONAL');
  const [declaredHours, setDeclaredHours] = useState<string>(entry.vehicle_minutes === undefined ? '' : String(Number((entry.vehicle_minutes / 60).toFixed(4))));
  const [notes, setNotes] = useState('');
  const [vehiclePhoto, setVehiclePhoto] = useState<File | null>(null);
  const [licensePlatePhoto, setLicensePlatePhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const billableMinutes = entry.billable_minutes ?? 0;
  const shiftHours = billableMinutes / 60;

  const preview = useMemo(() => {
    const parsedHours = Number(declaredHours);
    if (!declaredHours || Number.isNaN(parsedHours) || parsedHours <= 0) {
      return null;
    }

    return entry.vehicle_allowance_amount === undefined ? null : { amount: entry.vehicle_allowance_amount, capped: false };
  }, [declaredHours, entry.vehicle_allowance_amount]);

  const canSubmit =
    enabled && online && entry.sync_status === 'SYNCED' && Boolean(entry.clock_out_at) && entry.contractor_id === contractorId &&
    Boolean(declaredHours) &&
    Number(declaredHours) > 0 &&
    notes.trim().length >= 3 &&
    Boolean(vehiclePhoto) &&
    Boolean(licensePlatePhoto) &&
    !isSubmitting &&
    !submitted;

  const handleSubmit = async () => {
    if (!enabled || !navigator.onLine || entry.sync_status !== 'SYNCED' || !entry.clock_out_at || entry.contractor_id !== contractorId) {
      toast.error('Connect to the internet and synchronize this shift before submitting vehicle evidence.');
      return;
    }
    if (!vehiclePhoto || !licensePlatePhoto) {
      toast.error('A vehicle photo and a license plate photo are both required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await payrollService.submitVehicleClaim({
        timeEntryId: entry.id,
        contractorId,
        vehicleType,
        declaredHours: Number(declaredHours),
        notes,
        vehiclePhotoFile: vehiclePhoto,
        licensePlatePhotoFile: licensePlatePhoto,
      });

      toast.success('Vehicle reimbursement submitted for review.');
      setSubmitted(true);
      onSubmitted?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit vehicle reimbursement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-grid-success-ink">
          Vehicle reimbursement submitted — pending admin review.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Car className="h-4 w-4" />
          Vehicle Reimbursement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Vehicle allowance uses recorded vehicle-use intervals and your saved agreement. Attach the existing evidence to submit the calculated allowance for review.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vehicle-type">Vehicle Type</Label>
            <Select
              value={vehicleType}
              onValueChange={(value) => setVehicleType(value as VehicleType)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="vehicle-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="declared-hours">Hours Vehicle Was Used</Label>
            <Input
              id="declared-hours"
              type="number"
              min={0}
              max={shiftHours || undefined}
              step={0.25}
              value={declaredHours}
              disabled={isSubmitting || entry.calculation_version === 'AGREEMENT'}
              readOnly={entry.calculation_version === 'AGREEMENT'}
              onChange={(event) => setDeclaredHours(event.target.value)}
              placeholder={`Shift was ${shiftHours.toFixed(1)}h`}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vehicle-notes">Notes</Label>
          <Textarea
            id="vehicle-notes"
            value={notes}
            disabled={isSubmitting}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Describe your vehicle use for this shift."
            rows={2}
          />
        </div>

        {preview ? (
          <div className="rounded-md border border-dashed border-grid-blue/40 bg-surface-sunken p-3 text-xs text-foreground">
            Estimated reimbursement: <span className="font-semibold">${preview.amount.toFixed(2)}</span>
            {preview.capped ? (
              <span className="ml-1 text-grid-warning-ink">
                (capped at the {shiftHours.toFixed(1)}h shift length)
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Vehicle Photo</Label>
            <PhotoCapture
              value={vehiclePhoto}
              onChange={setVehiclePhoto}
              disabled={isSubmitting}
              label="Vehicle"
              helpMessage="Photo of the vehicle used, required."
            />
          </div>
          <div className="space-y-2">
            <Label>License Plate Photo</Label>
            <PhotoCapture
              value={licensePlatePhoto}
              onChange={setLicensePlatePhoto}
              disabled={isSubmitting}
              label="License Plate"
              helpMessage="Photo of the license plate, required."
            />
          </div>
        </div>

        <Button disabled={!canSubmit} onClick={handleSubmit}>
          Submit Vehicle Reimbursement
        </Button>
      </CardContent>
    </Card>
  );
}
