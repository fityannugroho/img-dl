import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { download, getDownloadOptions } from '~/downloader.js';
import DirectoryError from '~/errors/DirectoryError.js';
import FetchError from '~/errors/FetchError.js';

describe('`getDownloadOptions()`', () => {
  const defaultFilenameRegex = /^\d{13}$/;
  const defaultExtension = '.jpg';

  test('Only `url` with file ending', () => {
    const url = 'https://picsum.photos/200/300.webp';

    expect(getDownloadOptions(url)).toEqual({
      destination: process.cwd(),
      filename: '300',
      extension: '.webp',
    });
  });

  test('Only `url` without file ending', () => {
    const url = 'https://picsum.photos/200/300';

    expect(getDownloadOptions(url)).toEqual({
      destination: process.cwd(),
      filename: expect.stringMatching(defaultFilenameRegex) as string,
      extension: defaultExtension,
    });
  });

  test('`url` with `destination`', () => {
    const url = 'https://picsum.photos/200/300';
    const destination = './test/tmp';

    expect(getDownloadOptions(url, { destination })).toEqual({
      destination,
      filename: expect.stringMatching(defaultFilenameRegex) as string,
      extension: defaultExtension,
    });
  });

  test('`url` with `filename`', () => {
    const url = 'https://picsum.photos/200/300';
    const filename = 'test';

    expect(getDownloadOptions(url, { filename })).toEqual({
      destination: process.cwd(),
      filename,
      extension: defaultExtension,
    });
  });

  test('`url` with `extension`', () => {
    const url = 'https://picsum.photos/200/300';
    const extension = '.png';

    expect(getDownloadOptions(url, { extension })).toEqual({
      destination: process.cwd(),
      filename: expect.stringMatching(defaultFilenameRegex) as string,
      extension,
    });
  });

  test('`url` with `destination`, `filename` and `extension`', () => {
    const url = 'https://picsum.photos/200/300';
    const options = {
      destination: './test/tmp',
      filename: 'test',
      extension: '.png',
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
  }, { timeout: 5000 });

  test('should throw an error if the directory cannot be created', async () => {
    const url = 'https://picsum.photos/200/300';
    const destination = '/new-root-dir-no-access';
    await expect(download(url, { destination })).rejects.toThrow(DirectoryError);
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
