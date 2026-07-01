import { describe, expect, it } from 'vitest';
import { calculateSHA256Hash } from './hash';

describe('calculateSHA256Hash', () => {
  it('returns deterministic hash for identical content', async () => {
    const fileA = new File(['same-content'], 'a.txt', { type: 'text/plain' });
    const fileB = new File(['same-content'], 'b.txt', { type: 'text/plain' });

    const hashA = await calculateSHA256Hash(fileA);
    const hashB = await calculateSHA256Hash(fileB);

    expect(hashA).toBe(hashB);
    expect(hashA).toHaveLength(64);
  });

  it('returns different hashes for different content', async () => {
    const hashA = await calculateSHA256Hash(new File(['one'], 'one.txt', { type: 'text/plain' }));
    const hashB = await calculateSHA256Hash(new File(['two'], 'two.txt', { type: 'text/plain' }));

    expect(hashA).not.toBe(hashB);
  });
});
