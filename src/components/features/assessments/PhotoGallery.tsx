'use client';

import Image from 'next/image';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCoordinates, formatDateTime, formatFileSize } from '@/lib/utils/formatters';
import type { CapturedAssessmentPhoto } from '@/types';

interface PhotoGalleryProps {
  photos: CapturedAssessmentPhoto[];
  onRemovePhoto?: (photoId: string) => void;
}

function renderGpsStatus(photo: CapturedAssessmentPhoto): string {
  return formatCoordinates(photo.metadata.gpsLatitude, photo.metadata.gpsLongitude);
}

export function PhotoGallery({ photos, onRemovePhoto }: PhotoGalleryProps) {
  if (photos.length === 0) {
    return (
      <Card>
        <CardContent className="px-4 py-6 text-sm text-slate-500">
          No captured photos yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo) => (
        <Card key={photo.id} className="overflow-hidden">
          <div className="relative aspect-video bg-slate-100">
            {photo.previewUrl ? (
              <Image
                src={photo.previewUrl}
                alt={`${photo.type.toLowerCase()} capture`}
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">
                Preview unavailable
              </div>
            )}
            {onRemovePhoto && (
              <Button
                size="icon"
                variant="destructive"
                className="absolute right-2 top-2 h-7 w-7"
                onClick={() => onRemovePhoto(photo.id)}
                aria-label="Remove photo"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <CardContent className="space-y-2 p-3 text-xs">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{photo.type.replace('_', ' ')}</Badge>
              <div className="flex gap-1">
                {photo.compressed && <Badge variant="outline">Compressed</Badge>}
                {photo.isDuplicate && <Badge variant="destructive">Duplicate</Badge>}
              </div>
            </div>
            <p>Size: {formatFileSize(photo.sizeBytes)}</p>
            <p>GPS: {renderGpsStatus(photo)}</p>
            <p>Captured: {formatDateTime(photo.metadata.capturedAt ?? photo.capturedAt)}</p>
            {photo.isDuplicate && photo.duplicateOfPhotoId && (
              <p className="text-amber-700">Matches prior photo: {photo.duplicateOfPhotoId}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
