import { APP_CONFIG } from '../config/appConfig';
import { validateAssessmentPhoto } from '../validation/photoValidation';
import { compressImageFile } from './imageCompression';
import { extractExifMetadataFromFile } from './exif';
import type { AssessmentPhotoType, CapturedAssessmentPhoto } from '../../types';

export const DEFAULT_REQUIRED_PHOTO_TYPES: AssessmentPhotoType[] = [
  'OVERVIEW',
  'EQUIPMENT',
  'DAMAGE',
  'SAFETY',
];

const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface PrepareCapturedPhotoInput {
  file: File;
  type: AssessmentPhotoType;
  ticketId: string;
  requireGps?: boolean;
  existingPhotos?: Array<Pick<CapturedAssessmentPhoto, 'id' | 'checksumSha256'>>;
}

export function countPhotosByType(
  photos: Array<Pick<CapturedAssessmentPhoto, 'type'>>,
): Record<AssessmentPhotoType, number> {
  return photos.reduce<Record<AssessmentPhotoType, number>>(
    (accumulator, photo) => {
      accumulator[photo.type] += 1;
      return accumulator;
    },
    {
      OVERVIEW: 0,
      EQUIPMENT: 0,
      DAMAGE: 0,
      SAFETY: 0,
      CONTEXT: 0,
    },
  );
}

export function getMissingRequiredPhotoTypes(
  photos: Array<Pick<CapturedAssessmentPhoto, 'type'>>,
  requiredTypes: AssessmentPhotoType[] = DEFAULT_REQUIRED_PHOTO_TYPES,
): AssessmentPhotoType[] {
  const counts = countPhotosByType(photos);
  return requiredTypes.filter((requiredType) => counts[requiredType] === 0);
}

function buildPhotoPreviewUrl(file: File): string {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return '';
  }

  return URL.createObjectURL(file);
}

function revokePhotoPreviewUrl(previewUrl: string): void {
  if (!previewUrl || typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') {
    return;
  }

  URL.revokeObjectURL(previewUrl);
}

function assertPhotoMimeTypeAllowed(file: File): void {
  if (!PHOTO_MIME_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: ${PHOTO_MIME_TYPES.join(', ')}`);
  }
}

export async function prepareCapturedPhoto({
  file,
  type,
  ticketId,
  requireGps = APP_CONFIG.REQUIRE_PHOTO_GPS,
  existingPhotos = [],
}: PrepareCapturedPhotoInput): Promise<CapturedAssessmentPhoto> {
  assertPhotoMimeTypeAllowed(file);

  const exifMetadata = await extractExifMetadataFromFile(file);
  const compressionResult = await compressImageFile(file);
  const validationResult = await validateAssessmentPhoto(
    compressionResult.file,
    exifMetadata,
    {
      requireGps,
      maxSizeMB: APP_CONFIG.MAX_PHOTO_SIZE_MB,
      existingPhotoChecksums: existingPhotos.map((photo) => ({
        photoId: photo.id,
        checksumSha256: photo.checksumSha256,
      })),
    },
  );

  if (!validationResult.isValid) {
    throw new Error(validationResult.errors[0] ?? 'Photo validation failed.');
  }

  const previewUrl = buildPhotoPreviewUrl(compressionResult.file);

  return {
    id: crypto.randomUUID(),
    ticketId,
    type,
    file: compressionResult.file,
    previewUrl,
    capturedAt: new Date().toISOString(),
    metadata: exifMetadata,
    originalSizeBytes: compressionResult.originalSizeBytes,
    sizeBytes: compressionResult.compressedSizeBytes,
    compressed: compressionResult.compressed,
    checksumSha256: validationResult.checksumSha256,
    isDuplicate: Boolean(validationResult.duplicateOfPhotoId),
    duplicateOfPhotoId: validationResult.duplicateOfPhotoId ?? undefined,
    validationWarnings: validationResult.warnings,
  };
}

export function revokeCapturedPhotoPreview(photo: Pick<CapturedAssessmentPhoto, 'previewUrl'>): void {
  revokePhotoPreviewUrl(photo.previewUrl);
}
