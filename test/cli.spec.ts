import { $ } from 'execa';
import { beforeAll, describe, expect, it } from 'vitest';

describe('cli', () => {
  /**
   * A valid URL for testing.
   */
  const testUrl = 'http://example.com/image.webp';

  beforeAll(async () => {
    await $`npm run build`;
  });

  it('should show the version', async () => {
    const { exitCode, stdout } = await $`node dist/cli.js --version`;
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should show the version with short flag', async () => {
    const { exitCode, stdout } = await $`node dist/cli.js -v`;
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should show the help message if no arguments are provided', async () => {
    const { exitCode, stdout } = await $`node dist/cli.js`;
    expect(exitCode).toBe(0);
    expect(stdout).contains('USAGE').contains('PARAMETERS').contains('OPTIONS');
  });

  it('should throw an error if some arguments is invalid', async () => {
    await expect(
      $`node dist/cli.js ${testUrl} --name=invalid/name`,
    ).rejects.toThrow();
  });

  it('should throw an error if the directory cannot be created', async () => {
    await expect($`node dist/cli.js ${testUrl} --dir=/root`).rejects.toThrow();
  });

  it('should throw an error if the URL is invalid', async () => {
    await expect($`node dist/cli.js invalid.url`).rejects.toThrow();
  });

  describe('Increment mode', () => {
    const testUrl = 'http://example.com/image-{i}.webp';

    it('should throw an error if the end index is not specified', async () => {
      await expect(
        $`node dist/cli.js ${testUrl} --increment`,
      ).rejects.toThrow();
    });

    it('should throw an error if URL more than 1', async () => {
      await expect(
        $`node dist/cli.js ${testUrl} ${testUrl} --increment --end=10`,
      ).rejects.toThrow();
    });

    it('should throw an error if the start index is greater than the end index', async () => {
      await expect(
        $`node dist/cli.js ${testUrl} --increment --start=2 --end=1`,
      ).rejects.toThrow();
    });

    it('should throw an error if the URL does not contain the index placeholder', async () => {
      await expect(
        $`node dist/cli.js http://example.com/image.jpg --increment --end=10`,
      ).rejects.toThrow();
    });
  });
});
