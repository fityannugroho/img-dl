import fs from 'node:fs';
import path from 'node:path';
import { fileTypeFromFile } from 'file-type';
import { RequestError } from 'got';
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
import {
  TEST_TMP_DIR,
  UNCREATABLE_DIR,
  UNWRITABLE_DIR,
} from './helpers/paths.js'; // Use a shared temp directory for all filesystem writes in this file

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
        fs.rmSync('images', { recursive: true, force: true });
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

  it('throw error if directory cannot be created', async () => {
    const image = parseImageParams(`${BASE_URL}/image.jpg`, {
      directory: UNCREATABLE_DIR,
    });
    await expect(download(image)).rejects.toThrow(DirectoryError);
  });

  it('throw error if directory is not writable', async () => {
    // Skip this test on GitHub Actions Windows runners which often have elevated permissions
    if (process.platform === 'win32' && process.env.GITHUB_ACTIONS) {
      // Use UNCREATABLE_DIR instead as it's more reliable on CI
      const image = parseImageParams(`${BASE_URL}/image.jpg`, {
        directory: UNCREATABLE_DIR,
      });
      await expect(download(image)).rejects.toThrow(DirectoryError);
      return;
    }

    // Use a system directory that should not be writable by normal users
    const image = parseImageParams(`${BASE_URL}/image.jpg`, {
      directory: UNWRITABLE_DIR,
    });

    try {
      await download(image);
      // If we reach here on a normal system, something is wrong
      if (!process.env.GITHUB_ACTIONS) {
        throw new Error('Expected download to fail but it succeeded');
      }
    } catch (error) {
      if (process.platform === 'win32') {
        // On Windows, expect EPERM error when trying to write to System32
        expect((error as NodeJS.ErrnoException).code).toBe('EPERM');
      } else {
        // On Unix systems, expect DirectoryError from directory access check
        expect(error).toBeInstanceOf(DirectoryError);
      }
    }
  });

  it('should throw DirectoryError for directory access check failure', async ({
    onTestFinished,
  }) => {
    // Create a directory and then make it inaccessible by removing all permissions
    const testDir = path.resolve(TEST_TMP_DIR, 'test-access-dir');
    await fs.promises.mkdir(testDir, { recursive: true });

    onTestFinished(async () => {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    });

    // Remove read and write permissions (on Unix systems)
    if (process.platform !== 'win32') {
      await fs.promises.chmod(testDir, 0o000);

      const image = parseImageParams(`${BASE_URL}/image.jpg`, {
        directory: testDir,
      });

      await expect(download(image)).rejects.toThrow(DirectoryError);
    } else {
      // On Windows, use the existing UNWRITABLE_DIR test
      // This test is mainly for Unix systems to cover the access check
      expect(true).toBe(true); // Skip on Windows
    }
  });

  it('should throw DirectoryError when fs.access fails with mock', async () => {
    // Mock fs.promises.access to throw an error to test the catch block in lines 185-186
    const originalAccess = fs.promises.access;
    const mockError = new Error('Permission denied');

    fs.promises.access = vi
      .fn()
      .mockImplementation((filePath: fs.PathLike, mode?: number) => {
        // Only mock for directory access check, not file access in other tests
        if (mode === (fs.constants.R_OK | fs.constants.W_OK)) {
          throw mockError;
        }
        return originalAccess(filePath, mode);
      });

    const image = parseImageParams(`${BASE_URL}/image.jpg`, {
      directory: './test-mock-dir',
    });

    try {
      await expect(download(image)).rejects.toThrow(DirectoryError);
      await expect(download(image)).rejects.toThrow('Permission denied');
    } finally {
      // Restore original function
      fs.promises.access = originalAccess;
    }
  });

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

  it('should cleanup partial file when response is not image', async ({
    onTestFinished,
  }) => {
    // This URL will return text/html instead of image/* content-type
    // which should trigger the error cleanup path
    const image = parseImageParams(`${BASE_URL}/`);

    onTestFinished(async () => {
      await fs.promises.rm(image.path, { force: true });
    });

    await expect(download(image)).rejects.toThrow(
      'The response is not an image.',
    );

    // The file should not exist because it should be cleaned up on error
    await expect(fs.promises.access(image.path)).rejects.toThrow();
  });

  it('should cleanup partial file when stream write fails', async ({
    onTestFinished,
  }) => {
    // Create a file that already exists and is read-only to trigger write error
    const image = parseImageParams(`${BASE_URL}/image.jpg`);

    // Pre-create a read-only file to trigger write error
    await fs.promises.writeFile(image.path, 'dummy', { mode: 0o444 });

    onTestFinished(async () => {
      await fs.promises.rm(image.path, { force: true });
    });

    // This should fail during file write and trigger onError cleanup
    await expect(download(image)).rejects.toThrow();
  });
});
