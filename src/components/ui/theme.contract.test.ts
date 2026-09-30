import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// Vitest runs from the project root, so resolve the stylesheet from there.
const globalsCss = readFileSync(
  resolve(process.cwd(), 'src/app/globals.css'),
  'utf8'
);

describe('design system tokens', () => {
  it('defines the full elevation scale', () => {
    for (const token of [
      '--shadow-elevation-xs',
      '--shadow-elevation-sm',
      '--shadow-elevation-md',
      '--shadow-elevation-lg',
      '--shadow-elevation-xl',
      '--shadow-brand',
      '--shadow-brand-lg',
      '--shadow-inset-top',
    ]) {
      expect(globalsCss).toContain(token);
    }
  });

  it('defines the motion and easing tokens', () => {
    for (const token of [
      '--motion-duration-instant',
      '--motion-ease-emphasized',
      '--motion-ease-spring',
    ]) {
      expect(globalsCss).toContain(token);
    }
  });

  it('defines the surface, border, and accent tokens', () => {
    for (const token of [
      '--surface-raised',
      '--surface-sunken',
      '--border-strong',
      '--accent-hairline',
      '--accent-ring',
      '--focus-ring-width',
      '--focus-ring-offset',
    ]) {
      expect(globalsCss).toContain(token);
    }
  });

  it('exposes elevation, easing, and animation through the theme namespace', () => {
    for (const token of [
      '--ease-standard',
      '--ease-emphasized',
      '--ease-spring',
      '--animate-lift-in',
      '--animate-shimmer',
      '--animate-accent-pulse',
    ]) {
      expect(globalsCss).toContain(token);
    }

    expect(globalsCss).toMatch(/--shadow-elevation-lg:\s*var\(--shadow-elevation-lg\)/);
    expect(globalsCss).toMatch(/--color-surface-sunken:\s*var\(--surface-sunken\)/);
  });

  it('defines the reusable interaction classes', () => {
    for (const className of [
      '.interactive-lift',
      '.interactive-press',
      '.focus-ring',
      '.sheen-brand',
      '.surface-raised',
      '.surface-sunken',
      '.stagger-children',
      '.skeleton-shimmer',
      '.separator-fade',
    ]) {
      expect(globalsCss).toContain(className);
    }
  });

  it('defines the new keyframes', () => {
    for (const frame of ['@keyframes lift-in', '@keyframes shimmer', '@keyframes accent-pulse']) {
      expect(globalsCss).toContain(frame);
    }
  });
});

describe('brand color immutability', () => {
  it('keeps every Grid Electric brand hex unchanged', () => {
    for (const token of [
      '--grid-blue: #2ea3f2',
      '--grid-blue-dark: #1a8fd9',
      '--grid-blue-light: #5cb8f5',
      '--grid-navy: #002168',
      '--grid-navy-dark: #001545',
      '--grid-navy-light: #003399',
      '--grid-storm-50: #f3f8ff',
      '--grid-storm-100: #dcecff',
      '--grid-storm-200: #b7d7ff',
      '--grid-lightning: #ffc038',
      '--grid-lightning-soft: #ffd877',
      '--grid-success: #00d084',
      '--grid-warning: #fcb900',
      '--grid-danger: #cf2e2e',
      '--grid-info: #0693e3',
    ]) {
      expect(globalsCss).toContain(token);
    }
  });
});

describe('storm theme regression guard', () => {
  it('keeps the storm utility classes and their aliases', () => {
    for (const className of [
      '.storm-card',
      '.storm-surface',
      '.storm-metric-card',
      '.storm-contrast-button',
      '.storm-contrast-field',
      '.storm-mini-stat',
      '.assessment-command-card',
      '.shadow-card',
      '.shadow-card-hover',
    ]) {
      expect(globalsCss).toContain(className);
    }
  });

  it('sources storm shadows from tokens instead of literals', () => {
    for (const token of [
      '--shadow-storm-surface',
      '--shadow-storm-card',
      '--shadow-storm-metric',
      '--shadow-storm-field',
    ]) {
      expect(globalsCss).toContain(token);
    }

    expect(globalsCss).toContain('box-shadow: var(--shadow-storm-card)');
    expect(globalsCss).toContain('box-shadow: var(--shadow-storm-surface)');
  });

  it('keeps the legacy animation aliases and reduced-motion support', () => {
    expect(globalsCss).toContain('@keyframes fadeIn');
    expect(globalsCss).toContain('@keyframes slideIn');
    expect(globalsCss).toContain('.animate-fade-in');
    expect(globalsCss).toContain('.animate-slide-in');
    expect(globalsCss).toContain('.animate-pulse-ring');
    expect(globalsCss).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
