import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    root: './',
    alias: {
      '~': path.resolve(import.meta.dirname, './src'),
    },
    coverage: {
      provider: 'v8',
    },
  },
});
