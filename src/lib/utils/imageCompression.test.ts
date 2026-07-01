import { describe, expect, it } from 'vitest';
import { getImageCompressionOptions } from './imageCompression';

describe('getImageCompressionOptions', () => {
  it('returns config defaults when options are omitted', () => {
    const options = getImageCompressionOptions();
    expect(options.maxSizeMB).toBe(10);
    expect(options.maxWidthOrHeight).toBe(1920);
    expect(options.initialQuality).toBe(0.85);
    expect(options.useWebWorker).toBe(true);
    expect(options.fileType).toBe('image/jpeg');
  });

  it('applies provided overrides', () => {
    const options = getImageCompressionOptions({
      maxSizeMB: 3,
      maxWidthOrHeight: 1280,
      initialQuality: 0.7,
      useWebWorker: false,
    });

    expect(options.maxSizeMB).toBe(3);
    expect(options.maxWidthOrHeight).toBe(1280);
    expect(options.initialQuality).toBe(0.7);
    expect(options.useWebWorker).toBe(false);
  });
});
