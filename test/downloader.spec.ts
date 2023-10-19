import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { download, getDownloadOptions } from '~/downloader.js';
import ArgumentError from '~/errors/ArgumentError.js';
import DirectoryError from '~/errors/DirectoryError.js';
import FetchError from '~/errors/FetchError.js';

describe('`getDownloadOptions()`', () => {
  const urlTest = 'https://picsum.photos/200/300';
  const defaultFilenameRegex = /^\d{13}$/;
  const defaultExtension = 'jpg';

  test('Only `url` with file ending', () => {
    const url = 'https://picsum.photos/200/300.webp';

    expect(getDownloadOptions(url)).toEqual({
      directory: process.cwd(),
      name: '300',
      extension: 'webp',
    });
  });

  test('Only `url` without file ending', () => {
    expect(getDownloadOptions(urlTest)).toEqual({
      directory: process.cwd(),
      name: expect.stringMatching(defaultFilenameRegex) as string,
      extension: defaultExtension,
    });
  });

  test('with `directory` argument', () => {
    const directory = './test/tmp';

    expect(getDownloadOptions(urlTest, { directory })).toEqual({
      directory,
      name: expect.stringMatching(defaultFilenameRegex) as string,
      extension: defaultExtension,
    });
  });

  test('with `name` argument', () => {
    const name = 'test';

    expect(getDownloadOptions(urlTest, { name })).toEqual({
      directory: process.cwd(),
      name,
      extension: defaultExtension,
    });
  });

  test('with `extension` argument', () => {
    const extension = 'png';

    expect(getDownloadOptions(urlTest, { extension })).toEqual({
      directory: process.cwd(),
      name: expect.stringMatching(defaultFilenameRegex) as string,
      extension,
    });
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
