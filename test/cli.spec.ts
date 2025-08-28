import fs from 'node:fs/promises';
import path from 'node:path';
import { $ } from 'execa';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import ArgumentError from '~/errors/ArgumentError.js';
import { generateDownloadUrls } from '~/utils.js';
import { TEST_TMP_DIR, UNCREATABLE_DIR } from './helpers/paths.js';

describe('generateDownloadUrls', () => {
  it('return the same URLs if increment flag is not set', () => {
    const urls = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ];
    const flags = {};

    expect(generateDownloadUrls(urls, flags)).toEqual(urls);
  });

  it('throw error if multiple URLs are provided', () => {
    const urls = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ];
    const flags = { increment: true };

    expect(() => generateDownloadUrls(urls, flags)).toThrow(ArgumentError);
  });

  it('throw error if URL does not contain {i} placeholder', () => {
    const urls = ['https://example.com/image.jpg'];
    const flags = { increment: true };

    expect(() => generateDownloadUrls(urls, flags)).toThrow(ArgumentError);
  });

  it('throw error if start is less than 0', () => {
    const urls = ['https://example.com/image{i}.jpg'];
    const flags = { increment: true, start: -1 };

    expect(() => generateDownloadUrls(urls, flags)).toThrow(ArgumentError);
  });

  it('throw error if start is greater than end', () => {
    const urls = ['https://example.com/image{i}.jpg'];
    const flags = { increment: true, start: 5, end: 3 };

    expect(() => generateDownloadUrls(urls, flags)).toThrow(ArgumentError);
  });

  it('returns a list of generated URLs', () => {
    const urls = ['https://example.com/image{i}.jpg'];
    const flags = { increment: true, start: 1, end: 3 };

    expect(generateDownloadUrls(urls, flags)).toEqual([
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg',
    ]);
  });
});

describe('cli', async () => {
  /**
   * The build folder for the test
   */
  const dist = 'test/dist';
  /**
   * A valid URL for testing non-network CLI behavior.
   */
  const testUrl = 'https://example.com/image.jpg';

  beforeAll(async () => {
    // Build CLI from repo root
    await $`tsup src/cli.ts --format esm -d ${dist} --clean`;
    // Ensure CLI temp cwd exists
    await fs.mkdir(path.resolve(TEST_TMP_DIR, 'cli'), { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(dist, { recursive: true });
  });

  it('should show the version', async () => {
    const { exitCode, stdout } = await $`node ${dist}/cli.js --version`;
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should show the version with short flag', async () => {
    const { exitCode, stdout } = await $`node ${dist}/cli.js -v`;
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should show the help message if no arguments are provided', async () => {
    const { exitCode, stdout } = await $`node ${dist}/cli.js`;
    expect(exitCode).toBe(0);
    expect(stdout).contains('USAGE').contains('PARAMETERS').contains('OPTIONS');
  });

  // Run CLI in its own tmp directory to avoid cross-test interference
  const $$ = $({ cwd: path.resolve(TEST_TMP_DIR, 'cli') });

  it('should throw an error if the directory cannot be created', async () => {
    const { stderr } = await $$`node ${path.resolve(
      dist,
      'cli.js',
    )} ${testUrl} --dir=${UNCREATABLE_DIR}`;
    expect(stderr).contain('DirectoryError');
  });

  it('should throw an error if some arguments is invalid', async () => {
    const { stderr } =
      await $$`node ${path.resolve(dist, 'cli.js')} ${testUrl} --name=invalid/name`;

    expect(stderr).contain('ArgumentError');
  });

  // Networked download tests moved to e2e.test.ts

  it.each([
    'not-url',
    'some/path',
    'example.com/image.jpg',
    'ftp://example.com',
    'ws://example.com',
  ])('should throw an error if URL is invalid: `%s`', async (url) => {
    const { stderr } = await $`node ${dist}/cli.js ${url}`;
    expect(stderr).contain('ArgumentError');
  });

  it.each([
    '',
    'InvalidHeader NoColonValue',
    'Empty-Value-Header:',
    'Empty-Value-Header: ',
    ': value',
  ])(
    'should throw an error if the header is not valid: `%s`',
    async (header) => {
      const { stderr } = await $`node ${dist}/cli.js ${testUrl} -H ${header}`;
      expect(stderr).contain('ArgumentError');
    },
  );

  describe('Increment mode', () => {
    const testUrl = 'https://example.com/image-{i}.webp';

    it('should throw an error if URL more than 1', async () => {
      const { stderr } =
        await $$`node ${path.resolve(dist, 'cli.js')} ${testUrl} ${testUrl} --increment --end=10`;
      expect(stderr).contain('ArgumentError');
    });

    it('should throw an error if the start index is greater than the end index', async () => {
      const { stderr } =
        await $$`node ${path.resolve(dist, 'cli.js')} ${testUrl} --increment --start=2 --end=1`;
      expect(stderr).contain('ArgumentError');
    });

    it('should throw an error if the URL does not contain the index placeholder', async () => {
      const { stderr } =
        await $$`node ${path.resolve(dist, 'cli.js')} https://example.com/200/300 --increment --end=10`;
      expect(stderr).contain('ArgumentError');
    });
  });
});
