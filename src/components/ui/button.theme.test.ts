import { describe, expect, it } from 'vitest';

import { buttonVariants } from '@/components/ui/button';

describe('buttonVariants storm theme', () => {
  it('includes the storm contrast utility classes', () => {
    const classes = buttonVariants({ variant: 'storm' });

    expect(classes).toContain('storm-contrast-button');
    expect(classes).toContain('text-[#0a1733]');
    expect(classes).toContain('border-white');
  });
});

