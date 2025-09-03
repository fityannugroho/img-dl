import fs from 'node:fs/promises';
import { afterEach, beforeEach } from 'vitest';
import { TEST_TMP_DIR } from './helpers/paths.js';

beforeEach(async () => {
  await fs.mkdir(TEST_TMP_DIR, { recursive: true });
  process.chdir(TEST_TMP_DIR);
});

afterEach(async () => {
  process.chdir(process.cwd());
  await fs.rm(TEST_TMP_DIR, { recursive: true, force: true });
});
