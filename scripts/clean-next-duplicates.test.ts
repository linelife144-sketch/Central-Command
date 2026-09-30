import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { cleanNextDuplicates } from './clean-next-duplicates';

describe('cleanNextDuplicates', () => {
  let root: string;
  let typesDir: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'cc-next-types-'));
    typesDir = join(root, 'types');
    mkdirSync(typesDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('removes macOS-forked duplicates that sit next to their original', () => {
    writeFileSync(join(typesDir, 'cache-life.d.ts'), 'export {};');
    writeFileSync(join(typesDir, 'cache-life.d 2.ts'), 'export {};');
    writeFileSync(join(typesDir, 'package.json'), '{}');
    writeFileSync(join(typesDir, 'package 2.json'), '{}');

    const result = cleanNextDuplicates([typesDir]);

    expect(result.removed).toHaveLength(2);
    expect(existsSync(join(typesDir, 'cache-life.d 2.ts'))).toBe(false);
    expect(existsSync(join(typesDir, 'package 2.json'))).toBe(false);
    expect(existsSync(join(typesDir, 'cache-life.d.ts'))).toBe(true);
    expect(existsSync(join(typesDir, 'package.json'))).toBe(true);
  });

  it('keeps a " 2" file that has no original sibling', () => {
    // Turbopack emits chunk names that legitimately contain " 2".
    const chunk = 'turbopack-node_modules_next_dist_edge-wrapper_0sgtmi7 2.js';
    writeFileSync(join(typesDir, chunk), 'console.log(1);');

    const result = cleanNextDuplicates([typesDir]);

    expect(result.removed).toHaveLength(0);
    expect(existsSync(join(typesDir, chunk))).toBe(true);
  });

  it('leaves normal filenames untouched', () => {
    for (const name of ['routes.d.ts', 'validator.ts', 'root-params.d.ts', 'app']) {
      writeFileSync(join(typesDir, name), 'export {};');
    }

    const result = cleanNextDuplicates([typesDir]);

    expect(result.removed).toHaveLength(0);
    for (const name of ['routes.d.ts', 'validator.ts', 'root-params.d.ts', 'app']) {
      expect(existsSync(join(typesDir, name))).toBe(true);
    }
  });

  it('is idempotent', () => {
    writeFileSync(join(typesDir, 'routes.d.ts'), 'export {};');
    writeFileSync(join(typesDir, 'routes.d 2.ts'), 'export {};');

    const first = cleanNextDuplicates([typesDir]);
    const second = cleanNextDuplicates([typesDir]);

    expect(first.removed).toHaveLength(1);
    expect(second.removed).toHaveLength(0);
  });

  it('no-ops when the target directory does not exist', () => {
    const result = cleanNextDuplicates([join(root, 'does-not-exist')]);

    expect(result.removed).toHaveLength(0);
    expect(result.scannedDirectories).toHaveLength(0);
  });

  it('only scans the Next.js type directories by default', () => {
    // Guards against regressing back to a broad recursive sweep of all of .next,
    // which would delete legitimate Turbopack chunks containing " 2" in their name.
    writeFileSync(join(root, 'chunks.js'), '');
    writeFileSync(join(root, 'chunks 2.js'), '');

    const result = cleanNextDuplicates();

    expect(existsSync(join(root, 'chunks 2.js'))).toBe(true);
    expect(result.removed).toHaveLength(0);
  });
});
