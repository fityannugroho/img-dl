import fs from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { runner } from '~/cli.js';
import ArgumentError from '~/errors/ArgumentError.js';
import { BASE_URL } from './fixtures/mocks/handlers.js';
import { server } from './fixtures/mocks/node.js';
import { TEST_TMP_DIR } from './helpers/paths.js';

type CliFlags = Parameters<typeof runner>[1];

beforeAll(() => server.listen());

afterEach(() => server.resetHandlers());

afterAll(() => server.close());

/**
 * Helper function to check if error.log exists and has content
 */
async function hasErrorLogContent(): Promise<boolean> {
  try {
    const stats = await fs.promises.stat(path.join(TEST_TMP_DIR, 'error.log'));
    return stats.size > 0;
  } catch {
    return false;
  }
}

describe('cli', () => {
  const testUrl = `${BASE_URL}/image.jpg`;

  it('should download successfully with valid input', async () => {
    const flags: CliFlags = {} as CliFlags;
    const input = [testUrl];

    await expect(runner(input, flags)).resolves.toBeUndefined();

    // Ensure no errors were logged to error.log
    expect(await hasErrorLogContent()).toBe(false);
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
      const flags: CliFlags = { header: [header] } as CliFlags;
      const input = [testUrl];

      await expect(runner(input, flags)).rejects.toThrow(ArgumentError);

      // Ensure no errors were logged to error.log since this should throw immediately
      expect(await hasErrorLogContent()).toBe(false);
    },
  );

  describe('Error handling and logging', () => {
    it('should log errors to error.log when download fails', async () => {
      const flags: CliFlags = {} as CliFlags;
      const input = [`${BASE_URL}/non-existent-image.jpg`]; // This will return 404

      // The runner should not throw an error even when downloads fail
      await expect(runner(input, flags)).resolves.toBeUndefined();

      // But errors should be logged to error.log
      expect(await hasErrorLogContent()).toBe(true);
    });

    it('should handle mixed success and failure scenarios', async () => {
      const flags: CliFlags = {} as CliFlags;
      const input = [
        `${BASE_URL}/image.jpg`, // This should succeed
        `${BASE_URL}/non-existent.jpg`, // This should fail
      ];

      await expect(runner(input, flags)).resolves.toBeUndefined();

      // Should have error.log content due to the failed download
      expect(await hasErrorLogContent()).toBe(true);
    });
  });

  describe('Directory options', () => {
    it('should work with explicit directory option', async () => {
      const customDir = 'custom';
      const customDirPath = path.join(TEST_TMP_DIR, customDir);
      await fs.promises.mkdir(customDir, { recursive: true });

      const flags: CliFlags = { dir: customDir } as CliFlags;
      const input = [testUrl];

      await expect(runner(input, flags)).resolves.toBeUndefined();

      // Check that files were downloaded to the custom directory
      const files = await fs.promises.readdir(customDirPath);
      const jpgFiles = files.filter((f) => f.toLowerCase().endsWith('.jpg'));
      expect(jpgFiles.length).toBe(1);

      // Check that error.log would be in the custom directory (not in TEST_CLI_DIR)
      const customErrorLogExists = await fs.promises
        .access(path.join(customDirPath, 'error.log'))
        .then(() => true)
        .catch(() => false);
      expect(customErrorLogExists).toBe(false); // No errors expected

      // Cleanup custom directory
      await fs.promises.rm(customDirPath, { recursive: true, force: true });
    });
  });

  describe('Increment mode', () => {
    const testUrl = `${BASE_URL}/img-{i}.jpg`;

    it('should work correctly with valid flags', async () => {
      const flags: CliFlags = {
        increment: true,
        start: 1,
        end: 3,
      } as CliFlags;
      const input = [testUrl];

      await expect(runner(input, flags)).resolves.toBeUndefined();

      // Ensure no errors were logged to error.log
      expect(await hasErrorLogContent()).toBe(false);
    });

    it('should throw an error if URL more than 1', async () => {
      const flags: CliFlags = {
        increment: true,
        end: 10,
      } as CliFlags;
      const input = [testUrl, testUrl];

      await expect(runner(input, flags)).rejects.toThrow(ArgumentError);

      // Ensure no errors were logged to error.log since this should throw immediately
      expect(await hasErrorLogContent()).toBe(false);
    });

    it('should throw an error if the start index is greater than the end index', async () => {
      const flags: CliFlags = {
        increment: true,
        start: 2,
        end: 1,
      } as CliFlags;
      const input = [testUrl];

      await expect(runner(input, flags)).rejects.toThrow(ArgumentError);

      // Ensure no errors were logged to error.log since this should throw immediately
      expect(await hasErrorLogContent()).toBe(false);
    });

    it('should throw an error if the URL does not contain the index placeholder', async () => {
      const flags: CliFlags = {
        increment: true,
        end: 10,
      } as CliFlags;
      const input = [`${BASE_URL}/200/300`];

      await expect(runner(input, flags)).rejects.toThrow(ArgumentError);

      // Ensure no errors were logged to error.log since this should throw immediately
      expect(await hasErrorLogContent()).toBe(false);
    });
  });

  describe('Silent mode', () => {
    it('should work with --silent flag', async () => {
      const flags: CliFlags = { silent: true } as CliFlags;
      const input = [testUrl];

      await expect(runner(input, flags)).resolves.toBeUndefined();

      // Ensure no errors were logged to error.log
      expect(await hasErrorLogContent()).toBe(false);
    });

    it('should not show progress bar in silent mode with multiple URLs', async () => {
      const flags: CliFlags = { silent: true } as CliFlags;
      const input = [
        `${BASE_URL}/img-1.jpg`,
        `${BASE_URL}/img-2.jpg`,
        `${BASE_URL}/img-3.jpg`,
      ];

      await expect(runner(input, flags)).resolves.toBeUndefined();

      // Ensure no errors were logged to error.log
      expect(await hasErrorLogContent()).toBe(false);
    });
  });

  describe('Progress bar', () => {
    it('should show progress bar with multiple URLs', async () => {
      const flags: CliFlags = {} as CliFlags;
      const input = [`${BASE_URL}/img-1.jpg`, `${BASE_URL}/img-2.jpg`];

      await expect(runner(input, flags)).resolves.toBeUndefined();

      // Ensure no errors were logged to error.log
      expect(await hasErrorLogContent()).toBe(false);
    });
  });

  describe('File input', () => {
    it('supports JSON array of URLs', async () => {
      const filePath = path.join(TEST_TMP_DIR, 'urls.json');
      const data = [`${BASE_URL}/image.jpg`, `${BASE_URL}/img-1.jpg`];
      await fs.promises.writeFile(filePath, JSON.stringify(data), 'utf8');

      const flags: CliFlags = {} as CliFlags;
      const input = [filePath];

      await expect(runner(input, flags)).resolves.toBeUndefined();

      // Ensure images were downloaded
      const files = await fs.promises.readdir(TEST_TMP_DIR);
      const jpgFiles = files.filter((f) => f.toLowerCase().endsWith('.jpg'));
      expect(jpgFiles.length).toBe(2);
      expect(await hasErrorLogContent()).toBe(false);
    });

    it('supports JSON array of objects with options', async () => {
      const filePath = path.join(TEST_TMP_DIR, 'list.json');
      const customDir = path.join(TEST_TMP_DIR, 'avatars');
      const data = [
        {
          url: `${BASE_URL}/image.jpg`,
          directory: 'avatars',
          name: 'me',
          extension: 'png',
        },
        {
          url: `${BASE_URL}/img-1.jpg`,
          directory: 'avatars',
          name: 'img1',
        },
      ];
      await fs.promises.writeFile(filePath, JSON.stringify(data), 'utf8');

      const flags: CliFlags = {} as CliFlags;
      const input = [filePath];

      await expect(runner(input, flags)).resolves.toBeUndefined();

      const files = await fs.promises.readdir(customDir);
      // One PNG and one JPG
      expect(files.some((f) => f === 'me.png')).toBe(true);
      expect(files.some((f) => f === 'img1.jpg')).toBe(true);
      expect(await hasErrorLogContent()).toBe(false);
    });

    it('supports CSV with header', async () => {
      const filePath = path.join(TEST_TMP_DIR, 'list.csv');
      const customDir = path.join(TEST_TMP_DIR, 'friends');
      const csv = [
        'url,directory,name,extension',
        `"${BASE_URL}/image.jpg","friends","john","png"`,
        `"${BASE_URL}/img-1.jpg","friends","jane",""`,
      ].join('\n');
      await fs.promises.writeFile(filePath, csv, 'utf8');

      const flags: CliFlags = {} as CliFlags;
      const input = [filePath];

      await expect(runner(input, flags)).resolves.toBeUndefined();

      const files = await fs.promises.readdir(customDir);
      expect(files.includes('john.png')).toBe(true);
      expect(files.includes('jane.jpg')).toBe(true);
      expect(await hasErrorLogContent()).toBe(false);
    });

    it('supports TXT with URLs per line', async () => {
      const filePath = path.join(TEST_TMP_DIR, 'urls.txt');
      const txt = [`${BASE_URL}/image.jpg`, `${BASE_URL}/img-1.jpg`].join('\n');
      await fs.promises.writeFile(filePath, txt, 'utf8');

      const flags: CliFlags = {} as CliFlags;
      const input = [filePath];

      await expect(runner(input, flags)).resolves.toBeUndefined();

      const files = await fs.promises.readdir(TEST_TMP_DIR);
      const jpgFiles = files.filter((f) => f.toLowerCase().endsWith('.jpg'));
      expect(jpgFiles.length).toBe(2);
      expect(await hasErrorLogContent()).toBe(false);
    });
  });
});
