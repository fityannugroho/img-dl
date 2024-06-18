import { HTTPError, RequestError } from 'got';
import nock from 'nock';
import fs from 'node:fs';
import { afterAll, afterEach, describe, expect, test } from 'vitest';
import {
  DEFAULT_EXTENSION,
  DEFAULT_NAME,
  imageExtensions,
} from '~/constanta.js';
import { download, parseImageParams } from '~/downloader.js';
import ArgumentError from '~/errors/ArgumentError.js';
import DirectoryError from '~/errors/DirectoryError.js';
import { BASE_URL } from './fixture/constanta.js';
import path from 'node:path';

describe('`parseImageParams()`', () => {
  const urlTest = `${BASE_URL}/images/200x300`;
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
    const url = `${BASE_URL}/200x300.webp`;

    expect(parseImageParams(url)).toEqual({
      ...defaultExpected,
      url,
      name: '200x300',
      extension: 'webp',
      originalName: '200x300',
      originalExtension: 'webp',
      path: `${defaultExpected.directory}/200x300.webp`,
    });
  });

  test('Only `url` without file ending', () => {
    expect(parseImageParams(urlTest)).toEqual(defaultExpected);
  });

  test('where image with the same name already exists', () => {
    // Add the test image file
    const existingFilePath = `${defaultExpected.directory}/${defaultExpected.name}.${defaultExpected.extension}`;
    fs.writeFileSync(existingFilePath, 'test image content');

    // Test the `parseImageParams()` and make sure it returns name with suffix ' (1)'
    expect(parseImageParams(urlTest)).toEqual({
      ...defaultExpected,
      name: `${defaultExpected.name} (1)`,
      path: `${defaultExpected.directory}/${defaultExpected.name} (1).${defaultExpected.extension}`,
    });

    // Add the test image file with suffix ' (1)'
    const existingFilePathWithSuffix = `${defaultExpected.directory}/${defaultExpected.name} (1).${defaultExpected.extension}`;
    fs.writeFileSync(existingFilePathWithSuffix, 'test image content');

    // Test the `parseImageParams()` and make sure it returns name with suffix ' (2)'
    expect(parseImageParams(urlTest)).toEqual({
      ...defaultExpected,
      name: `${defaultExpected.name} (2)`,
      path: `${defaultExpected.directory}/${defaultExpected.name} (2).${defaultExpected.extension}`,
    });

    // Clean up all images files in the current directory
    fs.readdirSync(process.cwd()).forEach((file) => {
      const ext = file.split('.').pop();
      if (ext && imageExtensions.has(ext.toLowerCase())) {
        fs.unlinkSync(file);
      }
    });
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
  afterEach(() => {
    // Clean up all images files in the current directory
    fs.readdirSync(process.cwd()).forEach((file) => {
      const ext = file.split('.').pop();
      if (ext && imageExtensions.has(ext.toLowerCase())) {
        fs.unlinkSync(file);
      }
    });

    // Restore the nock
    nock.restore();
  });

  afterAll(() => {
    nock.cleanAll();
  });

  test('Only `url`', async () => {
    const scope = nock(BASE_URL)
      .get('/images/200x300.webp')
      .replyWithFile(200, path.resolve(__dirname, 'fixture/200x300.webp'), {
        'Content-Type': 'image/webp',
      });

    const imgTest = parseImageParams(`${BASE_URL}/images/200x300.webp`);
    const expectedFilePath = `${process.cwd()}/200x300.webp`;

    expect((await download(imgTest)).path).toEqual(expectedFilePath);
    scope.done();
    expect(fs.existsSync(expectedFilePath)).toBe(true);
  });

  test('should throw an error if the directory cannot be created', async () => {
    const imgTest = parseImageParams(`${BASE_URL}/images/200x300`, {
      directory: '/new-root-dir-no-access',
    });

    await expect(download(imgTest)).rejects.toThrow(DirectoryError);
  });

  test('should throw an error if the URL is invalid', async () => {
    const imgTest = parseImageParams('invalid-url');
    await expect(download(imgTest)).rejects.toThrow(RequestError);
  });

  test('should throw an error if the response is unsuccessful', async () => {
    const imgTest = parseImageParams(`${BASE_URL}/xxx`);
    await expect(download(imgTest)).rejects.toThrow(HTTPError);
  });

  test('should throw an error if the response is not an image', async () => {
    const imgTest = parseImageParams(BASE_URL);
    await expect(download(imgTest)).rejects.toThrow(RequestError);
  });
});
