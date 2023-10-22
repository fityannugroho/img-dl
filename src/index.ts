import { DEFAULT_NAME } from './constanta.js';
import { DownloadOptions, download } from './downloader.js';

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
   * When downloading multiple images, we will add `-${index}` as the suffix starting from 1.
   */
  name?: string;
};

export default function imgdl(url: string | string[], options?: Options) {
  if (Array.isArray(url)) {
    return Promise.all(url.map((u, i) => download(u, {
      ...options,
      name: (ori) => `${options?.name ?? ori ?? DEFAULT_NAME}-${i + 1}`,
    })));
  }

  return download(url, options);
}
