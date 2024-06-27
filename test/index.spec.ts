import fs from 'node:fs/promises';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import imgdl, { Options } from '~/index.js';
import { server } from './fixtures/mocks/node.js';
import { BASE_URL } from './fixtures/mocks/handlers.js';
import * as downloader from '~/downloader.js';
import path from 'node:path';

type OnError = Exclude<Options['onError'], undefined>;

describe('`imgdl`', () => {
  /**
   * The directory to save the downloaded images.
   */
  const directory = 'test/tmp';

  beforeAll(() => server.listen());

  afterEach(async () => {
    server.resetHandlers();

    // Clean up downloaded images
    await fs.rm(directory, { force: true, recursive: true });
  });

  afterAll(() => server.close());

  it('should download an image if single URL is provided', async () => {
    const url = `${BASE_URL}/image.jpg`;
    const image = await imgdl(url, { directory });

    expect(image).toStrictEqual({
      url,
      name: 'image',
      extension: 'jpg',
      directory,
      originalName: 'image',
      originalExtension: 'jpg',
      path: path.resolve(directory, 'image.jpg'),
    });
    await expect(fs.access(image.path)).resolves.not.toThrow();
  });

  it('should download an image if single URL is provided with options', async () => {
    const parseImageParamsSpy = vi.spyOn(downloader, 'parseImageParams');
    const url = `${BASE_URL}/image.jpg`;
    const options = {
      directory: directory + '/images',
      extension: 'png',
      name: 'myimage',
    };
    const image = await imgdl(url, options);

    expect(parseImageParamsSpy).toHaveBeenCalledOnce();
    expect(parseImageParamsSpy).toHaveBeenCalledWith(url, options);
    expect(image).toStrictEqual({
      ...options,
      url,
      originalName: 'image',
      originalExtension: 'jpg',
      path: path.resolve(options.directory, 'myimage.png'),
    });
    await expect(fs.access(image.path)).resolves.not.toThrow();
  });

  // Update the `imgdl` function first before activate this test!
  it.todo(
    'should not throw any error if URL is invalid, call onError instead',
    async () => {
      const url = `${BASE_URL}/unknown`;
      const onError = vi.fn<Parameters<OnError>>();

      await expect(imgdl(url, { onError })).resolves.not.toThrow();
      expect(onError).toHaveBeenCalledTimes(1);
    },
  );

  it('should download multiple images if array of URLs is provided', async () => {
    const urls = [`${BASE_URL}/img-1.jpg`, `${BASE_URL}/img-2.jpg`];
    const downloadSpy = vi.spyOn(downloader, 'download');
    const onError = vi
      .fn<Parameters<OnError>>()
      .mockImplementation((err, url) => console.error(url, err.message));

    const images = await imgdl(urls, { directory, onError });

    expect(downloadSpy).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(0);
    expect(images).is.an('array').and.toHaveLength(2);

    images.forEach(async (img, i) => {
      expect(img).toStrictEqual({
        url: urls[i],
        originalName: `img-${i + 1}`,
        originalExtension: 'jpg',
        directory,
        name: `img-${i + 1}`,
        extension: 'jpg',
        path: path.resolve(directory, `img-${i + 1}.jpg`),
      });
      await expect(fs.access(img.path)).resolves.not.toThrow();
    });
  });

  it('should not throw any error if one of the URLs is invalid, call onError instead', async () => {
    const urls = [`${BASE_URL}/img-1.jpg`, `${BASE_URL}/unknown`];
    const onError = vi.fn<Parameters<OnError>>();

    await expect(imgdl(urls, { directory, onError })).resolves.toHaveLength(1);
    expect(onError).toHaveBeenCalledTimes(1);

    // The first image should be downloaded
    await expect(
      fs.access(path.resolve(directory, 'img-1.jpg')),
    ).resolves.not.toThrow();
  });

  it('should download multiple images if array of URLs is provided with options', async () => {
    const urls = [`${BASE_URL}/img-1.jpg`, `${BASE_URL}/img-2.jpg`];
    const parseImageParamsSpy = vi.spyOn(downloader, 'parseImageParams');
    const onError = vi
      .fn<Parameters<OnError>>()
      .mockImplementation((err, url) => console.error(url, err.message));
    const onSuccess = vi.fn();
    const options = {
      directory,
      extension: 'png',
      name: 'myimage',
      onError,
      onSuccess,
    };
    const images = await imgdl(urls, options);

    expect(parseImageParamsSpy).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(0);
    expect(onSuccess).toHaveBeenCalledTimes(2);
    expect(images).is.an('array').and.toHaveLength(2);

    images.forEach(async (img, i) => {
      expect(parseImageParamsSpy).toHaveBeenCalledWith(urls[i], options);

      const name = `${options.name}${i === 0 ? '' : ` (${i})`}`;
      expect(img).toStrictEqual({
        url: urls[i],
        originalName: `img-${i + 1}`,
        originalExtension: 'jpg',
        directory,
        name,
        extension: options.extension,
        path: path.resolve(directory, `${name}.png`),
      });
      await expect(fs.access(img.path)).resolves.not.toThrow();
    });
  });

  it('should abort download if signal is aborted', async () => {
    // 30 images
    const urls = Array.from(
      { length: 30 },
      (_, i) => `${BASE_URL}/img-${i}.jpg`,
    );
    const controller = new AbortController();

    // Abort after 100ms
    setTimeout(() => controller.abort(), 100);

    await expect(
      imgdl(urls, { directory, signal: controller.signal }),
    ).rejects.toThrow(/aborted/);

    // First image should be downloaded
    await expect(
      fs.access(path.resolve(directory, 'img-0.jpg')),
    ).resolves.not.toThrow();

    // The last image should not be downloaded
    await expect(
      fs.access(path.resolve(directory, 'img-30.jpg')),
    ).rejects.toThrow();
  });
});
