#!/usr/bin/env node

import cliProgress from 'cli-progress';
import meow from 'meow';
import fs from 'node:fs';
import path from 'node:path';
import ArgumentError from './errors/ArgumentError.js';
import DirectoryError from './errors/DirectoryError.js';
import imgdl from './index.js';

const cli = meow(`
  USAGE
    $ imgdl <url> <url2> ... [OPTIONS]

  PARAMETERS
    url   The URL of the image to download. Can be repeated multiple times.
          In increment mode, the URL must contain {i} placeholder for the index,
          only one URL is allowed, and the 'end' flag is required.

  OPTIONS
    -d, --dir=<path>          The output directory. Default: current working directory
        --end=<number>        The end index. Required in increment mode
    -e, --ext=<ext>           The file extension. Default: original extension or jpg
    -h, --help                Show this help message
    -i, --increment           Enable increment mode. Default: false
    -n, --name=<filename>     The filename. Default: original filename or timestamp
        --silent              Disable logging
        --start=<number>      The start index for increment mode. Default: 0
    -v, --version             Show the version number

  EXAMPLES
    $ imgdl https://example.com/image.jpg
    $ imgdl https://example.com/image.jpg --dir=images --name=example --ext=png
    $ imgdl https://example.com/image.jpg --silent
    $ imgdl https://example.com/image.jpg https://example.com/image2.webp
    $ imgdl https://example.com/image-{i}.jpg --increment --start=1 --end=10
`, {
  importMeta: import.meta,
  description: 'Download an image from a URL',
  booleanDefault: undefined,
  flags: {
    dir: {
      shortFlag: 'd',
      type: 'string',
    },
    ext: {
      shortFlag: 'e',
      type: 'string',
    },
    increment: {
      shortFlag: 'i',
      type: 'boolean',
    },
    start: {
      type: 'number',
    },
    end: {
      type: 'number',
    },
    name: {
      shortFlag: 'n',
      type: 'string',
    },
    silent: {
      type: 'boolean',
    },
  },
});

async function main() {
  let urls = cli.input;
  const { flags } = cli;

  if (!urls.length) {
    cli.showHelp();
  }

  if (flags.increment) {
    if (urls.length > 1) {
      throw new ArgumentError('Only one URL is allowed in increment mode');
    }

    const templateUrl = urls[0];

    if (!templateUrl.includes('{i}')) {
      throw new ArgumentError('The URL must contain {i} placeholder for the index');
    }

    if (!flags.end) {
      throw new ArgumentError('The end index is required in increment mode');
    }

    if (flags.start && flags.start > flags.end) {
      throw new ArgumentError('The start index cannot be greater than the end index');
    }

    const { start = 0, end } = flags;
    urls = [];

    for (let i = start; i <= end; i += 1) {
      urls.push(templateUrl.replace('{i}', i.toString()));
    }
  }

  if (!flags.silent) {
    console.log('\nDownloading...');
  }

  const bar = new cliProgress.SingleBar({
    // eslint-disable-next-line max-len
    format: '{percentage}% [{bar}] {value}/{total} | Success: {success} | ETA: {eta_formatted} | Elapsed: {duration_formatted}',
    hideCursor: null,
    barsize: 24,
  });
  let success = 0;
  let errorCount = 0;

  if (!flags.silent && urls.length > 1) {
    bar.start(urls.length, 0, { success });
  }

  await imgdl(urls.length === 1 ? urls[0] : urls, {
    directory: flags.dir,
    name: flags.name,
    extension: flags.ext,
    onSuccess: () => {
      if (!flags.silent) {
        success += 1;
        bar.increment({ success });
      }
    },
    onError: (error, url) => {
      errorCount += 1;
      if (!flags.silent) {
        bar.increment();
      }
      if (error instanceof ArgumentError || error instanceof DirectoryError) {
        throw error;
      }
      fs.appendFileSync(
        path.resolve(flags.dir || process.cwd(), 'error.log'),
        `${new Date().toISOString()} failed download from ${url}, ${error.name}: ${error.message}\n`,
      );
    },
  });

  if (!flags.silent) {
    bar.stop();
    console.log('Done!');

    if (errorCount) {
      console.log(`${errorCount} image${errorCount > 1 ? 's' : ''} failed to download. See ./error.log for details.`);
    }
  }
}

main().catch((error: Error) => {
  console.error(`${error.name}: ${error.message}`);
  process.exit(1);
});
