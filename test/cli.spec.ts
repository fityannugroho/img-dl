import fs from 'node:fs/promises';
import chalk from 'chalk';
import { $ } from 'execa';
import got from 'got';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import ArgumentError from '~/errors/ArgumentError.js';
import { generateDownloadUrls } from '~/utils.js';

describe('generateDownloadUrls', () => {
  it('return the same URLs if increment flag is not set', () => {
    const urls = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ];
    const flags = {};

    expect(generateDownloadUrls(urls, flags)).toEqual(urls);
  });

  it('throw error if multiple URLs are provided', () => {
    const urls = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ];
    const flags = { increment: true };

    expect(() => generateDownloadUrls(urls, flags)).toThrow(ArgumentError);
  });

  it('throw error if URL does not contain {i} placeholder', () => {
    const urls = ['https://example.com/image.jpg'];
    const flags = { increment: true };

    expect(() => generateDownloadUrls(urls, flags)).toThrow(ArgumentError);
  });

  it('throw error if start is less than 0', () => {
    const urls = ['https://example.com/image{i}.jpg'];
    const flags = { increment: true, start: -1 };

    expect(() => generateDownloadUrls(urls, flags)).toThrow(ArgumentError);
  });

  it('throw error if start is greater than end', () => {
    const urls = ['https://example.com/image{i}.jpg'];
    const flags = { increment: true, start: 5, end: 3 };

    expect(() => generateDownloadUrls(urls, flags)).toThrow(ArgumentError);
  });

  it('returns a list of generated URLs', () => {
    const urls = ['https://example.com/image{i}.jpg'];
    const flags = { increment: true, start: 1, end: 3 };

    expect(generateDownloadUrls(urls, flags)).toEqual([
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg',
    ]);
  });
});

describe('cli', async () => {
  /**
   * The build folder for the test
   */
  const dist = 'test/dist';
  /**
   * A valid URL for testing.
   */
  const testUrl = 'https://picsum.photos/200/300.jpg';

  // Check connection to the image server
  let unconnected = true;
  try {
    console.log('Checking connection...');

    const res = await got(testUrl, {
      retry: { limit: 0 },
    });

    if (res.statusCode !== 200) {
      throw new Error('Status code is not 200');
    }

    unconnected = false;
    console.log(chalk.green('Connection is OK'));
  } catch {
    console.log(
      chalk.yellow('No connection to the image server. Skipping some tests!'),
    );
  }

  beforeAll(async () => {
    await $`tsup src/cli.ts --format esm -d ${dist} --clean`;
  });

  afterAll(async () => {
    await fs.rm(dist, { recursive: true });
  });

  it('should show the version', async () => {
    const { exitCode, stdout } = await $`node ${dist}/cli.js --version`;
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should show the version with short flag', async () => {
    const { exitCode, stdout } = await $`node ${dist}/cli.js -v`;
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should show the help message if no arguments are provided', async () => {
    const { exitCode, stdout } = await $`node ${dist}/cli.js`;
    expect(exitCode).toBe(0);
    expect(stdout).contains('USAGE').contains('PARAMETERS').contains('OPTIONS');
  });

  it.skipIf(unconnected)(
    'should download the file to the current directory',
    { timeout: 10_000 },
    async ({ onTestFinished }) => {
      const { stdout } = await $`node ${dist}/cli.js ${testUrl} --name=photo`;

      onTestFinished(async () => {
        await fs.rm('photo.jpg', { force: true });
      });

      expect(stdout).contain('Done').not.contain('image failed to download');
      await expect(fs.access('photo.jpg')).resolves.toBeUndefined();
    },
  );

  it('should throw an error if the directory cannot be created', async () => {
    const invalidDir =
      process.platform === 'win32'
        ? 'C:\\nonexistent\\restricted\\directory'
        : '/nonexistent/restricted/directory';
    const { stderr } =
      await $`node ${dist}/cli.js ${testUrl} --dir=${invalidDir}`;
    expect(stderr).contain('DirectoryError');
  });

  it('should throw an error if some arguments is invalid', async () => {
    const { stderr } =
      await $`node ${dist}/cli.js ${testUrl} --name=invalid/name`;

    expect(stderr).contain('ArgumentError');
  });

  it.skipIf(unconnected)(
    'should download multiple images if multiple URLs are provided',
    { timeout: 10_000 },
    async ({ onTestFinished }) => {
      const { stdout } =
        await $`node ${dist}/cli.js ${testUrl} ${testUrl} --name=photo`;

      const expectedImages = ['photo.jpg', 'photo (1).jpg'];

      onTestFinished(async () => {
        for (const image of expectedImages) {
          await fs.rm(image, { force: true });
        }
      });

      expect(stdout).contain('Done').not.contain('images failed to download');

      for (const image of expectedImages) {
        await expect(fs.access(image)).resolves.toBeUndefined();
      }
    },
  );

  it.each([
    'not-url',
    'some/path',
    'example.com/image.jpg',
    'ftp://example.com',
    'ws://example.com',
  ])('should throw an error if URL is invalid: `%s`', async (url) => {
    const { stderr } = await $`node ${dist}/cli.js ${url}`;
    expect(stderr).contain('ArgumentError');
  });

  it.each([
    '',
    'InvalidHeader NoColonValue',
    'Empty-Value-Header:',
    'Empty-Value-Header: ',
    ': value',
  ])(
    'should throw an error if the header is not valid: `%s`',
    async (header) => {
      const { stderr } = await $`node ${dist}/cli.js ${testUrl} -H ${header}`;
      expect(stderr).contain('ArgumentError');
    },
  );

  describe('Increment mode', () => {
    const testUrl = 'http://picsum.photos/id/{i}/200/300.webp';

    it.skipIf(unconnected)(
      'should download multiple images in increment mode',
      { timeout: 10_000 },
      async ({ onTestFinished }) => {
        const { stdout } =
          await $`node ${dist}/cli.js ${testUrl} --increment --end=2 --name=photo`;

        const expectedImages = [
          'photo.webp',
          'photo (1).webp',
          'photo (2).webp',
        ];

        onTestFinished(async () => {
          for (const image of expectedImages) {
            await fs.rm(image, { force: true });
          }
        });

        expect(stdout).contain('Done').not.contain('image failed to download');

        for (const image of expectedImages) {
          await expect(fs.access(image)).resolves.toBeUndefined();
        }
      },
    );

    it('should throw an error if URL more than 1', async () => {
      const { stderr } =
        await $`node ${dist}/cli.js ${testUrl} ${testUrl} --increment --end=10`;
      expect(stderr).contain('ArgumentError');
    });

    it('should throw an error if the start index is greater than the end index', async () => {
      const { stderr } =
        await $`node ${dist}/cli.js ${testUrl} --increment --start=2 --end=1`;
      expect(stderr).contain('ArgumentError');
    });

    it('should throw an error if the URL does not contain the index placeholder', async () => {
      const { stderr } =
        await $`node ${dist}/cli.js http://picsum.photos/200/300 --increment --end=10`;
      expect(stderr).contain('ArgumentError');
    });
  });
});
