import ExifReader from 'exifreader';

export interface PhotoExifMetadata {
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  capturedAt: string | null;
  deviceMake: string | null;
  deviceModel: string | null;
}

interface ExifTagLike {
  value?: unknown;
  description?: string;
}

type ExifTagMap = Record<string, ExifTagLike | undefined>;

interface RationalValue {
  numerator?: number;
  denominator?: number;
}

function normalizeRational(value: RationalValue): number | null {
  if (typeof value.numerator !== 'number' || typeof value.denominator !== 'number' || value.denominator === 0) {
    return null;
  }

  return value.numerator / value.denominator;
}

function normalizeNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (value && typeof value === 'object') {
    return normalizeRational(value as RationalValue);
  }

  return null;
}

function parseCoordinateDescription(description?: string): number[] | null {
  if (!description) {
    return null;
  }

  const matches = description.match(/-?\d+(\.\d+)?/g);
  if (!matches || matches.length === 0) {
    return null;
  }

  const numericParts = matches
    .slice(0, 3)
    .map((part) => Number.parseFloat(part))
    .filter((part) => Number.isFinite(part));

  return numericParts.length > 0 ? numericParts : null;
}

function parseCoordinateValue(tag?: ExifTagLike): number[] | null {
  if (!tag) {
    return null;
  }

  if (Array.isArray(tag.value)) {
    const parts = tag.value
      .map((entry) => normalizeNumericValue(entry))
      .filter((entry): entry is number => entry !== null);

    if (parts.length > 0) {
      return parts.slice(0, 3);
    }
  }

  return parseCoordinateDescription(tag.description);
}

function parseReferenceTag(referenceTag?: ExifTagLike): string | null {
  if (!referenceTag) {
    return null;
  }

  if (Array.isArray(referenceTag.value) && typeof referenceTag.value[0] === 'string') {
    return referenceTag.value[0].toUpperCase();
  }

  if (typeof referenceTag.description === 'string' && referenceTag.description.length > 0) {
    return referenceTag.description[0].toUpperCase();
  }

  return null;
}

function dmsToDecimal(parts: number[], reference: string | null): number | null {
  if (parts.length === 0 || !Number.isFinite(parts[0])) {
    return null;
  }

  const degrees = Math.abs(parts[0]);
  const minutes = parts.length > 1 ? Math.abs(parts[1]) : 0;
  const seconds = parts.length > 2 ? Math.abs(parts[2]) : 0;
  let decimal = degrees + (minutes / 60) + (seconds / 3600);

  if (reference === 'S' || reference === 'W') {
    decimal *= -1;
  } else if (parts[0] < 0) {
    decimal *= -1;
  }

  return Number.isFinite(decimal) ? decimal : null;
}

export function parseExifTimestamp(value?: string): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export function extractExifMetadataFromTags(tags: ExifTagMap): PhotoExifMetadata {
  const latitudeParts = parseCoordinateValue(tags.GPSLatitude);
  const longitudeParts = parseCoordinateValue(tags.GPSLongitude);
  const latitudeRef = parseReferenceTag(tags.GPSLatitudeRef);
  const longitudeRef = parseReferenceTag(tags.GPSLongitudeRef);
  const capturedAt = parseExifTimestamp(
    tags.DateTimeOriginal?.description
    ?? tags.DateTimeDigitized?.description
    ?? tags.DateTime?.description,
  );

  return {
    gpsLatitude: latitudeParts ? dmsToDecimal(latitudeParts, latitudeRef) : null,
    gpsLongitude: longitudeParts ? dmsToDecimal(longitudeParts, longitudeRef) : null,
    capturedAt,
    deviceMake: tags.Make?.description ?? null,
    deviceModel: tags.Model?.description ?? null,
  };
}

export async function extractExifMetadataFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<PhotoExifMetadata> {
  try {
    const tags = await ExifReader.load(arrayBuffer);
    return extractExifMetadataFromTags(tags as ExifTagMap);
  } catch {
    return {
      gpsLatitude: null,
      gpsLongitude: null,
      capturedAt: null,
      deviceMake: null,
      deviceModel: null,
    };
  }
}

export async function extractExifMetadataFromFile(file: Pick<File, 'arrayBuffer'>): Promise<PhotoExifMetadata> {
  const arrayBuffer = await file.arrayBuffer();
  return extractExifMetadataFromArrayBuffer(arrayBuffer);
}
