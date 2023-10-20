import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { DEFAULT_NAME, download, getDownloadOptions } from '~/downloader.js';
import ArgumentError from '~/errors/ArgumentError.js';
import DirectoryError from '~/errors/DirectoryError.js';
import FetchError from '~/errors/FetchError.js';

describe('`getDownloadOptions()`', () => {
  const urlTest = 'https://picsum.photos/200/300';
  const defaultExtension = 'jpg';
  const defaultExpected = {
    directory: process.cwd(),
    name: DEFAULT_NAME,
    extension: defaultExtension,
  };

  test('Only `url` with file ending', () => {
    const url = 'https://picsum.photos/200/300.webp';

    expect(getDownloadOptions(url)).toEqual({
      ...defaultExpected,
      name: '300',
      extension: 'webp',
    });
  });

  test('Only `url` without file ending', () => {
    expect(getDownloadOptions(urlTest)).toEqual(defaultExpected);
  });

  test('with `directory` argument', () => {
    const directory = './test/tmp';

    expect(getDownloadOptions(urlTest, { directory }))
      .toEqual({ ...defaultExpected, directory });
  });

  describe('with `name` argument', () => {
    test('empty string', () => {
      expect(getDownloadOptions(urlTest, { name: '' }))
        .toEqual({ ...defaultExpected, name: DEFAULT_NAME });
    });

    test('string', () => {
      expect(getDownloadOptions(urlTest, { name: 'test' }))
        .toEqual({ ...defaultExpected, name: 'test' });
    });

    test('function returns empty string', () => {
      expect(getDownloadOptions(urlTest, { name: () => '' }))
        .toEqual({ ...defaultExpected, name: DEFAULT_NAME });
    });

    test('function returns string', () => {
      expect(getDownloadOptions(urlTest, { name: () => 'test' }))
        .toEqual({ ...defaultExpected, name: 'test' });
    });

    test('function with original name', () => {
      expect(getDownloadOptions(urlTest, { name: (ori) => `test-${ori}` }))
        .toEqual({ ...defaultExpected, name: 'test-undefined' });

      expect(getDownloadOptions('https://picsum.photos/200/300.webp', { name: (ori) => `test-${ori}` }))
        .toEqual({ ...defaultExpected, name: 'test-300', extension: 'webp' });
    });
  });

  test('with `extension` argument', () => {
    expect(getDownloadOptions(urlTest, { extension: 'png' }))
      .toEqual({ ...defaultExpected, extension: 'png' });
  });

  test('with invalid `extension` argument', () => {
    expect(() => getDownloadOptions(urlTest, { extension: '.jpg' })).toThrow(ArgumentError);
    expect(() => getDownloadOptions(urlTest, { extension: '.mp4' })).toThrow(ArgumentError);
  });

  test('with `destination`, `filename` and `extension` arguments', () => {
    const url = 'https://picsum.photos/200/300';
    const options = {
      directory: './test/tmp',
      name: 'test',
      extension: 'png',
    };

    expect(getDownloadOptions(url, options)).toEqual(options);
  });
});

describe('`download()`', () => {
  test('Only `url`', async () => {
    const url = 'https://picsum.photos/200/300.webp';
    const expectedFilePath = `${process.cwd()}/300.webp`;

    expect(await download(url)).toEqual(expectedFilePath);
    expect(fs.existsSync(expectedFilePath)).toBe(true); // Ensure the image is actually exists

    // Cleanup
    fs.unlinkSync(expectedFilePath);
  }, { timeout: 10000 });

  test('should throw an error if the directory cannot be created', async () => {
    const url = 'https://picsum.photos/200/300';
    const directory = '/new-root-dir-no-access';
    await expect(download(url, { directory })).rejects.toThrow(DirectoryError);
  });

  test('should throw an error if the URL is invalid', async () => {
    const url = 'invalid-url';
    await expect(download(url)).rejects.toThrow(FetchError);
  });

  test('should throw an error if the response is unsuccessful', async () => {
    const url = 'https://picsum.photos/xxx';
    await expect(download(url)).rejects.toThrow(FetchError);
  });

  test('should throw an error if the response is not an image', async () => {
    const url = 'https://picsum.photos';
    await expect(download(url)).rejects.toThrow(FetchError);
  });
});
