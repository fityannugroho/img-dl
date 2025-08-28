import fs from 'node:fs/promises';
import path from 'node:path';
import got from 'got';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import imgdl from '~/index.js';
import { TEST_TMP_DIR } from './helpers/paths.js';

describe('e2e', async () => {
  const testUrl = 'https://picsum.photos/200/300.jpg';
  const ROOT_CWD = process.cwd();

  // Check connectivity to the cloud image server
  let connected = false;
  try {
    const res = await got(testUrl, {
      retry: { limit: 0 },
      timeout: { request: 5000 },
    });
    connected = res.statusCode === 200;
  } catch {
    connected = false;
  }

  beforeAll(async () => {
    // Ensure all outputs go under shared tmp
    process.chdir(TEST_TMP_DIR);
  });

  afterAll(async () => {
    process.chdir(ROOT_CWD);
  });

  it.skipIf(!connected)(
    'downloads a single image with defaults',
    { timeout: 20_000 },
    async ({ onTestFinished }) => {
      const name = 'e2e-photo';
      const expected = path.resolve(`${name}.jpg`);

      onTestFinished(async () => {
        await fs.rm(expected, { force: true });
      });

      await expect(imgdl(testUrl, { name })).resolves.toBeUndefined();
      await expect(fs.access(expected)).resolves.toBeUndefined();
    },
  );
});
