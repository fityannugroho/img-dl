import fs from 'node:fs';
import { describe, expect, test, vi } from 'vitest';
import { DEFAULT_EXTENSION, DEFAULT_NAME } from '~/constanta.js';
import imgdl from '~/index.js';

const baseUrl = 'https://picsum.photos';

describe('`imgdl()`', () => {
  test('single image download', async () => {
    const url = `${baseUrl}/200/300.webp`;
    const expectedFilePath = `${process.cwd()}/300.webp`;

    expect((await imgdl(url)).path).toEqual(expectedFilePath);
    expect(() => fs.accessSync(expectedFilePath)).not.toThrow();
  });

  describe('multiple', () => {
    const testUrls = [`${baseUrl}/200/300.webp`, `${baseUrl}/200/300`];
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
        expect(() => fs.accessSync(filepath)).not.toThrow();
      });
    });

    test('duplicate `url`s', async () => {
      const images = await imgdl([`${baseUrl}/200/300`, `${baseUrl}/200/300`]);

      const expectedFilePaths = [
        `${process.cwd()}/${DEFAULT_NAME}.${DEFAULT_EXTENSION}`,
        `${process.cwd()}/${DEFAULT_NAME} (1).${DEFAULT_EXTENSION}`,
      ];

      expect(images.map((img) => img.path).sort()).toEqual(
        expectedFilePaths.sort(),
      );
      expectedFilePaths.forEach((filepath) => {
        expect(() => fs.accessSync(filepath)).not.toThrow();
      });
    });

    test('with `directory` argument', async () => {
      const directory = 'test/tmp';
      const expectedFilePaths = expectedNames.map(
        (n) => `${process.cwd()}/${directory}/${n}`,
      );
      const images = await imgdl(testUrls, { directory });

      try {
        expect(images.map((img) => img.path).sort()).toEqual(
          expectedFilePaths.sort(),
        );
        expectedFilePaths.forEach((filepath) => {
          expect(() => fs.accessSync(filepath)).not.toThrow();
        });
      } finally {
        // Clean up the directory with all its content
        fs.rmSync(`${process.cwd()}/${directory}`, { recursive: true });
      }
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
        expect(() => fs.accessSync(filepath)).not.toThrow();
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
        expect(() => fs.accessSync(filepath)).not.toThrow();
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
