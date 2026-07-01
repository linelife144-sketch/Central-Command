import { describe, expect, it } from 'vitest';
import { countPhotosByType, getMissingRequiredPhotoTypes } from './assessmentPhotos';
import type { CapturedAssessmentPhoto } from '../../types';

function buildPhoto(type: CapturedAssessmentPhoto['type']): Pick<CapturedAssessmentPhoto, 'type'> {
  return { type };
}

describe('countPhotosByType', () => {
  it('counts photos for each type bucket', () => {
    const counts = countPhotosByType([
      buildPhoto('OVERVIEW'),
      buildPhoto('OVERVIEW'),
      buildPhoto('DAMAGE'),
      buildPhoto('CONTEXT'),
    ]);

    expect(counts.OVERVIEW).toBe(2);
    expect(counts.DAMAGE).toBe(1);
    expect(counts.CONTEXT).toBe(1);
    expect(counts.EQUIPMENT).toBe(0);
    expect(counts.SAFETY).toBe(0);
  });
});

describe('getMissingRequiredPhotoTypes', () => {
  it('returns required types that have no captured photos', () => {
    const missing = getMissingRequiredPhotoTypes(
      [buildPhoto('OVERVIEW'), buildPhoto('DAMAGE')],
      ['OVERVIEW', 'EQUIPMENT', 'DAMAGE', 'SAFETY'],
    );

    expect(missing).toEqual(['EQUIPMENT', 'SAFETY']);
  });

  it('returns empty list when all required types are covered', () => {
    const missing = getMissingRequiredPhotoTypes([
      buildPhoto('OVERVIEW'),
      buildPhoto('EQUIPMENT'),
      buildPhoto('DAMAGE'),
      buildPhoto('SAFETY'),
    ]);

    expect(missing).toEqual([]);
  });
});
