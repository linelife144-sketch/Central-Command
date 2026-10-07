import { configDefaults, defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: [
      ...configDefaults.exclude,
      // A nested checkout has its own dependencies and tests; run them from that checkout.
      '**/.worktrees/**',
      '**/.node_modules-icloud-backup-*/**',
      '**/.next-icloud-backup-*/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './node_modules/next/dist/compiled/server-only/empty.js'),
    },
  },
});
