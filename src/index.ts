import PQueue from 'p-queue';
import { setMaxListeners } from 'node:events';
import { CancelError } from 'got';
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
  url: string;
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
   * Do something when the image is successfully downloaded.
   * For example, counting the number of successful downloads.
   *
   * Only called when downloading multiple images.
   *
   * @param image The downloaded image.
   */
  onSuccess?: (image: Image) => void;
  /**
   * Do something when the image download failed.
   * For example, counting the number of failed downloads.
   *
   * Only called when downloading multiple images.
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

async function imgdl(url: string, options?: Options): Promise<Image>;
async function imgdl(url: string[], options?: Options): Promise<Image[]>;
async function imgdl(
  url: string | string[],
  options?: Options,
): Promise<Image | Image[]>;
async function imgdl(
  url: string | string[],
  options?: Options,
): Promise<Image | Image[]> {
  if (Array.isArray(url)) {
    const queue = new PQueue({
      concurrency: options?.step ?? DEFAULT_STEP,
      interval: options?.interval ?? DEFAULT_INTERVAL,
      intervalCap: options?.step ?? DEFAULT_STEP,
    });

    // Set max listeners to infinity to prevent memory leak warning
    if (options?.signal) {
      setMaxListeners(Infinity, options.signal);
    }

    return new Promise<Image[]>((resolve, reject) => {
      const images: Image[] = [];
      const countNames = new Map<string, number>();

      url.forEach((u) => {
        const img = parseImageParams(u, options);

        // Make sure the name is unique
        const nameKey = `${img.name}.${img.extension}`;
        const count = countNames.get(nameKey);
        if (count) {
          img.name = `${img.name} (${count})`;
          img.path = path.resolve(
            img.directory,
            `${img.name}.${img.extension}`,
          );
        }
        countNames.set(nameKey, (count || 0) + 1);

        // Add the download task to queue
        queue
          .add(
            async ({ signal }) => {
              try {
                return await download(img, {
                  ...options,
                  signal,
                });
              } catch (error) {
                if (error instanceof Error) {
                  options?.onError?.(error, u);
                  return undefined;
                }
                throw error;
              }
            },
            { signal: options?.signal },
          )
          .then((image) => {
            if (image) {
              options?.onSuccess?.(image);
              images.push(image);
            }
          })
          .catch((error) => {
            if (!(error instanceof CancelError)) {
              reject(error);
            }
          });
      });

      // Resolve/reject when all task is finished
      queue
        .onIdle()
        .then(() => {
          resolve(images);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  return download(parseImageParams(url, options), {
    ...options,
    signal: options?.signal,
  });
}

export default imgdl;
