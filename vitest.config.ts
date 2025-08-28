import path from 'node:path';
import { defaultExclude, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: './',
    alias: {
      '~': path.resolve(import.meta.dirname, './src'),
    },
    setupFiles: ['test/setup.ts'],
    coverage: {
      provider: 'v8',
      exclude: [...defaultExclude, 'src/cli.ts'],
    },
    fileParallelism: false,
  },
});
