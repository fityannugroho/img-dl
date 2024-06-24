import { $ } from 'execa';
import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { DEFAULT_EXTENSION, DEFAULT_NAME } from '~/constanta.js';

const baseUrl = 'https://picsum.photos';

describe('cli', () => {
  const validTestUrl = `${baseUrl}/200/300.webp`;

  test('Only URL', async () => {
    const expectedFilePath = `${process.cwd()}/300.webp`;
    const { stdout } = await $`node dist/cli.js ${validTestUrl}`;

    expect(stdout).toMatch('Done!');
    expect(() => fs.accessSync(expectedFilePath)).not.toThrow();
  });

  test('with `--dir` argument', async () => {
    const expectedDirPath = `${process.cwd()}/images`;
    const expectedFilePath = `${expectedDirPath}/300.webp`;
    const { stdout } = await $`node dist/cli.js ${validTestUrl} --dir=images`;

    try {
      expect(stdout).toMatch('Done!');
      expect(() => fs.accessSync(expectedFilePath)).not.toThrow();
    } finally {
      // Cleanup
      fs.rmSync(expectedDirPath, { recursive: true });
    }
  });

  test('with `--name` argument', async () => {
    const expectedFilePath = `${process.cwd()}/custom-name.webp`;
    const { stdout } =
      await $`node dist/cli.js ${validTestUrl} --name=custom-name`;

    expect(stdout).toMatch('Done!');
    expect(() => fs.accessSync(expectedFilePath)).not.toThrow();
  });

  test('with `--silent` argument', async () => {
    const expectedFilePath = `${process.cwd()}/300.webp`;
    const { stdout } = await $`node dist/cli.js ${validTestUrl} --silent`;

    expect(stdout).toBe('');
    expect(() => fs.accessSync(expectedFilePath)).not.toThrow();
  });

  test('should throw an error if arguments is invalid', async () => {
    await expect(
      $`node dist/cli.js ${validTestUrl} --name=test/test`,
    ).rejects.toThrow();
  });

  test('should throw an error if the directory cannot be created', async () => {
    await expect(
      $`node dist/cli.js ${validTestUrl} --dir=/new-root-dir-no-access`,
    ).rejects.toThrow();
  });

  test('should throw an error if the URL is invalid', async () => {
    await expect($`node dist/cli.js invalid.url`).rejects.toThrow();
  });

  test('should throw an error if the response is unsuccessful', async () => {
    await expect($`node dist/cli.js ${baseUrl}/xxx`).rejects.toThrow();
  });

  test('should throw an error if the response is not an image', async () => {
    await expect($`node dist/cli.js ${baseUrl}`).rejects.toThrow();
  });

  describe('Multiple URLs', () => {
    const validTestUrls = [`${baseUrl}/200/300.webp`, `${baseUrl}/200/300`];
    const expectedFilePaths = [
      `${process.cwd()}/300.webp`,
      `${process.cwd()}/${DEFAULT_NAME}.${DEFAULT_EXTENSION}`,
    ];

    test('Only URLs', async () => {
      const { stdout } = await $`node dist/cli.js ${validTestUrls}`;

      expect(stdout).toMatch('Done!');
      expectedFilePaths.forEach((filepath) => {
        expect(() => fs.accessSync(filepath)).not.toThrow();
      });
    });

    test('should throw an error if arguments is invalid', async () => {
      await expect(
        $`node dist/cli.js ${validTestUrls} --name=test/test`,
      ).rejects.toThrow();
    });

    test('should throw an error if the directory cannot be created', async () => {
      await expect(
        $`node dist/cli.js ${validTestUrls} --dir=/new-root-dir-no-access`,
      ).rejects.toThrow();
    });
  });

  describe('Increment download', () => {
    const testUrl = `${baseUrl}/200/{i}.webp`;

    test('should throw an error if the end index is not specified', async () => {
      await expect(
        $`node dist/cli.js ${testUrl} --increment`,
      ).rejects.toThrow();
    });

    test('should throw an error if URL more than 1', async () => {
      await expect(
        $`node dist/cli.js ${testUrl} ${testUrl} --increment --end=10`,
      ).rejects.toThrow();
    });

    test('should throw an error if the start index is greater than the end index', async () => {
      await expect(
        $`node dist/cli.js ${testUrl} --increment --start=2 --end=1`,
      ).rejects.toThrow();
    });

    test('should throw an error if the URL does not contain the index placeholder', async () => {
      await expect(
        $`node dist/cli.js ${baseUrl}/200/300.webp --increment --end=10`,
      ).rejects.toThrow();
    });

    test('Valid', async () => {
      const { stdout } =
        await $`node dist/cli.js ${testUrl} --increment --start=300 --end=302`;

      const expectedFilePaths = [
        `${process.cwd()}/300.webp`,
        `${process.cwd()}/301.webp`,
        `${process.cwd()}/302.webp`,
      ];

      expect(stdout).toMatch('Done!');
      expectedFilePaths.forEach((filepath) => {
        expect(() => fs.accessSync(filepath)).not.toThrow();
      });
    });

    test('Valid without extension in url', async () => {
      const { stdout } =
        await $`node dist/cli.js ${baseUrl}/200/{i} --increment --start=1 --end=3`;

      const expectedFilePaths = [
        `${process.cwd()}/${DEFAULT_NAME}.${DEFAULT_EXTENSION}`,
        `${process.cwd()}/${DEFAULT_NAME} (1).${DEFAULT_EXTENSION}`,
        `${process.cwd()}/${DEFAULT_NAME} (2).${DEFAULT_EXTENSION}`,
      ];

      expect(stdout).toMatch('Done!');
      expectedFilePaths.forEach((filepath) => {
        expect(() => fs.accessSync(filepath)).not.toThrow();
      });
    });
  });

  describe('Show version', () => {
    test('should show the version', async () => {
      const { stdout } = await $`node dist/cli.js --version`;

      expect(stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    test('should show the version with short flag', async () => {
      const { stdout } = await $`node dist/cli.js -v`;

      expect(stdout).toMatch(/\d+\.\d+\.\d+/);
    });
  });
});
