import { setMaxListeners } from 'node:events';
import path from 'node:path';
import PQueue from 'p-queue';
import { DEFAULT_INTERVAL, DEFAULT_STEP } from './constanta.js';
import {
  DownloadOptions,
  download,
  ImageOptions,
  parseImageParams,
} from './downloader.js';
import { firstFreeIndex, numberedName } from './utils.js';

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
   * The path of the directory where the image is saved.
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

async function imgdl(
  url: string | (string | ({ url: string } & ImageOptions))[],
  options?: Options,
): Promise<void> {
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
    setMaxListeners(Number.POSITIVE_INFINITY, downloadOptions.signal);
  }

  const countNames = new Map<string, number>();
  const firstFreeCache = new Map<string, number>();

  for (const _url of urls) {
    // Get image URL and options
    const { url: imgUrl, ...imgOptions } =
      typeof _url === 'string' ? { url: _url } : _url;

    try {
      // Validate and parse the image parameters (no disk scan inside anymore)
      const parsed = parseImageParams(imgUrl, {
        directory: imgOptions.directory || directory,
        name: imgOptions.name || name,
        extension: imgOptions.extension || extension,
      });

      // Batch-scoped, concurrency-safe unique naming:
      // names are assigned synchronously before any download worker starts.
      const nameKey = `${parsed.directory}/${parsed.name}.${parsed.extension}`;
      const start =
        firstFreeCache.get(nameKey) ??
        firstFreeIndex(parsed.directory, parsed.name, parsed.extension);
      firstFreeCache.set(nameKey, start);
      const batchCount = countNames.get(nameKey) || 0;
      countNames.set(nameKey, batchCount + 1);

      const img: Image = {
        ...parsed,
        name: numberedName(parsed.name, start + batchCount),
      };
      img.path = path.resolve(img.directory, `${img.name}.${img.extension}`);

      // Enqueue without awaiting: let the queue run `step` downloads at once.
      void queue
        .add(({ signal }) => download(img, { ...downloadOptions, signal }), {
          signal: downloadOptions?.signal,
        })
        .then((image) => {
          if (image) {
            onSuccess?.(image);
          }
        })
        .catch((error) => {
          onError?.(error as Error, imgUrl);
        });
    } catch (error) {
      onError?.(error as Error, imgUrl);
    }
  }

  await queue.onIdle();
}

export default imgdl;
export { DownloadOptions, ImageOptions };
