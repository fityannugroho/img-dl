import PQueue from 'p-queue';
import { setMaxListeners } from 'node:events';
import { DEFAULT_INTERVAL, DEFAULT_STEP } from './constanta.js';
import {
  DownloadOptions,
  ImageOptions,
  download,
  parseImageParams,
} from './downloader.js';
import path from 'node:path';

export type Image = {
  /**
   * The URL of the image.
   */
  url: URL;
  /**
   * The name of the image file, without the extension.
   */
  name: string;
  /**
   * The extension of the image without the dot. Example: `jpg`.
   */
  extension: string;
  /**
   * The directory to save the image to. Can be relative or absolute.
   */
  directory: string;
  /**
   * The original name of the image file, without the extension.
   */
  originalName?: string;
  /**
   * The original extension of the image file, without the dot. Example: `jpg`.
   */
  originalExtension?: string;
  /**
   * The absolute path of the image, including the directory, name, and extension.
   */
  path: string;
};

export type Options = (ImageOptions & DownloadOptions) & {
  /**
   * Do something when an image is successfully downloaded.
   *
   * @param image The downloaded image.
   */
  onSuccess?: (image: Image) => void;
  /**
   * Do something when an image fails to download.
   *
   * @param error The error that caused the download to fail.
   * @param url The URL of the image that failed to download.
   */
  onError?: (error: Error, url: string) => void;
  /**
   * The number of requests to make at the same time.
   *
   * @default 5
   */
  step?: number;
  /**
   * The interval between each batch of requests in milliseconds.
   *
   * @default 100
   */
  interval?: number;
  /**
   * The signal which can be used to abort requests.
   */
  signal?: AbortSignal;
};

async function imgdl(url: string | string[], options?: Options): Promise<void> {
  const {
    directory,
    name,
    extension,
    onSuccess,
    onError,
    step,
    interval,
    ...downloadOptions
  } = options ?? {};

  const urls = Array.isArray(url) ? url : [url];
  const queue = new PQueue({
    concurrency: step ?? DEFAULT_STEP,
    interval: interval ?? DEFAULT_INTERVAL,
    intervalCap: step ?? DEFAULT_STEP,
  });

  // Set max listeners to infinity to prevent memory leak warning
  if (downloadOptions?.signal) {
    setMaxListeners(Infinity, downloadOptions.signal);
  }

  const countNames = new Map<string, number>();

  urls.forEach(async (_url) => {
    const img = parseImageParams(_url, { directory, name, extension });

    // Make sure the name is unique
    const nameKey = `${img.name}.${img.extension}`;
    const count = countNames.get(nameKey);
    if (count) {
      img.name = `${img.name} (${count})`;
      img.path = path.resolve(img.directory, `${img.name}.${img.extension}`);
    }
    countNames.set(nameKey, (count || 0) + 1);

    // Add the download task to queue
    try {
      const image = await queue.add(
        ({ signal }) => download(img, { ...downloadOptions, signal }),
        { signal: downloadOptions?.signal },
      );

      if (image) {
        onSuccess?.(image);
      }
    } catch (error) {
      onError?.(
        error instanceof Error
          ? error
          : new Error('Unknown error', { cause: error }),
        _url,
      );
    }
  });

  await queue.onIdle();
}

export default imgdl;
