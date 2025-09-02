import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultExclude, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: './',
    alias: {
      '~': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src'),
    },
    setupFiles: ['test/setup.ts'],
    coverage: {
      provider: 'v8',
      exclude: [...defaultExclude, 'src/cli.ts', 'coverage', 'test'],
    },
    fileParallelism: false,
  },
});
