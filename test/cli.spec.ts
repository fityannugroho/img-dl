import { $ } from 'execa';
import fs from 'node:fs';
import path from 'node:path';
import {
  beforeAll, describe, expect, test,
} from 'vitest';

describe('cli', () => {
  const validTestUrl = 'https://picsum.photos/200/300.webp';

  beforeAll(async () => {
    await $`npm run build`;
  });

  test('Only URL', async () => {
    const expectedFilePath = `${process.cwd()}/300.webp`;
    const { stdout } = await $`node dist/cli.js ${validTestUrl}`;

    expect(stdout).toMatch('Done!');
    expect(fs.existsSync(expectedFilePath)).toBe(true);

    // Cleanup
    fs.unlinkSync(expectedFilePath);
  }, { timeout: 15000 });

  test('with `--dir` argument', async () => {
    const expectedFilePath = `${process.cwd()}/images/300.webp`;
    const { stdout } = await $`node dist/cli.js ${validTestUrl} --dir=images`;

    expect(stdout).toMatch('Done!');
    expect(fs.existsSync(expectedFilePath)).toBe(true);

    // Cleanup
    fs.unlinkSync(expectedFilePath);
    fs.rmdirSync(path.dirname(expectedFilePath));
  }, { timeout: 15000 });

  test('with `--name` argument', async () => {
    const expectedFilePath = `${process.cwd()}/custom-name.webp`;
    const { stdout } = await $`node dist/cli.js ${validTestUrl} --name=custom-name`;

    expect(stdout).toMatch('Done!');
    expect(fs.existsSync(expectedFilePath)).toBe(true);

    // Cleanup
    fs.unlinkSync(expectedFilePath);
  }, { timeout: 15000 });

  test('with `--silent` argument', async () => {
    const expectedFilePath = `${process.cwd()}/300.webp`;
    const { stdout } = await $`node dist/cli.js ${validTestUrl} --silent`;

    expect(stdout).toBe('');
    expect(fs.existsSync(expectedFilePath)).toBe(true);

    // Cleanup
    fs.unlinkSync(expectedFilePath);
  }, { timeout: 15000 });

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
    await expect($`node dist/cli.js https://picsum.photos/xxx`).rejects.toThrow();
  });

  test('should throw an error if the response is not an image', async () => {
    await expect($`node dist/cli.js https://picsum.photos`).rejects.toThrow();
  });

  describe('Multiple URLs', () => {
    const validTestUrls = ['https://picsum.photos/200/300.webp', 'https://picsum.photos/200/300'];
    const expectedFilePaths = [`${process.cwd()}/300-1.webp`, `${process.cwd()}/image-2.jpg`];

    test('Only URLs', async () => {
      const { stdout } = await $`node dist/cli.js ${validTestUrls}`;

      expect(stdout).toMatch('Done!');
      expectedFilePaths.forEach((filepath) => {
        expect(fs.existsSync(filepath)).toBe(true);

        // Cleanup
        fs.unlinkSync(filepath);
      });
    }, { timeout: 15000 });

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
    const testUrl = 'https://picsum.photos/200/{i}.webp';

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
        $`node dist/cli.js https://picsum.photos/200/300.webp --increment --end=10`,
      ).rejects.toThrow();
    });

    test('Valid', async () => {
      const expectedFilePaths = [
        `${process.cwd()}/300-1.webp`,
        `${process.cwd()}/301-2.webp`,
      ];
      const { stdout } = await $`node dist/cli.js ${testUrl} --increment --start=300 --end=301`;

      expect(stdout).toMatch('Done!');
      expectedFilePaths.forEach((filepath) => {
        expect(fs.existsSync(filepath)).toBe(true);

        // Cleanup
        fs.unlinkSync(filepath);
      });
    }, { timeout: 15000 });
  });
});
