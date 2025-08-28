import fs from 'node:fs/promises';
import { afterAll, beforeAll } from 'vitest';
import { TEST_TMP_DIR } from './helpers/paths.js';

// Ensure a clean, shared tmp directory for all tests
beforeAll(async () => {
  await fs.rm(TEST_TMP_DIR, { recursive: true, force: true });
  await fs.mkdir(TEST_TMP_DIR, { recursive: true });
});

// Cleanup once at the very end
afterAll(async () => {
  await fs.rm(TEST_TMP_DIR, { recursive: true, force: true });
});
