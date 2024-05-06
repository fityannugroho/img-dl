import { HTTPError, RequestError } from 'got';
import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { DEFAULT_EXTENSION, DEFAULT_NAME } from '~/constanta.js';
import { download, parseImageParams } from '~/downloader.js';
import ArgumentError from '~/errors/ArgumentError.js';
import DirectoryError from '~/errors/DirectoryError.js';

describe('`parseImageParams()`', () => {
  const urlTest = 'https://picsum.photos/200/300';
  const defaultExpected = {
    url: urlTest,
    directory: process.cwd(),
    name: DEFAULT_NAME,
    extension: DEFAULT_EXTENSION,
    originalName: undefined,
    originalExtension: undefined,
    path: `${process.cwd()}/${DEFAULT_NAME}.${DEFAULT_EXTENSION}`,
  };

  test('Only `url` with file ending', () => {
    const url = 'https://picsum.photos/200/300.webp';

    expect(parseImageParams(url)).toEqual({
      ...defaultExpected,
      url,
      name: '300',
      extension: 'webp',
      originalName: '300',
      originalExtension: 'webp',
      path: `${defaultExpected.directory}/300.webp`,
    });
  });

  test('Only `url` without file ending', () => {
    expect(parseImageParams(urlTest)).toEqual(defaultExpected);
  });

  describe('with `directory` argument', () => {
    test('empty string', () => {
      expect(parseImageParams(urlTest, { directory: '' })).toEqual(
        defaultExpected,
      );
    });

    test('valid directory', () => {
      expect(parseImageParams(urlTest, { directory: 'test' })).toEqual({
        ...defaultExpected,
        directory: 'test',
        path: `${defaultExpected.directory}/test/${defaultExpected.name}.${defaultExpected.extension}`,
      });

      expect(parseImageParams(urlTest, { directory: '.' })).toEqual({
        ...defaultExpected,
        directory: '.',
      });

      expect(parseImageParams(urlTest, { directory: './test' })).toEqual({
        ...defaultExpected,
        directory: 'test',
        path: `${defaultExpected.directory}/test/${defaultExpected.name}.${defaultExpected.extension}`,
      });

      expect(parseImageParams(urlTest, { directory: 'test/..' })).toEqual({
        ...defaultExpected,
        directory: '.',
        path: `${defaultExpected.directory}/${defaultExpected.name}.${defaultExpected.extension}`,
      });

      expect(parseImageParams(urlTest, { directory: 'test/../test2' })).toEqual(
        {
          ...defaultExpected,
          directory: 'test2',
          path: `${defaultExpected.directory}/test2/${defaultExpected.name}.${defaultExpected.extension}`,
        },
      );

      expect(parseImageParams(urlTest, { directory: 'test/test' })).toEqual({
        ...defaultExpected,
        directory: 'test/test',
        path: `${defaultExpected.directory}/test/test/${defaultExpected.name}.${defaultExpected.extension}`,
      });

      expect(parseImageParams(urlTest, { directory: './test/test' })).toEqual({
        ...defaultExpected,
        directory: 'test/test',
        path: `${defaultExpected.directory}/test/test/${defaultExpected.name}.${defaultExpected.extension}`,
      });

      expect(parseImageParams(urlTest, { directory: '/test' })).toEqual({
        ...defaultExpected,
        directory: '/test',
        path: `/test/${defaultExpected.name}.${defaultExpected.extension}`,
      });
    });

    test('invalid: contain filename', () => {
      expect(() =>
        parseImageParams(urlTest, { directory: 'test/image.jpg' }),
      ).toThrow(ArgumentError);
      expect(() =>
        parseImageParams(urlTest, { directory: './test/image.jpg' }),
      ).toThrow(ArgumentError);
      expect(() =>
        parseImageParams(urlTest, { directory: './test/image.jpg/' }),
      ).toThrow(ArgumentError);
      expect(() =>
        parseImageParams(urlTest, { directory: 'image.jpg' }),
      ).toThrow(ArgumentError);
      expect(() =>
        parseImageParams(urlTest, { directory: './image.jpg' }),
      ).toThrow(ArgumentError);
      expect(() =>
        parseImageParams(urlTest, { directory: './image.jpg' }),
      ).toThrow(ArgumentError);
    });
  });

  describe('with `name` argument', () => {
    test('empty string', () => {
      expect(parseImageParams(urlTest, { name: '' })).toEqual(defaultExpected);
    });

    test('string', () => {
      expect(parseImageParams(urlTest, { name: 'test' })).toEqual({
        ...defaultExpected,
        name: 'test',
        path: `${defaultExpected.directory}/test.${defaultExpected.extension}`,
      });

      expect(parseImageParams(urlTest, { name: 'test name' })).toEqual({
        ...defaultExpected,
        name: 'test name',
        path: `${defaultExpected.directory}/test name.${defaultExpected.extension}`,
      });

      expect(parseImageParams(urlTest, { name: 'test.name' })).toEqual({
        ...defaultExpected,
        name: 'test.name',
        path: `${defaultExpected.directory}/test.name.${defaultExpected.extension}`,
      });
    });

    test('function returns empty string', () => {
      expect(parseImageParams(urlTest, { name: () => '' })).toEqual({
        ...defaultExpected,
        name: DEFAULT_NAME,
      });
    });

    test('function returns string', () => {
      expect(parseImageParams(urlTest, { name: () => 'test' })).toEqual({
        ...defaultExpected,
        name: 'test',
        path: `${defaultExpected.directory}/test.${defaultExpected.extension}`,
      });
    });

    test('function with original name', () => {
      expect(
        parseImageParams(urlTest, { name: (ori) => `test-${ori}` }),
      ).toEqual({
        ...defaultExpected,
        name: 'test-undefined',
        path: `${defaultExpected.directory}/test-undefined.${defaultExpected.extension}`,
      });

      expect(
        parseImageParams('https://picsum.photos/200/300.webp', {
          name: (ori) => `test-${ori}`,
        }),
      ).toEqual({
        ...defaultExpected,
        url: 'https://picsum.photos/200/300.webp',
        name: 'test-300',
        extension: 'webp',
        originalName: '300',
        originalExtension: 'webp',
        path: `${defaultExpected.directory}/test-300.webp`,
      });
    });

    test('invalid: contain prohibited characters', () => {
      expect(() => parseImageParams(urlTest, { name: 'test<image' })).toThrow(
        ArgumentError,
      );
      expect(() => parseImageParams(urlTest, { name: 'test>image' })).toThrow(
        ArgumentError,
      );
      expect(() => parseImageParams(urlTest, { name: 'test:image' })).toThrow(
        ArgumentError,
      );
      expect(() => parseImageParams(urlTest, { name: 'test"image' })).toThrow(
        ArgumentError,
      );
      expect(() => parseImageParams(urlTest, { name: 'test/image' })).toThrow(
        ArgumentError,
      );
      expect(() => parseImageParams(urlTest, { name: 'test\\image' })).toThrow(
        ArgumentError,
      );
      expect(() => parseImageParams(urlTest, { name: 'test|image' })).toThrow(
        ArgumentError,
      );
      expect(() => parseImageParams(urlTest, { name: 'test?image' })).toThrow(
        ArgumentError,
      );
      expect(() => parseImageParams(urlTest, { name: 'test*image' })).toThrow(
        ArgumentError,
      );
      expect(() => parseImageParams(urlTest, { name: 'test  ' })).toThrow(
        ArgumentError,
      );
      // Other tests is covered by `sanitize-filename` in https://github.com/parshap/node-sanitize-filename/blob/master/test.js
    });

    test('invalid: contains image extension', () => {
      expect(() => parseImageParams(urlTest, { name: 'test.jpg' })).toThrow(
        ArgumentError,
      );
      expect(() => parseImageParams(urlTest, { name: 'test.png' })).toThrow(
        ArgumentError,
      );
      expect(() => parseImageParams(urlTest, { name: 'test.webp' })).toThrow(
        ArgumentError,
      );
    });
  });

  describe('with `extension` argument', () => {
    test('empty string', () => {
      expect(parseImageParams(urlTest, { extension: '' })).toEqual(
        defaultExpected,
      );
    });

    test('valid image extension', () => {
      expect(parseImageParams(urlTest, { extension: 'png' })).toEqual({
        ...defaultExpected,
        extension: 'png',
        path: `${defaultExpected.directory}/${defaultExpected.name}.png`,
      });

      expect(parseImageParams(urlTest, { extension: 'webp' })).toEqual({
        ...defaultExpected,
        extension: 'webp',
        path: `${defaultExpected.directory}/${defaultExpected.name}.webp`,
      });

      expect(parseImageParams(urlTest, { extension: 'JPG' })).toEqual({
        ...defaultExpected,
        extension: 'JPG',
        path: `${defaultExpected.directory}/${defaultExpected.name}.JPG`,
      });
    });

    test('invalid: contain dot', () => {
      expect(() => parseImageParams(urlTest, { extension: '.jpg' })).toThrow(
        ArgumentError,
      );
      expect(() => parseImageParams(urlTest, { extension: '.png' })).toThrow(
        ArgumentError,
      );
      expect(() =>
        parseImageParams(urlTest, { extension: 'test.test' }),
      ).toThrow(ArgumentError);
      expect(() =>
        parseImageParams(urlTest, { extension: 'test.test.test' }),
      ).toThrow(ArgumentError);
    });

    test('invalid: not an image extension', () => {
      expect(() => parseImageParams(urlTest, { extension: 'mp4' })).toThrow(
        ArgumentError,
      );
      expect(() => parseImageParams(urlTest, { extension: 'txt' })).toThrow(
        ArgumentError,
      );
      expect(() => parseImageParams(urlTest, { extension: 'unknown' })).toThrow(
        ArgumentError,
      );
    });
  });
});

describe('`download()`', () => {
  test('Only `url`', { timeout: 15000 }, async () => {
    const url = 'https://picsum.photos/200/300.webp';
    const expectedFilePath = `${process.cwd()}/300.webp`;

    expect((await download(url)).path).toEqual(expectedFilePath);
    expect(fs.existsSync(expectedFilePath)).toBe(true); // Ensure the image is actually exists

    // Cleanup
    fs.unlinkSync(expectedFilePath);
  });

  test('should throw an error if the directory cannot be created', async () => {
    const url = 'https://picsum.photos/200/300';
    const directory = '/new-root-dir-no-access';
    await expect(download(url, { directory })).rejects.toThrow(DirectoryError);
  });

  test('should throw an error if the URL is invalid', async () => {
    const url = 'invalid-url';
    await expect(download(url)).rejects.toThrow(RequestError);
  });

  test('should throw an error if the response is unsuccessful', async () => {
    const url = 'https://picsum.photos/xxx';
    await expect(download(url)).rejects.toThrow(HTTPError);
  });

  test('should throw an error if the response is not an image', async () => {
    const url = 'https://picsum.photos';
    await expect(download(url)).rejects.toThrow(RequestError);
  });
});
