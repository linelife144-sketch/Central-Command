import { describe, expect, it } from 'vitest';
import { extractExifMetadataFromTags, parseExifTimestamp } from './exif';

describe('parseExifTimestamp', () => {
  it('parses EXIF datetime format into ISO', () => {
    const value = parseExifTimestamp('2026:02:12 10:15:45');
    expect(value).not.toBeNull();
    expect(value?.startsWith('2026-02-12T')).toBe(true);
  });

  it('returns null for invalid values', () => {
    expect(parseExifTimestamp('not-a-date')).toBeNull();
    expect(parseExifTimestamp(undefined)).toBeNull();
  });
});

describe('extractExifMetadataFromTags', () => {
  it('extracts GPS, timestamp, and device metadata', () => {
    const metadata = extractExifMetadataFromTags({
      GPSLatitude: { value: [27, 57, 2.16] },
      GPSLatitudeRef: { value: ['N'] },
      GPSLongitude: { value: [82, 27, 25.92] },
      GPSLongitudeRef: { value: ['W'] },
      DateTimeOriginal: { description: '2026:02:12 08:30:00' },
      Make: { description: 'Google' },
      Model: { description: 'Pixel 9' },
    });

    expect(metadata.gpsLatitude).toBeCloseTo(27.9506, 4);
    expect(metadata.gpsLongitude).toBeCloseTo(-82.4572, 4);
    expect(metadata.capturedAt).not.toBeNull();
    expect(metadata.deviceMake).toBe('Google');
    expect(metadata.deviceModel).toBe('Pixel 9');
  });

  it('returns null GPS when coordinates are missing', () => {
    const metadata = extractExifMetadataFromTags({
      DateTimeOriginal: { description: '2026:02:12 08:30:00' },
    });

    expect(metadata.gpsLatitude).toBeNull();
    expect(metadata.gpsLongitude).toBeNull();
    expect(metadata.capturedAt).not.toBeNull();
  });
});
