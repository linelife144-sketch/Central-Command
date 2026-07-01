import { APP_CONFIG } from '../config/appConfig';
import type { PhotoExifMetadata } from '../utils/exif';
import { calculateSHA256Hash } from '../utils/hash';
import { validatePhotoFile } from '../utils/validators';

const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface ExistingPhotoChecksum {
  photoId: string;
  checksumSha256: string;
}

export interface PhotoValidationOptions {
  requireGps?: boolean;
  maxSizeMB?: number;
  existingPhotoChecksums?: ExistingPhotoChecksum[];
}

export interface PhotoValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  checksumSha256: string;
  duplicateOfPhotoId: string | null;
  gpsPresent: boolean;
}

function hasGps(metadata: PhotoExifMetadata): boolean {
  return typeof metadata.gpsLatitude === 'number' && typeof metadata.gpsLongitude === 'number';
}

export async function validateAssessmentPhoto(
  file: File,
  metadata: PhotoExifMetadata,
  {
    requireGps = APP_CONFIG.REQUIRE_PHOTO_GPS,
    maxSizeMB = APP_CONFIG.MAX_PHOTO_SIZE_MB,
    existingPhotoChecksums = [],
  }: PhotoValidationOptions = {},
): Promise<PhotoValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const fileValidation = validatePhotoFile(file, maxSizeMB, PHOTO_MIME_TYPES);
  if (!fileValidation.valid) {
    errors.push(fileValidation.error ?? 'Photo file validation failed.');
  }

  const gpsPresent = hasGps(metadata);
  if (requireGps && !gpsPresent) {
    errors.push('GPS coordinates missing from photo. Ensure location services are enabled.');
  }

  const checksumSha256 = await calculateSHA256Hash(file);
  const duplicateMatch = existingPhotoChecksums.find((entry) => entry.checksumSha256 === checksumSha256);
  if (duplicateMatch) {
    warnings.push('Duplicate photo detected. Flagged for review.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    checksumSha256,
    duplicateOfPhotoId: duplicateMatch?.photoId ?? null,
    gpsPresent,
  };
}
