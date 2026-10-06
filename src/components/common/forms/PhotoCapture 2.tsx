'use client';

import Image from 'next/image';
import { useEffect, useId, useMemo, useRef } from 'react';
import { Camera, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { APP_CONFIG } from '@/lib/config/appConfig';
import { validatePhotoFile } from '@/lib/utils/validators';

export const DEFAULT_PHOTO_CAPTURE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface PhotoCaptureProps {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  existingPhotoUrl?: string;
  /** Label shown on the capture/upload buttons, e.g. "Receipt", "Vehicle". */
  label: string;
  acceptedTypes?: string[];
  maxSizeMB?: number;
  /** Shown when a photo is already attached/stored. */
  storedMessage?: string;
  /** Shown when nothing is attached yet. */
  helpMessage?: string;
}

/**
 * Shared camera/file capture control: preview, validation, and
 * revoke-on-unmount. Extracted from ReceiptCapture so the same capture UX
 * is reused for vehicle reimbursement photos (VehicleReimbursementCapture)
 * without forking the logic.
 */
export function PhotoCapture({
  value,
  onChange,
  disabled = false,
  existingPhotoUrl,
  label,
  acceptedTypes = DEFAULT_PHOTO_CAPTURE_TYPES,
  maxSizeMB = APP_CONFIG.MAX_PHOTO_SIZE_MB,
  storedMessage,
  helpMessage,
}: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const previewUrl = useMemo(() => (value ? URL.createObjectURL(value) : null), [value]);

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl],
  );

  const hasPreview = Boolean(previewUrl);
  const hasStoredPhoto = Boolean(existingPhotoUrl && !previewUrl);

  const inputId = useId();

  const handleFileSelected = (file: File | null) => {
    if (!file) {
      return;
    }

    const validation = validatePhotoFile(file, maxSizeMB, acceptedTypes);
    if (!validation.valid) {
      toast.error(validation.error ?? `Invalid ${label.toLowerCase()} file.`);
      return;
    }

    onChange(file);
    toast.success(`${label} attached.`);
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={acceptedTypes.join(',')}
        capture="environment"
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          handleFileSelected(event.target.files?.[0] ?? null);
          event.target.value = '';
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={disabled} onClick={() => fileInputRef.current?.click()}>
          <Camera className="mr-2 h-4 w-4" />
          Capture {label}
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          Upload {label}
        </Button>
        {value ? (
          <Button type="button" variant="ghost" disabled={disabled} onClick={() => onChange(null)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
        ) : null}
      </div>

      {hasPreview ? (
        <div className="relative aspect-video overflow-hidden rounded-md border border-border bg-surface-sunken">
          <Image src={previewUrl as string} alt={`${label} preview`} fill unoptimized className="object-cover" />
        </div>
      ) : null}

      {hasStoredPhoto ? (
        <p className="text-xs text-grid-success-ink">{storedMessage ?? `A ${label.toLowerCase()} is already attached.`}</p>
      ) : null}

      {!hasPreview && !hasStoredPhoto ? (
        <p className="text-xs text-muted-foreground">
          {helpMessage ?? `Attach a clear ${label.toLowerCase()} image (JPEG/PNG/WebP, max ${maxSizeMB}MB).`}
        </p>
      ) : null}
    </div>
  );
}
