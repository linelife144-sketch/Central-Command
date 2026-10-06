import { describe, expect, it } from 'vitest';

import { getErrorLogContext, getErrorMessage } from './errorHandling';

describe('error logging context', () => {
  it('preserves the original message and metadata from non-enumerable Error properties', () => {
    const error = new TypeError('Failed to fetch');
    Object.defineProperties(error, {
      code: { value: 'FETCH_FAILED' },
      details: { value: 'The request was blocked by the browser.' },
      hint: { value: 'Check the browser network panel.' },
    });

    expect(getErrorLogContext(error)).toMatchObject({
      name: 'TypeError',
      message: 'Failed to fetch',
      code: 'FETCH_FAILED',
      details: 'The request was blocked by the browser.',
      hint: 'Check the browser network panel.',
      serialized: expect.stringContaining('Failed to fetch'),
    });
  });

  it('keeps network messages actionable for user-facing error text', () => {
    expect(getErrorMessage(new TypeError('Failed to fetch'))).toBe(
      'Unable to connect to the server. Please check your internet connection and try again.',
    );
  });
});