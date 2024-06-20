import fs from 'node:fs';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { DEFAULT_EXTENSION, DEFAULT_NAME } from '~/constanta.js';
import imgdl from '~/index.js';
import { FastifyInstance } from 'fastify';
import { buildFastify } from './fixture/mocks/server.js';

let app: FastifyInstance;
let baseUrl: string;

beforeAll(async () => {
  app = buildFastify();
  await app.listen();

  const address = app.server.address();
  if (!address) {
    throw new Error('Server not running');
  }

  baseUrl =
    typeof address === 'string' ? address : `http://localhost:${address.port}`;
});

afterAll(async () => {
  await app.close();
});

describe('`imgdl()`', () => {
  test('single image download', async () => {
    const url = `${baseUrl}/images/200x300.webp`;
    const expectedFilePath = `${process.cwd()}/200x300.webp`;

    expect((await imgdl(url)).path).toEqual(expectedFilePath);
    expect(() => fs.accessSync(expectedFilePath)).not.toThrow();
  });

  describe('multiple', () => {
    let testUrls: string[];

    const expectedNames = [
      '200x300.webp',
      `${DEFAULT_NAME}.${DEFAULT_EXTENSION}`,
    ];

    beforeAll(() => {
      testUrls = [
        `${baseUrl}/images/200x300.webp`,
        `${baseUrl}/images/200x300`,
      ];
    });

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
      const images = await imgdl([
        `${baseUrl}/images/200x300`,
        `${baseUrl}/images/200x300`,
      ]);

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
