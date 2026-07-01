import { describe, expect, it } from 'vitest';
import { calculateThumbnailDimensions } from './thumbnail';

describe('calculateThumbnailDimensions', () => {
  it('keeps dimensions when already below max', () => {
    const dimensions = calculateThumbnailDimensions(320, 200, 360);
    expect(dimensions).toEqual({ width: 320, height: 200 });
  });

  it('scales landscape images to max width', () => {
    const dimensions = calculateThumbnailDimensions(1600, 900, 360);
    expect(dimensions.width).toBe(360);
    expect(dimensions.height).toBe(203);
  });

  it('scales portrait images to max height', () => {
    const dimensions = calculateThumbnailDimensions(900, 1600, 360);
    expect(dimensions.height).toBe(360);
    expect(dimensions.width).toBe(203);
  });
});
