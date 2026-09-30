/**
 * Removes macOS "forked" duplicate files from the Next.js type directories.
 *
 * Finder/iCloud duplication produces siblings like `cache-life.d 2.ts` next to
 * `cache-life.d.ts`. TypeScript then reports duplicate-identifier errors during
 * `next build` (e.g. "Definitions of the following identifiers conflict"),
 * which looks like a source-code problem but is really a stale-artifact one.
 *
 * Scope is deliberately limited to the two directories `tsconfig.json` includes
 * from the build cache (the `.next/types` and `.next/dev/types` globs).
 *
 * A broad scan of all of `.next` is NOT safe: Turbopack itself emits build
 * chunks whose names legitimately contain " 2" (for example
 * `..._edge-wrapper_0sgtmi7 2.js`), and a recursive sweep would delete real
 * output. Only `<name> 2<ext>` entries that sit next to the file they were
 * copied from are removed, and only inside those two directories.
 *
 * Usage: node --experimental-strip-types scripts/clean-next-duplicates.ts
 */

import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const DUPLICATE_PATTERN = /^(.+) 2(\.[^/\\]+)$/;

/** Only these directories are in `tsconfig.json`'s build-cache include globs. */
const TARGET_DIRECTORIES = ['.next/types', '.next/dev/types'];

export interface CleanResult {
  scannedDirectories: string[];
  removed: string[];
}

export function cleanNextDuplicates(
  targetDirectories: string[] = TARGET_DIRECTORIES
): CleanResult {
  const result: CleanResult = { scannedDirectories: [], removed: [] };

  for (const directory of targetDirectories) {
    if (!existsSync(directory)) {
      continue;
    }

    result.scannedDirectories.push(directory);

    let entries: string[];
    try {
      entries = readdirSync(directory);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const match = DUPLICATE_PATTERN.exec(entry);
      if (!match) {
        continue;
      }

      const [, name, ext] = match;
      // Only remove the fork when the file it was copied from still exists.
      if (!existsSync(join(directory, `${name}${ext}`))) {
        continue;
      }

      try {
        rmSync(join(directory, entry), { force: true });
        result.removed.push(join(directory, entry));
      } catch {
        // Locked file: leave it for a full `npm run clean:next` to handle.
      }
    }
  }

  return result;
}

// Only run when invoked directly, not when imported by tests.
if (process.argv[1] && process.argv[1].endsWith('clean-next-duplicates.ts')) {
  const { removed, scannedDirectories } = cleanNextDuplicates();

  if (removed.length > 0) {
    console.log(`Removed ${removed.length} duplicate type artifact(s):`);
    for (const file of removed) {
      console.log(`  - ${file}`);
    }
  } else if (scannedDirectories.length > 0) {
    console.log(
      `No duplicate type artifacts found (scanned ${scannedDirectories.join(', ')}).`
    );
  } else {
    console.log('No Next.js type directories present yet; nothing to do.');
  }
}
