import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const COMMON_DIR = join(process.cwd(), 'src/components/common');

/**
 * Shared layout + data-display components render on every admin and contractor
 * page, so they are the highest-leverage place to keep the app on the Grid
 * Electric token system. These guards fail if a default Tailwind palette class
 * (slate/blue/red/green/...) is reintroduced here, which is what previously made
 * the primitives look unchanged on the admin portal.
 */
const RETOKENED_FILES = [
  'layout/AppShell.tsx',
  'layout/TopBar.tsx',
  'layout/Sidebar.tsx',
  'layout/BottomNav.tsx',
  'layout/PageHeader.tsx',
  'data-display/MetricCard.tsx',
  'data-display/StatusBadge.tsx',
  'data-display/DataTable.tsx',
];

const LEGACY_COLOR_PATTERN =
  /(?:^|[\s'"])(?:dark:)?(?:bg|text|border|ring|divide|from|to|via)-(?:slate|gray|blue|red|green|yellow|amber|emerald|rose|indigo|purple|orange|cyan|teal|fuchsia|lime|sky|violet)(?:-|\/)/;

function sourceOf(relativePath: string): string {
  return readFileSync(join(COMMON_DIR, relativePath), 'utf8');
}

describe('shared components use the Grid Electric token system', () => {
  it.each(RETOKENED_FILES)('%s has no default-Tailwind-palette colors', (file) => {
    const offenders = sourceOf(file)
      .split('\n')
      .filter((line) => LEGACY_COLOR_PATTERN.test(line));

    expect(offenders).toEqual([]);
  });

  it.each(RETOKENED_FILES)('%s still exists and is non-empty', (file) => {
    expect(sourceOf(file).length).toBeGreaterThan(0);
  });
});

describe('the admin shell renders the branded background', () => {
  it('AppShell uses bg-grid-shell rather than a flat neutral fill', () => {
    const source = sourceOf('layout/AppShell.tsx');

    expect(source).toContain('bg-grid-shell');
    expect(source).not.toContain('bg-slate-50');
  });

  it('shell components use the operations console surfaces', () => {
    expect(sourceOf('layout/TopBar.tsx')).toContain('cc-topbar');
    expect(sourceOf('layout/Sidebar.tsx')).toContain('cc-sidebar');
    expect(sourceOf('layout/BottomNav.tsx')).toContain('cc-bottom-nav');
  });
});

describe('StatusBadge keeps its public contract', () => {
  it('still exposes every status variant in the style map', () => {
    const source = sourceOf('data-display/StatusBadge.tsx');
    const variants = [
      'default',
      'success',
      'warning',
      'danger',
      'info',
      'neutral',
      'active',
      'inactive',
      'pending',
      'approved',
      'rejected',
    ];

    for (const variant of variants) {
      expect(source).toContain(`${variant}:`);
    }
  });

  it('maps dot colors through a lookup rather than inline conditionals', () => {
    const source = sourceOf('data-display/StatusBadge.tsx');

    expect(source).toContain('dotStyles');
    expect(source).not.toContain("determinedVariant === 'success' && 'bg-");
  });
});

describe('no legacy colors anywhere in src/components/common', () => {
  it('finds zero files using the default Tailwind color palette', () => {
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith('.tsx') || entry.name.endsWith('.test.tsx')) {
          continue;
        }
        if (LEGACY_COLOR_PATTERN.test(readFileSync(full, 'utf8'))) {
          offenders.push(full.replace(process.cwd(), '.'));
        }
      }
    };

    walk(COMMON_DIR);

    expect(offenders).toEqual([]);
  });
});
