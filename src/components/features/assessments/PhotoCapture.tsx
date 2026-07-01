'use client';

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PhotoGallery } from '@/components/features/assessments/PhotoGallery';
import { photoUploadQueue } from '@/lib/sync/photoUploadQueue';
import {
  DEFAULT_REQUIRED_PHOTO_TYPES,
  getMissingRequiredPhotoTypes,
  prepareCapturedPhoto,
  revokeCapturedPhotoPreview,
} from '@/lib/utils/assessmentPhotos';
import type { AssessmentPhotoType, CapturedAssessmentPhoto } from '@/types';

interface PhotoCaptureProps {
  ticketId: string;
  requiredTypes?: AssessmentPhotoType[];
  onPhotosCaptured?: (photos: CapturedAssessmentPhoto[]) => void;
  maxPhotos?: number;
  queueOnCapture?: boolean;
}

const ALL_PHOTO_TYPES: AssessmentPhotoType[] = ['OVERVIEW', 'EQUIPMENT', 'DAMAGE', 'SAFETY', 'CONTEXT'];

function formatPhotoType(type: AssessmentPhotoType): string {
  return type.replace('_', ' ');
}

export function PhotoCapture({
  ticketId,
  requiredTypes = DEFAULT_REQUIRED_PHOTO_TYPES,
  onPhotosCaptured,
  maxPhotos = 12,
  queueOnCapture = false,
}: PhotoCaptureProps) {
  const [photos, setPhotos] = useState<CapturedAssessmentPhoto[]>([]);
  const [selectedType, setSelectedType] = useState<AssessmentPhotoType>(requiredTypes[0] ?? 'OVERVIEW');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photosRef = useRef<CapturedAssessmentPhoto[]>([]);

  useEffect(() => {
    photosRef.current = photos;
    onPhotosCaptured?.(photos);
  }, [onPhotosCaptured, photos]);

  useEffect(() => () => {
    photosRef.current.forEach((photo) => revokeCapturedPhotoPreview(photo));
  }, []);

  const missingRequiredTypes = useMemo(
    () => getMissingRequiredPhotoTypes(photos, requiredTypes),
    [photos, requiredTypes],
  );

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (photos.length >= maxPhotos) {
      toast.error(`Maximum ${maxPhotos} photos allowed for this capture session.`);
      return;
    }

    setIsProcessing(true);
    try {
      const capturedPhoto = await prepareCapturedPhoto({
        file,
        type: selectedType,
        ticketId,
        existingPhotos: photos.map((photo) => ({
          id: photo.id,
          checksumSha256: photo.checksumSha256,
        })),
      });
      setPhotos((previous) => [...previous, capturedPhoto]);
      if (capturedPhoto.isDuplicate) {
        toast.warning(`${formatPhotoType(selectedType)} photo captured and flagged as duplicate.`);
      } else {
        toast.success(`${formatPhotoType(selectedType)} photo captured.`);
      }

      if (queueOnCapture) {
        try {
          await photoUploadQueue.add(capturedPhoto);
        } catch {
          toast.error('Photo captured, but queueing for upload failed.');
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to process photo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos((previous) => {
      const nextPhotos = previous.filter((photo) => photo.id !== photoId);
      const removedPhoto = previous.find((photo) => photo.id === photoId);
      if (removedPhoto) {
        revokeCapturedPhotoPreview(removedPhoto);
      }
      return nextPhotos;
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-lg">Photo Capture</CardTitle>
          <p className="text-sm text-slate-600">
            Capture photos with EXIF metadata, GPS coordinates, and image compression.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {ALL_PHOTO_TYPES.map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type)}
              >
                {formatPhotoType(type)}
              </Button>
            ))}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={handleFilesSelected}
            className="hidden"
          />

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleOpenFilePicker} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Capture Photo
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleOpenFilePicker} disabled={isProcessing}>
              <Upload className="mr-2 h-4 w-4" />
              Upload from Device
            </Button>
          </div>

          <div className="space-y-2 rounded-md border bg-slate-50 p-3 text-sm">
            <p className="font-medium">Required Coverage</p>
            <div className="flex flex-wrap gap-2">
              {requiredTypes.map((type) => (
                <Badge key={type} variant={missingRequiredTypes.includes(type) ? 'outline' : 'secondary'}>
                  {missingRequiredTypes.includes(type) ? formatPhotoType(type) : `${formatPhotoType(type)} DONE`}
                </Badge>
              ))}
            </div>
            {missingRequiredTypes.length === 0 ? (
              <p className="flex items-center gap-1 text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Required photo types captured.
              </p>
            ) : (
              <p className="text-amber-700">
                Missing required types: {missingRequiredTypes.map((type) => formatPhotoType(type)).join(', ')}.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <PhotoGallery photos={photos} onRemovePhoto={handleRemovePhoto} />
    </div>
  );
}
