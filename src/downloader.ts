import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import sanitize from 'sanitize-filename';
import ArgumentError from './errors/ArgumentError.js';
import DirectoryError from './errors/DirectoryError.js';
import FetchError from './errors/FetchError.js';
import { DEFAULT_EXTENSION, DEFAULT_NAME, imageExtensions } from './constanta.js';

export type DownloadOptions = {
  /**
   * The directory to save the image to.
   *
   * If not provided, the current working directory will be used.
   */
  directory?: string;
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
   * The extension of the image.
   *
   * If not provided, the extension of the URL will be used.
   *
   * If the URL doesn't have an extension, `jpg` will be used.
   */
  extension?: string;
};

/**
 * Set the options with the default values if they are not provided.
 *
 * @throws {ArgumentError} If there is an invalid value.
 */
export function getDownloadOptions(url: string, options?: DownloadOptions) {
  let directory = options?.directory;

  if (!directory) {
    directory = process.cwd();
  }

  // Validate the directory path syntax and ensure it is a directory without a filename.
  const { base, name: nameFromPath } = path.parse(directory);
  if (base !== nameFromPath) {
    throw new ArgumentError('`directory` cannot contain filename');
  }

  const lowerImgExts = [...imageExtensions].map((ext) => ext.toLowerCase());
  const originalExt = path.extname(url).replace('.', '');
  const originalName = originalExt === '' ? undefined : path.basename(url, `.${originalExt}`);

  let name = '';

  if (typeof options?.name === 'function') {
    name = options.name(originalName);
  } else if (options?.name) {
    name = options.name;
  }

  if (sanitize(name) !== name) {
    throw new ArgumentError('Invalid `name` value');
  }

  const extInName = name.toLowerCase().split('.').pop();
  if (extInName && lowerImgExts.includes(extInName)) {
    throw new ArgumentError('`name` cannot contain image extension');
  }

  if (name.trim() === '') {
    name = originalName ?? DEFAULT_NAME;
  }

  let extension = '';

  if (options?.extension) {
    if (
      !lowerImgExts.includes(options.extension.toLowerCase())
      || options.extension.includes('.')
    ) {
      throw new ArgumentError('Invalid `extension` value');
    }
    extension = options.extension;
  }

  if (extension === '') {
    extension = lowerImgExts.includes(originalExt.toLowerCase()) ? originalExt : DEFAULT_EXTENSION;
  }

  return { directory, name, extension };
}

/**
 * Downloads an image from a URL.
 * @param url The URL of the image to download.
 * @param options The options to use.
 * @returns The file path.
 * @throws {DirectoryError} If the directory cannot be created.
 * @throws {FetchError} If the URL is invalid or the response is unsuccessful.
 */
export async function download(url: string, options: DownloadOptions = {}) {
  const { directory, name, extension } = getDownloadOptions(url, options);

  try {
    // Create the directory if it doesn't exist.
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('EACCES')) {
        throw new DirectoryError(`Permission denied to create '${directory}'`);
      }
      throw new DirectoryError(error.message);
    } else {
      throw new DirectoryError(`Failed to create '${directory}'`);
    }
  }

  let response: Response;

  try {
    response = await fetch(url);
  } catch (error) {
    if (error instanceof Error) {
      throw new FetchError(error.message);
    } else {
      throw new FetchError('Failed to fetch image');
    }
  }

  if (!response.ok) {
    throw new FetchError(`Unsuccessful response: ${response.status} ${response.statusText}`);
  }

  if (response.body === null) {
    throw new FetchError('Response body is null');
  }

  // Ensure the response is an image
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.startsWith('image/')) {
    throw new FetchError('The response is not an image.');
  }

  const filePath = path.join(directory, `${name}.${extension}`);
  try {
    await pipeline(response.body, fs.createWriteStream(filePath));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('EACCES')) {
        throw new DirectoryError(`Permission denied to save image in '${directory}'`);
      }
      throw new DirectoryError(error.message);
    } else {
      throw new DirectoryError(`Failed to save image in '${directory}'`);
    }
  }

  return filePath;
}
