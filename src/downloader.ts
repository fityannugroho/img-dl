import got, { PlainResponse } from 'got';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import sanitize from 'sanitize-filename';
import {
  DEFAULT_EXTENSION,
  DEFAULT_NAME,
  imageExtensions,
} from './constanta.js';
import ArgumentError from './errors/ArgumentError.js';
import DirectoryError from './errors/DirectoryError.js';
import { Image } from './index.js';

export type DownloadOptions = {
  /**
   * The directory to save the image to.
   *
   * If not provided, the current working directory will be used.
   */
  directory?: string;
  /**
   * The headers to send with the request.
   */
  headers?: Record<string, string | string[] | undefined>;
  /**
   * The name of the image file.
   *
   * You also can provide a function that returns the name.
   * The function will be called with the original name, if it exists in the URL.
   *
   * The default value will be used if this value (or the function) returns an empty string.
   *
   * The default value will be the **original name** if it exists in the URL.
   * Otherwise, it will be **'image'**.
   */
  name?: string | ((original?: string) => string);
  /**
   * Set the maximum number of times to retry the request if it fails.
   *
   * @default 2
   */
  maxRetry?: number;
  /**
   * The extension of the image.
   *
   * If not provided, the extension of the URL will be used.
   *
   * If the URL doesn't have an extension, `jpg` will be used.
   */
  extension?: string;
  /**
   * Set timeout for each request in milliseconds.
   */
  timeout?: number;
  /**
   * The signal which can be used to abort requests.
   */
  signal?: AbortSignal;
};

/**
 * Set the options with the default values if they are not provided.
 *
 * @throws {ArgumentError} If there is an invalid value.
 */
export function parseImageParams(url: string, options?: DownloadOptions) {
  const lowerImgExts = [...imageExtensions].map((ext) => ext.toLowerCase());
  const originalExt = path.extname(url).replace('.', '');
  const img: Image = {
    url,
    name: '',
    extension: '',
    directory: options?.directory
      ? path.normalize(options.directory)
      : process.cwd(),
    originalName:
      originalExt === '' ? undefined : path.basename(url, `.${originalExt}`),
    originalExtension: originalExt === '' ? undefined : originalExt,
    path: '',
  };

  // Validate the directory path syntax and ensure it is a directory without a filename.
  const { base, name: nameFromPath } = path.parse(img.directory);
  if (base !== nameFromPath) {
    throw new ArgumentError('`directory` cannot contain filename');
  }

  // Set name
  if (typeof options?.name === 'function') {
    img.name = options.name(img.originalName);
  } else if (options?.name) {
    img.name = options.name;
  }

  if (sanitize(img.name) !== img.name) {
    throw new ArgumentError('Invalid `name` value');
  }

  const extInName = img.name.toLowerCase().split('.').pop();
  if (extInName && lowerImgExts.includes(extInName)) {
    throw new ArgumentError('`name` cannot contain image extension');
  }

  if (img.name.trim() === '') {
    img.name = img.originalName ?? DEFAULT_NAME;
  }

  // Set extension
  if (options?.extension) {
    if (
      !lowerImgExts.includes(options.extension.toLowerCase()) ||
      options.extension.includes('.')
    ) {
      throw new ArgumentError('Invalid `extension` value');
    }
    img.extension = options.extension;
  }

  if (img.extension === '') {
    img.extension = lowerImgExts.includes(originalExt.toLowerCase())
      ? originalExt
      : DEFAULT_EXTENSION;
  }

  // Set path
  img.path = path.resolve(img.directory, `${img.name}.${img.extension}`);

  return img;
}

/**
 * Downloads an image from a URL.
 * @param url The URL of the image to download.
 * @param options The options to use.
 * @returns The file path.
 * @throws {DirectoryError} If the directory cannot be created.
 * @throws {Error} If there are any other errors.
 */
export async function download(url: string, options: DownloadOptions = {}) {
  const img = parseImageParams(url, options);

  // Create the directory if it doesn't exist.
  if (!fs.existsSync(img.directory)) {
    try {
      fs.mkdirSync(img.directory, { recursive: true });
    } catch (error) {
      if (error instanceof Error) {
        throw new DirectoryError(error.message);
      }
      throw new DirectoryError(`Failed to create '${img.directory}'`);
    }
  }

  return new Promise<Image>((resolve, reject) => {
    const fetchStream = got.stream(img.url, {
      timeout: {
        request: options.timeout,
      },
      retry: {
        limit: options.maxRetry,
      },
      headers: options.headers,
      signal: options.signal,
    });

    const onError = (error: unknown) => {
      reject(error);
    };

    fetchStream.on('response', (res: PlainResponse) => {
      // Ensure the response is an image
      const contentType = res.headers['content-type'];
      if (!contentType || !contentType.startsWith('image/')) {
        fetchStream.destroy(new Error('The response is not an image.'));
        return;
      }

      // Prevent `onError` being called twice.
      fetchStream.off('error', onError);

      pipeline(fetchStream, fs.createWriteStream(img.path))
        .then(() => {
          resolve(img);
        }) // Return the image data.
        .catch((error) => {
          onError(error);
        });
    });

    fetchStream.once('error', onError);
  });
}
