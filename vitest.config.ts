import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path from 'node:path';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    root: './',
    alias: {
      '~': path.resolve(dirname, './src'),
    },
    coverage: {
      provider: 'v8',
    },
    testTimeout: 5000,
    setupFiles: ['./vitest.setup.ts'],
  },
});
