import { describe, expect, it } from 'vitest';
import { validateAssessmentPhoto } from './photoValidation';

function createPhotoFile(sizeBytes = 1024): File {
  return new File([new Uint8Array(sizeBytes)], 'test.jpg', { type: 'image/jpeg' });
}

describe('validateAssessmentPhoto', () => {
  it('fails when GPS is required and metadata has no coordinates', async () => {
    const result = await validateAssessmentPhoto(
      createPhotoFile(),
      {
        gpsLatitude: null,
        gpsLongitude: null,
        capturedAt: null,
        deviceMake: null,
        deviceModel: null,
      },
      {
        requireGps: true,
      },
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes('GPS coordinates missing'))).toBe(true);
    expect(result.checksumSha256).toHaveLength(64);
  });

  it('flags duplicates when checksum already exists', async () => {
    const file = createPhotoFile();
    const firstPass = await validateAssessmentPhoto(
      file,
      {
        gpsLatitude: 27.95,
        gpsLongitude: -82.45,
        capturedAt: null,
        deviceMake: null,
        deviceModel: null,
      },
      {
        requireGps: true,
      },
    );

    const secondPass = await validateAssessmentPhoto(
      file,
      {
        gpsLatitude: 27.95,
        gpsLongitude: -82.45,
        capturedAt: null,
        deviceMake: null,
        deviceModel: null,
      },
      {
        requireGps: true,
        existingPhotoChecksums: [
          {
            photoId: 'photo-1',
            checksumSha256: firstPass.checksumSha256,
          },
        ],
      },
    );

    expect(secondPass.isValid).toBe(true);
    expect(secondPass.duplicateOfPhotoId).toBe('photo-1');
    expect(secondPass.warnings.some((warning) => warning.includes('Duplicate'))).toBe(true);
  });

  it('fails when file exceeds max size', async () => {
    const oversizedFile = createPhotoFile(2 * 1024 * 1024);
    const result = await validateAssessmentPhoto(
      oversizedFile,
      {
        gpsLatitude: 27.95,
        gpsLongitude: -82.45,
        capturedAt: null,
        deviceMake: null,
        deviceModel: null,
      },
      {
        maxSizeMB: 1,
      },
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes('File too large'))).toBe(true);
  });
});
