import fs from 'node:fs/promises';
import { afterEach, beforeEach, vi } from 'vitest';
import { TEST_TMP_DIR } from './helpers/paths.js';

let rootCwd: string;

beforeEach(async () => {
  rootCwd = process.cwd();
  await fs.mkdir(TEST_TMP_DIR, { recursive: true });
  process.chdir(TEST_TMP_DIR);
});

afterEach(async () => {
  vi.restoreAllMocks();
  process.chdir(rootCwd);
  await fs.rm(TEST_TMP_DIR, { recursive: true, force: true });
});
