'use client';

import Image from 'next/image';
import { useEffect, useId, useMemo, useRef } from 'react';
import { Camera, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_CONFIG } from '@/lib/config/appConfig';
import { validatePhotoFile } from '@/lib/utils/validators';

interface ReceiptCaptureProps {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  existingReceiptUrl?: string;
}

const ACCEPTED_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ReceiptCapture({
  value,
  onChange,
  disabled = false,
  existingReceiptUrl,
}: ReceiptCaptureProps) {
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
  const hasStoredReceipt = Boolean(existingReceiptUrl && !previewUrl);

  const inputId = useId();

  const handleFileSelected = (file: File | null) => {
    if (!file) {
      return;
    }

    const validation = validatePhotoFile(file, APP_CONFIG.MAX_PHOTO_SIZE_MB, ACCEPTED_RECEIPT_TYPES);
    if (!validation.valid) {
      toast.error(validation.error ?? 'Invalid receipt file.');
      return;
    }

    onChange(file);
    toast.success('Receipt attached.');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Receipt Capture</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept={ACCEPTED_RECEIPT_TYPES.join(',')}
          capture="environment"
          className="hidden"
          disabled={disabled}
          onChange={(event) => {
            handleFileSelected(event.target.files?.[0] ?? null);
            event.target.value = '';
          }}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="mr-2 h-4 w-4" />
            Capture Receipt
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Receipt
          </Button>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              onClick={() => onChange(null)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          ) : null}
        </div>

        {hasPreview ? (
          <div className="relative aspect-video overflow-hidden rounded-md border bg-slate-100">
            <Image
              src={previewUrl as string}
              alt="Receipt preview"
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        ) : null}

        {hasStoredReceipt ? (
          <p className="text-xs text-emerald-700">A receipt is already attached to this expense.</p>
        ) : null}

        {!hasPreview && !hasStoredReceipt ? (
          <p className="text-xs text-slate-500">
            Attach a clear receipt image (JPEG/PNG/WebP, max {APP_CONFIG.MAX_PHOTO_SIZE_MB}MB).
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
