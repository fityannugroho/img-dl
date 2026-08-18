import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TEST_TMP_DIR } from './helpers/paths.js';

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

// execa@10.0.1 requires Node >= 22 (uses TEXT_ENCODINGS.union built-in).
// Dynamic import avoids a top-level crash on older Node versions.
const nodeVersion = Number.parseInt(process.versions.node.split('.')[0], 10);

describe.skipIf(nodeVersion < 22)('cli binary (built)', () => {
  let execa: typeof import('execa').execa;

  beforeAll(async () => {
    ({ execa } = await import('execa'));
    await fs.promises.mkdir(TEST_TMP_DIR, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(TEST_TMP_DIR, { recursive: true, force: true });
  });

  it('prints help and exits 0 on --help', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      ['dist/cli.js', '--help'],
      { cwd: PROJECT_ROOT },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain('USAGE');
  }, 30_000);

  it('exits non-zero when a download fails', async () => {
    const { exitCode } = await execa(
      'node',
      [
        'dist/cli.js',
        'http://127.0.0.1:1/image.jpg',
        '--silent',
        '--timeout=1000',
      ],
      { cwd: PROJECT_ROOT, reject: false },
    );
    expect(exitCode).toBe(1);
  }, 30_000);
});
