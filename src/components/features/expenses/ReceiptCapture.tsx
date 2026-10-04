'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PhotoCapture, DEFAULT_PHOTO_CAPTURE_TYPES } from '@/components/common/forms/PhotoCapture';
import { APP_CONFIG } from '@/lib/config/appConfig';

interface ReceiptCaptureProps {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  existingReceiptUrl?: string;
}

const ACCEPTED_RECEIPT_TYPES = DEFAULT_PHOTO_CAPTURE_TYPES;

export function ReceiptCapture({
  value,
  onChange,
  disabled = false,
  existingReceiptUrl,
}: ReceiptCaptureProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Receipt Capture</CardTitle>
      </CardHeader>
      <CardContent>
        <PhotoCapture
          value={value}
          onChange={onChange}
          disabled={disabled}
          existingPhotoUrl={existingReceiptUrl}
          label="Receipt"
          acceptedTypes={ACCEPTED_RECEIPT_TYPES}
          maxSizeMB={APP_CONFIG.MAX_PHOTO_SIZE_MB}
          storedMessage="A receipt is already attached to this expense."
          helpMessage={`Attach a clear receipt image (JPEG/PNG/WebP, max ${APP_CONFIG.MAX_PHOTO_SIZE_MB}MB).`}
        />
      </CardContent>
    </Card>
  );
}
