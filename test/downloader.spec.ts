import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { DEFAULT_EXTENSION, DEFAULT_NAME } from '~/constanta.js';
import { download, getDownloadOptions } from '~/downloader.js';
import ArgumentError from '~/errors/ArgumentError.js';
import DirectoryError from '~/errors/DirectoryError.js';
import FetchError from '~/errors/FetchError.js';

describe('`getDownloadOptions()`', () => {
  const urlTest = 'https://picsum.photos/200/300';
  const defaultExpected = {
    directory: process.cwd(),
    name: DEFAULT_NAME,
    extension: DEFAULT_EXTENSION,
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

  describe('with `directory` argument', () => {
    test('empty string', () => {
      expect(getDownloadOptions(urlTest, { directory: '' })).toEqual(defaultExpected);
    });

    test('valid directory', () => {
      expect(getDownloadOptions(urlTest, { directory: 'test' }))
        .toEqual({ ...defaultExpected, directory: 'test' });

      expect(getDownloadOptions(urlTest, { directory: '.' }))
        .toEqual({ ...defaultExpected, directory: '.' });

      expect(getDownloadOptions(urlTest, { directory: './test' }))
        .toEqual({ ...defaultExpected, directory: './test' });

      expect(getDownloadOptions(urlTest, { directory: '..' }))
        .toEqual({ ...defaultExpected, directory: '..' });

      expect(getDownloadOptions(urlTest, { directory: '../test' }))
        .toEqual({ ...defaultExpected, directory: '../test' });

      expect(getDownloadOptions(urlTest, { directory: 'test/test' }))
        .toEqual({ ...defaultExpected, directory: 'test/test' });

      expect(getDownloadOptions(urlTest, { directory: './test/test' }))
        .toEqual({ ...defaultExpected, directory: './test/test' });

      expect(getDownloadOptions(urlTest, { directory: '/test' }))
        .toEqual({ ...defaultExpected, directory: '/test' });
    });

    test('invalid: contain filename', () => {
      expect(() => getDownloadOptions(urlTest, { directory: 'test/image.jpg' })).toThrow(ArgumentError);
      expect(() => getDownloadOptions(urlTest, { directory: './test/image.jpg' })).toThrow(ArgumentError);
      expect(() => getDownloadOptions(urlTest, { directory: './test/image.jpg/' })).toThrow(ArgumentError);
      expect(() => getDownloadOptions(urlTest, { directory: 'image.jpg' })).toThrow(ArgumentError);
      expect(() => getDownloadOptions(urlTest, { directory: './image.jpg' })).toThrow(ArgumentError);
      expect(() => getDownloadOptions(urlTest, { directory: './image.jpg' })).toThrow(ArgumentError);
    });
  });

  describe('with `name` argument', () => {
    test('empty string', () => {
      expect(getDownloadOptions(urlTest, { name: '' })).toEqual(defaultExpected);
    });

    test('string', () => {
      expect(getDownloadOptions(urlTest, { name: 'test' }))
        .toEqual({ ...defaultExpected, name: 'test' });

      expect(getDownloadOptions(urlTest, { name: 'test name' }))
        .toEqual({ ...defaultExpected, name: 'test name' });

      expect(getDownloadOptions(urlTest, { name: 'test.name' }))
        .toEqual({ ...defaultExpected, name: 'test.name' });
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

    test('invalid: contain prohibited characters', () => {
      expect(() => getDownloadOptions(urlTest, { name: 'test<image' })).toThrow(ArgumentError);
      expect(() => getDownloadOptions(urlTest, { name: 'test>image' })).toThrow(ArgumentError);
      expect(() => getDownloadOptions(urlTest, { name: 'test:image' })).toThrow(ArgumentError);
      expect(() => getDownloadOptions(urlTest, { name: 'test"image' })).toThrow(ArgumentError);
      expect(() => getDownloadOptions(urlTest, { name: 'test/image' })).toThrow(ArgumentError);
      expect(() => getDownloadOptions(urlTest, { name: 'test\\image' })).toThrow(ArgumentError);
      expect(() => getDownloadOptions(urlTest, { name: 'test|image' })).toThrow(ArgumentError);
      expect(() => getDownloadOptions(urlTest, { name: 'test?image' })).toThrow(ArgumentError);
      expect(() => getDownloadOptions(urlTest, { name: 'test*image' })).toThrow(ArgumentError);
      expect(() => getDownloadOptions(urlTest, { name: 'test  ' })).toThrow(ArgumentError);
      // Other tests is covered by `sanitize-filename` in https://github.com/parshap/node-sanitize-filename/blob/master/test.js
    });

    test('invalid: contains image extension', () => {
      expect(() => getDownloadOptions(urlTest, { name: 'test.jpg' })).toThrow(ArgumentError);
      expect(() => getDownloadOptions(urlTest, { name: 'test.png' })).toThrow(ArgumentError);
      expect(() => getDownloadOptions(urlTest, { name: 'test.webp' })).toThrow(ArgumentError);
    });
  });

  describe('with `extension` argument', () => {
    test('empty string', () => {
      expect(getDownloadOptions(urlTest, { extension: '' })).toEqual(defaultExpected);
    });

    test('valid image extension', () => {
      expect(getDownloadOptions(urlTest, { extension: 'png' }))
        .toEqual({ ...defaultExpected, extension: 'png' });

      expect(getDownloadOptions(urlTest, { extension: 'webp' }))
        .toEqual({ ...defaultExpected, extension: 'webp' });

      expect(getDownloadOptions(urlTest, { extension: 'JPG' }))
        .toEqual({ ...defaultExpected, extension: 'JPG' });
    });

    test('invalid: contain dot', () => {
      expect(() => getDownloadOptions(urlTest, { extension: '.jpg' })).toThrow(ArgumentError);
      expect(() => getDownloadOptions(urlTest, { extension: '.png' })).toThrow(ArgumentError);
      expect(() => getDownloadOptions(urlTest, { extension: 'test.test' })).toThrow(ArgumentError);
      expect(() => getDownloadOptions(urlTest, { extension: 'test.test.test' })).toThrow(ArgumentError);
    });

    test('invalid: not an image extension', () => {
      expect(() => getDownloadOptions(urlTest, { extension: 'mp4' })).toThrow(ArgumentError);
      expect(() => getDownloadOptions(urlTest, { extension: 'txt' })).toThrow(ArgumentError);
      expect(() => getDownloadOptions(urlTest, { extension: 'unknown' })).toThrow(ArgumentError);
    });
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
