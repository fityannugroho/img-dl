import fs from 'node:fs';
import path from 'node:path';
import { fileTypeFromFile } from 'file-type';
import { RequestError } from 'got';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_EXTENSION, DEFAULT_NAME } from '~/constanta.js';
import { download, parseImageParams } from '~/downloader.js';
import ArgumentError from '~/errors/ArgumentError.js';
import DirectoryError from '~/errors/DirectoryError.js';
import { BASE_URL } from './fixtures/mocks/handlers.js';
import { server } from './fixtures/mocks/node.js';

describe('parseImageParams', () => {
  describe('url', () => {
    it('set values from URL if no options provided', () => {
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

    it('use default values if URL has no file ending', () => {
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

    it.each(['not-url', 'some/path', 'example.com/image.jpg'])(
      'throw error if not URL: `%s`',
      (url) => {
        expect(() => parseImageParams(url)).toThrow(
          new ArgumentError('Invalid URL'),
        );
      },
    );

    it.each(['ftp://example.com', 'ws://example.com'])(
      'throw error if protocol is not http(s): `%s`',
      (url) => {
        expect(() => parseImageParams(url)).toThrow(
          new ArgumentError('URL protocol must be http or https'),
        );
      },
    );

    it.each([
      'https://example.com/file.pdf',
      'https://example.com/file.exe',
      'https://example.com/file.txt',
      'https://example.com/file.zip',
    ])('throw error if not image URL: `%s`', (url) => {
      expect(() => parseImageParams(url)).toThrow(
        new ArgumentError('The URL is not a valid image URL'),
      );
    });
  });

  describe('options.directory', () => {
    it('use current working directory if empty', () => {
      const url = 'https://example.com/image.jpg';
      const result = parseImageParams(url, { directory: '' });
      expect(result.directory).toBe(process.cwd());
      expect(result.path).toBe(path.resolve('image.jpg'));
    });

    it.each([
      'images',
      'images/',
      'images/me',
      'images/me/',
      '.',
      './images',
      './images/',
      'test/../images',
      'test/../images/',
    ])('return the path of directory: `%s`', (directory) => {
      const url = 'https://example.com/image.jpg';
      const result = parseImageParams(url, { directory });
      expect(result.directory).toBe(path.resolve(directory));
      expect(result.path).toBe(path.join(result.directory, 'image.jpg'));
    });
  });

  describe('options.name', () => {
    it('use original name if no name provided', () => {
      const url = 'https://example.com/someimage.jpg';
      const result = parseImageParams(url);
      expect(result.originalName).toBe('someimage');
      expect(result.name).toBe('someimage');
    });

    it('use original name if name is empty', () => {
      const url = 'https://example.com/someimage.jpg';
      const result = parseImageParams(url, { name: '' });
      expect(result.originalName).toBe('someimage');
      expect(result.name).toBe('someimage');
    });

    it('use default name if name is empty and URL has no file ending', () => {
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
      'new.pdf',
      ' newname',
    ])('set valid name: `%s`', (name) => {
      const url = 'https://example.com/someimage.webp';
      const result = parseImageParams(url, { name });
      expect(result.originalName).toBe('someimage');
      expect(result.name).toBe(name);
      expect(result.path).toBe(path.resolve(`${name}.webp`));
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
    ])('throw error if contain prohibited characters: `%s`', (name) => {
      const url = 'https://example.com/image.jpg';
      expect(() => parseImageParams(url, { name })).toThrow(
        new ArgumentError('Invalid `name` value'),
      );
    });
  });

  describe('options.extension', () => {
    it('use original extension if no extension is provided', () => {
      const url = 'https://example.com/image.jpg';
      const result = parseImageParams(url);
      expect(result.originalExtension).toBe('jpg');
      expect(result.extension).toBe('jpg');
    });

    it('use original extension if extension empty', () => {
      const url = 'https://example.com/image.webp';
      const result = parseImageParams(url, { extension: '' });
      expect(result.originalExtension).toBe('webp');
      expect(result.extension).toBe('webp');
    });

    it('use default extension if not provided and no file ending in the URL', () => {
      const url = 'https://example.com/image';
      const result = parseImageParams(url);
      expect(result.originalExtension).toBeUndefined();
      expect(result.extension).toBe(DEFAULT_EXTENSION);
    });

    it.each(['png', 'PNG', 'jpg', 'jpeg', 'webp', 'gif', 'svg'])(
      'must be valid and supported, case-insensitive (lowercase): `%s`',
      (extension) => {
        const url = 'https://example.com/image.jpg';
        const result = parseImageParams(url, { extension });
        expect(result.originalExtension).toBe('jpg');
        expect(result.extension).toBe(extension.toLowerCase());
        expect(result.path).toBe(
          path.resolve(`image.${extension.toLowerCase()}`),
        );
      },
    );

    it('throw error if contains dot', () => {
      const url = 'https://example.com/image.jpg';
      const options = { extension: '.png' };
      expect(() => parseImageParams(url, options)).toThrow(ArgumentError);
    });

    it.each(['txt', 'mp4', 'unknown', 'bla.bla', 'vnd', 'tga', 'exif', 'heic'])(
      'throw error if invalid or unsupported image extensions: `%s`',
      (extension) => {
        const url = 'https://example.com/image.jpg';
        expect(() => parseImageParams(url, { extension })).toThrow(
          new ArgumentError('Unsupported image extension'),
        );
      },
    );

    it('generate suffix name if file path already exists', ({
      onTestFinished,
    }) => {
      const url = 'https://example.com/image.jpg';
      const options = { directory: 'images/me' };

      fs.mkdirSync(options.directory, { recursive: true });

      onTestFinished(() => {
        fs.rmSync(options.directory, { recursive: true, force: true });
      });

      fs.writeFileSync(path.resolve(options.directory, 'image.jpg'), '');
      expect(parseImageParams(url, options).name).toBe('image (1)');

      fs.writeFileSync(path.resolve(options.directory, 'image (1).jpg'), '');
      expect(parseImageParams(url, options).name).toBe('image (2)');
    });
  });
});

describe('`download`', () => {
  beforeAll(() => server.listen());

  afterEach(() => server.resetHandlers());

  afterAll(() => server.close());

  it('use default download options', async ({ onTestFinished }) => {
    const image = parseImageParams(`${BASE_URL}/image.jpg`);

    onTestFinished(async () => {
      await fs.promises.rm(image.path, { force: true });
    });

    await expect(download(image)).resolves.toStrictEqual(image);
    await expect(fs.promises.access(image.path)).resolves.toBeUndefined();
    await expect(fileTypeFromFile(image.path)).resolves.toStrictEqual({
      ext: 'jpg',
      mime: 'image/jpeg',
    });
  });

  it('transform the image if extension is specified', async ({
    onTestFinished,
  }) => {
    const extension = 'png';
    const image = parseImageParams(`${BASE_URL}/image.jpg`, { extension });

    onTestFinished(async () => {
      await fs.promises.rm(image.path, { force: true });
    });

    await expect(download(image)).resolves.toStrictEqual(image);
    await expect(fileTypeFromFile(image.path)).resolves.toStrictEqual({
      ext: 'png',
      mime: 'image/png',
    });
  });

  it("don't transform if extension not specified", async ({
    onTestFinished,
  }) => {
    const image = parseImageParams(`${BASE_URL}/image.heic`);

    onTestFinished(async () => {
      await fs.promises.rm(image.path, { force: true });
    });

    await expect(download(image)).resolves.toStrictEqual(image);
    await expect(fileTypeFromFile(image.path)).resolves.toStrictEqual({
      ext: 'heic',
      mime: 'image/heic',
    });
  });

  it.each(['/root', '/restricted-dir'])(
    'throw error if directory cannot be created: `%s`',
    async (directory) => {
      const image = parseImageParams(`${BASE_URL}/image.jpg`, { directory });
      await expect(download(image)).rejects.toThrow(DirectoryError);
    },
  );

  it.for(['tmp', 'test/tmp'])(
    'create the directory if it does not exist: `%s`',
    async (directory, { onTestFinished }) => {
      // Prepare: ensure the directory does not exist
      await fs.promises.rm(directory, { recursive: true, force: true });

      onTestFinished(async () => {
        await fs.promises.rm(directory, { recursive: true, force: true });
      });

      const image = parseImageParams(`${BASE_URL}/image.jpg`, { directory });
      const { path: actualPath } = await download(image);

      await expect(fs.promises.access(directory)).resolves.toBeUndefined();
      await expect(fs.promises.access(actualPath)).resolves.toBeUndefined();
    },
  );

  it('throw error if the response is not image', async () => {
    // `GET /` will return a 200 OK response with `OK` body
    const image = parseImageParams(BASE_URL);
    await expect(download(image)).rejects.toThrow(RequestError);
  });

  it('throw error if the response is unsuccessful', async () => {
    // `GET /unknown` will return a 404 Not Found response
    const image = parseImageParams(`${BASE_URL}/unknown`);
    await expect(download(image)).rejects.toThrow(RequestError);
  });
});
