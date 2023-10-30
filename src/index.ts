import PQueue from 'p-queue';
import { DEFAULT_INTERVAL, DEFAULT_NAME, DEFAULT_STEP } from './constanta.js';
import { DownloadOptions, download } from './downloader.js';

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

export type Options = Omit<DownloadOptions, 'name'> & {
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
   *
   * When downloading multiple images, `-index` will be appended to the end of the name (suffix).
   * `index` will start from 1.
   */
  name?: string;
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
   * The length of time in milliseconds before the next request is made.
   *
   * @default 100
   */
  interval?: number;
};

async function imgdl(url: string, options?: Options): Promise<Image>;
async function imgdl(url: string[], options?: Options): Promise<Image[]>;
async function imgdl(url: string | string[], options?: Options): Promise<Image | Image[]>;
async function imgdl(url: string | string[], options?: Options): Promise<Image | Image[]> {
  if (Array.isArray(url)) {
    const queue = new PQueue({
      concurrency: options?.step ?? DEFAULT_STEP,
      interval: options?.interval ?? DEFAULT_INTERVAL,
      intervalCap: options?.step ?? DEFAULT_STEP,
    });

    const promises = url.map((u, i) => queue.add(() => download(u, {
      ...options,
      name: (ori) => `${options?.name ?? ori ?? DEFAULT_NAME}-${i + 1}`,
    }).then((image) => {
      options?.onSuccess?.(image);
      return image;
    }).catch((error) => {
      if (error instanceof Error) {
        options?.onError?.(error, u);
      }
    })));

    return (await Promise.all(promises)).filter((img): img is Image => img !== undefined);
  }

  return download(url, options);
}

export default imgdl;
