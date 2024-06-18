import { $ } from 'execa';
import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { BASE_URL } from './constanta.js';
import { DEFAULT_EXTENSION, DEFAULT_NAME } from '~/constanta.js';

describe('cli', () => {
  const testUrl = `${BASE_URL}/images/200x300.webp`;

  test.todo('Only URL', async () => {
    const expectedFilePath = `${process.cwd()}/200x300.webp`;
    const { stdout } = await $`node dist/cli.js ${testUrl}`;

    expect(stdout).toMatch('Done!');
    expect(fs.existsSync(expectedFilePath)).toBe(true);
  });

  test.todo('with `--dir` argument', async () => {
    const expectedDirPath = `${process.cwd()}/images`;
    const expectedFilePath = `${expectedDirPath}/200x300.webp`;
    const { stdout } = await $`node dist/cli.js ${testUrl} --dir=images`;

    try {
      expect(stdout).toMatch('Done!');
      expect(fs.existsSync(expectedFilePath)).toBe(true);
    } finally {
      // Cleanup
      fs.rmSync(expectedDirPath, { recursive: true });
    }
  });

  test.todo('with `--name` argument', async () => {
    const expectedFilePath = `${process.cwd()}/custom-name.webp`;
    const { stdout } = await $`node dist/cli.js ${testUrl} --name=custom-name`;

    expect(stdout).toMatch('Done!');
    expect(fs.existsSync(expectedFilePath)).toBe(true);
  });

  test.todo('with `--silent` argument', async () => {
    const expectedFilePath = `${process.cwd()}/200x300.webp`;
    const { stdout } = await $`node dist/cli.js ${testUrl} --silent`;

    expect(stdout).toBe('');
    expect(fs.existsSync(expectedFilePath)).toBe(true);
  });

  test('should throw an error if arguments is invalid', async () => {
    await expect(
      $`node dist/cli.js ${testUrl} --name=test/test`,
    ).rejects.toThrow();
  });

  test('should throw an error if the directory cannot be created', async () => {
    await expect(
      $`node dist/cli.js ${testUrl} --dir=/new-root-dir-no-access`,
    ).rejects.toThrow();
  });

  test('should throw an error if the URL is invalid', async () => {
    await expect($`node dist/cli.js invalid.url`).rejects.toThrow();
  });

  test('should throw an error if the response is unsuccessful', async () => {
    await expect($`node dist/cli.js ${BASE_URL}/xxx`).rejects.toThrow();
  });

  test('should throw an error if the response is not an image', async () => {
    await expect($`node dist/cli.js ${BASE_URL}`).rejects.toThrow();
  });

  describe('Multiple URLs', () => {
    const validTestUrls = [
      `${BASE_URL}/images/200x300.webp`,
      `${BASE_URL}/images/200x300`,
    ];
    const expectedFilePaths = [
      `${process.cwd()}/200x300.webp`,
      `${process.cwd()}/${DEFAULT_NAME}.${DEFAULT_EXTENSION}`,
    ];

    test.todo('Only URLs', async () => {
      const { stdout } = await $`node dist/cli.js ${validTestUrls}`;

      expect(stdout).toMatch('Done!');
      expectedFilePaths.forEach((filepath) => {
        expect(fs.existsSync(filepath)).toBe(true);
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
    const testUrl = `${BASE_URL}/images/img-{i}.webp`;

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
        $`node dist/cli.js ${BASE_URL}/images/200x300.webp --increment --end=10`,
      ).rejects.toThrow();
    });

    test.todo('Valid', async () => {
      const { stdout } =
        await $`node dist/cli.js ${testUrl} --increment --start=300 --end=302`;

      const expectedFilePaths = [
        `${process.cwd()}/img-300.webp`,
        `${process.cwd()}/img-301.webp`,
        `${process.cwd()}/img-302.webp`,
      ];

      expect(stdout).toMatch('Done!');
      expectedFilePaths.forEach((filepath) => {
        expect(fs.existsSync(filepath)).toBe(true);
      });
    });

    test.todo('Valid without extension in url', async () => {
      const { stdout } =
        await $`node dist/cli.js ${BASE_URL}/images/img-{i} --increment --start=1 --end=3`;

      const expectedFilePaths = [
        `${process.cwd()}/${DEFAULT_NAME}.${DEFAULT_EXTENSION}`,
        `${process.cwd()}/${DEFAULT_NAME} (1).${DEFAULT_EXTENSION}`,
        `${process.cwd()}/${DEFAULT_NAME} (2).${DEFAULT_EXTENSION}`,
      ];

      expect(stdout).toMatch('Done!');
      expectedFilePaths.forEach((filepath) => {
        expect(fs.existsSync(filepath)).toBe(true);
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
