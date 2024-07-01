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

export type ImageOptions = {
  /**
   * The directory to save the image to.
   *
   * If not provided, the current working directory will be used.
   */
  directory?: string;
  /**
   * The name of the image file.
   *
   * If not provided, the default value will be the **original name** if it exists in the URL.
   *
   * Otherwise, it will be **'image'**.
   *
   * If a name with same extension already exists, ` (1)`, ` (2)`, etc. will be added to the end of the name.
   */
  name?: string;
  /**
   * The extension of the image.
   *
   * If not provided, the extension of the URL will be used.
   *
   * If the URL doesn't have an extension, `jpg` will be used.
   */
  extension?: string;
};

export type DownloadOptions = {
  /**
   * The headers to send with the request.
   */
  headers?: Record<string, string | string[] | undefined>;
  /**
   * Set the maximum number of times to retry the request if it fails.
   *
   * @default 2
   */
  maxRetry?: number;
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
 * Parses and validates the image parameters.
 *
 * If image options are not provided, the default values will be used.
 *
 * See {@link ImageOptions} for more information.
 *
 * @throws {ArgumentError} If there is an invalid value.
 */
export function parseImageParams(url: string, options?: ImageOptions) {
  let validUrl: URL;

  try {
    validUrl = new URL(url);
  } catch (error) {
    throw new ArgumentError('Invalid URL');
  }

  if (!['http:', 'https:'].includes(validUrl.protocol)) {
    throw new ArgumentError('URL protocol must be http or https');
  }

  const lowerImgExts = [...imageExtensions].map((ext) => ext.toLowerCase());
  const originalExt = path.extname(url).replace('.', '');
  const img: Image = {
    url: validUrl,
    name: '',
    extension: '',
    directory: options?.directory
      ? path.normalize(options.directory)
      : process.cwd(),
    originalName:
      originalExt === ''
        ? undefined
        : path.basename(validUrl.pathname, `.${originalExt}`),
    originalExtension: originalExt === '' ? undefined : originalExt,
    path: '',
  };

  // Validate the directory path syntax and ensure it is a directory without a filename.
  const { base, name: nameFromPath } = path.parse(img.directory);
  if (base !== nameFromPath) {
    throw new ArgumentError('`directory` cannot contain filename');
  }

  // Set name
  if (options?.name) {
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

  // Make sure the path is unique, if not, add a number to the end of the name.
  while (
    fs.existsSync(path.resolve(img.directory, `${img.name}.${img.extension}`))
  ) {
    const match = img.name.match(/ \((\d+)\)$/);
    const num = match ? parseInt(match[1], 10) + 1 : 1;
    img.name = img.name.replace(/ \(\d+\)$/, '') + ` (${num})`;
  }

  // Set path
  img.path = path.resolve(img.directory, `${img.name}.${img.extension}`);

  return img;
}

/**
 * Downloads an image.
 * @param img The validated image parameters. See {@link parseImageParams}.
 * @param options The download options.
 * @returns The file path.
 * @throws {DirectoryError} If the directory cannot be created.
 * @throws {Error} If there are any other errors.
 */
export async function download(img: Image, options: DownloadOptions = {}) {
  // Create the directory if it doesn't exist.
  if (!fs.existsSync(img.directory)) {
    try {
      fs.mkdirSync(img.directory, { recursive: true });
    } catch (error) {
      throw new DirectoryError(
        (error as Error)?.message ?? `Failed to create '${img.directory}'`,
      );
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
        .then(() => resolve(img)) // Return the image data.
        .catch(onError);
    });

    fetchStream.once('error', onError);
  });
}
