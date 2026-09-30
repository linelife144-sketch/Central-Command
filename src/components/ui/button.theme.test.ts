import { describe, expect, it } from 'vitest';

import { buttonVariants } from '@/components/ui/button';
import { badgeVariants } from '@/components/ui/badge';
import { cardVariants } from '@/components/ui/card';

describe('buttonVariants storm theme', () => {
  it('includes the storm contrast utility classes', () => {
    const classes = buttonVariants({ variant: 'storm' });

    expect(classes).toContain('storm-contrast-button');
    expect(classes).toContain('text-[#0a1733]');
    expect(classes).toContain('border-white');
  });
});

describe('buttonVariants interactive variants', () => {
  it('gives the default variant brand elevation and press feedback', () => {
    const classes = buttonVariants({ variant: 'default' });

    expect(classes).toContain('shadow-elevation-xs');
    expect(classes).toContain('hover:shadow-brand');
    expect(classes).toContain('active:scale-[0.98]');
  });

  it('exposes an elevated raised-surface variant', () => {
    const classes = buttonVariants({ variant: 'elevated' });

    expect(classes).toContain('surface-raised');
    expect(classes).toContain('interactive-press');
    expect(classes).toContain('hover:shadow-elevation-md');
  });

  it('exposes an accent gradient variant with a brand glow', () => {
    const classes = buttonVariants({ variant: 'accent' });

    expect(classes).toContain('sheen-brand');
    expect(classes).toContain('shadow-brand');
    expect(classes).toContain('hover:shadow-brand-lg');
  });

  it('exposes a glass variant for layered surfaces', () => {
    const classes = buttonVariants({ variant: 'glass' });

    expect(classes).toContain('backdrop-blur-md');
    expect(classes).toContain('bg-white/10');
  });
});

describe('badgeVariants semantic variants', () => {
  it('supports soft status fills', () => {
    expect(badgeVariants({ variant: 'success' })).toContain('bg-grid-success-soft');
    expect(badgeVariants({ variant: 'warning' })).toContain('bg-grid-warning-soft');
    expect(badgeVariants({ variant: 'danger' })).toContain('bg-grid-danger-soft');
    expect(badgeVariants({ variant: 'info' })).toContain('bg-grid-info-soft');
    expect(badgeVariants({ variant: 'brand' })).toContain('bg-grid-brand-soft');
  });
});

describe('cardVariants', () => {
  it('defaults to the shared elevation scale', () => {
    expect(cardVariants({ variant: 'default' })).toContain('shadow-elevation-sm');
  });

  it('supports an interactive hover-lift card', () => {
    const classes = cardVariants({ variant: 'interactive' });

    expect(classes).toContain('interactive-lift');
    expect(classes).toContain('shadow-elevation-sm');
  });

  it('supports elevated and glass surfaces', () => {
    expect(cardVariants({ variant: 'elevated' })).toContain('shadow-elevation-md');
    expect(cardVariants({ variant: 'glass' })).toContain('backdrop-blur-xl');
  });
});

