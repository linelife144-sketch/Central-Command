import { describe, expect, it, vi } from 'vitest';

import { createReceiptOcrService } from './receiptOcrService';

describe('createReceiptOcrService', () => {
  it('returns trimmed OCR text', async () => {
    const service = createReceiptOcrService({
      recognize: vi.fn().mockResolvedValue('  Receipt total: 24.25  '),
    });

    const result = await service.extractText(new Blob(['sample']));
    expect(result).toBe('Receipt total: 24.25');
  });

  it('returns undefined when OCR does not produce text', async () => {
    const service = createReceiptOcrService({
      recognize: vi.fn().mockResolvedValue('   '),
    });

    const result = await service.extractText(new Blob(['sample']));
    expect(result).toBeUndefined();
  });
});
