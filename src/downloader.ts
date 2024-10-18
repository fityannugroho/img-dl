import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import got, { PlainResponse } from 'got';
import sanitize from 'sanitize-filename';
import sharp, { FormatEnum } from 'sharp';
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
 * Supported image extensions by `sharp`.
 */
const sharpExtensions = new Set([...Object.keys(sharp.format), 'jpg']);

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

  const originalExt = path
    .extname(validUrl.pathname)
    .replace('.', '')
    .toLowerCase();

  // Ensure the original extension is supported
  if (originalExt.length && !imageExtensions.has(originalExt)) {
    throw new ArgumentError('The URL is not a valid image URL');
  }

  const img: Image = {
    url: validUrl,
    name: '',
    extension: '',
    directory: path.resolve(options?.directory || '.'),
    originalName:
      originalExt === ''
        ? undefined
        : path.basename(validUrl.pathname, `.${originalExt}`),
    originalExtension: originalExt === '' ? undefined : originalExt,
    path: '',
  };

  // Set name
  if (options?.name) {
    img.name = options.name;
  }

  if (sanitize(img.name) !== img.name) {
    throw new ArgumentError('Invalid `name` value');
  }

  if (img.name.trim() === '') {
    img.name = img.originalName || DEFAULT_NAME;
  }

  // Set extension
  if (options?.extension) {
    options.extension = options.extension.toLowerCase();

    // Ensure the extension is supported by sharp
    if (!sharpExtensions.has(options.extension)) {
      throw new ArgumentError('Unsupported image extension');
    }

    img.extension = options.extension;
  }

  if (img.extension === '') {
    img.extension = img.originalExtension || DEFAULT_EXTENSION;
  }

  // Make sure the path is unique, if not, add a number to the end of the name.
  while (
    fs.existsSync(path.join(img.directory, `${img.name}.${img.extension}`))
  ) {
    const match = img.name.match(/ \((\d+)\)$/);
    const num = match ? parseInt(match[1], 10) + 1 : 1;
    img.name = img.name.replace(/ \(\d+\)$/, '') + ` (${num})`;
  }

  // Set path
  img.path = path.join(img.directory, `${img.name}.${img.extension}`);

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
  // Check if the directory exists and create it if it doesn't
  try {
    await fs.promises.access(img.directory);
  } catch (error) {
    try {
      await fs.promises.mkdir(img.directory, { recursive: true });
    } catch (error) {
      throw new DirectoryError((error as Error).message);
    }
  }

  // Check if the directory is unrestricted
  try {
    await fs.promises.access(
      img.directory,
      fs.constants.R_OK | fs.constants.W_OK,
    );
  } catch (error) {
    throw new DirectoryError((error as Error).message);
  }

  const fetchStream = got.stream(img.url, {
    timeout: { request: options.timeout },
    retry: { limit: options.maxRetry },
    headers: options.headers,
    signal: options.signal,
  });

  const writeStream = fs.createWriteStream(img.path);

  return await new Promise<Image>((resolve, reject) => {
    const onError = async (error: unknown) => {
      // Clean up partially downloaded files if an error occurs
      await fs.promises.rm(img.path, { force: true });
      reject(error);
    };

    fetchStream.on('response', (res: PlainResponse) => {
      // Ensure the response is an image
      if (!res.headers['content-type']?.startsWith('image/')) {
        fetchStream.destroy(new Error('The response is not an image.'));
        return;
      }

      // Prevent `onError` being called twice.
      fetchStream.off('error', onError);

      let pipePromise: Promise<void>;

      // Transform the image if the extension is specified by the user
      if (img.extension !== img.originalExtension) {
        const transformStream = sharp()
          .toFormat(img.extension.replace('jpg', 'jpeg') as keyof FormatEnum)
          .withMetadata();

        pipePromise = pipeline(fetchStream, transformStream, writeStream);
      } else {
        pipePromise = pipeline(fetchStream, writeStream);
      }

      // Return the image data.
      pipePromise.then(() => resolve(img)).catch(onError);
    });

    fetchStream.once('error', onError);
  });
}
