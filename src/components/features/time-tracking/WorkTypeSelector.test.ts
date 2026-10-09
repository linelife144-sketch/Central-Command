import { describe, expect, it } from 'vitest';

import { WORK_TYPE_OPTIONS } from './workTypeOptions';

describe('WORK_TYPE_OPTIONS', () => {
  it('contains all required work type values', () => {
    const values = WORK_TYPE_OPTIONS.map((option) => option.value);

    expect(values).toEqual([
      'Working',
      'MOB',
      'DE-MOB',
      'Stand-by',
    ]);
  });
});
