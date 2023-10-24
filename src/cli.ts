#!/usr/bin/env node

import cliProgress from 'cli-progress';
import meow from 'meow';
import ArgumentError from './errors/ArgumentError.js';
import DirectoryError from './errors/DirectoryError.js';
import imgdl from './index.js';

const cli = meow(`
  USAGE
    $ imgdl <url> <url2> ... [OPTIONS]

  OPTIONS
    -d, --dir=<path>          The output directory. Default: current working directory
    -e, --ext=<ext>           The file extension. Default: original extension or jpg
    -h, --help                Show this help message
    -n, --name=<filename>     The filename. Default: original filename or timestamp
        --silent              Disable logging
    -v, --version             Show the version number

  EXAMPLES
    $ imgdl https://example.com/image.jpg
    $ imgdl https://example.com/image.jpg --dir=images --name=example
    $ imgdl https://example.com/image.jpg --dir=images --name=example --ext=png
    $ imgdl https://example.com/image.jpg --dir=images --name=example --ext=png --silent
    $ imgdl https://example.com/image.jpg https://example.com/image2.webp --dir=images
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
  const urls = cli.input;
  const { flags } = cli;

  if (!urls.length) {
    cli.showHelp();
  }

  const bar = new cliProgress.SingleBar({
    // eslint-disable-next-line max-len
    format: '{percentage}% [{bar}] {value}/{total} | Success: {success} | ETA: {eta_formatted} | Elapsed: {duration_formatted}',
    hideCursor: true,
    barsize: 24,
  });
  let success = 0;

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
    onError: (error) => {
      if (!flags.silent) {
        bar.increment();
      }
      if (error instanceof ArgumentError || error instanceof DirectoryError) {
        throw error;
      }
    },
  });

  if (!flags.silent) {
    bar.stop();
    console.log('\nDone!');
  }
}

main().catch((error: Error) => {
  console.error(`${error.name}: ${error.message}`);
  process.exit(1);
});
