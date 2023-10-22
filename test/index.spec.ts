import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { DEFAULT_NAME } from '~/constanta.js';
import imgdl from '~/index.js';

describe('`imgdl()`', () => {
  test('single', async () => {
    const url = 'https://picsum.photos/200/300.webp';
    const expectedFilePath = `${process.cwd()}/300.webp`;

    expect(await imgdl(url)).toEqual(expectedFilePath);
    expect(fs.existsSync(expectedFilePath)).toBe(true); // Ensure the image is actually exists

    // Cleanup
    fs.unlinkSync(expectedFilePath);
  }, { timeout: 15000 });

  describe('multiple', () => {
    const testUrls = ['https://picsum.photos/200/300.webp', 'https://picsum.photos/200/300'];
    const expectedNames = ['300-1.webp', `${DEFAULT_NAME}-2.jpg`];

    test('only array of `url`s', async () => {
      const expectedFilePaths = expectedNames.map((n) => `${process.cwd()}/${n}`);

      expect(await imgdl(testUrls)).toEqual(expectedFilePaths);
      expectedFilePaths.forEach((filepath) => {
        expect(fs.existsSync(filepath)).toBe(true); // Ensure the image is actually exists
        fs.unlinkSync(filepath); // Cleanup
      });
    }, { timeout: 15000 });

    test('with `directory` argument', async () => {
      const directory = 'test/tmp';
      const expectedFilePaths = expectedNames.map((n) => `${directory}/${n}`);

      expect(await imgdl(testUrls, { directory })).toEqual(expectedFilePaths);
      expectedFilePaths.forEach((filepath) => {
        expect(fs.existsSync(filepath)).toBe(true); // Ensure the image is actually exists
        fs.unlinkSync(filepath); // Cleanup
      });
    }, { timeout: 15000 });

    test('with `name` argument', async () => {
      const expectedFilePaths = ['asset-1.webp', 'asset-2.jpg'].map((n) => `${process.cwd()}/${n}`);

      expect(await imgdl(testUrls, { name: 'asset' })).toEqual(expectedFilePaths);
      expectedFilePaths.forEach((filepath) => {
        expect(fs.existsSync(filepath)).toBe(true); // Ensure the image is actually exists
        fs.unlinkSync(filepath); // Cleanup
      });
    }, { timeout: 15000 });
  });
});
