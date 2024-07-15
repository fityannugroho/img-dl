/* eslint-disable @typescript-eslint/no-non-null-assertion */
import fs from 'node:fs/promises';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from 'vitest';
import imgdl, { Image } from '~/index.js';
import { server } from './fixtures/mocks/node.js';
import { BASE_URL } from './fixtures/mocks/handlers.js';
import * as downloader from '~/downloader.js';
import path from 'node:path';
import DirectoryError from '~/errors/DirectoryError.js';

describe('`imgdl`', () => {
  /**
   * The directory to save the downloaded images.
   */
  const directory = 'test/tmp';

  beforeAll(() => server.listen());

  afterEach(() => server.resetHandlers());

  afterAll(() => server.close());

  it('should download an image if single URL is provided', async () => {
    const url = `${BASE_URL}/image.jpg`;
    let image: Image | undefined;
    const onSuccess = vi.fn().mockImplementation((img) => {
      image = img;
    });

    onTestFinished(async () => {
      await fs.rm(image!.path, { force: true });
    });

    await expect(imgdl(url, { onSuccess })).resolves.toBeUndefined();
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(image).toStrictEqual({
      url: new URL(url),
      name: 'image',
      extension: 'jpg',
      directory: process.cwd(),
      originalName: 'image',
      originalExtension: 'jpg',
      path: path.resolve('image.jpg'),
    });
    await expect(fs.access(image!.path)).resolves.toBeUndefined();
  });

  it('should download an image with specific image options', async () => {
    const parseImageParamsSpy = vi.spyOn(downloader, 'parseImageParams');
    const url = `${BASE_URL}/image.jpg`;
    const imageOptions = {
      directory: 'test/tmp/images',
      extension: 'png',
      name: 'myimage',
    };

    const image = await new Promise<Image>((resolve, rejects) => {
      imgdl(url, { ...imageOptions, onSuccess: resolve, onError: rejects });
    });

    onTestFinished(async () => {
      await fs.rm(image.path, { force: true });
    });

    expect(parseImageParamsSpy).toHaveBeenCalledOnce();
    expect(parseImageParamsSpy).toHaveBeenCalledWith(url, imageOptions);
    expect(image).toStrictEqual({
      ...imageOptions,
      url: new URL(url),
      originalName: 'image',
      originalExtension: 'jpg',
      path: path.resolve(
        imageOptions.directory,
        `${imageOptions.name}.${imageOptions.extension}`,
      ),
    });
    await expect(fs.access(image.path)).resolves.toBeUndefined();
  });

  it('should not throw error if directory cannot be created', async () => {
    let error: Error | undefined;

    await expect(
      imgdl(`${BASE_URL}/image.jpg`, {
        directory: '/restricted-dir',
        onError: (err) => {
          error = err;
        },
      }),
    ).resolves.toBeUndefined();
    expect(error).toBeInstanceOf(DirectoryError);
  });

  it('should not throw any error if URL is invalid', async () => {
    const url = `${BASE_URL}/unknown`;
    const onSuccess = vi.fn();
    const onError = vi.fn();

    await expect(imgdl(url, { onSuccess, onError })).resolves.toBeUndefined();
    expect(onSuccess).toHaveBeenCalledTimes(0);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('should download multiple images if array of URLs is provided', async () => {
    const urls = [`${BASE_URL}/img-1.jpg`, `${BASE_URL}/img-2.jpg`];
    const downloadSpy = vi.spyOn(downloader, 'download');
    const images: Image[] = [];
    const onSuccess = vi.fn().mockImplementation((image) => images.push(image));
    const onError = vi.fn();

    onTestFinished(async () => {
      for (const img of images) {
        await fs.rm(img.path, { force: true });
      }
    });

    await imgdl(urls, { onSuccess, onError });

    expect(downloadSpy).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(0);
    expect(images).is.an('array').and.toHaveLength(2);

    for (const [i, img] of images.entries()) {
      expect(img).toStrictEqual({
        url: new URL(urls[i]),
        originalName: `img-${i + 1}`,
        originalExtension: 'jpg',
        directory: process.cwd(),
        name: `img-${i + 1}`,
        extension: 'jpg',
        path: path.resolve(`img-${i + 1}.jpg`),
      });
      await expect(fs.access(img.path)).resolves.toBeUndefined();
    }
  });

  it('should not throw any error if one of the URLs is invalid, call onError instead', async () => {
    const urls = [`${BASE_URL}/img-1.jpg`, `${BASE_URL}/unknown`];
    const images: Image[] = [];
    const onSuccess = vi.fn().mockImplementation((image) => images.push(image));
    const onError = vi.fn();

    onTestFinished(async () => {
      await fs.rm(images[0].path, { force: true });
    });

    await imgdl(urls, { onSuccess, onError });

    expect(images).toHaveLength(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);

    expect(images).toStrictEqual([
      {
        url: new URL(urls[0]),
        originalName: 'img-1',
        originalExtension: 'jpg',
        directory: process.cwd(),
        name: 'img-1',
        extension: 'jpg',
        path: path.resolve('img-1.jpg'),
      },
    ]);

    // The first image should be downloaded
    await expect(fs.access(images[0].path)).resolves.toBeUndefined();
  });

  it('should download multiple images if array of URLs is provided with options', async () => {
    const urls = [`${BASE_URL}/img-1.jpg`, `${BASE_URL}/img-2.jpg`];
    const parseImageParamsSpy = vi.spyOn(downloader, 'parseImageParams');
    const images: Image[] = [];
    const onSuccess = vi.fn().mockImplementation((image) => images.push(image));
    const onError = vi.fn();
    const imageOptions = { directory, extension: 'png', name: 'myimage' };

    onTestFinished(async () => {
      for (const img of images) {
        await fs.rm(img.path, { force: true });
      }
    });

    await imgdl(urls, { ...imageOptions, onError, onSuccess });

    expect(parseImageParamsSpy).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(0);
    expect(onSuccess).toHaveBeenCalledTimes(2);
    expect(images).is.an('array').and.toHaveLength(2);

    for (const [i, img] of images.entries()) {
      expect(parseImageParamsSpy).toHaveBeenCalledWith(urls[i], imageOptions);

      const name = `${imageOptions.name}${i === 0 ? '' : ` (${i})`}`;
      expect(img).toStrictEqual({
        url: new URL(urls[i]),
        originalName: `img-${i + 1}`,
        originalExtension: 'jpg',
        directory,
        name,
        extension: imageOptions.extension,
        path: path.resolve(directory, `${name}.png`),
      });
      await expect(fs.access(img.path)).resolves.toBeUndefined();
    }
  });

  it('should abort download if signal is aborted', async () => {
    const dir = directory + '/abort-test';

    onTestFinished(async () => {
      await fs.rm(path.resolve(dir), { recursive: true, force: true });
    });

    // 30 images
    const urls = Array.from(
      { length: 30 },
      (_, i) => `${BASE_URL}/img-${i}.jpg`,
    );

    let countSuccess = 0,
      countError = 0;
    const onSuccess = vi.fn().mockImplementation(() => (countSuccess += 1));
    const onError = vi.fn().mockImplementation(() => (countError += 1));

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 100); // Abort after 100ms

    await imgdl(urls, {
      directory: dir,
      onSuccess,
      onError,
      signal: controller.signal,
    });

    expect(countSuccess).toBeGreaterThan(1);
    expect(countError).toBeGreaterThan(1);

    // First image should be downloaded
    await expect(
      fs.access(path.resolve(dir, 'img-0.jpg')),
    ).resolves.toBeUndefined();

    // The last image should not be downloaded
    await expect(fs.access(path.resolve(dir, 'img-30.jpg'))).rejects.toThrow();
  });
});
