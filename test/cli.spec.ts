import { $ } from 'execa';
import { beforeAll, describe, expect, it } from 'vitest';

describe('cli', () => {
  /**
   * The build folder for the test
   */
  const dist = 'test/dist';
  /**
   * A valid URL for testing.
   */
  const testUrl = 'http://example.com/image.webp';

  beforeAll(async () => {
    await $`tsup src/cli.ts --format esm -d ${dist} --clean`;
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

  it('should throw an error if the directory cannot be created', async () => {
    const { stderr } = await $`node ${dist}/cli.js ${testUrl} --dir=/root`;
    expect(stderr).toContain('DirectoryError');
  });

  it('should throw an error if some arguments is invalid', async () => {
    const { stderr } =
      await $`node ${dist}/cli.js ${testUrl} --name=invalid/name`;

    expect(stderr).toContain('ArgumentError');
  });

  it.each([
    'not-url',
    'some/path',
    'example.com/image.jpg',
    'ftp://example.com',
    'ws://example.com',
  ])('should throw an error if URL is invalid: `%s`', async (url) => {
    const { stderr } = await $`node ${dist}/cli.js ${url}`;
    expect(stderr).toContain('ArgumentError');
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
      expect(stderr).toContain('ArgumentError');
    },
  );

  describe('Increment mode', () => {
    const testUrl = 'http://example.com/image-{i}.webp';

    it('should throw an error if the end index is not specified', async () => {
      const { stderr } = await $`node ${dist}/cli.js ${testUrl} --increment`;
      expect(stderr).toContain('ArgumentError');
    });

    it('should throw an error if URL more than 1', async () => {
      const { stderr } =
        await $`node ${dist}/cli.js ${testUrl} ${testUrl} --increment --end=10`;
      expect(stderr).toContain('ArgumentError');
    });

    it('should throw an error if the start index is greater than the end index', async () => {
      const { stderr } =
        await $`node ${dist}/cli.js ${testUrl} --increment --start=2 --end=1`;
      expect(stderr).toContain('ArgumentError');
    });

    it('should throw an error if the URL does not contain the index placeholder', async () => {
      const { stderr } =
        await $`node ${dist}/cli.js http://example.com/image.jpg --increment --end=10`;
      expect(stderr).toContain('ArgumentError');
    });
  });
});
