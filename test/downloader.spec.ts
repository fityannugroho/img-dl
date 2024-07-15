import { RequestError } from 'got';
import fs from 'node:fs';
import path from 'node:path';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { DEFAULT_EXTENSION, DEFAULT_NAME } from '~/constanta.js';
import { download, parseImageParams } from '~/downloader.js';
import ArgumentError from '~/errors/ArgumentError.js';
import DirectoryError from '~/errors/DirectoryError.js';
import { BASE_URL } from './fixtures/mocks/handlers.js';
import { server } from './fixtures/mocks/node.js';

describe('parseImageParams', () => {
  it('should set values from URL if no options are provided', () => {
    const url = 'https://example.com/someimage.webp';
    expect(parseImageParams(url)).toStrictEqual({
      url: new URL(url),
      name: 'someimage',
      extension: 'webp',
      directory: process.cwd(),
      originalName: 'someimage',
      originalExtension: 'webp',
      path: path.resolve('someimage.webp'),
    });
  });

  it('should use default values if URL has no file ending', () => {
    const url = 'https://example.com/someimage';
    expect(parseImageParams(url)).toStrictEqual({
      url: new URL(url),
      name: DEFAULT_NAME,
      extension: DEFAULT_EXTENSION,
      directory: process.cwd(),
      originalName: undefined,
      originalExtension: undefined,
      path: path.resolve(`${DEFAULT_NAME}.${DEFAULT_EXTENSION}`),
    });
  });

  it.each([
    'not-url',
    'some/path',
    'example.com/image.jpg',
    'ftp://example.com',
    'ws://example.com',
  ])('should throw error if URL is invalid: `%s`', (url) => {
    expect(() => parseImageParams(url)).toThrow(ArgumentError);
  });

  it('should use current working directory if directory is empty', () => {
    const url = 'https://example.com/image.jpg';
    const result = parseImageParams(url, { directory: '' });
    expect(result.directory).toBe(process.cwd());
    expect(result.path).toBe(path.resolve('image.jpg'));
  });

  it.each([
    ['images', 'images'],
    ['images/', 'images/'],
    ['images/me', 'images/me'],
    ['images/me/', 'images/me/'],
    ['.', '.'],
    ['./images', 'images'],
    ['./images/', 'images/'],
    ['test/../images', 'images'],
    ['test/../images/', 'images/'],
  ])('should set a valid normalized directory: `%s`', (dir, expectedDir) => {
    const url = 'https://example.com/image.jpg';
    const result = parseImageParams(url, { directory: dir });
    expect(result.directory).toBe(expectedDir);
    expect(result.path).toBe(path.resolve(expectedDir, 'image.jpg'));
  });

  it.each([
    'images/image.jpg',
    './images/image.jpg',
    './images/image.jpg/',
    'image.jpg',
    './image.jpg',
    './image.jpg/',
  ])('should throw error if directory contains filename: `%s`', (directory) => {
    const url = 'https://example.com/image.jpg';
    expect(() => parseImageParams(url, { directory })).toThrow(ArgumentError);
  });

  it('should use original name if no name is provided', () => {
    const url = 'https://example.com/someimage.jpg';
    const result = parseImageParams(url);
    expect(result.originalName).toBe('someimage');
    expect(result.name).toBe('someimage');
  });

  it('should use original name if name is empty', () => {
    const url = 'https://example.com/someimage.jpg';
    const result = parseImageParams(url, { name: '' });
    expect(result.originalName).toBe('someimage');
    expect(result.name).toBe('someimage');
  });

  it('should use default name if name is empty and URL has no file ending', () => {
    const url = 'https://example.com/image';
    const result = parseImageParams(url, { name: '' });
    expect(result.originalName).toBeUndefined();
    expect(result.name).toBe(DEFAULT_NAME);
  });

  it.each([
    'newname',
    'new name',
    'new-name',
    'new_name',
    'new.name',
    ' newname',
  ])('should set a valid name: `%s`', (name) => {
    const url = 'https://example.com/someimage.webp';
    const result = parseImageParams(url, { name });
    expect(result.originalName).toBe('someimage');
    expect(result.name).toBe(name);
    expect(result.path).toBe(path.resolve(`${name}.webp`));
  });

  it('should throw error if name contains extension', () => {
    const url = 'https://example.com/image.jpg';
    const options = { name: 'newname.jpg' };
    expect(() => parseImageParams(url, options)).toThrow(ArgumentError);
  });

  it.each([
    'new<name',
    'new>name',
    'new:name',
    'new/name',
    'new\\name',
    'new|name',
    'new?name',
    'new*name',
    'newname ',
    // Other tests is covered by `sanitize-filename` in https://github.com/parshap/node-sanitize-filename/blob/master/test.js
  ])(
    'should throw error if name contain prohibited characters: `%s`',
    (name) => {
      const url = 'https://example.com/image.jpg';
      const options = { name };
      expect(() => parseImageParams(url, options)).toThrow(ArgumentError);
    },
  );

  it('should use original extension if no extension is provided', () => {
    const url = 'https://example.com/image.jpg';
    const result = parseImageParams(url);
    expect(result.originalExtension).toBe('jpg');
    expect(result.extension).toBe('jpg');
  });

  it('should use original extension if extension is empty', () => {
    const url = 'https://example.com/image.webp';
    const result = parseImageParams(url, { extension: '' });
    expect(result.originalExtension).toBe('webp');
    expect(result.extension).toBe('webp');
  });

  it('should use default extension if no extension is provided and URL has no file ending', () => {
    const url = 'https://example.com/image';
    const result = parseImageParams(url);
    expect(result.originalExtension).toBeUndefined();
    expect(result.extension).toBe(DEFAULT_EXTENSION);
  });

  it.each(['png', 'PNG', 'jpeg', 'webp', 'gif', 'svg'])(
    'should set a valid extension: `%s`',
    (extension) => {
      const url = 'https://example.com/image.jpg';
      const result = parseImageParams(url, { extension });
      expect(result.originalExtension).toBe('jpg');
      expect(result.extension).toBe(extension);
      expect(result.path).toBe(path.resolve(`image.${extension}`));
    },
  );

  it('should throw error if extension contains dot', () => {
    const url = 'https://example.com/image.jpg';
    const options = { extension: '.png' };
    expect(() => parseImageParams(url, options)).toThrow(ArgumentError);
  });

  it.each(['txt', 'mp4', 'unknown', 'bla.bla'])(
    'should throw error if not an image extension: `%s`',
    (extension) => {
      const url = 'https://example.com/image.jpg';
      expect(() => parseImageParams(url, { extension })).toThrow(ArgumentError);
    },
  );

  it('should generate a unique name if file path is taken', () => {
    const url = 'https://example.com/image.jpg';
    const options = { directory: 'images/me' };

    const existsSyncSpyOn = vi.spyOn(fs, 'existsSync');
    existsSyncSpyOn.mockImplementationOnce((filePath) => {
      return filePath === path.resolve('images/me', 'image.jpg');
    });

    const result = parseImageParams(url, options);
    expect(result.name).toBe('image (1)');
  });
});

describe('`download`', () => {
  beforeAll(() => server.listen());

  afterEach(() => server.resetHandlers());

  afterAll(() => server.close());

  it('should download an image and save it', async () => {
    const expectedImage = parseImageParams(`${BASE_URL}/image.jpg`);
    const image = await download(expectedImage);
    try {
      expect(image).toStrictEqual(expectedImage);
      await expect(fs.promises.access(image.path)).resolves.toBeUndefined();
    } finally {
      await fs.promises.rm(image.path, { force: true });
    }
  });

  it('should throw an error if directory cannot be created', async () => {
    const directory = '/restricted-dir';
    const image = parseImageParams(`${BASE_URL}/image.jpg`, { directory });
    await expect(download(image)).rejects.toThrow(DirectoryError);
  });

  it.each(['tmp', 'test/tmp'])(
    'should create the directory if it does not exist: `%s`',
    async (directory) => {
      // Prepare: ensure the directory does not exist
      await fs.promises.rm(directory, { recursive: true, force: true });

      const image = parseImageParams(`${BASE_URL}/image.jpg`, { directory });
      const { path: actualPath } = await download(image);

      try {
        // Check if the directory was created
        await expect(fs.promises.access(directory)).resolves.toBeUndefined();
        // Check if the file was created
        await expect(fs.promises.access(actualPath)).resolves.toBeUndefined();
      } finally {
        await fs.promises.rm(directory, { recursive: true, force: true });
      }
    },
  );

  it('should throw an error if the response is not an image', async () => {
    await expect(
      // `GET /` will return a 200 OK response with `OK` body
      download(parseImageParams(BASE_URL)),
    ).rejects.toThrow(RequestError);
  });

  it('should throw an error if the response is unsuccessful', async () => {
    const url = `${BASE_URL}/unknown`;

    await expect(
      // `GET /unknown` will return a 404 Not Found response
      download(parseImageParams(url)),
    ).rejects.toThrow(RequestError);
  });

  it('should throw an error if failed to save the image (because of createWriteStream error)', async () => {
    const image = parseImageParams(`${BASE_URL}/image.jpg`);
    const writeStreamSpyOn = vi.spyOn(fs, 'createWriteStream');

    // @ts-expect-error: missing another method implementations
    writeStreamSpyOn.mockImplementationOnce(() => {
      return {
        write: () => {
          throw new Error('Failed to save the image');
        },
      };
    });

    await expect(download(image)).rejects.toThrow(Error);
  });
});
