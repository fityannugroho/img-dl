import fs from 'node:fs';
import { describe, expect, test, vi } from 'vitest';
import { DEFAULT_EXTENSION, DEFAULT_NAME } from '~/constanta.js';
import imgdl from '~/index.js';

describe('`imgdl()`', () => {
  test('single', async () => {
    const url = 'https://picsum.photos/200/300.webp';
    const expectedFilePath = `${process.cwd()}/300.webp`;

    expect((await imgdl(url)).path).toEqual(expectedFilePath);
    expect(fs.existsSync(expectedFilePath)).toBe(true); // Ensure the image is actually exists

    // Cleanup
    fs.unlinkSync(expectedFilePath);
  });

  describe('multiple', () => {
    const testUrls = [
      'https://picsum.photos/200/300.webp',
      'https://picsum.photos/200/300',
    ];
    const expectedNames = ['300.webp', `${DEFAULT_NAME}.${DEFAULT_EXTENSION}`];

    test('only array of `url`s', async () => {
      const expectedFilePaths = expectedNames.map(
        (n) => `${process.cwd()}/${n}`,
      );
      const images = await imgdl(testUrls);

      expect(images.map((img) => img.path).sort()).toEqual(
        expectedFilePaths.sort(),
      );
      expectedFilePaths.forEach((filepath) => {
        expect(fs.existsSync(filepath)).toBe(true); // Ensure the image is actually exists
        fs.unlinkSync(filepath); // Cleanup
      });
    });

    test('with `directory` argument', async () => {
      const directory = 'test/tmp';
      const expectedFilePaths = expectedNames.map(
        (n) => `${process.cwd()}/${directory}/${n}`,
      );
      const images = await imgdl(testUrls, { directory });

      expect(images.map((img) => img.path).sort()).toEqual(
        expectedFilePaths.sort(),
      );
      expectedFilePaths.forEach((filepath) => {
        expect(fs.existsSync(filepath)).toBe(true); // Ensure the image is actually exists
        fs.unlinkSync(filepath); // Cleanup
      });
    });

    test('with `name` argument', async () => {
      const expectedFilePaths = [
        'asset.webp',
        `asset.${DEFAULT_EXTENSION}`,
      ].map((n) => `${process.cwd()}/${n}`);
      const images = await imgdl(testUrls, { name: 'asset' });

      expect(images.map((img) => img.path).sort()).toEqual(
        expectedFilePaths.sort(),
      );
      expectedFilePaths.forEach((filepath) => {
        expect(fs.existsSync(filepath)).toBe(true); // Ensure the image is actually exists
        fs.unlinkSync(filepath); // Cleanup
      });
    });

    test('with `onSuccess` argument', async () => {
      const expectedFilePaths = expectedNames.map(
        (n) => `${process.cwd()}/${n}`,
      );
      let downloadCount = 0;
      const onSuccess = vi.fn().mockImplementation(() => {
        downloadCount += 1;
      });
      const images = await imgdl(testUrls, { onSuccess });

      expect(images.map((img) => img.path).sort()).toEqual(
        expectedFilePaths.sort(),
      );
      expect(onSuccess).toHaveBeenCalledTimes(2);
      expect(downloadCount).toEqual(2);

      expectedFilePaths.forEach((filepath) => {
        expect(fs.existsSync(filepath)).toBe(true); // Ensure the image is actually exists
        fs.unlinkSync(filepath); // Cleanup
      });
    });

    test('with `onError` argument', async () => {
      let errorCount = 0;
      const onError = vi.fn().mockImplementation(() => {
        errorCount += 1;
      });
      const images = await imgdl(['invalid-url1', 'invalid-url2'], { onError });

      expect(onError).toHaveBeenCalledTimes(2);
      expect(errorCount).toEqual(2);
      expect(images).toEqual([]);
    });
  });
});
