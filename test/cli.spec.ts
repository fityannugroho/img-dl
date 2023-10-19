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

    expect(stdout).toMatch('Image downloaded successfully');
    expect(fs.existsSync(expectedFilePath)).toBe(true);

    // Cleanup
    fs.unlinkSync(expectedFilePath);
  }, { timeout: 5000 });

  test('with `--dir` argument', async () => {
    const expectedFilePath = `${process.cwd()}/images/300.webp`;
    const { stdout } = await $`node dist/cli.js ${validTestUrl} --dir=images`;

    expect(stdout).toMatch('Image downloaded successfully');
    expect(fs.existsSync(expectedFilePath)).toBe(true);

    // Cleanup
    fs.unlinkSync(expectedFilePath);
    fs.rmdirSync(path.dirname(expectedFilePath));
  }, 5000);

  test('with `--name` argument', async () => {
    const expectedFilePath = `${process.cwd()}/custom-name.webp`;
    const { stdout } = await $`node dist/cli.js ${validTestUrl} --name=custom-name`;

    expect(stdout).toMatch('Image downloaded successfully');
    expect(fs.existsSync(expectedFilePath)).toBe(true);

    // Cleanup
    fs.unlinkSync(expectedFilePath);
  }, 5000);

  test('with `--silent` argument', async () => {
    const expectedFilePath = `${process.cwd()}/300.webp`;
    const { stdout } = await $`node dist/cli.js ${validTestUrl} --silent`;

    expect(stdout).toBe('');
    expect(fs.existsSync(expectedFilePath)).toBe(true);

    // Cleanup
    fs.unlinkSync(expectedFilePath);
  }, 5000);

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
});
